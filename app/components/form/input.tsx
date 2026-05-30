export default function Input(props: any) {
  return (
    <input
      {...props}
      className='h-14 w-full rounded-2xl border border-neutral-200 bg-[#fafaf9] px-4 text-sm outline-none transition-all focus:border-black focus:bg-white'
    />
  );
}
