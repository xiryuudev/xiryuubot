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

    const section = (title, items) => {
      let t = `╭──❲ ${title} ❳\n`;
      for (const item of items) {
        t += `│ ${item.line}\n`;
      }
      return `${t}╰──────────⊱\n`;
    };

    const lines = users.map((num, i) => {
      const hasRaising = raising[num] ? true : false;
      const raisingInfo = hasRaising ? ` NIM: ${raising[num].nim} (ID: ${raising[num].idMahasiswa || '-'})` : '';
      const status = hasRaising ? CHECK : CROSS;
      return `${i + 1}. ${num}${raisingInfo} ${status}`;
    });

    let text = section('DAFTAR USER', lines);
    text += `\nTotal: ${users.length} user${lines.filter(l => l.includes(CHECK)).length ? ` | RAISING: ${lines.filter(l => l.includes(CHECK)).length}` : ''}`;

    await sock.sendMessage(msg.key.remoteJid, { text: text.trimEnd() }, { quoted: msg });
  }
};