import { getDb } from './db.js';

const db = getDb();

export const clean = (v) => String(v ?? '').replace(/[^0-9]/g, '');
let cache = null;
let cacheMtime = 0;

export function loadUsers() {
  try {
    if (!cache || Date.now() - cacheMtime > 5000) {
      const rows = db.prepare('SELECT phone FROM users').all();
      cache = rows.map(r => r.phone);
      cacheMtime = Date.now();
    }
    return cache;
  } catch {
    return [];
  }
}

export function saveUsers(list) {
  const cleanList = list.map(clean).filter(Boolean);
  db.prepare('DELETE FROM users').run();
  const stmt = db.prepare('INSERT INTO users (phone) VALUES (?)');
  const insert = db.transaction((items) => {
    for (const u of items) stmt.run(u);
  });
  insert(cleanList);
  cache = cleanList;
  cacheMtime = Date.now();
}

export function isRegistered(jid) {
  const num = clean(jid);
  return num ? loadUsers().includes(num) : false;
}

export function isAdmin(jid) {
  return clean(jid) === (loadUsers()[0] ?? '');
}
