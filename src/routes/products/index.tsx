import { createFileRoute, useNavigate, useRouterState } from '@tanstack/react-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import Page from '@/app/components/page';
import ProductCard from '@/app/components/product-card';
import { productsPageSize } from '@/app/constants';
import type { ProductSearch } from '@/app/types';
import { getCategoriesFn, getProductsFn } from '@/app/shop-api';

function toProductQuery(search: ProductSearch) {
  return {
    q: search.q || undefined,
    category: search.category === 'all' ? undefined : search.category,
    sort: search.sort,
    minPrice: search.minPrice ? Number(search.minPrice) : undefined,
    maxPrice: search.maxPrice ? Number(search.maxPrice) : undefined,
  };
}

export const Route = createFileRoute('/products/')({
  validateSearch: (search: Record<string, unknown>): ProductSearch => ({
    q: (search.q as string) ?? '',
    category: (search.category as string) ?? 'all',
    minPrice: (search.minPrice as string) ?? '',
    maxPrice: (search.maxPrice as string) ?? '',
    sort: (search.sort as ProductSearch['sort']) ?? 'name',
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const query = toProductQuery(deps);
    const [categories, initialPage] = await Promise.all([
      getCategoriesFn(),
      getProductsFn({ data: { ...query, offset: 0, limit: productsPageSize } }),
    ]);
    return { categories, initialPage, query };
  },
  component: ProductsPage,
});

function ProductsPage() {
  const navigate = useNavigate({ from: '/products/' });
  const search = Route.useSearch();
  const { categories, initialPage, query: loaderQuery } = Route.useLoaderData();
  const productQuery = toProductQuery(search);
  const routerLoading = useRouterState({ select: (s) => s.isLoading });
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { q, category, sort, minPrice, maxPrice } = search;
  const [qDraft, setQDraft] = useState(q);
  const productsQuery = useInfiniteQuery({
    queryKey: ['products', productQuery],
    queryFn: ({ pageParam = 0 }) => getProductsFn({ data: { ...productQuery, offset: pageParam, limit: productsPageSize } }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.reduce((n, page) => n + page.items.length, 0);
    },
    initialData: JSON.stringify(productQuery) === JSON.stringify(loaderQuery)
      ? { pages: [initialPage], pageParams: [0] }
      : undefined,
    staleTime: 30_000,
  });
  const { fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = productsQuery;
  const products = productsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const total = productsQuery.data?.pages[0]?.total ?? 0;

  useEffect(() => { setQDraft(q); }, [q]);

  useEffect(() => {
    const timer = setTimeout(() => {
      qDraft !== q && navigate({ search: (prev) => ({ ...prev, q: qDraft }) });
    }, 300);
    return () => clearTimeout(timer);
  }, [qDraft, q, navigate]);

  const loading = (routerLoading || isLoading) && !products.length;

  useEffect(() => {
    const node = sentinelRef.current;
    if (loading || !node || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver((entries) => {
      entries[0]?.isIntersecting && fetchNextPage();
    }, { rootMargin: '240px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const patch = (partial: Partial<ProductSearch>) => navigate({ search: { ...search, ...partial } });

  return (
    <Page>
      <main className='main' id='main-content'>
        <div className='wrap'>
          <div className='head'>
            <p className='tag'>상품 · Shop</p>
            <h1 className='h2'>All products</h1>
            <p className='desc'>Filters update as you browse — no need to press apply.</p>
          </div>
          <form className='filters' role='search' aria-label='Filter products' onSubmit={(e) => e.preventDefault()}>
            <div className='field-wrap'>
              <label htmlFor='product-search' className='label'>Search</label>
              <input
                id='product-search'
                className='field'
                type='search'
                placeholder='Search products…'
                value={qDraft}
                onChange={(e) => setQDraft(e.target.value)}
                autoComplete='off'
              />
            </div>
            <div className='field-wrap'>
              <label htmlFor='product-category' className='label'>Category</label>
              <select id='product-category' className='field' value={category} onChange={(e) => patch({ category: e.target.value })}>
                <option value='all'>All categories</option>
                {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className='field-wrap'>
              <label htmlFor='product-min-price' className='label'>Min price</label>
              <input
                id='product-min-price'
                className='field'
                placeholder='Min price'
                inputMode='numeric'
                defaultValue={minPrice}
                key={`min-${minPrice}`}
                onBlur={(e) => e.target.value !== minPrice && patch({ minPrice: e.target.value })}
              />
            </div>
            <div className='field-wrap'>
              <label htmlFor='product-max-price' className='label'>Max price</label>
              <input
                id='product-max-price'
                className='field'
                placeholder='Max price'
                inputMode='numeric'
                defaultValue={maxPrice}
                key={`max-${maxPrice}`}
                onBlur={(e) => e.target.value !== maxPrice && patch({ maxPrice: e.target.value })}
              />
            </div>
            <div className='field-wrap'>
              <label htmlFor='product-sort' className='label'>Sort by</label>
              <select id='product-sort' className='field' value={sort} onChange={(e) => patch({ sort: e.target.value as ProductSearch['sort'] })}>
                <option value='name'>Name A–Z</option>
                <option value='price-asc'>Price low to high</option>
                <option value='price-desc'>Price high to low</option>
              </select>
            </div>
          </form>
          {loading ? (
            <p className='desc' role='status'>Loading products…</p>
          ) : !products.length ? (
            <p className='desc' role='status'>No products match your filters.</p>
          ) : (
            <>
              <div className='grid' aria-live='polite' aria-label={`${products.length} of ${total || products.length} products`}>
                {products.map((product) => <ProductCard key={product.slug} product={product} />)}
              </div>
              <div ref={sentinelRef} className='h-px w-full' aria-hidden='true' />
              {isFetchingNextPage && <p className='desc mt-6' role='status'>Loading more products…</p>}
            </>
          )}
        </div>
      </main>
    </Page>
  );
}
