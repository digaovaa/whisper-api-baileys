const logger = require('../utils/logger');
const whatsappService = require('../services/whatsapp.service');
const packageJson = require('../../package.json');

const statusController = {
    getStatus: async (req, res) => {
        try {
            logger.info('📊 Status check request received');

            const status = whatsappService.getStatus();

            const response = {
                success: true,
                data: {
                    service: `${(s => s[0].toUpperCase() + s.slice(1, s.indexOf('-')))(packageJson.name)} API`,
                    connection: {
                        isConnected: status.isConnected,
                        status: status.connectionStatus,
                        qrAvailable: status.qrCode !== null
                    },
                    baileys: {
                        version: `${packageJson.dependencies.baileys}`,
                        isServiceAlive: whatsappService.isServiceAlive(),
                        plugins: whatsappService.getPluginStatus()
                    },
                    server: {
                        uptime: process.uptime(),
                        timestamp: status.timestamp,
                        nodeVersion: process.version
                    }
                }
            };

            // Add QR code if available (for initial connection)
            if (status.qrCode && status.connectionStatus === 'qr_ready') {
                response.data.qrCode = status.qrCode;
            }

            logger.info(`📊 Status response: ${status.connectionStatus}, Connected: ${status.isConnected}`);

            res.status(200).json(response);

        } catch (error) {
            logger.error('❌ Error in status controller:', error);

            const response = {
                success: false,
                error: 'Failed to get status',
                message: error.message,
                timestamp: new Date().toISOString()
            };

            res.status(500).json(response);
        }
    }
};

module.exports = statusController;
