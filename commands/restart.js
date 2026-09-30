import fs from 'fs';
import { isAuthor } from '../utils/moderators.js';
import { senderNumber } from '../utils/sender.js';
import { editOrSend } from '../utils/reply.js';

export default {
  name: 'restart',
  description: 'Restart bot (author only)',
  type: 'admin',
  visibility: 'admin',
  async run({ sock, msg, prefix }) {
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
