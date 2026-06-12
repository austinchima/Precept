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

export const api = {
  async get<T>(url: string, options?: RequestOptions): Promise<T> {
    const res = await apiFetch(url, { ...options, method: 'GET' });
    if (!res.ok) throw new Error(await res.text() || res.statusText);
    return res.json() as Promise<T>;
  },

  async post<T>(url: string, body?: any, options?: RequestOptions): Promise<T> {
    const res = await apiFetch(url, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(await res.text() || res.statusText);
    if (res.status === 204) return {} as T;
    return res.json() as Promise<T>;
  },

  async put<T>(url: string, body?: any, options?: RequestOptions): Promise<T> {
    const res = await apiFetch(url, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(await res.text() || res.statusText);
    if (res.status === 204) return {} as T;
    return res.json() as Promise<T>;
  },

  async patch<T>(url: string, body?: any, options?: RequestOptions): Promise<T> {
    const res = await apiFetch(url, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(await res.text() || res.statusText);
    if (res.status === 204) return {} as T;
    return res.json() as Promise<T>;
  },

  async delete(url: string, options?: RequestOptions): Promise<void> {
    const res = await apiFetch(url, { ...options, method: 'DELETE' });
    if (!res.ok) throw new Error(await res.text() || res.statusText);
  },
};
