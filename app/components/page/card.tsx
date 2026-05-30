export default function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-xl rounded-[32px] bg-white p-8 shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
      {children}
    </div>
  );
}
