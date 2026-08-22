import { z } from 'zod';
import { createServerFn } from '@tanstack/react-start';
import { getRequestIP } from '@tanstack/react-start/server';
import { and, asc, desc, eq, gte, ilike, inArray, lte, ne, or, sql } from 'drizzle-orm';
import { db, redis } from '@/app/config';
import {
  categoriesCacheTtl, environment, productDetailCacheTtl, productImageMaxBytes,
  productImageMimeTypes, productsCacheTtl, productsPageSize,
} from '@/app/constants';
import {
  cartItems, notifications, orderItems, orders, products, sessions, shopUsers, wishlistItems,
} from '@/app/db-schema';
import {
  adminEmailFromEnv, clearSessionCookie, escapeLike, getSessionUser, hashPassword, isSafeSlug,
  isStrongPassword, rateLimit, readSessionId, requireUser, sessionExpiry, setSessionCookie, verifyPassword,
} from '@/app/auth';
import { parseBase64Payload } from '@/app/helper';
import { ensureSeed, mapProduct } from '@/app/seed';
import {
  categoryDefaultImage, deleteCloudinaryImage, ensureCloudinaryAssets,
  isCloudinaryImageUrl, isDeletableProductUpload, productUploadPublicId, uploadImageBuffer,
} from '@/app/cloudinary';
import { formatPrice, resolveShopLocale } from '@/app/locale';

async function notify(userId: string, title: string, body: string) {
  await db.insert(notifications).values({
    id: crypto.randomUUID(),
    user_id: userId,
    title,
    body,
  });
}

async function notifyAdmins(title: string, body: string) {
  const admins = await db.select({ id: shopUsers.id }).from(shopUsers).where(eq(shopUsers.role, 'admin'));
  await Promise.all(admins.map((admin) => notify(admin.id, title, body)));
}

export const getSessionFn = createServerFn({ method: 'GET' }).handler(async () => {
  await ensureSeed();
  await ensureCloudinaryAssets();
  const user = await getSessionUser();
  return { user };
});

export const getAssetUrlsFn = createServerFn({ method: 'GET' }).handler(async () => {
  await ensureCloudinaryAssets();
  const { getAssetUrls } = await import('@/app/cloudinary');
  return getAssetUrls();
});

export const getLocaleFn = createServerFn({ method: 'GET' }).handler(async () => resolveShopLocale());

export const loginFn = createServerFn({ method: 'POST' })
  .validator(z.object({ email: z.string().email().max(255), password: z.string().min(1).max(128) }))
  .handler(async ({ data }) => {
    await ensureSeed();
    const email = data.email.trim().toLowerCase();
    if (!await rateLimit(`login:${email}`, 5, 900)) {
      return { ok: false as const, message: 'Too many attempts. Try again later.' };
    }
    const [user] = await db.select().from(shopUsers).where(eq(shopUsers.email, email)).limit(1);
    if (!user || !verifyPassword(data.password, user.password_hash)) {
      return { ok: false as const, message: 'Invalid email or password.' };
    }
    await db.delete(sessions).where(eq(sessions.user_id, user.id));
    const token = crypto.randomUUID();
    await db.insert(sessions).values({ id: token, user_id: user.id, expires_at: sessionExpiry() });
    setSessionCookie(token);
    return {
      ok: true as const,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  });

export const registerFn = createServerFn({ method: 'POST' })
  .validator(z.object({
    name: z.string().trim().min(1).max(255),
    email: z.string().email().max(255),
    password: z.string().min(8).max(128),
  }))
  .handler(async ({ data }) => {
    await ensureSeed();
    if (!isStrongPassword(data.password)) {
      return { ok: false as const, message: 'Password must include upper, lower, number, and symbol.' };
    }
    const ip = getRequestIP({ xForwardedFor: true }) ?? 'unknown';
    if (!await rateLimit(`register:${ip}`, 10, 3600)) {
      return { ok: false as const, message: 'Too many registrations. Try again later.' };
    }
    const email = data.email.trim().toLowerCase();
    const adminEmail = adminEmailFromEnv();
    if (adminEmail && email === adminEmail) {
      return { ok: false as const, message: 'Email already registered.' };
    }
    const [exists] = await db.select({ id: shopUsers.id }).from(shopUsers).where(eq(shopUsers.email, email)).limit(1);
    if (exists) return { ok: false as const, message: 'Email already registered.' };
    const id = crypto.randomUUID();
    await db.insert(shopUsers).values({
      id,
      name: data.name.trim(),
      email,
      password_hash: hashPassword(data.password),
      role: 'customer',
    });
    const token = crypto.randomUUID();
    await db.insert(sessions).values({ id: token, user_id: id, expires_at: sessionExpiry() });
    setSessionCookie(token);
    await notify(id, 'Welcome to Start', 'Your account is ready. Browse the shop and place your first order.');
    return { ok: true as const, user: { id, name: data.name.trim(), email, role: 'customer' as const } };
  });

export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  const sessionId = readSessionId();
  if (sessionId) await db.delete(sessions).where(eq(sessions.id, sessionId));
  clearSessionCookie();
  return { ok: true };
});

async function productsCacheVer() {
  const ver = await redis.get(`${environment}:products:ver`);
  return ver ?? '0';
}

async function invalidateProductsCache() {
  await redis.incr(`${environment}:products:ver`);
}

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
    const offset = data?.offset ?? 0;
    const limit = data?.limit ?? productsPageSize;
    const ver = await productsCacheVer();
    const cacheKey = `${environment}:products:${ver}:${offset}:${limit}:${data?.q ?? ''}:${data?.category ?? ''}:${data?.minPrice ?? ''}:${data?.maxPrice ?? ''}:${data?.sort ?? 'name'}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    const filters = [];
    if (data?.q) {
      const term = escapeLike(data.q.trim());
      filters.push(or(
        ilike(products.name, `%${term}%`),
        ilike(products.summary, `%${term}%`),
        ilike(products.category, `%${term}%`),
      ));
    }
    if (data?.category && data.category !== 'all') filters.push(eq(products.category, data.category));
    if (data?.minPrice != null) filters.push(gte(products.price, data.minPrice));
    if (data?.maxPrice != null) filters.push(lte(products.price, data.maxPrice));
    const where = filters.length ? and(...filters) : undefined;
    const order = data?.sort === 'price-asc' ? asc(products.price)
      : data?.sort === 'price-desc' ? desc(products.price)
      : asc(products.name);
    const rows = await db.select().from(products).where(where).orderBy(order).limit(limit).offset(offset);
    const items = rows.map(mapProduct);
    const total = offset === 0
      ? (await db.select({ count: sql<number>`count(*)::int` }).from(products).where(where))[0]?.count ?? 0
      : 0;
    const result = { items, total, hasMore: items.length === limit };
    await redis.setex(cacheKey, productsCacheTtl, JSON.stringify(result));
    return result;
  });

export const getProductFn = createServerFn({ method: 'GET' })
  .validator(z.object({ slug: z.string().max(128) }))
  .handler(async ({ data }) => {
    await ensureSeed();
    if (!isSafeSlug(data.slug)) return null;
    const ver = await productsCacheVer();
    const cacheKey = `${environment}:product:${ver}:${data.slug}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    const [row] = await db.select().from(products).where(eq(products.slug, data.slug)).limit(1);
    const result = row ? mapProduct(row) : null;
    await redis.setex(cacheKey, productDetailCacheTtl, JSON.stringify(result));
    return result;
  });

export const getSuggestedFn = createServerFn({ method: 'GET' })
  .validator(z.object({ slug: z.string().max(128), limit: z.number().int().min(1).max(12).optional() }))
  .handler(async ({ data }) => {
    await ensureSeed();
    if (!isSafeSlug(data.slug)) return [];
    const [current] = await db.select().from(products).where(eq(products.slug, data.slug)).limit(1);
    if (!current) return [];
    const rows = await db.select().from(products)
      .where(and(eq(products.category, current.category), ne(products.slug, data.slug)))
      .limit(data.limit ?? 3);
    return rows.map(mapProduct);
  });

export const getCategoriesFn = createServerFn({ method: 'GET' }).handler(async () => {
  await ensureSeed();
  const ver = await productsCacheVer();
  const cacheKey = `${environment}:categories:${ver}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  const rows = await db.select({ category: products.category }).from(products).groupBy(products.category).orderBy(asc(products.category));
  const result = rows.map((row) => row.category);
  await redis.setex(cacheKey, categoriesCacheTtl, JSON.stringify(result));
  return result;
});

export const getCategoryStatsFn = createServerFn({ method: 'GET' }).handler(async () => {
  await ensureSeed();
  const ver = await productsCacheVer();
  const cacheKey = `${environment}:category-stats:${ver}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  const rows = await db.select({
    category: products.category,
    count: sql<number>`count(*)::int`,
    image: sql<string>`min(${products.image})`,
  }).from(products).groupBy(products.category).orderBy(asc(products.category));
  const result = rows.map((row) => ({ category: row.category, count: row.count, image: row.image }));
  await redis.setex(cacheKey, categoriesCacheTtl, JSON.stringify(result));
  return result;
});

export const getCartFn = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser(['customer']);
  if (!user) return [];
  const rows = await db
    .select({ qty: cartItems.qty, product: products })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.product_id, products.id))
    .where(eq(cartItems.user_id, user.id));
  return rows.map((row) => ({ qty: row.qty, product: mapProduct(row.product) }));
});

export const addToCartFn = createServerFn({ method: 'POST' })
  .validator(z.object({ slug: z.string().max(128) }))
  .handler(async ({ data }) => {
    const user = await requireUser(['customer']);
    if (!user) return { ok: false as const };
    if (!isSafeSlug(data.slug)) return { ok: false as const };
    const [product] = await db.select().from(products).where(eq(products.slug, data.slug)).limit(1);
    if (!product) return { ok: false as const };
    const [existing] = await db.select().from(cartItems)
      .where(and(eq(cartItems.user_id, user.id), eq(cartItems.product_id, product.id))).limit(1);
    existing
      ? await db.update(cartItems).set({ qty: existing.qty + 1 }).where(eq(cartItems.id, existing.id))
      : await db.insert(cartItems).values({ id: crypto.randomUUID(), user_id: user.id, product_id: product.id, qty: 1 });
    return { ok: true as const };
  });

export const removeFromCartFn = createServerFn({ method: 'POST' })
  .validator(z.object({ slug: z.string().max(128) }))
  .handler(async ({ data }) => {
    const user = await requireUser(['customer']);
    if (!user) return { ok: false as const };
    if (!isSafeSlug(data.slug)) return { ok: false as const };
    const [product] = await db.select().from(products).where(eq(products.slug, data.slug)).limit(1);
    if (!product) return { ok: false as const };
    await db.delete(cartItems).where(and(eq(cartItems.user_id, user.id), eq(cartItems.product_id, product.id)));
    return { ok: true as const };
  });

export const getWishlistFn = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser(['customer']);
  if (!user) return [];
  const rows = await db.select({ product: products }).from(wishlistItems)
    .innerJoin(products, eq(wishlistItems.product_id, products.id))
    .where(eq(wishlistItems.user_id, user.id));
  return rows.map((row) => mapProduct(row.product));
});

export const toggleWishlistFn = createServerFn({ method: 'POST' })
  .validator(z.object({ slug: z.string().max(128) }))
  .handler(async ({ data }) => {
    const user = await requireUser(['customer']);
    if (!user) return { ok: false as const, saved: false };
    if (!isSafeSlug(data.slug)) return { ok: false as const, saved: false };
    const [product] = await db.select().from(products).where(eq(products.slug, data.slug)).limit(1);
    if (!product) return { ok: false as const, saved: false };
    const [existing] = await db.select().from(wishlistItems)
      .where(and(eq(wishlistItems.user_id, user.id), eq(wishlistItems.product_id, product.id))).limit(1);
    if (existing) {
      await db.delete(wishlistItems).where(eq(wishlistItems.id, existing.id));
      return { ok: true as const, saved: false };
    }
    await db.insert(wishlistItems).values({ id: crypto.randomUUID(), user_id: user.id, product_id: product.id });
    return { ok: true as const, saved: true };
  });

export const placeOrderFn = createServerFn({ method: 'POST' }).handler(async () => {
  const user = await requireUser(['customer']);
  if (!user) return { ok: false as const };
  const cart = await db.select({ qty: cartItems.qty, product: products }).from(cartItems)
    .innerJoin(products, eq(cartItems.product_id, products.id))
    .where(eq(cartItems.user_id, user.id));
  if (!cart.length) return { ok: false as const };
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
});

export const getOrdersFn = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser();
  if (!user) return [];
  const rows = user.role === 'admin'
    ? await db.select().from(orders).orderBy(desc(orders.created_at))
    : await db.select().from(orders).where(eq(orders.user_id, user.id)).orderBy(desc(orders.created_at));
  if (!rows.length) return [];
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
});

export const updateOrderStatusFn = createServerFn({ method: 'POST' })
  .validator(z.object({ orderId: z.string(), status: z.enum(['pending', 'shipped', 'delivered']) }))
  .handler(async ({ data }) => {
    const user = await requireUser(['admin']);
    if (!user) return { ok: false as const };
    const [order] = await db.select().from(orders).where(eq(orders.id, data.orderId)).limit(1);
    if (!order) return { ok: false as const };
    await db.update(orders).set({ status: data.status }).where(eq(orders.id, data.orderId));
    await notify(order.user_id, `Order ${order.id} ${data.status}`, `Your order status is now ${data.status}.`);
    return { ok: true as const };
  });

export const getNotificationsFn = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser();
  if (!user) return [];
  const rows = await db.select().from(notifications)
    .where(eq(notifications.user_id, user.id))
    .orderBy(desc(notifications.created_at));
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    read: row.read,
    createdAt: row.created_at?.toISOString() ?? '',
  }));
});

export const markNotificationReadFn = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    if (!user) return { ok: false as const };
    await db.update(notifications).set({ read: true })
      .where(and(eq(notifications.id, data.id), eq(notifications.user_id, user.id)));
    return { ok: true as const };
  });

export const getAdminStatsFn = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser(['admin']);
  if (!user) return null;
  const [productCount] = await db.select({ count: sql<number>`count(*)::int` }).from(products);
  const [orderCount] = await db.select({ count: sql<number>`count(*)::int` }).from(orders);
  const [userCount] = await db.select({ count: sql<number>`count(*)::int` }).from(shopUsers);
  const [unread] = await db.select({ count: sql<number>`count(*)::int` }).from(notifications)
    .where(and(eq(notifications.user_id, user.id), eq(notifications.read, false)));
  return {
    products: productCount?.count ?? 0,
    orders: orderCount?.count ?? 0,
    users: userCount?.count ?? 0,
    unread: unread?.count ?? 0,
  };
});

export const getAdminUsersFn = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser(['admin']);
  if (!user) return [];
  const rows = await db.select({
    id: shopUsers.id,
    name: shopUsers.name,
    email: shopUsers.email,
    role: shopUsers.role,
    createdAt: shopUsers.created_at,
  }).from(shopUsers).orderBy(asc(shopUsers.name));
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.createdAt?.toISOString() ?? '',
  }));
});

export const deleteProductFn = createServerFn({ method: 'POST' })
  .validator(z.object({ slug: z.string().max(128) }))
  .handler(async ({ data }) => {
    const user = await requireUser(['admin']);
    if (!user) return { ok: false as const, message: 'Admin access required' };
    if (!isSafeSlug(data.slug)) return { ok: false as const, message: 'Product not found' };
    const [product] = await db.select().from(products).where(eq(products.slug, data.slug)).limit(1);
    if (!product) return { ok: false as const, message: 'Product not found' };
    const [ordered] = await db.select({ id: orderItems.id }).from(orderItems).where(eq(orderItems.product_id, product.id)).limit(1);
    if (ordered) return { ok: false as const, message: 'Product is linked to past orders' };
    try {
      await db.delete(cartItems).where(eq(cartItems.product_id, product.id));
      await db.delete(wishlistItems).where(eq(wishlistItems.product_id, product.id));
      await db.delete(products).where(eq(products.id, product.id));
      await invalidateProductsCache();
      return { ok: true as const };
    } catch {
      return { ok: false as const, message: 'Could not delete product' };
    }
  });

export const deleteOrderFn = createServerFn({ method: 'POST' })
  .validator(z.object({ orderId: z.string() }))
  .handler(async ({ data }) => {
    const user = await requireUser(['admin']);
    if (!user) return { ok: false as const, message: 'Admin access required' };
    try {
      await db.delete(orderItems).where(eq(orderItems.order_id, data.orderId));
      const deleted = await db.delete(orders).where(eq(orders.id, data.orderId)).returning({ id: orders.id });
      if (!deleted.length) return { ok: false as const, message: 'Order not found' };
      return { ok: true as const };
    } catch {
      return { ok: false as const, message: 'Could not delete order' };
    }
  });

export const deleteUserFn = createServerFn({ method: 'POST' })
  .validator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    const user = await requireUser(['admin']);
    if (!user || user.id === data.userId) return { ok: false as const, message: 'Cannot delete your own account' };
    const [target] = await db.select().from(shopUsers).where(eq(shopUsers.id, data.userId)).limit(1);
    if (!target) return { ok: false as const, message: 'User not found' };
    if (target.role === 'admin') {
      const [otherAdmin] = await db.select({ id: shopUsers.id }).from(shopUsers)
        .where(and(eq(shopUsers.role, 'admin'), ne(shopUsers.id, data.userId))).limit(1);
      if (!otherAdmin) return { ok: false as const, message: 'Cannot remove the last admin' };
    }
    try {
      const userOrders = await db.select({ id: orders.id }).from(orders).where(eq(orders.user_id, data.userId));
      for (const order of userOrders) {
        await db.delete(orderItems).where(eq(orderItems.order_id, order.id));
        await db.delete(orders).where(eq(orders.id, order.id));
      }
      await db.delete(sessions).where(eq(sessions.user_id, data.userId));
      const removed = await db.delete(shopUsers).where(eq(shopUsers.id, data.userId)).returning({ id: shopUsers.id });
      if (!removed.length) return { ok: false as const, message: 'Could not delete user' };
      return { ok: true as const };
    } catch {
      return { ok: false as const, message: 'Could not delete user' };
    }
  });

export const deleteNotificationFn = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const user = await requireUser(['admin']);
    if (!user) return { ok: false as const, message: 'Admin access required' };
    try {
      const removed = await db.delete(notifications)
        .where(and(eq(notifications.id, data.id), eq(notifications.user_id, user.id)))
        .returning({ id: notifications.id });
      if (!removed.length) return { ok: false as const, message: 'Notification not found' };
      return { ok: true as const };
    } catch {
      return { ok: false as const, message: 'Could not delete notification' };
    }
  });

export const getAdminProductsFn = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser(['admin']);
  if (!user) return [];
  const rows = await db.select().from(products).orderBy(asc(products.name));
  return rows.map(mapProduct);
});

export const updateProductFn = createServerFn({ method: 'POST' })
  .validator(z.object({
    slug: z.string().max(128),
    name: z.string().trim().min(1).max(255),
    summary: z.string().trim().min(1).max(512),
    description: z.string().trim().min(1).max(5000),
    price: z.number().int().min(1).max(10_000_000),
    stock: z.number().int().min(0).max(1_000_000),
    image: z.string().trim().min(1).max(512),
  }))
  .handler(async ({ data }) => {
    const user = await requireUser(['admin']);
    if (!user) return { ok: false as const };
    if (!isSafeSlug(data.slug) || !isCloudinaryImageUrl(data.image)) return { ok: false as const };
    const [product] = await db.select().from(products).where(eq(products.slug, data.slug)).limit(1);
    if (!product) return { ok: false as const };
    await db.update(products).set({
      name: data.name,
      summary: data.summary,
      description: data.description,
      price: data.price,
      stock: data.stock,
      image: data.image,
    }).where(eq(products.slug, data.slug));
    await invalidateProductsCache();
    return { ok: true as const };
  });

const imageMimeTypes = z.enum(productImageMimeTypes);

export const uploadProductImageFn = createServerFn({ method: 'POST' })
  .validator(z.object({
    slug: z.string().max(128),
    file: z.string().min(1),
    mime: imageMimeTypes,
    currentImage: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const user = await requireUser(['admin']);
    if (!user || !isSafeSlug(data.slug)) return { ok: false as const, message: 'Admin access required' };
    const [product] = await db.select().from(products).where(eq(products.slug, data.slug)).limit(1);
    if (!product) return { ok: false as const, message: 'Product not found' };
    const buffer = Buffer.from(parseBase64Payload(data.file), 'base64');
    if (buffer.length > productImageMaxBytes) return { ok: false as const, message: 'Image must be 5 MB or less' };
    try {
      const publicId = productUploadPublicId(data.slug);
      const url = await uploadImageBuffer(buffer, publicId);
      data.currentImage && isDeletableProductUpload(data.currentImage, data.slug)
        && data.currentImage !== url
        && await deleteCloudinaryImage(data.currentImage);
      await db.update(products).set({ image: url }).where(eq(products.slug, data.slug));
      await invalidateProductsCache();
      return { ok: true as const, url };
    } catch {
      return { ok: false as const, message: 'Upload failed' };
    }
  });

export const removeProductImageFn = createServerFn({ method: 'POST' })
  .validator(z.object({ slug: z.string().max(128), image: z.string() }))
  .handler(async ({ data }) => {
    const user = await requireUser(['admin']);
    if (!user || !isSafeSlug(data.slug)) return { ok: false as const, message: 'Admin access required' };
    const [product] = await db.select().from(products).where(eq(products.slug, data.slug)).limit(1);
    if (!product) return { ok: false as const, message: 'Product not found' };
    isDeletableProductUpload(data.image, data.slug) && await deleteCloudinaryImage(data.image);
    const url = categoryDefaultImage(product.category);
    await db.update(products).set({ image: url }).where(eq(products.slug, data.slug));
    await invalidateProductsCache();
    return { ok: true as const, url };
  });
