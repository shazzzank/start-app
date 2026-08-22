import { useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import Toast from '@/app/components/toast';
import Form from '@/app/components/form';
import userSchema from '@/app/schema/user';
import { UserSelectType } from '@/app/types';
import { createEntityFn } from '@/app/api-helper';
import { toTitleCase } from '@/app/helper';
import { SITENAME } from '@/app/constants';

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
      <div className='create-shell'>
        <nav className='site-nav'>
          <Link to='/' className='site-brand'>
            {SITENAME}<span>.</span>
          </Link>
          <Link to='/' className='nav-link'>
            Home
          </Link>
        </nav>
        <div className='create-panel'>
          <p className='create-kicker'>새 항목 · New record</p>
          <h1 className='page-title'>
            Create {toTitleCase(entity)}
          </h1>
          <p className='create-lede'>
            {`Add the details below to create a new ${entity}. You can update this information later if needed.`}
          </p>
          <div className='create-form'>
            <Form schema={userSchema(data)} onSubmit={() => onSubmit} />
          </div>
          <Toast toast={toast} setToast={setToast} />
        </div>
      </div>
    );
  }
});
