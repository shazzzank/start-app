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
  cartItems, notifications, orderItems, orders, products, sessions, shopUsers, wishlistItems,
} from '@/app/server/schema';
import { mapProduct } from '@/app/server/product';

export const getAdminStatsFn = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser(['admin']);
  if (user) {
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
  }
  return null;
});

export const getAdminUsersFn = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser(['admin']);
  if (user) {
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
          const [ordered] = await db.select({ id: orderItems.id }).from(orderItems).where(eq(orderItems.product_id, product.id)).limit(1);
          if (!ordered) {
            try {
              await db.delete(cartItems).where(eq(cartItems.product_id, product.id));
              await db.delete(wishlistItems).where(eq(wishlistItems.product_id, product.id));
              await db.delete(products).where(eq(products.id, product.id));
              await invalidateProductsCache();
              return { ok: true as const };
            } catch {
              return { ok: false as const, message: 'Could not delete product' };
            }
          }
          return { ok: false as const, message: 'Product is linked to past orders' };
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
        await db.delete(orderItems).where(eq(orderItems.order_id, data.orderId));
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
      const [target] = await db.select().from(shopUsers).where(eq(shopUsers.id, data.userId)).limit(1);
      if (target) {
        const [otherAdmin] = target.role === 'admin'
          ? await db.select({ id: shopUsers.id }).from(shopUsers)
            .where(and(eq(shopUsers.role, 'admin'), ne(shopUsers.id, data.userId))).limit(1)
          : [target];
        if (otherAdmin) {
          try {
            const userOrders = await db.select({ id: orders.id }).from(orders).where(eq(orders.user_id, data.userId));
            for (const order of userOrders) {
              await db.delete(orderItems).where(eq(orderItems.order_id, order.id));
              await db.delete(orders).where(eq(orders.id, order.id));
            }
            await db.delete(sessions).where(eq(sessions.user_id, data.userId));
            const removed = await db.delete(shopUsers).where(eq(shopUsers.id, data.userId)).returning({ id: shopUsers.id });
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
          .where(and(eq(notifications.id, data.id), eq(notifications.user_id, user.id)))
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
