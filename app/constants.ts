export const environment = process.env.APP_ENV ?? process.env.NODE_ENV ?? 'local';
export const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://moses@127.0.0.1/start';
const redisUrlRaw = process.env.REDIS_URL ?? 'redis://localhost:6379';
const redisUrlMatched = redisUrlRaw.match(/(rediss?:\/\/\S+)/)?.[1] ?? redisUrlRaw;
export const REDIS_URL = redisUrlMatched.includes('upstash.io')
  ? redisUrlMatched.replace(/^redis:\/\//, 'rediss://')
  : redisUrlMatched;
export const PORT = Number(process.env.PORT ?? 3000);
export const TABLE_PREFIX = 'start_api_';
export const productsPageSize = 24;
export const productsCacheTtl = 60;
export const categoriesCacheTtl = 300;
export const productDetailCacheTtl = 120;
export const productImageMaxBytes = 5 * 1024 * 1024;
export const productImageMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

export const PRIMARY_COLOR = '#00141a';
export const SECONDARY_COLOR = '#9eacad';
export const ACCENT_COLOR = '#2aa198';

export const SITENAME = 'Start';
export const cloudinaryCloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ?? '';
export const fallbackImage = cloudinaryCloudName
  ? `https://res.cloudinary.com/${cloudinaryCloudName}/image/upload/f_auto,q_auto/start/fallback`
  : '/fallback.svg';
