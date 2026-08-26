import { Navigate, createFileRoute } from '@tanstack/react-router';
import Button from '@/app/components/button';
import Page from '@/app/components/page';
import { useShop } from '@/app/components/shop-provider';
import { pageHead } from '@/app/lib/utils';
import { useNotificationsQuery } from '@/app/queries';
import { markNotificationReadFn } from '@/app/api/notifications';

export const Route = createFileRoute('/notifications')({
  head: () => pageHead({
    title: 'Alerts',
    description: 'Order and account notifications on Start.',
    path: '/notifications',
    noindex: true,
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user, refresh } = useShop();
  const { data: items = [] } = useNotificationsQuery(!!user);

  if (user?.role === 'customer') {
    return (
      <Page>
        <main className='main' id='main-content'>
          <div className='wrap'>
            <div className='head'>
              <p className='tag'>알림 · Alerts</p>
              <h1 className='h2'>Notifications</h1>
            </div>
            {items.length ? (
              <div className='box'>
                {items.map((item) => (
                  <div key={item.id} className={`item !items-start ${item.read ? 'opacity-70' : ''}`}>
                    <div>
                      <p className='h4'>{item.title}</p>
                      <p className='text text-sm'>{item.body}</p>
                      <p className='text text-xs mt-2'>{new Date(item.createdAt).toLocaleString()}</p>
                    </div>
                    {item.read === false && (
                      <Button variant='outline' size='sm' onClick={async () => { await markNotificationReadFn({ data: { id: item.id } }); await refresh(); }}>
                        Mark read
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className='desc'>No notifications yet.</p>
            )}
          </div>
        </main>
      </Page>
    );
  }

  if (user?.role === 'admin') return <Navigate to='/admin' />;

  return (
    <Page>
      <main className='main' id='main-content'><div className='wrap'><p className='desc'>Sign in to view notifications.</p><Button to='/login'>Sign in</Button></div></main>
    </Page>
  );
}
