import { useEffect, useState, type ComponentProps } from 'react';
import { fallbackImage } from '@/app/constants';
import { optimizeImageUrl } from '@/app/cloudinary-url';

type Props = {
  src?: string | null;
  alt: string;
  decorative?: boolean;
  className?: string;
  loading?: 'lazy' | 'eager';
} & Omit<ComponentProps<'img'>, 'src' | 'alt' | 'loading'>;

export default function Image({
  src,
  alt,
  decorative = false,
  className = '',
  loading = 'lazy',
  ...props
}: Props) {
  const [url, setUrl] = useState(optimizeImageUrl(src?.trim() || fallbackImage));
  useEffect(() => { setUrl(optimizeImageUrl(src?.trim() || fallbackImage)); }, [src]);
  return (
    <img
      {...props}
      src={url}
      alt={decorative ? '' : alt}
      className={className}
      loading={loading}
      decoding='async'
      onError={() => url !== fallbackImage && setUrl(fallbackImage)}
    />
  );
}
