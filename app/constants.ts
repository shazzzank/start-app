export const environment = process.env.APP_ENV ?? process.env.NODE_ENV ?? 'local';
export const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://moses@127.0.0.1/start';
const redisUrlRaw = process.env.REDIS_URL ?? 'redis://localhost:6379';
const redisUrlMatched = redisUrlRaw.match(/(rediss?:\/\/\S+)/)?.[1] ?? redisUrlRaw;
export const REDIS_URL = redisUrlMatched.includes('upstash.io')
  ? redisUrlMatched.replace(/^redis:\/\//, 'rediss://')
  : redisUrlMatched;
export const PORT = Number(process.env.PORT ?? 3000);
export const TABLE_PREFIX = 'start_api_';
export const productsPageSize = 24;
export const productsCacheTtl = 60;
export const categoriesCacheTtl = 300;
export const productDetailCacheTtl = 120;
export const productImageMaxBytes = 5 * 1024 * 1024;
export const productImageMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

export const PRIMARY_COLOR = '#00141a';
export const SECONDARY_COLOR = '#9eacad';
export const ACCENT_COLOR = '#2aa198';

export const SITENAME = 'Start';
export const siteDescription = 'Shop curated stationery, home goods, bags, and wear from Seoul and Osaka. Small-batch essentials with live stock and tracked orders.';
export const homeTitle = 'Curated stationery, home, bags & wear';
export const siteTitle = (page?: string) => {
  const label = page ?? homeTitle;
  const budget = 60 - SITENAME.length - 3;
  const clipped = label.length > budget ? `${label.slice(0, Math.max(1, budget - 1)).trimEnd()}…` : label;
  return `${clipped} · ${SITENAME}`;
};
export function absoluteUrl(path = '/') {
  const origin = typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.SITE_URL?.replace(/\/$/, '')
      || (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
      || (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`)
      || `http://localhost:${PORT}`);
  if (!path || path === '/') return origin;
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}
export function metaDescription(text: string) {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned.length > 160 ? `${cleaned.slice(0, 157).trimEnd()}…` : cleaned;
}
export function pageHead(opts: {
  title?: string;
  description: string;
  path: string;
  image?: string;
  ogType?: 'website' | 'product';
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}) {
  const pageTitle = siteTitle(opts.title);
  const description = metaDescription(opts.description);
  const image = opts.image;
  const meta: Array<Record<string, unknown>> = [
    { title: pageTitle },
    { name: 'description', content: description },
    { property: 'og:title', content: pageTitle },
    { property: 'og:description', content: description },
    { property: 'og:url', content: absoluteUrl(opts.path) },
    { property: 'og:type', content: opts.ogType ?? 'website' },
    { property: 'og:site_name', content: SITENAME },
    { name: 'twitter:card', content: image ? 'summary_large_image' : 'summary' },
    { name: 'twitter:title', content: pageTitle },
    { name: 'twitter:description', content: description },
  ];
  opts.noindex && meta.push({ name: 'robots', content: 'noindex, nofollow' });
  image && meta.push({ property: 'og:image', content: image }, { name: 'twitter:image', content: image });
  for (const graph of (opts.jsonLd ? (Array.isArray(opts.jsonLd) ? opts.jsonLd : [opts.jsonLd]) : [])) {
    meta.push({ 'script:ld+json': graph });
  }
  return {
    meta,
    links: [{ rel: 'canonical', href: absoluteUrl(opts.path) }],
  };
}
export const cloudinaryCloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ?? '';
export const fallbackImage = cloudinaryCloudName
  ? `https://res.cloudinary.com/${cloudinaryCloudName}/image/upload/f_auto,q_auto/start/fallback`
  : '/fallback.svg';
