import { useEffect, useRef, useState } from 'react';

export default function Toast({ toast, setToast }: {
  toast: any;
  setToast: any;
}) {
  const [v, setV] = useState(false);
  const toastRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    onCloseRef.current = typeof toast.onClose === 'function'
      ? toast.onClose
      : null;
  }, [toast]);

  useEffect(() => {
    (toast.message) ? setV(true) : setV(false);
  }, [toast.message]);

  useEffect(() => {
    if (!v) return;
    if (toastRef.current) {
      toastRef.current.scrollIntoView({ behavior: 'smooth', block: "center" });
    }
    const t = setTimeout(() => {
      setV(false);
      setToast({});
      if (onCloseRef.current) {
        onCloseRef.current();
      }
    }, 5000);
    return () => clearTimeout(t);
  }, [v, setToast]);

  if (!v || !toast.message) return null;

  return (
    <div
      ref={toastRef}
      className={`
        w-full p-3 px-5 rounded-md shadow-md text-base border
        ${toast.success
          ? 'bg-green-50 text-green-800 border-green-800'
          : toast.error
            ? 'bg-red-100 text-red-800 border-red-800'
            : 'bg-gray-100 text-black border-gray-300'
        }
        mt-2
      `}
    >
      {toast.message}
    </div>
  );
}
