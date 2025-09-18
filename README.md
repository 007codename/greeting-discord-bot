# WelcomeWizard Bot

A rebranded Discord bot that sends a stylish embedded **welcome message via DMs** when someone joins your server. It also **tracks who invited who** using invite codes and stores the data in a local file.

---

## 📁 Project Structure
```
greeting-bot/
 ├── commands/                  # Bot commands like /invite and /stats
 ├── database/
 │   └── invites.json           # Local database for invite tracking
 │   └── members.json           # Local database for member tracking
 ├── events/
 │   ├── guildMemberAdd.js      # Handles new member joins (sends DM, tracks invite)
 │   ├── guildMemberRemove.js   # Handles member leaves
 │   └── ready.js               # Logs bot startup
 ├── utils/
 │   └── memberDatabase.js      # DB logic between
 ├── .env                       # Bot token
 ├── .gitignore                 # Ignores .env and node_modules
 ├── config.json                # Bot settings
 ├── index.js                   # Bot entry point
 ├── package.json               # Project metadata
 ├── package-lock.json          # Exact dependency versions
 └── README.md                  # You're reading this
```

---

## 🛠️ Features

- Sends a personalized DM welcome to new users
- Tracks who invited the new member (with invite code detection)
- `/invite` and `/stats` slash commands
- Lightweight and modular structure
- Uses `.env` and `config.json` for easy configuration

---

## 🚀 Getting Started

### 1. Clone the Repo
```bash
git clone https://github.com/007codename/greeting-bot.git
cd greeting-bot
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Environment Variables
Create a `.env` file and add your bot token:
```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_clien_id_here
```
⚠️ Don't share this. It's excluded from version control via `.gitignore`.

### 4. Configure the Bot
Edit `config.json` to fit your server:
```json
{
    "guildId": "your_guild_id",
    "joinLeaveChannelId": "your_join_leave_channel_id"
}
```

### 5. Run the Bot
```bash
node index.js
```

---

## 🧠 Notes
- Make sure **"Server Members Intent"** is enabled in the [Discord Developer Portal](https://discord.com/developers/applications).
- This bot currently stores data locally. For multi-server or persistent tracking, connect to a real database.

---

## 📜 License
MIT License. Fork it. Remix it. Break it.

---

## 🧑‍💻 Author
Made with ❤️ by Discord: **@007codename**
