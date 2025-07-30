// commands/invites.js - Invites management command
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
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add an invite to track')
                .addStringOption(option =>
                    option
                        .setName('invite')
                        .setDescription('The invite link or code')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('Custom name for this invite source (e.g., "YouTube Comments", "Partnership")')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove an invite from tracking')
                .addStringOption(option =>
                    option
                        .setName('invite')
                        .setDescription('The invite link or code to remove')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all tracked invites')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'add') {
            const inviteInput = interaction.options.getString('invite');
            const customName = interaction.options.getString('name');

            // Extract invite code from URL or use as-is
            const inviteCode = inviteInput.replace(/https?:\/\/(www\.)?(discord\.gg\/|discordapp\.com\/invite\/)/, '');

            try {
                // Verify the invite exists in this guild
                const invite = await interaction.guild.invites.fetch(inviteCode);
                
                // Load current tracked invites
                const trackedInvites = loadTrackedInvites();
                
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

        } else if (subcommand === 'remove') {
            const inviteInput = interaction.options.getString('invite');
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
                        ephemeral: true 
                    });
                }
            } else {
                await interaction.reply({ 
                    content: '❌ This invite is not being tracked.', 
                    ephemeral: true 
                });
            }

        } else if (subcommand === 'list') {
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
                description += `**${data.name}**\n`;
                description += `Code: \`${code}\`\n`;
                description += `Uses: ${data.uses}\n`;
                description += `Added: ${new Date(data.addedAt).toLocaleDateString()}\n\n`;
            }

            listEmbed.setDescription(description);
            await interaction.reply({ embeds: [listEmbed], flags: 64 });
        }
    }
};