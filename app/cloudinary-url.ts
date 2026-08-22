import { cloudinaryCloudName } from '@/app/constants';

export function isCloudinaryImageUrl(value: string) {
  return !!cloudinaryCloudName
    && value.startsWith(`https://res.cloudinary.com/${cloudinaryCloudName}/`);
}

export function optimizeImageUrl(src: string, width = 900) {
  if (!isCloudinaryImageUrl(src) || src.includes(',w_')) return src;
  return src.replace('/upload/', `/upload/f_auto,q_auto,w_${width},c_limit/`);
}
