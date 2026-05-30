import { useState } from 'react';
import Button from '@/app/components/form/button';
import Checkbox from '@/app/components/form/checkbox';
import Field from '@/app/components/form/field';
import Input from '@/app/components/form/input';
import Select from '@/app/components/form/select';
import Toast from '@/app/components/toast';
import Card from '@/app/components/page/card';
import Grid from '@/app/components/page/grid';
import Header from '@/app/components/page/header';
import Page from '@/app/components/page/index';
import { useStates, useDistricts, useBlocks, useUlbs, useVillages, useGramPanchayats } from '@/app/queries/index';
import { UserFormData, userFormSchema } from '@/app/db-schema';

export default function Form(props: { onSubmit: (data: UserFormData) => void }) {
  const [data, setData] = useState({
    name: '', email: '', phone: '', dob: '',
    gender: '', demographic_status: '', pincode: '',
    role: '', is_divyang: false,
    state_id: '', district_id: '', block_id: '',
    ulb_id: '', village_id: '', gram_panchayat_id: '',
  });
  const [toast, setToast] = useState<{ message?: string; error?: boolean }>({});
  const { data: states = [] } = useStates();
  const { data: filteredDistricts = [] } = useDistricts(Number(data.state_id ?? 0));
  const { data: filteredBlocks = [] } = useBlocks(Number(data.district_id ?? 0));
  const { data: filteredUlbs = [] } = useUlbs(Number(data.district_id ?? 0));
  const { data: filteredVillages = [] } = useVillages(Number(data.block_id ?? 0));
  const { data: filteredGramPanchayats = [] } = useGramPanchayats(Number(data.block_id ?? 0));

  const cascadeResets: Partial<Record<string, (keyof typeof data)[]>> = {
    state_id: ['district_id', 'block_id', 'ulb_id', 'village_id', 'gram_panchayat_id'],
    district_id: ['block_id', 'ulb_id', 'village_id', 'gram_panchayat_id'],
    block_id: ['village_id', 'gram_panchayat_id'],
    demographic_status: ['block_id', 'ulb_id', 'village_id', 'gram_panchayat_id'],
  };

  function onChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    const resets = Object.fromEntries((cascadeResets[name] ?? []).map(k => [k, '']));
    setData({ ...data, [name]: val, ...resets });
  }
  function onSubmit() {
    const result = userFormSchema.safeParse(data);
    (result.success) ? (
      props.onSubmit(result.data)
    ) : (
      setToast({ message: result.error.issues[0].message, error: true })
    )
  }

  return (
    <Page>
      <Card>
        <Header />
        <div>
          <Field label="Full Name">
            <Input
              type="text"
              name="name"
              placeholder="Enter full name"
              value={data.name}
              onChange={onChange}
            />
          </Field>
          <Grid>
            <Field label="Email">
              <Input
                type="email"
                name="email"
                placeholder="Enter email"
                value={data.email}
                onChange={onChange}
              />
            </Field>
            <Field label="Phone">
              <Input
                type="tel"
                name="phone"
                placeholder="Enter phone number"
                value={data.phone}
                onChange={onChange}
              />
            </Field>
          </Grid>
          <Grid>
            <Field label="Date of Birth">
              <Input
                type="date"
                name="dob"
                value={data.dob}
                onChange={onChange}
              />
            </Field>
            <Field label="Gender">
              <Select
                options={['Select gender', 'Male', 'Female', 'Other']}
                name="gender"
                value={data.gender}
                onChange={onChange}
              />
            </Field>
          </Grid>
          <Grid>
            <Field label="Demographic Status">
              <Select
                options={['Select status', 'Urban', 'Rural']}
                name="demographic_status"
                value={data.demographic_status}
                onChange={onChange}
              />
            </Field>
            <Field label="Pincode">
              <Input
                type="text"
                name="pincode"
                placeholder="Enter pincode"
                value={data.pincode}
                onChange={onChange}
              />
            </Field>
          </Grid>
          <Grid>
            <Field label="State">
              <Select
                name="state_id"
                placeholder="Select state"
                options={states}
                value={data.state_id}
                onChange={onChange}
              />
            </Field>
            <Field label="District">
              <Select
                name="district_id"
                placeholder="Select district"
                options={filteredDistricts}
                value={data.district_id}
                onChange={onChange}
              />
            </Field>
          </Grid>
          {data.demographic_status === 'Urban' && (
            <Field label="Urban Local Body (ULB)">
              <Select
                name="ulb_id"
                placeholder="Select ULB"
                options={filteredUlbs}
                value={data.ulb_id}
                onChange={onChange}
              />
            </Field>
          )}
          {data.demographic_status === 'Rural' && (
            <>
              <Field label="Block">
                <Select
                  name="block_id"
                  placeholder="Select block"
                  options={filteredBlocks}
                  value={data.block_id}
                  onChange={onChange}
                />
              </Field>
              <Grid>
                <Field label="Village">
                  <Select
                    name="village_id"
                    placeholder="Select village"
                    options={filteredVillages}
                    value={data.village_id}
                    onChange={onChange}
                  />
                </Field>
                <Field label="Gram Panchayat">
                  <Select
                    name="gram_panchayat_id"
                    placeholder="Select gram panchayat"
                    options={filteredGramPanchayats}
                    value={data.gram_panchayat_id}
                    onChange={onChange}
                  />
                </Field>
              </Grid>
            </>
          )}
          <Field label="Role">
            <Select
              options={['Select role', 'Player', 'Admin', 'Coach']}
              name="role"
              value={data.role}
              onChange={onChange}
            />
          </Field>
          <Field>
            <Checkbox
              name="is_divyang"
              checked={data.is_divyang}
              onChange={onChange}
            >
              Person with disability (Divyang)
            </Checkbox>
          </Field>
          <Toast toast={toast} setToast={setToast} />
          <Button onClick={onSubmit}>Create Account</Button>
        </div>
      </Card>
    </Page>
  );
}
