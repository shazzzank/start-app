import { createFileRoute } from '@tanstack/react-router';
import Button from '@/app/components/button';
import Page from '@/app/components/page';

export const Route = createFileRoute('/create/$entity')({
  component: () => (
    <Page>
      <main className='main' id='main-content'>
        <div className='wrap'>
          <div className='head'>
            <h1 className='h2'>Use registration instead</h1>
            <p className='desc'>New accounts are created through the sign-up form and stored in PostgreSQL.</p>
          </div>
          <Button to='/login'>Go to sign up</Button>
        </div>
      </main>
    </Page>
  ),
});
