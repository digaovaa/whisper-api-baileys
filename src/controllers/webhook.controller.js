const webhookService = require('../services/webhookService');
const instanceService = require('../services/instanceService');
const logger = require('../utils/logger');

const webhookController = {
    // Create a new webhook
    createWebhook: async (req, res) => {
        try {
            const data = req.body;
            logger.info('Creating a new webhook', data);

            const webhook = await webhookService.create(data);

            res.status(201).json({
                success: true,
                message: 'Webhook created successfully',
                data: webhook
            });
        } catch (error) {
            logger.error('Error creating webhook:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create webhook',
                message: error.message
            });
        }
    },

    // Get all webhooks for a specific instance
    getInstanceWebhooks: async (req, res) => {
        try {
            const { phone } = req.params;
            logger.info(`Fetching webhooks for instance ${phone}`);

            const instance = await instanceService.findByPhone(phone);
            if (!instance) throw new Error(`Instance with phone ${phone} not found`);

            const webhooks = await webhookService.findByInstance(instance.id);

            res.status(200).json({
                success: true,
                data: webhooks
            });
        } catch (error) {
            logger.error('Error getting instance webhooks:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get instance webhooks',
                message: error.message
            });
        }
    },

    // Create a webhook for a specific instance
    createInstanceWebhook: async (req, res) => {
        try {
            const { phone } = req.params;
            const { type, event, url } = req.body;
            
            // Validation
            if (!type || !event || !url) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields',
                    message: 'type, event, and url are required'
                });
            }
            
            logger.info(`Creating webhook for instance ${phone}`);

            const instance = await instanceService.findByPhone(phone);
            if (!instance) {
                return res.status(404).json({
                    success: false,
                    error: 'Instance not found',
                    message: `Instance with phone ${phone} not found`
                });
            }

            const webhook = await webhookService.create({
                instanceId: instance.id,
                type,
                event,
                url
            });

            res.status(201).json({
                success: true,
                message: 'Webhook created successfully',
                data: webhook
            });
        } catch (error) {
            logger.error('Error creating instance webhook:', error);
            
            if (error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    error: 'Instance not found',
                    message: error.message
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Failed to create instance webhook',
                message: error.message
            });
        }
    },

    // Update a webhook for a specific instance
    updateInstanceWebhook: async (req, res) => {
        try {
            const { phone, id } = req.params;
            const data = req.body;
            logger.info(`Updating webhook ${id} for instance ${phone}`);

            const instance = await instanceService.findByPhone(phone);
            if (!instance) throw new Error(`Instance with phone ${phone} not found`);

            const webhook = await webhookService.update(id, data);

            res.status(200).json({
                success: true,
                message: 'Webhook updated successfully',
                data: webhook
            });
        } catch (error) {
            logger.error('Error updating instance webhook:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update instance webhook',
                message: error.message
            });
        }
    },

    // Toggle webhook enable status for a specific instance
    toggleInstanceWebhook: async (req, res) => {
        try {
            const { phone, id } = req.params;
            const { isEnabled } = req.body;
            logger.info(`Toggling webhook ${id} status for instance ${phone}`);

            const instance = await instanceService.findByPhone(phone);
            if (!instance) throw new Error(`Instance with phone ${phone} not found`);

            const webhook = await webhookService.toggleEnabled(id, isEnabled);

            res.status(200).json({
                success: true,
                message: 'Webhook status toggled successfully',
                data: webhook
            });
        } catch (error) {
            logger.error('Error toggling instance webhook:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to toggle instance webhook',
                message: error.message
            });
        }
    },

    // Get a specific webhook for a specific instance
    getInstanceWebhook: async (req, res) => {
        try {
            const { phone, id } = req.params;
            logger.info(`Fetching webhook ${id} for instance ${phone}`);

            const instance = await instanceService.findByPhone(phone);
            if (!instance) throw new Error(`Instance with phone ${phone} not found`);

            const webhook = await webhookService.findById(id);

            if (!webhook) {
                return res.status(404).json({
                    success: false,
                    error: 'Webhook not found',
                    message: `Webhook with id ${id} not found`
                });
            }
            
            res.status(200).json({
                success: true,
                data: webhook
            });
        } catch (error) {
            logger.error('Error fetching instance webhook:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get instance webhook',
                message: error.message
            });
        }
    },

    // Delete a webhook for a specific instance
    deleteInstanceWebhook: async (req, res) => {
        try {
            const { phone, id } = req.params;
            logger.info(`Deleting webhook ${id} for instance ${phone}`);

            const instance = await instanceService.findByPhone(phone);
            if (!instance) throw new Error(`Instance with phone ${phone} not found`);

            await webhookService.delete(id);

            res.status(200).json({
                success: true,
                message: 'Webhook deleted successfully'
            });
        } catch (error) {
            logger.error('Error deleting instance webhook:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete instance webhook',
                message: error.message
            });
        }
    },

    // Delete a webhook (legacy method)
    deleteWebhook: async (req, res) => {
        try {
            const { id } = req.params;
            logger.info(`Deleting webhook ${id}`);

            await webhookService.delete(id);

            res.status(200).json({
                success: true,
                message: 'Webhook deleted successfully'
            });
        } catch (error) {
            logger.error('Error deleting webhook:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete webhook',
                message: error.message
            });
        }
    }
};

module.exports = webhookController;

