// commands/stats.js - Unified Statistics command (with archived filtering)

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getAllMembers, getMemberCount } = require('../utils/memberDatabase.js');

const INVITES_PATH = path.join(__dirname, '../database/invites.json');

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
                    content: '❌ Error fetching statistics.',
                    flags: 64
                });
            }
        }
    }
};

async function handleInviteStats(interaction) {
    const serverInvites = await interaction.guild.invites.fetch();
    const trackedInvites = loadTrackedInvites();

    // Filter out archived invites
    const activeTrackedInvites = Object.fromEntries(
        Object.entries(trackedInvites).filter(([code, data]) => !data.archived)
    );

    if (Object.keys(activeTrackedInvites).length === 0) {
        await interaction.reply({
            content: '📊 No active tracked invites found.',
            flags: 64
        });
        return;
    }

    let totalTrackedUses = 0;
    let activeInvites = 0;

    // Group invites by display name (custom names separate, creators grouped)
    const groupedStats = {};

    for (const [code, data] of Object.entries(activeTrackedInvites)) {
        const serverInvite = serverInvites.get(code);
        const isActive = !!serverInvite;
        const currentUses = isActive ? serverInvite.uses : data.uses;

        // Resolve display name
        let displayName = data.name;
        let groupKey = data.name; // Key for grouping

        if (data.isCustomName) {
            // Custom names are NOT grouped - each gets its own entry
            displayName = data.name;
            groupKey = `custom_${code}`; // Unique key so they don't get grouped
        } else if (data.name !== 'Unknown') {
            // Creator invites - resolve username and group by creator ID
            try {
                const user = await interaction.client.users.fetch(data.name);
                displayName = user.tag;
                groupKey = `creator_${data.name}`; // Group by creator user ID
            } catch (error) {
                displayName = `<@${data.name}>`;
                groupKey = `creator_${data.name}`;
            }
        } else {
            displayName = 'Unknown';
            groupKey = 'unknown';
        }

        // Initialize or update group
        if (!groupedStats[groupKey]) {
            groupedStats[groupKey] = {
                displayName: displayName,
                totalUses: 0,
                inviteCount: 0,
                activeCount: 0,
                isCustomName: data.isCustomName,
                codes: []
            };
        }

        groupedStats[groupKey].totalUses += currentUses;
        groupedStats[groupKey].inviteCount += 1;
        if (isActive) {
            groupedStats[groupKey].activeCount += 1;
            activeInvites++;
        }
        groupedStats[groupKey].codes.push(code);

        totalTrackedUses += currentUses;

        // Update uses in database if active
        if (isActive) {
            trackedInvites[code].uses = currentUses;
        }
    }

    // Save updated uses
    try {
        fs.writeFileSync(INVITES_PATH, JSON.stringify(trackedInvites, null, 2));
    } catch (error) {
        console.error('❌ Error updating invite uses:', error);
    }

    // Sort by total uses
    const sortedStats = Object.values(groupedStats)
        .sort((a, b) => b.totalUses - a.totalUses);

    const statsEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('📊 Invite Usage Statistics')
        .setDescription(`Tracking **${Object.keys(activeTrackedInvites).length}** active invites with **${totalTrackedUses}** total uses`)
        .setThumbnail(interaction.guild.iconURL())
        .setTimestamp();

    let inviteDescription = '';
    for (const stats of sortedStats.slice(0, 15)) {
        const percentage = totalTrackedUses > 0 ? ((stats.totalUses / totalTrackedUses) * 100).toFixed(1) : '0.0';
        const typeIcon = stats.isCustomName ? '🏷️' : '👤';
        const statusInfo = stats.inviteCount > 1
            ? ` (${stats.inviteCount} invites, ${stats.activeCount} active)`
            : stats.activeCount === 0 ? ' ⚠️' : '';

        inviteDescription += `${typeIcon} **${stats.displayName}${statusInfo}**\n`;
        inviteDescription += `└ ${stats.totalUses} uses (${percentage}%)\n\n`;
    }

    if (inviteDescription) {
        statsEmbed.addFields({
            name: '📈 Invite Performance',
            value: inviteDescription,
            inline: false
        });
    }

    statsEmbed.addFields({
        name: '📋 Summary',
        value: `Active: **${activeInvites}/${Object.keys(activeTrackedInvites).length}** | Total Uses: **${totalTrackedUses}**`,
        inline: false
    });

    // Show archived count if any exist
    const archivedCount = Object.keys(trackedInvites).length - Object.keys(activeTrackedInvites).length;
    if (archivedCount > 0) {
        statsEmbed.setFooter({
            text: `${interaction.guild.name} • ${archivedCount} archived invites (use /invites list to view)`,
            iconURL: interaction.guild.iconURL()
        });
    } else {
        statsEmbed.setFooter({
            text: `${interaction.guild.name} • 🏷️ = Custom Name | 👤 = Creator (grouped)`,
            iconURL: interaction.guild.iconURL()
        });
    }

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

    const trackedInvites = loadTrackedInvites();

    // Group members by creator (for unnamed invites) or custom name
    const groupedStats = {};

    for (const inviteCode of Object.values(allMembers)) {
        if (inviteCode === 'unknown' || inviteCode === 'untracked') {
            groupedStats['Unknown'] = (groupedStats['Unknown'] || 0) + 1;
            continue;
        }

        const inviteData = trackedInvites[inviteCode];
        if (!inviteData) {
            groupedStats['Unknown'] = (groupedStats['Unknown'] || 0) + 1;
            continue;
        }

        // Resolve display name and group key
        let displayName = inviteData.name;
        let groupKey = inviteData.name;

        if (inviteData.isCustomName) {
            // Custom names stay separate
            displayName = inviteData.name;
            groupKey = `custom_${inviteCode}`;
        } else if (inviteData.name !== 'Unknown') {
            // Group by creator
            try {
                const user = await interaction.client.users.fetch(inviteData.name);
                displayName = user.tag;
                groupKey = `creator_${inviteData.name}`;
            } catch (error) {
                displayName = `<@${inviteData.name}>`;
                groupKey = `creator_${inviteData.name}`;
            }
        } else {
            displayName = 'Unknown';
            groupKey = 'unknown';
        }

        // Use groupKey for counting (so multiple invites by same creator are grouped)
        if (!groupedStats[groupKey]) {
            groupedStats[groupKey] = {
                displayName: displayName,
                count: 0
            };
        }
        groupedStats[groupKey].count += 1;
    }

    // Convert to array and sort
    const sortedSources = Object.values(groupedStats)
        .map(stat => [stat.displayName, stat.count])
        .sort(([,a], [,b]) => b - a);

    const statsEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('👥 Member Tracking Statistics')
        .setDescription(`Currently tracking **${totalMembers}** members`)
        .setThumbnail(interaction.guild.iconURL())
        .setTimestamp();

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
        text: `${interaction.guild.name} • Member Database (creators grouped)`,
        iconURL: interaction.guild.iconURL()
    });

    await interaction.reply({ embeds: [statsEmbed] });
}