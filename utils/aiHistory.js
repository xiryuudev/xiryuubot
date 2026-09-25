import fs from 'fs';
import path from 'path';

const DIR = path.resolve('db/ai_chats');
const MAX_HISTORY = 3;

const getFilePath = (num) => path.join(DIR, `${num}.json`);

export function loadAiHistory(num) {
  try {
    if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
    const file = getFilePath(num);
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return [];
  }
}

export function saveAiHistory(num, history) {
  try {
    if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(getFilePath(num), JSON.stringify(history, null, 2));
  } catch { }
}

export function clearAiHistory(num) {
  try {
    const file = getFilePath(num);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  } catch { }
}

export function trimHistory(history) {
  if (history.length <= MAX_HISTORY * 2) return history;
  return history.slice(-MAX_HISTORY * 2);
}
