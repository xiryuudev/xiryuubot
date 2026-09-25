import axios from 'axios';
import { getValidSession } from '../utils/raisingAuth.js';
import { senderNumber } from '../utils/sender.js';
import { dayName, tanggalIndo, keyOfDate, filterByDate } from '../utils/date.js';
import { editOrSend } from '../utils/reply.js';
import config from '../config.js';

const BASE_URL = config.RAISING_BASE_URL;

function filterByDayName(list, target) {
  if (!target) return list;
  const want = target.toLowerCase();
  return list.filter((j) => dayName(new Date(`${j.tanggal_pertemuan_presensi}T00:00:00`)).toLowerCase() === want);
}

function formatJadwal(list, profile, dpa) {
  if (!list?.length) return 'Jadwal Kuliah\n\nTidak ada jadwal.';

  const grouped = {};
  for (const j of list) {
    const key = keyOfDate(j.tanggal_pertemuan_presensi);
    (grouped[key] ??= []).push(j);
  }

  let text = '👤 *DATA MAHASISWA*\n';
  text += `- Nama: ${profile?.nama || '-'}\n`;
  text += `- DPA: ${dpa?.nama || '-'}\n`;
  text += `- Kontak DPA: ${dpa?.kontak || '-'}\n\n`;
  text += '━━━━━━━━━━━━━━━━━━━━━━\n\n';

  for (const key of Object.keys(grouped).sort()) {
    const d = new Date(`${key}T00:00:00`);
    text += `🗓️ *${dayName(d)}, ${tanggalIndo(d)}*\n`;
    grouped[key].sort((a, b) => a.jam_awal.localeCompare(b.jam_awal));
    for (const j of grouped[key]) {
      const tipe = j.tipe_pertemuan_presensi === 'T' ? 'Teori' : j.tipe_pertemuan_presensi === 'P' ? 'Praktikum' : j.tipe_pertemuan_presensi;
      text += `*[ ${j.nama_ruang} (${tipe}), ${j.jam_awal.slice(0, 5)} - ${j.jam_akhir.slice(0, 5)} ]*\n`;
      text += `   - Prodi: ${j.prodi || profile?.nama_prodi || '-'}\n`;
      text += `   - Nama Dosen: ${j.nama_dosen_pengampu_koordinator}\n`;
      text += `   - Nama Matkul: ${j.nama_matakuliah}\n`;
      text += `   - Judul: ${j.judul?.trim() || '-'}\n`;
      text += `   - Keterangan: ${j.keterangan || '-'}\n`;
      text += `   - Pertemuan: Ke-${j.pertemuan_ke}\n`;
      text += `   - Kode Matkul: ${j.kode_nama_matakuliah?.split(' - ')[0] || '-'}\n`;
      text += `   - Kode Pertemuan: ${j.id_pertemuan_presensi}\n`;
      text += `   - Status Presensi: ${j.status_presensi === '1' ? '✅' : '❌'}\n\n`;
    }
  }
  return text.trimEnd();
}

export default {
  name: 'jadwal',
  description: 'Lihat jadwal kuliah (jadwal | jadwal besok | jadwal <hari> | jadwal full)',
  type: 'main',
  async run({ sock, msg, args }) {
    const arg = args[0]?.toLowerCase();
    const loadingMsg = await sock.sendMessage(msg.key.remoteJid, { text: 'Mengambil jadwal...' }, { quoted: msg });

    try {
      const user = await getValidSession(senderNumber(msg));
      const { data } = await axios.get(`${BASE_URL}/${user.sessionHash}/api/perkuliahan/get_jadwal_kuliah_mahasiswa/${user.nim}`, {
        headers: { Cookie: user.cookie, 'User-Agent': 'Mozilla/5.0' }
      });
      if (data.status !== 'success') throw new Error('Gagal ambil jadwal');

      let list = data.data || [];
      if (!arg) {
        list = filterByDate(list, new Date());
      } else if (arg === 'besok') {
        const tom = new Date();
        tom.setDate(tom.getDate() + 1);
        list = filterByDate(list, tom);
      } else if (arg !== 'full') {
        list = filterByDayName(list, arg);
      }

      await editOrSend(sock, msg, loadingMsg, formatJadwal(list, user.profile, user.dpa));
    } catch (err) {
      await editOrSend(sock, msg, loadingMsg, `Gagal: ${err.message}`);
    }
  }
};
