import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const DISMISS_AFTER_MS = 5000;

const VARIANT_CONFIG: Record<
  ToastVariant,
  { Icon: React.ElementType; border: string; iconColor: string; bg: string; titleColor: string }
> = {
  success: {
    Icon: CheckCircle,
    border: 'border-[#4ade80]/40',
    iconColor: 'text-[#4ade80]',
    bg: 'bg-[#4ade80]/5',
    titleColor: 'text-[#4ade80]',
  },
  error: {
    Icon: XCircle,
    border: 'border-[#f87171]/40',
    iconColor: 'text-[#f87171]',
    bg: 'bg-[#f87171]/5',
    titleColor: 'text-[#f87171]',
  },
  warning: {
    Icon: AlertTriangle,
    border: 'border-[#fbbf24]/40',
    iconColor: 'text-[#fbbf24]',
    bg: 'bg-[#fbbf24]/5',
    titleColor: 'text-[#fbbf24]',
  },
  info: {
    Icon: Info,
    border: 'border-brand-primary/40',
    iconColor: 'text-brand-primary',
    bg: 'bg-brand-primary/5',
    titleColor: 'text-brand-primary',
  },
};

// ─── Individual Toast Item ────────────────────────────────────────────────────

interface ToastItemProps {
  key?: React.Key;
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const { Icon, border, iconColor, bg, titleColor } = VARIANT_CONFIG[toast.variant];
  const defaultTitle: Record<ToastVariant, string> = {
    success: 'Success',
    error: 'Something went wrong',
    warning: 'Warning',
    info: 'Info',
  };

  return (
    <div
      className={`
        flex items-start gap-3 w-full max-w-sm p-4 rounded-lg border shadow-2xl
        ${bg} ${border}
        bg-brand-surface
        backdrop-blur-sm
        animate-toast-in
        pointer-events-auto
      `}
      role="alert"
      aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
    >
      <Icon
        size={18}
        className={`${iconColor} mt-0.5 shrink-0`}
        aria-hidden="true"
      />

      <div className="flex-1 min-w-0">
        <p className={`text-xs font-mono font-semibold uppercase tracking-widest mb-0.5 ${titleColor}`}>
          {toast.title ?? defaultTitle[toast.variant]}
        </p>
        <p className="text-sm text-brand-text leading-relaxed wrap-break-word">
          {toast.message}
        </p>
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        className="text-brand-text-muted hover:text-brand-text transition-colors shrink-0 mt-0.5 cursor-pointer"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Provider + Portal ────────────────────────────────────────────────────────

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
      setToasts((prev) => [...prev.slice(-4), { id, message, variant, title }]);

      const timer = setTimeout(() => dismiss(id), DISMISS_AFTER_MS);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  const success = useCallback((msg: string, title?: string) => toast(msg, 'success', title), [toast]);
  const error   = useCallback((msg: string, title?: string) => toast(msg, 'error', title),   [toast]);
  const info    = useCallback((msg: string, title?: string) => toast(msg, 'info', title),    [toast]);
  const warning = useCallback((msg: string, title?: string) => toast(msg, 'warning', title), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warning }}>
      {children}

      {/* Toast portal — fixed top-right */}
      <div
        className="fixed top-4 right-4 z-9999 flex flex-col gap-2 pointer-events-none"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
