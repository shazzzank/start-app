// Backend
import path from 'path';
import winston from 'winston';
import Redis from 'ioredis';
import { S3Client } from "@aws-sdk/client-s3";
import { drizzle } from 'drizzle-orm/node-postgres';
import {
  AWS_REGION,
  AWS_ENDPOINT,
  AWS_ACCESS_KEY,
  AWS_SECRET_KEY,
  DATABASE_URL,
  REDIS_URL,
} from "@/app/constants";

export const redis = new Redis(REDIS_URL);
export const db = drizzle(DATABASE_URL);
export const s3 = new S3Client({
  region: AWS_REGION,
  endpoint: AWS_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_SECRET_KEY,
  },
});
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
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs/app.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});
// Frontend 

