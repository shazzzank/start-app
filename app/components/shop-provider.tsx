import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  addToCartFn, getCartFn, getLocaleFn, getNotificationsFn, getOrdersFn, getSessionFn, getWishlistFn,
  loginFn, logoutFn, placeOrderFn, registerFn, removeFromCartFn, toggleWishlistFn,
} from '@/app/shop-api';
import { formatPrice } from '@/app/locale';
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
  const session = useQuery({ queryKey: ['session'], queryFn: () => getSessionFn() });
  const localeQuery = useQuery({
    queryKey: ['locale'],
    queryFn: () => getLocaleFn(),
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
  const user = session.data?.user ?? null;
  const locale = localeQuery.data ?? { country: 'IN', currency: 'INR' as ShopCurrency };
  const shopperEnabled = !!user && user.role !== 'admin';
  const notificationsEnabled = !!user;

  const cartQuery = useQuery({ queryKey: ['cart'], queryFn: () => getCartFn(), enabled: shopperEnabled });
  const wishlistQuery = useQuery({ queryKey: ['wishlist'], queryFn: () => getWishlistFn(), enabled: shopperEnabled });
  const ordersQuery = useQuery({ queryKey: ['orders'], queryFn: () => getOrdersFn(), enabled: shopperEnabled });
  const notificationsQuery = useQuery({ queryKey: ['notifications'], queryFn: () => getNotificationsFn(), enabled: notificationsEnabled });

  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['session'] }),
      client.invalidateQueries({ queryKey: ['cart'] }),
      client.invalidateQueries({ queryKey: ['wishlist'] }),
      client.invalidateQueries({ queryKey: ['orders'] }),
      client.invalidateQueries({ queryKey: ['notifications'] }),
      client.invalidateQueries({ queryKey: ['products'] }),
      client.invalidateQueries({ queryKey: ['admin-products'] }),
      client.invalidateQueries({ queryKey: ['admin-stats'] }),
      client.invalidateQueries({ queryKey: ['admin-users'] }),
    ]);
  };

  const loginMut = useMutation({
    mutationFn: (data: { email: string; password: string }) => loginFn({ data }),
  });
  const registerMut = useMutation({
    mutationFn: (data: { name: string; email: string; password: string }) => registerFn({ data }),
  });
  const logoutMut = useMutation({
    mutationFn: () => logoutFn(),
    onSuccess: () => {
      client.setQueryData(['session'], { user: null });
      client.removeQueries({ queryKey: ['cart'] });
      client.removeQueries({ queryKey: ['wishlist'] });
      client.removeQueries({ queryKey: ['orders'] });
      client.removeQueries({ queryKey: ['notifications'] });
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
    unread: (notificationsQuery.data ?? []).filter((n) => !n.read).length,
    refresh,
    login: async (email, password) => {
      const res = await loginMut.mutateAsync({ email, password });
      if (!res.ok) return res.message;
      client.setQueryData(['session'], { user: res.user });
      await refresh();
      return null;
    },
    register: async (name, email, password) => {
      const res = await registerMut.mutateAsync({ name, email, password });
      if (!res.ok) return res.message;
      client.setQueryData(['session'], { user: res.user });
      await refresh();
      return null;
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
  if (!context) throw new Error('useShop must be used within ShopProvider');
  return context;
}
