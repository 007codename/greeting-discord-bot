// events/guildMemberRemove.js - Member leave event
const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');
const { userJoinSources } = require('../utils/sharedData.js');

module.exports = {
    name: 'guildMemberRemove',
    async execute(member) {
        const guild = member.guild;
        
        try {
            // Check if we know how they joined
            let joinSource;
            if (userJoinSources.has(member.id)) {
                // We remember this user - get their join source
                joinSource = userJoinSources.get(member.id);
                console.log(`📋 Found join data for ${member.user.tag}: ${joinSource}`);
            } else {
                // We don't remember this user - they joined before bot was online or bot restarted
                joinSource = 'Unknown invite';
                console.log(`❓ No join data for ${member.user.tag} - using fallback: ${joinSource}`);
            }
            
            // Send leave message to joins-leave channel - ALWAYS send this message
            const logChannel = guild.channels.cache.get(config.joinLeaveChannelId);
            
            if (logChannel) {
                // Check if bot has permission to send messages in this channel
                const botMember = guild.members.cache.get(guild.client.user.id);
                const permissions = logChannel.permissionsFor(botMember);
                
                if (permissions.has(['ViewChannel', 'SendMessages'])) {
                    // Send the leave message
                    const leaveEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('MEMBER LEFT')
                        .setDescription(`❌ **${member.user.tag}** has left the server. \nThey originally joined through **${joinSource}**`)
                        .setThumbnail(member.user.displayAvatarURL())
                        .setTimestamp()
                        .setFooter({ text: `User ID: ${member.id}` });

                    await logChannel.send({ embeds: [leaveEmbed] });
                    console.log(`✅ Leave message sent: ${member.user.tag} (via: ${joinSource})`);
                } else {
                    console.log(`❌ Missing permissions in ${logChannel.name} for ${member.user.tag}`);
                }
            } else {
                console.log(`❌ Log channel not found - Check config.json ID: ${config.joinLeaveChannelId}`);
            }

            // Clean up stored join source if it exists
            if (userJoinSources.has(member.id)) {
                userJoinSources.delete(member.id);
                console.log(`🧹 Cleaned up join data for ${member.user.tag}`);
            }

        } catch (error) {
            console.error(`❌ Error handling leave for ${member.user.tag}:`, error);
        }
    }
};