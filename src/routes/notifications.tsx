import { Navigate, createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import Button from '@/app/components/button';
import Page from '@/app/components/page';
import { useShop } from '@/app/components/shop-provider';
import { siteTitle } from '@/app/constants';
import { getNotificationsFn, markNotificationReadFn } from '@/app/shop-api';

export const Route = createFileRoute('/notifications')({
  head: () => ({
    meta: [
      { title: siteTitle('Alerts') },
      { name: 'description', content: 'Order and account notifications on Start.' },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user, refresh } = useShop();
  const { data: items = [] } = useQuery({ queryKey: ['notifications'], queryFn: () => getNotificationsFn(), enabled: !!user });

  if (!user) {
    return (
      <Page>
        <main className='main' id='main-content'><div className='wrap'><p className='desc'>Sign in to view notifications.</p><Button to='/login'>Sign in</Button></div></main>
      </Page>
    );
  }

  if (user.role === 'admin') return <Navigate to='/admin' />;

  return (
    <Page>
      <main className='main' id='main-content'>
        <div className='wrap'>
          <div className='head'>
            <p className='tag'>알림 · Alerts</p>
            <h1 className='h2'>Notifications</h1>
          </div>
          {!items.length ? <p className='desc'>No notifications yet.</p> : (
            <div className='box'>
              {items.map((item) => (
                <div key={item.id} className={`item !items-start ${item.read ? 'opacity-70' : ''}`}>
                  <div>
                    <p className='h4'>{item.title}</p>
                    <p className='text text-sm'>{item.body}</p>
                    <p className='text text-xs mt-2'>{new Date(item.createdAt).toLocaleString()}</p>
                  </div>
                  {!item.read && (
                    <Button variant='outline' size='sm' onClick={async () => { await markNotificationReadFn({ data: { id: item.id } }); await refresh(); }}>
                      Mark read
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </Page>
  );
}
