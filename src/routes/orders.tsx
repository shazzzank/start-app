import { Navigate, createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import Button from '@/app/components/button';
import EmptyState from '@/app/components/empty-state';
import Page from '@/app/components/page';
import { useShop } from '@/app/components/shop-provider';
import { siteTitle } from '@/app/constants';
import { getCartFn, getOrdersFn } from '@/app/shop-api';

export const Route = createFileRoute('/orders')({
  head: () => ({
    meta: [
      { title: siteTitle('Orders') },
      { name: 'description', content: 'View your cart and order history on Start.' },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const { user, removeFromCart, placeOrder, price } = useShop();
  const { data: cartItems = [] } = useQuery({ queryKey: ['cart'], queryFn: () => getCartFn(), enabled: !!user });
  const { data: orders = [] } = useQuery({ queryKey: ['orders'], queryFn: () => getOrdersFn(), enabled: !!user });
  const cartTotal = cartItems.reduce((sum, row) => sum + row.product.price * row.qty, 0);

  if (!user) {
    return (
      <Page>
        <main className='main' id='main-content'><div className='wrap'><EmptyState title='Sign in required' description='View your cart and order history after signing in.' href='/login' action='Sign in' /></div></main>
      </Page>
    );
  }

  if (user.role === 'admin') return <Navigate to='/admin' />;

  return (
    <Page>
      <main className='main' id='main-content'>
        <div className='wrap'>
          <div className='head'>
            <p className='tag'>주문 · Orders</p>
            <h1 className='h2'>Cart and order history</h1>
          </div>
          <div className='grid gap-8 lg:grid-cols-2'>
            <section className='box'>
              <h2 className='h4'>Current cart</h2>
              {!cartItems.length ? (
                <p className='desc'>Your cart is empty.</p>
              ) : (
                <>
                  {cartItems.map(({ qty, product }) => (
                    <div key={product.slug} className='item'>
                      <div>
                        <p className='h4'>{product.name}</p>
                        <p className='text text-sm'>Qty {qty} · {price(product.price * qty)}</p>
                      </div>
                      <Button variant='outline' size='sm' onClick={() => removeFromCart(product.slug)}>Remove</Button>
                    </div>
                  ))}
                  <div className='mt-6 flex items-center justify-between gap-4'>
                    <p className='price text-xl'>{price(cartTotal)}</p>
                    <Button onClick={() => placeOrder()}>Place order</Button>
                  </div>
                </>
              )}
            </section>
            <section className='box'>
              <h2 className='h4'>Past orders</h2>
              {!orders.length ? (
                <EmptyState inline title='No orders yet' description='Place your first order from the cart panel.' href='/products' action='Shop now' />
              ) : (
                orders.map((order) => (
                  <div key={order.id} className='item !items-start'>
                    <div>
                      <p className='cat'>Order {order.id} · {order.status}</p>
                      {user.role === 'admin' && <p className='text text-sm'>{order.customer}</p>}
                      <p className='text text-sm'>{new Date(order.createdAt).toLocaleString()}</p>
                      <ul className='mt-3 space-y-1 text-sm text-secondary'>
                        {order.items.map((item) => <li key={`${order.id}-${item.name}`}>{item.name} × {item.qty}</li>)}
                      </ul>
                    </div>
                    <p className='price'>{price(order.total)}</p>
                  </div>
                ))
              )}
            </section>
          </div>
        </div>
      </main>
    </Page>
  );
}
