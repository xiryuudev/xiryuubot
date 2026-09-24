export default {
  name: 'ping',
  description: 'Cek respon bot',
  type: 'main',
  async run({ sock, msg }) {
    await sock.sendMessage(msg.key.remoteJid, { text: 'Pong!' }, { quoted: msg });
  }
};