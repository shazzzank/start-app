import { createFileRoute } from '@tanstack/react-router';
import { asc } from 'drizzle-orm';
import { absoluteUrl } from '@/app/constants';
import { db } from '@/app/server/db';
import { ensureCloudinaryAssets } from '@/app/server/cloudinary';
import { products } from '@/app/server/schema';
import { ensureSeed } from '@/app/server/seed';

function urlEntry(loc: string, changefreq: string, priority: string) {
  return `<url><loc>${loc}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
}

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        await ensureSeed();
        await ensureCloudinaryAssets();
        const rows = await db.select({ slug: products.slug }).from(products).orderBy(asc(products.slug));
        const urls = [
          urlEntry(absoluteUrl('/'), 'weekly', '1.0'),
          urlEntry(absoluteUrl('/products'), 'daily', '0.9'),
          ...rows.map((row) => urlEntry(absoluteUrl(`/products/${row.slug}`), 'weekly', '0.8')),
        ];
        const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`;
        return new Response(body, {
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      },
    },
  },
});
