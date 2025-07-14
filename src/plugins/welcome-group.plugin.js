const logger = require('../utils/logger');

const config = {
    enabled: true
};

// Store participants for each group to batch welcome messages
const groupParticipants = {};

async function scheduleWelcome(groupId, participants, sock) {
    if (!groupParticipants[groupId]) {
        groupParticipants[groupId] = [];
    }

    // Add new participants to the temporary storage
    groupParticipants[groupId].push(...participants);

    // Schedule the welcome message if not already scheduled
    if (!groupParticipants[groupId].scheduled) {
        groupParticipants[groupId].scheduled = true;

        setTimeout(async () => {
            try {
                // Check if we're admin in this group before sending welcome message
                const groupMetadata = await sock.groupMetadata(groupId);
                const botJid = sock.user.id;
                const isAdmin = groupMetadata.participants
                    .find(p => p.id === botJid)?.admin;

                if (!isAdmin) {
                    logger.info(`🚫 Skipping welcome message for ${groupId} - Bot is not admin`);
                    // Clear participants list and scheduling flag
                    groupParticipants[groupId] = [];
                    delete groupParticipants[groupId].scheduled;
                    return;
                }

                const welcomeMessage = formattedWelcomeText(groupParticipants[groupId])

                await sock.sendMessage(groupId, {
                    text: welcomeMessage,
                    mentions: groupParticipants[groupId].map(p => p.id),
                });

                logger.info(`👋 Welcomed ${groupParticipants[groupId].length} new members to ${groupId}`);

                // Clear participants list and scheduling flag
                groupParticipants[groupId] = [];
                delete groupParticipants[groupId].scheduled;
            } catch (error) {
                logger.error(`Error sending welcome message to ${groupId}: ${error.message}`);
                // Clear participants list and scheduling flag on error
                groupParticipants[groupId] = [];
                delete groupParticipants[groupId].scheduled;
            }
        }, 5 * 60 * 1000); // Change the interval here if needed
    }
}

function formattedWelcomeText(participants) {
    const message = `
⚠️ Waspada pendatang baru detected!!
${participants.map(p => '@'+p.id.split('@')[0])}

Selamat datang di *Kodingkeun Community* — Feel free untuk kenalan, share insight, atau sekadar nimbrung obrolan 👋

Please read the group rules and enjoy your stay.

> “Alone we can do so little, together we can do so much.” — Helen Keller
`;
    return message;
}

const welcomeGroupPlugin = async ({ props: { enabled = config.enabled, sock, message } }) => {
    if (!enabled) return;

    const groupUpdate = message?.message?.groupUpdate;
    if (!groupUpdate || !groupUpdate.participants) return;

    const { key } = message;
    const { remoteJid: groupId } = key;

    const newParticipants = groupUpdate.participants.map(participant => ({
        id: participant,
        joinedAt: new Date(),
    }));

    scheduleWelcome(groupId, newParticipants, sock);
};

module.exports = welcomeGroupPlugin;
module.exports.config = config;
