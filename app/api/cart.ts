import { z } from 'zod';
import { createServerFn } from '@tanstack/react-start';
import { and, eq } from 'drizzle-orm';
import { isSafeSlug } from '@/app/lib/utils';
import { requireUser } from '@/app/server/auth';
import { db } from '@/app/server/db';
import { cart, products } from '@/app/server/schema';
import { mapProduct } from '@/app/server/product';

export const getCartFn = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser(['customer']);
  if (user) {
    const rows = await db
      .select({ qty: cart.qty, product: products })
      .from(cart)
      .innerJoin(products, eq(cart.productId, products.id))
      .where(eq(cart.userId, user.id));
    return rows.map((row) => ({ qty: row.qty, product: mapProduct(row.product) }));
  }
  return [];
});

export const addToCartFn = createServerFn({ method: 'POST' })
  .validator(z.object({ slug: z.string().max(128) }))
  .handler(async ({ data }) => {
    const user = await requireUser(['customer']);
    if (user && isSafeSlug(data.slug)) {
      const [product] = await db.select().from(products).where(eq(products.slug, data.slug)).limit(1);
      if (product) {
        const [existing] = await db.select().from(cart)
          .where(and(eq(cart.userId, user.id), eq(cart.productId, product.id))).limit(1);
        existing
          ? await db.update(cart).set({ qty: existing.qty + 1 }).where(eq(cart.id, existing.id))
          : await db.insert(cart).values({ id: crypto.randomUUID(), userId: user.id, productId: product.id, qty: 1 });
        return { ok: true as const };
      }
    }
    return { ok: false as const };
  });

export const removeFromCartFn = createServerFn({ method: 'POST' })
  .validator(z.object({ slug: z.string().max(128) }))
  .handler(async ({ data }) => {
    const user = await requireUser(['customer']);
    if (user && isSafeSlug(data.slug)) {
      const [product] = await db.select().from(products).where(eq(products.slug, data.slug)).limit(1);
      if (product) {
        await db.delete(cart).where(and(eq(cart.userId, user.id), eq(cart.productId, product.id)));
        return { ok: true as const };
      }
    }
    return { ok: false as const };
  });
