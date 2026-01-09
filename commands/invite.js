// commands/invites.js - Unified Invites management command (with archived support)

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { validateInvites } = require('../utils/inviteValidator.js');

const INVITES_PATH = path.join(__dirname, '../data/invites.json');

function ensureDatabaseExists() {
    if (!fs.existsSync(path.dirname(INVITES_PATH))) {
        fs.mkdirSync(path.dirname(INVITES_PATH), { recursive: true });
    }
    if (!fs.existsSync(INVITES_PATH)) {
        fs.writeFileSync(INVITES_PATH, '{}');
    }
}

function loadTrackedInvites() {
    try {
        ensureDatabaseExists();
        const data = fs.readFileSync(INVITES_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('❌ Error loading invites:', error);
        return {};
    }
}

function saveTrackedInvites(invites) {
    try {
        ensureDatabaseExists();
        fs.writeFileSync(INVITES_PATH, JSON.stringify(invites, null, 2));
        return true;
    } catch (error) {
        console.error('❌ Error saving invites:', error);
        return false;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invites')
        .setDescription('Manage tracked invites')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Action to perform')
                .setRequired(true)
                .addChoices(
                    { name: 'Add Custom Name', value: 'add' },
                    { name: 'Remove Custom Name', value: 'remove' },
                    { name: 'List All Invites', value: 'list' },
                    { name: 'Validate Invites', value: 'validate' }
                ))
        .addStringOption(option =>
            option.setName('invite')
                .setDescription('The invite link or code (required for add/remove)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Custom name for this invite source (required for add)')
                .setRequired(false)),

    async execute(interaction) {
        const action = interaction.options.getString('action');
        const inviteInput = interaction.options.getString('invite');
        const customName = interaction.options.getString('name');

        try {
            if (action === 'add') {
                await handleAddCustomName(interaction, inviteInput, customName);
            } else if (action === 'remove') {
                await handleRemoveCustomName(interaction, inviteInput);
            } else if (action === 'list') {
                await handleListInvites(interaction);
            } else if (action === 'validate') {
                await handleValidateInvites(interaction);
            }
        } catch (error) {
            console.error('❌ Error in invites command:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Error processing invite command.',
                    flags: 64
                });
            }
        }
    }
};

async function handleAddCustomName(interaction, inviteInput, customName) {
    if (!inviteInput || !customName) {
        await interaction.reply({
            content: '❌ Both invite and name are required.',
            flags: 64
        });
        return;
    }

    const inviteCode = inviteInput.replace(/https?:\/\/(www\.)?(discord\.gg\/|discordapp\.com\/invite\/)/, '');

    try {
        const invite = await interaction.guild.invites.fetch(inviteCode);
        const trackedInvites = loadTrackedInvites();

        if (!trackedInvites[inviteCode]) {
            await interaction.reply({
                content: `❌ This invite is not in the database. It should have been auto-tracked when created.`,
                flags: 64
            });
            return;
        }

        // Store original creator ID before updating
        const originalCreator = trackedInvites[inviteCode].createdBy;

        // Update with custom name
        trackedInvites[inviteCode] = {
            ...trackedInvites[inviteCode],
            name: customName,
            isCustomName: true,
            originalCreator: originalCreator // Keep track of who created it
        };

        if (saveTrackedInvites(trackedInvites)) {
            const successEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Custom Name Assigned')
                .addFields(
                    { name: 'Invite Code', value: `\`${inviteCode}\``, inline: true },
                    { name: 'Custom Name', value: customName, inline: true },
                    { name: 'Current Uses', value: invite.uses.toString(), inline: true }
                )
                .setFooter({ text: 'Members joining through this invite will now show this custom name' })
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed], flags: 64 });
        } else {
            await interaction.reply({
                content: '❌ Failed to save changes.',
                flags: 64
            });
        }

    } catch (error) {
        console.error('Error assigning custom name:', error);
        await interaction.reply({
            content: '❌ Invalid invite code or invite not found in this server.',
            flags: 64
        });
    }
}

async function handleRemoveCustomName(interaction, inviteInput) {
    if (!inviteInput) {
        await interaction.reply({
            content: '❌ Invite code/link is required.',
            flags: 64
        });
        return;
    }

    const inviteCode = inviteInput.replace(/https?:\/\/(www\.)?(discord\.gg\/|discordapp\.com\/invite\/)/, '');
    const trackedInvites = loadTrackedInvites();

    if (trackedInvites[inviteCode]) {
        const inviteData = trackedInvites[inviteCode];

        if (!inviteData.isCustomName) {
            await interaction.reply({
                content: '❌ This invite doesn\'t have a custom name assigned.',
                flags: 64
            });
            return;
        }

        // Revert to original creator ID
        trackedInvites[inviteCode] = {
            ...inviteData,
            name: inviteData.originalCreator || inviteData.createdBy || 'Unknown',
            isCustomName: false
        };

        if (saveTrackedInvites(trackedInvites)) {
            // Try to resolve the user
            let creatorDisplay = 'Unknown';
            try {
                const user = await interaction.client.users.fetch(trackedInvites[inviteCode].name);
                creatorDisplay = user.tag;
            } catch (error) {
                creatorDisplay = `<@${trackedInvites[inviteCode].name}>`;
            }

            const removeEmbed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('🔄 Custom Name Removed')
                .setDescription(`Invite \`${inviteCode}\` has been reverted to show creator: **${creatorDisplay}**`)
                .setTimestamp();

            await interaction.reply({ embeds: [removeEmbed], flags: 64 });
        } else {
            await interaction.reply({
                content: '❌ Failed to save changes.',
                flags: 64
            });
        }
    } else {
        await interaction.reply({
            content: '❌ This invite is not being tracked.',
            flags: 64
        });
    }
}

async function handleListInvites(interaction) {
    const trackedInvites = loadTrackedInvites();

    if (Object.keys(trackedInvites).length === 0) {
        await interaction.reply({
            content: '📝 No invites are currently being tracked.',
            flags: 64
        });
        return;
    }

    // Separate active and archived
    const activeInvites = {};
    const archivedInvites = {};

    for (const [code, data] of Object.entries(trackedInvites)) {
        if (data.archived) {
            archivedInvites[code] = data;
        } else {
            activeInvites[code] = data;
        }
    }

    const listEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🔗 Tracked Invites')
        .setTimestamp();

    let description = '';

    // Show active invites
    if (Object.keys(activeInvites).length > 0) {
        description += '**✅ Active Invites**\n\n';
        for (const [code, data] of Object.entries(activeInvites)) {
            const nameType = data.isCustomName ? '🏷️ Custom' : '👤 Creator';

            // Try to resolve user ID to username if it's not a custom name
            let displayName = data.name;
            if (!data.isCustomName && data.name !== 'Unknown') {
                try {
                    const user = await interaction.client.users.fetch(data.name);
                    displayName = user.tag;
                } catch (error) {
                    displayName = `<@${data.name}>`;
                }
            }

            description += `${nameType} **${displayName}**\n`;
            description += `Code: \`${code}\`\n`;
            description += `Uses: ${data.uses}\n`;
            description += `Created: ${new Date(data.createdAt).toLocaleDateString()}\n\n`;
        }
    }

    // Show archived invites
    if (Object.keys(archivedInvites).length > 0) {
        description += `\n**📦 Archived Invites (${Object.keys(archivedInvites).length})**\n\n`;
        for (const [code, data] of Object.entries(archivedInvites).slice(0, 5)) {
            const nameType = data.isCustomName ? '🏷️' : '👤';

            let displayName = data.name;
            if (!data.isCustomName && data.name !== 'Unknown') {
                try {
                    const user = await interaction.client.users.fetch(data.name);
                    displayName = user.tag;
                } catch (error) {
                    displayName = `<@${data.name}>`;
                }
            }

            description += `${nameType} ${displayName} • \`${code}\` • ${data.uses} uses\n`;
        }

        if (Object.keys(archivedInvites).length > 5) {
            description += `\n*...and ${Object.keys(archivedInvites).length - 5} more archived invites*`;
        }
    }

    listEmbed.setDescription(description);
    listEmbed.setFooter({
        text: 'Archived invites are expired/deleted but preserved for historical tracking',
        iconURL: interaction.guild.iconURL()
    });

    await interaction.reply({ embeds: [listEmbed], flags: 64 });
}

async function handleValidateInvites(interaction) {
    await interaction.deferReply({ flags: 64 });

    try {
        const stats = await validateInvites(interaction.guild);

        if (stats.error) {
            await interaction.editReply({
                content: `❌ Error during validation: ${stats.error}`
            });
            return;
        }

        const validationEmbed = new EmbedBuilder()
            .setColor(stats.archived > 0 ? 0xFF6B00 : 0x00FF00)
            .setTitle('🔍 Invite Validation Complete')
            .setTimestamp();

        let description = `**Total Tracked:** ${stats.total}\n`;
        description += `**Valid Invites:** ${stats.valid} ✅\n`;
        description += `**Already Archived:** ${stats.alreadyArchived} 📦\n`;
        description += `**Newly Archived:** ${stats.archived} 🗃️\n\n`;

        if (stats.archived > 0) {
            description += `**Newly Archived Invites:**\n`;
            for (const invite of stats.archivedInvites.slice(0, 10)) {
                const typeIcon = invite.isCustomName ? '🏷️' : '👤';
                description += `${typeIcon} \`${invite.code}\` - ${invite.displayName} (${invite.uses} uses)\n`;
            }

            if (stats.archivedInvites.length > 10) {
                description += `\n*...and ${stats.archivedInvites.length - 10} more*`;
            }

            description += `\n\n✨ *Archived invites are preserved for historical tracking and won't affect stats.*`;
        } else {
            description += `All tracked invites are still valid! ✨`;
        }

        validationEmbed.setDescription(description);
        validationEmbed.setFooter({
            text: 'Validation checks against Discord\'s current invites',
            iconURL: interaction.guild.iconURL()
        });

        await interaction.editReply({ embeds: [validationEmbed] });

    } catch (error) {
        console.error('Error in validate command:', error);
        await interaction.editReply({
            content: '❌ An error occurred during validation.'
        });
    }
}