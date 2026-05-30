/// <reference types="vite/client" />
import { Outlet, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router';
import { SITENAME } from '@/app/constants';
import appCss from '@/app/styles.css?url';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: SITENAME },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  notFoundComponent: () => (
    <div className='flex justify-center items-center h-screen w-screen'>
      <h1 className='text-4xl font-medium'>Oops! This is not where you belong!</h1>
    </div>
  ),
  errorComponent: ({ error }: { error: Error }) => {
    return (
      <div className='flex justify-center items-center h-screen w-screen'>
        <h1 className='text-4xl font-medium'>Something went wrong. Please try again later</h1>
      </div>
    );
  },
  component: () => (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  ),
});
