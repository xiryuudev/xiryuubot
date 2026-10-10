import fs from 'fs';
import { isAuthor } from '../utils/moderators.js';
import { senderNumber } from '../utils/sender.js';
import { editOrSend } from '../utils/reply.js';

export default {
  name: 'restart',
  description: 'Restart bot (author only)',
  type: 'admin',
  visibility: 'admin',
  async run({ sock, msg, args, prefix }) {
    if (args?.[0]?.toLowerCase() === 'help') {
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '⏳', key: msg.key } });
      const helpText = `🔄 *Command: .restart*
Fungsi: Restart bot (hanya author).

Cara pakai:
- \`.restart\` — Restart bot dalam 3 detik (nodemon akan menjalankannya ulang)`;
      await sock.sendMessage(msg.key.remoteJid, { text: helpText }, { quoted: msg });
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '✅', key: msg.key } });
      return;
    }

    const sender = senderNumber(msg);

    if (!isAuthor(sender)) {
      await editOrSend(sock, msg, '❌ Command ini hanya untuk author.');
      return;
    }

    await editOrSend(sock, msg, '🔄 *Memulai restart bot...*\n\nBot akan restart dalam 3 detik.');

    setTimeout(() => {
      try {
        fs.utimesSync('index.js', new Date(), new Date());
      } catch {
        try {
          fs.utimesSync('package.json', new Date(), new Date());
        } catch {}
      }
      process.exit(0);
    }, 3000);
  }
};
