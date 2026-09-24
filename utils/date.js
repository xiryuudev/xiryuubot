const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const pad = (n) => String(n).padStart(2, '0');

export const dayName = (d) => DAYS[d.getDay()];

export const tanggalIndo = (d) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

export const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const keyOfDate = (iso) => dateKey(new Date(`${iso}T00:00:00`));

export const filterByDate = (list, date) => {
  const key = dateKey(date);
  return list.filter((j) => keyOfDate(j.tanggal_pertemuan_presensi) === key);
};

const chatFmt = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hour12: false
});

const nowFmt = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
  hour12: false
});

export const formatChatTime = (ts) => `${chatFmt.format(new Date(Number(ts) * 1000))} WIB`;

export const formatNow = () => nowFmt.format(new Date());
