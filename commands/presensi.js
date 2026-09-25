import axios from 'axios';
import { getValidSession } from '../utils/raisingAuth.js';
import { senderNumber } from '../utils/sender.js';
import { filterByDate } from '../utils/date.js';
import { editOrSend } from '../utils/reply.js';

const BASE_URL = 'https://raising.almaata.ac.id';
const UA = 'Mozilla/5.0';

const isDone = (j) => j.status_presensi === '1' || j.id_absensi_mahasiswa;
const label = (s) => (s ? String(s).split(':')[0] : '-');

// Cek apakah status pertemuan sedang berlangsung
const isBerlangsung = (j) => {
  const status = String(j.status_pertemuan || '').toLowerCase();
  if (!status) return false;
  if (status.includes('belum') || status.includes('selesai')) return false;
  return status.includes('berlangsung') || status.includes('jalan') || status.includes('aktif') || status.includes('buka') || status.includes('mulai');
};

async function csrfPresensi(sessionHash, cookie) {
  const { data: html } = await axios.get(`${BASE_URL}/${sessionHash}/dashboard/perkuliahan/presensi`, {
    headers: { Cookie: cookie, 'User-Agent': UA }
  });
  const token = html.match(/csrf_test_name"\s+value="([^"]+)"/)?.[1];
  if (!token) throw new Error('CSRF presensi tidak ditemukan');
  return token;
}

export default {
  name: 'presensi',
  description: 'Presensi kuliah (presensi | presensi <kode> | presensi <id> <kode>)',
  type: 'main',
  async run({ sock, msg, args, prefix }) {
    const loadingMsg = await sock.sendMessage(msg.key.remoteJid, { text: 'Memproses...' }, { quoted: msg });

    try {
      const user = await getValidSession(senderNumber(msg));
      const { data } = await axios.get(`${BASE_URL}/${user.sessionHash}/api/perkuliahan/get_jadwal_kuliah_mahasiswa/${user.nim}`, {
        headers: { Cookie: user.cookie, 'User-Agent': UA }
      });
      if (data.status !== 'success') throw new Error('Gagal ambil jadwal');
      const all = (data.data || []).sort((a, b) => a.jam_awal.localeCompare(b.jam_awal));
      const today = filterByDate(all, new Date());

      if (!args.length) {
        if (!today.length) return editOrSend(sock, msg, loadingMsg, 'Tidak ada jadwal hari ini.');
        let text = 'PRESENSI HARI INI\n';
        for (const j of today) {
          text += `${j.nama_matakuliah} (Ke-${j.pertemuan_ke})\n`;
          text += `ID: ${j.id_pertemuan_presensi} | ${j.jam_awal.slice(0, 5)}-${j.jam_akhir.slice(0, 5)}\n`;
          text += `Status: ${isDone(j) ? 'Sudah' : 'Belum'} | ${label(j.status_pertemuan)}\n\n`;
        }
        text += `Kirim: ${prefix}presensi <kode>`;
        return editOrSend(sock, msg, loadingMsg, text.trimEnd());
      }

      let idPertemuan;
      let kode;

      if (args.length === 1) {
        [kode] = args;
        const kandidat = today.filter((j) => !isDone(j) && isBerlangsung(j));

        if (kandidat.length === 0) {
          let text = 'Tidak ada sesi sedang berlangsung hari ini.\n';
          const belum = today.filter((j) => !isDone(j));
          if (belum.length) {
            text += 'Belum presensi:\n';
            for (const j of belum) text += `- ${j.nama_matakuliah} (ID: ${j.id_pertemuan_presensi}) [${label(j.status_pertemuan)}]\n`;
            text += `\nGunakan: ${prefix}presensi <id> <kode> jika perlu`;
          }
          return editOrSend(sock, msg, loadingMsg, text.trimEnd());
        }

        if (kandidat.length !== 1) {
          let text = `Ada ${kandidat.length} sesi sedang berlangsung:\n`;
          for (const j of kandidat) {
            text += `- ${j.nama_matakuliah} (ID: ${j.id_pertemuan_presensi}) [${label(j.status_pertemuan)}]\n`;
          }
          return editOrSend(sock, msg, loadingMsg, `${text}\nGunakan: ${prefix}presensi <id> <kode>`.trimEnd());
        }
        idPertemuan = kandidat[0].id_pertemuan_presensi;
      } else {
        [idPertemuan, kode] = args;
      }

      if (!idPertemuan || !kode) return editOrSend(sock, msg, loadingMsg, `Format: ${prefix}presensi <kode> atau ${prefix}presensi <id_pertemuan> <kode>`);

      const target = all.find((j) => String(j.id_pertemuan_presensi) === String(idPertemuan));
      if (target && isDone(target)) {
        return editOrSend(sock, msg, loadingMsg, `Sudah presensi untuk ${target.nama_matakuliah} (Ke-${target.pertemuan_ke}).`);
      }

      const csrf = await csrfPresensi(user.sessionHash, user.cookie);
      const form = new FormData();
      form.append('id_mahasiswa', String(user.idMahasiswa || user.profile?.id_mahasiswa || user.nim));
      form.append('kode_presensi', String(kode));
      form.append('csrf_test_name', csrf);

      const submit = await axios.post(
        `${BASE_URL}/${user.sessionHash}/api/perkuliahan/create_presensi_mahasiswa_by_kode/${idPertemuan}`,
        form,
        {
          headers: { Cookie: user.cookie, 'User-Agent': UA, Referer: `${BASE_URL}/${user.sessionHash}/dashboard/perkuliahan/presensi` },
          validateStatus: (s) => s === 200
        }
      );

      if (submit.data?.status !== 'success') throw new Error(submit.data?.message || 'Kode salah / pertemuan belum dibuka');
      const nama = target ? `${target.nama_matakuliah} (Ke-${target.pertemuan_ke})` : `ID ${idPertemuan}`;
      return editOrSend(sock, msg, loadingMsg, `Presensi berhasil: ${nama}\n${submit.data.message || ''}`.trim());
    } catch (err) {
      const detail = err?.response?.data?.message || err.message;
      return editOrSend(sock, msg, loadingMsg, `Gagal presensi: ${detail}`);
    }
  }
};