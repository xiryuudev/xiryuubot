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

    if (sub === 'help') {
      const helpText = `⚙️ *Command: moderator*\nFungsi: Kelola data moderator (hanya untuk author).\nCara pakai:\n- \`${prefix}moderator add <nomor_wa> <kode_prodi> <nama> <group_id>\` — Tambah moderator baru\n- \`${prefix}moderator list\` — Lihat daftar moderator\n- \`${prefix}moderator delete <nomor_wa>\` — Hapus moderator\n- \`${prefix}moderator setdefault <nomor_wa> <kode_prodi>\` — Set default prodi untuk author (prodi ALL)`;
      await sock.sendMessage(msg.key.remoteJid, { text: helpText }, { quoted: msg });
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
      const upperProdi = prodi.toUpperCase();
      mods[clean] = { prodi: upperProdi, defaultProdi: upperProdi === 'ALL' ? 'SI' : null, name, groupId, createdAt: new Date().toISOString() };
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
        text += `- ${num}\n  Nama: ${m.name}\n  Prodi: ${m.prodi}${m.prodi === 'ALL' ? ` (default: ${m.defaultProdi ?? 'SI'})` : ''}\n  Grup: ${m.groupId}\n  Ditambah: ${new Date(m.createdAt).toLocaleString('id-ID')}\n\n`;
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
      saveModerators(mods);
      await sock.sendMessage(msg.key.remoteJid, { text: `Default prodi author diubah ke ${prodi.toUpperCase()}.` }, { quoted: msg });
      return;
    }

    await sock.sendMessage(msg.key.remoteJid, { text: `Subcommand tidak dikenal. Ketik ${prefix}moderator help` }, { quoted: msg });
  }
};