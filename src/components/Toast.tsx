import React, { useEffect } from 'react';
import { CheckCircle2, X, AlertTriangle } from 'lucide-react';

export interface ToastMessage {
  id: number;
  message: string;
  tone?: 'success' | 'error';
}

export const Toast: React.FC<{ toast: ToastMessage; onClose: () => void }> = ({
  toast,
  onClose,
}) => {
  useEffect(() => {
    const timeout = window.setTimeout(onClose, 4000);
    return () => window.clearTimeout(timeout);
  }, [onClose, toast.id]);

  const Icon = toast.tone === 'error' ? AlertTriangle : CheckCircle2;
  return (
    <div
      role={toast.tone === 'error' ? 'alert' : 'status'}
      className="fixed left-4 right-4 top-[calc(env(safe-area-inset-top,0px)+1rem)] z-[100] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-zinc-700 bg-zinc-900 p-4 shadow-2xl"
    >
      <Icon className={toast.tone === 'error' ? 'h-5 w-5 text-rose-400' : 'h-5 w-5 text-emerald-400'} />
      <p className="flex-1 text-sm text-zinc-200">{toast.message}</p>
      <button onClick={onClose} className="touch-target rounded-xl text-zinc-400" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
