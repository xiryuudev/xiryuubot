export async function editOrSend(sock, msg, loadingMsg, text) {
  try {
    await sock.sendMessage(msg.key.remoteJid, { text, edit: loadingMsg.key });
  } catch {
    await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
  }
}
