import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserContextType } from './types';
import { api } from './api';

const AuthContext = createContext<UserContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Attempt to restore session on mount (silent refresh)
  useEffect(() => {
    async function restoreSession() {
      try {
        // The access token is sent automatically in the HttpOnly cookie.
        // Try the lightweight profile endpoint first.
        const meRes = await fetch('/api/auth/me', { credentials: 'include' });

        if (meRes.ok) {
          const profile = await meRes.json();
          setIsAuthenticated(true);
          setUser(profile);
          setIsLoading(false);
          return;
        }

        if (meRes.status === 401) {
          // Access token missing/expired — try rotating the refresh token.
          const refreshRes = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          });

          if (refreshRes.ok) {
            const retryRes = await fetch('/api/auth/me', { credentials: 'include' });
            if (retryRes.ok) {
              const profile = await retryRes.json();
              setIsAuthenticated(true);
              setUser(profile);
            } else {
              setIsAuthenticated(false);
              setUser(null);
            }
          } else {
            setIsAuthenticated(false);
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Session restoration failed:', err);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  // Listen to session expiry events from api.ts
  useEffect(() => {
    const handleAuthExpired = () => {
      setIsAuthenticated(false);
      setUser(null);
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    return () => {
      window.removeEventListener('auth-expired', handleAuthExpired);
    };
  }, []);

  const login = async (email: string, passcode: string, rememberMe: boolean = true) => {
    try {
      await api.post<{ accessToken: string; userId: string; email: string }>('/api/auth/login', {
        email,
        password: passcode,
        rememberMe,
      }, { skipAuth: true });

      setIsAuthenticated(true);
      
      const profile = await api.get<User>('/api/auth/me');
      setUser(profile);
    } catch (err) {
      setIsAuthenticated(false);
      setUser(null);
      throw err;
    }
  };

  const register = async (firstName: string, lastName: string, email: string, passcode: string, agreedToTerms: boolean) => {
    try {
      await api.post<{ accessToken: string; userId: string; email: string }>('/api/auth/register', {
        firstName,
        lastName,
        email,
        password: passcode,
        confirmPassword: passcode,
        agreedToTerms,
      }, { skipAuth: true });

      setIsAuthenticated(true);

      const profile = await api.get<User>('/api/auth/me');
      setUser(profile);
    } catch (err) {
      setIsAuthenticated(false);
      setUser(null);
      throw err;
    }
  };

  const updateProfile = async (firstName: string, lastName: string, emailDigestEnabled?: boolean, digestIncludeFollowUps?: boolean, digestIncludeReviews?: boolean, digestHourUtc?: number) => {
    const payload: any = { firstName, lastName };
    if (emailDigestEnabled !== undefined) {
      payload.emailDigestEnabled = emailDigestEnabled;
    } else if (user?.emailDigestEnabled !== undefined) {
      payload.emailDigestEnabled = user.emailDigestEnabled;
    }
    
    if (digestIncludeFollowUps !== undefined) {
      payload.digestIncludeFollowUps = digestIncludeFollowUps;
    } else if (user?.digestIncludeFollowUps !== undefined) {
      payload.digestIncludeFollowUps = user.digestIncludeFollowUps;
    }

    if (digestIncludeReviews !== undefined) {
      payload.digestIncludeReviews = digestIncludeReviews;
    } else if (user?.digestIncludeReviews !== undefined) {
      payload.digestIncludeReviews = user.digestIncludeReviews;
    }

    if (digestHourUtc !== undefined) {
      payload.digestHourUtc = digestHourUtc;
    } else if (user?.digestHourUtc !== undefined) {
      payload.digestHourUtc = user.digestHourUtc;
    }

    const updatedUser = await api.put<User>('/api/auth/profile', payload);
    setUser(updatedUser);
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/revoke', {});
    } catch (err) {
      console.error('Failed to revoke token on logout:', err);
    } finally {
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  // Permanently deletes the account and all server-side data. Only clears local
  // session state once the backend confirms the deletion succeeded.
  const deleteAccount = async () => {
    await api.delete('/api/auth/account');
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, login, register, updateProfile, logout, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
