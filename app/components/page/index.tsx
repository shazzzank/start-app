export default function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f5f3] flex items-center justify-center p-6">
      {children}
    </div>
  );
}
