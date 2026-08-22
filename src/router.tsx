import { createRouter } from '@tanstack/react-router';
import { PORT } from '@/app/constants';
import { routeTree } from '@/src/routeTree.gen';

export function getRouter() {
  const origin = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : `http://localhost:${PORT}`;
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    origin,
  });
  return router;
}
