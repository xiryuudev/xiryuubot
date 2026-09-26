import { loadTasks, saveTasks } from '../utils/tasks.js';
import { senderNumber } from '../utils/sender.js';
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
  description: 'Lihat/hapus tugas (admin: tugas delete <id>)',
  type: 'main',
  async run({ sock, msg, args }) {
    const sender = senderNumber(msg);
    const tasks = loadTasks();

    const isDeleteAction = args[0]?.toLowerCase() === 'delete';
    if (isDeleteAction && args[1]) {
      if (!isSenderAdmin(sender)) {
        await sock.sendMessage(msg.key.remoteJid, { text: '❌ Hanya admin yang bisa menghapus tugas.' }, { quoted: msg });
        return;
      }

      const targetId = String(args[1]);
      const targetIndex = tasks.findIndex((item) => String(item.id) === targetId);

      if (targetIndex === -1) {
        await sock.sendMessage(msg.key.remoteJid, { text: `❌ Tugas dengan ID ${targetId} tidak ditemukan.` }, { quoted: msg });
        return;
      }

      const [removedTask] = tasks.splice(targetIndex, 1);
      saveTasks(tasks);
      await sock.sendMessage(msg.key.remoteJid, { text: `✅ Tugas dihapus: ${removedTask.course} - ${removedTask.title} (ID: ${targetId})` }, { quoted: msg });
      return;
    }

    if (!tasks.length) {
      await sock.sendMessage(msg.key.remoteJid, { text: 'Belum ada tugas yang tercatat.' }, { quoted: msg });
      return;
    }

    const items = tasks.map(formatTaskItem).join('\n├───────⊱\n');
    const responseText = `📋 *DAFTAR TUGAS AKTIF* (${tasks.length})\n╭───────────⊱\n${items}\n╰────────────⊱`;

    await sock.sendMessage(msg.key.remoteJid, { text: responseText }, { quoted: msg });
  }
};
