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
  description: 'Info RAISING (mahasiswa) + kelola akun: raising add|list|edit|delete|help',
  type: 'main',
  visibility: 'mahasiswa',
  async run({ sock, msg, args, prefix }) {
    const sender = senderNumber(msg);
    const sub = args[0]?.toLowerCase();
    const isAdmin = isAuthor(sender);

    if (sub === 'help') {
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '⏳', key: msg.key } });
      const helpText = `🎓 *Command: .raising*
Fungsi: Info akun RAISING + kelola akun sendiri.

Cara pakai:
- \`.raising\` — Info akun RAISING (NIM, profil, DPA, session)
- \`.raising add <nim> <password>\` — Tambah/update akun RAISING sendiri
- \`.raising delete\` — Hapus akun RAISING sendiri

*Catatan:* Password TIDAK disimpan. Hanya session & cookie.
Gagal session? Jalankan \`.raising add\` ulang untuk refresh.

Contoh: \`.raising\`, \`.raising add 263100476 pass123\``;
      await sock.sendMessage(msg.key.remoteJid, { text: helpText }, { quoted: msg });
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '✅', key: msg.key } });
      return;
    }

    // User subcommands (any user)
    const users = loadRaisingUsers();
    const senderClean = clean(sender);

    if (sub === 'add') {
      const [nim, password] = args.slice(1);
      if (!nim || !password) {
        await editOrSend(sock, msg, `Format: ${prefix}raising add <nim> <password>`);
        return;
      }
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '⏳', key: msg.key } });
      try {
        const { sessionHash, cookie, idMahasiswa } = await loginAndGetSession(nim, password);
        users[senderClean] = { nim, sessionHash, cookie, idMahasiswa, createdAt: new Date().toISOString() };
        saveRaisingUsers(users);
        await sock.sendMessage(msg.key.remoteJid, { react: { text: '✅', key: msg.key } });
        await editOrSend(sock, msg, `Akun RAISING berhasil ditambahkan/diperbarui (NIM: ${nim}, ID: ${idMahasiswa || 'N/A'}).`);
      } catch (err) {
        await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
        await editOrSend(sock, msg, `Gagal login: ${err.message}`);
      }
      return;
    }

    if (sub === 'delete') {
      if (!users[senderClean]) {
        await editOrSend(sock, msg, 'Anda belum punya akun RAISING terdaftar.');
        return;
      }
      deleteRaisingUser(senderClean);
      await editOrSend(sock, msg, 'Akun RAISING Anda berhasil dihapus.');
      return;
    }

    // Admin subcommands
    if (isAdmin && ['list', 'users'].includes(sub)) {
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
        lines.push(`${prefix}raising list`);
      }

      await editOrSend(sock, msg, lines.join('\n'));
    } catch (err) {
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
      await editOrSend(sock, msg, `Gagal ambil info: ${err.message}`);
    }
  }
};