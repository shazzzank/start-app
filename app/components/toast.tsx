import { useEffect, useRef } from 'react';
import { TostType } from '@/app/types';

export default function Toast({ toast, setToast }: TostType) {
  const toastRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    onCloseRef.current = toast.onClose ?? null;
  }, [toast.onClose]);

  useEffect(() => {
    if (toast.message) {
      toastRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });

      const timer = setTimeout(() => {
        setToast({});
        onCloseRef.current?.();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [toast.message, setToast]);

  const color = toast.success
    ? 'bg-green-50 text-green-800 border-green-800'
    : toast.error
      ? 'bg-red-100 text-red-800 border-red-800'
      : 'bg-gray-100 text-black border-gray-300';

  return toast.message ? (
    <div
      ref={toastRef}
      className={`mt-2 w-full rounded-md border p-3 px-5 text-base shadow-md ${color}`}
    >
      {toast.message}
    </div>
  ) : null;
}
