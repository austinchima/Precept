/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

let _accessToken: string | null = localStorage.getItem('precept_access_token');

export function getAccessToken(): string | null {
  return _accessToken;
}

export function setAccessToken(token: string | null) {
  _accessToken = token;
  if (token) {
    localStorage.setItem('precept_access_token', token);
  } else {
    localStorage.removeItem('precept_access_token');
  }
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.map((cb) => cb(token));
  refreshSubscribers = [];
}

async function refreshAccessToken(): Promise<string> {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Refresh token expired or invalid');
  }

  const data = await response.json();
  const newToken = data.accessToken;
  setAccessToken(newToken);
  return newToken;
}

export async function apiFetch(url: string, options: RequestOptions = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});
  
  if (!options.skipAuth && _accessToken) {
    headers.set('Authorization', `Bearer ${_accessToken}`);
  }

  // Set default content type to JSON if sending a body and not already set
  if (options.body && !headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  const response = await fetch(url, config);

  if (response.status === 401 && !options.skipAuth) {
    // If already refreshing, wait for it to finish
    if (isRefreshing) {
      return new Promise((resolve) => {
        subscribeTokenRefresh((token) => {
          headers.set('Authorization', `Bearer ${token}`);
          resolve(fetch(url, { ...options, headers }));
        });
      });
    }

    isRefreshing = true;

    try {
      const newToken = await refreshAccessToken();
      isRefreshing = false;
      onRefreshed(newToken);
      
      // Retry original request
      headers.set('Authorization', `Bearer ${newToken}`);
      return await fetch(url, { ...options, headers });
    } catch (err) {
      isRefreshing = false;
      refreshSubscribers = [];
      setAccessToken(null);
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

  async post<T>(url: string, body?: any, options?: RequestOptions): Promise<T> {
    const res = await apiFetch(url, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res));
    if (res.status === 204) return {} as T;
    return res.json() as Promise<T>;
  },

  async put<T>(url: string, body?: any, options?: RequestOptions): Promise<T> {
    const res = await apiFetch(url, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res));
    if (res.status === 204) return {} as T;
    return res.json() as Promise<T>;
  },

  async patch<T>(url: string, body?: any, options?: RequestOptions): Promise<T> {
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
