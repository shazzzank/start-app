import path from 'path';
import winston from 'winston';
import Redis from 'ioredis';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { DATABASE_URL, REDIS_URL } from '@/app/constants';

const isLocalDb = /localhost|127\.0\.0\.1/.test(DATABASE_URL);
export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 2,
  enableReadyCheck: false,
  ...(REDIS_URL.startsWith('rediss://') ? { tls: {} } : {}),
});
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  ...(isLocalDb ? {} : { ssl: { rejectUnauthorized: false } }),
});
export const db = drizzle(pool);
export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) =>
      JSON.stringify({
        timestamp,
        level,
        message,
        ...meta,
      })
    )
  ),
  transports: process.env.NODE_ENV === 'production'
    ? [new winston.transports.Console()]
    : [
        new winston.transports.Console(),
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs/app.log'),
          maxsize: 10 * 1024 * 1024,
          maxFiles: 5,
        }),
      ],
});
