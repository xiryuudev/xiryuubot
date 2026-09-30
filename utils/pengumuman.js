import { getDb } from './db.js';

const db = getDb();

export function addPengumuman(tanggal, jam, deskripsi, prodi = 'SI', createdBy = '', targetGroupId = '') {
  const stmt = db.prepare('INSERT INTO pengumuman (tanggal, jam, deskripsi, prodi, created_by, target_group_id) VALUES (?, ?, ?, ?, ?, ?)');
  const res = stmt.run(tanggal, jam, deskripsi, prodi, createdBy, targetGroupId);
  return { id: res.lastInsertRowid, tanggal, jam, deskripsi, prodi, createdBy, targetGroupId };
}

export function getPendingPengumuman() {
  return db.prepare('SELECT * FROM pengumuman WHERE sent = 0').all();
}

export function markPengumumanSent(id) {
  db.prepare("UPDATE pengumuman SET sent = 1, sent_at = datetime('now','localtime') WHERE id = ?").run(id);
}

export function listPengumuman(prodi = null) {
  if (prodi) {
    return db.prepare('SELECT * FROM pengumuman WHERE prodi = ? ORDER BY id DESC').all(prodi);
  }
  return db.prepare('SELECT * FROM pengumuman ORDER BY id DESC').all();
}

export function getPengumumanById(id) {
  return db.prepare('SELECT * FROM pengumuman WHERE id = ?').get(id) ?? null;
}

export function editPengumuman(id, updates = {}) {
  const current = getPengumumanById(id);
  if (!current) return null;

  const tanggal = updates.tanggal ?? current.tanggal;
  const jam = updates.jam ?? current.jam;
  const deskripsi = updates.deskripsi ?? current.deskripsi;
  const prodi = updates.prodi ?? current.prodi;

  const timeChanged = tanggal !== current.tanggal || jam !== current.jam;

  if (timeChanged) {
    db.prepare("UPDATE pengumuman SET tanggal = ?, jam = ?, deskripsi = ?, prodi = ?, sent = 0, sent_at = NULL WHERE id = ?")
      .run(tanggal, jam, deskripsi, prodi, id);
  } else {
    db.prepare('UPDATE pengumuman SET deskripsi = ?, prodi = ? WHERE id = ?')
      .run(deskripsi, prodi, id);
  }

  return { ...current, tanggal, jam, deskripsi, prodi };
}

export function deletePengumuman(id) {
  const res = db.prepare('DELETE FROM pengumuman WHERE id = ?').run(id);
  return res.changes > 0;
}
