const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const pad = (n) => String(n).padStart(2, '0');

export const dayName = (d) => DAYS[d.getDay()];

export const tanggalIndo = (d) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

const MONTH_MAP = {
  '1': 0, '01': 0, 'januari': 0, 'january': 0, 'jan': 0,
  '2': 1, '02': 1, 'februari': 1, 'pebruari': 1, 'february': 1, 'feb': 1,
  '3': 2, '03': 2, 'maret': 2, 'march': 2, 'mar': 2,
  '4': 3, '04': 3, 'april': 3, 'apr': 3,
  '5': 4, '05': 4, 'mei': 4, 'may': 4,
  '6': 5, '06': 5, 'juni': 5, 'june': 5, 'jun': 5,
  '7': 6, '07': 6, 'juli': 6, 'july': 6, 'jul': 6,
  '8': 7, '08': 7, 'agustus': 7, 'august': 7, 'ags': 7, 'agu': 7, 'aug': 7,
  '9': 8, '09': 8, 'september': 8, 'sep': 8, 'sept': 8,
  '10': 9, 'oktober': 9, 'october': 9, 'okt': 9, 'oct': 9,
  '11': 10, 'november': 10, 'nopember': 10, 'nov': 10,
  '12': 11, 'desember': 11, 'december': 11, 'des': 11, 'dec': 11
};

export const parseDateInput = (input) => {
  if (typeof input !== 'string') return null;
  const parts = input.trim().split(/[\s/-]+/);
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(year) || year < 1000 || year > 9999) return null;
  const cleanMonth = parts[1].toLowerCase();
  if (!(cleanMonth in MONTH_MAP)) return null;
  const month = MONTH_MAP[cleanMonth];
  const d = new Date(year, month, day);
  if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) return null;
  return d;
};

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
