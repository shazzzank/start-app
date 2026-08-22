import type { ReactNode } from 'react';
import Nav from '@/app/components/nav';

export default function Page({
  className = '',
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={['page', className].filter(Boolean).join(' ')}>
      <a href='#main-content' className='skip-link'>Skip to main content</a>
      <Nav />
      {children}
    </div>
  );
}
