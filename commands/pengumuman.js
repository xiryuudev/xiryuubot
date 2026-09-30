import {
  addPengumuman,
  listPengumuman,
  getPengumumanById,
  editPengumuman,
  deletePengumuman
} from '../utils/pengumuman.js';
import { isAuthor, isModerator, getModeratorProdi, getModeratorDefaultProdi, getModerator } from '../utils/moderators.js';
import { senderNumber } from '../utils/sender.js';
import { editOrSend } from '../utils/reply.js';

export default {
  name: 'pengumuman',
  description: 'Fitur pengumuman per prodi. Gunakan: .pengumuman add|list|edit|delete|help',
  type: 'moderator',
  visibility: 'moderator',
  async run({ sock, msg, args, prefix }) {
    const sender = senderNumber(msg);
    const sub = args[0]?.toLowerCase();

    if (!sub || sub === 'help') {
      const helpMsg = `📢 *Command Pengumuman*\n\n` +
        `• \`${prefix}pengumuman add <DD/MM/YYYY> <HH:MM> <deskripsi> [PRODI]\` — Tambah pengumuman baru\n` +
        `• \`${prefix}pengumuman list [PRODI]\` — Lihat daftar pengumuman\n` +
        `• \`${prefix}pengumuman edit <ID> <DD/MM/YYYY> <HH:MM> <deskripsi>\` — Edit pengumuman\n` +
        `• \`${prefix}pengumuman delete <ID>\` — Hapus pengumuman\n\n` +
        `_Catatan: Menambah/edit/menghapus butuh akses moderator/author._`;
      await editOrSend(sock, msg, helpMsg);
      return;
    }

    if (sub === 'add') {
      if (!isModerator(sender) && !isAuthor(sender)) {
        await editOrSend(sock, msg, '❌ Hanya moderator atau author yang dapat menambah pengumuman.');
        return;
      }

      const tanggal = args[1];
      const jam = args[2];

      const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
      const timeRegex = /^\d{2}:\d{2}$/;

      if (!tanggal || !dateRegex.test(tanggal) || !jam || !timeRegex.test(jam)) {
        await editOrSend(sock, msg, `⚠️ Format tidak valid.\nContoh: \`${prefix}pengumuman add 30/09/2026 14:30 Rapat Prodi\`\natau: \`${prefix}pengumuman add 30/09/2026 14:30 Rapat Prodi TI\``);
        return;
      }

      let prodi = null;
      let descStartIndex = 3;

      const potentialProdi = args[args.length - 1]?.toUpperCase();
      if (args.length > 4 && ['SI', 'TI', 'DKV', 'MI', 'TS'].includes(potentialProdi)) {
        if (isAuthor(sender)) {
          prodi = potentialProdi;
          args.pop();
        }
      }

      if (!prodi) {
        prodi = getModeratorProdi(sender) || getModeratorDefaultProdi(sender) || 'SI';
        if (prodi === 'ALL') prodi = 'SI';
      }

      const deskripsi = args.slice(descStartIndex).join(' ');
      if (!deskripsi) {
        await editOrSend(sock, msg, '⚠️ Deskripsi pengumuman tidak boleh kosong.');
        return;
      }

      const targetGroupId = getModerator(sender)?.groupId || '';
      const res = addPengumuman(tanggal, jam, `Pengumuman ${prodi} - ${deskripsi}`, prodi, sender, targetGroupId);
      await editOrSend(sock, msg, `✅ *Pengumuman Berhasil Ditambahkan!*\n\n📌 *ID:* ${res.id}\n📅 *Tanggal:* ${res.tanggal}\n⏰ *Jam:* ${res.jam}\n🎓 *Prodi:* ${res.prodi}\n📝 *Deskripsi:* ${res.deskripsi}\n\n⏳ _Otomatis terkirim H-30 menit ke grup moderator dengan tag all._`);
      return;
    }

    if (sub === 'list') {
      let filterProdi = args[1]?.toUpperCase();

      if (!filterProdi) {
        if (isModerator(sender) && !isAuthor(sender)) {
          filterProdi = getModeratorProdi(sender);
        } else if (isAuthor(sender)) {
          filterProdi = getModeratorDefaultProdi(sender);
        }
      }

      if (filterProdi === 'ALL') filterProdi = null;

      const list = listPengumuman(filterProdi);

      if (!list || list.length === 0) {
        await editOrSend(sock, msg, `📋 Tidak ada pengumuman${filterProdi ? ` untuk prodi *${filterProdi}*` : ''}.`);
        return;
      }

      let text = `📢 *DAFTAR PENGUMUMAN* ${filterProdi ? `[${filterProdi}]` : ''}\n\n`;
      list.forEach((item) => {
        text += `📌 *ID:* ${item.id}\n📅 *Tanggal:* ${item.tanggal}\n⏰ *Jam:* ${item.jam}\n🎓 *Prodi:* ${item.prodi}\n📝 *Deskripsi:* ${item.deskripsi}\n-------------------------------\n`;
      });

      await editOrSend(sock, msg, text);
      return;
    }

    if (sub === 'edit') {
      if (!isModerator(sender) && !isAuthor(sender)) {
        await editOrSend(sock, msg, '❌ Hanya moderator atau author yang dapat mengedit pengumuman.');
        return;
      }

      const id = Number(args[1]);
      if (!id || isNaN(id)) {
        await editOrSend(sock, msg, `⚠️ Masukkan ID pengumuman yang valid.\nContoh: \`${prefix}pengumuman edit 1 30/09/2026 15:00 Deskripsi Baru\``);
        return;
      }

      const existing = getPengumumanById(id);
      if (!existing) {
        await editOrSend(sock, msg, `❌ Pengumuman dengan ID ${id} tidak ditemukan.`);
        return;
      }

      const modProdi = getModeratorProdi(sender);
      if (!isAuthor(sender) && modProdi !== existing.prodi) {
        await editOrSend(sock, msg, `❌ Anda tidak memiliki akses untuk mengedit pengumuman prodi *${existing.prodi}*.`);
        return;
      }

      const tanggal = args[2];
      const jam = args[3];
      const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
      const timeRegex = /^\d{2}:\d{2}$/;

      if (!tanggal || !dateRegex.test(tanggal) || !jam || !timeRegex.test(jam)) {
        await editOrSend(sock, msg, `⚠️ Format tanggal/jam tidak valid.\nContoh: \`${prefix}pengumuman edit 1 30/09/2026 15:00 Deskripsi Baru\``);
        return;
      }

      const deskripsi = args.slice(4).join(' ');
      if (!deskripsi) {
        await editOrSend(sock, msg, '⚠️ Deskripsi pengumuman tidak boleh kosong.');
        return;
      }

      const updated = editPengumuman(id, { tanggal, jam, deskripsi });
      await editOrSend(sock, msg, `✅ *Pengumuman ID ${id} Berhasil Diperbarui!*\n\n📅 *Tanggal:* ${updated.tanggal}\n⏰ *Jam:* ${updated.jam}\n🎓 *Prodi:* ${updated.prodi}\n📝 *Deskripsi:* ${updated.deskripsi}`);
      return;
    }

    if (sub === 'delete' || sub === 'del') {
      if (!isModerator(sender) && !isAuthor(sender)) {
        await editOrSend(sock, msg, '❌ Hanya moderator atau author yang dapat menghapus pengumuman.');
        return;
      }

      const id = Number(args[1]);
      if (!id || isNaN(id)) {
        await editOrSend(sock, msg, `⚠️ Masukkan ID pengumuman yang valid.\nContoh: \`${prefix}pengumuman delete 1\``);
        return;
      }

      const existing = getPengumumanById(id);
      if (!existing) {
        await editOrSend(sock, msg, `❌ Pengumuman dengan ID ${id} tidak ditemukan.`);
        return;
      }

      const modProdi = getModeratorProdi(sender);
      if (!isAuthor(sender) && modProdi !== existing.prodi) {
        await editOrSend(sock, msg, `❌ Anda tidak memiliki akses untuk menghapus pengumuman prodi *${existing.prodi}*.`);
        return;
      }

      const success = deletePengumuman(id);
      if (success) {
        await editOrSend(sock, msg, `🗑️ Pengumuman ID ${id} (*${existing.prodi}*) berhasil dihapus.`);
      } else {
        await editOrSend(sock, msg, `❌ Gagal menghapus pengumuman ID ${id}.`);
      }
      return;
    }

    await editOrSend(sock, msg, `⚠️ Subcommand tidak dikenali. Ketik \`${prefix}pengumuman help\` untuk bantuan.`);
  }
};
