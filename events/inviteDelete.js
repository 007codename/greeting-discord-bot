//events/inviteDelete.js - Handles the deletion of invites by removing them from the tracked invites database.
const fs = require('fs');
const path = require('path');

const INVITES_PATH = path.join(__dirname, '../database/invites.json');

function loadTrackedInvites() {
    try {
        const data = fs.readFileSync(INVITES_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

function saveTrackedInvites(invites) {
    try {
        fs.writeFileSync(INVITES_PATH, JSON.stringify(invites, null, 2));
        return true;
    } catch (error) {
        console.error('❌ Error saving invites:', error);
        return false;
    }
}

module.exports = {
    name: 'inviteDelete',
    async execute(invite) {
        try {
            const trackedInvites = loadTrackedInvites();
            const client = invite.client;
            const guild = invite.guild;
            
            if (trackedInvites[invite.code]) {
                delete trackedInvites[invite.code];
                saveTrackedInvites(trackedInvites);
                console.log(`🗑️ Removed expired/deleted invite: ${invite.code}`);
            }
            
            // CRITICAL: Also remove from client cache
            if (client.guildInvites && client.guildInvites.has(guild.id)) {
                client.guildInvites.get(guild.id).delete(invite.code);
                console.log(`🗑️ Removed invite ${invite.code} from cache`);
            }
            
        } catch (error) {
            console.error('❌ Error in inviteDelete event:', error);
        }
    }
};