import { loadUsers } from '../utils/users.js';
import { loadRaisingUsers } from '../utils/raisingAuth.js';
import { isAdmin } from '../utils/users.js';
import { senderNumber } from '../utils/sender.js';

const CHECK = '✅';
const CROSS = '❌';

export default {
  name: 'userlist',
  description: 'Lihat daftar user terdaftar & status RAISING (admin)',
  type: 'admin',
  async run({ sock, msg, prefix }) {
    if (!isAdmin(senderNumber(msg))) {
      await sock.sendMessage(msg.key.remoteJid, { text: 'Command ini hanya untuk admin.' }, { quoted: msg });
      return;
    }

    const users = loadUsers();
    const raising = loadRaisingUsers();

    if (!users.length) {
      await sock.sendMessage(msg.key.remoteJid, { text: 'Belum ada user terdaftar.' }, { quoted: msg });
      return;
    }

    const lines = users.map((num, i) => {
      const u = raising[num];
      const hasRaising = Boolean(u);
      const name = u?.profile?.nama ? ` (${u.profile.nama})` : '';
      const nim = u?.nim ? ` [NIM: ${u.nim}]` : '';
      const status = hasRaising ? CHECK : CROSS;
      return `${i + 1}. ${num}${name}${nim} ${status}`;
    });

    let t = `╭──❲ DAFTAR USER ❳\n`;
    for (const line of lines) {
      t += `│ ${line}\n`;
    }
    t += `╰──────────⊱\n`;

    const totalRaising = users.filter((num) => raising[num]).length;
    t += `Total: ${users.length} user | RAISING: ${totalRaising}`;

    await sock.sendMessage(msg.key.remoteJid, { text: t }, { quoted: msg });
  }
};