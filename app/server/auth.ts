import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { deleteCookie, getCookie, setCookie } from '@tanstack/react-start/server';
import { eq, and, gt } from 'drizzle-orm';
import { environment } from '@/app/constants';
import { db } from '@/app/server/db';
import { redisExpire, redisIncr } from '@/app/server/redis';
import { sessions, shopUsers } from '@/app/server/schema';

const sessionCookie = 'start_session';
const sessionDays = 7;
const sessionMaxAge = sessionDays * 24 * 60 * 60;
const isProduction = process.env.NODE_ENV === 'production';

export function adminEmailFromEnv() {
  return process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? '';
}

export function isStrongPassword(password: string) {
  return password.length >= 8
    && password.length <= 128
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && /[^a-zA-Z0-9]/.test(password);
}

export async function rateLimit(key: string, limit: number, windowSec: number) {
  const redisKey = `${environment}:ratelimit:${key}`;
  const count = await redisIncr(redisKey);
  count === 1 && await redisExpire(redisKey, windowSec);
  return count <= limit;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  if (salt && hash) {
    const hashBuf = Buffer.from(hash, 'hex');
    const testBuf = scryptSync(password, salt, 64);
    return hashBuf.length === testBuf.length && timingSafeEqual(hashBuf, testBuf);
  }
  return false;
}

export function sessionExpiry() {
  return new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);
}

export function readSessionId() {
  return getCookie(sessionCookie) ?? null;
}

export function setSessionCookie(token: string) {
  setCookie(sessionCookie, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
    maxAge: sessionMaxAge,
  });
}

export function clearSessionCookie() {
  deleteCookie(sessionCookie, { path: '/' });
}

export async function getSessionUser() {
  const sessionId = readSessionId();
  if (sessionId) {
    const rows = await db
      .select({
        id: shopUsers.id,
        name: shopUsers.name,
        email: shopUsers.email,
        role: shopUsers.role,
      })
      .from(sessions)
      .innerJoin(shopUsers, eq(sessions.user_id, shopUsers.id))
      .where(and(eq(sessions.id, sessionId), gt(sessions.expires_at, new Date())))
      .limit(1);
    return rows[0] ?? null;
  }
  return null;
}

export async function requireUser(roles?: Array<'customer' | 'admin'>) {
  const user = await getSessionUser();
  if (user && (!roles || roles.includes(user.role as 'customer' | 'admin'))) return user;
  return null;
}
