import config from '../config.js';
import { senderNumber } from '../utils/sender.js';
import { isModerator, isAuthor, getModeratorDefaultProdi } from '../utils/moderators.js';
import { loadRaisingUsers } from '../utils/raisingAuth.js';
import { formatNow } from '../utils/date.js';

export default {
  name: 'menu',
  description: 'Menampilkan daftar command bot',
  type: 'main',
  visibility: 'global',
  run: async ({ sock, msg, commandList, prefix, args }) => {
    const sender = senderNumber(msg);
    if (args?.[0]?.toLowerCase() === 'help') {
      let helpText = `📋 *Command: ${prefix}menu*\nFungsi: Menampilkan daftar seluruh command bot yang bisa Anda akses.\nCara pakai:\n- \`${prefix}menu\` — Tampilkan daftar menu sesuai role/status Anda.`;
      await sock.sendMessage(msg.key.remoteJid, { text: helpText }, { quoted: msg });
      return;
    }
    const isAuthorUser = isAuthor(sender);
    const isModeratorUser = isModerator(sender);
    const isMahasiswa = loadRaisingUsers()[sender] ? true : false;

    const byType = (type, visibility) =>
      Object.entries(commandList)
        .filter(([, c]) => (c.type ?? 'main') === type && (!c.hasOwnProperty('visibility') || c.visibility === visibility))
        .map(([name, c]) => ({ name, desc: c.description || '' }));

    const globalMenu = byType('main', 'global');
    const mahasiswaMenu = byType('main', 'mahasiswa');
    const moderatorMenu = byType('moderator', 'moderator');
    const adminMenu = byType('admin', 'admin');

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
    text += `│ Status: ${isAuthorUser ? 'Author' : isModeratorUser ? 'Moderator' : 'Member'}\n`;
    if (isModeratorUser) text += `│ Prodi: ${getModeratorDefaultProdi(sender)}\n`;
    text += `╰──────────⊱\n`;
    text += `╭──❲ INFO BOT ❳\n`;
    text += `│ Nama Bot: ${config.BOT_NAME}\n`;
    text += `│ Author: ${config.ADMIN_NAME} (${config.AUTHOR_NUMBER})\n`;
    text += `│ Repo: https://github.com/xiryuudev/xiryuubot\n`;
    text += `│ Privacy: Lihat codebase di repo (tidak simpan password/data pribadi)\n`;
    text += `│ Prefix: ${prefix}\n`;
    text += `│ Waktu: ${formatNow()} WIB\n`;
    text += `╰──────────⊱\n`;
    text += section('GLOBAL MENU', globalMenu);
    if (isMahasiswa) text += section('MAHASISWA MENU', mahasiswaMenu);
    if (isModeratorUser) text += section('MODERATOR MENU', moderatorMenu);
    if (isAuthorUser && adminMenu.length) text += section('ADMIN MENU', adminMenu);

    await sock.sendMessage(msg.key.remoteJid, { text: text.trimEnd() }, { quoted: msg });
  }
};