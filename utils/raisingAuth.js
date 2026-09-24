import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://raising.almaata.ac.id';
const STORAGE_FILE = path.resolve('db/raising_users.json');
const UA = 'Mozilla/5.0';

const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');

export function loadRaisingUsers() {
  try {
    if (!fs.existsSync(STORAGE_FILE)) {
      fs.writeFileSync(STORAGE_FILE, JSON.stringify({}, null, 2));
      return {};
    }
    return JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

export function saveRaisingUsers(data) {
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));
}

async function extractIdMahasiswa(url, cookie) {
  try {
    const { data: html } = await axios.get(url, { headers: { Cookie: cookie, 'User-Agent': UA } });
    const m =
      html.match(/id_mahasiswa\s*=\s*['"]?(\d+)/i) ||
      html.match(/idmahasiswa\s*=\s*['"]?(\d+)/i);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

export async function loginAndGetSession(nim, password) {
  const page = await axios.get(BASE_URL, { headers: { 'User-Agent': UA } });
  const csrf = page.data.match(/csrf_test_name" value="([^"]+)"/)?.[1];
  if (!csrf) throw new Error('CSRF token tidak ditemukan');

  const initCookie = (page.headers['set-cookie'] || []).map((c) => c.split(';')[0]).join('; ');

  const res = await axios.post(
    `${BASE_URL}/auth/login`,
    new URLSearchParams({ f1: md5(nim), f2: md5(password), slogin: 'LOGIN', csrf_test_name: csrf }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: `${BASE_URL}/`,
        Cookie: initCookie,
        'User-Agent': UA
      },
      maxRedirects: 0,
      validateStatus: (s) => s === 200 || s === 303
    }
  );

  const location = res.headers.location;
  if (!location) throw new Error('Login gagal: NIM atau password salah');

  const sessionHash = location.match(/\/([a-f0-9]{40})\//)?.[1];
  if (!sessionHash) throw new Error('Session hash tidak ditemukan');

  const loginCookie = (res.headers['set-cookie'] || []).map((c) => c.split(';')[0]).join('; ');
  const cookie = [initCookie, loginCookie].filter(Boolean).join('; ');

  const dashUrl = location.startsWith('http') ? location : `${BASE_URL}${location.startsWith('/') ? '' : '/'}${location}`;
  const idMahasiswa = await extractIdMahasiswa(dashUrl, cookie);

  return { sessionHash, cookie, idMahasiswa };
}

export async function getStudentProfile(sessionHash, cookie, idMahasiswa, nim) {
  try {
    const id = idMahasiswa || nim;
    const { data } = await axios.get(`${BASE_URL}/${sessionHash}/api/akademik/get_data_verifikasi_ijazah?id_mahasiswa=${id}`, {
      headers: { Cookie: cookie, 'User-Agent': UA }
    });
    return data?.data ?? data ?? null;
  } catch {
    return null;
  }
}

export async function getDpaInfo(sessionHash, cookie) {
  try {
    const { data: html } = await axios.get(`${BASE_URL}/${sessionHash}/dashboard`, {
      headers: { Cookie: cookie, 'User-Agent': UA }
    });
    const m = html.match(/DPA:\s*([^<\n]+?)\s*-\s*([\d+\-\s]+)/i);
    return m ? { nama: m[1].trim(), kontak: m[2].trim() } : null;
  } catch {
    return null;
  }
}

export async function getValidSession(whatsappNumber) {
  const users = loadRaisingUsers();
  const user = users[whatsappNumber];
  if (!user) throw new Error('Nomor WhatsApp belum terdaftar di RAISING. Minta admin menambahkan akun Anda.');

  try {
    const { data } = await axios.get(`${BASE_URL}/${user.sessionHash}/api/perkuliahan/get_jadwal_kuliah_mahasiswa/${user.nim}`, {
      headers: { Cookie: user.cookie, 'User-Agent': UA },
      validateStatus: (s) => s === 200
    });
    if (data?.status === 'success') {
      const [profile, dpa] = await Promise.all([
        getStudentProfile(user.sessionHash, user.cookie, user.idMahasiswa, user.nim),
        getDpaInfo(user.sessionHash, user.cookie)
      ]);
      return { ...user, profile, dpa };
    }
  } catch {}

  const { sessionHash, cookie, idMahasiswa } = await loginAndGetSession(user.nim, user.password);
  const [profile, dpa] = await Promise.all([
    getStudentProfile(sessionHash, cookie, idMahasiswa, user.nim),
    getDpaInfo(sessionHash, cookie)
  ]);

  const updated = { ...user, sessionHash, cookie, idMahasiswa, profile, dpa };
  users[whatsappNumber] = updated;
  saveRaisingUsers(users);
  return updated;
}
