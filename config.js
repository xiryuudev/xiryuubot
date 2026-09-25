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
};