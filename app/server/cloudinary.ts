import fs from 'node:fs';
import path from 'node:path';
import { v2 as cloudinary } from 'cloudinary';
import { eq } from 'drizzle-orm';
import { environment } from '@/app/constants';
import { db, logger } from '@/app/server/db';
import { redisGet, redisIncr, redisSet } from '@/app/server/redis';
import { products } from '@/app/server/schema';

const assetPrefix = 'start';
const productUploadPrefix = `${assetPrefix}/products/catalog`;
const pexelsMigratedKey = `${environment}:cloudinary:pexels:v1`;
const categoryDefaults: Record<string, string> = {
  Stationery: `${assetPrefix}/products/stationery/notebook`,
  Home: `${assetPrefix}/products/home/mug`,
  Bags: `${assetPrefix}/products/bags/tote`,
  Wear: `${assetPrefix}/products/wear/tee`,
};
const genericKeywords = new Set(['set', 'kit', 'pack', 'sample', 'roll', 'block', 'cover', 'holder', 'stand']);

function cloudName() {
  return process.env.CLOUDINARY_CLOUD_NAME ?? '';
}

function configured() {
  return !!(cloudName() && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

function ensureConfig() {
  cloudinary.config({
    cloud_name: cloudName(),
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export function cloudinaryDeliveryUrl(publicId: string, resourceType: 'image' | 'raw' = 'image') {
  const name = cloudName();
  if (name) return `https://res.cloudinary.com/${name}/${resourceType}/upload/f_auto,q_auto/${publicId}`;
  return '';
}

export function publicIdFromUrl(url: string) {
  const match = url.match(/\/upload\/(?:(?:v\d+|[\w_,]+)\/)*(.+?)(?:\.[a-z0-9]+)?$/i);
  return match?.[1] ?? null;
}

export function isDeletableProductUpload(url: string, slug: string) {
  const id = publicIdFromUrl(url);
  return id === `${productUploadPrefix}/${slug}`;
}

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
  if (configured()) {
    const publicId = urlOrPublicId.includes('cloudinary.com') ? publicIdFromUrl(urlOrPublicId) : urlOrPublicId;
    if (publicId?.startsWith(assetPrefix)) {
      ensureConfig();
      await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    }
  }
}

export function productUploadPublicId(slug: string) {
  return `${productUploadPrefix}/${slug}`;
}

export function categoryDefaultImage(category: string) {
  return cloudinaryDeliveryUrl(categoryDefaults[category] ?? `${assetPrefix}/products/home/mug`);
}

export async function getAssetUrls() {
  const fallback = await redisGet(`${environment}:assets:fallback`);
  const fontPrimary = await redisGet(`${environment}:assets:font-primary`);
  const fontSecondary = await redisGet(`${environment}:assets:font-secondary`);
  return {
    fallback: fallback ?? (cloudName() ? cloudinaryDeliveryUrl(`${assetPrefix}/fallback`) : '/fallback.svg'),
    fontPrimary: fontPrimary ?? '',
    fontSecondary: fontSecondary ?? '',
  };
}

function productImageKeyword(slug: string, name: string, image: string) {
  const pathMatch = image.match(/\/([^/]+)\.[^.]+$/);
  if (pathMatch?.[1]) return pathMatch[1].replace(/-/g, ' ');
  const parts = slug.split('-').filter((part) => !genericKeywords.has(part));
  return parts[parts.length - 1] ?? name.split(/\s+/).pop()?.toLowerCase() ?? 'product';
}

function pexelsPage(slug: string) {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash + slug.charCodeAt(i)) % 15;
  return hash + 1;
}

async function pexelsPhotoUrl(keyword: string, page: number) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (apiKey) {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(keyword)}&per_page=1&page=${page}&orientation=square`,
      { headers: { Authorization: apiKey } },
    );
    if (res.ok) {
      const data = await res.json() as { photos?: Array<{ src?: { large2x?: string; large?: string } }> };
      return data.photos?.[0]?.src?.large2x ?? data.photos?.[0]?.src?.large ?? null;
    }
  }
  return null;
}

async function uploadRemoteImage(remoteUrl: string, publicId: string) {
  ensureConfig();
  const result = await cloudinary.uploader.upload(remoteUrl, {
    public_id: publicId,
    overwrite: true,
    resource_type: 'image',
  });
  return result.secure_url;
}

async function uploadCatalogImage(publicId: string, localPath: string, keyword: string, slug: string) {
  const filePath = path.join(process.cwd(), 'public', localPath);
  if (fs.existsSync(filePath)) return uploadLocalAsset(filePath, publicId);
  const remote = await pexelsPhotoUrl(keyword, pexelsPage(slug));
  return remote ? uploadRemoteImage(remote, publicId) : '';
}

async function migrateProductImages() {
  if (configured() && process.env.PEXELS_API_KEY && !(await redisGet(pexelsMigratedKey))) {
    const rows = await db.select({
      slug: products.slug,
      name: products.name,
      image: products.image,
    }).from(products);

    for (const row of rows) {
      const keyword = productImageKeyword(row.slug, row.name, row.image);
      const publicId = productUploadPublicId(row.slug);
      const localPath = row.image.startsWith('/products/') ? row.image : `/products/catalog/${row.slug}.jpg`;
      const url = await uploadCatalogImage(publicId, localPath, keyword, row.slug);
      url && await db.update(products).set({ image: url }).where(eq(products.slug, row.slug));
    }

    const fallbackPath = path.join(process.cwd(), 'public', 'fallback.svg');
    const fallback = fs.existsSync(fallbackPath)
      ? await uploadLocalAsset(fallbackPath, `${assetPrefix}/fallback`)
      : await uploadCatalogImage(`${assetPrefix}/fallback`, 'fallback.svg', 'product', 'fallback');
    fallback && await redisSet(`${environment}:assets:fallback`, fallback);

    await redisIncr(`${environment}:products:ver`);
    await redisSet(pexelsMigratedKey, '1');
  }
}

export async function ensureCloudinaryAssets() {
  if (configured()) {
    try {
      await migrateProductImages();
    } catch (err) {
      logger.error('Cloudinary migration failed', { err });
    }
  }
}
