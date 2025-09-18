// commands/stats.js - Unified Statistics command
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getAllMembers, getMemberCount } = require('../utils/memberDatabase.js');

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
        .setDescription('Show server statistics')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of statistics to show')
                .setRequired(true)
                .addChoices(
                    { name: 'Invite Usage', value: 'invites' },
                    { name: 'Member Tracking', value: 'members' }
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const statsType = interaction.options.getString('type');

        try {
            if (statsType === 'invites') {
                await handleInviteStats(interaction);
            } else if (statsType === 'members') {
                await handleMemberStats(interaction);
            }
        } catch (error) {
            console.error('❌ Error in stats command:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Error fetching statistics. Make sure the bot has proper permissions.',
                    flags: 64
                });
            }
        }
    }
};

// Helper functions
async function handleInviteStats(interaction) {
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

    let totalTrackedUses = 0;
    let activeInvites = 0;
    const inviteStats = {};

    // Check each tracked invite and collect stats
    for (const [code, data] of Object.entries(trackedInvites)) {
        const serverInvite = serverInvites.get(code);
       
        if (serverInvite) {
            const currentUses = serverInvite.uses;
            inviteStats[data.name] = {
                uses: currentUses,
                code: code,
                active: true
            };
            totalTrackedUses += currentUses;
            activeInvites++;
            
            // Update uses in database
            trackedInvites[code].uses = currentUses;
        } else {
            // Invite no longer exists or expired
            inviteStats[data.name] = {
                uses: data.uses,
                code: code,
                active: false
            };
        }
    }

    // Save updated uses to database
    try {
        fs.writeFileSync(INVITES_PATH, JSON.stringify(trackedInvites, null, 2));
    } catch (error) {
        console.error('❌ Error updating invite uses:', error);
    }

    // Sort invites by usage (highest first)
    const sortedInvites = Object.entries(inviteStats)
        .sort(([,a], [,b]) => b.uses - a.uses);

    const statsEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('📊 Invite Usage Statistics')
        .setDescription(`Currently tracking **${Object.keys(trackedInvites).length}** invites with **${totalTrackedUses}** total uses`)
        .setThumbnail(interaction.guild.iconURL())
        .setTimestamp();

    // Add top invites (limit to 15)
    let inviteDescription = '';
    for (const [name, stats] of sortedInvites.slice(0, 15)) {
        const percentage = totalTrackedUses > 0 ? ((stats.uses / totalTrackedUses) * 100).toFixed(1) : '0.0';
        const statusIcon = stats.active ? '' : ' ⚠️';
        inviteDescription += `**${name}${statusIcon}**\n└ ${stats.uses} uses (${percentage}%)\n\n`;
    }

    if (inviteDescription) {
        statsEmbed.addFields({
            name: '📈 Invite Performance',
            value: inviteDescription,
            inline: false
        });
    }

    // Add summary field
    let summaryText = `Active Invites: **${activeInvites}/${Object.keys(trackedInvites).length}**\n`;
    summaryText += `Total Uses: **${totalTrackedUses}**`;
    
    statsEmbed.addFields({
        name: '📋 Summary',
        value: summaryText,
        inline: false
    });

    statsEmbed.setFooter({
        text: `${interaction.guild.name} • Invite Tracker`,
        iconURL: interaction.guild.iconURL()
    });

    await interaction.reply({ embeds: [statsEmbed] });
}

async function handleMemberStats(interaction) {
    const allMembers = getAllMembers();
    const totalMembers = getMemberCount();

    if (totalMembers === 0) {
        await interaction.reply({
            content: '📊 No tracked members found.',
            flags: 64
        });
        return;
    }

    // Count members by join source
    const sourceStats = {};
    for (const joinSource of Object.values(allMembers)) {
        sourceStats[joinSource] = (sourceStats[joinSource] || 0) + 1;
    }

    // Sort by count (highest first)
    const sortedSources = Object.entries(sourceStats)
        .sort(([,a], [,b]) => b - a);

    const statsEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('👥 Member Tracking Statistics')
        .setDescription(`Currently tracking **${totalMembers}** members`)
        .setThumbnail(interaction.guild.iconURL())
        .setTimestamp();

    // Add top sources
    let sourceDescription = '';
    for (const [source, count] of sortedSources.slice(0, 15)) {
        const percentage = ((count / totalMembers) * 100).toFixed(1);
        sourceDescription += `**${source}**\n└ ${count} members (${percentage}%)\n\n`;
    }

    if (sourceDescription) {
        statsEmbed.addFields({
            name: '📈 Join Sources',
            value: sourceDescription,
            inline: false
        });
    }

    statsEmbed.setFooter({
        text: `${interaction.guild.name} • Member Database`,
        iconURL: interaction.guild.iconURL()
    });

    await interaction.reply({ embeds: [statsEmbed] });
}