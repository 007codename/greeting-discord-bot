const { EmbedBuilder } = require('discord.js');
const config = require('../config');

// If using #RRGGBB style color in config, convert to number
const parseColor = (color) =>
  typeof color === 'string' && color.startsWith('#')
    ? parseInt(color.replace('#', ''), 16)
    : color;

module.exports = async (member) => {
  const channel = member.guild.channels.cache.get(config.welcomeChannelId);
  if (!channel) return;

  const welcomeEmbed = new EmbedBuilder()
    .setTitle(config.embedTitle)
    .setDescription(config.embedMessage.replace('{user}', `<@${member.id}>`))
    .setColor(parseColor(config.embedColor))
    .setImage(config.embedImageURL)
    .setTimestamp();

  await channel.send({ embeds: [welcomeEmbed] });
};
