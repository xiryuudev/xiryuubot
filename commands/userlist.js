import { loadUsers } from '../utils/users.js';
import { loadRaisingUsers, getValidSession } from '../utils/raisingAuth.js';
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

    const lines = [];
    for (let i = 0; i < users.length; i++) {
      const num = users[i];
      const u = raising[num];
      let profileName = '';
      let nim = '';

      if (u) {
        nim = u.nim ? ` [NIM: ${u.nim}]` : '';
        try {
          const session = await getValidSession(num);
          profileName = session.profile?.nama || '';
        } catch {}
      }

      const status = u ? CHECK : CROSS;
      lines.push(`${i + 1}. ${num}${profileName ? ` (${profileName})` : ''}${nim} ${status}`);
    }

    let t = `╭──❲ DAFTAR USER ❳\n`;
    for (const line of lines) {
      t += `│ ${line}\n`;
    }
    t += `╰──────────⊱\n`;
    t += `Total: ${users.length} user | RAISING: ${lines.filter((l) => l.includes(CHECK)).length}`;

    await sock.sendMessage(msg.key.remoteJid, { text: t }, { quoted: msg });
  }
};