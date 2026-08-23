import { createFileRoute } from '@tanstack/react-router';
import { siteTitle } from '@/app/constants';

export const Route = createFileRoute('/account')({
  head: () => ({
    meta: [
      { title: siteTitle('Account') },
      { name: 'description', content: 'Manage your Start account.' },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/account"!</div>;
}
