import { createFileRoute, notFound } from '@tanstack/react-router';
import Button from '@/app/components/button';
import Page from '@/app/components/page';
import ProductCard from '@/app/components/product-card';
import Image from '@/app/components/image';
import { useShop } from '@/app/components/shop-provider';
import { pageHead } from '@/app/constants';
import { useSuggestedProductsQuery } from '@/app/queries';
import { getProductFn } from '@/app/api/products';

export const Route = createFileRoute('/products/$slug')({
  loader: async ({ params }) => {
    const product = await getProductFn({ data: { slug: params.slug } });
    if (product) return product;
    throw notFound();
  },
  head: ({ loaderData }) => {
    if (loaderData) {
      return pageHead({
        title: loaderData.name,
        description: loaderData.summary || loaderData.description,
        path: `/products/${loaderData.slug}`,
      });
    }
    return pageHead({
      title: 'Product',
      description: 'Product details on Start.',
      path: '/products',
      noindex: true,
    });
  },
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const product = Route.useLoaderData();
  const { user, wishlist, toggleWishlist, addToCart, price } = useShop();
  const saved = wishlist.includes(product.slug);
  const { data: suggested = [] } = useSuggestedProductsQuery(product.slug);

  return (
    <Page>
      <main className='main' id='main-content'>
        <div className='wrap'>
          <div className='detail'>
            <div className='detail-img'>
              <Image src={product.image} alt={product.name} loading='eager' />
            </div>
            <div className='detail-body'>
              <p className='cat'>{product.category}</p>
              <h1 className='h2'>{product.name}</h1>
              <p className='price text-2xl'>{price(product.price)}</p>
              <p className='text'>{product.summary}</p>
              <p className='desc'>{product.description}</p>
              <p className='text text-sm'>{product.stock} in stock</p>
              <div className='btns'>
                {user ? (
                  <>
                    <Button onClick={() => addToCart(product.slug)} analytics='add_to_cart'>Add to cart</Button>
                    <Button variant='outline' onClick={() => toggleWishlist(product.slug)} analytics={saved ? 'remove_wishlist' : 'save_wishlist'} aria-pressed={saved} aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}>
                      {saved ? 'Saved to wishlist' : 'Save to wishlist'}
                    </Button>
                  </>
                ) : (
                  <Button to='/login' analytics='sign_in'>Sign in to buy</Button>
                )}
              </div>
            </div>
          </div>
          {suggested.length > 0 && (
            <section className='section'>
              <h2 className='h3'>You may also like</h2>
              <div className='grid'>
                {suggested.map((item) => <ProductCard key={item.slug} product={item} />)}
              </div>
            </section>
          )}
        </div>
      </main>
    </Page>
  );
}
