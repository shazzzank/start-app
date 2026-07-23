import { useState } from 'react';
import { createEntityFn } from '@/app/api-helper';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import Toast from '@/app/components/toast';
import Form from '@/app/components/form';
import userSchema from '@/app/schema/user';
import { UserFormDataType } from '@/app/types';

export const Route = createFileRoute('/create/$entity')({
  component: () => {
    const [toast, setToast] = useState({});
    const { entity } = Route.useParams();
    const navigate = useNavigate({ from: '/create/$entity' });
    const data: UserFormDataType = {
      name: '',
      email: '',
      phone: '',
      dob: '',
      gender: undefined,
      state_id: null,
      city_id: null,
      pincode: '',
      disability: false,
      role: undefined,
    };
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
        <Form schema={userSchema(data)} />
        <Toast toast={toast} setToast={setToast} />
        <button onSubmit={onSubmit}>Submit</button>
      </>
    );
  }
});
