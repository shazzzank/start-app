import { Navigate, createFileRoute } from '@tanstack/react-router';
import Button from '@/app/components/button';
import EmptyState from '@/app/components/empty-state';
import Page from '@/app/components/page';
import { useShop } from '@/app/components/shop-provider';
import { pageHead } from '@/app/lib/utils';
import { useWishlistQuery } from '@/app/queries';

export const Route = createFileRoute('/wishlist')({
  head: () => pageHead({
    title: 'Wishlist',
    description: 'Saved pieces on your Start wishlist.',
    path: '/wishlist',
    noindex: true,
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const { user, toggleWishlist, addToCart, price } = useShop();
  const { data: items = [] } = useWishlistQuery(!!user);

  if (user?.role === 'customer') {
    return (
      <Page>
        <main className='main' id='main-content'>
          <div className='wrap'>
            <div className='head'>
              <p className='tag'>위시리스트 · Wishlist</p>
              <h1 className='h2'>Saved items</h1>
            </div>
            {items.length ? (
              <ul className='box list-none p-0 m-0'>
                {items.map((product) => (
                  <li key={product.slug} className='item'>
                    <div>
                      <p className='cat'>{product.category}</p>
                      <p className='h3'>{product.name}</p>
                      <p className='text text-sm'>{price(product.price)}</p>
                    </div>
                    <div className='btns !mt-0'>
                      <Button variant='outline' onClick={() => toggleWishlist(product.slug)} analytics='remove_wishlist' aria-label={`Remove ${product.name} from wishlist`}>Remove</Button>
                      <Button onClick={() => addToCart(product.slug)} analytics='add_to_cart' aria-label={`Add ${product.name} to cart`}>Add to cart</Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title='Nothing saved yet' description='Browse the shop and save pieces you want to revisit.' href='/products' action='Browse products' />
            )}
          </div>
        </main>
      </Page>
    );
  }

  if (user?.role === 'admin') return <Navigate to='/admin' />;

  return (
    <Page>
      <main className='main' id='main-content'><div className='wrap'><EmptyState title='Sign in required' description='Save items to your wishlist after signing in.' href='/login' action='Sign in' /></div></main>
    </Page>
  );
}
