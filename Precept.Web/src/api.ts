/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// OWASP NOTE: The access token is stored in an HttpOnly cookie set by the API.
// The browser sends it automatically with same-site / cross-origin credentials.
// The frontend never reads or persists the token, eliminating localStorage XSS risk.

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

let isRefreshing = false;
let refreshSubscribers: (() => void)[] = [];

function subscribeTokenRefresh(cb: () => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed() {
  refreshSubscribers.map((cb) => cb());
  refreshSubscribers = [];
}

function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError || (err instanceof Error && /fetch|network|failed/i.test(err.message));
}

async function refreshAccessToken(): Promise<void> {
  let response: Response;
  try {
    response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    if (isNetworkError(err)) {
      throw new Error('Unable to reach the server. Please check your connection and try again.');
    }
    throw err;
  }

  if (!response.ok) {
    let isConcurrentRetry = false;
    try {
      const errorData = await response.json();
      // [Benign Retry Interceptor]: Another concurrent browser tab or overlapping request
      // just successfully rotated the refresh token within the grace window.
      // The new access token cookie is already set; we just need to retry the original request.
      if (errorData?.message === 'Token just refreshed') {
        isConcurrentRetry = true;
      }
    } catch {
      // Body parsing failed or unrelated 401 — fall through to error
    }

    if (!isConcurrentRetry) {
      throw new Error('Refresh token expired or invalid');
    }
  }
}

export async function apiFetch(url: string, options: RequestOptions = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});

  // Set default content type to JSON if sending a body and not already set
  if (options.body && !headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include',
  };

  let response: Response;
  try {
    response = await fetch(url, config);
  } catch (err) {
    if (isNetworkError(err)) {
      throw new Error('Unable to reach the server. Please check your connection and try again.');
    }
    throw err;
  }

  if (response.status === 401 && !options.skipAuth) {
    // If already refreshing, wait for it to finish
    if (isRefreshing) {
      return new Promise((resolve) => {
        subscribeTokenRefresh(() => {
          resolve(fetch(url, { ...options, headers, credentials: 'include' }));
        });
      });
    }

    isRefreshing = true;

    try {
      await refreshAccessToken();
      isRefreshing = false;
      onRefreshed();

      // Retry original request — the browser will send the new access token cookie
      return await fetch(url, { ...options, headers, credentials: 'include' });
    } catch (err) {
      isRefreshing = false;
      refreshSubscribers = [];
      // Trigger a window event to let AuthContext know it should log out
      window.dispatchEvent(new Event('auth-expired'));
      throw err;
    }
  }

  return response;
}

/**
 * Extracts a clean, human-readable error message from a failed HTTP response.
 * Priority: JSON body → plain text body → status code → generic fallback.
 */
async function extractErrorMessage(res: Response): Promise<string> {
  const STATUS_MESSAGES: Record<number, string> = {
    400: 'The request was invalid. Please check your input.',
    401: 'Your session has expired. Please sign in again.',
    402: 'This feature requires credits. Please purchase credits to continue.',
    403: 'You don\'t have permission to perform this action.',
    404: 'The requested resource was not found.',
    405: 'This action is not supported.',
    409: 'A conflict occurred. The record may already exist.',
    422: 'The data provided could not be processed.',
    429: 'Too many requests. Please slow down and try again.',
    500: 'A server error occurred. Please try again later.',
    502: 'The server is temporarily unavailable.',
    503: 'The service is currently unavailable. Please try again shortly.',
  };

  try {
    const text = await res.text();

    // If it looks like HTML (e.g. nginx error pages), don't show it
    if (text.trimStart().startsWith('<')) {
      return STATUS_MESSAGES[res.status] ?? `Unexpected error (${res.status}). Please try again.`;
    }

    const isTechnicalError = (msg: string) => {
      if (!msg) return false;
      if (msg.length > 250) return true; // Too long for a toast
      const lowerMsg = msg.toLowerCase();
      if (lowerMsg.includes('exception:') || lowerMsg.includes('exception (')) return true;
      if (lowerMsg.includes('\n   at ') || lowerMsg.includes(' at microsoft.')) return true; // .NET stack trace
      if (lowerMsg.includes('npgsql.') || lowerMsg.includes('entityframeworkcore')) return true;
      return false;
    };

    // Try parsing as JSON to extract a message field
    try {
      const json = JSON.parse(text);
      const msg = json?.message ?? json?.error ?? json?.title ?? json?.detail;
      
      if (typeof msg === 'string' && msg.trim()) {
        const trimmed = msg.trim();
        if (!isTechnicalError(trimmed)) {
          return trimmed;
        }
      }
    } catch {
      // Not JSON — fall through
    }

    // Plain text that isn't HTML
    if (text.trim()) {
      const trimmed = text.trim();
      if (!isTechnicalError(trimmed)) {
        return trimmed;
      }
    }
  } catch {
    // Could not read body
  }

  return STATUS_MESSAGES[res.status] ?? `Unexpected error (${res.status}). Please try again.`;
}

export const api = {
  async get<T>(url: string, options?: RequestOptions): Promise<T> {
    const res = await apiFetch(url, { ...options, method: 'GET' });
    if (!res.ok) throw new Error(await extractErrorMessage(res));
    return res.json() as Promise<T>;
  },

  async post<T, TBody = unknown>(url: string, body?: TBody, options?: RequestOptions): Promise<T> {
    const res = await apiFetch(url, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res));
    if (res.status === 204) return {} as T;
    return res.json() as Promise<T>;
  },

  async put<T, TBody = unknown>(url: string, body?: TBody, options?: RequestOptions): Promise<T> {
    const res = await apiFetch(url, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res));
    if (res.status === 204) return {} as T;
    return res.json() as Promise<T>;
  },

  async patch<T, TBody = unknown>(url: string, body?: TBody, options?: RequestOptions): Promise<T> {
    const res = await apiFetch(url, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res));
    if (res.status === 204) return {} as T;
    return res.json() as Promise<T>;
  },

  async delete(url: string, options?: RequestOptions): Promise<void> {
    const res = await apiFetch(url, { ...options, method: 'DELETE' });
    if (!res.ok) throw new Error(await extractErrorMessage(res));
  },
};
