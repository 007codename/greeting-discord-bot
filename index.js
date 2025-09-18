// index.js - Main bot file
require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.DirectMessages
    ]
});

// Set max listeners to prevent warnings
client.setMaxListeners(0);

// Store guild invites for tracking
client.guildInvites = new Map();

// Create commands collection
client.commands = new Collection();

// Load command files
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
const commands = [];

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
        console.log(`👋 Loaded command: ${command.data.name}`);
    } else {
        console.log(`WelcomeWizard#2229: ❌ Command at ${filePath} is missing required properties`);
    }
}

// Load event files
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
    // console.log(`✅ Loaded event: ${event.name}`);
}

// Handle slash command interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`❌ No command matching ${interaction.commandName} found`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error('❌ Error executing command:', error);
        
        const errorMessage = {
            content: 'There was an error executing this command!',
            flags: 64
        };
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
});

// Register slash commands globally
const rest = new REST().setToken(process.env.GREETING_BOT_TOKEN);

(async () => {
    try {
        console.log(`👋 Started refreshing ${commands.length} global slash commands...`);
        
        const data = await rest.put(
            Routes.applicationCommands(process.env.GREETING_CLIENT_ID),
            { body: commands }
        );
        
        console.log(`👋 Successfully reloaded ${data.length} global slash commands!`);
    } catch (error) {
        console.error('WelcomeWizard#2229: ❌ Error registering commands:', error);
    }
})();

// Graceful shutdown handlers
process.on('SIGTERM', () => {
    console.log('GreetingBot: Received SIGTERM, shutting down gracefully...');
    client.destroy();
});

process.on('SIGINT', () => {
    console.log('GreetingBot: Received SIGINT, shutting down gracefully...');
    client.destroy();
});

// Error handling
process.on('unhandledRejection', error => {
    console.error('WelcomeWizard#2229: ❌ Unhandled promise rejection:', error);
});

// Login to Discord
client.login(process.env.BOT_TOKEN);