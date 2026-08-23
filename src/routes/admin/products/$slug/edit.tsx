import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router';
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import Button from '@/app/components/button';
import Image from '@/app/components/image';
import Page from '@/app/components/page';
import { useShop } from '@/app/components/shop-provider';
import { productImageMaxBytes, productImageMimeTypes, pageHead } from '@/app/constants';
import { fileToBase64 } from '@/app/lib/utils';
import type { ProductImageMime } from '@/app/types';
import { getProductFn, removeProductImageFn, updateProductFn, uploadProductImageFn } from '@/app/api';

export const Route = createFileRoute('/admin/products/$slug/edit')({
  loader: async ({ params }) => {
    const product = await getProductFn({ data: { slug: params.slug } });
    if (product) return product;
    throw notFound();
  },
  head: ({ loaderData }) => pageHead({
    title: loaderData ? `Edit ${loaderData.name}` : 'Edit product',
    description: 'Edit product details in the Start admin dashboard.',
    path: loaderData ? `/admin/products/${loaderData.slug}/edit` : '/admin',
    noindex: true,
  }),
  component: EditProductPage,
});

function EditProductPage() {
  const product = Route.useLoaderData();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const { user, refresh } = useShop();
  const [name, setName] = useState(product.name);
  const [summary, setSummary] = useState(product.summary);
  const [description, setDescription] = useState(product.description);
  const [price, setPrice] = useState(String(product.price));
  const [stock, setStock] = useState(String(product.stock));
  const [image, setImage] = useState(product.image);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file && productImageMimeTypes.includes(file.type as ProductImageMime) && file.size <= productImageMaxBytes) {
      setError('');
      setUploading(true);
      try {
        const res = await uploadProductImageFn({
          data: {
            slug: product.slug,
            file: await fileToBase64(file),
            mime: file.type as ProductImageMime,
            currentImage: image,
          },
        });
        if (res.ok) {
          setImage(res.url);
          return;
        }
        setError(res.message ?? 'Upload failed.');
      } catch {
        setError('Upload failed.');
      } finally {
        setUploading(false);
      }
      return;
    }
    file && !productImageMimeTypes.includes(file.type as ProductImageMime) && setError('Use JPEG, PNG, WebP, or GIF.');
    file && file.size > productImageMaxBytes && setError('Image must be 5 MB or less.');
  }

  async function onRemoveImage() {
    setError('');
    setUploading(true);
    try {
      const res = await removeProductImageFn({ data: { slug: product.slug, image } });
      if (res.ok) {
        setImage(res.url);
        return;
      }
      setError(res.message ?? 'Could not remove image.');
    } catch {
      setError('Could not remove image.');
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const res = await updateProductFn({
      data: {
        slug: product.slug,
        name,
        summary,
        description,
        price: Number(price),
        stock: Number(stock),
        image,
      },
    });
    if (res.ok) {
      await refresh();
      navigate({ to: '/admin' });
      return;
    }
    setError('Could not save product.');
  }

  if (user?.role === 'admin') {
    return (
      <Page>
        <main className='main' id='main-content'>
          <div className='wrap max-w-2xl'>
            <div className='head'>
              <p className='tag'>Edit product</p>
              <h1 className='h2'>{product.name}</h1>
            </div>
            <form className='form' onSubmit={onSubmit} aria-label={`Edit ${product.name}`}>
              <div className='column gap-1'>
                <label htmlFor='edit-name' className='label'>Name</label>
                <input id='edit-name' className='field' value={name} onChange={(e) => setName(e.target.value)} required autoComplete='off' aria-invalid={!!error} />
              </div>
              <div className='column gap-1'>
                <label htmlFor='edit-summary' className='label'>Summary</label>
                <input id='edit-summary' className='field' value={summary} onChange={(e) => setSummary(e.target.value)} required />
              </div>
              <div className='column gap-1'>
                <label htmlFor='edit-description' className='label'>Description</label>
                <textarea id='edit-description' className='field min-h-28' value={description} onChange={(e) => setDescription(e.target.value)} required />
              </div>
              <div className='column gap-1'>
                <label htmlFor='edit-price' className='label'>Base price (INR)</label>
                <input id='edit-price' className='field' value={price} onChange={(e) => setPrice(e.target.value)} inputMode='numeric' required />
              </div>
              <div className='column gap-1'>
                <label htmlFor='edit-stock' className='label'>Stock</label>
                <input id='edit-stock' className='field' value={stock} onChange={(e) => setStock(e.target.value)} inputMode='numeric' required />
              </div>
              <div className='column gap-1'>
                <span className='label' id='edit-image-label'>Product photo</span>
                <div className='detail-img max-w-xs' aria-labelledby='edit-image-label'>
                  <Image src={image} alt={name} loading='eager' />
                </div>
                <input
                  ref={fileRef}
                  id='edit-image'
                  type='file'
                  className='sr-only'
                  accept='image/jpeg,image/png,image/webp,image/gif'
                  onChange={onFileChange}
                  disabled={uploading}
                />
                <div className='btns !mt-0'>
                  <Button type='button' variant='outline' size='sm' onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? 'Uploading…' : 'Upload photo'}
                  </Button>
                  <Button type='button' variant='outline' size='sm' onClick={onRemoveImage} disabled={uploading}>Remove photo</Button>
                </div>
              </div>
              {error && <p id='edit-error' className='text-red text-sm' role='alert'>{error}</p>}
              <div className='btns !mt-0'>
                <Button type='submit' disabled={uploading}>Save changes</Button>
                <Button variant='outline' to='/admin'>Cancel</Button>
              </div>
            </form>
          </div>
        </main>
      </Page>
    );
  }

  return <Page><main className='main' id='main-content'><div className='wrap'><p className='desc'>Admin access required.</p></div></main></Page>;
}
