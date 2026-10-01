#!/bin/bash

# XiryuuBot Setup Script

echo "Setup XiryuuBot..."

# 1. Buat struktur db/ (SQLite dibuat otomatis saat bot jalan)
echo "Membuat direktori db/..."
mkdir -p db

# 2. Buat .env jika belum ada
if [ ! -f .env ]; then
  echo "Membuat .env dari .env.example..."
  cp .env.example .env
  echo "⚠️  Silakan edit file .env untuk mengisi API key dan konfigurasi bot Anda."
else
  echo "✅ .env sudah ada, skip."
fi

# 3. Install dependencies
echo "📦 Installing npm dependencies..."
npm install

echo ""
echo "✅ Setup selesai!"
echo ""
echo "Langkah selanjutnya:"
echo "1. Edit file .env dan isi konfigurasi (AI_API_KEY, BOT_NUMBER, dll)"
echo "2. Jalankan bot dengan: npm run dev"
echo "3. Kirim .daftar untuk mendaftarkan nomor Anda ke bot"
echo ""
echo "Catatan: db/bot.db (SQLite) dibuat otomatis saat bot pertama kali dijalankan."
