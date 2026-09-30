import { getDb } from './db.js';

const db = getDb();

function generateNextId(tasks) {
  const numericIds = tasks.map((item) => Number(item.id)).filter(Boolean);
  const maxId = numericIds.length ? Math.max(...numericIds) : 0;
  return String(maxId + 1);
}

function parseReport(text) {
  if (typeof text !== 'string') return null;

  const isReport = /Course:/i.test(text) && /Judul:/i.test(text) && /Tugas:/i.test(text);
  if (!isReport) return null;

  const dateMatch = text.match(/\*?(\d{1,2}\s+[A-Za-z]+\s+\d{4})\*?/);
  const courseMatch = text.match(/Course:\s*(.*)/i);
  const typeMatch = text.match(/Type:\s*_?(.*?)_?$/m);
  const titleMatch = text.match(/Judul:\s*`?([^`\n]+)`?\s*(?:\(\s*\*?([^*)\n]+)\*?\s*\))?/i);
  const lecturerMatch = text.match(/Pengampu:\s*(.*)/i);
  const noteMatch = text.match(/P\.S:\s*(.*)/i);
  const deadlineMatch = text.match(/Deadline:\s*\*?([^*\n]+)\*?/i);
  const taskBlockMatch = text.match(/Tugas:\s*([\s\S]*?)(?:Deadline:|$)/i);

  const rawTaskText = taskBlockMatch ? taskBlockMatch[1].trim() : '';
  const taskDescription = rawTaskText.split('\n').map((line) => line.replace(/^>\s*/, '').trim()).filter((line) => line && !line.startsWith('http://') && !line.startsWith('https://')).join(' ');
  const hasTask = Boolean(taskDescription && taskDescription !== '—' && !taskDescription.toLowerCase().includes('belum ada'));

  return {
    id: '',
    date: dateMatch ? dateMatch[1].trim() : '—',
    course: courseMatch ? courseMatch[1].trim() : '—',
    type: typeMatch ? typeMatch[1].trim() : '—',
    title: titleMatch ? titleMatch[1].trim() : '—',
    meeting: titleMatch && titleMatch[2] ? titleMatch[2].trim() : '—',
    lecturer: lecturerMatch ? lecturerMatch[1].trim() : '—',
    hasTask,
    task: hasTask ? taskDescription : 'Tidak ada tugas',
    link: null,
    deadline: deadlineMatch ? deadlineMatch[1].trim() : '—',
    note: noteMatch ? noteMatch[1].trim() : '',
    hasDocument: false,
    prodi: null
  };
}

export function loadTasks() {
  return db.prepare('SELECT * FROM tasks').all();
}

export function saveTasks(tasks) {
  const insert = db.transaction((list) => {
    db.prepare('DELETE FROM tasks').run();
    const stmt = db.prepare('INSERT INTO tasks (id, date, course, type, title, meeting, lecturer, has_task, task, link, deadline, note, created_at, has_document, prodi) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const t of list) {
      stmt.run(t.id, t.date ?? '—', t.course ?? '—', t.type ?? '—', t.title ?? '—', t.meeting ?? '—', t.lecturer ?? '—', t.hasTask ? 1 : 0, t.task ?? 'Tidak ada tugas', t.link ?? '', t.deadline ?? '—', t.note ?? '', t.createdAt ?? new Date().toISOString(), t.hasDocument ? 1 : 0, t.prodi ?? 'SI');
    }
  });
  insert(tasks);
}

export function parseAndAdd(text, hasDoc = false, prodi = null) {
  const parsed = parseReport(text);
  if (!parsed || !parsed.hasTask) return null;

  parsed.hasDocument = hasDoc;
  parsed.prodi = prodi;
  const tasks = loadTasks();

  const existingIndex = tasks.findIndex(
    (item) => item.course.toLowerCase() === parsed.course.toLowerCase() && item.title.toLowerCase() === parsed.title.toLowerCase()
  );

  if (existingIndex !== -1) {
    tasks[existingIndex] = { ...tasks[existingIndex], ...parsed, id: tasks[existingIndex].id };
  } else {
    parsed.id = generateNextId(tasks);
    tasks.push(parsed);
  }

  saveTasks(tasks);
  return parsed;
}

export function addTaskFromReport(text, hasDoc = false, prodi = null) {
  return parseAndAdd(text, hasDoc, prodi);
}