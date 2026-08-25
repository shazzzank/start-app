import { useEffect, useState, type FormEvent } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import Button from '@/app/components/button';
import Page from '@/app/components/page';
import { useShop } from '@/app/components/shop-provider';
import { pageHead } from '@/app/constants';

export const Route = createFileRoute('/login')({
  head: () => pageHead({
    title: 'Sign in',
    description: 'Sign in or create a Start account to save favourites, cart, and orders.',
    path: '/login',
    noindex: true,
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, login, register } = useShop();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (user) navigate({ to: '/' });
  }, [user, navigate]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const message = mode === 'login'
      ? await login(email, password)
      : await register(name, email, password);
    if (!message) {
      navigate({ to: '/' });
      return;
    }
    setError(message);
  }

  return (
    <Page>
      <main className='main' id='main-content'>
        <div className='wrap'>
          <div className='head'>
            <h1 className='h2'>Welcome back</h1>
            <p className='desc'>Sign in with your email and password, or create a new account.</p>
          </div>
          <div className='panel'>
            <div className='tabs' role='tablist' aria-label='Account type'>
              <button
                type='button'
                role='tab'
                id='tab-login'
                className={`tab ${mode === 'login' ? 'tab-on' : ''}`}
                aria-selected={mode === 'login'}
                aria-controls='auth-panel'
                onClick={() => setMode('login')}
              >
                Login
              </button>
              <button
                type='button'
                role='tab'
                id='tab-register'
                className={`tab ${mode === 'register' ? 'tab-on' : ''}`}
                aria-selected={mode === 'register'}
                aria-controls='auth-panel'
                onClick={() => setMode('register')}
              >
                Register
              </button>
            </div>
            <form className='form' onSubmit={onSubmit} id='auth-panel' role='tabpanel' aria-labelledby={mode === 'login' ? 'tab-login' : 'tab-register'}>
              {mode === 'register' && (
                <div className='column gap-1'>
                  <label htmlFor='name' className='label'>Name</label>
                  <input id='name' className='field' value={name} onChange={(e) => setName(e.target.value)} placeholder='Your name' autoComplete='name' required aria-invalid={!!error} aria-describedby={error ? 'auth-error' : undefined} />
                </div>
              )}
              <div className='column gap-1'>
                <label htmlFor='email' className='label'>Email</label>
                <input
                  id='email'
                  type='email'
                  className='field'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder='you@email.com'
                  autoComplete='email'
                  required
                  aria-invalid={!!error}
                  aria-describedby={error ? 'auth-error' : undefined}
                />
              </div>
              <div className='column gap-1'>
                <label htmlFor='password' className='label'>Password</label>
                <input
                  id='password'
                  type='password'
                  className='field'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'At least 8 characters with mixed case, number, symbol' : 'Your password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  minLength={mode === 'register' ? 8 : undefined}
                  aria-invalid={!!error}
                  aria-describedby={error ? 'auth-error' : undefined}
                />
              </div>
              {error && <p id='auth-error' className='text-red text-sm' role='alert'>{error}</p>}
              <Button type='submit' analytics={mode === 'login' ? 'sign_in' : 'create_account'}>{mode === 'login' ? 'Sign in' : 'Create account'}</Button>
            </form>
          </div>
        </div>
      </main>
    </Page>
  );
}
