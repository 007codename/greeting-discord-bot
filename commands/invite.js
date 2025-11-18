// commands/invites.js - Unified Invites management command

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { validateInvites } = require('../utils/inviteValidator.js');

const INVITES_PATH = path.join(__dirname, '../database/invites.json');

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
                    ephemeral: true
                });
            }
        }
    }
};

async function handleAddCustomName(interaction, inviteInput, customName) {
    if (!inviteInput || !customName) {
        await interaction.reply({
            content: '❌ Both invite and name are required.',
            ephemeral: true
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
                ephemeral: true
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

            await interaction.reply({ embeds: [successEmbed], ephemeral: true });
        } else {
            await interaction.reply({ 
                content: '❌ Failed to save changes.', 
                ephemeral: true 
            });
        }

    } catch (error) {
        console.error('Error assigning custom name:', error);
        await interaction.reply({ 
            content: '❌ Invalid invite code or invite not found in this server.', 
            ephemeral: true 
        });
    }
}

async function handleRemoveCustomName(interaction, inviteInput) {
    if (!inviteInput) {
        await interaction.reply({
            content: '❌ Invite code/link is required.',
            ephemeral: true
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
                ephemeral: true
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

            await interaction.reply({ embeds: [removeEmbed], ephemeral: true });
        } else {
            await interaction.reply({ 
                content: '❌ Failed to save changes.', 
                ephemeral: true 
            });
        }
    } else {
        await interaction.reply({ 
            content: '❌ This invite is not being tracked.', 
            ephemeral: true 
        });
    }
}

async function handleListInvites(interaction) {
    const trackedInvites = loadTrackedInvites();
    
    if (Object.keys(trackedInvites).length === 0) {
        await interaction.reply({ 
            content: '📝 No invites are currently being tracked.', 
            ephemeral: true 
        });
        return;
    }

    const listEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🔗 Tracked Invites')
        .setTimestamp();

    let description = '';
    for (const [code, data] of Object.entries(trackedInvites)) {
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

    listEmbed.setDescription(description);
    await interaction.reply({ embeds: [listEmbed], ephemeral: true });
}

async function handleValidateInvites(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        const stats = await validateInvites(interaction.guild);
        
        if (stats.error) {
            await interaction.editReply({
                content: `❌ Error during validation: ${stats.error}`
            });
            return;
        }
        
        const validationEmbed = new EmbedBuilder()
            .setColor(stats.removed > 0 ? 0xFF6B00 : 0x00FF00)
            .setTitle('🔍 Invite Validation Complete')
            .setTimestamp();
        
        let description = `**Total Tracked:** ${stats.total}\n`;
        description += `**Valid Invites:** ${stats.valid} ✅\n`;
        description += `**Removed (Expired):** ${stats.removed} 🗑️\n\n`;
        
        if (stats.removed > 0) {
            description += `**Removed Invites:**\n`;
            for (const invite of stats.removedInvites.slice(0, 10)) {
                const typeIcon = invite.isCustomName ? '🏷️' : '👤';
                description += `${typeIcon} \`${invite.code}\` - ${invite.displayName} (${invite.uses} uses)\n`;
            }
            
            if (stats.removedInvites.length > 10) {
                description += `\n*...and ${stats.removedInvites.length - 10} more*`;
            }
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