import { senderNumber } from '../utils/sender.js';
import { loadUsers } from '../utils/users.js';
import { formatNow } from '../utils/date.js';

export default {
  name: 'menu',
  description: 'Menampilkan daftar command bot',
  type: 'main',
  run: async ({ sock, msg, commandList, prefix }) => {
    const adminId = loadUsers()[0] ?? '';
    const isAdmin = senderNumber(msg) === adminId;

    const byType = (type) =>
      Object.entries(commandList)
        .filter(([, c]) => (c.type ?? 'main') === type)
        .map(([name, c]) => ({ name, desc: c.description || '' }));

    const main = byType('main');
    const admin = byType('admin');

    const section = (title, items) => {
      let t = `╭──❲ ${title} ❳\n`;
      for (const c of items) {
        t += `│ ${prefix}${c.name}\n`;
        if (c.desc) t += `> ${c.desc}\n`;
      }
      return `${t}╰──────────⊱\n`;
    };

    let text = `╭──❲ INFO PENGGUNA ❳\n`;
    text += `│ Nama: ${msg.pushName || '-'}\n`;
    text += `│ Status: ${isAdmin ? 'Admin' : 'Member'}\n`;
    text += `╰──────────⊱\n`;
    text += `╭──❲ INFO BOT ❳\n`;
    text += `│ Prefix: ${prefix}\n`;
    text += `│ Waktu: ${formatNow()} WIB\n`;
    text += `╰──────────⊱\n`;
    text += section('MAIN MENU', main);
    if (isAdmin && admin.length) text += section('ADMIN MENU', admin);

    await sock.sendMessage(msg.key.remoteJid, { text: text.trimEnd() }, { quoted: msg });
  }
};
