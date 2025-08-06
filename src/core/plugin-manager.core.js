const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class PluginManager {
    constructor(instanceData = null) {
        this.plugins = new Map();
        this.pluginConfigs = new Map();
        this.pluginsDir = path.join(__dirname, '../plugins');
        this.instanceData = instanceData;
        this.instancePluginConfig = instanceData?.pluginConfig ? 
            (typeof instanceData.pluginConfig === 'string' ? 
                JSON.parse(instanceData.pluginConfig) : instanceData.pluginConfig) 
            : {};
    }

    async loadPlugins() {
        try {
            const files = fs.readdirSync(this.pluginsDir);
            const pluginFiles = files.filter(file => file.endsWith('.plugin.js'));

            const instanceInfo = this.instanceData ? ` for instance ${this.instanceData.phone}` : ' (global)';
            logger.info(`📦 Loading ${pluginFiles.length} plugins${instanceInfo}...`);

            let enabledCount = 0;
            for (const file of pluginFiles) {
                const pluginName = file.replace('.plugin.js', '');
                const pluginPath = path.join(this.pluginsDir, file);

                try {
                    // Clear require cache for hot reloading
                    delete require.cache[require.resolve(pluginPath)];

                    const plugin = require(pluginPath);
                    this.plugins.set(pluginName, plugin);

                    // Use plugin's config if available, otherwise default to enabled
                    const defaultConfig = plugin.config || { enabled: true };
                    this.pluginConfigs.set(pluginName, defaultConfig);

                    // Check instance-specific configuration
                    const instanceEnabled = this.instancePluginConfig[pluginName];
                    const actuallyEnabled = instanceEnabled !== undefined ? instanceEnabled : false;
                    if (actuallyEnabled) enabledCount++;

                    const statusText = this.instanceData ? 
                        `Instance: ${actuallyEnabled ? 'enabled' : 'disabled'} (default: ${defaultConfig.enabled})` :
                        `Global default: ${defaultConfig.enabled}`;
                    
                    logger.info(`✅ Loaded plugin: ${pluginName} - ${statusText}${instanceInfo}`);
                } catch (error) {
                    logger.error(`❌ Failed to load plugin ${pluginName}${instanceInfo}: ${error.message}`);
                }
            }

            const statusSummary = this.instanceData ? 
                `${enabledCount}/${this.plugins.size} plugins enabled` :
                `${this.plugins.size} plugins loaded`;
            
            logger.info(`🚀 Plugin loading complete${instanceInfo}. ${statusSummary}.`);
        } catch (error) {
            const instanceInfo = this.instanceData ? ` for instance ${this.instanceData.phone}` : '';
            logger.error(`Error loading plugins${instanceInfo}: ${error.message}`);
        }
    }

    async executePlugins(sock, message) {
        const promises = [];

        for (const [pluginName, plugin] of this.plugins) {
            const defaultConfig = this.pluginConfigs.get(pluginName);
            
            // Check instance-specific configuration first, fall back to default
            const instanceEnabled = this.instancePluginConfig[pluginName];
            const isEnabled = instanceEnabled !== undefined ? instanceEnabled : false; // Default to false for new instances

            if (isEnabled) {
                const promise = plugin({
                    props: {
                        enabled: isEnabled,
                        sock,
                        message,
                        ...defaultConfig
                    }
                }).catch(error => {
                    const instanceInfo = this.instanceData ? ` (Instance: ${this.instanceData.phone})` : '';
                    logger.error(`Plugin ${pluginName} error${instanceInfo}: ${error.message}`);
                });

                promises.push(promise);
            }
        }

        // Execute all plugins concurrently
        await Promise.all(promises);
    }

    enablePlugin(pluginName) {
        if (this.plugins.has(pluginName)) {
            this.pluginConfigs.set(pluginName, {
                ...this.pluginConfigs.get(pluginName),
                enabled: true
            });
            logger.info(`✅ Plugin ${pluginName} enabled`);
            return true;
        }
        return false;
    }

    disablePlugin(pluginName) {
        if (this.plugins.has(pluginName)) {
            this.pluginConfigs.set(pluginName, {
                ...this.pluginConfigs.get(pluginName),
                enabled: false
            });
            logger.info(`❌ Plugin ${pluginName} disabled`);
            return true;
        }
        return false;
    }

    getPluginStatus() {
        const status = {};
        for (const [name, config] of this.pluginConfigs) {
            status[name] = config.enabled;
        }
        return status;
    }

    /**
     * Get instance-specific plugin status
     * @returns {Object} Plugin status for this instance
     */
    getInstancePluginStatus() {
        const status = {};
        for (const [pluginName] of this.plugins) {
            const instanceEnabled = this.instancePluginConfig[pluginName];
            status[pluginName] = instanceEnabled !== undefined ? instanceEnabled : false;
        }
        return status;
    }

    /**
     * Enable plugin for this specific instance
     * @param {string} pluginName - Name of the plugin to enable
     * @returns {Object} Updated plugin configuration
     */
    enableInstancePlugin(pluginName) {
        if (this.plugins.has(pluginName)) {
            this.instancePluginConfig[pluginName] = true;
            const instanceInfo = this.instanceData ? ` for instance ${this.instanceData.phone}` : '';
            logger.info(`✅ Plugin ${pluginName} enabled${instanceInfo}`);
            return this.instancePluginConfig;
        }
        throw new Error(`Plugin ${pluginName} not found`);
    }

    /**
     * Disable plugin for this specific instance
     * @param {string} pluginName - Name of the plugin to disable
     * @returns {Object} Updated plugin configuration
     */
    disableInstancePlugin(pluginName) {
        if (this.plugins.has(pluginName)) {
            this.instancePluginConfig[pluginName] = false;
            const instanceInfo = this.instanceData ? ` for instance ${this.instanceData.phone}` : '';
            logger.info(`❌ Plugin ${pluginName} disabled${instanceInfo}`);
            return this.instancePluginConfig;
        }
        throw new Error(`Plugin ${pluginName} not found`);
    }

    /**
     * Set multiple plugin states for this instance
     * @param {Object} pluginConfig - Plugin configuration object
     * @returns {Object} Updated plugin configuration
     */
    setInstancePluginConfig(pluginConfig) {
        this.instancePluginConfig = { ...this.instancePluginConfig, ...pluginConfig };
        const instanceInfo = this.instanceData ? ` for instance ${this.instanceData.phone}` : '';
        logger.info(`🔄 Plugin configuration updated${instanceInfo}`);
        return this.instancePluginConfig;
    }

    /**
     * Get list of available plugins
     * @returns {Array} List of plugin names with their default configurations
     */
    getAvailablePlugins() {
        const plugins = [];
        for (const [pluginName, config] of this.pluginConfigs) {
            const instanceEnabled = this.instancePluginConfig[pluginName];
            plugins.push({
                name: pluginName,
                enabled: instanceEnabled !== undefined ? instanceEnabled : false,
                defaultEnabled: config.enabled,
                description: config.description || 'No description available'
            });
        }
        return plugins;
    }

    /**
     * Reload plugin configuration from database
     * @param {Object} freshInstanceData - Updated instance data from database
     */
    syncPluginConfigFromDatabase(freshInstanceData) {
        if (freshInstanceData && freshInstanceData.pluginConfig) {
            const oldConfig = { ...this.instancePluginConfig };
            this.instancePluginConfig = typeof freshInstanceData.pluginConfig === 'string' ? 
                JSON.parse(freshInstanceData.pluginConfig) : freshInstanceData.pluginConfig;
            this.instanceData = freshInstanceData;
            
            const instanceInfo = this.instanceData ? ` for instance ${this.instanceData.phone}` : '';
            logger.info(`🔄 Plugin configuration synced from database${instanceInfo}`);
            
            // Log any changes
            const changes = [];
            for (const [pluginName] of this.plugins) {
                const oldEnabled = oldConfig[pluginName] !== undefined ? oldConfig[pluginName] : false;
                const newEnabled = this.instancePluginConfig[pluginName] !== undefined ? this.instancePluginConfig[pluginName] : false;
                if (oldEnabled !== newEnabled) {
                    changes.push(`${pluginName}: ${oldEnabled ? 'enabled' : 'disabled'} → ${newEnabled ? 'enabled' : 'disabled'}`);
                }
            }
            
            if (changes.length > 0) {
                logger.info(`🔄 Plugin config changes${instanceInfo}: ${changes.join(', ')}`);
            }
            
            return true;
        }
        return false;
    }

    async reloadPlugins() {
        const instanceInfo = this.instanceData ? ` for instance ${this.instanceData.phone}` : '';
        logger.info(`🔄 Reloading plugins${instanceInfo}...`);
        this.plugins.clear();
        await this.loadPlugins();
    }
}

module.exports = PluginManager;
