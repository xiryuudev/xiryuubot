import 'dotenv/config';

export default {
  BOT_NAME: process.env.BOT_NAME || 'XiryuuBot',
  BOT_NUMBER: process.env.BOT_NUMBER || '62895622331910',
  AUTHOR_NUMBER: process.env.AUTHOR_NUMBER || '6289650943134',
  ADMIN_NUMBER: process.env.ADMIN_NUMBER || '6289650943134',
  ADMIN_NAME: process.env.ADMIN_NAME || 'Farrel Zacky R',
  AI_BASE_URL: process.env.AI_BASE_URL || 'http://localhost:20128/v1',
  AI_API_KEY: process.env.AI_API_KEY || '',
  AI_MODEL: process.env.AI_MODEL || 'test',
  RAISING_BASE_URL: process.env.RAISING_BASE_URL || 'https://raising.almaata.ac.id',
  UA: process.env.UA || 'Mozilla/5.0',
  DL_MAX_MB: Number(process.env.DL_MAX_MB) || 100,
  DL_TIMEOUT_S: Number(process.env.DL_TIMEOUT_S) || 300,
  DL_COOKIES: process.env.DL_COOKIES || 'cookies.txt',
  DL_PROXY: process.env.DL_PROXY || '',
  TIKWM_API: process.env.TIKWM_API || 'https://www.tikwm.com/api/',
  IG_USERNAME: process.env.IG_USERNAME || '',
  IG_PASSWORD: process.env.IG_PASSWORD || '',
};