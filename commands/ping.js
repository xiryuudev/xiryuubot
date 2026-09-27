export default {
  name: 'ping',
  description: 'Cek respon bot',
  type: 'main',
  visibility: 'global',
  async run({ sock, msg }) {
    await sock.sendMessage(msg.key.remoteJid, { text: 'Pong!' }, { quoted: msg });
  }
};