import Redis from 'ioredis';
import { redisUrl } from '@/app/constants';

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 2,
  enableReadyCheck: false,
  ...(redisUrl.startsWith('rediss://') ? { tls: {} } : {}),
});

export async function redisGet(key: string) {
  return redis.get(key);
}

export async function redisSet(key: string, value: string) {
  return redis.set(key, value);
}

export async function redisSetex(key: string, ttlSeconds: number, value: string) {
  return redis.setex(key, ttlSeconds, value);
}

export async function redisIncr(key: string) {
  return redis.incr(key);
}

export async function redisExpire(key: string, ttlSeconds: number) {
  return redis.expire(key, ttlSeconds);
}

async function getJsonCache<T>(key: string): Promise<T | undefined> {
  const cached = await redisGet(key);
  if (cached === null) return undefined;
  return JSON.parse(cached) as T;
}

async function setJsonCache(key: string, ttlSeconds: number, value: unknown) {
  await redisSetex(key, ttlSeconds, JSON.stringify(value));
}

export async function rememberJsonCache<T>(key: string, ttlSeconds: number, load: () => Promise<T>) {
  const cached = await getJsonCache<T>(key);
  if (cached !== undefined) return cached;
  const value = await load();
  await setJsonCache(key, ttlSeconds, value);
  return value;
}
