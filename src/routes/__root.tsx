/// <reference types="vite/client" />
import { useEffect, useState } from 'react';
import { Outlet, createRootRoute, HeadContent, Scripts, useRouterState } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { siteTitle } from '@/app/constants';
import { trackButton, trackPageView } from '@/app/firebase';
import appCss from '@/app/styles.css?url';
import { ShopProvider } from '@/app/components/shop-provider';
import { getAssetUrlsFn, getLocaleFn, getSessionFn } from '@/app/shop-api';

export const Route = createRootRoute({
  loader: async () => {
    const [session, locale, assets] = await Promise.all([getSessionFn(), getLocaleFn(), getAssetUrlsFn()]);
    return { ...session, locale, assets };
  },
  head: () => ({
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'preconnect', href: 'https://res.cloudinary.com' },
    ],
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: siteTitle() },
      { name: 'description', content: 'Objects for slow mornings and long evenings. Curated goods with account-backed cart, wishlist, and orders.' },
      { name: 'theme-color', content: '#00141a' },
    ],
  }),
  notFoundComponent: () => (
    <div className='flex justify-center items-center h-screen w-screen px-6 text-center'>
      <h1 className='font-primary text-4xl text-fg'>Oops! This is not where you belong!</h1>
    </div>
  ),
  errorComponent: () => {
    return (
      <div className='flex flex-col justify-center items-center h-screen w-screen px-6 text-center gap-3'>
        <h1 className='font-primary text-4xl text-fg'>Something went wrong. Please try again later</h1>
        <p className='text-muted'>Please try again later.</p>
      </div>
    );
  },
  component: RootComponent,
});

function AnalyticsTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.searchStr });
  useEffect(() => {
    trackPageView(`${pathname}${search}`);
  }, [pathname, search]);
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const el = (event.target as HTMLElement | null)?.closest('button, a.btn') as HTMLElement | null;
      if (!el || el.getAttribute('aria-hidden') === 'true') return;
      const name = el.getAttribute('aria-label') || el.textContent || '';
      trackButton(name);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);
  return null;
}

function RootComponent() {
  const initial = Route.useLoaderData();
  const [client] = useState(() => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } });
    queryClient.setQueryData(['session'], { user: initial.user });
    queryClient.setQueryData(['locale'], initial.locale);
    queryClient.setQueryData(['assets'], initial.assets);
    return queryClient;
  });
  const fontCss = initial.assets.fontPrimary && initial.assets.fontSecondary
    ? `@font-face{font-family:"Gowun Batang";src:url("${initial.assets.fontPrimary}") format("truetype");font-weight:400 700;font-display:swap}@font-face{font-family:"IBM Plex Sans KR";src:url("${initial.assets.fontSecondary}") format("truetype");font-weight:300 600;font-display:swap}`
    : '';
  return (
    <html lang='en'>
      <head>
        <HeadContent />
        {fontCss && <style dangerouslySetInnerHTML={{ __html: fontCss }} />}
      </head>
      <body>
        <QueryClientProvider client={client}>
          <ShopProvider>
            <AnalyticsTracker />
            <Outlet />
          </ShopProvider>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}

