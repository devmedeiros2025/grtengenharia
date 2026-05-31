import 'dotenv/config';
import { randomBytes } from 'node:crypto';

export const config = {
  port: parseInt(process.env.PORT || '3002', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  jwtSecret: process.env.JWT_SECRET || randomBytes(32).toString('hex'),

  adminUser: process.env.ADMIN_USER || 'admin',
  adminPass: process.env.ADMIN_PASS || 'grt@admin2024',

  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3001',
};
