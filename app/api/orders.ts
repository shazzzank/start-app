import { z } from 'zod';
import { createServerFn } from '@tanstack/react-start';
import { desc, eq, inArray } from 'drizzle-orm';
import { formatPrice, resolveLocale } from '@/app/lib/locale';
import { requireUser } from '@/app/server/auth';
import { db } from '@/app/server/db';
import { notify, notifyAdmins } from '@/app/server/notify';
import { cart, orders, products, users } from '@/app/server/schema';

export const placeOrderFn = createServerFn({ method: 'POST' }).handler(async () => {
  const user = await requireUser(['customer']);
  if (user) {
    const rows = await db.select({ qty: cart.qty, product: products }).from(cart)
      .innerJoin(products, eq(cart.productId, products.id))
      .where(eq(cart.userId, user.id));
    if (rows.length) {
      const id = crypto.randomUUID().slice(0, 8).toUpperCase();
      const items = rows.map((row) => ({
        slug: row.product.slug,
        name: row.product.name,
        price: row.product.price,
        qty: row.qty,
      }));
      const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
      await db.insert(orders).values({ id, userId: user.id, items, total, status: 'pending' });
      await db.delete(cart).where(eq(cart.userId, user.id));
      const locale = await resolveLocale();
      const totalLabel = formatPrice(total, locale.currency);
      await notify(user.id, `Order ${id} placed`, `Your order total is ${totalLabel}. We will notify you when it ships.`);
      await notifyAdmins(`New order ${id}`, `${user.name} placed an order worth ${totalLabel}.`);
      return { ok: true as const, orderId: id };
    }
  }
  return { ok: false as const };
});

export const getOrdersFn = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser();
  if (user) {
    const rows = user.role === 'admin'
      ? await db.select().from(orders).orderBy(desc(orders.createdAt))
      : await db.select().from(orders).where(eq(orders.userId, user.id)).orderBy(desc(orders.createdAt));
    if (!rows.length) return [];
    const names = new Map<string, string>();
    if (user.role === 'admin') {
      const ids = [...new Set(rows.map((row) => row.userId))];
      const owners = await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, ids));
      for (const owner of owners) names.set(owner.id, owner.name);
    }
    return rows.map((row) => ({
      id: row.id,
      total: row.total,
      status: row.status,
      createdAt: row.createdAt?.toISOString() ?? '',
      customer: user.role === 'admin' ? (names.get(row.userId) ?? '') : user.name,
      items: row.items,
    }));
  }
  return [];
});

export const updateOrderStatusFn = createServerFn({ method: 'POST' })
  .validator(z.object({ orderId: z.string(), status: z.enum(['pending', 'shipped', 'delivered']) }))
  .handler(async ({ data }) => {
    const user = await requireUser(['admin']);
    if (user) {
      const [order] = await db.select().from(orders).where(eq(orders.id, data.orderId)).limit(1);
      if (order) {
        await db.update(orders).set({ status: data.status }).where(eq(orders.id, data.orderId));
        await notify(order.userId, `Order ${order.id} ${data.status}`, `Your order status is now ${data.status}.`);
        return { ok: true as const };
      }
    }
    return { ok: false as const };
  });
