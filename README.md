# XiryuuBot

WhatsApp bot general-purpose berbasis Node.js menggunakan `@whiskeysockets/baileys` dan AI assistant dengan tool-calling. Siap dipakai untuk khalayak umum; integrasi kampus (Portal Akademik RAISING — Alma Ata University) tersedia sebagai modul tambahan untuk mahasiswa.

---

## Fitur Utama

### 🔹 Core

- **Autentikasi Pairing Code**: Koneksi mudah tanpa QR code, menggunakan pairing code nomor WhatsApp.
- **Whitelist User Filter**: Akses bot dibatasi oleh whitelist (SQLite table `users`).
- **Dynamic Command Loader**: Memuat command otomatis dari folder `commands/` (cukup tambah file `.js`).
- **Multi-Prefix Support**: Mendukung awalan `!`, `.`, `/`, `\`.
- **Hierarki Role**: Author → Moderator (per prodi) → Admin → User terdaftar, dengan filtering visibility menu (`global`, `mahasiswa`, `moderator`, `admin`).
- **AI Assistant with Tools (`.ai`)**:
  - Endpoint OpenAI-compatible (default: Groq, `openai/gpt-oss-120b`).
  - Mendukung **Web Search** (DuckDuckGo) & **Code Execution** (Sandbox Node.js).
  - History percakapan per user (max 3 pasang pesan, auto-trim).
  - Reset sesi via `.ai newsession`.
- **SQLite Database** (`db/bot.db`, via `better-sqlite3`):
  - Tabel `users`, `moderators`, `tasks`, `raising_users`, `ai_chats`, `pengumuman`.
  - Auto-migrate dari file JSON lama saat startup.
- **Global Config & Logging**: Konfigurasi terpusat via `.env` + `config.js`, colored logging `pino-pretty`.

### 🔹 Campus Module (RAISING) — opsional

- Scraping jadwal kuliah (`.jadwal`).
- Presensi kuliah otomatis/manual (`.presensi`).
- Manajemen akun RAISING admin (`.raising add/list/edit/delete`).
- **Auto Task Capture**: pesan/dokumen yang memuat pola laporan tugas (`Course:`, `Judul:`, `Tugas:`) di chat/grup materi otomatis tercatat sebagai task (SQLite table `tasks`). Moderator dapat melihat/menghapus via `.tugas`.
- **Pengumuman terjadwal** (`.pengumuman add/list/edit/delete`): broadcast otomatis ke grup terkait pada tanggal & jam yang ditentukan (scheduler tick per menit).

---

## 📋 Daftar Command

### 🔹 User Global (semua yang terdaftar)

| Command | Deskripsi |
| :--- | :--- |
| `.menu` | Menampilkan daftar command sesuai role, info pengguna, dan info bot. |
| `.ping` | Cek status respon bot. |
| `.daftar` | Mendaftarkan nomor WhatsApp Anda ke whitelist bot (self-registration). |
| `.ai <pesan>` | Ngobrol dengan AI Assistant (mendukung search web & run JS). |
| `.ai newsession` | Menghapus history chat AI dan memulai sesi baru dari 0. |

### 🔹 Mahasiswa (terdaftar + akun RAISING)

| Command | Deskripsi |
| :--- | :--- |
| `.jadwal [hari/full]` | Menampilkan jadwal kuliah RAISING (hari ini, besok, spesifik hari, atau full). |
| `.presensi [kode]` atau `.presensi <id> <kode>` | Mengisi presensi kuliah yang sedang berlangsung atau spesifik sesi. |

### 🔹 Moderator (per prodi, ditentukan author)

| Command | Deskripsi |
| :--- | :--- |
| `.tugas` / `.tugas <prodi>` | Lihat daftar tugas (moderator: prodi sendiri; author: prodi tertentu). |
| `.tugas delete <id>` | Hapus tugas berdasarkan ID (author atau moderator prodi tersebut). |
| `.pengumuman add <DD/MM/YYYY> <HH:MM> <deskripsi> [PRODI]` | Tambah pengumuman terjadwal. |
| `.pengumuman list [PRODI]` | Lihat daftar pengumuman. |
| `.pengumuman edit <ID> <DD/MM/YYYY> <HH:MM> <deskripsi>` | Edit pengumuman. |
| `.pengumuman delete <ID>` | Hapus pengumuman. |

### 🔹 Author

| Command | Deskripsi |
| :--- | :--- |
| `.moderator add <nomor_wa> <kode_prodi> <nama> <group_id>` | Tambah moderator baru. |
| `.moderator list` | Lihat daftar moderator. |
| `.moderator delete <nomor_wa>` | Hapus moderator. |
| `.moderator setdefault <nomor_wa> <kode_prodi>` | Set default prodi untuk user prodi ALL. |
| `.userlist` | Menampilkan daftar user terdaftar beserta status akun RAISING (✅/❌). |
| `.daftar <nomor>` | Mendaftarkan nomor WhatsApp user lain ke whitelist. |
| `.raising add <nim> <pass>` | Menambahkan akun RAISING. |
| `.raising list` | Menampilkan daftar akun RAISING yang tersimpan. |
| `.raising edit <nim> <pass>` | Memperbarui password RAISING. |
| `.raising delete <nim>` | Menghapus akun RAISING. |
| `.restart` | Restart bot (3 detik kemudian, via nodemon watcher). |

> Module RAISING dapat dinonaktifkan dengan tidak mengisi kredensial akun `.raising` — command terkait tidak akan berfungsi, core tetap berjalan.

---

## 🛠️ Instalasi & Menjalankan Bot

1. **Clone Repository & Masuk Direktori**:

   ```bash
   git clone git@github.com:xiryuudev/xiryuubot.git
   cd xiryuubot
   ```

2. **Jalankan Automated Setup**:

   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

   Script `setup.sh` akan:
   - Menyalin `.env.example` ke `.env` jika belum ada.
   - Menginstall seluruh dependency npm.

   Database SQLite (`db/bot.db`) dibuat otomatis saat bot pertama kali dijalankan; file JSON lama (`users.json`, `raising_users.json`) otomatis dimigrasi.

3. **Konfigurasi Environment**:
   Edit file `.env` dan isi `AI_API_KEY` (dari Groq) serta nomor WhatsApp/admin:

   ```env
   BOT_NAME=XiryuuBot
   BOT_NUMBER=62895622331910
   AUTHOR_NUMBER=6289650943134
   ADMIN_NUMBER=6289650943134
   ADMIN_NAME=Farrel Zacky R
   AI_BASE_URL=https://api.groq.com/openai/v1
   AI_API_KEY=your_groq_api_key_here
   AI_MODEL=openai/gpt-oss-120b
   RAISING_BASE_URL=https://raising.almaata.ac.id
   ```

4. **Jalankan Bot**:
   - Mode Development (dengan nodemon auto-reload):

     ```bash
     npm run dev
     ```

   - Mode Production:

     ```bash
     npm start
     ```

---

## 📁 Struktur Direktori

```text
xiryuubot/
├── auth_info_baileys/     # Sesi autentikasi WhatsApp (Baileys)
├── commands/              # Kumpulan file command bot
│   ├── ai.js              # AI Assistant dengan tools & history
│   ├── daftar.js          # Registrasi whitelist
│   ├── jadwal.js          # Jadwal kuliah RAISING (mahasiswa)
│   ├── menu.js            # Menu utama & info bot (filtered per role)
│   ├── moderator.js       # Manajemen moderator (author)
│   ├── pengumuman.js      # Pengumuman terjadwal per prodi (moderator)
│   ├── ping.js            # Ping check
│   ├── presensi.js        # Submit presensi kuliah (mahasiswa)
│   ├── raising.js         # Manajemen akun RAISING (author)
│   ├── restart.js         # Restart bot (author)
│   ├── tugas.js           # Lihat/hapus task (moderator)
│   └── userlist.js        # List user & status RAISING (author)
├── db/
│   └── bot.db             # Database SQLite (users, moderators, tasks,
│                          #  raising_users, ai_chats, pengumuman)
├── utils/
│   ├── aiHistory.js       # Manajemen & trim history AI (SQLite)
│   ├── date.js            # Helper format tanggal & WIB
│   ├── db.js              # Init SQLite, skema, & migrasi JSON→SQLite
│   ├── moderators.js      # Manajemen role & prodi moderator
│   ├── pengumuman.js      # CRUD pengumuman (SQLite)
│   ├── pengumumanScheduler.js # Scheduler broadcast pengumuman
│   ├── raisingAuth.js     # Auth & scraper portal RAISING
│   ├── reply.js           # Helper edit-or-send message
│   ├── sender.js          # Helper ekstraksi nomor/JID pengirim
│   ├── tasks.js           # CRUD & auto-detect task dari laporan
│   ├── tools.js           # Web search & code execution untuk AI
│   └── users.js           # Whitelist mtime-cached
├── config.js              # Global configuration loader
├── index.js               # Entry point & WhatsApp router
├── nodemon.json           # Konfigurasi nodemon watcher
├── setup.sh               # Script instalasi otomatis
└── package.json           # Dependencies & scripts
```

---

## 📦 Dependencies Utama

| Package | Fungsi |
| :--- | :--- |
| `@whiskeysockets/baileys` | WebSocket client WhatsApp |
| `better-sqlite3` | Database SQLite sinkron |
| `axios` | HTTP client (scraper RAISING) |
| `dotenv` | Konfigurasi environment |
| `pino` / `pino-pretty` | Logging colored |
| `nodemon` | Dev auto-reload |

AI & web search menggunakan `fetch` native Node.js (endpoint OpenAI-compatible + DuckDuckGo).

---

## 👥 Author

- **Farrel Zacky Rahmanda**
