import { useState } from 'react';
import { saveUserFn } from '@/app/api-helper';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import Toast from '@/app/components/toast';

export const Route = createFileRoute('/create/quiz')({
  component: () => {
    const [toast, setToast] = useState({});
    const navigate = useNavigate({ from: '/create/quiz' });
    async function onSubmit() {
      const payload = {
        "mb_user_id": 1024,
        "mb_org_id": 12,
        "email": "rahul.sharma@example.com",
        "phone": "9876543210",
        "dob": "1998-06-15",
        "name": "Rahul Sharma",
        "gender": "male",
        "demographic_status": "urban",
        "state_id": 7,
        "city_id": 101,
        "ulb_id": 45,
        "block_id": null,
        "village_id": null,
        "gram_panchayat_id": null,
        "pincode": "110001",
        "is_divyang": false,
        "role": "player"
      };
      const response = await saveUserFn({ data: payload });
      (response.status_code === 200) ? (
        navigate({ to: '/' })
      ) : setToast({ message: 'Something went wrong. Please try later', error: true });
    }
    return (
      <>
        <Toast toast={toast} setToast={setToast} />
        <h2 className='bg-zinc-400'>Home</h2>
        <button type='button' onClick={onSubmit}>Create</button>
      </>
    );
  }
});

