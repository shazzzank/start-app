/// <reference types="vite/client" />
import { useState, type CSSProperties } from 'react';
import { Outlet, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { primaryColor, siteDescription } from '@/app/constants';
import { siteTitle } from '@/app/lib/utils';
import { AnalyticsTracker } from '@/app/firebase';
import appCss from '@/app/styles.css?url';
import { ShopProvider } from '@/app/components/shop-provider';
import { getSessionFn } from '@/app/api/auth';

export const Route = createRootRoute({
  loader: async () => getSessionFn(),
  head: () => ({
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'preconnect', href: 'https://res.cloudinary.com' },
    ],
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: siteTitle() },
      { name: 'description', content: siteDescription },
      { name: 'theme-color', content: primaryColor },
      { name: 'robots', content: 'index, follow' },
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
    queryClient.setQueryData(['session'], {
      user: initial.user,
      locale: initial.locale,
      assets: initial.assets,
    });
    return queryClient;
  });
  return (
    <html
      lang='en'
      style={initial.assets.fontPrimary && initial.assets.fontSecondary
        ? {
          '--font-primary-src': `url("${initial.assets.fontPrimary}") format("truetype")`,
          '--font-secondary-src': `url("${initial.assets.fontSecondary}") format("truetype")`,
        } as CSSProperties
        : undefined}
    >
      <head>
        <HeadContent />
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
