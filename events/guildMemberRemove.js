// events/guildMemberRemove.js - Member leave event
const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');
const { getMemberJoinSource, removeMember } = require('../utils/memberDatabase.js');

function loadTrackedInvites() {
    try {
        const data = fs.readFileSync(path.join(__dirname, '../database/invites.json'), 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

// Helper to resolve invite code to display name
async function resolveInviteDisplay(inviteCode, guild) {
    if (!inviteCode || inviteCode === 'unknown' || inviteCode === 'untracked') {
        return 'an Unknown invite';
    }
    
    const trackedInvites = loadTrackedInvites();
    const inviteData = trackedInvites[inviteCode];
    
    if (!inviteData) {
        return 'an Unknown invite';
    }
    
    // If it has a custom name, use it
    if (inviteData.isCustomName) {
        return inviteData.name;
    }
    
    // Otherwise it's a user ID, resolve to username
    if (inviteData.name && inviteData.name !== 'Unknown') {
        try {
            const user = await guild.client.users.fetch(inviteData.name);
            return `an invite created by ${user.username}`;
        } catch (error) {
            console.error('Error fetching user:', error);
            return `an invite created by <@${inviteData.name}>`;
        }
    }
    
    return 'an Unknown invite';
}

module.exports = {
    name: 'guildMemberRemove',
    async execute(member) {
        // IGNORE BOTS
        if (member.user.bot) {
            console.log(`🤖 Ignoring bot: ${member.user.tag}`);
            return;
        }

        const guild = member.guild;
       
        try {
            // Get the invite CODE they joined through
            let inviteCode = getMemberJoinSource(member.id);
            
            // Resolve to display name
            let joinSourceDisplay = await resolveInviteDisplay(inviteCode, guild);
           
            // Send leave message
            const logChannel = guild.channels.cache.get(config.joinLeaveChannelId);
           
            if (logChannel) {
                const botMember = guild.members.cache.get(guild.client.user.id);
                const permissions = logChannel.permissionsFor(botMember);
               
                if (permissions.has(['ViewChannel', 'SendMessages'])) {
                    const leaveEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('MEMBER LEFT')
                        .setDescription(`❌ **${member.user.tag}** has left the server. \nThey originally joined through **${joinSourceDisplay}**`)
                        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 4096 }))
                        .setTimestamp()
                        .setFooter({ text: `User ID: ${member.id}` });
                    
                    await logChannel.send({ embeds: [leaveEmbed] });
                    console.log(`📢 Sent leave message for ${member.user.tag}`);
                } else {
                    console.log(`❌ Missing permissions in ${logChannel.name}`);
                }
            } else {
                console.log(`❌ Log channel not found - Check config.json`);
            }
            
            // Remove member from database
            removeMember(member.id);
            
        } catch (error) {
            console.error(`❌ Error handling leave for ${member.user.tag}:`, error);
        }
    }
};