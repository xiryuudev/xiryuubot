#!/bin/bash

# XiryuuBot Setup Script

echo "Setup XiryuuBot..."

# 1. Buat struktur db/
echo "Membuat direktori db/..."
mkdir -p db/ai_chats

# 2. Inisialisasi db/users.json
if [ ! -f db/users.json ]; then
  echo "Membuat db/users.json (empty)..."
  echo "[]" >db/users.json
else
  echo "✅ db/users.json sudah ada, skip."
fi

# 3. Inisialisasi db/raising_users.json
if [ ! -f db/raising_users.json ]; then
  echo "Membuat db/raising_users.json (empty)..."
  echo "{}" >db/raising_users.json
else
  echo "✅ db/raising_users.json sudah ada, skip."
fi

# 4. Buat .env jika belum ada
if [ ! -f .env ]; then
  echo "Membuat .env dari .env.example..."
  cp .env.example .env
  echo "⚠️  Silakan edit file .env untuk mengisi API key dan konfigurasi bot Anda."
else
  echo "✅ .env sudah ada, skip."
fi

# 5. Install dependencies
echo "📦 Installing npm dependencies..."
npm install

echo ""
echo "✅ Setup selesai!"
echo ""
echo "Langkah selanjutnya:"
echo "1. Edit file .env dan isi konfigurasi (AI_API_KEY, BOT_NUMBER, dll)"
echo "2. Jalankan bot dengan: npm run dev"
echo "3. Kirim .daftar untuk mendaftarkan nomor Anda ke bot"
