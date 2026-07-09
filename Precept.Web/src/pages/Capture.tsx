import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useToast } from '../components/ui/Toast';
import type { Application } from '../types';

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
  const [message, setMessage] = useState('Reading job posting...');
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-secondary px-6">
      <div className="max-w-md w-full text-center space-y-6">
        {status === 'error' ? (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
              <i className="fa-solid fa-triangle-exclamation text-red-400 text-2xl"></i>
            </div>
            <h1 className="text-xl font-semibold text-text-primary">Couldn&apos;t capture posting</h1>
            <p className="text-text-secondary font-mono text-sm">{message}</p>
            <button
              onClick={() => navigate('/applications')}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary/90 transition-colors cursor-pointer"
            >
              Go to Application Tracker
            </button>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full border-4 border-brand-primary/10 border-t-brand-primary animate-spin mx-auto"></div>
            <h1 className="text-xl font-semibold text-text-primary">Capturing job posting...</h1>
            <p className="text-text-secondary font-mono text-sm">{message}</p>
            {url && (
              <p className="text-text-muted text-xs truncate" title={url}>
                {url}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
