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

  return `*[ ${ruang}, ${time} ]*
   - Prodi: ${prodiName}
   - Nama Dosen: ${dosen}
   - Nama Matkul: ${j.nama_matakuliah}
   - Judul: ${j.judul || keterangan}
   - Keterangan: ${keterangan}
   - Pertemuan: Ke-${j.pertemuan_ke}
   - Kode Matkul: ${kodeMatkul}
   - Kode Pertemuan: ${kodePertemuan}
   - Status Presensi: ${presensiLabel(j)}`;
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

export default {
  name: 'jadwal',
  description: 'Lihat jadwal kuliah (hari ini / besok / minggu ini / minggu depan / full / senin-sabtu)',
  type: 'main',
  visibility: 'mahasiswa',
  async run({ sock, msg, args, prefix }) {
    if (args[0]?.toLowerCase() === 'help') {
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '⏳', key: msg.key } });
      const helpText = `📅 *Command: .jadwal*
Fungsi: Lihat jadwal kuliah dari RAISING.

Cara pakai:
- \`.jadwal hari ini\` — Jadwal hari ini
- \`.jadwal besok\` — Jadwal besok
- \`.jadwal minggu ini\` — Jadwal minggu ini
- \`.jadwal minggu depan\` — Jadwal minggu depan
- \`.jadwal full\` — Semua jadwal (tergrup per hari)
- \`.jadwal <hari>\` — Jadwal hari tertentu (senin, selasa, rabu, kamis, jumat, sabtu, minggu)

Contoh: \`.jadwal hari ini\`, \`.jadwal full\`, \`.jadwal rabu\``;
      await sock.sendMessage(msg.key.remoteJid, { text: helpText }, { quoted: msg });
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '✅', key: msg.key } });
      return;
    }

    await sock.sendMessage(msg.key.remoteJid, { react: { text: '⏳', key: msg.key } });

    const when = (args[0] || 'hari ini').toLowerCase();
    const valid = ['hari ini', 'besok', 'minggu ini', 'minggu depan', 'full', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'];
    if (!valid.includes(when)) {
      await editOrSend(sock, msg, `Pilihan: hari ini, besok, minggu ini, minggu depan, full, atau nama hari (senin-sabtu)`);
      return;
    }

    try {
      const user = await getValidSession(senderNumber(msg));
      const { data } = await axios.get(`${BASE_URL}/${user.sessionHash}/api/perkuliahan/get_jadwal_kuliah_mahasiswa/${user.nim}`, {
        headers: { Cookie: user.cookie, 'User-Agent': UA }
      });
      if (data.status !== 'success') throw new Error('Gagal ambil jadwal');

      const all = (data.data || []).sort((a, b) => a.jam_awal.localeCompare(b.jam_akhir));
      const list = filterByDate(all, new Date(), when);

      if (!list.length) {
        await editOrSend(sock, msg, `Tidak ada jadwal untuk: ${when}`);
        return;
      }

      let text;
      if (when === 'full' || when === 'minggu ini' || when === 'minggu depan') {
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