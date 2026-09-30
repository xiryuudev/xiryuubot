import { getDb } from './db.js';

const db = getDb();

export function loadAiHistory(num) {
  try {
    const clean = String(num ?? '').replace(/[^0-9]/g, '');
    const row = db.prepare('SELECT history FROM ai_chats WHERE phone = ?').get(clean);
    return row ? JSON.parse(row.history) : [];
  } catch {
    return [];
  }
}

export function saveAiHistory(num, history) {
  try {
    const clean = String(num ?? '').replace(/[^0-9]/g, '');
    const serialized = JSON.stringify(history ?? []);
    const row = db.prepare('INSERT OR REPLACE INTO ai_chats (phone, history) VALUES (?, ?)').get(clean, serialized);
    return row.changed > 0 || row.changes > 0;
  } catch { }
}

export function clearAiHistory(num) {
  try {
    const clean = String(num ?? '').replace(/[^0-9]/g, '');
    db.prepare('DELETE FROM ai_chats WHERE phone = ?').run(clean);
  } catch { }
}

export function trimHistory(history) {
  const MAX_HISTORY = 3;
  if (history.length <= MAX_HISTORY * 2) return history;
  return history.slice(-MAX_HISTORY * 2);
}