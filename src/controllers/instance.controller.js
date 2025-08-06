const logger = require('../utils/logger');
const instanceManager = require('../services/whatsappInstanceManager.service');
const instanceService = require('../services/instanceService');
const messageService = require('../services/messageService');
const instanceLogService = require('../services/instanceLogService');

const instanceController = {
// Get logs for a specific instance
    getInstanceLogs: async (req, res) => {
        try {
            const { phone } = req.params;
            logger.info(`📋 Get logs request received for instance ${phone}`);

            const { limit = 100, level, startDate, endDate, skip = 0 } = req.query;

            // Prepare options for log query
            const options = {
                take: parseInt(limit) || 100,
                skip: parseInt(skip) || 0
            };

            if (level && level !== 'all') {
                options.level = level;
            }

            if (startDate) {
                options.startDate = new Date(startDate);
            }

            if (endDate) {
                options.endDate = new Date(endDate);
            }

            // Get logs using instanceLogService
            const logs = await instanceLogService.findByInstancePhone(phone, options);
            
            // Get log statistics
            const stats = await instanceLogService.getStatsByInstancePhone(phone);

            res.status(200).json({
                success: true,
                data: {
                    logs,
                    stats,
                    pagination: {
                        limit: parseInt(limit) || 100,
                        skip: parseInt(skip) || 0,
                        total: stats.total
                    }
                },
                message: `Retrieved logs for instance ${phone}`
            });
        } catch (error) {
            logger.error(`❌ Error getting logs for instance ${req.params.phone}:`, error);
            
            if (error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    error: 'Instance not found',
                    message: error.message
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve logs',
                message: error.message
            });
        }
    },

    // Instance ping
    pingInstance: async (req, res) => {
        try {
            const { phone } = req.params;
            logger.info(`🏓 Ping request received for instance ${phone}`);

            const instance = instanceManager.getInstance(phone);
            if (!instance || !instance.isConnected) {
                return res.status(404).json({
                    success: false,
                    error: `Instance ${phone} not found or not connected`,
                });
            }

            res.status(200).json({
                success: true,
                message: 'pong',
                timestamp: new Date().toISOString(),
                instance: {
                    phone: instance.instanceData.phone,
                    isConnected: instance.isConnected
                }
            });
        } catch (error) {
            logger.error(`❌ Error pinging instance ${req.params.phone}:`, error);
            res.status(500).json({
                success: false,
                error: 'Failed to ping instance',
                message: error.message
            });
        }
    },

    // Check status for instance
    getInstanceStatus: async (req, res) => {
        try {
            const { phone } = req.params;
            logger.info(`📊 Status check request received for instance ${phone}`);

            const instance = instanceManager.getInstance(phone);
            if (!instance) {
                return res.status(404).json({
                    success: false,
                    error: `Instance ${phone} not found`,
                });
            }

            res.status(200).json({
                success: true,
                data: instance.getStatus(),
                message: `Status of instance ${phone}`
            });
        } catch (error) {
            logger.error(`❌ Error getting status for instance ${req.params.phone}:`, error);
            res.status(500).json({
                success: false,
                error: 'Failed to get instance status',
                message: error.message
            });
        }
    },

    // Get all instances
    getAllInstances: async (req, res) => {
        try {
            logger.info('📋 Get all instances request received');
            
            const instances = instanceManager.getAllInstances();
            const managerStatus = instanceManager.getManagerStatus();
            
            res.status(200).json({
                success: true,
                data: {
                    manager: managerStatus,
                    instances
                }
            });
            
        } catch (error) {
            logger.error('❌ Error getting all instances:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get instances',
                message: error.message
            });
        }
    },

    // Get specific instance by phone
    getInstance: async (req, res) => {
        try {
            const { phone } = req.params;
            logger.info(`📋 Get instance request received for ${phone}`);
            
            const instance = await instanceManager.getInstanceByPhone(phone);
            
            if (!instance) {
                return res.status(404).json({
                    success: false,
                    error: 'Instance not found',
                    message: `WhatsApp instance ${phone} not found`
                });
            }
            
            res.status(200).json({
                success: true,
                data: instance
            });
            
        } catch (error) {
            logger.error(`❌ Error getting instance ${req.params.phone}:`, error);
            res.status(500).json({
                success: false,
                error: 'Failed to get instance',
                message: error.message
            });
        }
    },

    // Create new instance
    createInstance: async (req, res) => {
        try {
            const { phone, name, alias } = req.body;
            
            if (!phone || !name) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields',
                    message: 'Phone and name are required'
                });
            }
            
            logger.info(`🆕 Create instance request received for ${phone}`);
            
            // Check if instance already exists
            const existing = await instanceService.findByPhone(phone);
            if (existing) {
                return res.status(400).json({
                    success: false,
                    error: 'Instance already exists',
                    message: `WhatsApp instance for ${phone} already exists`
                });
            }
            
            // Create instance
            const instanceData = {
                phone: phone.replace(/[^\d]/g, ''), // Clean phone number
                name,
                alias: alias || null
            };
            
            const instance = await instanceManager.createInstance(instanceData);
            
            res.status(201).json({
                success: true,
                message: 'Instance created successfully',
                data: instance
            });
            
        } catch (error) {
            logger.error('❌ Error creating instance:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create instance',
                message: error.message
            });
        }
    },

    // Update instance
    updateInstance: async (req, res) => {
        try {
            const { phone } = req.params;
            const { name, alias } = req.body;
            
            logger.info(`🔄 Update instance request received for ${phone}`);
            
            const dbInstance = await instanceService.findByPhone(phone);
            if (!dbInstance) {
                return res.status(404).json({
                    success: false,
                    error: 'Instance not found',
                    message: `WhatsApp instance ${phone} not found`
                });
            }
            
            // Update database
            const updateData = {};
            if (name !== undefined) updateData.name = name;
            if (alias !== undefined) updateData.alias = alias;
            
            const updatedInstance = await instanceService.update(dbInstance.id, updateData);
            
            // Update in-memory instance data
            const instance = instanceManager.getInstance(phone);
            if (instance) {
                Object.assign(instance.instanceData, updateData);
            }
            
            res.status(200).json({
                success: true,
                message: 'Instance updated successfully',
                data: updatedInstance
            });
            
        } catch (error) {
            logger.error(`❌ Error updating instance ${req.params.phone}:`, error);
            res.status(500).json({
                success: false,
                error: 'Failed to update instance',
                message: error.message
            });
        }
    },

    // Delete instance
    deleteInstance: async (req, res) => {
        try {
            const { phone } = req.params;
            logger.info(`🗑️ Delete instance request received for ${phone}`);
            
            const result = await instanceManager.deleteInstance(phone);
            
            res.status(200).json({
                success: true,
                message: 'Instance deleted successfully',
                data: result
            });
            
        } catch (error) {
            logger.error(`❌ Error deleting instance ${req.params.phone}:`, error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete instance',
                message: error.message
            });
        }
    },

    // Restart instance
    restartInstance: async (req, res) => {
        try {
            const { phone } = req.params;
            logger.info(`🔄 Restart instance request received for ${phone}`);
            
            const result = await instanceManager.restartInstance(phone);
            
            res.status(200).json({
                success: true,
                message: 'Instance restarted successfully',
                data: result
            });
            
        } catch (error) {
            logger.error(`❌ Error restarting instance ${req.params.phone}:`, error);
            res.status(500).json({
                success: false,
                error: 'Failed to restart instance',
                message: error.message
            });
        }
    },

    // Get QR code for instance
    getQRCode: async (req, res) => {
        try {
            const { phone } = req.params;
            logger.info(`📱 QR code request received for ${phone}`);
            
            const instance = instanceManager.getInstance(phone);
            if (!instance) {
                return res.status(404).json({
                    success: false,
                    error: 'Instance not found',
                    message: `WhatsApp instance ${phone} not found`
                });
            }
            
            const status = instance.getStatus();
            
            if (!status.qrCode) {
                return res.status(400).json({
                    success: false,
                    error: 'QR code not available',
                    message: `QR code not available for instance ${phone}. Status: ${status.connectionStatus}`
                });
            }
            
            res.status(200).json({
                success: true,
                data: {
                    qrCode: status.qrCode,
                    connectionStatus: status.connectionStatus,
                    timestamp: status.timestamp
                }
            });
            
        } catch (error) {
            logger.error(`❌ Error getting QR code for ${req.params.phone}:`, error);
            res.status(500).json({
                success: false,
                error: 'Failed to get QR code',
                message: error.message
            });
        }
    },

    // Send message from specific instance
    sendMessage: async (req, res) => {
        try {
            const { phone } = req.params;
            const { to, message } = req.body;
            
            logger.info(`📨 Send message request received from instance ${phone} to ${to}`);
            
            // Validation
            if (!to || !message) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields',
                    message: 'to and message are required'
                });
            }
            
            if (typeof message !== 'string' || message.trim() === '') {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid message format',
                    message: 'Message must be a non-empty string'
                });
            }
            
            // Check if instance exists
            const instance = instanceManager.getInstance(phone);
            if (!instance) {
                return res.status(404).json({
                    success: false,
                    error: 'Instance not found',
                    message: `WhatsApp instance ${phone} not found`
                });
            }
            
            // Check if instance is connected
            if (!instance.isConnected) {
                return res.status(503).json({
                    success: false,
                    error: 'Instance not connected',
                    message: `WhatsApp instance ${phone} is not connected. Current status: ${instance.connectionStatus}`
                });
            }
            
            // Send message using instance manager
            const result = await instanceManager.sendMessage(phone, to, message.trim());
            
            logger.info(`✅ Message sent successfully from instance ${phone} to ${to}`);
            
            res.status(200).json({
                success: true,
                data: {
                    instancePhone: phone,
                    to,
                    message: message.trim(),
                    messageId: result.messageId,
                    status: 'sent',
                    timestamp: new Date().toISOString()
                },
                message: 'Message sent successfully'
            });
            
        } catch (error) {
            logger.error(`❌ Error sending message from instance ${req.params.phone}:`, error);
            res.status(500).json({
                success: false,
                error: 'Failed to send message',
                message: error.message
            });
        }
    },

    // Send group message from specific instance
    sendGroupMessage: async (req, res) => {
        try {
            const { phone } = req.params;
            const { groupId, message } = req.body;
            
            logger.info(`📨 Send group message request received from instance ${phone} to ${groupId}`);
            
            // Validation
            if (!groupId || !message) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields',
                    message: 'groupId and message are required'
                });
            }
            
            if (typeof message !== 'string' || message.trim() === '') {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid message format',
                    message: 'Message must be a non-empty string'
                });
            }
            
            // Check if instance exists
            const instance = instanceManager.getInstance(phone);
            if (!instance) {
                return res.status(404).json({
                    success: false,
                    error: 'Instance not found',
                    message: `WhatsApp instance ${phone} not found`
                });
            }
            
            // Check if instance is connected
            if (!instance.isConnected) {
                return res.status(503).json({
                    success: false,
                    error: 'Instance not connected',
                    message: `WhatsApp instance ${phone} is not connected. Current status: ${instance.connectionStatus}`
                });
            }
            
            // Send group message using instance manager
            const result = await instanceManager.sendGroupMessage(phone, groupId, message.trim());
            
            logger.info(`✅ Group message sent successfully from instance ${phone} to ${groupId}`);
            
            res.status(200).json({
                success: true,
                data: {
                    instancePhone: phone,
                    groupId,
                    message: message.trim(),
                    messageId: result.messageId,
                    status: 'sent',
                    timestamp: new Date().toISOString()
                },
                message: 'Group message sent successfully'
            });
            
        } catch (error) {
            logger.error(`❌ Error sending group message from instance ${req.params.phone}:`, error);
            res.status(500).json({
                success: false,
                error: 'Failed to send group message',
                message: error.message
            });
        }
    },

    // Send media message from specific instance
    sendMediaMessage: async (req, res) => {
        try {
            const { phone } = req.params;
            const { to, media } = req.body;
            
            logger.info(`📨 Send media message request received from instance ${phone} to ${to}`);
            
            // Validation
            if (!to || !media) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields',
                    message: 'to and media are required'
                });
            }
            
            if (!media.type || !media.url) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid media format',
                    message: 'media.type and media.url are required'
                });
            }
            
            // Validate media type
            const validTypes = ['image', 'video', 'audio', 'document'];
            if (!validTypes.includes(media.type.toLowerCase())) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid media type',
                    message: `Unsupported media type: ${media.type}. Supported types: ${validTypes.join(', ')}`
                });
            }
            
            // Check if instance exists
            const instance = instanceManager.getInstance(phone);
            if (!instance) {
                return res.status(404).json({
                    success: false,
                    error: 'Instance not found',
                    message: `WhatsApp instance ${phone} not found`
                });
            }
            
            // Check if instance is connected
            if (!instance.isConnected) {
                return res.status(503).json({
                    success: false,
                    error: 'Instance not connected',
                    message: `WhatsApp instance ${phone} is not connected. Current status: ${instance.connectionStatus}`
                });
            }
            
            // Send media message using instance manager
            const result = await instanceManager.sendMediaMessage(phone, to, media);
            
            logger.info(`✅ ${media.type} media sent successfully from instance ${phone} to ${to}`);
            
            res.status(200).json({
                success: true,
                data: {
                    instancePhone: phone,
                    to,
                    mediaType: media.type,
                    mediaUrl: media.url,
                    caption: media.caption,
                    filename: media.filename,
                    messageId: result.messageId,
                    status: 'sent',
                    timestamp: new Date().toISOString()
                },
                message: `${media.type} media sent successfully`
            });
            
        } catch (error) {
            logger.error(`❌ Error sending media message from instance ${req.params.phone}:`, error);
            res.status(500).json({
                success: false,
                error: 'Failed to send media message',
                message: error.message
            });
        }
    },

    // Get plugin status for instance
    getInstancePluginStatus: async (req, res) => {
        try {
            const { phone } = req.params;
            logger.info(`🔌 Get plugin status request received for instance ${phone}`);
            
            const instance = instanceManager.getInstance(phone);
            if (!instance) {
                return res.status(404).json({
                    success: false,
                    error: 'Instance not found',
                    message: `WhatsApp instance ${phone} not found`
                });
            }
            
            const plugins = instance.pluginManager.getAvailablePlugins();
            const pluginStatus = instance.pluginManager.getInstancePluginStatus();
            
            res.status(200).json({
                success: true,
                data: {
                    phone: phone,
                    plugins: plugins,
                    pluginStatus: pluginStatus,
                    totalPlugins: plugins.length,
                    enabledPlugins: plugins.filter(p => p.enabled).length
                },
                message: `Plugin status retrieved for instance ${phone}`
            });
            
        } catch (error) {
            logger.error(`❌ Error getting plugin status for instance ${req.params.phone}:`, error);
            res.status(500).json({
                success: false,
                error: 'Failed to get plugin status',
                message: error.message
            });
        }
    },

    // Enable plugin for instance
    enableInstancePlugin: async (req, res) => {
        try {
            const { phone, pluginName } = req.params;
            logger.info(`✅ Enable plugin request received for instance ${phone}, plugin: ${pluginName}`);
            
            const instance = instanceManager.getInstance(phone);
            if (!instance) {
                return res.status(404).json({
                    success: false,
                    error: 'Instance not found',
                    message: `WhatsApp instance ${phone} not found`
                });
            }
            
            try {
                const updatedConfig = instance.pluginManager.enableInstancePlugin(pluginName);
                
                // Update database with new plugin configuration
                const dbInstance = await instanceService.findByPhone(phone);
                if (dbInstance) {
                    const updatedDbInstance = await instanceService.update(dbInstance.id, {
                        pluginConfig: JSON.stringify(updatedConfig)
                    });
                    
                    // Update in-memory instance data
                    instance.instanceData = updatedDbInstance;
                }
                
                res.status(200).json({
                    success: true,
                    data: {
                        phone: phone,
                        pluginName: pluginName,
                        enabled: true,
                        pluginConfig: updatedConfig
                    },
                    message: `Plugin ${pluginName} enabled for instance ${phone}`
                });
                
            } catch (pluginError) {
                return res.status(400).json({
                    success: false,
                    error: 'Plugin not found',
                    message: pluginError.message
                });
            }
            
        } catch (error) {
            logger.error(`❌ Error enabling plugin for instance ${req.params.phone}:`, error);
            res.status(500).json({
                success: false,
                error: 'Failed to enable plugin',
                message: error.message
            });
        }
    },

    // Disable plugin for instance
    disableInstancePlugin: async (req, res) => {
        try {
            const { phone, pluginName } = req.params;
            logger.info(`❌ Disable plugin request received for instance ${phone}, plugin: ${pluginName}`);
            
            const instance = instanceManager.getInstance(phone);
            if (!instance) {
                return res.status(404).json({
                    success: false,
                    error: 'Instance not found',
                    message: `WhatsApp instance ${phone} not found`
                });
            }
            
            try {
                const updatedConfig = instance.pluginManager.disableInstancePlugin(pluginName);
                
                // Update database with new plugin configuration
                const dbInstance = await instanceService.findByPhone(phone);
                if (dbInstance) {
                    const updatedDbInstance = await instanceService.update(dbInstance.id, {
                        pluginConfig: JSON.stringify(updatedConfig)
                    });
                    
                    // Update in-memory instance data
                    instance.instanceData = updatedDbInstance;
                }
                
                res.status(200).json({
                    success: true,
                    data: {
                        phone: phone,
                        pluginName: pluginName,
                        enabled: false,
                        pluginConfig: updatedConfig
                    },
                    message: `Plugin ${pluginName} disabled for instance ${phone}`
                });
                
            } catch (pluginError) {
                return res.status(400).json({
                    success: false,
                    error: 'Plugin not found',
                    message: pluginError.message
                });
            }
            
        } catch (error) {
            logger.error(`❌ Error disabling plugin for instance ${req.params.phone}:`, error);
            res.status(500).json({
                success: false,
                error: 'Failed to disable plugin',
                message: error.message
            });
        }
    },

    // Update multiple plugin settings for instance
    updateInstancePluginConfig: async (req, res) => {
        try {
            const { phone } = req.params;
            const { plugins } = req.body;
            
            logger.info(`🔄 Update plugin config request received for instance ${phone}`);
            
            if (!plugins || typeof plugins !== 'object') {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid request body',
                    message: 'plugins object is required'
                });
            }
            
            const instance = instanceManager.getInstance(phone);
            if (!instance) {
                return res.status(404).json({
                    success: false,
                    error: 'Instance not found',
                    message: `WhatsApp instance ${phone} not found`
                });
            }
            
            const updatedConfig = instance.pluginManager.setInstancePluginConfig(plugins);
            
            // Update database with new plugin configuration
            const dbInstance = await instanceService.findByPhone(phone);
            if (dbInstance) {
                const updatedDbInstance = await instanceService.update(dbInstance.id, {
                    pluginConfig: JSON.stringify(updatedConfig)
                });
                
                // Update in-memory instance data
                instance.instanceData = updatedDbInstance;
            }
            
            const availablePlugins = instance.pluginManager.getAvailablePlugins();
            
            res.status(200).json({
                success: true,
                data: {
                    phone: phone,
                    pluginConfig: updatedConfig,
                    plugins: availablePlugins,
                    enabledPlugins: availablePlugins.filter(p => p.enabled).length,
                    totalPlugins: availablePlugins.length
                },
                message: `Plugin configuration updated for instance ${phone}`
            });
            
        } catch (error) {
            logger.error(`❌ Error updating plugin config for instance ${req.params.phone}:`, error);
            res.status(500).json({
                success: false,
                error: 'Failed to update plugin configuration',
                message: error.message
            });
        }
    },

    // Sync plugin configuration from database
    syncInstancePluginConfig: async (req, res) => {
        try {
            const { phone } = req.params;
            logger.info(`🔄 Sync plugin config request received for instance ${phone}`);
            
            const instance = instanceManager.getInstance(phone);
            if (!instance) {
                return res.status(404).json({
                    success: false,
                    error: 'Instance not found',
                    message: `WhatsApp instance ${phone} not found`
                });
            }
            
            // Get fresh data from database
            const dbInstance = await instanceService.findByPhone(phone);
            if (!dbInstance) {
                return res.status(404).json({
                    success: false,
                    error: 'Instance not found in database',
                    message: `Database record for ${phone} not found`
                });
            }
            
            // Sync plugin configuration from database
            const synced = instance.pluginManager.syncPluginConfigFromDatabase(dbInstance);
            const availablePlugins = instance.pluginManager.getAvailablePlugins();
            
            res.status(200).json({
                success: true,
                data: {
                    phone: phone,
                    synced: synced,
                    pluginConfig: dbInstance.pluginConfig,
                    plugins: availablePlugins,
                    enabledPlugins: availablePlugins.filter(p => p.enabled).length,
                    totalPlugins: availablePlugins.length
                },
                message: synced ? 
                    `Plugin configuration synced from database for instance ${phone}` :
                    `No plugin configuration changes detected for instance ${phone}`
            });
            
        } catch (error) {
            logger.error(`❌ Error syncing plugin config for instance ${req.params.phone}:`, error);
            res.status(500).json({
                success: false,
                error: 'Failed to sync plugin configuration',
                message: error.message
            });
        }
    }
};

module.exports = instanceController;
