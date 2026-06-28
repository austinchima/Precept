import React, { useState } from 'react';
import { AnimatedGridBackground } from './animated-grid-background';

// --- HELPER COMPONENTS (ICONS) ---
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

// --- TYPE DEFINITIONS ---
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

// --- SUB-COMPONENTS ---
const GlassInputWrapper = ({ children, isError = false }: { children: React.ReactNode, isError?: boolean }) => (
  <div className={`rounded-xl border ${isError ? 'border-red-500/50 bg-red-500/5' : 'border-brand-border bg-surface-container-low/55 backdrop-blur-md'} transition-colors focus-within:border-brand-primary/60 focus-within:bg-brand-primary/5 flex items-center`}>
    {children}
  </div>
);

const TestimonialCard = ({ testimonial, delay }: { testimonial: Testimonial, delay: string }) => (
  <div className={`animate-testimonial ${delay} flex items-start gap-3 rounded-2xl glass-card p-5 w-72 shadow-lg`}>
    {testimonial.avatarSrc ? (
      <img src={testimonial.avatarSrc} className="h-10 w-10 object-cover rounded-xl border border-brand-border shrink-0" alt="avatar" width={40} height={40} loading="lazy" decoding="async" />
    ) : (
      <div className="h-10 w-10 rounded-xl border border-brand-border shrink-0 flex items-center justify-center bg-brand-primary/10 text-brand-primary font-bold text-lg">
        {testimonial.name.charAt(0).toUpperCase()}
      </div>
    )}
    <div className="text-sm leading-snug">
      <p className="flex items-center gap-1 font-heading font-bold text-brand-text">{testimonial.name}</p>
      <p className="font-mono text-xs text-brand-primary mt-0.5">{testimonial.handle}</p>
      <p className="mt-2 font-sans text-brand-text-muted">{testimonial.text}</p>
    </div>
  </div>
);

// --- MAIN COMPONENT ---
export const SignInPage: React.FC<SignInPageProps> = ({
  title,
  description,
  heroImageSrc,
  testimonials = [],
  isLogin,
  isLoading,
  error,
  onToggleMode,
  onSubmit,
  onGoogleSignIn,
  onResetPassword,
  onBack,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <AnimatedGridBackground>
      {/* Left column: sign-in form */}
      <section className="flex-1 flex flex-col items-center justify-center p-4 lg:p-8 z-10 relative overflow-y-auto">
        <div className="w-full max-w-[448px] my-auto py-4">

          <div className="animate-element animate-delay-100 flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-surface border border-brand-border rounded-lg overflow-hidden flex items-center justify-center relative group">
                <img src="/logo.png" alt="Precept Logo" className="w-full h-full object-cover" width={40} height={40} fetchpriority="high" />
              </div>
              <div>
                <span className="font-heading font-bold text-xl tracking-tight text-brand-text leading-none block">Precept</span>
                <span className="font-mono text-[10px] text-brand-text-muted uppercase tracking-wider block mt-1">Job Hunt OS</span>
              </div>
            </div>

            {onBack && (
              <button 
                onClick={onBack}
                type="button"
                className="flex items-center justify-center min-h-[44px] px-2 -ml-2 gap-2 text-brand-text-muted hover:text-brand-primary transition-colors font-mono text-xs uppercase tracking-wider cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                Return to Base
              </button>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <h1 className="animate-element animate-delay-100 text-4xl md:text-5xl font-heading font-bold tracking-tight text-brand-text">{title || (isLogin ? "Welcome Back" : "Deploy Account")}</h1>
            <p className="animate-element animate-delay-200 text-brand-text-muted font-sans text-lg">{description || (isLogin ? "Sign in to your Precept account." : "Create your free account to get started.")}</p>

            {error && (
              <div className="animate-element animate-delay-200 p-4 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-3">
                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
                <span className="font-mono text-[13px]">{error}</span>
              </div>
            )}

            <form className="space-y-5" onSubmit={onSubmit}>
              
              {/* Registration Fields */}
              <div className={`grid grid-cols-2 gap-4 transition-all duration-500 overflow-hidden ${isLogin ? 'max-h-0 opacity-0 m-0' : 'max-h-32 opacity-100 mb-5'}`}>
                <div className="animate-element animate-delay-300">
                  <label className="font-mono text-[11px] uppercase tracking-wider text-brand-text-muted mb-2 block">First Name</label>
                  <GlassInputWrapper>
                    <input name="firstName" type="text" placeholder="John" className="w-full bg-transparent text-sm p-4 font-mono focus:outline-none placeholder:text-brand-text-muted/50" required={!isLogin} />
                  </GlassInputWrapper>
                </div>
                <div className="animate-element animate-delay-300">
                  <label className="font-mono text-[11px] uppercase tracking-wider text-brand-text-muted mb-2 block">Last Name</label>
                  <GlassInputWrapper>
                    <input name="lastName" type="text" placeholder="Doe" className="w-full bg-transparent text-sm p-4 font-mono focus:outline-none placeholder:text-brand-text-muted/50" required={!isLogin} />
                  </GlassInputWrapper>
                </div>
              </div>

              <div className="animate-element animate-delay-400">
                <label className="font-mono text-[11px] uppercase tracking-wider text-brand-text-muted mb-2 block">Email Address</label>
                <GlassInputWrapper isError={!!error}>
                  <span className="material-symbols-outlined ml-4 text-brand-text-muted text-[18px]">mail</span>
                  <input name="email" type="email" placeholder="engineer@domain.com" className="w-full bg-transparent text-sm p-4 font-mono focus:outline-none placeholder:text-brand-text-muted/50" required />
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-500">
                <div className="flex items-center justify-between mb-2">
                   <label className="font-mono text-[11px] uppercase tracking-wider text-brand-text-muted">Password</label>
                   {isLogin && (
                     <a href="#" onClick={(e) => { e.preventDefault(); onResetPassword?.(); }} className="font-mono text-[11px] hover:text-brand-primary text-brand-text-muted transition-colors min-h-[44px] inline-flex items-center px-2 -mr-2">Forgot protocol?</a>
                   )}
                </div>
                <GlassInputWrapper isError={!!error}>
                  <span className="material-symbols-outlined ml-4 text-brand-text-muted text-[18px]">lock</span>
                  <div className="relative w-full">
                    <input name="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••••••••" className="w-full bg-transparent text-sm p-4 pr-14 font-mono tracking-widest focus:outline-none placeholder:text-brand-text-muted/50" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-1 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer">
                      {showPassword ? <span className="material-symbols-outlined text-[20px] text-brand-text-muted hover:text-brand-primary transition-colors">visibility_off</span> : <span className="material-symbols-outlined text-[20px] text-brand-text-muted hover:text-brand-primary transition-colors">visibility</span>}
                    </button>
                  </div>
                </GlassInputWrapper>
              </div>

              {isLogin && (
                <div className="animate-element animate-delay-600 flex items-center text-sm mt-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center w-4 h-4 border border-brand-border rounded bg-brand-surface group-hover:border-brand-primary transition-colors">
                        <input type="checkbox" name="rememberMe" className="peer opacity-0 absolute inset-0 cursor-pointer" />
                        <span className="material-symbols-outlined text-[14px] text-brand-primary opacity-0 peer-checked:opacity-100 transition-opacity">check</span>
                    </div>
                    <span className="text-brand-text-muted font-mono text-[12px]">Keep session active</span>
                  </label>
                </div>
              )}

              <button type="submit" disabled={isLoading} className="animate-element animate-delay-700 w-full rounded-md bg-brand-primary py-4 font-mono font-bold text-brand-secondary hover:bg-brand-primary-container hover:-translate-y-0.5 transition-all shadow-[0_0_20px_rgba(50,185,200,0.2)] hover:shadow-[0_0_30px_rgba(50,185,200,0.4)] mt-6 cursor-pointer flex items-center justify-center gap-2">
                {isLoading ? <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> : (
                   <>
                      {isLogin ? "Initialize Protocol" : "Deploy Account"}
                      <span className="material-symbols-outlined text-[18px]">{isLogin ? "login" : "rocket_launch"}</span>
                   </>
                )}
              </button>
            </form>

            <div className="animate-element animate-delay-800 relative flex items-center justify-center mt-6">
              <span className="w-full border-t border-brand-border"></span>
              <span className="px-4 text-[11px] font-mono uppercase tracking-widest text-brand-text-muted bg-brand-secondary absolute">Or Bypass With</span>
            </div>

            <div className="animate-element animate-delay-900 flex items-center justify-center gap-4 mt-6">
              <button 
                type="button"
                className="group relative flex items-center justify-center w-14 h-14 border border-brand-border/50 rounded-full bg-brand-surface opacity-50 cursor-not-allowed transition-all hover:bg-brand-surface-high"
                title="Google Integration (Coming Soon)"
                disabled
              >
                <GoogleIcon />
                <span className="absolute -top-10 scale-0 group-hover:scale-100 transition-transform bg-brand-surface border border-brand-border text-brand-text-muted text-[10px] font-mono px-3 py-1.5 rounded whitespace-nowrap z-50">Coming Soon</span>
              </button>
              
              <button 
                type="button"
                className="group relative flex items-center justify-center w-14 h-14 border border-brand-border/50 rounded-full bg-brand-surface opacity-50 cursor-not-allowed transition-all hover:bg-brand-surface-high text-brand-text"
                title="GitHub Integration (Coming Soon)"
                disabled
              >
                <GithubIcon />
                <span className="absolute -top-10 scale-0 group-hover:scale-100 transition-transform bg-brand-surface border border-brand-border text-brand-text-muted text-[10px] font-mono px-3 py-1.5 rounded whitespace-nowrap z-50">Coming Soon</span>
              </button>
            </div>

            <p className="animate-element animate-delay-1000 text-center text-sm font-sans text-brand-text-muted mt-6 flex items-center justify-center flex-wrap gap-1">
              {isLogin ? "New operator?" : "Already deployed?"} 
              <button onClick={onToggleMode} type="button" className="text-brand-primary font-medium hover:underline transition-colors cursor-pointer min-h-[44px] px-2 -mx-2">
                {isLogin ? "Create Account" : "Sign In"}
              </button>
            </p>
          </div>
        </div>
      </section>

      {/* Right column: hero image + testimonials */}
      {heroImageSrc && (
        <section className="hidden lg:flex flex-1 relative p-6 pl-0 bg-brand-secondary z-10">
          <div className="animate-slide-right animate-delay-300 w-full h-full relative rounded-3xl overflow-hidden border border-brand-border/50 shadow-2xl">
             <div className="absolute inset-0 bg-brand-primary/10 mix-blend-overlay z-10"></div>
             <div className="absolute inset-0 bg-linear-to-t from-brand-secondary via-brand-secondary/40 to-transparent z-10"></div>
             <div className="absolute inset-0 bg-cover bg-center grayscale contrast-125" style={{ backgroundImage: `url(${heroImageSrc})` }}></div>
             
             {/* Tech Grid Pattern overlay */}
             <div className="absolute inset-0 opacity-[0.2] z-10" style={{ backgroundImage: 'linear-gradient(var(--color-brand-primary) 1px, transparent 1px), linear-gradient(90deg, var(--color-brand-primary) 1px, transparent 1px)', backgroundSize: '48px 48px' }}></div>

             {testimonials.length > 0 && (
               <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col xl:flex-row gap-6 px-8 w-full justify-center items-center z-20">
                 <TestimonialCard testimonial={testimonials[0]} delay="animate-delay-1000" />
                 {testimonials[1] && <div className="hidden xl:flex"><TestimonialCard testimonial={testimonials[1]} delay="animate-delay-1200" /></div>}
                 {testimonials[2] && <div className="hidden 2xl:flex"><TestimonialCard testimonial={testimonials[2]} delay="animate-delay-1400" /></div>}
               </div>
             )}
          </div>
        </section>
      )}
    </AnimatedGridBackground>
  );
};
