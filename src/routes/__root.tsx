/// <reference types="vite/client" />
import { useState } from 'react';
import { Outlet, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SITENAME } from '@/app/constants';
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
      { title: SITENAME },
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
            <Outlet />
          </ShopProvider>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}

