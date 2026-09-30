import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.resolve('db/bot.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function getDb() {
  return db;
}

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      phone TEXT PRIMARY KEY,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS moderators (
      phone TEXT PRIMARY KEY,
      prodi TEXT NOT NULL DEFAULT 'SI',
      default_prodi TEXT DEFAULT NULL,
      name TEXT DEFAULT '',
      group_id TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT DEFAULT '—',
      course TEXT DEFAULT '—',
      type TEXT DEFAULT '—',
      title TEXT DEFAULT '—',
      meeting TEXT DEFAULT '—',
      lecturer TEXT DEFAULT '—',
      has_task INTEGER DEFAULT 0,
      task TEXT DEFAULT 'Tidak ada tugas',
      link TEXT DEFAULT '',
      deadline TEXT DEFAULT '—',
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      has_document INTEGER DEFAULT 0,
      prodi TEXT DEFAULT 'SI'
    );

    CREATE TABLE IF NOT EXISTS raising_users (
      phone TEXT PRIMARY KEY,
      nim TEXT DEFAULT '',
      password TEXT DEFAULT '',
      session_hash TEXT DEFAULT '',
      cookie TEXT DEFAULT '',
      id_mahasiswa TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS ai_chats (
      phone TEXT PRIMARY KEY,
      history TEXT DEFAULT '[]',
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS pengumuman (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tanggal TEXT NOT NULL,
      jam TEXT NOT NULL,
      deskripsi TEXT NOT NULL,
      prodi TEXT NOT NULL DEFAULT 'SI',
      created_by TEXT DEFAULT '',
      target_group_id TEXT DEFAULT '',
      sent INTEGER DEFAULT 0,
      sent_at TEXT DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
  `);
}

export function migratePengumumanColumns() {
  const cols = ['target_group_id', 'sent', 'sent_at'];
  for (const col of cols) {
    try {
      db.exec(`ALTER TABLE pengumuman ADD COLUMN ${col} ${col === 'sent' ? 'INTEGER DEFAULT 0' : col === 'sent_at' ? 'TEXT DEFAULT NULL' : 'TEXT DEFAULT ""'}`);
    } catch {}
  }
}

export function migrateFromJson() {
  const usersFile = path.resolve('db/users.json');
  if (fs.existsSync(usersFile)) {
    try {
      const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
      const stmt = db.prepare('INSERT OR IGNORE INTO users (phone) VALUES (?)');
      const insert = db.transaction((list) => {
        for (const u of list) stmt.run(String(u).replace(/[^0-9]/g, ''));
      });
      insert(users);
    } catch {}
  }

  const modsFile = path.resolve('db/moderators.json');
  if (fs.existsSync(modsFile)) {
    try {
      const mods = JSON.parse(fs.readFileSync(modsFile, 'utf8'));
      const stmt = db.prepare('INSERT OR IGNORE INTO moderators (phone, prodi, default_prodi, name, group_id, created_at) VALUES (?, ?, ?, ?, ?, ?)');
      const insert = db.transaction((data) => {
        for (const [num, mod] of Object.entries(data)) {
          const clean = String(num).replace(/[^0-9]/g, '');
          const prodi = (mod.prodi ?? 'SI').toUpperCase();
          const defProdi = prodi === 'ALL' ? (mod.defaultProdi ?? null) : null;
          stmt.run(clean, prodi, defProdi, mod.name ?? '', mod.groupId ?? '', mod.createdAt ?? new Date().toISOString());
        }
      });
      insert(mods);
    } catch {}
  }

  const tasksFile = path.resolve('db/tasks.json');
  if (fs.existsSync(tasksFile)) {
    try {
      const tasks = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
      const stmt = db.prepare('INSERT OR IGNORE INTO tasks (id, date, course, type, title, meeting, lecturer, has_task, task, link, deadline, note, created_at, has_document, prodi) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      const insert = db.transaction((list) => {
        for (const t of list) {
          stmt.run(t.id, t.date ?? '—', t.course ?? '—', t.type ?? '—', t.title ?? '—', t.meeting ?? '—', t.lecturer ?? '—', t.hasTask ? 1 : 0, t.task ?? 'Tidak ada tugas', t.link ?? '', t.deadline ?? '—', t.note ?? '', t.createdAt ?? new Date().toISOString(), t.hasDocument ? 1 : 0, t.prodi ?? 'SI');
        }
      });
      insert(tasks);
    } catch {}
  }

  const raisingFile = path.resolve('db/raising_users.json');
  if (fs.existsSync(raisingFile)) {
    try {
      const raising = JSON.parse(fs.readFileSync(raisingFile, 'utf8'));
      const stmt = db.prepare('INSERT OR IGNORE INTO raising_users (phone, nim, password, session_hash, cookie, id_mahasiswa) VALUES (?, ?, ?, ?, ?, ?)');
      const insert = db.transaction((data) => {
        for (const [num, r] of Object.entries(data)) {
          const clean = String(num).replace(/[^0-9]/g, '');
          stmt.run(clean, r.nim ?? '', r.password ?? '', r.sessionHash ?? '', r.cookie ?? '', r.idMahasiswa ?? '');
        }
      });
      insert(raising);
    } catch {}
  }
}

export default { getDb, initDb, migrateFromJson };
