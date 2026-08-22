import fs from 'node:fs';
import path from 'node:path';
import { v2 as cloudinary } from 'cloudinary';
import { eq, like, or } from 'drizzle-orm';
import { db, redis } from '@/app/config';
import { cloudinaryCloudName, environment } from '@/app/constants';
import { isCloudinaryImageUrl } from '@/app/cloudinary-url';
import { products } from '@/app/db-schema';

const assetPrefix = 'start';
const productUploadPrefix = `${assetPrefix}/products/catalog`;
const migratedKey = `${environment}:cloudinary:migrated`;
const categoryDefaults: Record<string, string> = {
  Stationery: `${assetPrefix}/products/stationery/notebook`,
  Home: `${assetPrefix}/products/home/mug`,
  Bags: `${assetPrefix}/products/bags/tote`,
  Wear: `${assetPrefix}/products/wear/tee`,
};

function configured() {
  return !!(cloudinaryCloudName && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

function ensureConfig() {
  cloudinary.config({
    cloud_name: cloudinaryCloudName,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export function cloudinaryDeliveryUrl(publicId: string, resourceType: 'image' | 'raw' = 'image') {
  if (!cloudinaryCloudName) return '';
  return `https://res.cloudinary.com/${cloudinaryCloudName}/${resourceType}/upload/f_auto,q_auto/${publicId}`;
}

export function publicIdFromUrl(url: string) {
  const match = url.match(/\/upload\/(?:(?:v\d+|[\w_,]+)\/)*(.+?)(?:\.[a-z0-9]+)?$/i);
  return match?.[1] ?? null;
}

export function isDeletableProductUpload(url: string, slug: string) {
  const id = publicIdFromUrl(url);
  return id === `${productUploadPrefix}/${slug}`;
}

export { isCloudinaryImageUrl } from '@/app/cloudinary-url';

export async function uploadLocalAsset(filePath: string, publicId: string, resourceType: 'image' | 'raw' = 'image') {
  ensureConfig();
  const result = await cloudinary.uploader.upload(filePath, {
    public_id: publicId,
    overwrite: true,
    resource_type: resourceType,
  });
  return result.secure_url;
}

export async function uploadImageBuffer(buffer: Buffer, publicId: string) {
  ensureConfig();
  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { public_id: publicId, overwrite: true, resource_type: 'image' },
      (err, result) => err || !result?.secure_url ? reject(err ?? new Error('Upload failed')) : resolve(result.secure_url),
    );
    stream.end(buffer);
  });
}

export async function deleteCloudinaryImage(urlOrPublicId: string) {
  if (!configured()) return;
  const publicId = urlOrPublicId.includes('cloudinary.com') ? publicIdFromUrl(urlOrPublicId) : urlOrPublicId;
  if (!publicId?.startsWith(assetPrefix)) return;
  ensureConfig();
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
}

export function productUploadPublicId(slug: string) {
  return `${productUploadPrefix}/${slug}`;
}

export function categoryDefaultImage(category: string) {
  return cloudinaryDeliveryUrl(categoryDefaults[category] ?? `${assetPrefix}/products/home/mug`);
}

export async function getAssetUrls() {
  const fallback = await redis.get(`${environment}:assets:fallback`);
  const fontPrimary = await redis.get(`${environment}:assets:font-primary`);
  const fontSecondary = await redis.get(`${environment}:assets:font-secondary`);
  return {
    fallback: fallback ?? (cloudinaryCloudName ? cloudinaryDeliveryUrl(`${assetPrefix}/fallback`) : '/fallback.svg'),
    fontPrimary: fontPrimary ?? '',
    fontSecondary: fontSecondary ?? '',
  };
}

async function migrateStaticAssets() {
  if (!configured() || await redis.get(migratedKey)) return;

  const { catalog } = await import('@/app/seed');
  const imageMap = new Map<string, string>();
  const uniquePaths = [...new Set(catalog.map((item) => item.image))];
  for (const localPath of uniquePaths) {
    if (!localPath.startsWith('/')) continue;
    const filePath = path.join(process.cwd(), 'public', localPath);
    if (!fs.existsSync(filePath)) continue;
    const publicId = `${assetPrefix}${localPath.replace(/\.[^.]+$/, '')}`;
    imageMap.set(localPath, await uploadLocalAsset(filePath, publicId));
  }

  for (const item of catalog) {
    const url = imageMap.get(item.image);
    url && (item.image = url);
  }

  const fallback = cloudinaryDeliveryUrl(`${assetPrefix}/fallback`);
  await redis.set(`${environment}:assets:fallback`, fallback);

  const rows = await db.select({ slug: products.slug, image: products.image }).from(products)
    .where(or(like(products.image, '/products/%'), like(products.image, 'http%')));
  for (const row of rows) {
    const url = imageMap.get(row.image);
    url && await db.update(products).set({ image: url }).where(eq(products.slug, row.slug));
  }

  await redis.incr(`${environment}:products:ver`);
  await redis.set(migratedKey, '1');
}

export async function ensureCloudinaryAssets() {
  configured() && await migrateStaticAssets();
}
