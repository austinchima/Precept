import React, { useState } from 'react';
import { ArrowUpRight, Mail, Lock, Eye, EyeOff, ArrowLeft, ArrowRight, AlertTriangle, Loader2 } from 'lucide-react';

/* ─────── DESIGN TOKENS (from Landing.tsx) ─────── */
const C = {
  bg0:    '#02050A',
  bg1:    '#06090F',
  bg2:    '#0B0F17',
  bg3:    '#11161F',
  ink:    '#E6EBF2',
  inkDim: '#9CA8B8',
  inkMute:'#5A6678',
  hair:   'rgba(255,255,255,0.07)',
  hair2:  'rgba(255,255,255,0.12)',
  teal:   '#2dd4bf',
  tealDim:'rgba(45,212,191,0.14)',
  violet: '#8b5cf6',
  rose:   '#f43f5e',
  emerald:'#10b981',
  amber:  '#f59e0b',
  sky:    '#38bdf8',
} as const;

/* --- ICONS --- */
const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s12-5.373 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z" />
  </svg>
);

const GithubIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
);

export interface Testimonial {
  avatarSrc?: string;
  name: string;
  handle: string;
  text: string;
}

interface SignInPageProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  heroImageSrc?: string;
  testimonials?: Testimonial[];
  isLogin: boolean;
  isLoading: boolean;
  error: string | null;
  onToggleMode: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onGoogleSignIn?: () => void;
  onResetPassword?: () => void;
  onBack?: () => void;
}

/* InputShell — matches landing's IDE-style card surfaces */
const InputShell = ({ children, isError = false }: { children: React.ReactNode; isError?: boolean }) => (
  <div
    className="flex items-center transition-colors"
    style={{
      background: isError ? 'rgba(244,63,94,0.05)' : 'rgba(255,255,255,0.025)',
      border: `1px solid ${isError ? `${C.rose}55` : C.hair}`,
      borderRadius: 12,
    }}
  >
    {children}
  </div>
);

const TestimonialChip = ({ t, delay }: { t: Testimonial; delay: string }) => (
  <div
    className={`animate-testimonial ${delay} flex items-start gap-3 p-5 w-72 shrink-0`}
    style={{
      background: `linear-gradient(180deg, ${C.bg2} 0%, ${C.bg1} 100%)`,
      border: `1px solid ${C.hair2}`,
      borderRadius: 18,
      boxShadow: '0 30px 60px -30px rgba(0,0,0,0.6)',
    }}
  >
    <div
      className="h-10 w-10 rounded-lg shrink-0 grid place-items-center font-display font-bold text-[14px]"
      style={{ background: `${C.teal}22`, color: C.teal, border: `1px solid ${C.teal}33` }}
    >
      {t.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
    </div>
    <div className="text-sm leading-snug min-w-0">
      <p className="font-display font-semibold truncate" style={{ color: C.ink }}>{t.name}</p>
      <p className="font-mono text-[11px] mt-0.5" style={{ color: C.teal }}>{t.handle}</p>
      <p className="mt-2 font-body text-[12.5px] leading-relaxed" style={{ color: C.inkDim }}>{t.text}</p>
    </div>
  </div>
);

export const SignInPage: React.FC<SignInPageProps> = ({
  title,
  description,
  testimonials = [],
  isLogin,
  isLoading,
  error,
  onToggleMode,
  onSubmit,
  onResetPassword,
  onBack,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div
      className="font-body min-h-screen w-full flex relative isolate overflow-hidden"
      style={{ background: C.bg0, color: C.ink }}
      data-testid="signin-page"
    >
      {/* ambient backgrounds (match landing) */}
      <div className="bg-dotgrid pointer-events-none absolute inset-0 opacity-50 z-0" />
      <div
        className="pointer-events-none absolute -top-40 -left-40 h-[640px] w-[1000px] rounded-[50%] z-0"
        style={{
          background: `radial-gradient(closest-side, rgba(45,212,191,0.16), rgba(139,92,246,0.10) 45%, transparent 75%)`,
          filter: 'blur(4px)',
        }}
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 h-[520px] w-[820px] rounded-[50%] z-0"
        style={{
          background: `radial-gradient(closest-side, rgba(139,92,246,0.16), rgba(45,212,191,0.06) 45%, transparent 75%)`,
          filter: 'blur(4px)',
        }}
      />

      {/* LEFT — form */}
      <section className="flex-1 flex flex-col items-center justify-center p-4 lg:p-10 z-10 relative overflow-y-auto">
        <div className="w-full max-w-[460px] my-auto py-4">

          {/* brand row */}
          <div className="animate-element animate-delay-100 flex items-center justify-between mb-8">
            <a href="/" className="flex items-center gap-2 no-underline" data-testid="signin-logo">
              <span
                className="grid h-8 w-8 place-items-center rounded-md"
                style={{
                  background: `linear-gradient(135deg, ${C.teal} 0%, ${C.violet} 100%)`,
                  boxShadow: `0 0 18px ${C.tealDim}`,
                }}
              >
                <span className="font-display text-[15px] font-bold leading-none" style={{ color: C.bg0 }}>P</span>
              </span>
              <span className="font-display text-[18px] font-bold tracking-tight" style={{ color: C.ink }}>Precept</span>
              <span className="font-mono text-[10px] uppercase tracking-widest hidden sm:inline" style={{ color: C.inkMute }}>
                ─ Career&nbsp;OS
              </span>
            </a>

            {onBack && (
              <button
                onClick={onBack}
                type="button"
                data-testid="signin-back"
                className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors cursor-pointer"
                style={{ color: C.inkDim }}
                onMouseEnter={(e) => (e.currentTarget.style.color = C.ink)}
                onMouseLeave={(e) => (e.currentTarget.style.color = C.inkDim)}
              >
                <ArrowLeft size={14} /> Back
              </button>
            )}
          </div>

          {/* eyebrow */}
          <div className="animate-element animate-delay-100 mb-5">
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.18em]"
              style={{ background: `${C.teal}14`, border: `1px solid ${C.teal}33`, color: C.teal }}
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: C.teal, boxShadow: `0 0 8px ${C.teal}` }} />
              {isLogin ? 'Welcome back' : 'New operator'}
            </span>
          </div>

          {/* headline */}
          <h1
            className="animate-element animate-delay-100 font-display font-bold tracking-tight leading-[1.05]"
            style={{ color: C.ink, fontSize: 'clamp(34px, 4.4vw, 48px)' }}
          >
            {title || (
              isLogin ? (
                <>Sign in to your <span className="font-editorial" style={{ color: C.teal, fontWeight: 400 }}>command&nbsp;center.</span></>
              ) : (
                <>Bank your stories. <span className="font-editorial" style={{ color: C.emerald, fontWeight: 400 }}>Own the room.</span></>
              )
            )}
          </h1>
          <p className="animate-element animate-delay-200 mt-4 font-body text-[15.5px] leading-relaxed" style={{ color: C.inkDim }}>
            {description || (isLogin
              ? 'Resume your hunt. Your stories, pipeline and drills are where you left them.'
              : 'Create your free account — no card, JSON export anytime.')}
          </p>

          {error && (
            <div
              className="animate-element animate-delay-200 mt-5 p-3.5 rounded-lg flex items-start gap-3 text-sm"
              style={{ background: `${C.rose}10`, border: `1px solid ${C.rose}33`, color: C.rose }}
              data-testid="signin-error"
            >
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span className="font-mono text-[12.5px] leading-relaxed">{error}</span>
            </div>
          )}

          <form className="mt-7 space-y-5" onSubmit={onSubmit}>
            {/* Registration fields */}
            <div className={`grid grid-cols-2 gap-4 transition-all duration-500 overflow-hidden ${isLogin ? 'max-h-0 opacity-0 m-0' : 'max-h-36 opacity-100'}`}>
              <div className="animate-element animate-delay-300">
                <label className="font-mono text-[10.5px] uppercase tracking-[0.18em] mb-2 block" style={{ color: C.inkMute }}>First name</label>
                <InputShell>
                  <input name="firstName" type="text" placeholder="John" data-testid="signin-firstname"
                    className="w-full bg-transparent text-sm p-3.5 font-mono focus:outline-none"
                    style={{ color: C.ink }} required={!isLogin} />
                </InputShell>
              </div>
              <div className="animate-element animate-delay-300">
                <label className="font-mono text-[10.5px] uppercase tracking-[0.18em] mb-2 block" style={{ color: C.inkMute }}>Last name</label>
                <InputShell>
                  <input name="lastName" type="text" placeholder="Doe" data-testid="signin-lastname"
                    className="w-full bg-transparent text-sm p-3.5 font-mono focus:outline-none"
                    style={{ color: C.ink }} required={!isLogin} />
                </InputShell>
              </div>
            </div>

            {/* Email */}
            <div className="animate-element animate-delay-400">
              <label className="font-mono text-[10.5px] uppercase tracking-[0.18em] mb-2 block" style={{ color: C.inkMute }}>Email</label>
              <InputShell isError={!!error}>
                <Mail size={16} className="ml-4 shrink-0" style={{ color: C.inkMute }} />
                <input name="email" type="email" placeholder="engineer@domain.com" data-testid="signin-email"
                  className="w-full bg-transparent text-sm p-3.5 font-mono focus:outline-none"
                  style={{ color: C.ink }} required />
              </InputShell>
            </div>

            {/* Password */}
            <div className="animate-element animate-delay-500">
              <div className="flex items-center justify-between mb-2">
                <label className="font-mono text-[10.5px] uppercase tracking-[0.18em]" style={{ color: C.inkMute }}>Password</label>
                {isLogin && (
                  <button type="button" onClick={() => onResetPassword?.()} data-testid="signin-forgot"
                    className="font-mono text-[10.5px] uppercase tracking-[0.16em] transition-colors cursor-pointer"
                    style={{ color: C.inkDim }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = C.teal)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = C.inkDim)}
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <InputShell isError={!!error}>
                <Lock size={16} className="ml-4 shrink-0" style={{ color: C.inkMute }} />
                <div className="relative w-full">
                  <input name="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••••••••" data-testid="signin-password"
                    className="w-full bg-transparent text-sm p-3.5 pr-14 font-mono tracking-widest focus:outline-none"
                    style={{ color: C.ink }} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} data-testid="signin-toggle-password"
                    className="absolute inset-y-0 right-1 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
                    style={{ color: C.inkMute }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = C.teal)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = C.inkMute)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </InputShell>
            </div>

            {/* Remember me */}
            {isLogin && (
              <div className="animate-element animate-delay-600 flex items-center">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" name="rememberMe" data-testid="signin-remember" className="w-4 h-4 cursor-pointer accent-current" style={{ accentColor: C.teal }} />
                  <span className="font-mono text-[11.5px] uppercase tracking-[0.14em]" style={{ color: C.inkDim }}>
                    Keep me signed in
                  </span>
                </label>
              </div>
            )}

            {/* CTA */}
            <button
              type="submit"
              disabled={isLoading}
              data-testid="signin-submit"
              className="animate-element animate-delay-700 group w-full inline-flex items-center justify-center gap-2 rounded-full py-3.5 font-mono text-[12px] font-semibold uppercase tracking-[0.16em] transition-all cursor-pointer disabled:opacity-60"
              style={{
                background: C.ink,
                color: C.bg0,
                boxShadow: `0 0 0 1px ${C.ink}, 0 18px 60px -20px rgba(45,212,191,0.5)`,
              }}
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : (
                <>
                  {isLogin ? 'Sign in' : 'Create account'}
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          {/* divider */}
          <div className="animate-element animate-delay-800 relative flex items-center my-7">
            <span className="flex-1 border-t" style={{ borderColor: C.hair }} />
            <span className="px-3 font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: C.inkMute }}>or</span>
            <span className="flex-1 border-t" style={{ borderColor: C.hair }} />
          </div>

          {/* social (disabled — coming soon) */}
          <div className="animate-element animate-delay-900 flex items-center justify-center gap-3">
            {[
              { id: 'google', icon: <GoogleIcon />, label: 'Google' },
              { id: 'github', icon: <GithubIcon />, label: 'GitHub' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                disabled
                data-testid={`signin-social-${p.id}`}
                title={`${p.label} — coming soon`}
                className="group relative flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-mono text-[11.5px] uppercase tracking-[0.16em] cursor-not-allowed opacity-60"
                style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${C.hair2}`, color: C.ink }}
              >
                {p.icon} <span>{p.label}</span>
                <span className="ml-1 font-mono text-[9px] tracking-widest" style={{ color: C.inkMute }}>soon</span>
              </button>
            ))}
          </div>

          {/* swap mode */}
          <p className="animate-element animate-delay-1000 mt-8 text-center font-body text-[13.5px]" style={{ color: C.inkDim }}>
            {isLogin ? 'New here?' : 'Already deployed?'}{' '}
            <button onClick={onToggleMode} type="button" data-testid="signin-toggle-mode"
              className="font-medium underline-offset-4 hover:underline transition-colors cursor-pointer"
              style={{ color: C.teal }}
            >
              {isLogin ? 'Create an account' : 'Sign in instead'} <ArrowUpRight size={12} className="inline -translate-y-px" />
            </button>
          </p>
        </div>
      </section>

      {/* RIGHT — testimonials column (match landing card aesthetic) */}
      <section className="hidden lg:flex flex-1 relative p-8 z-10">
        <div
          className="animate-slide-right animate-delay-300 w-full h-full relative overflow-hidden flex flex-col"
          style={{
            background: `linear-gradient(180deg, ${C.bg1} 0%, ${C.bg0} 100%)`,
            border: `1px solid ${C.hair2}`,
            borderRadius: 28,
            boxShadow: '0 60px 120px -40px rgba(45,212,191,0.20), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          {/* dot grid + halo */}
          <div className="bg-dotgrid pointer-events-none absolute inset-0 opacity-50" />
          <div
            className="pointer-events-none absolute -top-32 -right-24 h-[460px] w-[680px] rounded-[50%]"
            style={{
              background: `radial-gradient(closest-side, rgba(139,92,246,0.18), rgba(45,212,191,0.10) 45%, transparent 75%)`,
              filter: 'blur(4px)',
            }}
          />

          {/* IDE window chrome */}
          <div className="relative flex items-center justify-between px-5 py-3.5" style={{ borderBottom: `1px solid ${C.hair}` }}>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#ff5f57' }} />
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#febc2e' }} />
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#28c840' }} />
            </div>
            <div className="font-mono text-[10.5px] flex items-center gap-2" style={{ color: C.inkMute }}>
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full" style={{ background: C.emerald }} />
              precept · ~/career
            </div>
            <div className="font-mono text-[10.5px]" style={{ color: C.inkMute }}>v1.0</div>
          </div>

          {/* copy */}
          <div className="relative px-10 pt-10 pb-6">
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.18em]"
              style={{ background: `${C.emerald}14`, border: `1px solid ${C.emerald}33`, color: C.emerald }}
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: C.emerald, boxShadow: `0 0 8px ${C.emerald}` }} />
              Receipts
            </span>
            <h2 className="mt-5 font-display font-bold leading-[1.05]" style={{ color: C.ink, fontSize: 'clamp(28px, 3.4vw, 44px)' }}>
              Engineers who stopped{' '}
              <span className="font-editorial" style={{ color: C.amber, fontWeight: 400 }}>winging it.</span>
            </h2>
            <p className="mt-4 max-w-[420px] font-body text-[14px] leading-relaxed" style={{ color: C.inkDim }}>
              Real operators, real loops. Your stories, drills and pipeline live in one cockpit — and ship as JSON whenever you want.
            </p>
          </div>

          {/* testimonial chips */}
          {testimonials.length > 0 && (
            <div className="relative mt-auto px-8 pb-10 flex flex-col xl:flex-row gap-5 justify-center items-center">
              <TestimonialChip t={testimonials[0]} delay="animate-delay-1000" />
              {testimonials[1] && (
                <div className="hidden xl:flex"><TestimonialChip t={testimonials[1]} delay="animate-delay-1200" /></div>
              )}
            </div>
          )}

          {/* tech bar */}
          <div className="relative px-8 pb-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: C.inkMute }}>
            <span>Open source · MIT</span>
            <span className="opacity-30">/</span>
            <span>.NET 10</span>
            <span className="opacity-30">/</span>
            <span>React 19</span>
            <span className="opacity-30">/</span>
            <span>PostgreSQL</span>
          </div>
        </div>
      </section>
    </div>
  );
};
