const logger = require('../utils/logger');
const packageJson = require('../../package.json');

const config = {
    enabled: true
};

const antiMentionPlugin = async ({ props: { enabled = config.enabled, sock, message } }) => {
    if (!enabled) return;

    const groupJids = ['120363399423653389@g.us', '120363025783457581@g.us'];
    const groupMention = message?.message?.groupStatusMentionMessage;

    if (!groupMention) return;

    const { key, pushName = 'Anonymous' } = message;
    const { remoteJid: groupId, participant } = key;

    if (!groupJids.includes(groupId)) return;

    logger.warn(`⚠️ Group mentioned by ${pushName} [${participant}] in ${groupId}`);
    logger.info(`♻️ Preparing to kick ...`);

    const textContent = `Cung yang kena spam mention group sama si dongo satu ini ☝️ @${participant.split('@')[0]}\n\n> Sent via ${packageJson.name}\n> @${packageJson.author}/${packageJson.name}.git`;

    await sock.sendMessage(groupId, {
        text: textContent,
        mentions: [participant],
    }, { quoted: message });

    await sock.sendMessage(groupId, { delete: key });

    setTimeout(async () => {
        await sock.groupParticipantsUpdate(groupId, [participant], 'remove');
        logger.info(`✅ ${pushName} [${participant}] has been kicked from ${groupId}`);
    }, 10_000);
};

module.exports = antiMentionPlugin;
module.exports.config = config;
