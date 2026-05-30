type Option = string | { lgd_code: number | string; name: string };

export default function Select({ options, placeholder, ...props }: {
  options: Option[]
  placeholder?: string
  [key: string]: any
}) {
  return (
    <select
      {...props}
      className='h-14 w-full rounded-2xl border border-neutral-200 bg-[#fafaf9] px-4 text-sm outline-none transition-all focus:border-black focus:bg-white'
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => {
        const value = typeof opt === 'string' ? opt : String(opt.lgd_code);
        const label = typeof opt === 'string' ? opt : opt.name;
        return <option key={value} value={value}>{label}</option>;
      })}
    </select>
  );
}
