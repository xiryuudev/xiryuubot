import fs from 'fs';
import path from 'path';

const FILE = path.resolve('db/moderators.json');

function ensureFile() {
  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, JSON.stringify({}, null, 2));
  }
}

export function loadModerators() {
  ensureFile();
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return {};
  }
}

export function saveModerators(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

export function getModerator(number) {
  const clean = String(number ?? '').replace(/[^0-9]/g, '');
  const mods = loadModerators();
  return mods[clean] ?? null;
}

export function getModeratorProdi(number) {
  const mod = getModerator(number);
  return mod?.prodi ?? null;
}

export function getModeratorDefaultProdi(number) {
  const mod = getModerator(number);
  if (mod?.prodi === 'ALL') return mod?.defaultProdi ?? 'DEFAULT';
  return mod?.prodi ?? null;
}

export function isAuthor(number) {
  const clean = String(number ?? '').replace(/[^0-9]/g, '');
  const mods = loadModerators();
  const mod = mods[clean];
  return mod?.prodi === 'ALL';
}

export function isModerator(number) {
  return getModerator(number) !== null;
}

export function getProdiByNumber(number) {
  return getModeratorDefaultProdi(number);
}

export function getGroupProdi(groupId) {
  const mods = loadModerators();
  for (const [num, mod] of Object.entries(mods)) {
    if (mod.groupId === groupId) {
      return mod.prodi === 'ALL' ? mod.defaultProdi : mod.prodi;
    }
  }
  return null;
}

export function addModerator(number, prodi, name, groupId) {
  const clean = String(number).replace(/[^0-9]/g, '');
  const mods = loadModerators();
  mods[clean] = { prodi, name, groupId, createdAt: new Date().toISOString() };
  saveModerators(mods);
  return mods[clean];
}

export function deleteModerator(number) {
  const clean = String(number).replace(/[^0-9]/g, '');
  const mods = loadModerators();
  if (!mods[clean]) return false;
  delete mods[clean];
  saveModerators(mods);
  return true;
}