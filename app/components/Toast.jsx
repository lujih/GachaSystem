import { useEffect } from 'react';

const TOAST_COLORS = {
  success: 'bg-emerald-500 border-emerald-600',
  error: 'bg-red-500 border-red-600',
  info: 'bg-blue-500 border-blue-600',
};

export default function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl border-2 text-white text-sm font-medium shadow-lg animate-toast-in ${TOAST_COLORS[type] || TOAST_COLORS.info}`}>
      {message}
    </div>
  );
}
