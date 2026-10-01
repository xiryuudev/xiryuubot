import fs from 'fs';
import path from 'path';
import config from '../config.js';

const APP_ID = '936619747307450';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function parseSetCookies(resp) {
  const raw = typeof resp.headers.getSetCookie === 'function' ? resp.headers.getSetCookie() : [];
  return raw
    .map((c) => {
      const [pair, ...attrs] = c.split(';').map((s) => s.trim());
      const idx = pair.indexOf('=');
      if (idx < 0) return null;
      const name = pair.slice(0, idx);
      const value = pair.slice(idx + 1);
      const domAttr = attrs.find((a) => a.toLowerCase().startsWith('domain='));
      const domain = domAttr ? domAttr.slice(7) : '.instagram.com';
      const expAttr = attrs.find((a) => a.toLowerCase().startsWith('expires='));
      const expires = expAttr ? Math.floor(new Date(expAttr.slice(8)).getTime() / 1000) : Math.floor(Date.now() / 1000) + 30 * 24 * 3600;
      return { name, value, domain, expires };
    })
    .filter(Boolean);
}

function writeCookies(cookies) {
  const lines = ['# Netscape HTTP Cookie File'];
  for (const c of cookies) {
    const flag = c.domain.startsWith('.') ? 'TRUE' : 'FALSE';
    lines.push([c.domain, flag, '/', 'TRUE', c.expires, c.name, c.value].join('\t'));
  }
  fs.mkdirSync(path.dirname(path.resolve(config.DL_COOKIES)), { recursive: true });
  fs.writeFileSync(config.DL_COOKIES, lines.join('\n') + '\n');
}

export function hasValidCookies() {
  try {
    return fs.existsSync(config.DL_COOKIES) && fs.readFileSync(config.DL_COOKIES, 'utf8').includes('sessionid');
  } catch {
    return false;
  }
}

export async function refreshIgCookies() {
  const { IG_USERNAME, IG_PASSWORD } = config;
  if (!IG_USERNAME || !IG_PASSWORD) {
    console.log('[igAuth] IG_USERNAME/IG_PASSWORD belum diisi, tidak bisa auto-login.');
    return false;
  }
  try {
    const home = await fetch('https://www.instagram.com/', { headers: { 'User-Agent': UA } });
    const homeCookies = parseSetCookies(home);
    const csrf = homeCookies.find((c) => c.name === 'csrftoken')?.value;
    if (!csrf) {
      console.log('[igAuth] Tidak mendapat csrftoken dari instagram.com.');
      return false;
    }

    const res = await fetch('https://i.instagram.com/accounts/login/', {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-ig-app-id': APP_ID,
        'x-csrftoken': csrf,
        Referer: 'https://www.instagram.com/',
        Origin: 'https://www.instagram.com'
      },
      body: new URLSearchParams({ username: IG_USERNAME, password: IG_PASSWORD })
    });

    const merged = new Map([...parseSetCookies(home), ...parseSetCookies(res)].map((c) => [c.name, c]));
    if (!merged.has('sessionid')) {
      console.log(`[igAuth] Login gagal (HTTP ${res.status}). Cookie lama tetap dipakai.`);
      return false;
    }
    writeCookies([...merged.values()]);
    console.log('[igAuth] Login ulang berhasil, cookies.txt diperbarui.');
    return true;
  } catch (err) {
    console.log('[igAuth] Error saat login ulang:', err.message || err);
    return false;
  }
}
