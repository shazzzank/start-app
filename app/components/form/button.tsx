export default function Button({ children, onClick }: { children: React.ReactNode, onClick: () => void }) {
  return (
    <button
      className="mt-4 h-14 w-full rounded-2xl bg-black text-sm font-medium text-white transition-all hover:opacity-90"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
