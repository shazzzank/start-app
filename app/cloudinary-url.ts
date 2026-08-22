import { cloudinaryCloudName } from '@/app/constants';

function activeCloudName() {
  return process.env.CLOUDINARY_CLOUD_NAME ?? cloudinaryCloudName;
}

export function resolveProductImageUrl(src: string) {
  if (!src.startsWith('/products/')) return src;
  const cloudName = activeCloudName();
  if (!cloudName) return src;
  const publicId = `start${src.replace(/\.[^.]+$/, '')}`;
  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto/${publicId}`;
}

export function isCloudinaryImageUrl(value: string) {
  const cloudName = activeCloudName();
  return !!cloudName && value.startsWith(`https://res.cloudinary.com/${cloudName}/`);
}

export function optimizeImageUrl(src: string, width = 900) {
  src = resolveProductImageUrl(src);
  if (!isCloudinaryImageUrl(src) || src.includes(',w_')) return src;
  return src.replace('/upload/', `/upload/f_auto,q_auto,w_${width},c_limit/`);
}
