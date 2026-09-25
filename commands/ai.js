import config from '../config.js';
import { senderNumber } from '../utils/sender.js';
import { editOrSend } from '../utils/reply.js';
import { webSearch, runCode } from '../utils/tools.js';
import { loadAiHistory, saveAiHistory, clearAiHistory, trimHistory } from '../utils/aiHistory.js';

const MAX_ITERATIONS = 10;
const MAX_TURNS = 3;

const buildSummary = async (history) => {
  const convo = history.map((m) => `${m.role}: ${m.content}`).join('\n');
  const res = await fetch(`${config.AI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.AI_API_KEY}` },
    body: JSON.stringify({
      model: config.AI_MODEL,
      messages: [
        { role: 'system', content: 'Rangkum percakapan berikut secara ringkas dalam 3-5 kalimat bahasa Indonesia. Simpan fakta penting, nama, preferensi user, dan topik yang dibahas.' },
        { role: 'user', content: convo }
      ]
    })
  });
  if (!res.ok) return '';
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
};

export default {
  name: 'ai',
  description: 'Ngobrol dengan XiryuuBot (ai | ai newsession)',
  type: 'main',
  async run({ sock, msg, args, prefix }) {
    const sender = senderNumber(msg);
    if (!sender) return editOrSend(sock, msg, null, 'Gagal mendeteksi nomor WhatsApp Anda.');

    if (args[0]?.toLowerCase() === 'newsession') {
      clearAiHistory(sender);
      return editOrSend(sock, msg, null, `Sesi baru dimulai. History chat kamu dihapus, mulai dari 0.`);
    }

    const userMessage = args.join(' ').trim();
    if (!userMessage) return editOrSend(sock, msg, null, 'Kirim pesan dong, contoh: *' + prefix + 'ai halo*');

    let history = loadAiHistory(sender);

    const turnCount = history.filter((m) => m.role === 'user').length;
    if (turnCount >= MAX_TURNS) {
      try {
        const summary = await buildSummary(history);
        history = summary ? [{ role: 'user', content: `[Ringkasan percakapan sebelumnya: ${summary}]` }] : [];
        saveAiHistory(sender, history);
      } catch {
        history = [];
        saveAiHistory(sender, history);
      }
    }

    const systemPrompt = `Kamu adalah ${config.BOT_NAME}, bot WhatsApp ramah buatan ${config.ADMIN_NAME}. Kamu sedang ngobrol lewat WhatsApp, jadi:\n- Gunakan format teks WhatsApp: *tebal*, _miring_, ~coret~, \`monospace\`, \`\`\`code block\`\`\`, > quote, list dengan - atau 1.\n- Jawaban singkat, santai, to the point. Jangan bertele-tele.\n- Jangan pakai markdown heading (#), HTML, atau format yang tidak didukung WhatsApp.\n- Jika ditanya siapa kamu, jawab kamu adalah ${config.BOT_NAME}.\n- Kamu punya 2 tools: web_search(cari web) dan run_code(eksekusi JS).\n- Ingat konteks percakapan sebelumnya dari history jika ada.`;
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userMessage }
    ];

    let finalReply = '';
    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      const res = await fetch(`${config.AI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.AI_API_KEY}`
        },
        body: JSON.stringify({
          model: config.AI_MODEL,
          messages,
          tools: [
            { type: 'function', function: { name: 'web_search', description: 'Cari web', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } } },
            { type: 'function', function: { name: 'run_code', description: 'Eksekusi kode JS', parameters: { type: 'object', properties: { code: { type: 'string' } }, required: ['code'] } } }
          ],
          tool_choice: 'auto',
          stream: false
        })
      });
      if (!res.ok) {
        const errTxt = await res.text();
        return editOrSend(sock, msg, null, `AI Error ${res.status}: ${errTxt.slice(0, 400)}`);
      }
      const data = await res.json();
      const choice = data.choices?.[0];
      const aiMsg = choice?.message;
      if (!aiMsg) break;
      if (aiMsg?.tool_calls?.length) {
        messages.push(aiMsg);
        for (const tc of aiMsg.tool_calls) {
          const tcArgs = JSON.parse(tc.function.arguments || '{}');
          let result;
          if (tc.function.name === 'web_search') {
            result = await webSearch(tcArgs.query || '');
          } else if (tc.function.name === 'run_code') {
            result = await runCode(tcArgs.code);
          } else {
            result = 'Unknown tool: ' + tc.function.name;
          }
          messages.push({ role: 'tool', tool_call_id: tc.id, content: String(result) });
        }
        continue;
      } else {
        finalReply = aiMsg.content?.trim() || '';
        break;
      }
    }

    if (!finalReply) return editOrSend(sock, msg, null, 'AI tidak memberikan respons.');

    const newHistory = trimHistory([...history, { role: 'user', content: userMessage }, { role: 'assistant', content: finalReply }]);
    saveAiHistory(sender, newHistory);

    return editOrSend(sock, msg, null, finalReply);
  }
};
