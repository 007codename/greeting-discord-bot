// events/ready.js - Bot ready event
const { ActivityType } = require('discord.js');
const { addMember, getMemberCount, getAllMembers } = require('../utils/memberDatabase.js');
const { syncInvitesToDatabase } = require('../utils/inviteValidator.js');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`👋 Bot is ready! Logged in as ${client.user.tag}`);
       
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

        client.once('destroy', () => {
            clearInterval(statusInterval);
        });
       
        let setupErrors = [];
        
        for (const guild of client.guilds.cache.values()) {
            try {
                // Initialize guild invites cache
                if (!client.guildInvites) {
                    client.guildInvites = new Map();
                }
                
                console.log(`\n📋 Setting up ${guild.name}...`);
                
                // STEP 1: Sync ALL Discord invites to database first
                const syncStats = await syncInvitesToDatabase(guild);
                
                // STEP 2: Fetch and cache invites for comparison
                const invites = await guild.invites.fetch();
                client.guildInvites.set(guild.id, new Map());
               
                invites.forEach(invite => {
                    client.guildInvites.get(guild.id).set(invite.code, {
                        uses: invite.uses,
                        inviter: invite.inviter
                    });
                });
                
                console.log(`  💾 Cached ${invites.size} invites for tracking`);
               
                // STEP 3: Track existing members
                await guild.members.fetch();
                const trackedMembers = getAllMembers();
                let existingMemberCount = 0;
               
                for (const member of guild.members.cache.values()) {
                    if (!member.user.bot && !trackedMembers[member.id]) {
                        addMember(member.id, 'unknown');
                        existingMemberCount++;
                    }
                }

                console.log(`  👥 Added ${existingMemberCount} existing members to tracking`);
                console.log(`✅ Setup complete for ${guild.name}`);
               
            } catch (error) {
                console.error(`❌ Error setting up ${guild.name}:`, error);
                setupErrors.push(error.message);
            }
        }
       
        const totalMembers = getMemberCount();
        console.log(`\n✅ Bot setup complete! Tracking ${totalMembers} total members.`);
        
        // Start periodic validation (every 6 hours)
        setInterval(async () => {
            console.log('\n🔄 Running periodic invite validation...');
            const { validateInvites } = require('../utils/inviteValidator.js');
            
            for (const guild of client.guilds.cache.values()) {
                try {
                    await validateInvites(guild);
                } catch (error) {
                    console.error(`❌ Error validating ${guild.name}:`, error);
                }
            }
        }, 6 * 60 * 60 * 1000); // 6 hours
        
        if (process.send) {
            if (setupErrors.length > 0) {
                process.send(`Greeting Bot ready with ${setupErrors.length} setup errors!`);
            } else {
                process.send('Greeting Bot ready! All invites synced and tracking active.');
            }
        }
    }
};