import { z } from 'zod';
import { createServerFn } from '@tanstack/react-start';
import { desc, eq, inArray } from 'drizzle-orm';
import { formatPrice, resolveShopLocale } from '@/app/lib/locale';
import { requireUser } from '@/app/server/auth';
import { db } from '@/app/server/db';
import { notify, notifyAdmins } from '@/app/server/notify';
import { cartItems, orderItems, orders, products, shopUsers } from '@/app/server/schema';

export const placeOrderFn = createServerFn({ method: 'POST' }).handler(async () => {
  const user = await requireUser(['customer']);
  if (user) {
    const cart = await db.select({ qty: cartItems.qty, product: products }).from(cartItems)
      .innerJoin(products, eq(cartItems.product_id, products.id))
      .where(eq(cartItems.user_id, user.id));
    if (cart.length) {
      const orderId = crypto.randomUUID().slice(0, 8).toUpperCase();
      const total = cart.reduce((sum, row) => sum + row.product.price * row.qty, 0);
      await db.insert(orders).values({ id: orderId, user_id: user.id, total, status: 'pending' });
      await db.insert(orderItems).values(cart.map((row) => ({
        id: crypto.randomUUID(),
        order_id: orderId,
        product_id: row.product.id,
        name: row.product.name,
        price: row.product.price,
        qty: row.qty,
      })));
      await db.delete(cartItems).where(eq(cartItems.user_id, user.id));
      const locale = await resolveShopLocale();
      const totalLabel = formatPrice(total, locale.currency);
      await notify(user.id, `Order ${orderId} placed`, `Your order total is ${totalLabel}. We will notify you when it ships.`);
      await notifyAdmins(`New order ${orderId}`, `${user.name} placed an order worth ${totalLabel}.`);
      return { ok: true as const, orderId };
    }
  }
  return { ok: false as const };
});

export const getOrdersFn = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser();
  if (user) {
    const rows = user.role === 'admin'
      ? await db.select().from(orders).orderBy(desc(orders.created_at))
      : await db.select().from(orders).where(eq(orders.user_id, user.id)).orderBy(desc(orders.created_at));
    if (rows.length) {
      const orderIds = rows.map((order) => order.id);
      const allItems = await db.select().from(orderItems).where(inArray(orderItems.order_id, orderIds));
      const itemsByOrder = new Map<string, typeof allItems>();
      for (const item of allItems) {
        const list = itemsByOrder.get(item.order_id) ?? [];
        list.push(item);
        itemsByOrder.set(item.order_id, list);
      }
      const ownerMap = new Map<string, { name: string; email: string }>();
      if (user.role === 'admin') {
        const userIds = [...new Set(rows.map((order) => order.user_id))];
        const owners = await db.select({ id: shopUsers.id, name: shopUsers.name, email: shopUsers.email })
          .from(shopUsers).where(inArray(shopUsers.id, userIds));
        for (const owner of owners) ownerMap.set(owner.id, { name: owner.name, email: owner.email });
      }
      return rows.map((order) => {
        const items = itemsByOrder.get(order.id) ?? [];
        const owner = user.role === 'admin'
          ? ownerMap.get(order.user_id)
          : { name: user.name, email: user.email };
        return {
          id: order.id,
          total: order.total,
          status: order.status,
          createdAt: order.created_at?.toISOString() ?? '',
          customer: owner?.name ?? '',
          items: items.map((item) => ({ slug: item.product_id, name: item.name, price: item.price, qty: item.qty })),
        };
      });
    }
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
        await notify(order.user_id, `Order ${order.id} ${data.status}`, `Your order status is now ${data.status}.`);
        return { ok: true as const };
      }
    }
    return { ok: false as const };
  });
