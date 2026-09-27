export default {
  name: 'ping',
  description: 'Cek respon bot',
  type: 'main',
  visibility: 'global',
  async run({ sock, msg, args }) {
    if (args?.[0]?.toLowerCase() === 'help') {
      await sock.sendMessage(msg.key.remoteJid, { text: '🏓 *Command: .ping*\nFungsi: Cek status respons bot.\nCara pakai:\n- `.ping` — Bot akan membalas dengan `Pong!`' }, { quoted: msg });
      return;
    }
    await sock.sendMessage(msg.key.remoteJid, { text: 'Pong!' }, { quoted: msg });
  }
};