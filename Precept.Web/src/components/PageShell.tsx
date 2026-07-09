import React from 'react';

/* ─────── DESIGN TOKENS (matches Landing.tsx / Layout.tsx) ─────── */
const C = {
  bg0: '#02050A', bg1: '#06090F', bg2: '#0B0F17', bg3: '#11161F',
  ink: '#E6EBF2', inkDim: '#9CA8B8', inkMute: '#5A6678',
  hair: 'rgba(255,255,255,0.07)', hair2: 'rgba(255,255,255,0.12)',
  teal: '#2dd4bf', tealDim: 'rgba(45,212,191,0.14)',
  violet: '#8b5cf6', rose: '#f43f5e', amber: '#f59e0b', sky: '#38bdf8', emerald: '#10b981',
} as const;

const Eyebrow = ({ children, color = C.teal }: { children: React.ReactNode; color?: string }) => (
  <span
    className="inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.18em]"
    style={{ background: `${color}14`, border: `1px solid ${color}33`, color }}
  >
    <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
    {children}
  </span>
);

interface PageShellProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  badgeColor?: string;
  actions?: React.ReactNode;
  headerAlign?: 'left' | 'center';
  className?: string;
  contentClassName?: string;
  dataTestId?: string;
}

export default function PageShell({
  children,
  title,
  subtitle,
  badge,
  badgeColor = C.teal,
  actions,
  headerAlign = 'left',
  className = '',
  contentClassName = '',
  dataTestId,
}: PageShellProps) {
  const hasHeader = title || subtitle || badge || actions;

  return (
    <div
      className={`font-body h-full flex flex-col ${className}`}
      style={{ color: C.ink }}
      data-testid={dataTestId}
    >
      <div className="flex-1 flex flex-col px-4 md:px-8 py-6 md:py-8">
        {hasHeader && (
          <header className="opacity-0 animate-fade-in-up">
            {headerAlign === 'center' ? (
              <div className="text-center flex flex-col items-center gap-3">
                {badge && <Eyebrow color={badgeColor}>{badge}</Eyebrow>}
                {title && (
                  <h1 className="font-display font-bold leading-[1.05]" style={{ fontSize: 'clamp(28px,4vw,40px)' }}>
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="font-body text-[14.5px] max-w-2xl" style={{ color: C.inkDim }}>
                    {subtitle}
                  </p>
                )}
                {actions && <div className="flex flex-wrap items-center justify-center gap-3 mt-2">{actions}</div>}
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  {badge && <Eyebrow color={badgeColor}>{badge}</Eyebrow>}
                  {title && (
                    <h1 className="mt-3 font-display font-bold leading-[1.05]" style={{ fontSize: 'clamp(28px,4vw,40px)' }}>
                      {title}
                    </h1>
                  )}
                  {subtitle && (
                    <p className="mt-2 font-body text-[14.5px] max-w-[680px]" style={{ color: C.inkDim }}>
                      {subtitle}
                    </p>
                  )}
                </div>
                {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
              </div>
            )}
          </header>
        )}

        <div className={`flex-1 flex flex-col ${hasHeader ? 'mt-6 md:mt-8' : ''} ${contentClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
