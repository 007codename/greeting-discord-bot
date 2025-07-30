import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { REST, Routes } from 'discord.js';
import config from './config.json' assert { type: 'json' };

dotenv.config();

const commands = [];
const commandsPath = path.resolve('./commands');

for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const command = await import(`./commands/${file}`);
  commands.push(command.default.data.toJSON());
}

if (!process.env.TOKEN) {
  console.error('Error: TOKEN missing in .env');
  process.exit(1);
}
if (!process.env.CLIENT_ID) {
  console.error('Error: CLIENT_ID missing in .env');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();
