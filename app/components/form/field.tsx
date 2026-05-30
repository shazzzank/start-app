import Label from '@/app/components/form/label';

export default function Field({ label, children }: {
  label?: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-5">
      {label && (
        <Label>
          {label}
        </Label>
      )}
      {children}
    </div>
  );
}
