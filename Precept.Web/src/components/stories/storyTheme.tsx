import React from 'react';

export const C = {
  bg0: '#02050A',
  bg1: '#06090F',
  bg2: '#0B0F17',
  bg3: '#11161F',
  ink: '#E6EBF2',
  inkDim: '#9CA8B8',
  inkMute: '#5A6678',
  hair: 'rgba(255,255,255,0.07)',
  hair2: 'rgba(255,255,255,0.12)',
  teal: '#2dd4bf',
  tealDim: 'rgba(45,212,191,0.14)',
  violet: '#8b5cf6',
  rose: '#f43f5e',
  amber: '#f59e0b',
  sky: '#38bdf8',
  emerald: '#10b981',
} as const;

export const cardStyle = (overrides?: React.CSSProperties): React.CSSProperties => ({
  background: `linear-gradient(180deg, ${C.bg1} 0%, ${C.bg0} 100%)`,
  border: `1px solid ${C.hair}`,
  borderRadius: 18,
  boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset',
  ...overrides,
});

export const glassCardStyle = (): React.CSSProperties => ({
  background: 'rgba(26, 32, 39, 0.6)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: `1px solid ${C.hair}`,
  borderRadius: 18,
});

export const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.025)',
  border: `1px solid ${C.hair}`,
  borderRadius: 10,
  color: C.ink,
  padding: '10px 12px',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 13,
  width: '100%',
  outline: 'none',
};

export const textareaBodyStyle: React.CSSProperties = {
  ...inputStyle,
  fontFamily: 'Geist, Inter, sans-serif',
  resize: 'vertical',
};

export const Eyebrow = ({ children, color = C.teal }: { children: React.ReactNode; color?: string }) => (
  React.createElement('span', {
    className: 'inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.18em]',
    style: { background: `${color}14`, border: `1px solid ${color}33`, color },
  }, [
    React.createElement('span', {
      key: 'dot',
      className: 'inline-block h-1.5 w-1.5 rounded-full',
      style: { background: color, boxShadow: `0 0 8px ${color}` },
    }),
    children,
  ])
);

export const SectionTitle: React.FC<{ children: React.ReactNode; subtitle?: string }> = ({ children, subtitle }) => (
  <div>
    <h2 className="font-display text-lg font-semibold" style={{ color: C.ink }}>
      {children}
    </h2>
    {subtitle && (
      <p className="font-body text-sm mt-0.5" style={{ color: C.inkDim }}>
        {subtitle}
      </p>
    )}
  </div>
);

export const TagBadge = ({ children, color = C.teal }: { children: React.ReactNode; color?: string }) => (
  React.createElement('span', {
    className: 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] uppercase tracking-widest',
    style: { background: `${color}1c`, color, border: `1px solid ${color}44` },
  }, children)
);

export const IconButton = ({
  title,
  onClick,
  children,
  hoverColor = C.teal,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  hoverColor?: string;
}) => (
  React.createElement('button', {
    title,
    'aria-label': title,
    onClick,
    className: 'min-w-[32px] min-h-[32px] flex items-center justify-center transition-colors cursor-pointer',
    style: { color: C.inkDim },
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.color = hoverColor; },
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.color = C.inkDim; },
  }, children)
);
