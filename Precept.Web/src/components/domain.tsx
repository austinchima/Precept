import { ApplicationStatus, ConfidenceLevel } from '../types';
import { cn } from '../lib/utils';

/* Confidence ladder: one neutral-to-accent scale, danger and warning only for the two weak rungs. */
export const CONFIDENCE_LEVELS: { key: ConfidenceLevel; label: string; step: number; tone: 'danger' | 'warning' | 'neutral' | 'accent' }[] = [
  { key: 'Panic', label: 'Panic', step: 1, tone: 'danger' },
  { key: 'Shaky', label: 'Shaky', step: 2, tone: 'warning' },
  { key: 'Okay', label: 'Okay', step: 3, tone: 'neutral' },
  { key: 'Solid', label: 'Solid', step: 4, tone: 'accent' },
  { key: 'CanTeach', label: 'Can teach', step: 5, tone: 'accent' },
];

export function confidenceMeta(level: ConfidenceLevel | string | undefined) {
  return CONFIDENCE_LEVELS.find((c) => c.key.toLowerCase() === String(level ?? '').toLowerCase()) ?? CONFIDENCE_LEVELS[2];
}

const TONE_FILL: Record<string, string> = {
  danger: 'bg-danger',
  warning: 'bg-warning',
  neutral: 'bg-fg-2',
  accent: 'bg-accent',
};

/** Five-step meter with a text label; the number of filled steps carries the meaning, not just colour. */
export function ConfidenceMeter({ level, showLabel = true, className }: { level: ConfidenceLevel | string; showLabel?: boolean; className?: string }) {
  const meta = confidenceMeta(level);
  return (
    <span className={cn('inline-flex items-center gap-2', className)} title={`Confidence: ${meta.label}`}>
      <span className="flex gap-[3px]" aria-hidden="true">
        {CONFIDENCE_LEVELS.map((c) => (
          <span key={c.key} className={cn('h-3 w-[5px] rounded-[2px]', c.step <= meta.step ? TONE_FILL[meta.tone] : 'bg-surface-3')} />
        ))}
      </span>
      {showLabel ? <span className="text-[12.5px] text-fg-2">{meta.label}</span> : <span className="sr-only">Confidence {meta.label}</span>}
    </span>
  );
}

/** Row of five buttons to set confidence. */
export function ConfidencePicker({
  value,
  onChange,
  disabled,
  size = 'md',
}: {
  value?: ConfidenceLevel | string;
  onChange: (level: ConfidenceLevel) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}) {
  const current = value ? confidenceMeta(value).key : undefined;
  return (
    <div role="radiogroup" aria-label="Confidence" className="grid grid-cols-5 gap-1.5">
      {CONFIDENCE_LEVELS.map((c) => {
        const active = c.key === current;
        return (
          <button
            key={c.key}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(c.key)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 rounded-lg border font-medium transition-colors disabled:opacity-50',
              size === 'sm' ? 'h-9 text-[11.5px]' : 'h-12 text-[12.5px]',
              active ? 'border-fg bg-surface-1 text-fg' : 'border-line bg-surface-2 text-fg-2 hover:border-line-strong hover:text-fg'
            )}
          >
            <span className="flex gap-[2px]" aria-hidden="true">
              {CONFIDENCE_LEVELS.map((s) => (
                <span key={s.key} className={cn('h-1.5 w-1.5 rounded-[1px]', s.step <= c.step ? TONE_FILL[c.tone] : 'bg-surface-3')} />
              ))}
            </span>
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

/* Application statuses */
export const STATUS_META: Record<ApplicationStatus, { label: string; tone: 'neutral' | 'accent' | 'danger' | 'warning' | 'muted' }> = {
  Applied: { label: 'Applied', tone: 'neutral' },
  PhoneScreen: { label: 'Phone screen', tone: 'neutral' },
  Interviewing: { label: 'Interviewing', tone: 'warning' },
  Offer: { label: 'Offer', tone: 'accent' },
  Rejected: { label: 'Rejected', tone: 'danger' },
  Ghosted: { label: 'Ghosted', tone: 'muted' },
};

export const STATUS_ORDER: ApplicationStatus[] = ['Applied', 'PhoneScreen', 'Interviewing', 'Offer', 'Rejected', 'Ghosted'];

export function StatusBadge({ status, className }: { status: ApplicationStatus | string; className?: string }) {
  const meta = STATUS_META[status as ApplicationStatus] ?? { label: status, tone: 'neutral' as const };
  return (
    <span
      className={cn(
        'chip',
        meta.tone === 'accent' && 'chip-accent',
        meta.tone === 'danger' && 'chip-danger',
        meta.tone === 'warning' && 'chip-warning',
        meta.tone === 'muted' && 'text-fg-3',
        className
      )}
    >
      {meta.label}
    </span>
  );
}

/* Dates */
export function isDue(nextReviewAt: string | null | undefined, now = new Date()) {
  return !nextReviewAt || new Date(nextReviewAt) <= now;
}

export function relativeDay(date: string | null | undefined, now = new Date()) {
  if (!date) return 'Never';
  const d = new Date(date);
  const days = Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days > 1 && days < 7) return `In ${days} days`;
  if (days < -1 && days > -7) return `${-days} days ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function overdueLabel(date: string, now = new Date()) {
  const days = Math.floor((startOfDay(now).getTime() - startOfDay(new Date(date)).getTime()) / 86_400_000);
  if (days <= 0) return { text: 'Due today', overdue: false };
  return { text: days === 1 ? '1 day overdue' : `${days} days overdue`, overdue: true };
}

export function nextReviewLabel(nextReviewAt: string | null | undefined) {
  return isDue(nextReviewAt) ? 'Due now' : `Next review ${relativeDay(nextReviewAt).toLowerCase()}`;
}
