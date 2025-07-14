const logger = require('../utils/logger');

const config = {
    enabled: false
};

const adminCommandsPlugin = async ({ props: { enabled = config.enabled, sock, message } }) => {
    if (!enabled) return;

    const textMessage = message?.message?.conversation ||
        message?.message?.extendedTextMessage?.text;

    if (!textMessage || !textMessage.startsWith('!')) return;

    const { key, pushName = 'Anonymous' } = message;
    const { remoteJid: groupId, participant } = key;

    // Check if it's a group message
    if (!groupId.endsWith('@g.us')) return;

    // Get group metadata to check admin status
    try {
        const groupMetadata = await sock.groupMetadata(groupId);
        const adminJids = groupMetadata.participants
            .filter(p => p.admin)
            .map(p => p.id);

        // Check if sender is admin
        if (!adminJids.includes(participant)) {
            logger.warn(`⚠️ Non-admin ${pushName} tried to use admin command: ${textMessage}`);
            return;
        }

        const [command, ...args] = textMessage.slice(1).split(' ');

        switch (command.toLowerCase()) {
            case 'kick':
                if (args.length === 0) {
                    await sock.sendMessage(groupId, {
                        text: 'Usage: !kick @user',
                    }, { quoted: message });
                    return;
                }

                const mentionedJids = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
                if (mentionedJids.length === 0) {
                    await sock.sendMessage(groupId, {
                        text: 'Please mention a user to kick.',
                    }, { quoted: message });
                    return;
                }

                for (const jid of mentionedJids) {
                    await sock.groupParticipantsUpdate(groupId, [jid], 'remove');
                    logger.info(`👢 ${pushName} kicked ${jid} from ${groupId}`);
                }
                break;

            case 'promote':
                const promoteJids = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
                if (promoteJids.length === 0) {
                    await sock.sendMessage(groupId, {
                        text: 'Please mention a user to promote.',
                    }, { quoted: message });
                    return;
                }

                for (const jid of promoteJids) {
                    await sock.groupParticipantsUpdate(groupId, [jid], 'promote');
                    logger.info(`⬆️ ${pushName} promoted ${jid} in ${groupId}`);
                }
                break;

            case 'demote':
                const demoteJids = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
                if (demoteJids.length === 0) {
                    await sock.sendMessage(groupId, {
                        text: 'Please mention a user to demote.',
                    }, { quoted: message });
                    return;
                }

                for (const jid of demoteJids) {
                    await sock.groupParticipantsUpdate(groupId, [jid], 'demote');
                    logger.info(`⬇️ ${pushName} demoted ${jid} in ${groupId}`);
                }
                break;

            default:
                await sock.sendMessage(groupId, {
                    text: `Unknown command: ${command}\nAvailable commands: kick, promote, demote`,
                }, { quoted: message });
        }
    } catch (error) {
        logger.error(`Error in admin-commands plugin: ${error.message}`);
    }
};

module.exports = adminCommandsPlugin;
module.exports.config = config;
