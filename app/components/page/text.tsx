export default function Text({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-sm text-neutral-600">
      {children}
    </span>
  );
}
