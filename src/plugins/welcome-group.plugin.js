const logger = require('../utils/logger');

const config = {
    enabled: true
};

// Store participants for each group to batch welcome messages
const groupParticipants = {};
// Store timeout references for each group to allow cancellation
const groupTimeouts = {};
// Store scheduling status for each group
const groupScheduled = {};

// Function to validate connection state before sending
function isConnectionReady(sock) {
    try {
        // For Baileys, check if socket exists and user is authenticated
        return sock && sock.user && sock.user.id;
    } catch (error) {
        logger.warn(`Connection check failed: ${error.message}`);
        return false;
    }
}

// Function to clear group data and timeout
function clearGroupData(groupId) {
    if (groupTimeouts[groupId]) {
        clearTimeout(groupTimeouts[groupId]);
        delete groupTimeouts[groupId];
    }
    if (groupParticipants[groupId]) {
        delete groupParticipants[groupId];
    }
    if (groupScheduled[groupId]) {
        delete groupScheduled[groupId];
    }
}

async function scheduleWelcome(groupId, participants, sock) {
    if (!groupParticipants[groupId]) {
        groupParticipants[groupId] = [];
    }

    // Add new participants to the temporary storage
    groupParticipants[groupId].push(...participants);

    // Schedule the welcome message if not already scheduled
    if (!groupScheduled[groupId]) {
        groupScheduled[groupId] = true;

        // Store timeout reference for potential cancellation
        groupTimeouts[groupId] = setTimeout(async () => {
            try {
                // Check if participants still exist (might have been cleared by remove events)
                if (!groupParticipants[groupId] || groupParticipants[groupId].length === 0) {
                    logger.info(`🚫 No participants to welcome in ${groupId} - participants may have left`);
                    clearGroupData(groupId);
                    return;
                }

                // Validate connection before attempting to send
                if (!isConnectionReady(sock)) {
                    logger.warn(`🚫 Connection not ready for ${groupId} - skipping welcome message`);
                    clearGroupData(groupId);
                    return;
                }

                // Check if we're admin in this group before sending welcome message
                let groupMetadata;
                try {
                    // Add timeout to prevent socket hanging
                    groupMetadata = await Promise.race([
                        sock.groupMetadata(groupId),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('groupMetadata timeout')), 10000)
                        )
                    ]);
                } catch (error) {
                    logger.warn(`Failed to get group metadata for ${groupId}: ${error.message}`);
                    // If we can't get metadata, skip sending welcome message
                    clearGroupData(groupId);
                    return;
                }
                
                const subjectGroup = groupMetadata.subject;
                const botJid = (sock.user.id).split(':')[0] + '@s.whatsapp.net';
                const isAdmin = groupMetadata.participants
                    .find(p => p.id === botJid)?.admin;

                // Skip if bot is not admin OR if it's an announce-only group
                if (!isAdmin || groupMetadata.announce) { 
                    let reason = !isAdmin ? 'Bot is not admin' : 'Group is announce-only';
                    logger.info(`🚫 Skipping welcome message for ${subjectGroup} (${groupId}) - ${reason}`);
                    clearGroupData(groupId);
                    return;
                }

                const welcomeMessage = formattedWelcomeText(groupParticipants[groupId], subjectGroup);

                await sock.sendMessage(groupId, {
                    text: welcomeMessage,
                    mentions: groupParticipants[groupId].map(p => p.id),
                });

                logger.info(`👋 Welcomed ${groupParticipants[groupId].length} new members to ${groupId}`);

                // Clear participants list and scheduling flag
                clearGroupData(groupId);
            } catch (error) {
                logger.error(`Error sending welcome message to ${groupId}: ${error.message}`);
                // Clear participants list and scheduling flag on error
                clearGroupData(groupId);
            }
        }, 5 * 60 * 1000); // 5 minute 
    }
}

function formattedWelcomeText(participants, subject) {
    const mentions = participants.map(p => '@'+p.id.split('@')[0]).join(' ');
    const messageFormatted = `⚠️ Waspada pendatang baru detected!!
${mentions}

Selamat datang di *${subject}* — Feel free untuk kenalan, share insight, atau sekadar nimbrung obrolan 👋

Please read the group rules and enjoy your stay.

> "Alone we can do so little, together we can do so much." — Helen Keller`;
    return messageFormatted;
}

const welcomeGroupPlugin = async ({ props: { enabled = config.enabled, sock, message } }) => {
    if (!enabled) return;

    const groupUpdate = message?.message?.groupUpdate;
    if (!groupUpdate || !groupUpdate.participants) return;

    const { key } = message;
    const { remoteJid: groupId } = key; 

    if (groupUpdate.action === 'add') {
        const newParticipants = groupUpdate.participants.map(participant => ({
            id: participant,
            joinedAt: new Date(),
        }));
        await scheduleWelcome(groupId, newParticipants, sock);
    } else if (groupUpdate.action === 'remove') {
        // Handle participant removal - remove them from pending welcome list
        if (groupParticipants[groupId] && groupParticipants[groupId].length > 0) {
            const removedParticipants = groupUpdate.participants;
            
            // Remove the participants who left from the pending welcome list
            groupParticipants[groupId] = groupParticipants[groupId].filter(
                participant => !removedParticipants.includes(participant.id)
            );
            
            // If no participants left to welcome, cancel the scheduled message
            if (groupParticipants[groupId].length === 0) {
                logger.info(`🚫 All pending participants left ${groupId} - canceling welcome message`);
                clearGroupData(groupId);
            } else {
                logger.info(`👥 ${removedParticipants.length} participants left ${groupId} - ${groupParticipants[groupId].length} still pending welcome`);
            }
        }
    }
};

module.exports = welcomeGroupPlugin;
module.exports.config = config;
