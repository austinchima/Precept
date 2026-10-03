import React, { forwardRef, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Loader2, X } from 'lucide-react';
import { cn } from '../../lib/utils';

/* ───────────────────────── Brand ───────────────────────── */

export function LogoMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <path
        fill="var(--accent-ink)"
        fillRule="evenodd"
        d="M10 8h7.5a5.5 5.5 0 0 1 0 11H14v5h-4V8zm4 3.5v4h3.5a2 2 0 0 0 0-4H14z"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-semibold tracking-tight text-fg', className)}>
      <LogoMark size={22} />
      <span className="text-[15px]">Precept</span>
    </span>
  );
}

/* ───────────────────────── Buttons ───────────────────────── */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonOwnProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  to?: string;
  href?: string;
}

type ButtonProps = ButtonOwnProps & React.ButtonHTMLAttributes<HTMLButtonElement>;

function buttonClass(variant: ButtonVariant, size: ButtonSize, iconOnly: boolean, className?: string) {
  return cn(
    'btn',
    `btn-${variant}`,
    size === 'sm' && 'btn-sm',
    size === 'lg' && 'btn-lg',
    iconOnly && 'btn-icon',
    iconOnly && size === 'sm' && 'w-8',
    className
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, icon, iconRight, to, href, className, children, disabled, type, ...rest },
  ref
) {
  const iconOnly = !children && !!icon;
  const cls = buttonClass(variant, size, iconOnly, className);
  const content = (
    <>
      {loading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : icon}
      {children}
      {iconRight}
    </>
  );
  if (to) {
    return (
      <Link to={to} className={cls} aria-label={rest['aria-label']} title={rest.title} data-testid={(rest as Record<string, unknown>)['data-testid'] as string}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={cls} aria-label={rest['aria-label']} title={rest.title} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined} data-testid={(rest as Record<string, unknown>)['data-testid'] as string}>
        {content}
      </a>
    );
  }
  return (
    <button ref={ref} type={type ?? 'button'} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {content}
    </button>
  );
});

/* ───────────────────────── Form fields ───────────────────────── */

interface FieldProps {
  label: React.ReactNode;
  htmlFor?: string;
  help?: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  optional?: boolean;
}

export function Field({ label, htmlFor, help, error, className, children, optional }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="field-label">
        {label}
        {optional && <span className="ml-1 font-normal text-fg-3">(optional)</span>}
      </label>
      {children}
      {error ? <p className="field-error" role="alert">{error}</p> : help ? <p className="field-help">{help}</p> : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref
) {
  return <input ref={ref} className={cn('input', className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={cn('input', className)} {...rest} />;
  }
);

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...rest },
  ref
) {
  return (
    <select ref={ref} className={cn('input', className)} {...rest}>
      {children}
    </select>
  );
});

/* ───────────────────────── Display ───────────────────────── */

export function Chip({
  tone = 'neutral',
  className,
  children,
  ...rest
}: { tone?: 'neutral' | 'accent' | 'danger' | 'warning' } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn('chip', tone !== 'neutral' && `chip-${tone}`, className)} {...rest}>
      {children}
    </span>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

/** Neutral initial tile for companies and people (no third-party logos). */
export function Monogram({ name, size = 36, className }: { name: string; size?: number; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?';
  return (
    <span
      aria-hidden="true"
      className={cn('inline-grid shrink-0 place-items-center rounded-lg border border-line bg-surface-2 font-medium text-fg-2', className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {initials}
    </span>
  );
}

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn('skeleton', className)} style={style} aria-hidden="true" />;
}

export function Panel({
  as: Tag = 'section',
  className,
  children,
  quiet,
  ...rest
}: { as?: React.ElementType; quiet?: boolean; className?: string; children: React.ReactNode } & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={cn(quiet ? 'panel-quiet' : 'panel', className)} {...rest}>
      {children}
    </Tag>
  );
}

export function PanelHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-5 pt-5', className)}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-medium tracking-tight text-fg">{title}</h2>
        {description && <p className="mt-1 text-[13px] leading-relaxed text-fg-3">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-start gap-3 px-6 py-10', className)}>
      {icon && (
        <span className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-surface-2 text-fg-2">{icon}</span>
      )}
      <div>
        <p className="text-[15px] font-medium text-fg">{title}</p>
        {description && <p className="mt-1 max-w-[52ch] text-[13.5px] leading-relaxed text-fg-3">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="text-[13px] text-fg-3">{label}</span>
      <span className="num text-[28px] font-semibold leading-none tracking-tight text-fg">{value}</span>
      {hint && <span className="text-[12.5px] text-fg-3">{hint}</span>}
    </div>
  );
}

/* ───────────────────────── Segmented control (tabs) ───────────────────────── */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = 'md',
  ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: React.ReactNode; count?: number; testId?: string }[];
  className?: string;
  size?: 'sm' | 'md';
  ariaLabel?: string;
}) {
  const id = useId();
  return (
    <div role="tablist" aria-label={ariaLabel} className={cn('inline-flex rounded-lg border border-line bg-surface-2 p-0.5', className)}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            data-testid={opt.testId}
            onClick={() => onChange(opt.value)}
            className={cn(
              'relative inline-flex items-center gap-1.5 rounded-md font-medium transition-colors',
              size === 'sm' ? 'h-7 px-2.5 text-[12.5px]' : 'h-8 px-3 text-[13px]',
              active ? 'text-fg' : 'text-fg-3 hover:text-fg-2'
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-md border border-line-strong bg-surface-1 shadow-[0_1px_2px_rgb(0_0_0/0.08)]"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
            <span className="relative">{opt.label}</span>
            {opt.count !== undefined && <span className="num relative text-fg-3">{opt.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ───────────────────────── Page header ───────────────────────── */

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.03em] text-fg md:text-[30px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-[62ch] text-[14px] leading-relaxed text-fg-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/* ───────────────────────── Dialog ───────────────────────── */

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  testId,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  testId?: string;
}) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const t = window.setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>('input, textarea, select, button:not([data-dialog-close])');
      (first ?? panelRef.current)?.focus();
    }, 30);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-overlay backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            data-testid={testId}
            data-lenis-prevent
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 420, damping: 36 }}
            className={cn(
              'relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-surface-1 shadow-[0_24px_80px_-24px_rgb(0_0_0/0.5)] outline-none sm:rounded-2xl',
              size === 'sm' && 'sm:max-w-md',
              size === 'md' && 'sm:max-w-xl',
              size === 'lg' && 'sm:max-w-3xl'
            )}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <h2 id={titleId} className="text-[16px] font-semibold tracking-tight text-fg">
                  {title}
                </h2>
                {description && <p className="mt-1 text-[13px] leading-relaxed text-fg-3">{description}</p>}
              </div>
              <button
                type="button"
                data-dialog-close
                onClick={onClose}
                className="btn btn-ghost btn-icon btn-sm w-8"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            {children && <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>}
            {footer && <div className="flex justify-end gap-2 border-t border-line bg-surface-2/50 px-5 py-3">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/* ───────────────────────── Reveal (in-app entrance) ───────────────────────── */

/** Small staggered entrance for page sections. Collapses to static under reduced motion. */
export function Reveal({
  children,
  delay = 0,
  className,
  as = 'div',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'li';
}) {
  const reduce = useReducedMotion();
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Comp>
  );
}
