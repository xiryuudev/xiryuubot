import { getPendingPengumuman, markPengumumanSent } from './pengumuman.js';
import { getModerator } from './moderators.js';

const WIB_OFFSET_MS = 7 * 3600 * 1000;
const LEAD_MS = 30 * 60 * 1000;

function parseWIB(tanggal, jam) {
  const [d, m, y] = tanggal.split('/').map(Number);
  const [H, M] = jam.split(':').map(Number);
  if (!d || !m || !y || Number.isNaN(H) || Number.isNaN(M)) return null;
  return Date.UTC(y, m - 1, d, H, M) - WIB_OFFSET_MS;
}

function resolveGroup(pengumuman) {
  const gid = pengumuman.target_group_id || getModerator(pengumuman.created_by)?.groupId || '';
  return gid && gid.endsWith('@g.us') ? gid : '';
}

async function sendPengumuman(sock, pengumuman) {
  const groupId = resolveGroup(pengumuman);
  if (!groupId) {
    console.warn(`[pengumuman-scheduler] ID ${pengumuman.id}: grup target tidak valid (${pengumuman.target_group_id || getModerator(pengumuman.created_by)?.groupId})`);
    return;
  }

  let mentions = [];
  try {
    const meta = await sock.groupMetadata(groupId);
    mentions = (meta.participants || []).map(p => p.id).filter(Boolean);
  } catch (err) {
    console.warn(`[pengumuman-scheduler] gagal ambil metadata grup ${groupId}:`, err.message);
  }

  const text = `📢 *PENGUMUMAN - 30 MENIT LAGI*\n` +
    `📅 Tanggal: ${pengumuman.tanggal}\n` +
    `⏰ Jam: ${pengumuman.jam} WIB\n` +
    `🎓 Prodi: ${pengumuman.prodi}\n` +
    `📝 ${pengumuman.deskripsi}\n\n` +
    `@all`;

  await sock.sendMessage(groupId, { text, mentions });
}

let timer = null;

export function stopPengumumanScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

export function startPengumumanScheduler(sock) {
  stopPengumumanScheduler();

  const tick = async () => {
    try {
      const now = Date.now();
      const pending = getPendingPengumuman();

      for (const p of pending) {
        const eventMs = parseWIB(p.tanggal, p.jam);
        if (eventMs == null) {
          markPengumumanSent(p.id);
          continue;
        }

        const reminderMs = eventMs - LEAD_MS;
        if (now < reminderMs - 90 * 1000) continue;
        if (now > reminderMs + 90 * 1000) {
          markPengumumanSent(p.id);
          continue;
        }

        await sendPengumuman(sock, p);
        markPengumumanSent(p.id);
      }
    } catch (err) {
      console.error('[pengumuman-scheduler] error:', err);
    }
  };

  timer = setInterval(tick, 60 * 1000);
  tick();
}