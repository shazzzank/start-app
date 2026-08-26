import { homeTitle, siteName, siteUrl } from '@/app/constants';

export function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

export function parseBase64Payload(dataUrlOrBase64: string) {
  return dataUrlOrBase64.includes(',') ? dataUrlOrBase64.split(',')[1] : dataUrlOrBase64;
}

export function escapeLike(value: string) {
  return value.replace(/[%_\\]/g, '\\$&');
}

export function isSafeSlug(value: string) {
  return /^[a-z0-9-]{1,128}$/.test(value);
}

export function siteTitle(page?: string) {
  const label = page ?? homeTitle;
  const budget = 60 - siteName.length - 3;
  const clipped = label.length > budget ? `${label.slice(0, Math.max(1, budget - 1)).trimEnd()}…` : label;
  return `${clipped} · ${siteName}`;
}

export function absoluteUrl(path = '/') {
  const origin = typeof window !== 'undefined' ? window.location.origin : siteUrl;
  if (path && path !== '/') return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
  return origin;
}

export function metaDescription(text: string) {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned.length > 160 ? `${cleaned.slice(0, 157).trimEnd()}…` : cleaned;
}

export function pageHead(opts: {
  title?: string;
  description: string;
  path: string;
  noindex?: boolean;
}) {
  const meta: Array<Record<string, unknown>> = [
    { title: siteTitle(opts.title) },
    { name: 'description', content: metaDescription(opts.description) },
  ];
  opts.noindex && meta.push({ name: 'robots', content: 'noindex, nofollow' });
  return {
    meta,
    links: [{ rel: 'canonical', href: absoluteUrl(opts.path) }],
  };
}
