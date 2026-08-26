import { z } from 'zod';
import { createServerFn } from '@tanstack/react-start';
import { and, asc, desc, eq, gte, ilike, lte, ne, or, sql } from 'drizzle-orm';
import {
  categoriesCacheTtl, environment, productDetailCacheTtl, productsCacheTtl, productsPageSize,
} from '@/app/constants';
import { resolveProductImageUrl } from '@/app/lib/images';
import { escapeLike, isSafeSlug } from '@/app/lib/utils';
import { ensureCloudinaryAssets } from '@/app/server/cloudinary';
import { db } from '@/app/server/db';
import { productsCacheVer } from '@/app/server/products-cache';
import { rememberJsonCache } from '@/app/server/redis';
import { products } from '@/app/server/schema';
import { ensureSeed } from '@/app/server/seed';
import { mapProduct } from '@/app/lib/images';

export const getProductsFn = createServerFn({ method: 'GET' })
  .validator(z.object({
    q: z.string().optional(),
    category: z.string().optional(),
    minPrice: z.number().optional(),
    maxPrice: z.number().optional(),
    sort: z.enum(['price-asc', 'price-desc', 'name']).optional(),
    offset: z.number().int().min(0).optional(),
    limit: z.number().int().min(1).max(100).optional(),
  }).optional())
  .handler(async ({ data }) => {
    await ensureSeed();
    await ensureCloudinaryAssets();
    const offset = data?.offset ?? 0;
    const limit = data?.limit ?? productsPageSize;
    const ver = await productsCacheVer();
    const cacheKey = `${environment}:products:${ver}:${offset}:${limit}:${data?.q ?? ''}:${data?.category ?? ''}:${data?.minPrice ?? ''}:${data?.maxPrice ?? ''}:${data?.sort ?? 'name'}`;
    return rememberJsonCache(cacheKey, productsCacheTtl, async () => {
      const filters = [];
      if (data?.q) {
        const term = escapeLike(data.q.trim());
        filters.push(or(
          ilike(products.name, `%${term}%`),
          ilike(products.summary, `%${term}%`),
          ilike(products.category, `%${term}%`),
        ));
      }
      data?.category && data.category !== 'all' && filters.push(eq(products.category, data.category));
      data?.minPrice != null && filters.push(gte(products.price, data.minPrice));
      data?.maxPrice != null && filters.push(lte(products.price, data.maxPrice));
      const where = filters.length ? and(...filters) : undefined;
      const order = data?.sort === 'price-asc' ? asc(products.price)
        : data?.sort === 'price-desc' ? desc(products.price)
        : asc(products.name);
      const rows = await db.select().from(products).where(where).orderBy(order).limit(limit).offset(offset);
      const items = rows.map(mapProduct);
      const total = offset === 0
        ? (await db.select({ count: sql<number>`count(*)::int` }).from(products).where(where))[0]?.count ?? 0
        : 0;
      return { items, total, hasMore: items.length === limit };
    });
  });

export const getProductFn = createServerFn({ method: 'GET' })
  .validator(z.object({ slug: z.string().max(128) }))
  .handler(async ({ data }) => {
    await ensureSeed();
    await ensureCloudinaryAssets();
    if (isSafeSlug(data.slug)) {
      const ver = await productsCacheVer();
      const cacheKey = `${environment}:product:${ver}:${data.slug}`;
      return rememberJsonCache(cacheKey, productDetailCacheTtl, async () => {
        const [row] = await db.select().from(products).where(eq(products.slug, data.slug)).limit(1);
        return row ? mapProduct(row) : null;
      });
    }
    return null;
  });

export const getSuggestedFn = createServerFn({ method: 'GET' })
  .validator(z.object({ slug: z.string().max(128), limit: z.number().int().min(1).max(12).optional() }))
  .handler(async ({ data }) => {
    await ensureSeed();
    await ensureCloudinaryAssets();
    if (isSafeSlug(data.slug)) {
      const [current] = await db.select().from(products).where(eq(products.slug, data.slug)).limit(1);
      if (current) {
        const rows = await db.select().from(products)
          .where(and(eq(products.category, current.category), ne(products.slug, data.slug)))
          .limit(data.limit ?? 3);
        return rows.map(mapProduct);
      }
    }
    return [];
  });

export const getCategoriesFn = createServerFn({ method: 'GET' }).handler(async () => {
  await ensureSeed();
  const ver = await productsCacheVer();
  const cacheKey = `${environment}:categories:${ver}`;
  return rememberJsonCache(cacheKey, categoriesCacheTtl, async () => {
    const rows = await db.select({ category: products.category }).from(products).groupBy(products.category).orderBy(asc(products.category));
    return rows.map((row) => row.category);
  });
});

export const getCategoryStatsFn = createServerFn({ method: 'GET' }).handler(async () => {
  await ensureSeed();
  await ensureCloudinaryAssets();
  const ver = await productsCacheVer();
  const cacheKey = `${environment}:category-stats:${ver}`;
  return rememberJsonCache(cacheKey, categoriesCacheTtl, async () => {
    const rows = await db.select({
      category: products.category,
      count: sql<number>`count(*)::int`,
      image: sql<string>`min(${products.image})`,
    }).from(products).groupBy(products.category).orderBy(asc(products.category));
    return rows.map((row) => ({
      category: row.category,
      count: row.count,
      image: resolveProductImageUrl(row.image),
    }));
  });
});
