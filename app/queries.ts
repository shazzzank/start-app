import { useInfiniteQuery, useQuery, type QueryClient } from '@tanstack/react-query';
import { productsPageSize } from '@/app/constants';
import type { ProductListResult, ProductSearch } from '@/app/types';
import {
  getAdminProductsFn, getAdminStatsFn, getAdminUsersFn, getCartFn, getLocaleFn,
  getNotificationsFn, getOrdersFn, getProductsFn, getSessionFn, getSuggestedFn, getWishlistFn,
} from '@/app/api';

export const queryKeys = {
  session: ['session'] as const,
  locale: ['locale'] as const,
  cart: ['cart'] as const,
  wishlist: ['wishlist'] as const,
  orders: ['orders'] as const,
  notifications: ['notifications'] as const,
  products: (filters: ReturnType<typeof toProductQuery>) => ['products', filters] as const,
  suggested: (slug: string) => ['suggested', slug] as const,
  adminStats: ['admin-stats'] as const,
  adminProducts: ['admin-products'] as const,
  adminUsers: ['admin-users'] as const,
};

export function toProductQuery(search: ProductSearch) {
  return {
    q: search.q || undefined,
    category: search.category === 'all' ? undefined : search.category,
    sort: search.sort,
    minPrice: search.minPrice ? Number(search.minPrice) : undefined,
    maxPrice: search.maxPrice ? Number(search.maxPrice) : undefined,
  };
}

export function useSessionQuery() {
  return useQuery({ queryKey: queryKeys.session, queryFn: () => getSessionFn() });
}

export function useLocaleQuery() {
  return useQuery({
    queryKey: queryKeys.locale,
    queryFn: () => getLocaleFn(),
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useCartQuery(enabled: boolean) {
  return useQuery({ queryKey: queryKeys.cart, queryFn: () => getCartFn(), enabled });
}

export function useWishlistQuery(enabled: boolean) {
  return useQuery({ queryKey: queryKeys.wishlist, queryFn: () => getWishlistFn(), enabled });
}

export function useOrdersQuery(enabled: boolean) {
  return useQuery({ queryKey: queryKeys.orders, queryFn: () => getOrdersFn(), enabled });
}

export function useNotificationsQuery(enabled: boolean) {
  return useQuery({ queryKey: queryKeys.notifications, queryFn: () => getNotificationsFn(), enabled });
}

export function useSuggestedProductsQuery(slug: string) {
  return useQuery({
    queryKey: queryKeys.suggested(slug),
    queryFn: () => getSuggestedFn({ data: { slug, limit: 3 } }),
  });
}

export function useAdminStatsQuery(enabled: boolean) {
  return useQuery({ queryKey: queryKeys.adminStats, queryFn: () => getAdminStatsFn(), enabled });
}

export function useAdminProductsQuery(enabled: boolean) {
  return useQuery({ queryKey: queryKeys.adminProducts, queryFn: () => getAdminProductsFn(), enabled });
}

export function useAdminUsersQuery(enabled: boolean) {
  return useQuery({ queryKey: queryKeys.adminUsers, queryFn: () => getAdminUsersFn(), enabled });
}

export function useProductsInfiniteQuery(
  filters: ReturnType<typeof toProductQuery>,
  seed?: { page: ProductListResult; filters: ReturnType<typeof toProductQuery> },
) {
  const seedMatches = seed && JSON.stringify(filters) === JSON.stringify(seed.filters);
  return useInfiniteQuery({
    queryKey: queryKeys.products(filters),
    queryFn: ({ pageParam = 0 }) => getProductsFn({ data: { ...filters, offset: pageParam, limit: productsPageSize } }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => (
      lastPage.hasMore
        ? allPages.reduce((n, page) => n + page.items.length, 0)
        : undefined
    ),
    initialData: seedMatches ? { pages: [seed.page], pageParams: [0] } : undefined,
    staleTime: 30_000,
  });
}

export async function invalidateShopQueries(client: QueryClient) {
  await Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.session }),
    client.invalidateQueries({ queryKey: queryKeys.cart }),
    client.invalidateQueries({ queryKey: queryKeys.wishlist }),
    client.invalidateQueries({ queryKey: queryKeys.orders }),
    client.invalidateQueries({ queryKey: queryKeys.notifications }),
    client.invalidateQueries({ queryKey: ['products'] }),
    client.invalidateQueries({ queryKey: queryKeys.adminProducts }),
    client.invalidateQueries({ queryKey: queryKeys.adminStats }),
    client.invalidateQueries({ queryKey: queryKeys.adminUsers }),
  ]);
}

export async function refetchAdminQueries(client: QueryClient) {
  await Promise.all([
    client.refetchQueries({ queryKey: queryKeys.adminStats }),
    client.refetchQueries({ queryKey: queryKeys.adminUsers }),
    client.refetchQueries({ queryKey: queryKeys.orders }),
    client.refetchQueries({ queryKey: queryKeys.adminProducts }),
    client.refetchQueries({ queryKey: queryKeys.notifications }),
  ]);
}

export function clearShopperQueries(client: QueryClient) {
  client.removeQueries({ queryKey: queryKeys.cart });
  client.removeQueries({ queryKey: queryKeys.wishlist });
  client.removeQueries({ queryKey: queryKeys.orders });
  client.removeQueries({ queryKey: queryKeys.notifications });
}
