/// <reference types="vite/client" />
import { Outlet, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SITENAME } from '@/app/constants';
import appCss from '@/app/styles.css?url';

export const Route = createRootRoute({
  head: () => ({
    links: [{ rel: 'stylesheet', href: appCss }],
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: SITENAME },
    ],
  }),
  notFoundComponent: () => (
    <div className='flex justify-center items-center h-screen w-screen'>
      <h1 className='text-4xl font-medium'>Oops! This is not where you belong!</h1>
    </div>
  ),
  errorComponent: ({ error }: { error: Error }) => {
    return (
      <div className='flex flex-col justify-center items-center h-screen w-screen'>
        <h1 className='text-4xl font-medium'>Something went wrong. Please try again later</h1>
        <p>Error Code: 2000 <span className='hidden'>{JSON.stringify(error)}</span></p>
      </div>
    );
  },
  component: () => (
    <html>
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
