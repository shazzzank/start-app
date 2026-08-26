import { useEffect, useState, type ComponentProps } from 'react';
import { optimizeImageUrl } from '@/app/lib/images';

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
  const [url, setUrl] = useState(() => (src?.trim() ? optimizeImageUrl(src.trim()) : ''));
  useEffect(() => { setUrl(src?.trim() ? optimizeImageUrl(src.trim()) : ''); }, [src]);
  if (!url) return null;
  return (
    <img
      {...props}
      src={url}
      alt={decorative ? '' : alt}
      className={className}
      loading={loading}
      decoding='async'
      onError={() => setUrl('')}
    />
  );
}
