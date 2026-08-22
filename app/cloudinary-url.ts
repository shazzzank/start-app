import { cloudinaryCloudName } from '@/app/constants';

export function isCloudinaryImageUrl(value: string) {
  return !!cloudinaryCloudName
    && value.startsWith(`https://res.cloudinary.com/${cloudinaryCloudName}/`);
}

export function optimizeImageUrl(src: string, width = 900) {
  if (src.startsWith('/products/') && cloudinaryCloudName) {
    const publicId = `start${src.replace(/\.[^.]+$/, '')}`;
    src = `https://res.cloudinary.com/${cloudinaryCloudName}/image/upload/f_auto,q_auto/${publicId}`;
  }
  if (!isCloudinaryImageUrl(src) || src.includes(',w_')) return src;
  return src.replace('/upload/', `/upload/f_auto,q_auto,w_${width},c_limit/`);
}
