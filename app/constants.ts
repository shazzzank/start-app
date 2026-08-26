function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (value) return value;
  throw new Error(`Missing required env: ${name}`);
}

export const environment = requiredEnv('APP_ENV');
export const databaseUrl = requiredEnv('DATABASE_URL');
export const redisUrl = requiredEnv('REDIS_URL');
export const port = Number(requiredEnv('PORT'));
if (!Number.isFinite(port)) throw new Error('PORT must be a number');
export const cloudinaryCloudName = requiredEnv('CLOUDINARY_CLOUD_NAME');
export const siteUrl = requiredEnv('SITE_URL').replace(/\/$/, '');
export const tablePrefix = 'start_api_';
export const productsPageSize = 24;
export const productsCacheTtl = 60;
export const categoriesCacheTtl = 300;
export const productDetailCacheTtl = 120;
export const productImageMaxBytes = 5 * 1024 * 1024;
export const productImageMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
export const primaryColor = '#00141a';
export const siteName = 'Start';
export const siteDescription = 'Shop curated stationery, home goods, bags, and wear from Seoul and Osaka. Small-batch essentials with live stock and tracked orders.';
export const homeTitle = 'Curated stationery, home, bags & wear';

export { requiredEnv };
