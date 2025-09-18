// events/ready.js - Bot ready event
const { ActivityType } = require('discord.js');
const { addMember, getMemberCount, getAllMembers } = require('../utils/memberDatabase.js');

module.exports = {
    name: 'clientReady',
    once: true,
    async execute(client) {
        console.log(`👋 Bot is ready! Logged in as ${client.user.tag}`);
       
        // Status messages array for invite tracking bot
        const statusMessages = [
            { text: '👥 new members join', type: ActivityType.Watching },
            { text: '📊 invite tracking', type: ActivityType.Playing },
            { text: 'DEV: 007codename', type: ActivityType.Playing },
            { text: '🔗 invite analytics', type: ActivityType.Listening },
            { text: 'over server growth', type: ActivityType.Watching },
            { text: '📈 member statistics', type: ActivityType.Watching },
            { text: '🎯 join/leave events', type: ActivityType.Watching }
        ];
       
        let currentIndex = 0;
        
        // Set initial presence with error handling
        try {
            client.user.setPresence({
                activities: [{
                    name: statusMessages[0].text,
                    type: statusMessages[0].type,
                }],
                status: 'online'
            });
        } catch (error) {
            console.error('Error setting initial presence:', error);
        }

        // Rotate status every 15 seconds with error handling
        const statusInterval = setInterval(() => {
            try {
                currentIndex = (currentIndex + 1) % statusMessages.length;
                client.user.setPresence({
                    activities: [{
                        name: statusMessages[currentIndex].text,
                        type: statusMessages[currentIndex].type,
                    }],
                    status: 'online'
                });
            } catch (error) {
                console.error('Error updating bot status:', error);
            }
        }, 15000);

        // Clean up interval on client destroy
        client.once('destroy', () => {
            clearInterval(statusInterval);
        });
       
        // Cache all guild invites for tracking AND track existing members
        let setupErrors = [];
        
        for (const guild of client.guilds.cache.values()) {
            try {
                // Initialize guild invites map if it doesn't exist
                if (!client.guildInvites) {
                    client.guildInvites = new Map();
                }
                
                // Cache invites
                const invites = await guild.invites.fetch();
                client.guildInvites.set(guild.id, new Map());
               
                invites.forEach(invite => {
                    client.guildInvites.get(guild.id).set(invite.code, {
                        uses: invite.uses,
                        inviter: invite.inviter
                    });
                });
               
                // Track existing members using database
                await guild.members.fetch();
               
                // Get currently tracked members
                const trackedMembers = getAllMembers();
                let existingMemberCount = 0;
               
                // Add current members who aren't already tracked
                for (const member of guild.members.cache.values()) {
                    if (!member.user.bot && !trackedMembers[member.id]) {
                        addMember(member.id, 'Unknown invite (joined before bot startup)');
                        existingMemberCount++;
                    }
                }

                console.log(`👋 Setup complete for guild: ${guild.name} (${existingMemberCount} new members tracked)`);
               
            } catch (error) {
                console.error(`❌ Error setting up ${guild.name}:`, error);
                setupErrors.push(error.message);
            }
        }
       
        const totalMembers = getMemberCount();
        console.log(`👋 Bot setup complete! Tracking ${totalMembers} total members.`);
        
        // Send ready status to monitoring system - IMPORTANT FIX
        if (process.send) {
            if (setupErrors.length > 0) {
                process.send(`Greeting Bot ready with ${setupErrors.length} setup errors! Tracking ${totalMembers} members.`);
            } else {
                process.send('Greeting Bot ready! Invite tracking active, member database initialized.');
            }
        }
    }
};