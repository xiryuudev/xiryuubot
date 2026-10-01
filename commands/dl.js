import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import config from '../config.js';
import { editOrSend } from '../utils/reply.js';
import { refreshIgCookies, hasValidCookies } from '../utils/igAuth.js';

const DL_DIR = path.resolve('downloads');
const UA = config.UA || 'Mozilla/5.0';
const MAX_BYTES = config.DL_MAX_MB * 1024 * 1024;
const FILE_TOO_BIG = new Error('file_too_big');

let busy = false;
fs.mkdirSync(DL_DIR, { recursive: true });

function detectSite(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (host.endsWith('tiktok.com')) return 'tiktok';
    if (host.endsWith('instagram.com') || host === 'instagr.am') return 'instagram';
    if (host === 'youtube.com' || host === 'youtu.be' || host === 'music.youtube.com') return 'youtube';
    if (host) return 'other';
  } catch { }
  return null;
}

function runYtdlp(args) {
  return new Promise((resolve, reject) => {
    execFile('yt-dlp', args, { timeout: config.DL_TIMEOUT_S * 1000, maxBuffer: 16 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(new Error((stderr || err.message).trim()));
      else resolve(stdout.trim());
    });
  });
}

function ytDlpArgs({ audio, cookies, proxy }) {
  const args = ['--no-warnings', '--no-playlist', '-P', DL_DIR, '-o', '%(id)s.%(ext)s', '--max-filesize', `${config.DL_MAX_MB}M`, '--print', 'after_move:filepath'];
  if (audio) args.push('-x', '--audio-format', 'mp3');
  else args.push('-f', 'b[height<=480]/bv*[height<=480]+ba[ext=m4a]/b');
  if (cookies) args.push('--cookies', cookies);
  if (proxy) args.push('--proxy', proxy);
  return args;
}

async function downloadWithYtdlp(url, audio, cookies) {
  const out = await runYtdlp([...ytDlpArgs({ audio, cookies, proxy: config.DL_PROXY }), url]);
  const lines = out.split('\n').map((l) => l.trim()).filter(Boolean);
  const file = lines[lines.length - 1];
  if (!file || !fs.existsSync(file)) throw new Error('file hasil download tidak ditemukan');
  const ext = path.extname(file).slice(1).toLowerCase();
  const mimetype = audio ? 'audio/mpeg' : ext === 'webm' ? 'video/webm' : ext === 'mp3' ? 'audio/mpeg' : 'video/mp4';
  return { file, mimetype, title: null };
}

async function fetchToFile(url, out) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`download gagal (HTTP ${res.status})`);
  const total = Number(res.headers.get('content-length') || 0);
  if (total > MAX_BYTES) throw FILE_TOO_BIG;
  const ws = fs.createWriteStream(out);
  let size = 0;
  try {
    for await (const chunk of Readable.fromWeb(res.body)) {
      size += chunk.length;
      if (size > MAX_BYTES) throw FILE_TOO_BIG;
      ws.write(chunk);
    }
    await new Promise((r) => ws.end(() => r()));
  } catch (err) {
    ws.destroy();
    await fs.promises.unlink(out).catch(() => { });
    throw err;
  }
}

async function downloadTiktok(url, audio) {
  const api = `${config.TIKWM_API}?url=${encodeURIComponent(url)}&hd=0`;
  const res = await fetch(api, { headers: { 'User-Agent': UA } });
  const json = await res.json();
  if (!json || json.code !== 0 || !json.data) throw new Error(json?.msg || 'link tiktok tidak dapat diproses');
  const target = audio ? json.data.music : (json.data.play || json.data.wmplay);
  if (!target) throw new Error('file tiktok tidak ditemukan');
  const ext = audio ? 'mp3' : 'mp4';
  const file = path.join(DL_DIR, `tt-${json.data.id}.${ext}`);
  await fetchToFile(target, file);
  return { file, mimetype: audio ? 'audio/mpeg' : 'video/mp4', title: (json.data.title || '').slice(0, 900) };
}

function isIgAuthError(message) {
  return /cookie|log ?in|empty media/i.test(message || '');
}

function friendlyError(err) {
  if (err === FILE_TOO_BIG) return `file melebihi batas ${config.DL_MAX_MB}MB`;
  const msg = String(err?.message || err);
  if (/IP address is blocked/.test(msg)) return 'situs ini memblokir IP server, coba lagi nanti';
  if (/timed ?out/i.test(msg)) return `proses melebihi ${config.DL_TIMEOUT_S} detik`;
  if (/private|login required/i.test(msg)) return 'konten private atau butuh login';
  return msg.split('\n')[0].slice(0, 200);
}

export default {
  name: 'dl',
  description: 'Download video/audio dari link (YouTube, TikTok, IG, dll). .dl <link> | .dl audio <link>',
  type: 'main',
  visibility: 'global',
  async run({ sock, msg, args }) {
    const audio = args[0]?.toLowerCase() === 'audio';
    const url = (audio ? args[1] : args[0])?.trim();

    if (!url || !/^https?:\/\/\S+$/i.test(url)) {
      await editOrSend(sock, msg, 'Cara pakai:\n.dl <link>\n.dl audio <link>\n\nContoh: .dl https://youtube.com/watch?v=...');
      return;
    }

    const site = detectSite(url);
    if (!site) {
      await editOrSend(sock, msg, '❌ Link tidak valid.');
      return;
    }

    if (busy) {
      await editOrSend(sock, msg, '⏳ Download sebelumnya masih berjalan. Coba lagi sebentar lagi.');
      return;
    }

    busy = true;
    let downloadedFile = null;
    await editOrSend(sock, msg, `⏳ Sedang download (${site})...\n\`${url}\``);

    try {
      let result;
      if (site === 'tiktok') {
        result = await downloadTiktok(url, audio);
      } else {
        const cookies = site === 'instagram' && hasValidCookies() ? config.DL_COOKIES : null;
        try {
          result = await downloadWithYtdlp(url, audio, cookies);
        } catch (err) {
          if (site === 'instagram' && isIgAuthError(err.message)) {
            await editOrSend(sock, msg, '⏳ Sesi Instagram habis, login ulang...');
            if (!(await refreshIgCookies())) throw new Error('login ulang IG gagal, update cookies.txt manual dulu');
            result = await downloadWithYtdlp(url, audio, config.DL_COOKIES);
          } else {
            throw err;
          }
        }
      }

      const { size } = await fs.promises.stat(result.file);
      if (size > MAX_BYTES) throw FILE_TOO_BIG;

      const payload = {
        mimetype: result.mimetype,
        caption: result.title || undefined
      };
      if (audio) {
        payload.audio = { url: result.file };
      } else if (result.mimetype?.startsWith('video/')) {
        payload.video = { url: result.file };
        payload.fileName = path.basename(result.file);
      } else {
        payload.document = { url: result.file };
        payload.fileName = path.basename(result.file);
      }

      await sock.sendMessage(msg.key.remoteJid, payload, { quoted: msg });
      downloadedFile = result.file;
    } catch (err) {
      console.log('[dl] Gagal:', err.message || err);
      await editOrSend(sock, msg, `❌ Download gagal: ${friendlyError(err)}`);
    } finally {
      busy = false;
      if (downloadedFile) await fs.promises.unlink(downloadedFile).catch(() => { });
    }
  }
};
