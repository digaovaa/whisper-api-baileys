/**
 * WhatsApp Mode Configuration
 * Handles different operational modes for the WhatsApp API service
 */

const logger = require('../utils/logger');

// Available modes
const MODES = {
    SINGLE: 'single',    // Legacy single-instance mode only
    MULTI: 'multi',      // Multi-instance mode only  
    BOTH: 'both'         // Both modes simultaneously
};

/**
 * Get the current WhatsApp mode from environment
 * @returns {string} Current mode
 */
const getCurrentMode = () => {
    const mode = process.env.WHATSAPP_MODE?.toLowerCase() || MODES.BOTH;
    
    if (!Object.values(MODES).includes(mode)) {
        logger.warn(`Invalid WHATSAPP_MODE '${mode}', defaulting to '${MODES.BOTH}'`);
        return MODES.BOTH;
    }
    
    return mode;
};

/**
 * Check if single-instance mode is enabled
 * @returns {boolean}
 */
const isSingleModeEnabled = () => {
    const mode = getCurrentMode();
    return mode === MODES.SINGLE || mode === MODES.BOTH;
};

/**
 * Check if multi-instance mode is enabled  
 * @returns {boolean}
 */
const isMultiModeEnabled = () => {
    const mode = getCurrentMode();
    return mode === MODES.MULTI || mode === MODES.BOTH;
};

/**
 * Get mode description for logging
 * @returns {string}
 */
const getModeDescription = () => {
    const mode = getCurrentMode();
    
    switch (mode) {
        case MODES.SINGLE:
            return 'Single Instance (Legacy) Mode';
        case MODES.MULTI:
            return 'Multi-Instance Mode';
        case MODES.BOTH:
            return 'Hybrid Mode (Single + Multi Instance)';
        default:
            return 'Unknown Mode';
    }
};

module.exports = {
    MODES,
    getCurrentMode,
    isSingleModeEnabled,
    isMultiModeEnabled,
    getModeDescription
};
