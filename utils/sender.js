export function senderJid(msg) {
  const { remoteJid, participant, participantAlt } = msg.key;
  if (remoteJid.endsWith('@g.us')) return participantAlt || participant || '';
  return msg.key.remoteJidAlt || remoteJid;
}

export function senderNumber(msg) {
  return String(senderJid(msg)).replace(/[^0-9]/g, '');
}
