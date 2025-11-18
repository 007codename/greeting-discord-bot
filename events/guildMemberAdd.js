// events/guildMemberAdd.js - Member join event
const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');
const { addMember } = require('../utils/memberDatabase.js');

function loadTrackedInvites() {
    try {
        const data = fs.readFileSync(path.join(__dirname, '../database/invites.json'), 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('❌ Error loading tracked invites:', error);
        return {};
    }
}

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

// Helper to resolve user ID to username
async function resolveInviteSource(inviteData, guild) {
    if (!inviteData) return 'an Unknown invite';
    
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
    name: 'guildMemberAdd',
    async execute(member) {
        // IGNORE BOTS
        if (member.user.bot) {
            console.log(`🤖 Ignoring bot: ${member.user.tag}`);
            return;
        }

        const guild = member.guild;
        const client = member.client;
        
        try {
            // Send DM embed to new member
            const welcomeEmbed = new EmbedBuilder()
                .setColor(0x006AD7)
                .setTitle(`🎉 Welcome to **${guild.name}**!`)
                .setDescription(`You've just joined the **#1** Dev Hub on Discord. Here's your starter pack: \n\n* 🛠️ Explore community projects\n* 📢 Share your work and get noticed\n* 🧠 Join collabs and events\n* 📈 Earn Dev Points as you contribute\n* 📚 Use guides and resources to level up\n\n👇 **Start here:**\n<id:guide>\n\n⁉️ **Need help?**\n<#1359165556518949134> \n\n**Build cool stuff. Be part of something bigger.**`)
                .setThumbnail(guild.iconURL({ dynamic: true, size: 4096 }))
                .setImage(`https://media.discordapp.net/attachments/1287451518244753489/1436825983628869812/Banner.png?ex=691c38b9&is=691ae739&hm=e49df9b932a706f9c595baa4cfc8f6aebdffb05d446a5bc00b8bd9771d5054f2&=&format=webp&quality=lossless&width=1860&height=485`)
                .setFooter({ 
                    text: `The ${guild.name} Team`, 
                    iconURL: guild.iconURL({ dynamic: true, size: 4096 }) 
                })
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
            
            let usedInviteCode = null;
            let usedInvite = null;

            // Find which invite was used by comparing uses
            for (const [code, invite] of newInvites) {
                const oldInvite = oldInvites.get(code);
                
                if (oldInvite && invite.uses > oldInvite.uses) {
                    usedInviteCode = code;
                    usedInvite = invite;
                    console.log(`🔍 Detected invite used: ${code} (uses: ${oldInvite.uses} → ${invite.uses})`);
                    break;
                }
            }

            // Get invite data from database
            const trackedInvites = loadTrackedInvites();
            let inviteSourceDisplay = 'an Unknown invite';
            
            if (usedInviteCode) {
                console.log(`📊 Looking up invite ${usedInviteCode} in database...`);
                
                if (trackedInvites[usedInviteCode]) {
                    console.log(`✅ Found in database:`, trackedInvites[usedInviteCode]);
                    
                    // Update uses count
                    updateInviteUses(usedInviteCode, usedInvite.uses);
                    
                    // Resolve the invite source for display
                    inviteSourceDisplay = await resolveInviteSource(trackedInvites[usedInviteCode], guild);
                    console.log(`📝 Resolved display name: ${inviteSourceDisplay}`);
                    
                    // Store the INVITE CODE in member database
                    addMember(member.id, usedInviteCode);
                } else {
                    console.log(`⚠️ Invite ${usedInviteCode} not found in database (shouldn't happen with auto-tracking)`);
                    inviteSourceDisplay = 'an Untracked invite';
                    addMember(member.id, 'untracked');
                }
            } else {
                console.log(`⚠️ Could not determine which invite was used`);
                addMember(member.id, 'unknown');
            }

            // Send join message to joins-leave channel
            const logChannel = guild.channels.cache.get(config.joinLeaveChannelId);
            
            if (logChannel) {
                const botMember = guild.members.cache.get(client.user.id);
                const permissions = logChannel.permissionsFor(botMember);
                
                if (!permissions.has(['ViewChannel', 'SendMessages'])) {
                    console.log(`❌ Bot missing permissions in joins-leave channel: ${logChannel.name}`);
                } else {
                    const joinEmbed = new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setTitle(`MEMBER JOINED`)
                        .setDescription(`✅ ${member} has joined the server. \nThey joined through **${inviteSourceDisplay}**`)
                        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 4096 }))
                        .setTimestamp()
                        .setFooter({ text: `User ID: ${member.id}` });

                    await logChannel.send({ embeds: [joinEmbed] });
                    console.log(`📢 Sent join message to ${logChannel.name}`);
                }
            } else {
                console.log(`❌ Joins-leave channel not found. Check your config.json`);
            }

            // Update cached invites for next comparison
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