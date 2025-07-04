require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,  // Needed for guildMemberAdd event
    GatewayIntentBits.GuildMessages,
  ],
});

const onMemberJoin = require('./events/guildMemberAdd');

client.on('guildMemberAdd', onMemberJoin);

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
