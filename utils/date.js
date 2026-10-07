const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const pad = (n) => String(n).padStart(2, '0');

export const dayName = (d) => DAYS[d.getDay()];

export const tanggalIndo = (d) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

export const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const keyOfDate = (iso) => dateKey(new Date(`${iso}T00:00:00`));

export const filterByDate = (list, date, when = 'hari ini') => {
  const want = when.toLowerCase();
  if (want === 'full') return list;

  if (['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'].includes(want)) {
    const targetDay = DAYS.indexOf(want.charAt(0).toUpperCase() + want.slice(1));
    return list.filter((j) => {
      const d = new Date(`${j.tanggal_pertemuan_presensi}T00:00:00`);
      return d.getDay() === targetDay;
    });
  }

  if (want === 'besok') {
    const tom = new Date(date);
    tom.setDate(tom.getDate() + 1);
    const key = dateKey(tom);
    return list.filter((j) => keyOfDate(j.tanggal_pertemuan_presensi) === key);
  }

  if (want === 'minggu ini') {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const startKey = dateKey(start);
    const endKey = dateKey(end);
    return list.filter((j) => {
      const k = keyOfDate(j.tanggal_pertemuan_presensi);
      return k >= startKey && k <= endKey;
    });
  }

  if (want === 'minggu depan') {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay() + 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const startKey = dateKey(start);
    const endKey = dateKey(end);
    return list.filter((j) => {
      const k = keyOfDate(j.tanggal_pertemuan_presensi);
      return k >= startKey && k <= endKey;
    });
  }

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

export const getWeekday = (d) => DAYS[d.getDay()];
