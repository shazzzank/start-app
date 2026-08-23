import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  clearShopperQueries, invalidateShopQueries, queryKeys, useCartQuery, useLocaleQuery,
  useNotificationsQuery, useOrdersQuery, useSessionQuery, useWishlistQuery,
} from '@/app/queries';
import {
  addToCartFn, getNotificationsFn, getOrdersFn, loginFn, logoutFn, placeOrderFn, registerFn,
  removeFromCartFn, toggleWishlistFn,
} from '@/app/api';
import { formatPrice } from '@/app/lib/locale';
import type { ShopCurrency, ShopLocale, ShopUser } from '@/app/types';

type ShopContextValue = {
  user: ShopUser | null;
  locale: ShopLocale;
  price: (amountInInr: number) => string;
  loading: boolean;
  cart: { slug: string; qty: number }[];
  wishlist: string[];
  orders: Awaited<ReturnType<typeof getOrdersFn>>;
  notifications: Awaited<ReturnType<typeof getNotificationsFn>>;
  unread: number;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<string | null>;
  register: (name: string, email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  toggleWishlist: (slug: string) => Promise<void>;
  addToCart: (slug: string) => Promise<void>;
  removeFromCart: (slug: string) => Promise<void>;
  placeOrder: () => Promise<boolean>;
};

const ShopContext = createContext<ShopContextValue | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const session = useSessionQuery();
  const localeQuery = useLocaleQuery();
  const user = session.data?.user ?? null;
  const locale = localeQuery.data ?? { country: 'IN', currency: 'INR' as ShopCurrency };
  const shopperEnabled = !!user && user.role !== 'admin';
  const cartQuery = useCartQuery(shopperEnabled);
  const wishlistQuery = useWishlistQuery(shopperEnabled);
  const ordersQuery = useOrdersQuery(shopperEnabled);
  const notificationsQuery = useNotificationsQuery(!!user);

  const refresh = () => invalidateShopQueries(client);

  const loginMut = useMutation({
    mutationFn: (data: { email: string; password: string }) => loginFn({ data }),
  });
  const registerMut = useMutation({
    mutationFn: (data: { name: string; email: string; password: string }) => registerFn({ data }),
  });
  const logoutMut = useMutation({
    mutationFn: () => logoutFn(),
    onSuccess: () => {
      client.setQueryData(queryKeys.session, { user: null });
      clearShopperQueries(client);
    },
  });

  const value = useMemo<ShopContextValue>(() => ({
    user,
    locale,
    price: (amountInInr) => formatPrice(amountInInr, locale.currency),
    loading: session.isLoading,
    cart: (cartQuery.data ?? []).map((row) => ({ slug: row.product.slug, qty: row.qty })),
    wishlist: (wishlistQuery.data ?? []).map((p) => p.slug),
    orders: ordersQuery.data ?? [],
    notifications: notificationsQuery.data ?? [],
    unread: (notificationsQuery.data ?? []).filter((n) => n.read === false).length,
    refresh,
    login: async (email, password) => {
      const res = await loginMut.mutateAsync({ email, password });
      if (res.ok) {
        client.setQueryData(queryKeys.session, { user: res.user });
        await refresh();
        return null;
      }
      return res.message;
    },
    register: async (name, email, password) => {
      const res = await registerMut.mutateAsync({ name, email, password });
      if (res.ok) {
        client.setQueryData(queryKeys.session, { user: res.user });
        await refresh();
        return null;
      }
      return res.message;
    },
    logout: async () => { await logoutMut.mutateAsync(); },
    toggleWishlist: async (slug) => { await toggleWishlistFn({ data: { slug } }); await refresh(); },
    addToCart: async (slug) => { await addToCartFn({ data: { slug } }); await refresh(); },
    removeFromCart: async (slug) => { await removeFromCartFn({ data: { slug } }); await refresh(); },
    placeOrder: async () => {
      const res = await placeOrderFn();
      await refresh();
      return res.ok;
    },
  }), [user, locale, session.isLoading, cartQuery.data, wishlistQuery.data, ordersQuery.data, notificationsQuery.data, client]);

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const context = useContext(ShopContext);
  if (context) return context;
  throw new Error('useShop must be used within ShopProvider');
}
