import { useState } from 'react';
import { saveUserFn } from '@/app/api-helper';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import Toast from '@/app/components/toast';
import Form from '@/app/components/form';

export const Route = createFileRoute('/create/user')({
  component: () => {
    const [toast, setToast] = useState({});
    const navigate = useNavigate({ from: '/create/user' });

    async function onSubmit(data: any) {
      const response = await saveUserFn({ data: { ...data, mb_user_id: 1024, mb_org_id: 12 } });
      (response.status_code === 200) ? (
        navigate({ to: '/' })
      ) : (
        setToast({ message: 'Something went wrong. Please try later', error: true })
      );
    }

    return (
      <>
        <Toast toast={toast} setToast={setToast} />
        <Form onSubmit={onSubmit} />
      </>
    );
  }
});

