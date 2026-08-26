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

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'KRW' | 'AUD' | 'CAD' | 'SGD' | 'AED';

export type Locale = {
  country: string;
  currency: Currency;
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

export type OrderStatus = 'pending' | 'shipped' | 'delivered';

export type ProductImageMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
