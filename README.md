# ✨ WelcomeWizard Bot

> A polished, well-structured Discord bot that welcomes new members with DMs, tracks invites, logs joins/leaves, and generates personalized welcome cards.

<div align="center">

![Node](https://img.shields.io/badge/Node.js-16%2B-339933?logo=node.js&logoColor=white)
![Discord.js](https://img.shields.io/badge/discord.js-14.x-5865F2?logo=discord&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-0FA36B)

<a href="https://discord.com/developers/applications">Discord Developer Portal</a>
•
<a href="#-features">Features</a>
•
<a href="#-quick-start">Quick Start</a>
•
<a href="#-commands">Commands</a>
•
<a href="#-configuration">Configuration</a>

</div>

---

## 🌟 Features

| Feature | What you get |
| --- | --- |
| 💌 Welcome DMs | Stylish embedded messages for every new member. |
| 🧭 Invite Tracking | See who invited who via invite code analytics. |
| 🧾 Join/Leave Logs | Moderation-friendly logs with rich embeds. |
| 🖼️ Welcome Cards | Personalized images generated with `canvacord`. |
| ⚡ Slash Commands | `/invites` and `/stats` toolset for admins. |
| 🗂️ Local JSON Storage | Lightweight files auto-created at runtime. |

---

## 🧭 Project Structure

```
.
├── commands/              # Slash commands
│   ├── invite.js           # /invites management
│   └── stats.js            # /stats analytics
├── events/                 # Discord event handlers
│   ├── guildMemberAdd.js   # Welcome DM + invite tracking + welcome card
│   ├── guildMemberRemove.js# Leave log + invite lookup
│   ├── inviteCreate.js     # Auto-track new invites
│   ├── inviteDelete.js     # Clean up deleted invites
│   └── ready.js            # Startup sync + invite validation schedule
├── models/
│   └── WelcomeCard.js      # Welcome card renderer
├── utils/
│   ├── inviteValidator.js  # Invite sync + validation helpers
│   └── memberDatabase.js   # Member tracking storage
├── data/                   # Auto-created JSON storage (members/invites)
├── .env.example            # Environment variable template
├── config.json.example     # Bot configuration template
├── index.js                # Bot entry point
└── package.json
```

---

## 🚀 Quick Start

> **Estimated setup time:** 5–10 minutes

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

Copy `.env.example` to `.env` and fill in:

```env
BOT_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
```

### 3) Configure bot settings

Copy `config.json.example` to `config.json` and set the channel IDs used by the bot:

```json
{
  "joinLeaveChannelId": "your_join_leave_channel_id",
  "welcomeCardChannelId": "your_welcome_card_channel_id",
  "welcomeCardBackground": "https://your-image-url.com/background.png"
}
```

### 4) Run the bot

```bash
node index.js
```

---

## 🤖 Commands

> Requires **Manage Server** permissions.

| Command | Subcommand | Purpose |
| --- | --- | --- |
| `/invites` | `add` | Assign a custom name to an invite. |
| `/invites` | `remove` | Remove a custom invite name. |
| `/invites` | `list` | List active + archived invites. |
| `/invites` | `validate` | Archive deleted/expired invites. |
| `/stats` | `invites` | Invite performance & usage. |
| `/stats` | `members` | Member join sources. |

---

## ⚙️ Configuration & Permissions

### Intents
Enable these in the Discord Developer Portal:

- **Server Members Intent**
- **Guild Invites Intent**
- **Direct Messages Intent**

### Recommended Bot Permissions
- View Channels
- Send Messages
- Embed Links
- Read Message History

---

## 📦 Data Storage

The bot stores lightweight JSON files at runtime. Directories are created automatically:

- `data/members.json` — member → invite tracking
- `data/invites.json` — invite metadata

> If you want multi-server persistence or analytics at scale, swap these files for a real database.

---

## 🛠️ Development Notes

| Area | Details |
| --- | --- |
| Slash Commands | Registered globally on startup. |
| Invite Validation | Runs every 6 hours to archive expired invites. |
| Welcome Cards | Supports a custom background image via `config.json`. |

---

## 📌 Roadmap Ideas (Optional)

- [ ] Add a database adapter (MongoDB/Postgres).
- [ ] Per-guild configuration UI or `/setup` wizard.
- [ ] Customizable welcome DM templates.

---

## 📄 License

MIT

---

## 👤 Author

Discord: **[@007codename](https://discordapp.com/users/883965319171952660)**