// events/inviteCreate.js - Invite creation event handler for tracking new invites
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
        const dir = path.dirname(INVITES_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(INVITES_PATH, JSON.stringify(invites, null, 2));
        return true;
    } catch (error) {
        console.error('❌ Error saving invites:', error);
        return false;
    }
}

module.exports = {
    name: 'inviteCreate',
    async execute(invite) {
        try {
            const trackedInvites = loadTrackedInvites();
            const client = invite.client;
            const guild = invite.guild;
            
            // Auto-track new invite with creator's ID
            trackedInvites[invite.code] = {
                name: invite.inviter ? invite.inviter.id : 'Unknown', // Store user ID, not username
                uses: 0,
                createdAt: new Date().toISOString(),
                createdBy: invite.inviter ? invite.inviter.id : null,
                isCustomName: false // Flag to track if admin assigned custom name
            };
            
            saveTrackedInvites(trackedInvites);
            
            // CRITICAL: Also add to client cache for comparison
            if (!client.guildInvites) {
                client.guildInvites = new Map();
            }
            if (!client.guildInvites.has(guild.id)) {
                client.guildInvites.set(guild.id, new Map());
            }
            
            client.guildInvites.get(guild.id).set(invite.code, {
                uses: invite.uses || 0,
                inviter: invite.inviter
            });
            
            console.log(`✅ Auto-tracked new invite: ${invite.code} created by ${invite.inviter ? invite.inviter.tag : 'Unknown'} (uses: ${invite.uses || 0})`);
            
        } catch (error) {
            console.error('❌ Error in inviteCreate event:', error);
        }
    }
};