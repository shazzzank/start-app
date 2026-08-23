import { z } from 'zod';
import { createServerFn } from '@tanstack/react-start';
import { and, eq } from 'drizzle-orm';
import { isSafeSlug } from '@/app/lib/utils';
import { requireUser } from '@/app/server/auth';
import { db } from '@/app/server/db';
import { cartItems, products } from '@/app/server/schema';
import { mapProduct } from '@/app/server/product';

export const getCartFn = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser(['customer']);
  if (user) {
    const rows = await db
      .select({ qty: cartItems.qty, product: products })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.product_id, products.id))
      .where(eq(cartItems.user_id, user.id));
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
        const [existing] = await db.select().from(cartItems)
          .where(and(eq(cartItems.user_id, user.id), eq(cartItems.product_id, product.id))).limit(1);
        existing
          ? await db.update(cartItems).set({ qty: existing.qty + 1 }).where(eq(cartItems.id, existing.id))
          : await db.insert(cartItems).values({ id: crypto.randomUUID(), user_id: user.id, product_id: product.id, qty: 1 });
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
        await db.delete(cartItems).where(and(eq(cartItems.user_id, user.id), eq(cartItems.product_id, product.id)));
        return { ok: true as const };
      }
    }
    return { ok: false as const };
  });
