import { z } from 'zod';
import { createServerFn } from '@tanstack/react-start';
import { and, asc, eq, ne, sql } from 'drizzle-orm';
import { productImageMaxBytes, productImageMimeTypes } from '@/app/constants';
import { isCloudinaryImageUrl } from '@/app/lib/images';
import { isSafeSlug, parseBase64Payload } from '@/app/lib/utils';
import { requireUser } from '@/app/server/auth';
import {
  categoryDefaultImage, deleteCloudinaryImage, isDeletableProductUpload,
  productUploadPublicId, uploadImageBuffer,
} from '@/app/server/cloudinary';
import { db } from '@/app/server/db';
import { invalidateProductsCache } from '@/app/server/products-cache';
import {
  cart, notifications, orders, products, sessions, users, wishlist,
} from '@/app/server/schema';
import { mapProduct } from '@/app/lib/images';

export const getAdminStatsFn = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser(['admin']);
  if (user) {
    const [productCount] = await db.select({ count: sql<number>`count(*)::int` }).from(products);
    const [orderCount] = await db.select({ count: sql<number>`count(*)::int` }).from(orders);
    const [userCount] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    const [unread] = await db.select({ count: sql<number>`count(*)::int` }).from(notifications)
      .where(and(eq(notifications.userId, user.id), eq(notifications.read, false)));
    return {
      products: productCount?.count ?? 0,
      orders: orderCount?.count ?? 0,
      users: userCount?.count ?? 0,
      unread: unread?.count ?? 0,
    };
  }
  return null;
});

export const getAdminUsersFn = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser(['admin']);
  if (user) {
    const rows = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    }).from(users).orderBy(asc(users.name));
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      createdAt: row.createdAt?.toISOString() ?? '',
    }));
  }
  return [];
});

export const deleteProductFn = createServerFn({ method: 'POST' })
  .validator(z.object({ slug: z.string().max(128) }))
  .handler(async ({ data }) => {
    const user = await requireUser(['admin']);
    if (user) {
      if (isSafeSlug(data.slug)) {
        const [product] = await db.select().from(products).where(eq(products.slug, data.slug)).limit(1);
        if (product) {
          try {
            await db.delete(cart).where(eq(cart.productId, product.id));
            await db.delete(wishlist).where(eq(wishlist.productId, product.id));
            await db.delete(products).where(eq(products.id, product.id));
            await invalidateProductsCache();
            return { ok: true as const };
          } catch {
            return { ok: false as const, message: 'Could not delete product' };
          }
        }
      }
      return { ok: false as const, message: 'Product not found' };
    }
    return { ok: false as const, message: 'Admin access required' };
  });

export const deleteOrderFn = createServerFn({ method: 'POST' })
  .validator(z.object({ orderId: z.string() }))
  .handler(async ({ data }) => {
    const user = await requireUser(['admin']);
    if (user) {
      try {
        const deleted = await db.delete(orders).where(eq(orders.id, data.orderId)).returning({ id: orders.id });
        if (deleted.length) return { ok: true as const };
        return { ok: false as const, message: 'Order not found' };
      } catch {
        return { ok: false as const, message: 'Could not delete order' };
      }
    }
    return { ok: false as const, message: 'Admin access required' };
  });

export const deleteUserFn = createServerFn({ method: 'POST' })
  .validator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    const user = await requireUser(['admin']);
    if (user && user.id !== data.userId) {
      const [target] = await db.select().from(users).where(eq(users.id, data.userId)).limit(1);
      if (target) {
        const [otherAdmin] = target.role === 'admin'
          ? await db.select({ id: users.id }).from(users)
            .where(and(eq(users.role, 'admin'), ne(users.id, data.userId))).limit(1)
          : [target];
        if (otherAdmin) {
          try {
            await db.delete(sessions).where(eq(sessions.userId, data.userId));
            const removed = await db.delete(users).where(eq(users.id, data.userId)).returning({ id: users.id });
            if (removed.length) return { ok: true as const };
            return { ok: false as const, message: 'Could not delete user' };
          } catch {
            return { ok: false as const, message: 'Could not delete user' };
          }
        }
        return { ok: false as const, message: 'Cannot remove the last admin' };
      }
      return { ok: false as const, message: 'User not found' };
    }
    return { ok: false as const, message: 'Cannot delete your own account' };
  });

export const deleteNotificationFn = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const user = await requireUser(['admin']);
    if (user) {
      try {
        const removed = await db.delete(notifications)
          .where(and(eq(notifications.id, data.id), eq(notifications.userId, user.id)))
          .returning({ id: notifications.id });
        if (removed.length) return { ok: true as const };
        return { ok: false as const, message: 'Notification not found' };
      } catch {
        return { ok: false as const, message: 'Could not delete notification' };
      }
    }
    return { ok: false as const, message: 'Admin access required' };
  });

export const getAdminProductsFn = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser(['admin']);
  if (user) {
    const rows = await db.select().from(products).orderBy(asc(products.name));
    return rows.map(mapProduct);
  }
  return [];
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
    if (user && isSafeSlug(data.slug) && isCloudinaryImageUrl(data.image)) {
      const [product] = await db.select().from(products).where(eq(products.slug, data.slug)).limit(1);
      if (product) {
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
      }
    }
    return { ok: false as const };
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
    if (user && isSafeSlug(data.slug)) {
      const [product] = await db.select().from(products).where(eq(products.slug, data.slug)).limit(1);
      if (product) {
        const buffer = Buffer.from(parseBase64Payload(data.file), 'base64');
        if (buffer.length <= productImageMaxBytes) {
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
        }
        return { ok: false as const, message: 'Image must be 5 MB or less' };
      }
      return { ok: false as const, message: 'Product not found' };
    }
    return { ok: false as const, message: 'Admin access required' };
  });

export const removeProductImageFn = createServerFn({ method: 'POST' })
  .validator(z.object({ slug: z.string().max(128), image: z.string() }))
  .handler(async ({ data }) => {
    const user = await requireUser(['admin']);
    if (user && isSafeSlug(data.slug)) {
      const [product] = await db.select().from(products).where(eq(products.slug, data.slug)).limit(1);
      if (product) {
        isDeletableProductUpload(data.image, data.slug) && await deleteCloudinaryImage(data.image);
        const url = categoryDefaultImage(product.category);
        await db.update(products).set({ image: url }).where(eq(products.slug, data.slug));
        await invalidateProductsCache();
        return { ok: true as const, url };
      }
      return { ok: false as const, message: 'Product not found' };
    }
    return { ok: false as const, message: 'Admin access required' };
  });
