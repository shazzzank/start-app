import { z } from 'zod';
import { createServerFn } from '@tanstack/react-start';
import { getRequestIP } from '@tanstack/react-start/server';
import { eq } from 'drizzle-orm';
import { resolveLocale } from '@/app/lib/locale';
import {
  adminEmail, clearSessionCookie, getSessionUser, hashPassword, isStrongPassword,
  rateLimit, readSessionId, sessionExpiry, setSessionCookie, verifyPassword,
} from '@/app/server/auth';
import { ensureCloudinaryAssets, getAssetUrls } from '@/app/server/cloudinary';
import { db } from '@/app/server/db';
import { notify } from '@/app/server/notify';
import { sessions, users } from '@/app/server/schema';
import { ensureSeed } from '@/app/server/seed';

export const getSessionFn = createServerFn({ method: 'GET' }).handler(async () => {
  await ensureSeed();
  await ensureCloudinaryAssets();
  const [user, locale, assets] = await Promise.all([
    getSessionUser(),
    resolveLocale(),
    getAssetUrls(),
  ]);
  return { user, locale, assets };
});

export const loginFn = createServerFn({ method: 'POST' })
  .validator(z.object({ email: z.string().email().max(255), password: z.string().min(1).max(128) }))
  .handler(async ({ data }) => {
    await ensureSeed();
    const email = data.email.trim().toLowerCase();
    if (await rateLimit(`login:${email}`, 5, 900)) {
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (user && verifyPassword(data.password, user.password)) {
        await db.delete(sessions).where(eq(sessions.userId, user.id));
        const token = crypto.randomUUID();
        await db.insert(sessions).values({ id: token, userId: user.id, expiresAt: sessionExpiry() });
        setSessionCookie(token);
        return {
          ok: true as const,
          user: { id: user.id, name: user.name, email: user.email, role: user.role },
        };
      }
      return { ok: false as const, message: 'Invalid email or password.' };
    }
    return { ok: false as const, message: 'Too many attempts. Try again later.' };
  });

export const registerFn = createServerFn({ method: 'POST' })
  .validator(z.object({
    name: z.string().trim().min(1).max(255),
    email: z.string().email().max(255),
    password: z.string().min(8).max(128),
  }))
  .handler(async ({ data }) => {
    await ensureSeed();
    if (isStrongPassword(data.password)) {
      const ip = getRequestIP({ xForwardedFor: true }) ?? 'unknown';
      if (await rateLimit(`register:${ip}`, 10, 3600)) {
        const email = data.email.trim().toLowerCase();
        const emailAdmin = adminEmail();
        if (email !== emailAdmin) {
          const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
          if (!exists) {
            const id = crypto.randomUUID();
            await db.insert(users).values({
              id,
              name: data.name.trim(),
              email,
              password: hashPassword(data.password),
              role: 'customer',
            });
            const token = crypto.randomUUID();
            await db.insert(sessions).values({ id: token, userId: id, expiresAt: sessionExpiry() });
            setSessionCookie(token);
            await notify(id, 'Welcome to Start', 'Your account is ready. Browse the shop and place your first order.');
            return { ok: true as const, user: { id, name: data.name.trim(), email, role: 'customer' as const } };
          }
        }
        return { ok: false as const, message: 'Email already registered.' };
      }
      return { ok: false as const, message: 'Too many registrations. Try again later.' };
    }
    return { ok: false as const, message: 'Password must include upper, lower, number, and symbol.' };
  });

export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  const sessionId = readSessionId();
  if (sessionId) await db.delete(sessions).where(eq(sessions.id, sessionId));
  clearSessionCookie();
  return { ok: true };
});
