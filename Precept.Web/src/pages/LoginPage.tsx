import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Moon, Sun } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { Button, Field, Input, Logo } from '../components/ui/kit';
import { useTheme } from '../lib/theme';

type Mode = 'signin' | 'signup';

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function readError(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  try {
    const parsed = JSON.parse(err.message);
    if (parsed?.message) return parsed.message;
    if (parsed && typeof parsed === 'object') {
      const list = Object.values(parsed).flat() as string[];
      if (list.length > 0) return list.join(' ');
    }
  } catch {
    return err.message || fallback;
  }
  return fallback;
}

export default function LoginPage() {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const initial: Mode = params.get('mode') === 'signup' || location.state?.mode === 'signup' ? 'signup' : 'signin';
  const [mode, setMode] = useState<Mode>(initial);
  const [busy, setBusy] = useState<'form' | 'demo' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const { login, register, demoLogin, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { resolved, setPreference } = useTheme();
  const isSignup = mode === 'signup';

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    document.title = isSignup ? 'Create account · Precept' : 'Sign in · Precept';
  }, [isSignup]);

  const switchMode = () => {
    const next: Mode = isSignup ? 'signin' : 'signup';
    setMode(next);
    setError(null);
    setParams(next === 'signup' ? { mode: 'signup' } : {}, { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    const email = String(data.email ?? '').replace(/\s/g, '');

    if (!emailRegex.test(email)) {
      setError('Enter a valid email address, for example you@example.com.');
      return;
    }
    if (isSignup && data.acceptTerms !== 'on') {
      setError('Agree to the Terms of Service to create an account.');
      return;
    }

    setBusy('form');
    setError(null);
    try {
      if (isSignup) {
        await register(String(data.firstName), String(data.lastName), email, String(data.password), true);
      } else {
        await login(email, String(data.password), data.rememberMe === 'on');
      }
      navigate('/dashboard');
    } catch (err) {
      setError(readError(err, isSignup ? 'We could not create your account.' : 'Email or password is incorrect.'));
    } finally {
      setBusy(null);
    }
  };

  const handleDemo = async () => {
    setBusy('demo');
    setError(null);
    try {
      await demoLogin();
      navigate('/dashboard');
    } catch {
      setError('The demo could not start. Try again in a moment, or create an account.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid min-h-[100dvh] bg-bg text-fg lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]" data-testid="signin-page">
      {/* Form column */}
      <div className="flex min-h-[100dvh] flex-col px-5 py-6 md:px-10">
        <header className="flex items-center justify-between">
          <Link to="/" aria-label="Precept home" data-testid="signin-logo">
            <Logo />
          </Link>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              aria-label={resolved === 'dark' ? 'Use light theme' : 'Use dark theme'}
              icon={resolved === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              onClick={() => setPreference(resolved === 'dark' ? 'light' : 'dark')}
            />
            <Button variant="ghost" size="sm" to="/" icon={<ArrowLeft size={15} />} data-testid="signin-back">
              Home
            </Button>
          </div>
        </header>

        <main id="main" className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1 className="display-md text-fg">{isSignup ? 'Create your account' : 'Welcome back'}</h1>
              <p className="mt-2 text-[15px] text-fg-2">
                {isSignup ? 'Start banking the stories you will be asked about.' : 'Sign in to pick up where you left off.'}
              </p>
            </motion.div>
          </AnimatePresence>

          {error && (
            <div
              role="alert"
              className="mt-6 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-3 text-[13.5px] text-danger"
              data-testid="signin-error"
            >
              {error}
            </div>
          )}

          <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            {isSignup && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name" htmlFor="firstName">
                  <Input id="firstName" name="firstName" autoComplete="given-name" required data-testid="signin-firstname" />
                </Field>
                <Field label="Last name" htmlFor="lastName">
                  <Input id="lastName" name="lastName" autoComplete="family-name" required data-testid="signin-lastname" />
                </Field>
              </div>
            )}

            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                required
                data-testid="signin-email"
              />
            </Field>

            <Field
              label="Password"
              htmlFor="password"
              help={isSignup ? 'At least 8 characters with an uppercase letter, a lowercase letter, a number and a symbol.' : undefined}
            >
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  required
                  className="pr-10"
                  data-testid="signin-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-lg text-fg-3 transition-colors hover:text-fg"
                  data-testid="signin-toggle-password"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            {isSignup ? (
              <label className="flex items-start gap-2.5 text-[13.5px] text-fg-2">
                <input type="checkbox" name="acceptTerms" className="mt-0.5 size-4 accent-[var(--accent)]" data-testid="signin-terms" />
                <span>
                  I agree to the{' '}
                  <Link to="/terms" className="text-fg underline decoration-line-strong underline-offset-4 hover:decoration-fg">
                    Terms of Service
                  </Link>
                  .
                </span>
              </label>
            ) : (
              <label className="flex items-center gap-2.5 text-[13.5px] text-fg-2">
                <input type="checkbox" name="rememberMe" defaultChecked className="size-4 accent-[var(--accent)]" data-testid="signin-remember" />
                Keep me signed in on this device
              </label>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="mt-2 w-full"
              loading={busy === 'form'}
              disabled={busy !== null}
              iconRight={<ArrowRight size={16} />}
              data-testid="signin-submit"
            >
              {isSignup ? 'Create account' : 'Sign in'}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-[12px] text-fg-3">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>

          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={handleDemo}
            loading={busy === 'demo'}
            disabled={busy !== null}
            data-testid="signin-demo-login"
          >
            Try the demo
          </Button>
          <p className="mt-2.5 text-center text-[12.5px] text-fg-3">No sign-up. The demo account deletes itself after 24 hours.</p>

          <p className="mt-10 text-center text-[14px] text-fg-2">
            {isSignup ? 'Already have an account?' : 'New to Precept?'}{' '}
            <button
              type="button"
              onClick={switchMode}
              className="font-medium text-fg underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-fg"
              data-testid="signin-toggle-mode"
            >
              {isSignup ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        </main>

        <footer className="text-[12.5px] text-fg-3">
          <Link to="/terms" className="hover:text-fg">
            Terms
          </Link>
        </footer>
      </div>

      {/* Product column */}
      <aside aria-hidden="true" className="relative hidden overflow-hidden border-l border-line bg-surface-1 lg:block">
        <div className="absolute inset-0 grain" />
        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          <p className="display-md max-w-[20ch] text-fg">The outage you fixed is the answer they want to hear.</p>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            className="-mr-40 overflow-hidden rounded-2xl border border-line-strong shadow-[0_40px_120px_-30px_rgba(0,0,0,0.45)]"
          >
            <img
              src={`/product/${resolved}-stories.webp`}
              alt=""
              width={2400}
              height={1500}
              className="block w-full"
              decoding="async"
            />
          </motion.div>
        </div>
      </aside>
    </div>
  );
}
