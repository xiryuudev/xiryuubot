import fs from 'fs';
import path from 'path';

const FILE = path.resolve('db/users.json');
export const clean = (v) => String(v ?? '').replace(/[^0-9]/g, '');

let cache = null;
let cacheMtime = 0;

export function loadUsers() {
  try {
    if (!fs.existsSync(FILE)) {
      fs.writeFileSync(FILE, JSON.stringify([], null, 2));
      cache = [];
      cacheMtime = 0;
      return cache;
    }
    const mtime = fs.statSync(FILE).mtimeMs;
    if (cache && mtime === cacheMtime) return cache;
    cache = JSON.parse(fs.readFileSync(FILE, 'utf8')).map(clean).filter(Boolean);
    cacheMtime = mtime;
    return cache;
  } catch {
    return [];
  }
}

export function saveUsers(list) {
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2));
  cache = list.map(clean).filter(Boolean);
  try {
    cacheMtime = fs.statSync(FILE).mtimeMs;
  } catch {}
}

export function isRegistered(jid) {
  const num = clean(jid);
  return num ? loadUsers().includes(num) : false;
}

export function isAdmin(jid) {
  return clean(jid) === (loadUsers()[0] ?? '');
}
