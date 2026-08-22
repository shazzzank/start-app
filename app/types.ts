export type UserRole = 'customer' | 'admin';

export type ProductCategory = 'Stationery' | 'Home' | 'Bags' | 'Wear';

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  summary: string;
  description: string;
  price: number;
  stock: number;
  image: string;
};

export type SeedProduct = {
  slug: string;
  name: string;
  category: ProductCategory;
  summary: string;
  description: string;
  price: number;
  stock: number;
  image: string;
};

export type ShopUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type ShopCurrency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'KRW' | 'AUD' | 'CAD' | 'SGD' | 'AED';

export type ShopLocale = {
  country: string;
  currency: ShopCurrency;
};

export type ProductSearch = {
  q: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  sort: 'price-asc' | 'price-desc' | 'name';
};

export type ProductListResult = {
  items: Product[];
  total: number;
  hasMore: boolean;
};

export type CategoryStat = {
  category: string;
  count: number;
  image: string;
};

export type OrderStatus = 'pending' | 'shipped' | 'delivered';

export type OrderItem = {
  slug: string;
  name: string;
  price: number;
  qty: number;
};

export type Order = {
  id: string;
  total: number;
  status: OrderStatus;
  createdAt: string;
  customer: string;
  items: OrderItem[];
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

export type ProductImageMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
