import { loadModerators, getModeratorProdi, isAuthor, saveModerators } from '../utils/moderators.js';
import { senderNumber } from '../utils/sender.js';
import { editOrSend } from '../utils/reply.js';

export default {
  name: 'moderator',
  description: 'Kelola moderator (author only): moderator add|list|delete|setdefault',
  type: 'admin',
  visibility: 'admin',
  async run({ sock, msg, args, prefix }) {
    if (!isAuthor(senderNumber(msg))) {
      await sock.sendMessage(msg.key.remoteJid, { text: 'Command ini hanya untuk author.' }, { quoted: msg });
      return;
    }

    const sub = args[0]?.toLowerCase();
    const mods = loadModerators();

    const help = `Moderator Management (Author Only)\n\n` +
      `- ${prefix}moderator add <nomor_wa> <kode_prodi> <nama> <group_id>\n` +
      `- ${prefix}moderator list\n` +
      `- ${prefix}moderator delete <nomor_wa>\n` +
      `- ${prefix}moderator setdefault <nomor_wa> <kode_prodi>`;

    if (!sub || sub === 'help') {
      await sock.sendMessage(msg.key.remoteJid, { text: help }, { quoted: msg });
      return;
    }

    if (sub === 'add') {
      const [noWa, prodi, name, groupId] = args.slice(1);
      if (!noWa || !prodi || !name || !groupId) {
        await sock.sendMessage(msg.key.remoteJid, { text: `Format: ${prefix}moderator add <nomor_wa> <kode_prodi> <nama> <group_id>` }, { quoted: msg });
        return;
      }
      const clean = String(noWa).replace(/[^0-9]/g, '');
      if (mods[clean]) {
        await sock.sendMessage(msg.key.remoteJid, { text: `Moderator ${clean} sudah ada.` }, { quoted: msg });
        return;
      }
      mods[clean] = { prodi: prodi.toUpperCase(), name, groupId, createdAt: new Date().toISOString() };
      saveModerators(mods);
      await sock.sendMessage(msg.key.remoteJid, { text: `✅ Moderator ditambahkan: ${clean} (${prodi.toUpperCase()}) - ${name}` }, { quoted: msg });
      return;
    }

    if (sub === 'list') {
      const keys = Object.keys(mods);
      if (!keys.length) {
        await sock.sendMessage(msg.key.remoteJid, { text: 'Belum ada moderator terdaftar.' }, { quoted: msg });
        return;
      }
      let text = `Daftar Moderator (${keys.length})\n\n`;
      for (const num of keys) {
        const m = mods[num];
        text += `- ${num}\n  Nama: ${m.name}\n  Prodi: ${m.prodi}${m.prodi === 'ALL' ? ` (default: ${m.defaultProdi})` : ''}\n  Grup: ${m.groupId}\n  Ditambah: ${new Date(m.createdAt).toLocaleString('id-ID')}\n\n`;
      }
      await sock.sendMessage(msg.key.remoteJid, { text: text.trimEnd() }, { quoted: msg });
      return;
    }

    if (sub === 'delete' || sub === 'del' || sub === 'remove') {
      const num = String(args[1] ?? '').replace(/[^0-9]/g, '');
      if (!num) {
        await sock.sendMessage(msg.key.remoteJid, { text: `Format: ${prefix}moderator delete <nomor_wa>` }, { quoted: msg });
        return;
      }
      if (!mods[num]) {
        await sock.sendMessage(msg.key.remoteJid, { text: `Moderator ${num} tidak ditemukan.` }, { quoted: msg });
        return;
      }
      if (mods[num].prodi === 'ALL') {
        await sock.sendMessage(msg.key.remoteJid, { text: 'Tidak bisa menghapus author.' }, { quoted: msg });
        return;
      }
      delete mods[num];
      saveModerators(mods);
      await sock.sendMessage(msg.key.remoteJid, { text: `Moderator ${num} berhasil dihapus.` }, { quoted: msg });
      return;
    }

    if (sub === 'setdefault') {
      const [noWa, prodi] = args.slice(1);
      if (!noWa || !prodi) {
        await sock.sendMessage(msg.key.remoteJid, { text: `Format: ${prefix}moderator setdefault <nomor_wa> <kode_prodi>` }, { quoted: msg });
        return;
      }
      const clean = String(noWa).replace(/[^0-9]/g, '');
      if (!mods[clean]) {
        await sock.sendMessage(msg.key.remoteJid, { text: `Moderator ${clean} tidak ditemukan.` }, { quoted: msg });
        return;
      }
      if (mods[clean].prodi !== 'ALL') {
        await sock.sendMessage(msg.key.remoteJid, { text: 'Hanya author (prodi ALL) yang bisa set default prodi.' }, { quoted: msg });
        return;
      }
      mods[clean].defaultProdi = prodi.toUpperCase();
      mods[clean].updatedAt = new Date().toISOString();
      saveModerators(mods);
      await sock.sendMessage(msg.key.remoteJid, { text: `Default prodi author diubah ke ${prodi.toUpperCase()}.` }, { quoted: msg });
      return;
    }

    await sock.sendMessage(msg.key.remoteJid, { text: `Subcommand tidak dikenal. Ketik ${prefix}moderator help` }, { quoted: msg });
  }
};