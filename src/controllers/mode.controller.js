/**
 * Mode Controller
 * Handles mode information endpoints
 */

const modeConfig = require('../config/mode.config');
const logger = require('../utils/logger');

/**
 * Get current mode information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getModeInfo = async (req, res) => {
    try {
        const currentMode = modeConfig.getCurrentMode();
        const modeDescription = modeConfig.getModeDescription();
        
        const modeInfo = {
            mode: currentMode,
            description: modeDescription,
            features: {
                singleInstance: modeConfig.isSingleModeEnabled(),
                multiInstance: modeConfig.isMultiModeEnabled()
            },
            availableModes: modeConfig.MODES
        };

        logger.info('Mode information requested');
        
        res.json({
            success: true,
            data: modeInfo
        });
    } catch (error) {
        logger.error('Error getting mode information:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get mode information',
            message: error.message
        });
    }
};

module.exports = {
    getModeInfo
};
