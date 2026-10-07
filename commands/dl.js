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

async function downloadWithGalleryDL(url) {
  return new Promise((resolve, reject) => {
    execFile('gallery-dl', ['-d', DL_DIR, url], {
      timeout: config.DL_TIMEOUT_S * 1000,
      maxBuffer: 16 * 1024 * 1024
    }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error((stderr || err.message).trim()));
        return;
      }
      const filePath = stdout.trim().replace(/^#\s*/, '');
      if (!filePath || !fs.existsSync(filePath)) {
        reject(new Error('file gallery-dl tidak ditemukan'));
        return;
      }
      const ext = path.extname(filePath).slice(1).toLowerCase();
      const isVideo = ['mp4', 'webm', 'mov', 'mkv', 'm4v'].includes(ext);
      const mimetype = isVideo ? `video/${ext === 'mkv' ? 'x-matroska' : ext}` : 'image/jpeg';
      resolve({ file: filePath, mimetype, title: null });
    });
  });
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

  if (json.data.images && json.data.images.length > 0 && !audio) {
    const results = [];
    for (let i = 0; i < json.data.images.length; i++) {
      const imgUrl = json.data.images[i];
      const ext = 'jpg';
      const file = path.join(DL_DIR, `tt-${json.data.id}-${i + 1}.${ext}`);
      await fetchToFile(imgUrl, file);
      results.push({ file, mimetype: 'image/jpeg', title: (json.data.title || '').slice(0, 900) });
    }
    return results;
  }

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
  description: 'Download video/audio dari link (YouTube, TikTok, IG, Pinterest, dll). .dl <link> | .dl audio <link>',
  type: 'main',
  visibility: 'global',
  async run({ sock, msg, args }) {
    if (args[0]?.toLowerCase() === 'help') {
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '⏳', key: msg.key } });
      const helpText = `📥 *Command: .dl*
Fungsi: Download video/audio/foto dari berbagai platform (YouTube, TikTok, Instagram, Pinterest, X/Twitter, dll). Prioritas gallery-dl (carousel, multi-image), fallback yt-dlp. Support audio-only.

Cara pakai:
- \`.dl <link>\` — Download video/foto (gallery-dl → yt-dlp fallback)
- \`.dl audio <link>\` — Download audio-only (yt-dlp mp3)
- Carousel/multi-image: otomatis download semua (TikTok, Pinterest, IG)

Platform didukung: YouTube, TikTok, Instagram, Pinterest, X/Twitter, dll`;
      await sock.sendMessage(msg.key.remoteJid, { text: helpText }, { quoted: msg });
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '✅', key: msg.key } });
      return;
    }

    const audio = args[0]?.toLowerCase() === 'audio';
    const url = (audio ? args[1] : args[0])?.trim();

    if (!url || !/^https?:\/\/\S+$/i.test(url)) {
      await editOrSend(sock, msg, 'Cara pakai:\n.dl <link>\n.dl audio <link>\n\nContoh: .dl https://youtube.com/watch?v=...');
      return;
    }

    const site = detectSite(url);
    if (!site) {
      await editOrSend(sock, msg, 'Link tidak valid.');
      return;
    }

    if (busy) {
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '⏳', key: msg.key } });
      await editOrSend(sock, msg, 'Download sebelumnya masih berjalan. Coba lagi sebentar lagi.');
      return;
    }

    busy = true;
    let downloadedFiles = [];
    const filesToCleanup = [];
    await sock.sendMessage(msg.key.remoteJid, { react: { text: '⏳', key: msg.key } });

    try {
      let result;
      let galleryDlSucceeded = false;
      if (site === 'tiktok') {
        result = await downloadTiktok(url, audio);
        downloadedFiles = Array.isArray(result) ? result : [result];
      } else {
        if (!audio) {
          try {
            result = await downloadWithGalleryDL(url);
            downloadedFiles = [result];
            galleryDlSucceeded = true;
          } catch (gdErr) {
            console.log('[dl] gallery-dl failed, trying yt-dlp:', gdErr.message);
            const cookies = site === 'instagram' && hasValidCookies() ? config.DL_COOKIES : null;
            try {
              result = await downloadWithYtdlp(url, audio, cookies);
              downloadedFiles = [result];
            } catch (ytErr) {
              if (site === 'instagram' && isIgAuthError(ytErr.message)) {
                await editOrSend(sock, msg, 'Sesi Instagram habis, login ulang...');
                if (!(await refreshIgCookies())) throw new Error('login ulang IG gagal, update cookies.txt manual dulu');
                result = await downloadWithYtdlp(url, audio, config.DL_COOKIES);
                downloadedFiles = [result];
              } else {
                throw ytErr;
              }
            }
          }
        } else {
          const cookies = site === 'instagram' && hasValidCookies() ? config.DL_COOKIES : null;
          try {
            result = await downloadWithYtdlp(url, audio, cookies);
            downloadedFiles = [result];
          } catch (ytErr) {
            if (site === 'instagram' && isIgAuthError(ytErr.message)) {
              await editOrSend(sock, msg, 'Sesi Instagram habis, login ulang...');
              if (!(await refreshIgCookies())) throw new Error('login ulang IG gagal, update cookies.txt manual dulu');
              result = await downloadWithYtdlp(url, audio, config.DL_COOKIES);
              downloadedFiles = [result];
            } else {
              throw ytErr;
            }
          }
        }
      }

      for (const fileInfo of downloadedFiles) {
        const { size } = await fs.promises.stat(fileInfo.file);
        if (size > MAX_BYTES) throw FILE_TOO_BIG;

        const payload = {
          mimetype: fileInfo.mimetype,
          caption: fileInfo.title || undefined
        };
        if (audio) {
          payload.audio = { url: fileInfo.file };
        } else if (fileInfo.mimetype?.startsWith('video/')) {
          payload.video = { url: fileInfo.file };
          payload.fileName = path.basename(fileInfo.file);
        } else {
          payload.image = { url: fileInfo.file };
        }

        await sock.sendMessage(msg.key.remoteJid, { react: { text: '✅', key: msg.key } });
        await sock.sendMessage(msg.key.remoteJid, payload, { quoted: msg });
        filesToCleanup.push(fileInfo.file);
      }
    } catch (err) {
      console.log('[dl] Gagal:', err.message || err);
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
      await editOrSend(sock, msg, `Download gagal: ${friendlyError(err)}`);
    } finally {
      busy = false;
      for (const file of filesToCleanup) {
        try { await fs.promises.unlink(file); } catch (_) {}
      }
    }
  }
};