import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthProvider } from '../AuthContext';
import { ToastProvider } from '../components/ui/Toast';

type Reply = { status?: number; body?: unknown };
type Handler = Reply | ((init: RequestInit | undefined, url: URL) => Reply);

export type RecordedCall = { method: string; path: string; body: unknown };

/**
 * Replaces global fetch with a router keyed by "METHOD /path" (query string ignored).
 * Unmatched requests return 404 so a missing stub shows up as a test failure, not a hang.
 */
export function mockApi(routes: Record<string, Handler>) {
  const calls: RecordedCall[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input.toString(), 'http://localhost');
    const method = (init?.method ?? 'GET').toUpperCase();
    let body: unknown = undefined;
    if (typeof init?.body === 'string') {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = init.body;
      }
    }
    calls.push({ method, path: url.pathname + url.search, body });
    const handler = routes[`${method} ${url.pathname}`];
    const reply: Reply = typeof handler === 'function' ? handler(init, url) : handler ?? { status: 404, body: { message: `No stub for ${method} ${url.pathname}` } };
    const status = reply.status ?? 200;
    return new Response(reply.body === undefined ? null : JSON.stringify(reply.body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { calls, fetchMock };
}

export const testUser = {
  userId: 'user-1',
  email: 'ines@example.com',
  firstName: 'Ines',
  lastName: 'Adeyemi',
  isDemo: false,
};

/** Renders a page inside the same providers the app uses, at the given route. */
export function renderPage(ui: ReactElement, { route = '/', path = '*' }: { route?: string; path?: string } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path={path} element={ui} />
            <Route path="/dashboard" element={<p>Dashboard route</p>} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}
