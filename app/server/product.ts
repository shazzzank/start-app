import type { Product } from '@/app/types';
import { resolveProductImageUrl } from '@/app/lib/images';

export function mapProduct(row: {
  id: string;
  slug: string;
  name: string;
  category: string;
  summary: string;
  description: string;
  price: number;
  stock: number;
  image: string;
}): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    summary: row.summary,
    description: row.description,
    price: row.price,
    stock: row.stock,
    image: resolveProductImageUrl(row.image),
  };
}
