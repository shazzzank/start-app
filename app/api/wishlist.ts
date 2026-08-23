import { z } from 'zod';
import { createServerFn } from '@tanstack/react-start';
import { and, eq } from 'drizzle-orm';
import { isSafeSlug } from '@/app/lib/utils';
import { requireUser } from '@/app/server/auth';
import { db } from '@/app/server/db';
import { products, wishlistItems } from '@/app/server/schema';
import { mapProduct } from '@/app/server/product';

export const getWishlistFn = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser(['customer']);
  if (user) {
    const rows = await db.select({ product: products }).from(wishlistItems)
      .innerJoin(products, eq(wishlistItems.product_id, products.id))
      .where(eq(wishlistItems.user_id, user.id));
    return rows.map((row) => mapProduct(row.product));
  }
  return [];
});

export const toggleWishlistFn = createServerFn({ method: 'POST' })
  .validator(z.object({ slug: z.string().max(128) }))
  .handler(async ({ data }) => {
    const user = await requireUser(['customer']);
    if (user && isSafeSlug(data.slug)) {
      const [product] = await db.select().from(products).where(eq(products.slug, data.slug)).limit(1);
      if (product) {
        const [existing] = await db.select().from(wishlistItems)
          .where(and(eq(wishlistItems.user_id, user.id), eq(wishlistItems.product_id, product.id))).limit(1);
        if (existing) {
          await db.delete(wishlistItems).where(eq(wishlistItems.id, existing.id));
          return { ok: true as const, saved: false };
        }
        await db.insert(wishlistItems).values({ id: crypto.randomUUID(), user_id: user.id, product_id: product.id });
        return { ok: true as const, saved: true };
      }
    }
    return { ok: false as const, saved: false };
  });
