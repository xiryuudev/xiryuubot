import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { editOrSend, sendMedia } from '../utils/reply.js';

const API_URL = 'https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json';
const SHAKMAP_BASE = 'https://static.bmkg.go.id/';
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36';

async function fetchGempa() {
  const { data } = await axios.get(API_URL, {
    headers: { 'User-Agent': UA },
    timeout: 10000,
  });
  return data.Infogempa.gempa;
}

async function downloadShakemap(shakemapFile) {
  if (!shakemapFile) return null;
  const url = SHAKMAP_BASE + shakemapFile;
  const tmpPath = path.join('/tmp', `shakemap_${Date.now()}.jpg`);
  const response = await axios.get(url, {
    headers: { 'User-Agent': UA },
    responseType: 'arraybuffer',
    timeout: 15000,
    maxRedirects: 5,
  });
  fs.writeFileSync(tmpPath, Buffer.from(response.data));
  return tmpPath;
}

function formatGempa(g) {
  const lines = [
    '┌─ 🌍 GEMPA BUMI TERBARU ─┐',
    `│ ${g.Tanggal} ${g.Jam}`,
    `│ Mag   : ${g.Magnitude} SR`,
    `│ Kedal : ${g.Kedalaman}`,
    `│ Lok   : ${g.Wilayah}`,
    `│ Dirsk : ${g.Dirasakan}`,
    `│ Pot   : ${g.Potensi}`,
    '└─────────────────────────┘',
    `📍 ${g.Coordinates.replace(/\s+/g, '')}`,
    '',
    'Sumber: BMKG',
  ];
  return lines.join('\n');
}

export default {
  name: 'gempa',
  aliases: ['gmp'],
  description: 'Info gempa bumi terbaru dari BMKG + shakemap',
  type: 'main',
  visibility: 'public',
  async run({ sock, msg, args, prefix }) {
    await sock.sendMessage(msg.key.remoteJid, { react: { text: '⏳', key: msg.key } });

    try {
      const g = await fetchGempa();
      const text = formatGempa(g);

      // Download shakemap
      let imgPath = null;
      if (g.Shakemap) {
        try {
          imgPath = await downloadShakemap(g.Shakemap);
        } catch (e) {
          console.error('Shakemap download failed:', e.message);
        }
      }

      if (imgPath) {
        await sendMedia(sock, msg.key.remoteJid, imgPath, 'image', { caption: text, quoted: msg });
        fs.unlinkSync(imgPath);
      } else {
        await editOrSend(sock, msg, text);
      }

      await sock.sendMessage(msg.key.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (err) {
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
      await editOrSend(sock, msg, `Gagal ambil data gempa: ${err.message}`);
    }
  },
};