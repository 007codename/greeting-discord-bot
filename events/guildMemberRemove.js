// events/guildMemberRemove.js - Member leave event
const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');
const { getMemberJoinSource, removeMember } = require('../utils/memberDatabase.js');

module.exports = {
    name: 'guildMemberRemove',
    async execute(member) {
        const guild = member.guild;
       
        try {
            // Check if we know how they joined
            let joinSource = getMemberJoinSource(member.id);
            
            if (!joinSource) {
                // We don't remember this user - they joined before bot was online or bot restarted
                joinSource = 'Unknown invite';
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
                } else {
                    console.log(`WelcomeWizard#2229: ❌ Missing permissions in ${logChannel.name} for ${member.user.tag}`);
                }
            } else {
                console.log(`WelcomeWizard#2229: ❌ Log channel not found - Check config.json ID: ${config.joinLeaveChannelId}`);
            }
            
            // Remove member data from database
            removeMember(member.id);
            
        } catch (error) {
            console.error(`❌ Error handling leave for ${member.user.tag}:`, error);
        }
    }
};