# WarmWelcome Bot

A simple Discord bot that sends a warm embedded welcome message when someone joins your server.

---

## 📁 Project Structure
```greeting-bot/
 ├── events/
 │ └── guildMemberAdd.js # Handles new member join event
 ├── node_modules/ # Installed packages
 ├── .env # Contains your bot token (never share this!)
 ├── .gitignore # Ignores node_modules and .env from version control
 ├── config.js # Bot configuration settings
 ├── index.js # Main bot startup file
 ├── package.json # Project metadata and dependencies
 ├── package-lock.json # Exact dependency versions
 └── README.md # This file```

---

## 🛠️ Features

- Sends a welcome message in a designated channel when a user joins
- Modular event handling system
- Uses environment variables for security

---

## 🚀 Getting Started

### 1. **Clone the Repository**
git clone https://github.com/your-username/greeting-bot.git
cd greeting-bot

### 2. Install Dependencies
npm install

### 3. Set Up Environment Variables
* Create a .env file in the root directory:
touch .env
* Then add your bot token:
DISCORD_TOKEN=your_bot_token_here
#### ⚠️ Important: Never share your bot token. This .env file is included in .gitignore.

### 4. Configure the Bot
Open config.js and modify your settings:
```module.exports = {
  // The channel ID where the bot should send welcome messages.
  // To get this, enable Developer Mode in Discord settings, right-click the channel, and click "Copy ID".
  welcomeChannelId: '1287450401297272914',

  // Title of the embed message.
  embedTitle: '👋 Welcome to the Server G!',

  // The welcome message body.
  // Use {user} as a placeholder – it will be replaced with a mention of the new member.
  embedMessage: 'Hey {user}, glad to have you here! 🎉',

  // Embed color – you can use hexadecimal (e.g. '#3498db' for blue).
  embedColor: '#3498db',

  // Image URL to display in the embed.
  // Use a direct link (e.g. from Imgur or Discord CDN). Leave blank "" to skip the image.
  embedImageURL: 'https://www.icegif.com/wp-content/uploads/2023/07/icegif-489.gif'
};```

### 5. Run the Bot
node index.js

---

## 🧠 Notes
* Make sure your bot has the "Server Members Intent" enabled on the Discord Developer Portal.
* Also enable Privileged Gateway Intents if using member joins.

---

## 📜 License
MIT License. Feel free to fork and build on top of this.

---

## 🧑‍💻 Author
Made with ❤️ by Discord Username: @007codename

---
