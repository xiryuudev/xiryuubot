import { loadRaisingUsers, saveRaisingUsers, loginAndGetSession, getValidSession, deleteRaisingUser } from '../utils/raisingAuth.js';
import { senderNumber } from '../utils/sender.js';
import { clean } from '../utils/users.js';
import { isAuthor } from '../utils/moderators.js';
import { editOrSend } from '../utils/reply.js';
import config from '../config.js';

const BASE_URL = config.RAISING_BASE_URL;
const UA = config.UA;

function formatProfile(profile) {
  if (!profile) return '';
  let text = '\n👤 *PROFIL*';
  text += `\nNama: ${profile.nama_mahasiswa || '-'}`;
  text += `\nProdi: ${profile.nama_prodi || '-'}`;
  text += `\nAngkatan: ${profile.angkatan || '-'}`;
  text += `\nStatus: ${profile.status_mahasiswa || '-'}`;
  return text;
}

function formatDPA(dpa) {
  if (!dpa) return '';
  let text = '\n👨‍🏫 *DPA*';
  text += `\nNama: ${dpa.nama}`;
  text += `\nKontak: ${dpa.kontak}`;
  return text;
}

export default {
  name: 'raising',
  description: 'Info RAISING (mahasiswa) + kelola akun (admin): raising add|list|edit|delete|help',
  type: 'main',
  visibility: 'mahasiswa',
  async run({ sock, msg, args, prefix }) {
    const sender = senderNumber(msg);
    const sub = args[0]?.toLowerCase();
    const isAdmin = isAuthor(sender);

    if (sub === 'help') {
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '⏳', key: msg.key } });
      const helpText = `🎓 *Command: .raising*
Fungsi: Info akun RAISING (mahasiswa) + kelola akun (admin).

Cara pakai (Mahasiswa):
- \`.raising\` — Info akun RAISING (NIM, profil, DPA, session)

Cara pakai (Admin):
- \`.raising add <no_wa> <nim> <password>\` — Tambah akun RAISING
- \`.raising list\` — Lihat daftar akun RAISING terdaftar
- \`.raising edit <no_wa> <nim_baru> <password_baru>\` — Update akun
- \`.raising delete <no_wa>\` — Hapus akun RAISING (persisten di SQLite)

Contoh: \`.raising\`, \`.raising add 628xxx 263100476 pass123\``;
      await sock.sendMessage(msg.key.remoteJid, { text: helpText }, { quoted: msg });
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '✅', key: msg.key } });
      return;
    }

    // Admin subcommands
    if (isAdmin && ['add', 'list', 'users', 'edit', 'delete', 'del', 'remove'].includes(sub)) {
      const users = loadRaisingUsers();

      if (sub === 'add') {
        const [noWa, nim, password] = args.slice(1);
        if (!noWa || !nim || !password) {
          await editOrSend(sock, msg, `Format: ${prefix}raising add <no_wa> <nim> <password>`);
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
          await editOrSend(sock, msg, 'Belum ada user RAISING terdaftar.');
          return;
        }
        let text = `Daftar User RAISING (${keys.length})\n\n`;
        for (const num of keys) {
          const u = users[num];
          text += `- ${num}\n  NIM: ${u.nim} (ID: ${u.idMahasiswa || '-'})\n  Ditambah: ${new Date(u.createdAt).toLocaleString('id-ID')}\n\n`;
        }
        await sock.sendMessage(msg.key.remoteJid, { react: { text: '⏳', key: msg.key } });
        await sock.sendMessage(msg.key.remoteJid, { react: { text: '✅', key: msg.key } });
        await editOrSend(sock, msg, text.trimEnd());
        return;
      }

      if (sub === 'edit') {
        const [noWa, nim, password] = args.slice(1);
        if (!noWa || !nim || !password) {
          await editOrSend(sock, msg, `Format: ${prefix}raising edit <no_wa> <nim_baru> <password_baru>`);
          return;
        }
        const num = clean(noWa);
        if (!users[num]) {
          await editOrSend(sock, msg, `User ${num} tidak ditemukan.`);
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
          await editOrSend(sock, msg, `Format: ${prefix}raising delete <no_wa>`);
          return;
        }
        const users = loadRaisingUsers();
        if (!users[num]) {
          await editOrSend(sock, msg, `User ${num} tidak ditemukan.`);
          return;
        }
        deleteRaisingUser(num);
        await editOrSend(sock, msg, `User ${num} berhasil dihapus.`);
        return;
      }
    }

    // Info display (mahasiswa + admin)
    await sock.sendMessage(msg.key.remoteJid, { react: { text: '⏳', key: msg.key } });

    try {
      const user = await getValidSession(sender);
      const lines = [
        `📋 *INFO RAISING*`,
        `NIM: ${user.nim}`,
        `Session: ${user.sessionHash.slice(0, 8)}...`
      ];

      if (user.profile) lines.push(formatProfile(user.profile));
      if (user.dpa) lines.push(formatDPA(user.dpa));
      if (user.idMahasiswa) lines.push(`\nID Mahasiswa: ${user.idMahasiswa}`);

      // Admin hint
      if (isAdmin) {
        lines.push(`\n🔧 *ADMIN COMMANDS*`);
        lines.push(`${prefix}raising add <no_wa> <nim> <password>`);
        lines.push(`${prefix}raising list`);
        lines.push(`${prefix}raising edit <no_wa> <nim> <password>`);
        lines.push(`${prefix}raising delete <no_wa>`);
      }

      await editOrSend(sock, msg, lines.join('\n'));
    } catch (err) {
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
      await editOrSend(sock, msg, `Gagal ambil info: ${err.message}`);
    }
  }
};