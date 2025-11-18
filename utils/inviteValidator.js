// utils/inviteValidator.js - Utility functions to sync and validate Discord invites
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

/**
 * Syncs ALL Discord invites to database
 * Adds missing invites, updates existing ones
 * This is safe - it only adds, never removes
 * @param {Guild} guild - Discord guild object
 * @returns {Object} - Statistics about sync
 */
async function syncInvitesToDatabase(guild) {
    try {
        console.log(`🔄 Syncing invites for ${guild.name}...`);
        
        // Fetch all current invites from Discord
        const discordInvites = await guild.invites.fetch();
        const trackedInvites = loadTrackedInvites();
        
        let addedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        
        for (const [code, invite] of discordInvites) {
            if (trackedInvites[code]) {
                // Invite already tracked - just update uses
                const oldUses = trackedInvites[code].uses;
                const newUses = invite.uses;
                
                if (oldUses !== newUses) {
                    trackedInvites[code].uses = newUses;
                    updatedCount++;
                    console.log(`  📊 Updated ${code}: ${oldUses} → ${newUses} uses`);
                } else {
                    skippedCount++;
                }
            } else {
                // New invite not in database - add it
                trackedInvites[code] = {
                    name: invite.inviter ? invite.inviter.id : 'Unknown',
                    uses: invite.uses,
                    createdAt: invite.createdAt ? invite.createdAt.toISOString() : new Date().toISOString(),
                    createdBy: invite.inviter ? invite.inviter.id : null,
                    isCustomName: false
                };
                addedCount++;
                console.log(`  ✅ Added ${code} by ${invite.inviter ? invite.inviter.tag : 'Unknown'} (${invite.uses} uses)`);
            }
        }
        
        // Save to database
        if (addedCount > 0 || updatedCount > 0) {
            saveTrackedInvites(trackedInvites);
        }
        
        console.log(`✅ Sync complete: ${addedCount} added, ${updatedCount} updated, ${skippedCount} already tracked`);
        
        return {
            total: discordInvites.size,
            added: addedCount,
            updated: updatedCount,
            skipped: skippedCount
        };
        
    } catch (error) {
        console.error('❌ Error syncing invites:', error);
        return {
            error: error.message
        };
    }
}

/**
 * Validates tracked invites and removes expired/deleted ones
 * SAFE: Only removes invites that don't exist in Discord anymore
 * @param {Guild} guild - Discord guild object
 * @returns {Object} - Statistics about validation
 */
async function validateInvites(guild) {
    try {
        console.log(`🔍 Validating invites for ${guild.name}...`);
        
        // Fetch current invites from Discord
        const discordInvites = await guild.invites.fetch();
        const currentCodes = new Set(discordInvites.keys());
        
        // Load our tracked invites
        const trackedInvites = loadTrackedInvites();
        const trackedCodes = Object.keys(trackedInvites);
        
        let removedCount = 0;
        let validCount = 0;
        const removedInvites = [];
        
        // Check each tracked invite
        for (const code of trackedCodes) {
            if (currentCodes.has(code)) {
                // Still valid
                validCount++;
            } else {
                // No longer exists in Discord - safe to remove
                const inviteData = trackedInvites[code];
                
                let displayName = inviteData.name;
                if (!inviteData.isCustomName && inviteData.name !== 'Unknown') {
                    try {
                        const user = await guild.client.users.fetch(inviteData.name);
                        displayName = user.tag;
                    } catch (error) {
                        displayName = `User ID: ${inviteData.name}`;
                    }
                }
                
                removedInvites.push({
                    code: code,
                    displayName: displayName,
                    uses: inviteData.uses,
                    isCustomName: inviteData.isCustomName
                });
                
                delete trackedInvites[code];
                removedCount++;
                console.log(`  🗑️ Removed expired: ${code} (${displayName}, ${inviteData.uses} uses)`);
            }
        }
        
        // Save if any were removed
        if (removedCount > 0) {
            saveTrackedInvites(trackedInvites);
        }
        
        console.log(`✅ Validation complete: ${validCount} valid, ${removedCount} removed`);
        
        return {
            total: trackedCodes.length,
            valid: validCount,
            removed: removedCount,
            removedInvites: removedInvites
        };
        
    } catch (error) {
        console.error('❌ Error validating invites:', error);
        return {
            error: error.message
        };
    }
}

module.exports = {
    syncInvitesToDatabase,
    validateInvites
};