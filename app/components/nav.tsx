import { Link, useNavigate, useParams, useRouterState } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { siteName } from '@/app/constants';
import { useShop } from '@/app/components/shop-provider';

const shopLink = { to: '/products', label: 'Shop' } as const;
const customerLinks = [
  { to: '/orders', label: 'Orders' },
  { to: '/wishlist', label: 'Wishlist' },
] as const;

type Crumb = { to?: string; label: string };

const staticLabels: Record<string, string> = {
  '/account': 'Account',
  '/admin': 'Dashboard',
  '/login': 'Login',
  '/notifications': 'Alerts',
  '/orders': 'Orders',
  '/wishlist': 'Wishlist',
};

function slugLabel(slug: string) {
  return slug.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function buildBreadcrumbs(pathname: string, params: Record<string, string | undefined>): Crumb[] {
  if (pathname === '/') return [];
  const crumbs: Crumb[] = [{ to: '/', label: 'Home' }];
  if (pathname.startsWith('/products/') && params.slug) {
    crumbs.push({ to: '/products', label: 'Shop' }, { label: slugLabel(params.slug) });
    return crumbs;
  }
  if (pathname === '/products' || pathname === '/products/') {
    crumbs.push({ label: 'Shop' });
    return crumbs;
  }
  if (pathname.startsWith('/admin/products/') && params.slug && pathname.endsWith('/edit')) {
    crumbs.push(
      { to: '/admin', label: 'Dashboard' },
      { to: '/products/$slug', label: slugLabel(params.slug) },
      { label: 'Edit' },
    );
    return crumbs;
  }
  const label = staticLabels[pathname.replace(/\/$/, '')] ?? staticLabels[pathname];
  label && crumbs.push({ label });
  return crumbs;
}

export default function Nav() {
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, wishlist, orders, unread, loading, logout } = useShop();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const params = useParams({ strict: false });
  const crumbs = buildBreadcrumbs(pathname, params);

  useEffect(() => {
    if (menuOpen) {
      const close = (event: MouseEvent) => {
        menuRef.current && !menuRef.current.contains(event.target as Node) && setMenuOpen(false);
      };
      document.addEventListener('mousedown', close);
      return () => document.removeEventListener('mousedown', close);
    }
  }, [menuOpen]);

  const linkLabel = (label: string, count?: number) => count && count > 0 ? `${label}, ${count} items` : label;
  const navLinks = user?.role === 'admin' ? [shopLink] : user ? [shopLink, ...customerLinks] : [shopLink];

  return (
    <nav className='nav' aria-label='Main'>
      <Link to='/' className='logo' aria-label={`${siteName} home`}>{siteName}<span aria-hidden='true'>.</span></Link>
      {!!crumbs.length && (
        <nav className='nav-crumb' aria-label='Breadcrumb'>
          <ol className='crumb-list'>
            {crumbs.map((crumb, index) => {
              const last = index === crumbs.length - 1;
              return (
                <li key={`${crumb.label}-${index}`} className='crumb-item'>
                  {index > 0 && <span className='crumb-sep' aria-hidden='true'>/</span>}
                  {!last && crumb.to ? (
                    <Link to={crumb.to} params={crumb.to === '/products/$slug' ? { slug: params.slug! } : undefined} className='crumb-link'>{crumb.label}</Link>
                  ) : (
                    <span className='crumb-current' aria-current={last ? 'page' : undefined}>{crumb.label}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}
      <div className='nav-links'>
        {navLinks.map((item) => {
          const count = item.to === '/orders' ? orders.length : item.to === '/wishlist' ? wishlist.length : 0;
          return (
            <Link key={item.to} to={item.to} className='link' aria-label={linkLabel(item.label, count)}>
              {item.label}
              {count > 0 && <span className='badge' aria-hidden='true'>{count}</span>}
            </Link>
          );
        })}
        {!loading && !user && <Link to='/login' className='link'>Login</Link>}
        {!loading && user && (
          <div className='nav-menu' ref={menuRef}>
            <button
              type='button'
              className='link nav-menu-trigger'
              aria-expanded={menuOpen}
              aria-haspopup='menu'
              onClick={() => setMenuOpen((open) => !open)}
            >
              Account
              {unread > 0 && <span className='badge' aria-hidden='true'>{unread}</span>}
            </button>
            {menuOpen && (
              <div className='nav-menu-panel' role='menu'>
                {user.role !== 'admin' && (
                  <Link to='/account' className='nav-menu-item' role='menuitem' onClick={() => setMenuOpen(false)}>Account</Link>
                )}
                {user.role !== 'admin' && (
                  <Link
                    to='/notifications'
                    className='nav-menu-item'
                    role='menuitem'
                    aria-label={unread > 0 ? `Alerts, ${unread} unread` : 'Alerts'}
                    onClick={() => setMenuOpen(false)}
                  >
                    Alerts
                    {unread > 0 && <span className='badge' aria-hidden='true'>{unread}</span>}
                  </Link>
                )}
                {user.role === 'admin' && (
                  <Link to='/admin' className='nav-menu-item' role='menuitem' onClick={() => setMenuOpen(false)}>Dashboard</Link>
                )}
                <button
                  type='button'
                  className='nav-menu-item'
                  role='menuitem'
                  onClick={async () => {
                    setMenuOpen(false);
                    await logout();
                    navigate({ to: '/' });
                  }}
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
