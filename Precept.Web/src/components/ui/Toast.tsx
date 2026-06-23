import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

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
  { iconClass: string; border: string; iconColor: string; bg: string; titleColor: string }
> = {
  success: {
    iconClass: 'fa-solid fa-circle-check',
    border: 'border-[#4ade80]/40',
    iconColor: 'text-[#4ade80]',
    bg: 'bg-[#4ade80]/5',
    titleColor: 'text-[#4ade80]',
  },
  error: {
    iconClass: 'fa-solid fa-circle-xmark',
    border: 'border-[#f87171]/40',
    iconColor: 'text-[#f87171]',
    bg: 'bg-[#f87171]/5',
    titleColor: 'text-[#f87171]',
  },
  warning: {
    iconClass: 'fa-solid fa-triangle-exclamation',
    border: 'border-[#fbbf24]/40',
    iconColor: 'text-[#fbbf24]',
    bg: 'bg-[#fbbf24]/5',
    titleColor: 'text-[#fbbf24]',
  },
  info: {
    iconClass: 'fa-solid fa-circle-info',
    border: 'border-accent-teal/40',
    iconColor: 'text-accent-teal',
    bg: 'bg-accent-teal/5',
    titleColor: 'text-accent-teal',
  },
};

// ─── Individual Toast Item ────────────────────────────────────────────────────

interface ToastItemProps {
  key?: React.Key;
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const { iconClass, border, iconColor, bg, titleColor } = VARIANT_CONFIG[toast.variant];
  const defaultTitle: Record<ToastVariant, string> = {
    success: 'Success',
    error: 'Something went wrong',
    warning: 'Warning',
    info: 'Info',
  };

  return (
    <div
      className={`
        flex items-start gap-3 w-full max-w-[384px] p-4 rounded-lg border shadow-2xl
        ${bg} ${border}
        bg-dashboard-bg/95
        backdrop-blur-sm
        animate-toast-in
        pointer-events-auto
      `}
      role="alert"
      aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
    >
      <i
        className={`${iconClass} ${iconColor} text-sm mt-0.5 shrink-0`}
        aria-hidden="true"
      ></i>

      <div className="flex-1 min-w-0">
        <p className={`text-xs font-mono font-semibold uppercase tracking-widest mb-0.5 ${titleColor}`}>
          {toast.title ?? defaultTitle[toast.variant]}
        </p>
        <p className="text-sm text-text-primary leading-relaxed wrap-break-word">
          {toast.message}
        </p>
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        className="text-text-secondary hover:text-white transition-colors shrink-0 mt-0.5 cursor-pointer flex items-center justify-center"
        aria-label="Dismiss notification"
      >
        <i className="fa-solid fa-xmark text-xs"></i>
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
