import { createFileRoute } from '@tanstack/react-router';
import { pageHead } from '@/app/constants';

export const Route = createFileRoute('/account')({
  head: () => pageHead({
    title: 'Account',
    description: 'Manage your Start account profile and preferences.',
    path: '/account',
    noindex: true,
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/account"!</div>;
}
