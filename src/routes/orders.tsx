import { Navigate, createFileRoute } from '@tanstack/react-router';
import Button from '@/app/components/button';
import EmptyState from '@/app/components/empty-state';
import Page from '@/app/components/page';
import { useShop } from '@/app/components/shop-provider';
import { pageHead } from '@/app/lib/utils';
import { useCartQuery, useOrdersQuery } from '@/app/queries';

export const Route = createFileRoute('/orders')({
  head: () => pageHead({
    title: 'Orders',
    description: 'View your Start cart and order history with live delivery updates.',
    path: '/orders',
    noindex: true,
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const { user, removeFromCart, placeOrder, price } = useShop();
  const { data: cart = [] } = useCartQuery(!!user);
  const { data: orders = [] } = useOrdersQuery(!!user);
  const cartTotal = cart.reduce((sum, row) => sum + row.product.price * row.qty, 0);

  if (user?.role === 'customer') {
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
                {cart.length ? (
                  <>
                    {cart.map(({ qty, product }) => (
                      <div key={product.slug} className='item'>
                        <div>
                          <p className='h4'>{product.name}</p>
                          <p className='text text-sm'>Qty {qty} · {price(product.price * qty)}</p>
                        </div>
                        <Button variant='outline' size='sm' onClick={() => removeFromCart(product.slug)} analytics='remove_from_cart'>Remove</Button>
                      </div>
                    ))}
                    <div className='mt-6 flex items-center justify-between gap-4'>
                      <p className='price text-xl'>{price(cartTotal)}</p>
                      <Button onClick={() => placeOrder()} analytics='place_order'>Place order</Button>
                    </div>
                  </>
                ) : (
                  <p className='desc'>Your cart is empty.</p>
                )}
              </section>
              <section className='box'>
                <h2 className='h4'>Past orders</h2>
                {orders.length ? (
                  orders.map((order) => (
                    <div key={order.id} className='item !items-start'>
                      <div>
                        <p className='cat'>Order {order.id} · {order.status}</p>
                        <p className='text text-sm'>{new Date(order.createdAt).toLocaleString()}</p>
                        <ul className='mt-3 space-y-1 text-sm text-secondary'>
                          {order.items.map((item) => <li key={`${order.id}-${item.name}`}>{item.name} × {item.qty}</li>)}
                        </ul>
                      </div>
                      <p className='price'>{price(order.total)}</p>
                    </div>
                  ))
                ) : (
                  <EmptyState inline title='No orders yet' description='Place your first order from the cart panel.' href='/products' action='Shop now' />
                )}
              </section>
            </div>
          </div>
        </main>
      </Page>
    );
  }

  if (user?.role === 'admin') return <Navigate to='/admin' />;

  return (
    <Page>
      <main className='main' id='main-content'><div className='wrap'><EmptyState title='Sign in required' description='View your cart and order history after signing in.' href='/login' action='Sign in' /></div></main>
    </Page>
  );
}
