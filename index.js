import 'dotenv/config';
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import util from 'util';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { isRegistered } from './utils/users.js';
import { senderJid, senderNumber } from './utils/sender.js';
import { formatChatTime } from './utils/date.js';
import config from './config.js';
import { addTaskFromReport } from './utils/tasks.js';

const PREFIXES = ['!', '.', '/', '\\'];
const CMD_DIR = path.resolve('commands');
const ADMIN_NUMBER_CLEAN = String(config.ADMIN_NUMBER).replace(/[^0-9]/g, '');

const pinoLogger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'SYS:dd-mm-yyyy HH:MM:ss', ignore: 'pid,hostname', singleLine: false }
  }
});

const formatArg = (arg) => {
  if (typeof arg === 'string') return arg;
  if (arg instanceof Error) return arg.stack || arg.message;
  return util.inspect(arg, { colors: true, depth: 5, compact: false });
};
const formatMsg = (args) => args.map(formatArg).join(' ');
const log = {
  info: (...a) => pinoLogger.info(formatMsg(a)),
  ok: (...a) => pinoLogger.info(`\x1b[32m[ OK  ]\x1b[0m ${formatMsg(a)}`),
  warn: (...a) => pinoLogger.warn(formatMsg(a)),
  error: (...a) => pinoLogger.error(formatMsg(a))
};

let commands = new Map();

async function loadCommands() {
  commands = new Map();
  if (!fs.existsSync(CMD_DIR)) {
    fs.mkdirSync(CMD_DIR, { recursive: true });
    return;
  }
  const files = fs.readdirSync(CMD_DIR).filter((f) => f.endsWith('.js'));
  for (const file of files) {
    try {
      const url = `${pathToFileURL(path.join(CMD_DIR, file)).href}?update=${Date.now()}`;
      const mod = await import(url);
      const cmd = mod.default;
      if (cmd?.name) commands.set(cmd.name.toLowerCase(), cmd);
    } catch (err) {
      log.error(`Gagal memuat command ${file}:`, err);
    }
  }
  log.info(`Loaded ${commands.size} commands.`);
}

function unwrapMessage(message) {
  if (!message) return null;
  if (message.ephemeralMessage) return unwrapMessage(message.ephemeralMessage.message);
  if (message.viewOnceMessage) return unwrapMessage(message.viewOnceMessage.message);
  if (message.viewOnceMessageV2) return unwrapMessage(message.viewOnceMessageV2.message);
  if (message.documentWithCaptionMessage) return unwrapMessage(message.documentWithCaptionMessage.message);
  return message;
}

function getMessageInfo(rawMessage) {
  const message = unwrapMessage(rawMessage);
  if (!message) return { type: 'unknown', text: '-' };
  if (message.conversation) return { type: 'text', text: message.conversation };
  if (message.extendedTextMessage?.text) return { type: 'text', text: message.extendedTextMessage.text };
  if (message.imageMessage) return { type: 'image', text: message.imageMessage.caption || '(gambar tanpa caption)' };
  if (message.videoMessage) return { type: 'video', text: message.videoMessage.caption || '(video tanpa caption)' };
  if (message.documentMessage) return { type: 'dokumen', text: message.documentMessage.caption || message.documentMessage.fileName || '(dokumen)' };
  if (message.audioMessage) return { type: message.audioMessage.ptt ? 'voice note' : 'audio', text: '(audio)' };
  if (message.stickerMessage) return { type: 'stiker', text: '(stiker)' };
  const keys = Object.keys(message).filter((k) => !['messageContextInfo', 'senderKeyDistributionMessage'].includes(k));
  const key = keys[0] || Object.keys(message)[0];
  return { type: key || 'unknown', text: util.inspect(message[key], { depth: 1, colors: false }).slice(0, 150) };
}

const C = { reset: '\x1b[0m', cyan: '\x1b[36m', yellow: '\x1b[33m', green: '\x1b[32m', magenta: '\x1b[35m', gray: '\x1b[90m', white: '\x1b[37m', bold: '\x1b[1m', red: '\x1b[31m' };

function printChatLog(msg, extra = {}) {
  const { remoteJid } = msg.key;
  const isGroup = remoteJid.endsWith('@g.us');
  const { type, text } = getMessageInfo(msg.message);
  const sid = senderJid(msg) || '-';
  const senderLabel = msg.pushName && msg.pushName !== '-' ? `${msg.pushName} (${sid})` : sid;
  const chatLabel = isGroup ? (extra.groupName ? `${extra.groupName} (${remoteJid})` : remoteJid) : 'Private Chat';
  const statusReg = isRegistered(sid) ? `${C.green}[REGISTERED]${C.reset}` : `${C.red}[UNREGISTERED]${C.reset}`;

  const line = C.gray + '─'.repeat(62) + C.reset;
  console.log(`\n${C.cyan}${C.bold}┌─ [CHAT] ${isGroup ? 'GRUP' : 'PRIVATE'} ${statusReg} ${C.gray}(${type})${C.reset}`);
  console.log(`${C.cyan}│${C.reset} ${C.yellow}Waktu   :${C.reset} ${C.white}${formatChatTime(msg.messageTimestamp || Date.now() / 1000)}${C.reset}`);
  console.log(`${C.cyan}│${C.reset} ${C.yellow}Dari    :${C.reset} ${senderLabel}`);
  console.log(`${C.cyan}│${C.reset} ${C.yellow}Chat    :${C.reset} ${C.magenta}${chatLabel}${C.reset}`);
  console.log(`${C.cyan}│${C.reset} ${C.yellow}Pesan   :${C.reset} ${text}`);
  console.log(`${C.cyan}└${line}${C.reset}`);
}

async function connectToWhatsApp() {
  await loadCommands();

  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  const sock = makeWASocket({ logger: pino({ level: 'silent' }), printQRInTerminal: false, auth: state });

  log.info('Memulai koneksi ke WhatsApp...');
  if (!sock.authState.creds.registered) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(config.BOT_NUMBER);
        log.ok(`Pairing code untuk ${config.BOT_NUMBER}: ${code}`);
        log.info('Buka WhatsApp > Perangkat Tertaut > Tautkan dengan nomor telepon > Masukkan code ini');
      } catch (err) {
        log.error('Gagal minta pairing code:', err);
      }
    }, 3000);
  }

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode ?? null;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      log.warn(`Koneksi terputus (code: ${statusCode}) | Reconnect: ${shouldReconnect}`);
      if (shouldReconnect) { log.info('Menghubungkan ulang...'); connectToWhatsApp(); }
      else { log.error('Logged out. Hapus folder auth_info_baileys lalu jalankan ulang.'); }
    } else if (connection === 'open') {
      log.ok('Bot berhasil terhubung ke WhatsApp!');
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      let groupName = null;
      if (msg.key.remoteJid.endsWith('@g.us')) {
        try { groupName = (await sock.groupMetadata(msg.key.remoteJid)).subject; } catch { }
      }

      printChatLog(msg, { groupName });

      const sid = senderJid(msg);
      const { text } = getMessageInfo(msg.message);
      const usedPrefix = typeof text === 'string' ? PREFIXES.find((p) => text.startsWith(p)) : null;
      let commandName = null;
      let args = [];
      if (typeof text === 'string' && usedPrefix) {
        args = text.slice(usedPrefix.length).trim().split(/ +/);
        commandName = args.shift()?.toLowerCase();
      }

      const senderNum = senderNumber(msg);
      const isAdminPrivate = senderNum === ADMIN_NUMBER_CLEAN;
      const isMaterialGroup = groupName && /penyimpanan\s+materi|materi\s+storage/i.test(groupName);

      if ((isAdminPrivate || isMaterialGroup) && typeof text === 'string') {
        const isDoc = getMessageInfo(msg.message).type === 'dokumen';
        const task = addTaskFromReport(text, isDoc);
        if (task) {
          const confirmationText = `✅ *Tugas tercatat!*\n📚 ${task.course}\n📌 ${task.title}\n⏰ Deadline: ${task.deadline}${task.link ? `\n🔗 ${task.link}` : ''}`;
          await sock.sendMessage(msg.key.remoteJid, { text: confirmationText }, { quoted: msg });
          continue;
        }
      }

      if (!isRegistered(sid) && commandName !== 'daftar') {
        continue;
      }

      if (typeof text === 'string' && usedPrefix) {
        if (!commandName) continue;
        const command = commands.get(commandName);
        if (command) {
          try {
            log.ok(`Menjalankan command ${usedPrefix}${commandName} dari ${sid}`);
            await command.run({ sock, msg, args, commandList: Object.fromEntries(commands), prefix: usedPrefix });
          } catch (err) {
            log.error(`Error menjalankan command ${usedPrefix}${commandName}:`, err);
            await sock.sendMessage(msg.key.remoteJid, { text: `Terjadi kesalahan saat menjalankan command ${usedPrefix}${commandName}` }, { quoted: msg });
          }
        }
      }
    }
  });
}

connectToWhatsApp();
