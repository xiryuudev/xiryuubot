# XiryuuBot

WhatsApp Bot multiguna berbasis Node.js menggunakan `@whiskeysockets/baileys` yang terintegrasi dengan Portal Akademik RAISING Alma Ata University, sistem whitelist pengguna, dan AI assistant berteknologi Groq dengan tool-calling (web search & code execution).

---

## Fitur Utama

- **Autentikasi Pairing Code**: Koneksi mudah tanpa QR code, menggunakan pairing code nomor WhatsApp.
- **Whitelist User Filter**: Keamanan akses bot dibatasi melalui database whitelist (`db/users.json`).
- **Dynamic Command Loader**: Memuat command secara otomatis dari folder `commands/`.
- **Multi-Prefix Support**: Mendukung berbagai awalan command (`!`, `.`, `/`, `\`).
- **RAISING Portal Integration**:
  - Scraping jadwal kuliah (`.jadwal`).
  - Manajemen akun RAISING khusus admin (`.raising add/list/edit/delete`).
  - Presensi kuliah otomatis/manual (`.presensi`).
- **AI Assistant with Tools (`.ai`)**:
  - Terintegrasi dengan Groq API (`openai/gpt-oss-120b`).
  - Mendukung **Web Search** (DuckDuckGo) & **Code Execution** (Sandbox Node.js).
  - Sistem history percakapan per user (max 3 pasang pesan dengan auto-summarization).
  - Reset sesi history via `.ai newsession`.
- **Global Config & Logging**:
  - Konfigurasi terpusat via `.env` dan `config.js`.
  - Colored logging menggunakan `pino-pretty` dengan timestamp WIB.

---

## 📋 Daftar Command

### 🔹 Main Menu

| Command | Deskripsi |
| :--- | :--- |
| `.menu` | Menampilkan daftar command, info pengguna, dan info bot. |
| `.ping` | Cek status respon bot. |
| `.daftar` | Mendaftarkan nomor WhatsApp Anda ke whitelist bot (self-registration). |
| `.jadwal [hari/full]` | Menampilkan jadwal kuliah RAISING (hari ini, besok, spesifik hari, atau full). |
| `.presensi [kode]` atau `.presensi <id> <kode>` | Mengisi presensi kuliah yang sedang berlangsung atau spesifik sesi. |
| `.ai <pesan>` | Ngobrol dengan AI Assistant (mendukung search web & run JS). |
| `.ai newsession` | Menghapus history chat AI dan memulai sesi baru dari 0. |

### 🔹 Admin Menu (Hanya Admin)

| Command | Deskripsi |
| :--- | :--- |
| `.userlist` | Menampilkan daftar user terdaftar beserta status akun RAISING mereka (✅/❌). |
| `.daftar <nomor>` | Mendaftarkan nomor WhatsApp user lain ke whitelist. |
| `.raising add <nim> <pass>` | Menambahkan akun RAISING. |
| `.raising list` | Menampilkan daftar akun RAISING yang tersimpan. |
| `.raising edit <nim> <pass>` | Memperbarui password RAISING. |
| `.raising delete <nim>` | Menghapus akun RAISING. |

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

   Script `setup.sh` akan secara otomatis:
   - Membuat direktori `db/` dan `db/ai_chats/` jika belum ada.
   - Membuat file database kosong `db/users.json` (`[]`) dan `db/raising_users.json` (`{}`).
   - Menyalin `.env.example` ke `.env` jika belum ada.
   - Menginstall seluruh dependency npm.

3. **Konfigurasi Environment**:
   Edit file `.env` dan isi `AI_API_KEY` (dari Groq) serta nomor WhatsApp/admin:

   ```env
   BOT_NAME=XiryuuBot
   BOT_NUMBER=62895622331910
   AUTHOR_NUMBER=6289650943134
   ADMIN_NUMBER=6289650943134
   ADMIN_NAME=Farrel Zacky R
   AI_BASE_URL=https://api.groq.com/openai/v1
   AI_API_KEY=gsk_your_groq_api_key_here
   AI_MODEL=openai/gpt-oss-120b
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
├── auth_info_baileys/    # Sesi autentikasi WhatsApp (Baileys)
├── commands/             # Kumpulan file command bot
│   ├── ai.js             # AI Assistant dengan tools & history
│   ├── daftar.js         # Registrasi whitelist
│   ├── jadwal.js         # Jadwal kuliah RAISING
│   ├── menu.js           # Menu utama & info bot
│   ├── ping.js           # Ping check
│   ├── presensi.js       # Submit presensi kuliah
│   ├── raising.js        # Manajemen akun RAISING (Admin)
│   └── userlist.js       # List user & status RAISING (Admin)
├── db/                   # Database lokal (JSON)
│   ├── ai_chats/         # History chat AI per user
│   ├── raising_users.json# Kredensial & cookies RAISING
│   └── users.json        # Whitelist nomor WhatsApp terdaftar
├── utils/                # Modul utility backend
│   ├── aiHistory.js      # Manajemen history & summary AI
│   ├── date.js           # Helper format tanggal & WIB
│   ├── raisingAuth.js    # Auth & scraper portal RAISING
│   ├── reply.js          # Helper edit-or-send message
│   ├── sender.js         # Helper ekstraksi nomor/JID pengirim
│   ├── tools.js          # Web search & code execution untuk AI
│   └── users.js          # Manajemen whitelist mtime-cached
├── config.js             # Global configuration loader
├── index.js              # Entry point & WhatsApp router
├── nodemon.json          # Konfigurasi nodemon watcher
└── package.json          # Dependencies & scripts
```

---

## 👥 Author

- **Farrel Zacky Rahmanda**
