export async function editOrSend(sock, msg, loadingMsg, text) {
  // Backward compat: 3-arg call editOrSend(sock, msg, text)
  if (text === undefined) {
    text = loadingMsg;
    loadingMsg = null;
  }
  if (loadingMsg?.key) {
    try {
      await sock.sendMessage(msg.key.remoteJid, { text, edit: loadingMsg.key });
      return;
    } catch {}
  }
  try {
    await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
  } catch {
    await sock.sendMessage(msg.key.remoteJid, { text });
  }
}
