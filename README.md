# XiryuuBot

A general-purpose WhatsApp bot built on Node.js and `@whiskeysockets/baileys`, with an AI assistant that can search the web and run code. It also ships with a campus module for Alma Ata University's RAISING academic portal, for students who want it.

## Features

- Pairing-code login (no QR scan) and a whitelist so only registered numbers can use the bot
- Commands load automatically from `commands/` — drop a file in, it works
- Multiple prefixes: `.`, `!`, `/`, `\`
- Roles: author, per-program moderator, admin, and registered users. The menu only shows what a role is allowed to see
- AI chat (`.ai`) on any OpenAI-compatible endpoint (default: Groq `openai/gpt-oss-120b`), with web search and sandboxed Node.js code execution
- Media downloader (`.dl`): YouTube and other sites via `yt-dlp`, TikTok via the tikwm.com API, Instagram via `yt-dlp` with a cookie file. Downloads are capped at `DL_MAX_MB` and one runs at a time per instance
- Everything stored in a local SQLite database (`db/bot.db`), auto-created on first run. Old JSON files are migrated automatically

The campus module adds:

- Class schedule lookup (`.jadwal`) and attendance check-in (`.presensi`)
- Task capture: messages that look like a task report (`Course:` / `Judul:` / `Tugas:`) in a class group are picked up automatically and can be managed with `.tugas`
- Scheduled announcements (`.pengumuman`) that get broadcast to the right groups at the set date and time

## Commands

All users who are registered:

| Command | What it does |
| :--- | :--- |
| `.menu` | List of commands for your role, plus bot info |
| `.ping` | Check if the bot responds |
| `.daftar` | Register your own number to the whitelist |
| `.ai <message>` | Chat with the AI |
| `.ai newsession` | Clear the AI chat history |
| `.dl <link>` | Download video (auto-detects YouTube, TikTok, Instagram, and other yt-dlp-supported sites) |
| `.dl audio <link>` | Same, but extracts audio only (MP3) |

Students (registered, with a RAISING account on file):

| Command | What it does |
| :--- | :--- |
| `.jadwal [day/full]` | Your class schedule |
| `.presensi [code]` | Check in to an ongoing (or specific) session |

Moderators (assigned per academic program by the author):

| Command | What it does |
| :--- | :--- |
| `.tugas` / `.tugas <program>` | List captured tasks |
| `.tugas delete <id>` | Delete a task (author, or a moderator of that program) |
| `.pengumuman add <DD/MM/YYYY> <HH:MM> <text> [PROGRAM]` | Schedule an announcement |
| `.pengumuman list [PROGRAM]` | List announcements |
| `.pengumuman edit <id> <DD/MM/YYYY> <HH:MM> <text>` | Edit one |
| `.pengumuman delete <id>` | Delete one |

Author only:

| Command | What it does |
| :--- | :--- |
| `.moderator add <wa_number> <program> <name> <group_id>` | Add a moderator |
| `.moderator list` / `.moderator delete <wa_number>` | Manage moderators |
| `.moderator setdefault <wa_number> <program>` | Set default program for an "ALL" user |
| `.userlist` | Registered users, with RAISING account status |
| `.daftar <number>` | Register someone else |
| `.raising add/list/edit/delete` | Manage RAISING accounts |
| `.restart` | Restart the bot |

The campus module can be ignored entirely: without RAISING accounts configured, those commands simply won't work and the rest of the bot runs as normal.

## Getting started

```bash
git clone git@github.com:xiryuudev/xiryuubot.git
cd xiryuubot
./setup.sh
```

`setup.sh` copies `.env.example` to `.env` (if missing) and runs `npm install`. The SQLite database is created on first run.

Fill in `.env`:

```env
BOT_NAME=XiryuuBot
BOT_NUMBER=62895622331910        # the bot's WhatsApp number
AUTHOR_NUMBER=6289650943134
ADMIN_NUMBER=6289650943134
ADMIN_NAME=Farrel Zacky R
AI_BASE_URL=https://api.groq.com/openai/v1
AI_API_KEY=your_groq_api_key
AI_MODEL=openai/gpt-oss-120b
RAISING_BASE_URL=https://raising.almaata.ac.id
```

Then run it:

```bash
npm run dev   # development, auto-reload
npm start     # production
```

On first start the bot prints a pairing code. Open WhatsApp on the bot's phone, go to Linked devices, and enter it. Send `.daftar` to register your own number.

### Media downloader requirements

`.dl` needs `yt-dlp` and `ffmpeg` installed on the host.

- YouTube and most other sites work out of the box
- TikTok is fetched through the tikwm.com API because TikTok blocks most datacenter IPs directly
- Instagram requires a `cookies.txt` (Netscape format) at the path in `DL_COOKIES`. Export one from a logged-in browser session. If the session expires, the bot logs back in with `IG_USERNAME` / `IG_PASSWORD` and refreshes the file automatically
- `DL_PROXY` (optional) passes a proxy to `yt-dlp` for sites that block your server IP

## Privacy

**No personal data or passwords are stored in the database.**

- RAISING login: NIM and password are used **once** to obtain a session cookie. Only `nim`, `session_hash`, `cookie`, and `id_mahasiswa` are saved. The password is never written to disk.
- WhatsApp numbers and message history (for `.ai`) are stored locally in SQLite for bot operation only.
- No data leaves your server except: WhatsApp traffic (Baileys), RAISING portal requests, and AI provider calls (Groq/OpenAI-compatible endpoint).

To review the full implementation, see the codebase: https://github.com/xiryuudev/xiryuubot

## Project layout

```
commands/    one file per command, loaded at startup
utils/       database, roles, AI history, RAISING scraper, schedulers, helpers
config.js    .env loader
index.js     entry point and message router
db/bot.db    SQLite database (created at runtime, not committed)
```

## Dependencies

- `@whiskeysockets/baileys` — WhatsApp connection
- `better-sqlite3` — local database
- `axios` — RAISING portal requests
- `pino` / `pino-pretty` — logging
- `nodemon` — dev auto-reload

AI calls and web search use Node's built-in `fetch`.

## Author

Farrel Zacky Rahmanda
