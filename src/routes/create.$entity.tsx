import { useState } from 'react';
import { createEntityFn } from '@/app/api-helper';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import Toast from '@/app/components/toast';

export const Route = createFileRoute('/create/$entity')({
  component: () => {
    const [toast, setToast] = useState({});
    const { entity } = Route.useParams();
    const navigate = useNavigate({ from: '/create/user' });

    async function onSubmit(data: any) {
      const response = await createEntityFn({ data: { entity, ...data } });
      (response.status_code === 200) ? (
        navigate({ to: '/' })
      ) : (
        setToast({ message: 'Something went wrong. Please try later', error: true })
      );
    }

    return (
      <>
        <Toast toast={toast} setToast={setToast} />
        <button onSubmit={onSubmit}>Submit</button>
      </>
    );
  }
});

