import axios from 'axios';
import config from '../config.js';
import { senderNumber } from '../utils/sender.js';
import { editOrSend } from '../utils/reply.js';
import { loadAiHistory, saveAiHistory, trimHistory } from '../utils/aiHistory.js';

const API_URL = config.AI_BASE_URL;
const MODEL = config.AI_MODEL;
const TOKEN = config.AI_API_KEY;

function buildPrompt(text) {
  const sys = `Kamu adalah asisten WhatsApp (xiryuubot).
  - Bahasa: Indonesia santai, singkat, to the point.
  - Gaya: logis, jelas, nggak pake basa-basi.
  - Format: jawabannya rapi, pakai bullet kalau perlu, tapi nggak bertele-tele.
  - Kalau user tanya teknis, jawab teknis. Kalau cuma ngobrol, jawab santai.`;
  return [{ role: 'system', content: sys }, { role: 'user', content: text }];
}

export default {
  name: 'ai',
  aliases: ['ask'],
  description: 'Chat dengan AI. .ai <pertanyaan> atau reply pesan dengan .ai',
  type: 'main',
  visibility: 'global',
  async run({ sock, msg, args }) {
    if (args[0]?.toLowerCase() === 'help') {
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '⏳', key: msg.key } });
      const helpText = `🤖 *Command: .ai* (alias: .ask)
Fungsi: Chat dengan AI (Groq). Mendukung riwayat percakapan per pengguna.

Cara pakai:
- \`.ai <pertanyaan>\` — Tanya langsung ke AI
- \`.ai\` (reply pesan) — Tanya AI tentang isi pesan yang di-reply
- Riwayat otomatis disimpan per nomor WhatsApp`;
      await sock.sendMessage(msg.key.remoteJid, { text: helpText }, { quoted: msg });
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '✅', key: msg.key } });
      return;
    }

    await sock.sendMessage(msg.key.remoteJid, { react: { text: '⏳', key: msg.key } });

    const sender = senderNumber(msg);
    if (!sender) {
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
      await editOrSend(sock, msg, 'Gagal mendeteksi nomor WhatsApp Anda.');
      return;
    }

    let question = args.join(' ');

    if (!question && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
      const quoted = msg.message.extendedTextMessage.contextInfo.quotedMessage;
      if (quoted.conversation) question = quoted.conversation;
      else if (quoted.extendedTextMessage?.text) question = quoted.extendedTextMessage.text;
      else if (quoted.imageMessage?.caption) question = quoted.imageMessage.caption;
    }

    if (!question) {
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
      await editOrSend(sock, msg, 'Tulis pertanyaan atau reply pesan dengan .ai');
      return;
    }

    try {
      const history = loadAiHistory(sender);
      const messages = [{ role: 'system', content: `Kamu adalah asisten WhatsApp (xiryuubot).
  - Bahasa: Indonesia santai, singkat, to the point.
  - Gaya: logis, jelas, nggak pake basa-basi.
  - Format: jawabannya rapi, pakai bullet kalau perlu, tapi nggak bertele-tele.
  - Kalau user tanya teknis, jawab teknis. Kalau cuma ngobrol, jawab santai.` },
        ...history,
        { role: 'user', content: question }];

      const res = await axios.post(API_URL, {
        model: MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 800
      }, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${TOKEN}`
        },
        timeout: 60000
      });

      const answer = res.data?.choices?.[0]?.message?.content?.trim();
      if (!answer) throw new Error('Response kosong dari AI');

      const newHistory = trimHistory([...history, { role: 'user', content: question }, { role: 'assistant', content: answer }]);
      saveAiHistory(sender, newHistory);

      await sock.sendMessage(msg.key.remoteJid, { react: { text: '✅', key: msg.key } });
      await editOrSend(sock, msg, answer);
    } catch (err) {
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
      await editOrSend(sock, msg, `AI error: ${err.response?.data?.error?.message || err.message}`);
    }
  }
};