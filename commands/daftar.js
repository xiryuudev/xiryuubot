import { senderNumber } from '../utils/sender.js';
import { loadUsers, saveUsers, isAdmin } from '../utils/users.js';

export default {
  name: 'daftar',
  description: 'Daftarkan nomor WhatsApp (user: daftar | admin: daftar <nomor>)',
  type: 'main',
  async run({ sock, msg, args, prefix }) {
    const sender = senderNumber(msg);
    if (!sender) {
      await sock.sendMessage(msg.key.remoteJid, { text: 'Gagal mendeteksi nomor WhatsApp Anda.' }, { quoted: msg });
      return;
    }

    const rawArg = args[0]?.trim();
    const isSenderAdmin = isAdmin(sender);

    // Kasus 1: User/admin kirim tanpa argumen -> daftar diri sendiri
    if (!rawArg) {
      const users = loadUsers();
      if (users.includes(sender)) {
        await sock.sendMessage(msg.key.remoteJid, { text: 'Nomor WhatsApp Anda sudah terdaftar.' }, { quoted: msg });
        return;
      }
      saveUsers([...users, sender]);
      await sock.sendMessage(msg.key.remoteJid, { text: `Berhasil! Nomor ${sender} terdaftar.\nGunakan ${prefix}menu atau ${prefix}jadwal.` }, { quoted: msg });
      return;
    }

    // Kasus 2: Ada argumen, tapi pengirim bukan admin
    if (!isSenderAdmin) {
      await sock.sendMessage(msg.key.remoteJid, { text: `Format salah.\nKetik *${prefix}daftar* untuk mendaftarkan nomor Anda.` }, { quoted: msg });
      return;
    }

    // Kasus 3: Admin kirim argumen, validasi apakah format nomor benar (hanya angka, 8-15 digit)
    const targetNum = rawArg.replace(/[^0-9]/g, '');
    if (targetNum !== rawArg || targetNum.length < 8 || targetNum.length > 15) {
      await sock.sendMessage(msg.key.remoteJid, { text: `Format nomor salah.\nGunakan: *${prefix}daftar <nomor_valid>* (contoh: ${prefix}daftar 628123456789)` }, { quoted: msg });
      return;
    }

    const users = loadUsers();
    if (users.includes(targetNum)) {
      await sock.sendMessage(msg.key.remoteJid, { text: `Nomor ${targetNum} sudah terdaftar.` }, { quoted: msg });
      return;
    }

    saveUsers([...users, targetNum]);
    await sock.sendMessage(msg.key.remoteJid, { text: `Berhasil! Nomor ${targetNum} didaftarkan oleh admin.` }, { quoted: msg });
  }
};