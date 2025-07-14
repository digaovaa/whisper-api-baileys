const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class PluginManager {
    constructor() {
        this.plugins = new Map();
        this.pluginConfigs = new Map();
        this.pluginsDir = path.join(__dirname, '../plugins');
    }

    async loadPlugins() {
        try {
            const files = fs.readdirSync(this.pluginsDir);
            const pluginFiles = files.filter(file => file.endsWith('.plugin.js'));

            logger.info(`📦 Loading ${pluginFiles.length} plugins...`);

            for (const file of pluginFiles) {
                const pluginName = file.replace('.plugin.js', '');
                const pluginPath = path.join(this.pluginsDir, file);

                try {
                    // Clear require cache for hot reloading
                    delete require.cache[require.resolve(pluginPath)];

                    const plugin = require(pluginPath);
                    this.plugins.set(pluginName, plugin);

                    // Use plugin's config if available, otherwise default to enabled
                    const config = plugin.config || { enabled: true };
                    this.pluginConfigs.set(pluginName, config);

                    logger.info(`✅ Loaded plugin: ${pluginName} - Enabled: ${config.enabled}`);
                } catch (error) {
                    logger.error(`❌ Failed to load plugin ${pluginName}: ${error.message}`);
                }
            }

            logger.info(`🚀 Plugin loading complete. ${this.plugins.size} plugins loaded.`);
        } catch (error) {
            logger.error(`Error loading plugins: ${error.message}`);
        }
    }

    async executePlugins(sock, message) {
        const promises = [];

        for (const [pluginName, plugin] of this.plugins) {
            const config = this.pluginConfigs.get(pluginName);

            if (config.enabled) {
                const promise = plugin({
                    props: {
                        enabled: config.enabled,
                        sock,
                        message,
                        ...config
                    }
                }).catch(error => {
                    logger.error(`Plugin ${pluginName} error: ${error.message}`);
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

    async reloadPlugins() {
        logger.info('🔄 Reloading plugins...');
        this.plugins.clear();
        await this.loadPlugins();
    }
}

module.exports = PluginManager;
