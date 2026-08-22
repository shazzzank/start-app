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
    ? 'bg-highlight text-green border-green'
    : toast.error
      ? 'bg-highlight text-red border-red'
      : 'bg-surface text-fg border-highlight';

  return toast.message ? (
    <div
      ref={toastRef}
      className={`mt-6 w-full rounded-sm border p-3 px-5 text-base ${color}`}
    >
      {toast.message}
    </div>
  ) : null;
}
