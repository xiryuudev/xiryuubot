import axios from 'axios';
import { getValidSession } from '../utils/raisingAuth.js';
import { senderNumber } from '../utils/sender.js';
import { editOrSend } from '../utils/reply.js';
import config from '../config.js';

/**
 * Parse the tagihan HTML string (which is a snippet of table rows) into an array of rows.
 * Each row is an array of cell strings (text content of each td).
 * @param {string} html - The HTML string (already unescaped of \\n and \\t)
 * @returns {Array<Array<string>>} Array of rows, each row is array of cell texts.
 */
function parseTagihanHtml(html) {
  // Split by <tr> to get segments. The first segment might be empty if the string starts with <tr>
  const trSegments = html.split(/<tr>/i);
  const rows = [];
  for (let i = 0; i < trSegments.length; i++) {
    let segment = trSegments[i];
    // Find the first </tr> in the segment
    const endTrIndex = segment.indexOf('</tr>');
    if (endTrIndex === -1) {
      // No closing tr in this segment, skip
      continue;
    }
    // Take the part from start to the closing tr
    const rowString = segment.substring(0, endTrIndex);
    // Now extract all td contents from rowString
    // We'll match <td[^>]*>([\s\S]*?)<\/td>
    const tdMatches = rowString.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
    if (!tdMatches || tdMatches.length === 0) {
      continue;
    }
    const cells = [];
    for (const match of tdMatches) {
      // Extract the content between > and <
      const contentMatch = match.match(/<td[^>]*>([\s\S]*?)<\/td>/i);
      if (contentMatch && contentMatch[1]) {
        // Remove any HTML tags inside the cell (like <span>, <u>, etc.) and trim
        let cellText = contentMatch[1]
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/\s+/g, ' ')   // Collapse whitespace
          .trim();
        cells.push(cellText);
      }
    }
    if (cells.length > 0) {
      rows.push(cells);
    }
  }
  return rows;
}

export default {
  name: 'tagihan',
  description: 'Lihat tagihan kuliah dari RAISING',
  type: 'main',
  visibility: 'mahasiswa',
  async run({ sock, msg, args, prefix }) {
    try {
      const user = await getValidSession(senderNumber(msg));
      const thsms = args[0] || '20261'; // default to current semester if not provided
      const tagihanResp = await axios.post(`${config.RAISING_BASE_URL}/${user.sessionHash}/api/keuangan/tagihan_data_mhs/${user.nim}/${thsms}`, {}, {
        headers: {
          Cookie: user.cookie,
          'User-Agent': config.UA,
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      if (!tagihanResp.data || !tagihanResp.data.data || !tagihanResp.data.data.tagihan) {
        await editOrSend(sock, msg, `💰 *INFO TAGIHAN* (${thsms})

Tagihan tidak ditemukan untuk semester ${thsms}.`);
        return;
      }
      let html = tagihanResp.data.data.tagihan;
      // The API returns escaped newlines and tabs (\\n and \\t), so we need to unescape them
      html = html.replace(/\\\\n/g, '\n').replace(/\\\\t/g, '\t');
      const rows = parseTagihanHtml(html);
      if (rows.length === 0) {
        await editOrSend(sock, msg, `💰 *INFO TAGIHAN* (${thsms})

Tidak ada tagihan untuk semester ${thsms}.`);
        return;
      }
      // The first row might be the header (with colspan), we can skip it if it has a cell with colspan attribute
      // But our parser already extracts the text, so we can't tell. Instead, we can look for a row that has a cell containing "Tahun Akademik"
      // or we can skip the first row if it has only 2 cells (because the header row has two td: one with colspan=5 and one with colspan=2)
      let startIndex = 0;
      if (rows.length > 0 && rows[0].length === 2) {
        // Check if the first cell contains "Tahun Akademik" or the second contains "Total Tagihan"
        const firstCell = rows[0][0] || '';
        const secondCell = rows[0][1] || '';
        if (firstCell.includes('Tahun Akademik') || secondCell.includes('Total Tagihan')) {
          startIndex = 1;
        }
      }
      let text = `💰 *INFO TAGIHAN* (${thsms})\n\n`;
      for (let i = startIndex; i < rows.length; i++) {
        const cells = rows[i];
        // Expect at least 6 columns: no, keterangan, va, nominal, periode, status
        // Optionally a 7th column for tanggal bayar
        if (cells.length >= 6) {
          const no = cells[0];
          const keterangan = cells[1];
          const va = cells[2];
          const nominal = cells[3];
          const periode = cells[4];
          const status = cells[5];
          const tglBayar = cells.length >= 7 ? cells[6] : '';
          text += `${no}. ${keterangan}\n`;
          text += `   VA: ${va}\n`;
          text += `   Nominal: ${nominal}\n`;
          text += `   Periode: ${periode}\n`;
          text += `   Status: ${status}\n`;
          if (tglBayar && tglBayar !== '-') {
            text += `   Tanggal Bayar: ${tglBayar}\n`;
          }
          text += '\n';
        }
      }
      await editOrSend(sock, msg, text.trimEnd());
    } catch (err) {
      console.error('Error in tagihan command:', err);
      await editOrSend(sock, msg, `❌ Gagal mengambil data tagihan: ${err.message}`);
    }
  }
};