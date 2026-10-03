import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useToast } from '../components/ui/Toast';
import type { Application } from '../types';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button, Logo } from '../components/ui/kit';

/**
 * Capture page — invoked by the bookmarklet with `?url=...&title=...`.
 * It calls the backend capture endpoint and then redirects to the application
 * tracker so the user can review and edit the draft.
 */
export default function Capture() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { success, error } = useToast();
  const [status, setStatus] = useState<'idle' | 'capturing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('Reading the job posting.');
  const hasRun = useRef(false);

  const url = searchParams.get('url');
  const title = searchParams.get('title') ?? undefined;

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    if (!url) {
      setStatus('error');
      setMessage('No URL provided. Use the bookmarklet from a job posting page.');
      error('No job posting URL was provided.');
      return;
    }

    setStatus('capturing');

    api
      .post<Application>('/api/application/capture', { url, title })
      .then((application) => {
        setStatus('success');
        setMessage(`Captured draft for ${application.companyName || 'the company'}.`);
        success('Draft application captured successfully.');
        navigate('/applications', { replace: true });
      })
      .catch((err) => {
        setStatus('error');
        const msg = err instanceof Error ? err.message : 'Failed to capture job posting.';
        setMessage(msg);
        error(msg);
      });
  }, [url, title, navigate, success, error]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-bg px-6">
      <header className="mx-auto flex h-16 w-full max-w-xl items-center">
        <Logo />
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center pb-24" aria-live="polite">
        {status === 'error' ? (
          <>
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-danger-soft text-danger">
              <AlertTriangle size={18} />
            </span>
            <h1 className="mt-5 text-[22px] font-semibold tracking-tight text-fg">The posting could not be captured.</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-fg-2">{message}</p>
            <div className="mt-6">
              <Button variant="primary" to="/applications">Go to applications</Button>
            </div>
          </>
        ) : (
          <>
            <Loader2 size={22} className="animate-spin text-fg-2" aria-hidden="true" />
            <h1 className="mt-5 text-[22px] font-semibold tracking-tight text-fg">Saving the posting as a draft</h1>
            <p className="mt-2 text-[14px] text-fg-2">{message}</p>
            {url && (
              <p className="mt-3 truncate font-mono text-[12px] text-fg-3" title={url}>
                {url}
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
