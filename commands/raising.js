import { loadRaisingUsers, saveRaisingUsers, loginAndGetSession } from '../utils/raisingAuth.js';
import { senderNumber } from '../utils/sender.js';
import { isAdmin } from '../utils/users.js';
import { editOrSend } from '../utils/reply.js';

const cleanNo = (v) => String(v ?? '').replace(/[^0-9]/g, '');
const fmtDate = (iso) => new Date(iso).toLocaleString('id-ID');

export default {
  name: 'raising',
  description: 'Kelola akun RAISING (admin): raising add|list|edit|delete|help',
  type: 'admin',
  async run({ sock, msg, args, prefix }) {
    if (!isAdmin(senderNumber(msg))) {
      await sock.sendMessage(msg.key.remoteJid, { text: 'Command ini hanya untuk admin.' }, { quoted: msg });
      return;
    }

    const sub = args[0]?.toLowerCase();
    const users = loadRaisingUsers();
    const help = `RAISING Management\n\n` +
      `- ${prefix}raising add <no_wa> <nim> <password>\n` +
      `- ${prefix}raising list\n` +
      `- ${prefix}raising edit <no_wa> <nim_baru> <password_baru>\n` +
      `- ${prefix}raising delete <no_wa>`;

    if (!sub || sub === 'help') {
      await sock.sendMessage(msg.key.remoteJid, { text: help }, { quoted: msg });
      return;
    }

    if (sub === 'add') {
      const [noWa, nim, password] = args.slice(1);
      if (!noWa || !nim || !password) {
        await sock.sendMessage(msg.key.remoteJid, { text: `Format: ${prefix}raising add <no_wa> <nim> <password>` }, { quoted: msg });
        return;
      }
      const num = cleanNo(noWa);
      const loadingMsg = await sock.sendMessage(msg.key.remoteJid, { text: `Mencoba login untuk NIM ${nim}...` }, { quoted: msg });
      try {
        const { sessionHash, cookie, idMahasiswa } = await loginAndGetSession(nim, password);
        users[num] = { nim, password, sessionHash, cookie, idMahasiswa, createdAt: new Date().toISOString() };
        saveRaisingUsers(users);
        await editOrSend(sock, msg, loadingMsg, `User ${num} (NIM: ${nim}, ID: ${idMahasiswa || 'N/A'}) berhasil ditambahkan.`);
      } catch (err) {
        await editOrSend(sock, msg, loadingMsg, `Gagal login: ${err.message}`);
      }
      return;
    }

    if (sub === 'list' || sub === 'users') {
      const keys = Object.keys(users);
      if (!keys.length) {
        await sock.sendMessage(msg.key.remoteJid, { text: 'Belum ada user RAISING terdaftar.' }, { quoted: msg });
        return;
      }
      let text = `Daftar User RAISING (${keys.length})\n\n`;
      for (const num of keys) {
        const u = users[num];
        text += `- ${num}\n  NIM: ${u.nim} (ID: ${u.idMahasiswa || '-'})\n  Ditambah: ${fmtDate(u.createdAt)}\n\n`;
      }
      const loadingMsg = await sock.sendMessage(msg.key.remoteJid, { text: 'Mengirim data...' }, { quoted: msg });
      await editOrSend(sock, msg, loadingMsg, text.trimEnd());
      return;
    }

    if (sub === 'edit') {
      const [noWa, nim, password] = args.slice(1);
      if (!noWa || !nim || !password) {
        await sock.sendMessage(msg.key.remoteJid, { text: `Format: ${prefix}raising edit <no_wa> <nim_baru> <password_baru>` }, { quoted: msg });
        return;
      }
      const num = cleanNo(noWa);
      if (!users[num]) {
        await sock.sendMessage(msg.key.remoteJid, { text: `User ${num} tidak ditemukan.` }, { quoted: msg });
        return;
      }
      const loadingMsg = await sock.sendMessage(msg.key.remoteJid, { text: `Re-login untuk NIM ${nim}...` }, { quoted: msg });
      try {
        const { sessionHash, cookie, idMahasiswa } = await loginAndGetSession(nim, password);
        users[num] = { nim, password, sessionHash, cookie, idMahasiswa, createdAt: users[num].createdAt, updatedAt: new Date().toISOString() };
        saveRaisingUsers(users);
        await editOrSend(sock, msg, loadingMsg, `User ${num} diperbarui ke NIM ${nim} (ID: ${idMahasiswa || 'N/A'}).`);
      } catch (err) {
        await editOrSend(sock, msg, loadingMsg, `Gagal re-login: ${err.message}`);
      }
      return;
    }

    if (sub === 'delete' || sub === 'del' || sub === 'remove') {
      const num = cleanNo(args[1]);
      if (!num) {
        await sock.sendMessage(msg.key.remoteJid, { text: `Format: ${prefix}raising delete <no_wa>` }, { quoted: msg });
        return;
      }
      if (!users[num]) {
        await sock.sendMessage(msg.key.remoteJid, { text: `User ${num} tidak ditemukan.` }, { quoted: msg });
        return;
      }
      delete users[num];
      saveRaisingUsers(users);
      await sock.sendMessage(msg.key.remoteJid, { text: `User ${num} berhasil dihapus.` }, { quoted: msg });
      return;
    }

    await sock.sendMessage(msg.key.remoteJid, { text: `Subcommand tidak dikenal. Ketik ${prefix}raising help` }, { quoted: msg });
  }
};