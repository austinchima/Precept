import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  title?: string;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

const DISMISS_AFTER_MS = 5000;

const ICONS: Record<ToastVariant, { icon: React.ReactNode; tone: string }> = {
  success: { icon: <CheckCircle2 size={16} />, tone: 'text-accent-text' },
  error: { icon: <XCircle size={16} />, tone: 'text-danger' },
  warning: { icon: <AlertTriangle size={16} />, tone: 'text-warning' },
  info: { icon: <Info size={16} />, tone: 'text-fg-2' },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const reduce = useReducedMotion();
  const { icon, tone } = ICONS[toast.variant];
  return (
    <motion.div
      layout={!reduce}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      role={toast.variant === 'error' ? 'alert' : 'status'}
      className="pointer-events-auto flex w-[min(92vw,360px)] items-start gap-3 rounded-xl border border-line bg-surface-1 px-4 py-3 shadow-[0_16px_40px_-16px_rgb(0_0_0/0.45)]"
    >
      <span className={`mt-0.5 ${tone}`} aria-hidden="true">{icon}</span>
      <div className="min-w-0 flex-1">
        {toast.title && <p className="text-[13.5px] font-medium text-fg">{toast.title}</p>}
        <p className="text-[13px] leading-relaxed text-fg-2">{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="-mr-1 grid h-6 w-6 place-items-center rounded-md text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = 'info', title?: string) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev.slice(-3), { id, message, variant, title }]);
      timers.current.set(id, setTimeout(() => dismiss(id), DISMISS_AFTER_MS));
    },
    [dismiss]
  );

  const success = useCallback((msg: string, title?: string) => toast(msg, 'success', title), [toast]);
  const error = useCallback((msg: string, title?: string) => toast(msg, 'error', title), [toast]);
  const info = useCallback((msg: string, title?: string) => toast(msg, 'info', title), [toast]);
  const warning = useCallback((msg: string, title?: string) => toast(msg, 'warning', title), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warning }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[80] flex flex-col items-end gap-2" aria-live="polite">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
