import axios from 'axios';
import { getValidSession } from '../utils/raisingAuth.js';
import { senderNumber } from '../utils/sender.js';
import { filterByDate, tanggalIndo, dayName, keyOfDate } from '../utils/date.js';
import { editOrSend } from '../utils/reply.js';
import config from '../config.js';

const BASE_URL = config.RAISING_BASE_URL;
const UA = config.UA;

const label = (s) => (s ? String(s).split(':')[0] : '-');
const isDone = (j) => j.status_presensi === '1' || j.id_absensi_mahasiswa;
const presensiLabel = (j) => isDone(j) ? '✅' : '❌';

function formatClassBlock(j, index, prodi) {
  const time = `${j.jam_awal.slice(0, 5)} - ${j.jam_akhir.slice(0, 5)}`;
  const ruang = j.ruang || j.ruangan || j.nama_ruang || j.kelas || '-';
  const dosen = j.nama_dosen_pengampu_koordinator || j.nama_dosen || '-';
  const keterangan = j.keterangan || '-';
  const kodeMatkul = (j.kode_nama_matakuliah || '').split(' - ')[0] || j.kode_matakuliah || j.kode_mk || '-';
  const kodePertemuan = j.id_pertemuan_presensi || '-';
  const prodiName = j.prodi || prodi || 'SISTEM INFORMASI';

  const jenis = j.tipe_pertemuan_presensi === 'P' ? 'Praktikum' : 'Teori';

  return `** [ ${ruang}, ${jenis}, ${time} ] **\n   - Prodi: ${prodiName}\n   - Nama Dosen: ${dosen}\n   - Nama Matkul: ${j.nama_matakuliah}\n   - Judul: ${j.judul || keterangan}\n   - Keterangan: ${keterangan}\n   - Pertemuan: Ke-${j.pertemuan_ke}\n   - Kode Matkul: ${kodeMatkul}\n   - Kode Pertemuan: ${kodePertemuan}\n   - Status Presensi: ${presensiLabel(j)}`;
}

function formatFullJadwal(list, profile, dpa) {
  if (!list?.length) return 'Jadwal Kuliah\n\nTidak ada jadwal.';

  const grouped = {};
  for (const j of list) {
    const key = keyOfDate(j.tanggal_pertemuan_presensi);
    (grouped[key] ??= []).push(j);
  }

  let text = '👤 *DATA MAHASISWA*\n';
  text += `- Nama: ${profile?.nama_mahasiswa || '-'}\n`;
  text += `- DPA: ${dpa?.nama || '-'}\n`;
  text += `- Kontak DPA: ${dpa?.kontak || '-'}\n\n`;
  text += '━━━━━━━━━━━━━━━━━━━━━━\n\n';

  for (const key of Object.keys(grouped).sort()) {
    const d = new Date(`${key}T00:00:00`);
    text += `🗓️ *${dayName(d)}, ${tanggalIndo(d)}*\n`;
    grouped[key].sort((a, b) => a.jam_awal.localeCompare(b.jam_awal));
    for (const j of grouped[key]) {
      text += formatClassBlock(j, 0, profile?.nama_prodi || 'SISTEM INFORMASI');
      text += '\n\n';
    }
  }
  return text.trimEnd();
}

function formatExamBlock(u, prodi) {
  const kode = (u.nama_matakuliah || '').split(' - ')[0] || '-';
  const matkul = (u.nama_matakuliah || '').split(' - ').slice(1).join(' - ') || '-';
  const time = u.waktu_ujian || '-';
  const ruang = u.nama_ruang || '-';
  const jenis = u.jenis_ujian || '-';
  const tipe = u.tipe_ujian || '-';

  return `📝 *[ ${ruang} ]* ${jenis} (${tipe})\n   - Waktu: ${time}\n   - Prodi: ${prodi || 'SISTEM INFORMASI'}\n   - Matkul: ${matkul}\n   - Kode Matkul: ${kode}`;
}

function formatFullUjian(list, profile) {
  if (!list?.length) return '📝 *Jadwal Ujian*\n\nTidak ada jadwal ujian.';

  const grouped = {};
  for (const u of list) {
    const key = keyOfDate(u.tanggal_ujian);
    (grouped[key] ??= []).push(u);
  }

  let text = '👤 *DATA MAHASISWA*\n';
  text += `- Nama: ${profile?.nama_mahasiswa || '-'}\n\n`;
  text += '━━━━━━━━━━━━━━━━━━━━━━\n\n';

  for (const key of Object.keys(grouped).sort()) {
    const d = new Date(`${key}T00:00:00`);
    text += `📝 *${dayName(d)}, ${tanggalIndo(d)}*\n\n`;
    grouped[key].sort((a, b) => (a.waktu_ujian || '').localeCompare(b.waktu_ujian || ''));
    for (const u of grouped[key]) {
      text += formatExamBlock(u, profile?.nama_prodi);
      text += '\n\n';
    }
  }
  return text.trimEnd();
}

export default {
  name: 'jadwal',
  description: 'Lihat jadwal kuliah (hari ini / besok / minggu ini / minggu depan / full / senin-sabtu)',
  type: 'main',
  visibility: 'mahasiswa',
  async run({ sock, msg, args, prefix }) {
    if (args[0]?.toLowerCase() === 'help') {
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '⏳', key: msg.key } });
      const helpText = `📅 *Command: .jadwal*

Cara pakai:
- \`.jadwal hari ini\` — Jadwal kuliah hari ini
- \`.jadwal besok\` — Jadwal kuliah besok
- \`.jadwal minggu ini\` — Jadwal kuliah minggu ini
- \`.jadwal minggu depan\` — Jadwal kuliah minggu depan
- \`.jadwal full\` — Semua jadwal kuliah (tergrup per hari)
- \`.jadwal <hari>\` — Jadwal kuliah hari tertentu (senin, selasa, rabu, kamis, jumat, sabtu, minggu)

📝 *Jadwal Ujian*
- \`.jadwal ujian hari ini\` — Ujian hari ini
- \`.jadwal ujian besok\` — Ujian besok
- \`.jadwal ujian full\` — Semua jadwal ujian

Contoh: \`.jadwal hari ini\`, \`.jadwal full\`, \`.jadwal rabu\`, \`.jadwal ujian hari ini\``;
      await sock.sendMessage(msg.key.remoteJid, { text: helpText }, { quoted: msg });
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '✅', key: msg.key } });
      return;
    }

    await sock.sendMessage(msg.key.remoteJid, { react: { text: '⏳', key: msg.key } });

    const rawArg = (args[0] || 'hari ini').toLowerCase();
    const mode = rawArg === 'ujian' ? 'ujian' : rawArg;
    const modeArg = rawArg === 'ujian' ? (args[1] || 'hari ini').toLowerCase() : rawArg;
    const valid = ['hari ini', 'besok', 'minggu ini', 'minggu depan', 'full', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'];
    if (mode === 'ujian') {
      if (!['hari ini', 'besok', 'full'].includes(modeArg)) {
        await editOrSend(sock, msg, 'Pilihan jadwal ujian: hari ini, besok, atau full');
        return;
      }
    } else if (!valid.includes(mode)) {
      await editOrSend(sock, msg, `Pilihan: hari ini, besok, minggu ini, minggu depan, full, atau nama hari (senin-sabtu)`);
      return;
    }

    try {
      const sender = msg.key.fromMe ? ADMIN_NUMBER_CLEAN : senderNumber(msg);
      const user = await getValidSession(sender);

      let list;
      if (mode === 'ujian') {
        const { data } = await axios.get(
          `${BASE_URL}/${user.sessionHash}/api/perkuliahan/get_jadwal_ujian_mahasiswa/${user.nim}`,
          { headers: { Cookie: user.cookie, 'User-Agent': UA, 'X-Requested-With': 'XMLHttpRequest' } }
        );
        if (data.status !== 'success') throw new Error('Gagal ambil jadwal ujian');
        const all = (data.data || []).sort((a, b) => (a.waktu_ujian || '').localeCompare(b.waktu_ujian || ''));
        list = filterByDate(all, new Date(), modeArg, 'tanggal_ujian');
      } else {
        const { data } = await axios.get(`${BASE_URL}/${user.sessionHash}/api/perkuliahan/get_jadwal_kuliah_mahasiswa/${user.nim}`, {
          headers: { Cookie: user.cookie, 'User-Agent': UA, 'X-Requested-With': 'XMLHttpRequest' }
        });
        if (data.status !== 'success') throw new Error('Gagal ambil jadwal');
        const all = (data.data || []).sort((a, b) => a.jam_awal.localeCompare(b.jam_akhir));
        list = filterByDate(all, new Date(), mode);
      }

      if (!list.length) {
        await editOrSend(sock, msg, `Tidak ada jadwal untuk: ${mode === 'ujian' ? 'ujian ' + modeArg : mode}`);
        return;
      }

      let text;
      if (mode === 'ujian') {
        if (modeArg === 'full') {
          text = formatFullUjian(list, user.profile);
        } else {
          const first = list[0];
          const dateStr = first.tanggal_ujian;
          const fullDate = `${dayName(new Date(dateStr + 'T00:00:00'))}, ${tanggalIndo(new Date(dateStr + 'T00:00:00'))}`;
          text = `👤 *DATA MAHASISWA*\n- Nama: ${user.profile?.nama_mahasiswa || '-'}\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n📝 *${fullDate}*\n\n`;
          const prodi = user.profile?.nama_prodi || 'SISTEM INFORMASI';
          for (let i = 0; i < list.length; i++) {
            text += formatExamBlock(list[i], prodi);
            if (i < list.length - 1) text += '\n\n';
          }
        }
      } else if (mode === 'full' || mode === 'minggu ini' || mode === 'minggu depan' || ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'].includes(mode)) {
        text = formatFullJadwal(list, user.profile, user.dpa);
      } else {
        text = `👤 *DATA MAHASISWA*\n`;
        if (user.profile) {
          text += `- Nama: ${user.profile.nama_mahasiswa || '-'}\n`;
        }
        if (user.dpa) {
          text += `- DPA: ${user.dpa.nama}\n`;
          text += `- Kontak DPA: ${user.dpa.kontak}\n`;
        }
        text += `\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        const firstItem = list[0];
        const dateStr = firstItem.tanggal_pertemuan_presensi || firstItem.tanggal;
        const fullDate = `${dayName(new Date(dateStr + 'T00:00:00'))}, ${tanggalIndo(new Date(dateStr + 'T00:00:00'))}`;
        text += `🗓️ *${fullDate}*\n\n`;

        const prodi = user.profile?.nama_prodi || 'SISTEM INFORMASI';
        for (let i = 0; i < list.length; i++) {
          text += formatClassBlock(list[i], i, prodi);
          if (i < list.length - 1) text += '\n\n';
        }
      }

      await editOrSend(sock, msg, text.trimEnd());
    } catch (err) {
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
      await editOrSend(sock, msg, `Gagal ambil jadwal: ${err.message}`);
    }
  }
};