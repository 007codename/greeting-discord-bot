// commands/stats.js - Stats command
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const INVITES_PATH = path.join(__dirname, '../database/invites.json');

// Load tracked invites
function loadTrackedInvites() {
    try {
        const data = fs.readFileSync(INVITES_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('❌ Error loading invites:', error);
        return {};
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Show invite usage statistics'),

    async execute(interaction) {
        try {
            // Get all server invites
            const serverInvites = await interaction.guild.invites.fetch();
            const trackedInvites = loadTrackedInvites();

            if (Object.keys(trackedInvites).length === 0) {
                await interaction.reply({ 
                    content: '📊 No tracked invites found. Use `/invites add` to start tracking invites.', 
                    flags: 64    
                });
                return;
            }

            const statsEmbed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('📊 Invite Usage Statistics')
                .setThumbnail(interaction.guild.iconURL())
                .setTimestamp();

            let description = '';
            let totalTrackedUses = 0;
            let foundInvites = 0;

            // Check each tracked invite
            for (const [code, data] of Object.entries(trackedInvites)) {
                const serverInvite = serverInvites.get(code);
                
                if (serverInvite) {
                    const currentUses = serverInvite.uses;
                    description += `**${data.name}**\n`;
                    description += `└ Uses: **${currentUses}**\n`;
                    description += `└ Code: \`${code}\`\n\n`;
                    
                    totalTrackedUses += currentUses;
                    foundInvites++;

                    // Update uses in database
                    trackedInvites[code].uses = currentUses;
                } else {
                    // Invite no longer exists or expired
                    description += `**${data.name}** ⚠️\n`;
                    description += `└ Uses: **${data.uses}** (Last known)\n`;
                    description += `└ Status: *Expired/Deleted*\n\n`;
                }
            }

            // Save updated uses to database
            try {
                fs.writeFileSync(INVITES_PATH, JSON.stringify(trackedInvites, null, 2));
            } catch (error) {
                console.error('❌ Error updating invite uses:', error);
            }

            // Add summary
            description += `\n**📈 Summary**\n`;
            description += `Total Tracked Uses: **${totalTrackedUses}**\n`;
            description += `Active Invites: **${foundInvites}/${Object.keys(trackedInvites).length}**`;

            statsEmbed.setDescription(description);

            // Add footer with last updated time
            statsEmbed.setFooter({ 
                text: `Last updated • ${interaction.guild.name}`, 
                iconURL: interaction.guild.iconURL() 
            });

            await interaction.reply({ embeds: [statsEmbed] });

        } catch (error) {
            console.error('❌ Error in stats command:', error);
            await interaction.reply({ 
                content: '❌ Error fetching invite statistics. Make sure the bot has "Manage Server" permission.', 
                flags: 64 
            });
        }
    }
};