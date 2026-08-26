import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  clearUserQueries, queryKeys, refreshQueries, useCartQuery,
  useNotificationsQuery, useOrdersQuery, useSessionQuery, useWishlistQuery,
} from '@/app/queries';
import { getSessionFn, loginFn, logoutFn, registerFn } from '@/app/api/auth';
import { addToCartFn, removeFromCartFn } from '@/app/api/cart';
import { getNotificationsFn } from '@/app/api/notifications';
import { getOrdersFn, placeOrderFn } from '@/app/api/orders';
import { toggleWishlistFn } from '@/app/api/wishlist';
import { formatPrice } from '@/app/lib/locale';
import type { Locale, User } from '@/app/types';

type SessionData = Awaited<ReturnType<typeof getSessionFn>>;

const defaultLocale: Locale = { country: 'IN', currency: 'INR' };
const emptyAssets = { fallback: '', fontPrimary: '', fontSecondary: '' };

type ShopContextValue = {
  user: User | null;
  locale: Locale;
  price: (amount: number) => string;
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

function setSessionUser(client: QueryClient, user: User | null) {
  client.setQueryData(queryKeys.session, (prev: SessionData | undefined) => ({
    user,
    locale: prev?.locale ?? defaultLocale,
    assets: prev?.assets ?? emptyAssets,
  }));
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const session = useSessionQuery();
  const user = session.data?.user ?? null;
  const locale = session.data?.locale ?? defaultLocale;
  const isCustomer = !!user && user.role !== 'admin';
  const cartQuery = useCartQuery(isCustomer);
  const wishlistQuery = useWishlistQuery(isCustomer);
  const ordersQuery = useOrdersQuery(isCustomer);
  const notificationsQuery = useNotificationsQuery(!!user);
  const refresh = () => refreshQueries(client);

  const loginMut = useMutation({
    mutationFn: (data: { email: string; password: string }) => loginFn({ data }),
  });
  const registerMut = useMutation({
    mutationFn: (data: { name: string; email: string; password: string }) => registerFn({ data }),
  });
  const logoutMut = useMutation({
    mutationFn: () => logoutFn(),
    onSuccess: () => {
      setSessionUser(client, null);
      clearUserQueries(client);
    },
  });

  const value = useMemo<ShopContextValue>(() => ({
    user,
    locale,
    price: (amount) => formatPrice(amount, locale.currency),
    loading: session.isLoading,
    cart: (cartQuery.data ?? []).map((row) => ({ slug: row.product.slug, qty: row.qty })),
    wishlist: (wishlistQuery.data ?? []).map((p) => p.slug),
    orders: ordersQuery.data ?? [],
    notifications: notificationsQuery.data ?? [],
    unread: (notificationsQuery.data ?? []).filter((n) => !n.read).length,
    refresh,
    login: async (email, password) => {
      const res = await loginMut.mutateAsync({ email, password });
      if (res.ok) {
        setSessionUser(client, res.user);
        await refresh();
        return null;
      }
      return res.message;
    },
    register: async (name, email, password) => {
      const res = await registerMut.mutateAsync({ name, email, password });
      if (res.ok) {
        setSessionUser(client, res.user);
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
