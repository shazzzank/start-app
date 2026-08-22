import { Link } from '@tanstack/react-router';
import type { Product } from '@/app/types';
import Button from '@/app/components/button';
import Image from '@/app/components/image';
import { useShop } from '@/app/components/shop-provider';

export default function ProductCard({ product }: { product: Product }) {
  const { wishlist, toggleWishlist, addToCart, user, price } = useShop();
  const saved = wishlist.includes(product.slug);

  return (
    <article className='card'>
      <Link to='/products/$slug' params={{ slug: product.slug }} className='card-img'>
        <Image src={product.image} alt={product.name} />
      </Link>
      <div className='card-body'>
        <p className='cat'>{product.category}</p>
        <Link to='/products/$slug' params={{ slug: product.slug }} className='card-title'>{product.name}</Link>
        <p className='text text-sm'>{product.summary}</p>
        <div className='item !border-0 !py-0'>
          <span className='price'>{price(product.price)}</span>
          <div className='btns !mt-0'>
            {user && (
              <Button
                variant='outline'
                size='sm'
                onClick={() => toggleWishlist(product.slug)}
                aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
                aria-pressed={saved}
              >
                {saved ? 'Saved' : 'Save'}
              </Button>
            )}
            {user ? (
              <Button size='sm' onClick={() => addToCart(product.slug)} aria-label={`Add ${product.name} to cart`}>Add</Button>
            ) : (
              <Button size='sm' to='/login'>Sign in</Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
