/// <reference types="vite/client" />
import { Outlet, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SITENAME } from '@/app/constants';
import appCss from '@/app/styles.css?url';

export const Route = createRootRoute({
  head: () => ({
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=IBM+Plex+Sans+KR:wght@300;400;500;600&display=swap',
      },
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
  errorComponent: ({ error }: { error: Error }) => {
    return (
      <div className='flex flex-col justify-center items-center h-screen w-screen px-6 text-center gap-3'>
        <h1 className='font-primary text-4xl text-fg'>Something went wrong. Please try again later</h1>
        <p className='text-muted'>Error Code: 2000 <span className='hidden'>{JSON.stringify(error)}</span></p>
      </div>
    );
  },
  component: () => (
    <html lang='en'>
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={new QueryClient()}>
          <Outlet />
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  ),
});

