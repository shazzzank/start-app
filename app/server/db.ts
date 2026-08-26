import fs from 'node:fs';
import path from 'path';
import winston from 'winston';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { databaseUrl } from '@/app/constants';

const isLocalDb = /localhost|127\.0\.0\.1/.test(databaseUrl);
const pool = new Pool({
  connectionString: databaseUrl,
  max: 20,
  idleTimeoutMillis: 30_000,
  ...(isLocalDb ? {} : { ssl: { rejectUnauthorized: false } }),
});
export const db = drizzle(pool);

const transports: winston.transport[] = [new winston.transports.Console()];
if (process.env.NODE_ENV !== 'production') {
  const logsDir = path.join(process.cwd(), 'logs');
  fs.mkdirSync(logsDir, { recursive: true });
  transports.push(new winston.transports.File({
    filename: path.join(logsDir, 'app.log'),
    maxsize: 10 * 1024 * 1024,
    maxFiles: 5,
  }));
}

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
  transports,
});
