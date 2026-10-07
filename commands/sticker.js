import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { downloadMediaMessage, normalizeMessageContent } from '@whiskeysockets/baileys';
import { editOrSend } from '../utils/reply.js';

const TMP_DIR = path.resolve('tmp/stickers');
fs.mkdirSync(TMP_DIR, { recursive: true });

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    execFile('ffmpeg', args, { timeout: 30000 }, (err, stdout, stderr) => {
      if (err) reject(new Error((stderr || err.message).trim()));
      else resolve(stdout);
    });
  });
}

async function mediaToSticker(buffer, mimetype) {
  const inPath = path.join(TMP_DIR, `in_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const outPath = path.join(TMP_DIR, `out_${Date.now()}_${Math.random().toString(36).slice(2)}.webp`);

  await fs.promises.writeFile(inPath, buffer);

  let args;
    if (mimetype.startsWith('video/')) {
      args = [
        '-i', inPath,
        '-vf', 'scale=512:512:flags=lanczos:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
        '-t', '3', '-c:v', 'libwebp', '-lossless', '0', '-compression_level', '6',
        '-loop', '0', '-preset', 'default', '-an', '-vsync', '0', '-y', outPath
      ];
    } else {
      args = [
        '-i', inPath,
        '-vf', 'scale=512:512:flags=lanczos:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
        '-c:v', 'libwebp', '-lossless', '0', '-compression_level', '6',
        '-preset', 'default', '-y', outPath
      ];
    }

  await runFfmpeg(args);
  await fs.promises.unlink(inPath).catch(() => {});

  const stickerBuffer = await fs.promises.readFile(outPath);
  await fs.promises.unlink(outPath).catch(() => {});
  return stickerBuffer;
}

function getTargetMediaMessage(msg) {
  // 1. Check if replying to a message with media
  if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
    const quoted = normalizeMessageContent(msg.message.extendedTextMessage.contextInfo.quotedMessage);
    if (quoted?.imageMessage) return { ...quoted.imageMessage, _type: 'image', _quoted: true, _key: msg.message.extendedTextMessage.contextInfo.stanzaId };
    if (quoted?.videoMessage) return { ...quoted.videoMessage, _type: 'video', _quoted: true, _key: msg.message.extendedTextMessage.contextInfo.stanzaId };
  }

  // 2. Check direct message media
  const direct = normalizeMessageContent(msg.message);
  if (direct?.imageMessage) return { ...direct.imageMessage, _type: 'image' };
  if (direct?.videoMessage) return { ...direct.videoMessage, _type: 'video' };

  return null;
}

function buildDownloadMessage(msg, target, sock) {
  const baseMsg = {
    key: target._quoted
      ? { remoteJid: msg.key.remoteJid, fromMe: false, id: target._key }
      : msg.key,
    message: {}
  };
  baseMsg.message[target._type + 'Message'] = target;
  return baseMsg;
}

export default {
  name: 'sticker',
  aliases: ['s'],
  description: 'Jadikan gambar/video jadi sticker. Reply gambar/video dengan .sticker atau .s',
  type: 'main',
  visibility: 'global',
  async run({ sock, msg, args }) {
    const target = getTargetMediaMessage(msg);
    if (!target) {
      await editOrSend(sock, msg, 'Reply gambar/video dengan .sticker atau .s');
      return;
    }

    if (target._type === 'video' && target.seconds > 3) {
      await editOrSend(sock, msg, 'Video maksimal 3 detik untuk sticker');
      return;
    }

    // React ⏳
    await sock.sendMessage(msg.key.remoteJid, { react: { text: '⏳', key: msg.key } });

    try {
      const dlMsg = buildDownloadMessage(msg, target, sock);
      const buffer = await downloadMediaMessage(dlMsg, 'buffer', {});
      const stickerBuffer = await mediaToSticker(buffer, target.mimetype || 'image/jpeg');
      await sock.sendMessage(msg.key.remoteJid, { sticker: stickerBuffer }, { quoted: msg });
      // React ✅
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (err) {
      console.error('[sticker] Error:', err);
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
      await editOrSend(sock, msg, `❌ Gagal buat sticker: ${err.message}`);
    }
  }
};