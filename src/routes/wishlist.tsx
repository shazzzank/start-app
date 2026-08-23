import { Navigate, createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import Button from '@/app/components/button';
import EmptyState from '@/app/components/empty-state';
import Page from '@/app/components/page';
import { useShop } from '@/app/components/shop-provider';
import { siteTitle } from '@/app/constants';
import { getWishlistFn } from '@/app/shop-api';

export const Route = createFileRoute('/wishlist')({
  head: () => ({
    meta: [
      { title: siteTitle('Wishlist') },
      { name: 'description', content: 'Saved pieces on your Start wishlist.' },
    ],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const { user, toggleWishlist, addToCart, price } = useShop();
  const { data: items = [] } = useQuery({ queryKey: ['wishlist'], queryFn: () => getWishlistFn(), enabled: !!user });

  if (!user) {
    return (
      <Page>
        <main className='main' id='main-content'><div className='wrap'><EmptyState title='Sign in required' description='Save items to your wishlist after signing in.' href='/login' action='Sign in' /></div></main>
      </Page>
    );
  }

  if (user.role === 'admin') return <Navigate to='/admin' />;

  return (
    <Page>
      <main className='main' id='main-content'>
        <div className='wrap'>
          <div className='head'>
            <p className='tag'>위시리스트 · Wishlist</p>
            <h1 className='h2'>Saved items</h1>
          </div>
          {!items.length ? (
            <EmptyState title='Nothing saved yet' description='Browse the shop and save pieces you want to revisit.' href='/products' action='Browse products' />
          ) : (
            <ul className='box list-none p-0 m-0'>
              {items.map((product) => (
                <li key={product.slug} className='item'>
                  <div>
                    <p className='cat'>{product.category}</p>
                    <p className='h3'>{product.name}</p>
                    <p className='text text-sm'>{price(product.price)}</p>
                  </div>
                  <div className='btns !mt-0'>
                    <Button variant='outline' onClick={() => toggleWishlist(product.slug)} aria-label={`Remove ${product.name} from wishlist`}>Remove</Button>
                    <Button onClick={() => addToCart(product.slug)} aria-label={`Add ${product.name} to cart`}>Add to cart</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </Page>
  );
}
