// commands/invites.js - Unified Invites management command
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const INVITES_PATH = path.join(__dirname, '../database/invites.json');

// Ensure database file exists
if (!fs.existsSync(path.dirname(INVITES_PATH))) {
    fs.mkdirSync(path.dirname(INVITES_PATH), { recursive: true });
}
if (!fs.existsSync(INVITES_PATH)) {
    fs.writeFileSync(INVITES_PATH, '{}');
}

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

// Save tracked invites
function saveTrackedInvites(invites) {
    try {
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
                    { name: 'Add Invite', value: 'add' },
                    { name: 'Remove Invite', value: 'remove' },
                    { name: 'List All Invites', value: 'list' }
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
                await handleAddInvite(interaction, inviteInput, customName);
            } else if (action === 'remove') {
                await handleRemoveInvite(interaction, inviteInput);
            } else if (action === 'list') {
                await handleListInvites(interaction);
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

// Helper functions
async function handleAddInvite(interaction, inviteInput, customName) {
    if (!inviteInput || !customName) {
        await interaction.reply({
            content: '❌ Both invite and name are required for adding an invite.',
            flags: 64
        });
        return;
    }

    // Extract invite code from URL or use as-is
    const inviteCode = inviteInput.replace(/https?:\/\/(www\.)?(discord\.gg\/|discordapp\.com\/invite\/)/, '');

    try {
        // Verify the invite exists in this guild
        const invite = await interaction.guild.invites.fetch(inviteCode);
        
        // Load current tracked invites
        const trackedInvites = loadTrackedInvites();
        
        // Check if invite is already tracked
        if (trackedInvites[inviteCode]) {
            await interaction.reply({
                content: `❌ This invite is already being tracked as **${trackedInvites[inviteCode].name}**.`,
                flags: 64
            });
            return;
        }
        
        // Add new invite
        trackedInvites[inviteCode] = {
            name: customName,
            uses: invite.uses,
            addedAt: new Date().toISOString(),
            addedBy: interaction.user.tag
        };

        // Save to database
        if (saveTrackedInvites(trackedInvites)) {
            const successEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Invite Added Successfully')
                .addFields(
                    { name: 'Invite Code', value: `\`${inviteCode}\``, inline: true },
                    { name: 'Custom Name', value: customName, inline: true },
                    { name: 'Current Uses', value: invite.uses.toString(), inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed], flags: 64 });
        } else {
            await interaction.reply({ 
                content: '❌ Failed to save invite to database.', 
                flags: 64 
            });
        }

    } catch (error) {
        console.error('Error adding invite:', error);
        await interaction.reply({ 
            content: '❌ Invalid invite code or invite not found in this server.', 
            flags: 64 
        });
    }
}

async function handleRemoveInvite(interaction, inviteInput) {
    if (!inviteInput) {
        await interaction.reply({
            content: '❌ Invite code/link is required for removing an invite.',
            flags: 64
        });
        return;
    }

    const inviteCode = inviteInput.replace(/https?:\/\/(www\.)?(discord\.gg\/|discordapp\.com\/invite\/)/, '');
    const trackedInvites = loadTrackedInvites();

    if (trackedInvites[inviteCode]) {
        const removedInvite = trackedInvites[inviteCode];
        delete trackedInvites[inviteCode];

        if (saveTrackedInvites(trackedInvites)) {
            const removeEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('🗑️ Invite Removed')
                .setDescription(`Removed tracking for **${removedInvite.name}** (\`${inviteCode}\`)`)
                .setTimestamp();

            await interaction.reply({ embeds: [removeEmbed], flags: 64 });
        } else {
            await interaction.reply({ 
                content: '❌ Failed to remove invite from database.', 
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

    const listEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🔗 Tracked Invites')
        .setTimestamp();

    let description = '';
    for (const [code, data] of Object.entries(trackedInvites)) {
        description += `**${data.name}**\n`;
        description += `Code: \`${code}\`\n`;
        description += `Uses: ${data.uses}\n`;
        description += `Added: ${new Date(data.addedAt).toLocaleDateString()}\n\n`;
    }

    listEmbed.setDescription(description);
    await interaction.reply({ embeds: [listEmbed], flags: 64 });
}