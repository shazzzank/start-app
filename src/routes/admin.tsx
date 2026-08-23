import type { OrderStatus } from '@/app/types';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import Button from '@/app/components/button';
import Page from '@/app/components/page';
import { useShop } from '@/app/components/shop-provider';
import { siteTitle } from '@/app/constants';
import {
  deleteNotificationFn, deleteOrderFn, deleteProductFn, deleteUserFn, getAdminProductsFn, getAdminStatsFn, getAdminUsersFn,
  getOrdersFn, markNotificationReadFn, updateOrderStatusFn,
} from '@/app/shop-api';

type AdminPanel = 'products' | 'orders' | 'users' | 'alerts';

const panelTitles: Record<AdminPanel, string> = {
  products: 'Catalogue',
  orders: 'All orders',
  users: 'Users',
  alerts: 'Alerts',
};

export const Route = createFileRoute('/admin')({
  head: () => ({
    meta: [
      { title: siteTitle('Admin') },
      { name: 'description', content: 'Start store dashboard for catalogue, orders, users, and alerts.' },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const client = useQueryClient();
  const { user, refresh, price, notifications } = useShop();
  const [panel, setPanel] = useState<AdminPanel>('products');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: () => getAdminStatsFn(), enabled: user?.role === 'admin' });
  const { data: orders = [] } = useQuery({ queryKey: ['orders'], queryFn: () => getOrdersFn(), enabled: user?.role === 'admin' });
  const { data: products = [] } = useQuery({ queryKey: ['admin-products'], queryFn: () => getAdminProductsFn(), enabled: user?.role === 'admin' });
  const { data: users = [] } = useQuery({ queryKey: ['admin-users'], queryFn: () => getAdminUsersFn(), enabled: user?.role === 'admin' });

  const runDelete = async (fn: () => Promise<{ ok: boolean; message?: string }>) => {
    try {
      const res = await fn();
      if (!res.ok) {
        window.alert(res.message ?? 'Action failed');
        return;
      }
      await refresh();
      await Promise.all([
        client.refetchQueries({ queryKey: ['admin-stats'] }),
        client.refetchQueries({ queryKey: ['admin-users'] }),
        client.refetchQueries({ queryKey: ['orders'] }),
        client.refetchQueries({ queryKey: ['admin-products'] }),
        client.refetchQueries({ queryKey: ['notifications'] }),
      ]);
    } catch {
      window.alert('Action failed');
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <Page>
        <main className='main' id='main-content'>
          <div className='wrap'>
            <div className='head'>
              <h1 className='h2'>Admin access required</h1>
              <p className='desc'>Sign in with an admin account to open the dashboard.</p>
            </div>
            <Button to='/login'>Go to login</Button>
          </div>
        </main>
      </Page>
    );
  }

  const statItems: { key: AdminPanel; label: string; count: number }[] = [
    { key: 'products', label: 'Products', count: stats?.products ?? 0 },
    { key: 'orders', label: 'Orders', count: stats?.orders ?? 0 },
    { key: 'users', label: 'Users', count: stats?.users ?? 0 },
    { key: 'alerts', label: 'Unread alerts', count: stats?.unread ?? 0 },
  ];

  return (
    <Page>
      <main className='main' id='main-content'>
        <div className='wrap'>
          <div className='head'>
            <p className='tag'>관리 · Admin</p>
            <h1 className='h2'>Store dashboard</h1>
            <p className='desc'>Signed in as {user.name} · {user.email}</p>
          </div>
          <div className='stats'>
            {statItems.map((item) => (
              <button
                key={item.key}
                type='button'
                className='stat'
                aria-pressed={panel === item.key}
                onClick={() => setPanel(item.key)}
              >
                <span className='label'>{item.label}</span>
                <strong>{item.count}</strong>
              </button>
            ))}
          </div>
          <div className='box mt-10'>
            <h2 className='h4'>{panelTitles[panel]}</h2>
            {panel === 'products' && (
              !products.length ? <p className='desc'>No products in catalogue.</p> : products.map((product) => (
                <div key={product.slug} className='item'>
                  <div>
                    <p className='cat'>{product.category}</p>
                    <p className='h4'>{product.name}</p>
                    <p className='text text-sm'>{price(product.price)} · {product.stock} in stock</p>
                  </div>
                  <div className='btns !mt-0'>
                    <Button variant='outline' size='sm' to='/products/$slug' params={{ slug: product.slug }}>View</Button>
                    <Button size='sm' to='/admin/products/$slug/edit' params={{ slug: product.slug }}>Edit</Button>
                    <Button
                      variant='danger'
                      size='sm'
                      onClick={() => runDelete(() => deleteProductFn({ data: { slug: product.slug } }))}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
            {panel === 'orders' && (
              !orders.length ? <p className='desc'>No orders yet.</p> : orders.map((order) => (
                <div key={order.id} className='item item-order'>
                  <div className='item-head'>
                    <div>
                      <p className='cat'>Order {order.id} · {order.customer}</p>
                      <p className='text text-sm'>{new Date(order.createdAt).toLocaleString()}</p>
                    </div>
                    <p className='price'>{price(order.total)}</p>
                  </div>
                  {expandedOrderId === order.id && (
                    <ul className='space-y-1 text-sm text-secondary'>
                      {order.items.map((item) => <li key={`${order.id}-${item.name}`}>{item.name} × {item.qty} · {price(item.price * item.qty)}</li>)}
                    </ul>
                  )}
                  <div className='item-order-actions'>
                    <div className='field-wrap item-order-status'>
                      <label htmlFor={`status-${order.id}`} className='label'>Status</label>
                      <select
                        id={`status-${order.id}`}
                        className='field field-sm'
                        value={order.status}
                        aria-label={`Order ${order.id} status`}
                        onChange={async (e) => {
                          await updateOrderStatusFn({ data: { orderId: order.id, status: e.target.value as OrderStatus } });
                          await refresh();
                        }}
                      >
                        <option value='pending'>Pending</option>
                        <option value='shipped'>Shipped</option>
                        <option value='delivered'>Delivered</option>
                      </select>
                    </div>
                    <div className='btns !mt-0'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                      >
                        {expandedOrderId === order.id ? 'Hide' : 'View'}
                      </Button>
                      <Button
                        variant='danger'
                        size='sm'
                        onClick={() => runDelete(() => deleteOrderFn({ data: { orderId: order.id } }))}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
            {panel === 'users' && (
              !users.length ? <p className='desc'>No users yet.</p> : users.map((row) => (
                <div key={row.id} className='item !items-start'>
                  <div>
                    <p className='h4'>{row.name}</p>
                    <p className='text text-sm'>{row.email} · {row.role}</p>
                    <p className='text text-xs mt-2'>{new Date(row.createdAt).toLocaleString()}</p>
                  </div>
                  <Button
                    variant='danger'
                    size='sm'
                    disabled={row.id === user.id}
                    onClick={() => runDelete(() => deleteUserFn({ data: { userId: row.id } }))}
                  >
                    Delete
                  </Button>
                </div>
              ))
            )}
            {panel === 'alerts' && (
              !notifications.length ? <p className='desc'>No notifications yet.</p> : notifications.map((item) => (
                <div key={item.id} className={`item !items-start ${item.read ? 'opacity-70' : ''}`}>
                  <div>
                    <p className='h4'>{item.title}</p>
                    <p className='text text-sm'>{item.body}</p>
                    <p className='text text-xs mt-2'>{new Date(item.createdAt).toLocaleString()}</p>
                  </div>
                  <div className='btns !mt-0'>
                    {!item.read && (
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={async () => {
                          await markNotificationReadFn({ data: { id: item.id } });
                          await refresh();
                        }}
                      >
                        Mark read
                      </Button>
                    )}
                    <Button
                      variant='danger'
                      size='sm'
                      onClick={() => runDelete(() => deleteNotificationFn({ data: { id: item.id } }))}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </Page>
  );
}
