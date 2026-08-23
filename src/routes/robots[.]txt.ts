import { createFileRoute } from '@tanstack/react-router';
import { absoluteUrl } from '@/app/constants';

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () => {
        const body = [
          'User-agent: *',
          'Allow: /',
          'Allow: /products',
          'Disallow: /admin',
          'Disallow: /account',
          'Disallow: /orders',
          'Disallow: /wishlist',
          'Disallow: /notifications',
          'Disallow: /login',
          `Sitemap: ${absoluteUrl('/sitemap.xml')}`,
          '',
        ].join('\n');
        return new Response(body, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      },
    },
  },
});
