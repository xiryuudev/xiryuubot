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

export async function sendMedia(sock, jid, filePath, mediaType, options = {}) {
  const mime = mediaType === 'image' ? 'image/jpeg' : 
               mediaType === 'video' ? 'video/mp4' : 
               mediaType === 'audio' ? 'audio/mpeg' : 'application/octet-stream';
  const payload = { mimetype: mime };
  payload[mediaType] = { url: filePath };
  if (options.caption) payload.caption = options.caption;
  await sock.sendMessage(jid, payload, { quoted: options.quoted || null });
}
