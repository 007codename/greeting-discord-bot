// events/ready.js - Bot ready event
const { ActivityType } = require('discord.js');
const { userJoinSources } = require('../utils/sharedData.js');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`✅ Bot is ready! Logged in as ${client.user.tag}`);
        
        // Status messages array for invite tracking bot
        const statusMessages = [
            { text: '👥 new members join', type: ActivityType.Watching },
            { text: '📊 invite tracking', type: ActivityType.Playing },
            { text: 'DEV: 007codename', type: ActivityType.Custom },
            { text: '🔗 invite analytics', type: ActivityType.Listening },
            { text: 'over server growth', type: ActivityType.Watching },
            { text: '📈 member statistics', type: ActivityType.Watching },
            { text: '🎯 join/leave events', type: ActivityType.Watching }
        ];
        
        let currentIndex = 0;

        // Set initial presence
        client.user.setPresence({
            activities: [{
                name: statusMessages[0].text,
                type: statusMessages[0].type,
            }],
            status: 'online'
        });

        // Rotate status every 15 seconds
        setInterval(() => {
            currentIndex = (currentIndex + 1) % statusMessages.length;
            client.user.setPresence({
                activities: [{
                    name: statusMessages[currentIndex].text,
                    type: statusMessages[currentIndex].type,
                }],
                status: 'online'
            });
        }, 15000);
       
        // Cache all guild invites for tracking AND track existing members
        for (const guild of client.guilds.cache.values()) {
            try {
                // Cache invites (your existing code)
                const invites = await guild.invites.fetch();
                client.guildInvites.set(guild.id, new Map());
               
                invites.forEach(invite => {
                    client.guildInvites.get(guild.id).set(invite.code, {
                        uses: invite.uses,
                        inviter: invite.inviter
                    });
                });
               
                console.log(`📋 Cached ${invites.size} invites for ${guild.name}`);

                // NEW: Track all existing members
                console.log(`👥 Scanning existing members in ${guild.name}...`);
               
                // Fetch all members if not already cached
                await guild.members.fetch();
               
                let existingMemberCount = 0;
               
                // Add all current members to our tracking with "Unknown" source
                for (const member of guild.members.cache.values()) {
                    if (!member.user.bot) { // Skip bots
                        if (!userJoinSources.has(member.id)) {
                            userJoinSources.set(member.id, 'Unknown invite (joined before bot startup)');
                            existingMemberCount++;
                        }
                    }
                }
               
                console.log(`📝 Added ${existingMemberCount} existing members to tracking in ${guild.name}`);
                console.log(`📊 Total tracked members: ${userJoinSources.size}`);
               
            } catch (error) {
                console.error(`❌ Error setting up ${guild.name}:`, error);
            }
        }

        console.log(`🚀 Bot setup complete! Tracking ${userJoinSources.size} total members across all servers.`);
    }
};