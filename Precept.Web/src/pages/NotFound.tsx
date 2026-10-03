import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { Button, Logo } from '../components/ui/kit';

export default function NotFound() {
  const { isAuthenticated } = useAuth();
  return (
    <div className="flex min-h-[100dvh] flex-col bg-bg px-6" data-testid="not-found">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center">
        <a href="/" aria-label="Precept home">
          <Logo />
        </a>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center pb-24">
        <p className="num font-mono text-[13px] text-fg-3">404</p>
        <h1 className="display-lg mt-3 max-w-[18ch] text-fg">This page does not exist.</h1>
        <p className="mt-4 max-w-[48ch] text-[15px] leading-relaxed text-fg-2">
          The link may be old or mistyped. Your stories and applications are where you left them.
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          <Button variant="primary" size="lg" to={isAuthenticated ? '/dashboard' : '/'} icon={<ArrowLeft size={16} />}>
            {isAuthenticated ? 'Back to dashboard' : 'Back to home'}
          </Button>
        </div>
      </main>
    </div>
  );
}
