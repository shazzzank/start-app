export default function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      {children}
    </div>
  );
}
