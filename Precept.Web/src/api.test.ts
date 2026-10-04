import { describe, expect, it, vi } from 'vitest';
import { api } from './api';
import { mockApi } from './test/utils';

describe('api.getAll', () => {
  it('reads every page at the largest page size and stops when there is no next page', async () => {
    const { calls } = mockApi({
      'GET /api/skill': (_init, url) => {
        const page = Number(url.searchParams.get('page'));
        return { body: { items: [{ id: `s${page}` }], hasNextPage: page < 3 } };
      },
    });

    const items = await api.getAll<{ id: string }>('/api/skill');

    expect(items.map((i) => i.id)).toEqual(['s1', 's2', 's3']);
    expect(calls.map((c) => c.path)).toEqual([
      '/api/skill?page=1&pageSize=100',
      '/api/skill?page=2&pageSize=100',
      '/api/skill?page=3&pageSize=100',
    ]);
  });

  it('appends paging to a URL that already has a query string', async () => {
    const { calls } = mockApi({ 'GET /api/story': { body: { items: [], hasNextPage: false } } });

    await api.getAll('/api/story?category=Backend');

    expect(calls[0].path).toBe('/api/story?category=Backend&page=1&pageSize=100');
  });

  it('stops at maxPages even if the server keeps saying there is more', async () => {
    const { calls } = mockApi({ 'GET /api/skill': { body: { items: [{ id: 'x' }], hasNextPage: true } } });

    const items = await api.getAll('/api/skill', 4);

    expect(items).toHaveLength(4);
    expect(calls).toHaveLength(4);
  });
});

describe('api error messages', () => {
  it('turns an AI limit refusal (402) into a message with the reset time', async () => {
    mockApi({
      'POST /api/mockinterview/generate-question': {
        status: 402,
        body: { code: 'limit_reached', feature: 'mock_question', remaining: 0, resetsAt: '2026-10-05T00:00:00Z', message: 'server text' },
      },
    });

    const error = await api.post('/api/mockinterview/generate-question', {}).catch((e: Error) => e);

    expect((error as Error).message).toMatch(/^You have used this AI feature's allowance\. It resets .+\.$/);
  });

  it('turns the global AI pause (503) into its own message', async () => {
    mockApi({
      'POST /api/mockinterview/evaluate': { status: 503, body: { code: 'ai_unavailable', resetsAt: '2026-10-05T00:00:00Z', message: 'x' } },
    });

    const error = await api.post('/api/mockinterview/evaluate', {}).catch((e: Error) => e);

    expect((error as Error).message).toMatch(/^AI features are paused until .+\. Everything else keeps working\.$/);
  });

  it('does not mention buying credits for a bare 402', async () => {
    mockApi({ 'GET /api/x': { status: 402 } });

    const error = await api.get('/api/x').catch((e: Error) => e);

    expect((error as Error).message).toBe('You have reached the limit for this feature for now.');
  });
});

describe('apiFetch', () => {
  it('sends the CSRF header and cookies on every request', async () => {
    const { fetchMock } = mockApi({ 'POST /api/story': { status: 201, body: {} } });

    await api.post('/api/story', { title: 't' });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).get('X-Requested-With')).toBe('XMLHttpRequest');
    expect(init.credentials).toBe('include');
  });

  it('announces an expired session on 401', async () => {
    mockApi({ 'GET /api/dashboard': { status: 401 } });
    const listener = vi.fn();
    window.addEventListener('auth-expired', listener);

    await expect(api.get('/api/dashboard')).rejects.toThrow('Your session has expired');

    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener('auth-expired', listener);
  });
});
