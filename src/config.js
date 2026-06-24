import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { logger } from './lib/logger.js';

export const config = {
  port: parseInt(process.env.PORT || '3002', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  jwtSecret: (() => {
    const v = process.env.JWT_SECRET;
    if (!v) {
      const fallback = randomBytes(32).toString('hex');
      logger.warn('⚠  JWT_SECRET não configurado. Gerado fallback aleatório (sessões inválidas após restart). Configure no .env');
      return fallback;
    }
    return v;
  })(),

  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  corsOrigin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean)
    : ['http://localhost:3001'],

  // Database
  dbPath: process.env.DB_PATH || './data/crm.db',
};
