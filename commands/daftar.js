import { senderNumber } from '../utils/sender.js';
import { loadUsers, saveUsers } from '../utils/users.js';

export default {
  name: 'daftar',
  description: 'Daftarkan nomor WhatsApp Anda agar dapat menggunakan bot',
  type: 'main',
  async run({ sock, msg, prefix }) {
    const num = senderNumber(msg);
    if (!num) {
      await sock.sendMessage(msg.key.remoteJid, { text: 'Gagal mendeteksi nomor WhatsApp Anda.' }, { quoted: msg });
      return;
    }

    const users = loadUsers();
    if (users.includes(num)) {
      await sock.sendMessage(msg.key.remoteJid, { text: 'Nomor WhatsApp Anda sudah terdaftar.' }, { quoted: msg });
      return;
    }

    saveUsers([...users, num]);
    await sock.sendMessage(
      msg.key.remoteJid,
      { text: `Berhasil! Nomor ${num} terdaftar.\nGunakan ${prefix}menu atau ${prefix}jadwal.` },
      { quoted: msg }
    );
  }
};