import { createRouter } from '@tanstack/react-router';
import { absoluteUrl } from '@/app/lib/utils';
import { routeTree } from '@/src/routeTree.gen';

export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    origin: absoluteUrl(),
  });
  return router;
}
