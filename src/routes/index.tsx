import { createFileRoute, Link } from '@tanstack/react-router';
import Button from '@/app/components/button';
import Page from '@/app/components/page';
import ProductCard from '@/app/components/product-card';
import Image from '@/app/components/image';
import { useShop } from '@/app/components/shop-provider';
import { pageHead, siteDescription } from '@/app/constants';
import { getCategoryStatsFn, getProductsFn } from '@/app/api';

export const Route = createFileRoute('/')({
  loader: async () => {
    const [featured, arrivals, affordable, categoryStats] = await Promise.all([
      getProductsFn({ data: { limit: 3, sort: 'name' } }),
      getProductsFn({ data: { offset: 3, limit: 3, sort: 'name' } }),
      getProductsFn({ data: { maxPrice: 1500, limit: 3, sort: 'price-asc' } }),
      getCategoryStatsFn(),
    ]);
    return {
      featured: featured.items,
      arrivals: arrivals.items,
      affordable: affordable.items,
      categoryStats,
    };
  },
  head: () => pageHead({
    description: siteDescription,
    path: '/',
  }),
  component: HomePage,
});

const values = [
  { title: 'Small-batch', body: 'Limited runs from independent makers. No mass-market filler.' },
  { title: 'Honest materials', body: 'Linen, ceramic, brass, and paper chosen to age well with daily use.' },
  { title: 'Tracked orders', body: 'Cart, checkout, and delivery updates live in your account — not in the browser.' },
];

const moodCategories = ['Stationery', 'Home', 'Bags', 'Wear'];

function HomePage() {
  const { user, price } = useShop();
  const { featured, arrivals, affordable, categoryStats } = Route.useLoaderData();
  const statsByCategory = new Map(categoryStats.map((row) => [row.category, row]));

  return (
    <Page className='home'>
      <div className='bg-grid' aria-hidden='true' />
      <main className='main center' id='main-content'>
        <div className='wrap'>
          <h1 className='h1'>Start<em>시작</em></h1>
          <p className='lead'>Objects for slow mornings and long evenings.</p>
          <p className='desc'>Browse curated goods, save favourites, and track orders from your account.</p>
          <div className='actions'>
            <Button to='/products'>Shop collection</Button>
            {user ? (
              <Button variant='outline' to='/account'>Hi, {user.name.split(' ')[0]}</Button>
            ) : (
              <Button variant='outline' to='/login'>Sign in</Button>
            )}
          </div>
          <span className='rule' aria-hidden='true' />
        </div>
      </main>
      <section className='section'>
        <div className='wrap'>
          <p className='tag'>Curated</p>
          <h2 className='h2'>Featured pieces</h2>
          <p className='desc'>Handpicked from this week&apos;s catalogue.</p>
          <div className='grid'>
            {featured.map((product) => <ProductCard key={product.slug} product={product} />)}
          </div>
          <div className='mt-10'><Button variant='outline' to='/products'>View all products</Button></div>
        </div>
      </section>
      <section className='section'>
        <div className='wrap'>
          <p className='tag'>Values</p>
          <h2 className='h2'>Why Start</h2>
          <div className='grid'>
            {values.map((item) => (
              <div key={item.title} className='stat'>
                <p className='h4'>{item.title}</p>
                <p className='text text-sm mt-2'>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className='section'>
        <div className='wrap'>
          <p className='tag'>Categories</p>
          <h2 className='h2'>Shop by mood</h2>
          <p className='desc'>Pick a room, a ritual, or a carry — each collection has its own pace.</p>
          <div className='cat-grid'>
            {moodCategories.map((name) => {
              const stat = statsByCategory.get(name);
              const count = stat?.count ?? 0;
              return (
                <Link key={name} to='/products' search={{ category: name, q: '', minPrice: '', maxPrice: '', sort: 'name' }} className='cat-tile'>
                  <div className='cat-tile-img'>
                    <Image src={stat?.image} alt='' decorative />
                  </div>
                  <div className='cat-tile-body'>
                    <p className='cat'>{name}</p>
                    <p className='text text-sm'>{count} {count === 1 ? 'piece' : 'pieces'}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
      <section className='section'>
        <div className='wrap'>
          <p className='tag'>Accessible</p>
          <h2 className='h2'>Under {price(1500)}</h2>
          <p className='desc'>Thoughtful gifts and everyday essentials without the splurge.</p>
          <div className='grid'>
            {affordable.map((product) => <ProductCard key={product.slug} product={product} />)}
          </div>
        </div>
      </section>
      <section className='section'>
        <div className='wrap'>
          <p className='tag'>New arrivals</p>
          <h2 className='h2'>Just added</h2>
          <div className='grid'>
            {arrivals.map((product) => <ProductCard key={product.slug} product={product} />)}
          </div>
        </div>
      </section>
      <section className='section'>
        <div className='wrap max-w-3xl'>
          <p className='tag'>Studio</p>
          <h2 className='h2'>From our makers</h2>
          <p className='desc'>Start works with small studios across Seoul and Osaka. Every product ships from our shared warehouse with order tracking and stock updates — all stored in Postgres, never in your browser.</p>
          <div className='btns'>
            <Button to='/products'>Browse the shop</Button>
            {!user && <Button variant='outline' to='/login'>Create an account</Button>}
          </div>
        </div>
      </section>
    </Page>
  );
}
