// events/guildMemberAdd.js - Member join event
const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');
const { addMember } = require('../utils/memberDatabase.js'); // FIXED: Use database instead of sharedData

// Load tracked invites database
function loadTrackedInvites() {
    try {
        const data = fs.readFileSync(path.join(__dirname, '../database/invites.json'), 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('❌ Error loading tracked invites:', error);
        return {};
    }
}

// Update invite uses in database
function updateInviteUses(inviteCode, uses) {
    try {
        const trackedInvites = loadTrackedInvites();
        if (trackedInvites[inviteCode]) {
            trackedInvites[inviteCode].uses = uses;
            fs.writeFileSync(
                path.join(__dirname, '../database/invites.json'), 
                JSON.stringify(trackedInvites, null, 2)
            );
        }
    } catch (error) {
        console.error('❌ Error updating invite uses:', error);
    }
}

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        const guild = member.guild;
        const client = member.client;
        
        try {
            // Send DM embed to new member
            const welcomeEmbed = new EmbedBuilder()
                .setColor(0x006AD7)
                .setTitle(`🎉 Welcome to **${guild.name}**!`)
                .setDescription(`You've just joined the #1 hub for Discord Bot Devs & Server Owners. Here's your starter pack: \n\n## 🔧 Browse bots \n* 📢 Post your creations \n* 🤖 Search/Request bots with ease \n* 📈 Earn Dev Points to rise in rank \n* 📚 Learn from guides & resources \n\n👉 Start here: \n<#1397911489427280034> \n Questions? Hit up: \n<#1359165556518949134> \n\n**Let's make bots. Let's make moves.**`)
                .setThumbnail(`https://media.discordapp.net/attachments/1287451518244753489/1396835161269604442/Bot_Market_Circle_Cropped_Logo.png?ex=688a139e&is=6888c21e&hm=240abc9990eff0c0a0402d38e50d79e83e4998fca87df6c912017460821623df&=&format=webp&quality=lossless&width=989&height=989`)
                .setImage(`https://media.discordapp.net/attachments/1287451518244753489/1397687259196821584/Bot_Market_DC_ADS.png?ex=688a8a32&is=688938b2&hm=e9db85d4d62399b75cf27c41e13a23248ea05d5d4b05897a444efef1180c24ac&=&format=webp&quality=lossless&width=1860&height=646`)
                .setFooter({ text: `The Bot Market Team`, iconURL: `https://media.discordapp.net/attachments/1287451518244753489/1396835161269604442/Bot_Market_Circle_Cropped_Logo.png?ex=688a139e&is=6888c21e&hm=240abc9990eff0c0a0402d38e50d79e83e4998fca87df6c912017460821623df&=&format=webp&quality=lossless&width=989&height=989` })
                .setTimestamp();

            try {
                await member.send({ embeds: [welcomeEmbed] });
                console.log(`✅ Sent welcome DM to ${member.user.tag}`);
            } catch (dmError) {
                console.log(`❌ Could not DM ${member.user.tag}: DMs disabled`);
            }

            // Track invite usage
            const newInvites = await guild.invites.fetch();
            const oldInvites = client.guildInvites.get(guild.id) || new Map();
            
            let usedInvite = null;
            let inviteSource = 'Unknown';

            // Find which invite was used
            for (const [code, invite] of newInvites) {
                const oldInvite = oldInvites.get(code);
                
                if (oldInvite && invite.uses > oldInvite.uses) {
                    usedInvite = invite;
                    break;
                }
            }

            // Check if it's a tracked invite
            const trackedInvites = loadTrackedInvites();
            
            if (usedInvite) {
                if (trackedInvites[usedInvite.code]) {
                    // It's a tracked invite
                    inviteSource = trackedInvites[usedInvite.code].name;
                    // Update uses count
                    updateInviteUses(usedInvite.code, usedInvite.uses);
                } else {
                    // Not tracked, show who created it
                    inviteSource = usedInvite.inviter ? `invite by ${usedInvite.inviter.tag}` : 'Unknown invite';
                }
            }

            // Send join message to joins-leave channel
            const logChannel = guild.channels.cache.get(config.joinLeaveChannelId);
            
            if (logChannel) {
                // Check if bot has permission to send messages in this channel
                const botMember = guild.members.cache.get(client.user.id);
                const permissions = logChannel.permissionsFor(botMember);
                
                if (!permissions.has(['ViewChannel', 'SendMessages'])) {
                    console.log(`❌ Bot missing permissions in joins-leave channel: ${logChannel.name}`);
                    console.log('Required permissions: View Channel, Send Messages');
                } else {
                    const joinEmbed = new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setTitle(`MEMBER JOINED`)
                        .setDescription(`✅ ${member} has joined the server. \nThey joined through **${inviteSource}**`)
                        .setThumbnail(member.user.displayAvatarURL())
                        .setTimestamp()
                        .setFooter({ text: `User ID: ${member.id}` });

                    await logChannel.send({ embeds: [joinEmbed] });
                }
            } else {
                console.log(`❌ Joins-leave channel not found. Check your config.json - Channel ID: ${config.joinLeaveChannelId}`);
            }

            // FIXED: Store how this user joined using the database
            addMember(member.id, inviteSource);

            // Update cached invites
            client.guildInvites.set(guild.id, new Map());
            newInvites.forEach(invite => {
                client.guildInvites.get(guild.id).set(invite.code, {
                    uses: invite.uses,
                    inviter: invite.inviter
                });
            });

        } catch (error) {
            console.error('❌ Error in guildMemberAdd event:', error);
        }
    }
};