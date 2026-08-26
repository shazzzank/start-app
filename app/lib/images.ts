function cloudName() {
  return process.env.CLOUDINARY_CLOUD_NAME ?? '';
}

export function resolveProductImageUrl(src: string) {
  const name = cloudName();
  if (src.startsWith('/products/') && name) {
    const publicId = `start${src.replace(/\.[^.]+$/, '')}`;
    return `https://res.cloudinary.com/${name}/image/upload/f_auto,q_auto/${publicId}`;
  }
  return src;
}

export function isCloudinaryImageUrl(value: string) {
  const name = cloudName();
  return !!name && value.startsWith(`https://res.cloudinary.com/${name}/`);
}

export function optimizeImageUrl(src: string, width = 900) {
  src = resolveProductImageUrl(src);
  if (isCloudinaryImageUrl(src) && !src.includes(',w_')) {
    return src.replace('/upload/', `/upload/f_auto,q_auto,w_${width},c_limit/`);
  }
  return src;
}
