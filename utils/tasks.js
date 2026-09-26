import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve('db/tasks.json');

const DATE_PATTERN = /\*?(\d{1,2}\s+[A-Za-z]+\s+\d{4})\*?/;
const COURSE_PATTERN = /Course:\s*(.*)/i;
const TYPE_PATTERN = /Type:\s*_?(.*?)_?$/m;
const TITLE_PATTERN = /Judul:\s*`?([^`\n]+)`?\s*(?:\(\s*\*?([^*)\n]+)\*?\s*\))?/i;
const LECTURER_PATTERN = /Pengampu:\s*(.*)/i;
const NOTE_PATTERN = /P\.S:\s*(.*)/i;
const TASK_BLOCK_PATTERN = /Tugas:\s*([\s\S]*?)(?:Deadline:|$)/i;
const DEADLINE_PATTERN = /Deadline:\s*\*?([^*\n]+)\*?/i;
const URL_PATTERN = /(https?:\/\/[^\s]+)/gi;

function ensureDbFile() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2));
  }
}

function cleanTaskLines(rawText) {
  return rawText
    .split('\n')
    .map((line) => line.replace(/^>\s*/, '').trim())
    .filter((line) => line && !line.startsWith('http://') && !line.startsWith('https://') && !line.startsWith('Link:'))
    .join(' ');
}

function extractLink(rawTask, fullText) {
  const taskLinks = rawTask.match(URL_PATTERN);
  if (taskLinks) return taskLinks[0];
  const fullTextLinks = fullText.match(URL_PATTERN);
  return fullTextLinks ? fullTextLinks[0] : null;
}

function generateNextId(tasks) {
  const numericIds = tasks.map((item) => Number(item.id)).filter(Boolean);
  const maxId = numericIds.length ? Math.max(...numericIds) : 0;
  return String(maxId + 1);
}

export function loadTasks() {
  try {
    ensureDbFile();
    const tasks = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    let requiresSave = false;

    tasks.forEach((item, index) => {
      if (!item.id || isNaN(Number(item.id))) {
        item.id = String(index + 1);
        requiresSave = true;
      }
    });

    if (requiresSave) {
      saveTasks(tasks);
    }

    return tasks;
  } catch {
    return [];
  }
}

export function saveTasks(tasks) {
  fs.writeFileSync(DB_PATH, JSON.stringify(tasks, null, 2));
}

export function parseReport(text) {
  if (typeof text !== 'string') return null;

  const isReport = COURSE_PATTERN.test(text) && TITLE_PATTERN.test(text) && TASK_BLOCK_PATTERN.test(text);
  if (!isReport) return null;

  const dateMatch = text.match(DATE_PATTERN);
  const courseMatch = text.match(COURSE_PATTERN);
  const typeMatch = text.match(TYPE_PATTERN);
  const titleMatch = text.match(TITLE_PATTERN);
  const lecturerMatch = text.match(LECTURER_PATTERN);
  const noteMatch = text.match(NOTE_PATTERN);
  const deadlineMatch = text.match(DEADLINE_PATTERN);
  const taskBlockMatch = text.match(TASK_BLOCK_PATTERN);

  const rawTaskText = taskBlockMatch ? taskBlockMatch[1].trim() : '';
  const taskDescription = cleanTaskLines(rawTaskText);
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
    link: extractLink(rawTaskText, text),
    deadline: deadlineMatch ? deadlineMatch[1].trim() : '—',
    note: noteMatch ? noteMatch[1].trim() : '',
    createdAt: new Date().toISOString()
  };
}

export function addTaskFromReport(text, hasDoc = false) {
  const parsed = parseReport(text);
  if (!parsed || !parsed.hasTask) return null;

  parsed.hasDocument = hasDoc;
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
