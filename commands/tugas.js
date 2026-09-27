import { loadTasks, saveTasks } from '../utils/tasks.js';
import { senderNumber } from '../utils/sender.js';
import { getModeratorProdi, isAuthor, isModerator } from '../utils/moderators.js';
import config from '../config.js';

const ADMIN_NUMBER = String(config.ADMIN_NUMBER).replace(/[^0-9]/g, '');

function isSenderAdmin(number) {
  return String(number).replace(/[^0-9]/g, '') === ADMIN_NUMBER;
}

function formatTaskItem(task) {
  return [
    `│ Tgl: *${task.date}*`,
    `│ MK: ${task.course}`,
    `│ Judul: \`${task.title}\``,
    `│ Dosen: ${task.lecturer || '-'}`,
    `│ Tugas: \`${task.task || '—'}\``,
    `│ DL: *${task.deadline}*`,
    `│ ${task.link ? `Link: ${task.link}` : 'Link: —'}`,
    `│ ID: ${task.id}`
  ].join('\n');
}

export default {
  name: 'tugas',
  description: 'Lihat/hapus tugas (.tugas [prodi] | .tugas delete <id>)',
  type: 'moderator',
  visibility: 'moderator',
  async run({ sock, msg, args }) {
    const sender = senderNumber(msg);
    if (args[0]?.toLowerCase() === 'help') {
      const helpText = `📋 *Command: tugas*\nFungsi: Melihat dan menghapus tugas berdasarkan prodi.\nCara pakai:\n- \`tugas\` — Lihat semua tugas prodi Anda (moderator) atau prodi default (author)\n- \`tugas <kode_prodi>\` — (Author) Lihat tugas prodi tertentu\n- \`tugas delete <id>\` — Hapus tugas berdasarkan ID`;
      await sock.sendMessage(msg.key.remoteJid, { text: helpText }, { quoted: msg });
      return;
    }
    let tasks = loadTasks();

    const isDeleteAction = args[0]?.toLowerCase() === 'delete';
    if (isDeleteAction && args[1]) {
      const targetId = String(args[1]);
      const targetIndex = tasks.findIndex((item) => String(item.id) === targetId);

      if (targetIndex === -1) {
        await sock.sendMessage(msg.key.remoteJid, { text: `❌ Tugas dengan ID ${targetId} tidak ditemukan.` }, { quoted: msg });
        return;
      }

      const taskProdi = tasks[targetIndex].prodi;
      const userProdi = getModeratorProdi(sender);
      const canDel = isAuthor(sender) || (userProdi && userProdi === taskProdi);

      if (!canDel) {
        await sock.sendMessage(msg.key.remoteJid, { text: '❌ Anda tidak memiliki hak menghapus tugas prodi ini.' }, { quoted: msg });
        return;
      }

      const [removedTask] = tasks.splice(targetIndex, 1);
      saveTasks(tasks);
      await sock.sendMessage(msg.key.remoteJid, { text: `✅ Tugas dihapus: ${removedTask.course} - ${removedTask.title} (ID: ${targetId})` }, { quoted: msg });
      return;
    }

    // Filter by prodi
    if (isAuthor(sender)) {
      const targetProdi = args[0]?.toUpperCase();
      if (targetProdi) {
        tasks = tasks.filter((t) => (t.prodi || 'DEFAULT').toUpperCase() === targetProdi);
      }
    } else if (isModerator(sender)) {
      const p = getModeratorProdi(sender);
      tasks = tasks.filter((t) => (t.prodi || 'DEFAULT').toUpperCase() === p);
    } else {
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ Anda bukan moderator atau author.' }, { quoted: msg });
      return;
    }

    if (!tasks.length) {
      await sock.sendMessage(msg.key.remoteJid, { text: 'Belum ada tugas yang tercatat untuk prodi Anda.' }, { quoted: msg });
      return;
    }

    const items = tasks.map(formatTaskItem).join('\n├───────⊱\n');
    const responseText = `📋 *DAFTAR TUGAS AKTIF* (${tasks.length})\n╭───────────⊱\n${items}\n╰────────────⊱`;

    await sock.sendMessage(msg.key.remoteJid, { text: responseText }, { quoted: msg });
  }
};
