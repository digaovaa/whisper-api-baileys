const express = require('express');
const pingController = require('../controllers/ping.controller');
const statusController = require('../controllers/status.controller');
const messageController = require('../controllers/message.controller');
const logController = require('../controllers/log.controller');
const instanceController = require('../controllers/instance.controller');
const modeController = require('../controllers/mode.controller');
const webhookController = require('../controllers/webhook.controller');
const webhookHistoryController = require('../controllers/webhookHistoryController');

const modeConfig = require('../config/mode.config');
const logger = require('../utils/logger');

const router = express.Router();

// Log active mode
logger.info(`📍 Registering routes for ${modeConfig.getModeDescription()}`);

// =====================================================
// GLOBAL ROUTES (Available in all modes)
// =====================================================
// Mode information endpoint
router.get('/mode', modeController.getModeInfo);

// =====================================================
// SINGLE INSTANCE (LEGACY) ROUTES
// =====================================================
if (modeConfig.isSingleModeEnabled()) {
    logger.info('📝 Registering single-instance (legacy) routes');
    
    // Health check / Ping endpoint
    router.get('/ping', pingController.ping);
    
    // Status check endpoint
    router.get('/status', statusController.getStatus);
    
    // Message endpoints
    router.post('/message', messageController.sendPersonalMessage);
    router.post('/message/group', messageController.sendGroupMessage);
    
    // Logs endpoint
    router.get('/logs', logController.getLogs);
} else {
    logger.info('⏭️  Single-instance (legacy) routes disabled');
}

// =====================================================
// MULTI-INSTANCE ROUTES
// =====================================================
if (modeConfig.isMultiModeEnabled()) {
    logger.info('📝 Registering multi-instance routes');
    
    // Instance management endpoints
    router.get('/instances', instanceController.getAllInstances);
    router.get('/instances/:phone', instanceController.getInstance);
    router.post('/instances', instanceController.createInstance);
    router.put('/instances/:phone', instanceController.updateInstance);
    router.delete('/instances/:phone', instanceController.deleteInstance);
    router.post('/instances/:phone/restart', instanceController.restartInstance);
    router.get('/instances/:phone/qr', instanceController.getQRCode);
    
    // Instance-specific monitoring endpoints
    router.get('/instances/:phone/ping', instanceController.pingInstance);
    router.get('/instances/:phone/status', instanceController.getInstanceStatus);
    router.get('/instances/:phone/logs', instanceController.getInstanceLogs);
    
    // Instance-specific messaging endpoints
    router.post('/instances/:phone/send-message', instanceController.sendMessage);
    router.post('/instances/:phone/send-group-message', instanceController.sendGroupMessage);
    router.post('/instances/:phone/send-media', instanceController.sendMediaMessage);
    
    // Instance-specific webhook management endpoints
    router.get('/instances/:phone/webhooks', webhookController.getInstanceWebhooks);
    router.post('/instances/:phone/webhooks', webhookController.createInstanceWebhook);
    router.get('/instances/:phone/webhooks/:id', webhookController.getInstanceWebhook);
    router.put('/instances/:phone/webhooks/:id', webhookController.updateInstanceWebhook);
    router.delete('/instances/:phone/webhooks/:id', webhookController.deleteInstanceWebhook);
    router.post('/instances/:phone/webhooks/:id/toggle', webhookController.toggleInstanceWebhook);
    
    // Instance-specific webhook history endpoints
    router.get('/instances/:phone/webhooks/history', webhookHistoryController.getInstanceHistoryByPhone);
    router.get('/instances/:phone/webhooks/history/stats', webhookHistoryController.getInstanceStatsByPhone);
    router.get('/instances/:phone/webhooks/history/failures', webhookHistoryController.getInstanceFailuresByPhone);
    router.get('/instances/:phone/webhooks/:webhookId/history', webhookHistoryController.getWebhookHistory);
    
    // Global webhook history endpoints (admin/monitoring)
    router.get('/webhooks/history', webhookHistoryController.getGlobalHistory);
    router.get('/webhooks/history/stats', webhookHistoryController.getGlobalStatistics);
    router.get('/webhooks/history/failures', webhookHistoryController.getGlobalRecentFailures);
    router.get('/webhooks/history/events/:event', webhookHistoryController.getByEvent);
    router.get('/webhooks/history/statuses/:status', webhookHistoryController.getByStatus);
    router.get('/webhooks/history/:historyId', webhookHistoryController.getHistoryById);
    router.post('/webhooks/history/cleanup', webhookHistoryController.cleanup);
} else {
    logger.info('⏭️  Multi-instance routes disabled');
}

module.exports = router;
