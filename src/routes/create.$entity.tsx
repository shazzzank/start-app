import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import Toast from '@/app/components/toast';
import Form from '@/app/components/form';
import userSchema from '@/app/schema/user';
import { UserSelectType } from '@/app/types';
import { createEntityFn } from '@/app/api-helper';
import { toTitleCase } from '@/app/helper';

export const Route = createFileRoute('/create/$entity')({
  component: () => {
    const [toast, setToast] = useState({});
    const { entity } = Route.useParams();
    const navigate = useNavigate({ from: '/create/$entity' });
    const data: UserSelectType | null = null;

    async function onSubmit(data: any) {
      console.log(entity, ...data);
      return;
      const response = await createEntityFn({ data: { entity, ...data } });
      (response.status_code === 200) ? (
        navigate({ to: '/' })
      ) : (
        setToast({ message: 'Something went wrong. Please try later', error: true })
      );
    }

    return (
      <div className='flex flex-col gap-10 page-container center'>
        <h1 className='page-title'>
          Create {toTitleCase(entity)} Form
        </h1>
        <p>
          {`Add the details below to create a new ${entity}. You can update this information later if needed.`}
        </p>
        <Form schema={userSchema(data)} onSubmit={() => onSubmit} />
        <Toast toast={toast} setToast={setToast} />
      </div>
    );
  }
});
