import { execFile } from 'child_process';

const SEARCH_URL = 'https://html.duckduckgo.com/html/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

const stripTags = (s) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

export async function webSearch(query) {
  const res = await fetch(SEARCH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
    body: new URLSearchParams({ q: query }).toString()
  });
  if (!res.ok) return `Search failed: HTTP ${res.status}`;
  const html = await res.text();
  const titles = [...html.matchAll(/class="result__a"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => stripTags(m[1]));
  const snippets = [...html.matchAll(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => stripTags(m[1]));
  if (!titles.length) return `No results for: ${query}`;
  return titles.slice(0, 6).map((t, i) => `${i + 1}. ${t}\n${snippets[i] || ''}`).join('\n\n');
}

export function runCode(code) {
  return new Promise((resolve) => {
    execFile('node', ['-e', code], { timeout: 10000, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      if (err && !stdout) resolve(stderr?.trim() || err.message);
      else resolve((stdout || '(no output)').trim());
    });
  });
}
