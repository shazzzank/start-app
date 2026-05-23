import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: () => <h2 className='bg-zinc-400'>Home</h2>,
});

