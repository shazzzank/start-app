import type { Product } from '@/app/types';
import { cloudinaryCloudName } from '@/app/constants';

export function resolveProductImageUrl(src: string) {
  if (src.startsWith('/products/')) {
    const publicId = `start${src.replace(/\.[^.]+$/, '')}`;
    return `https://res.cloudinary.com/${cloudinaryCloudName}/image/upload/f_auto,q_auto/${publicId}`;
  }
  return src;
}

export function isCloudinaryImageUrl(value: string) {
  return value.startsWith(`https://res.cloudinary.com/${cloudinaryCloudName}/`);
}

export function optimizeImageUrl(src: string, width = 900) {
  src = resolveProductImageUrl(src);
  if (isCloudinaryImageUrl(src) && !src.includes(',w_')) {
    return src.replace('/upload/', `/upload/f_auto,q_auto,w_${width},c_limit/`);
  }
  return src;
}

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
