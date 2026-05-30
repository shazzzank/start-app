export default function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-xs uppercase tracking-[0.15em] text-neutral-400">
      {children}
    </p>
  );
}
