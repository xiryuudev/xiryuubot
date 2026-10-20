import { loadTasks, saveTasks } from '../utils/tasks.js';
import { senderNumber } from '../utils/sender.js';
import { getModeratorProdi, isAuthor, isModerator } from '../utils/moderators.js';
import { parseDateInput, tanggalIndo } from '../utils/date.js';
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

function canManage(sender, taskProdi) {
  return isAuthor(sender) || (getModeratorProdi(sender) === taskProdi);
}

export default {
  name: 'tugas',
  description: 'Lihat/hapus/edit tugas (.tugas [prodi] | .tugas delete <id> | .tugas edit <id> <field> <value>)',
  type: 'moderator',
  visibility: 'moderator',
  async run({ sock, msg, args }) {
    const sender = senderNumber(msg);
    
    // Help
    if (args[0]?.toLowerCase() === 'help') {
      const helpText = `📋 *Command: tugas*\nFungsi: Melihat, menghapus, dan mengedit tugas.\nCara pakai:\n- \`tugas\` — Lihat semua tugas prodi Anda\n- \`tugas <kode_prodi>\` — (Author) Lihat tugas prodi tertentu\n- \`tugas delete <id>\` — Hapus tugas berdasarkan ID\n- \`tugas edit <id> task <deskripsi>\` — Edit deskripsi tugas\n- \`tugas edit <id> link <url>\` — Edit/tambah link tugas\n- \`tugas edit <id> tanggal <tanggal> <bulan> <tahun>\` — Edit tanggal tugas (contoh: 20 Oktober 2026 atau 20 10 2026)\n- \`tugas edit <id> deadline <tanggal>\` — Edit deadline (format: DD/MM/YYYY atau YYYY-MM-DD)`;
      await sock.sendMessage(msg.key.remoteJid, { text: helpText }, { quoted: msg });
      return;
    }

    let tasks = loadTasks();

    // Delete action
    const isDeleteAction = args[0]?.toLowerCase() === 'delete';
    if (isDeleteAction && args[1]) {
      const targetId = String(args[1]);
      const targetIndex = tasks.findIndex((item) => String(item.id) === targetId);

      if (targetIndex === -1) {
        await sock.sendMessage(msg.key.remoteJid, { text: `❌ Tugas dengan ID ${targetId} tidak ditemukan.` }, { quoted: msg });
        return;
      }

      const taskProdi = tasks[targetIndex].prodi;
      if (!canManage(sender, taskProdi)) {
        await sock.sendMessage(msg.key.remoteJid, { text: '❌ Anda tidak memiliki hak menghapus tugas prodi ini.' }, { quoted: msg });
        return;
      }

      const [removedTask] = tasks.splice(targetIndex, 1);
      saveTasks(tasks);
      await sock.sendMessage(msg.key.remoteJid, { text: `✅ Tugas dihapus: ${removedTask.course} - ${removedTask.title} (ID: ${targetId})` }, { quoted: msg });
      return;
    }

    // Edit action
    const isEditAction = args[0]?.toLowerCase() === 'edit';
    if (isEditAction) {
      if (!args[1] || !args[2] || !args[3]) {
        await sock.sendMessage(msg.key.remoteJid, { 
          text: `⚠️ Format edit tugas:\n\`tugas edit <id> <field> <value>\`\n\nPilihan field:\n• \`task\` <deskripsi>\n• \`link\` <url>\n• \`tanggal\` <tanggal> <bulan> <tahun> (contoh: 20 Oktober 2026 atau 20 10 2026)\n• \`deadline\` <tanggal>` 
        }, { quoted: msg });
        return;
      }

      const targetId = String(args[1]);
      const field = args[2].toLowerCase();
      const value = args.slice(3).join(' ');
      
      const targetIndex = tasks.findIndex((item) => String(item.id) === targetId);
      if (targetIndex === -1) {
        await sock.sendMessage(msg.key.remoteJid, { text: `❌ Tugas dengan ID ${targetId} tidak ditemukan.` }, { quoted: msg });
        return;
      }

      const taskProdi = tasks[targetIndex].prodi;
      if (!canManage(sender, taskProdi)) {
        await sock.sendMessage(msg.key.remoteJid, { text: '❌ Anda tidak memiliki hak mengedit tugas prodi ini.' }, { quoted: msg });
        return;
      }

      const validFields = ['task', 'link', 'deadline', 'tanggal', 'tgl', 'date'];
      if (!validFields.includes(field)) {
        await sock.sendMessage(msg.key.remoteJid, { text: `❌ Field tidak valid. Gunakan: task, link, deadline, atau tanggal` }, { quoted: msg });
        return;
      }

      let formattedValue = value;
      let targetField = field;

      if (field === 'tanggal' || field === 'tgl' || field === 'date') {
        targetField = 'date';
        const parsedDate = parseDateInput(value);
        if (!parsedDate) {
          await sock.sendMessage(msg.key.remoteJid, { 
            text: `❌ Format tanggal salah. Gunakan: <tanggal> <bulan> <tahun>\nContoh: \`20 Oktober 2026\` atau \`20 10 2026\`` 
          }, { quoted: msg });
          return;
        }
        formattedValue = tanggalIndo(parsedDate);
      } else if (field === 'deadline') {
        const dateRegex = /^(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})$/;
        const parsedDate = parseDateInput(value);
        if (!dateRegex.test(value) && !parsedDate) {
          await sock.sendMessage(msg.key.remoteJid, { text: `❌ Format deadline salah. Gunakan: DD/MM/YYYY, YYYY-MM-DD, atau <tanggal> <bulan> <tahun>` }, { quoted: msg });
          return;
        }
        if (parsedDate && !dateRegex.test(value)) {
          formattedValue = tanggalIndo(parsedDate);
        }
      }

      const oldValue = tasks[targetIndex][targetField];
      tasks[targetIndex][targetField] = formattedValue;
      saveTasks(tasks);

      const fieldLabel = { 
        task: 'Deskripsi tugas', 
        link: 'Link', 
        deadline: 'Deadline', 
        tanggal: 'Tanggal', 
        tgl: 'Tanggal', 
        date: 'Tanggal' 
      }[field] || field;

      await sock.sendMessage(msg.key.remoteJid, { 
        text: `✅ ${fieldLabel} tugas ID ${targetId} diupdate:\n• Sebelum: ${oldValue || '—'}\n• Sesudah: ${formattedValue}` 
      }, { quoted: msg });
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
