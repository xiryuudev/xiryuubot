import { loadRaisingUsers, saveRaisingUsers, loginAndGetSession } from '../utils/raisingAuth.js';
import { senderNumber } from '../utils/sender.js';
import { clean } from '../utils/users.js';
import { isAuthor } from '../utils/moderators.js';
import { editOrSend } from '../utils/reply.js';

const fmtDate = (iso) => new Date(iso).toLocaleString('id-ID');

export default {
  name: 'raising',
  description: 'Kelola akun RAISING (admin): raising add|list|edit|delete|help',
  type: 'admin',
  visibility: 'admin',
  async run({ sock, msg, args, prefix }) {
    if (!isAuthor(senderNumber(msg))) {
      await sock.sendMessage(msg.key.remoteJid, { text: 'Command ini hanya untuk admin.' }, { quoted: msg });
      return;
    }

    if (args[0]?.toLowerCase() === 'help') {
      const helpText = `🎓 *Command: ${prefix}raising*\nFungsi: Manajemen akun RAISING (Author only).\nCara pakai:\n- \`${prefix}raising add <nim> <password>\` — Tambah akun RAISING\n- \`${prefix}raising list\` — Lihat daftar akun RAISING\n- \`${prefix}raising edit <nim> <password>\` — Edit password akun\n- \`${prefix}raising delete <nim>\` — Hapus akun RAISING`;
      await sock.sendMessage(msg.key.remoteJid, { text: helpText }, { quoted: msg });
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
      const num = clean(noWa);
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '⏳', key: msg.key } });
      try {
        const { sessionHash, cookie, idMahasiswa } = await loginAndGetSession(nim, password);
        users[num] = { nim, password, sessionHash, cookie, idMahasiswa, createdAt: new Date().toISOString() };
        saveRaisingUsers(users);
        await sock.sendMessage(msg.key.remoteJid, { react: { text: '✅', key: msg.key } });
        await editOrSend(sock, msg, `User ${num} (NIM: ${nim}, ID: ${idMahasiswa || 'N/A'}) berhasil ditambahkan.`);
      } catch (err) {
        await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
        await editOrSend(sock, msg, `Gagal login: ${err.message}`);
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
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '⏳', key: msg.key } });
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '✅', key: msg.key } });
      await editOrSend(sock, msg, text.trimEnd());
      return;
    }

    if (sub === 'edit') {
      const [noWa, nim, password] = args.slice(1);
      if (!noWa || !nim || !password) {
        await sock.sendMessage(msg.key.remoteJid, { text: `Format: ${prefix}raising edit <no_wa> <nim_baru> <password_baru>` }, { quoted: msg });
        return;
      }
      const num = clean(noWa);
      if (!users[num]) {
        await sock.sendMessage(msg.key.remoteJid, { text: `User ${num} tidak ditemukan.` }, { quoted: msg });
        return;
      }
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '⏳', key: msg.key } });
      try {
        const { sessionHash, cookie, idMahasiswa } = await loginAndGetSession(nim, password);
        users[num] = { nim, password, sessionHash, cookie, idMahasiswa, createdAt: users[num].createdAt, updatedAt: new Date().toISOString() };
        saveRaisingUsers(users);
        await sock.sendMessage(msg.key.remoteJid, { react: { text: '✅', key: msg.key } });
        await editOrSend(sock, msg, `User ${num} diperbarui ke NIM ${nim} (ID: ${idMahasiswa || 'N/A'}).`);
      } catch (err) {
        await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
        await editOrSend(sock, msg, `Gagal re-login: ${err.message}`);
      }
      return;
    }

    if (sub === 'delete' || sub === 'del' || sub === 'remove') {
      const num = clean(args[1]);
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