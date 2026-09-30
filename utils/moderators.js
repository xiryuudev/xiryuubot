import { getDb } from './db.js';

const db = getDb();

function loadCache() {
  const rows = db.prepare('SELECT * FROM moderators').all();
  const cache = {};
  for (const r of rows) cache[r.phone] = rowToMod(r);
  return cache;
}

function rowToMod(r) {
  return {
    prodi: r.prodi,
    defaultProdi: r.default_prodi ?? undefined,
    name: r.name,
    groupId: r.group_id,
    createdAt: r.created_at,
  };
}

function saveCache(mods) {
  db.prepare('DELETE FROM moderators').run();
  const stmt = db.prepare('INSERT INTO moderators (phone, prodi, default_prodi, name, group_id, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  const insert = db.transaction((data) => {
    for (const [num, mod] of Object.entries(data)) {
      const prodi = mod.prodi ?? 'SI';
      const defProdi = prodi === 'ALL' ? (mod.defaultProdi ?? null) : null;
      stmt.run(num, prodi, defProdi, mod.name ?? '', mod.groupId ?? '', mod.createdAt ?? new Date().toISOString());
    }
  });
  insert(mods);
}

let cache = null;
let cacheMtime = 0;

function getFreshCache() {
  if (!cache || Date.now() - cacheMtime > 5000) {
    cache = loadCache();
    cacheMtime = Date.now();
  }
  return cache;
}

export function loadModerators() {
  const rows = db.prepare('SELECT * FROM moderators').all();
  const mods = {};
  for (const r of rows) mods[r.phone] = rowToMod(r);
  return mods;
}

export function saveModerators(data) {
  saveCache(data);
  cache = loadCache();
  cacheMtime = Date.now();
}

export function getModerator(number) {
  const clean = String(number ?? '').replace(/[^0-9]/g, '');
  return getFreshCache()[clean] ?? null;
}

export function getModeratorProdi(number) {
  const mod = getModerator(number);
  return mod?.prodi ?? null;
}

export function getModeratorDefaultProdi(number) {
  const mod = getModerator(number);
  if (mod?.prodi === 'ALL') return mod?.defaultProdi ?? 'SI';
  return mod?.prodi ?? null;
}

export function isAuthor(number) {
  const clean = String(number ?? '').replace(/[^0-9]/g, '');
  return getFreshCache()[clean]?.prodi === 'ALL';
}

export function isModerator(number) {
  return getModerator(number) !== null;
}

export function getProdiByNumber(number) {
  return getModeratorDefaultProdi(number);
}

export function getGroupProdi(groupId) {
  const mods = getFreshCache();
  for (const [num, mod] of Object.entries(mods)) {
    if (mod.groupId === groupId) {
      return mod.prodi === 'ALL' ? mod.defaultProdi : mod.prodi;
    }
  }
  return null;
}

export function loadFreshMods() {
  return getFreshCache();
}

export function addModerator(number, prodi, name, groupId) {
  const clean = String(number).replace(/[^0-9]/g, '');
  const mods = loadModerators();
  mods[clean] = {
    prodi,
    defaultProdi: prodi === 'ALL' ? 'SI' : null,
    name,
    groupId,
    createdAt: new Date().toISOString(),
  };
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
