import { createFileRoute, Link } from '@tanstack/react-router';
import { SITENAME } from '@/app/constants';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <section className='hero'>
      <div className='hero-grid' aria-hidden='true' />
      <nav className='site-nav relative z-10'>
        <Link to='/' className='site-brand'>
          {SITENAME}<span>.</span>
        </Link>
        <Link to='/create/$entity' params={{ entity: 'user' }} className='nav-link'>
          Create
        </Link>
      </nav>
      <div className='hero-body'>
        <h1 className='hero-brand'>
          {SITENAME}<em>시작</em>
        </h1>
        <p className='hero-headline'>Quiet tools for clear records.</p>
        <p className='hero-lede'>
          Shape entities with calm focus — night teal, warm amber, room to breathe.
        </p>
        <div className='hero-actions'>
          <Link to='/create/$entity' params={{ entity: 'user' }} className='btn-primary'>
            Create user
          </Link>
          <a href='#flow' className='btn-ghost'>
            How it flows
          </a>
        </div>
        <span className='hero-rule' aria-hidden='true' />
      </div>
      <section id='flow' className='relative z-10 border-t border-highlight/80 px-6 py-16 md:px-10'>
        <div className='mx-auto max-w-6xl'>
          <h2 className='font-primary text-2xl md:text-3xl text-fg'>One path, one purpose</h2>
          <p className='mt-3 max-w-lg font-secondary text-muted leading-relaxed'>
            Open a form, enter what matters, save. Update later when the story changes.
          </p>
        </div>
      </section>
    </section>
  );
}
