import { environment } from '@/app/constants';
import { redisGet, redisIncr } from '@/app/server/redis';

export async function productsCacheVer() {
  return (await redisGet(`${environment}:products:ver`)) ?? '0';
}

export async function invalidateProductsCache() {
  await redisIncr(`${environment}:products:ver`);
}
