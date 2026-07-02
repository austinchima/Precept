import { useAuth } from '../../AuthContext';
import { Link } from 'react-router-dom';
import { ArrowLeft, Terminal, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

const C = {
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
  emerald: '#10b981',
} as const;

interface NotFound1Props {
  className?: string;
  cta?: string;
  description?: string;
  imageSrc?: string;
  title?: string;
}

export default function NotFound1({
  title = 'Off the grid.',
  description = 'The route you were chasing has either been deprecated, moved, or never existed in this build.',
  cta = 'Return to safety',
  className,
}: NotFound1Props) {
  const { isAuthenticated } = useAuth();
  const href = isAuthenticated ? '/dashboard' : '/';

  return (
    <div
      className={cn(
        'font-body min-h-screen w-full flex flex-col items-center justify-center px-6 py-16 text-center relative overflow-hidden isolate',
        className,
      )}
      style={{ background: C.bg0, color: C.ink }}
      data-testid="not-found"
    >
      {/* dot grid + halos */}
      <div className="bg-dotgrid pointer-events-none absolute inset-0 opacity-50 z-0" />
      <div
        className="pointer-events-none absolute left-1/2 top-[10%] h-[560px] w-[1000px] -translate-x-1/2 rounded-[50%] z-0"
        style={{
          background: `radial-gradient(closest-side, rgba(244,63,94,0.14), rgba(139,92,246,0.10) 45%, transparent 75%)`,
          filter: 'blur(4px)',
        }}
      />

      <div className="relative z-10 max-w-[820px] mx-auto">
        {/* eyebrow */}
        <span
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.18em]"
          style={{ background: `${C.rose}14`, border: `1px solid ${C.rose}33`, color: C.rose }}
        >
          <AlertTriangle size={11} />
          404 · route missing
        </span>

        {/* huge serif glyph row */}
        <div className="mt-7 flex items-center justify-center gap-2 select-none">
          <span className="font-display font-bold leading-none" style={{ color: C.ink, fontSize: 'clamp(80px,16vw,180px)', letterSpacing: '-0.04em' }}>4</span>
          <span className="font-editorial leading-none" style={{ color: C.teal, fontWeight: 400, fontSize: 'clamp(80px,16vw,180px)', letterSpacing: '-0.02em' }}>0</span>
          <span className="font-display font-bold leading-none" style={{ color: C.ink, fontSize: 'clamp(80px,16vw,180px)', letterSpacing: '-0.04em' }}>4</span>
        </div>

        {/* underline scribble (matches landing hero) */}
        <svg className="mx-auto mt-3" width="220" height="10" viewBox="0 0 300 10" preserveAspectRatio="none" aria-hidden="true">
          <path d="M2,7 Q75,1 150,5 T298,4" stroke={C.teal} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.6" />
        </svg>

        <h1 className="mt-7 font-display font-bold leading-[1.05] mx-auto max-w-[640px]" style={{ color: C.ink, fontSize: 'clamp(28px,4.4vw,48px)' }}>
          {title.includes(' ') ? (
            <>
              {title.split(' ').slice(0, -1).join(' ')}{' '}
              <span className="font-editorial" style={{ color: C.amber, fontWeight: 400 }}>
                {title.split(' ').slice(-1)[0]}
              </span>
            </>
          ) : title}
        </h1>
        <p className="mt-5 font-body text-[15.5px] leading-relaxed mx-auto max-w-[560px]" style={{ color: C.inkDim }}>
          {description}
        </p>

        {/* IDE-style code block — echoes hero mockup in landing */}
        <pre
          className="mx-auto mt-9 max-w-[520px] overflow-hidden rounded-xl px-5 py-4 font-mono text-[12px] leading-[1.7] text-left"
          style={{
            background: `linear-gradient(180deg, ${C.bg2} 0%, ${C.bg1} 100%)`,
            color: C.inkDim,
            border: `1px solid ${C.hair2}`,
            boxShadow: '0 30px 60px -30px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          <span style={{ color: C.violet }}>const</span>{' '}
          <span style={{ color: C.ink }}>route</span>{' '}
          <span style={{ color: C.inkMute }}>=</span>{' '}
          <span style={{ color: C.amber }}>await</span>{' '}
          <span style={{ color: C.ink }}>router</span>
          <span style={{ color: C.inkMute }}>.</span>
          <span style={{ color: C.teal }}>resolve</span>
          <span style={{ color: C.inkMute }}>(</span>
          <span style={{ color: C.amber }}>"{typeof window !== 'undefined' ? window.location.pathname : '/'}"</span>
          <span style={{ color: C.inkMute }}>);</span>
          {'\n'}
          <span style={{ color: C.rose }}>throw new</span>{' '}
          <span style={{ color: C.ink }}>RouteNotFoundException</span>
          <span style={{ color: C.inkMute }}>(</span>
          <span style={{ color: C.amber }}>"check coordinates"</span>
          <span style={{ color: C.inkMute }}>);</span>
        </pre>

        {/* CTAs */}
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            to={href}
            data-testid="not-found-primary-cta"
            className="group inline-flex items-center gap-2 rounded-full px-6 py-3.5 font-mono text-[12px] font-semibold uppercase tracking-[0.16em] transition-all"
            style={{
              background: C.ink,
              color: C.bg0,
              boxShadow: `0 0 0 1px ${C.ink}, 0 18px 60px -20px rgba(45,212,191,0.5)`,
            }}
          >
            <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
            {cta}
          </Link>
          <a
            href="https://github.com/austinchima/Precept"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="not-found-secondary-cta"
            className="inline-flex items-center gap-2 rounded-full border px-6 py-3.5 font-mono text-[12px] font-semibold uppercase tracking-[0.16em]"
            style={{
              background: 'rgba(255,255,255,0.025)',
              borderColor: C.hair2,
              color: C.ink,
              backdropFilter: 'blur(8px)',
            }}
          >
            <Terminal size={13} /> View on GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
