import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserContextType } from './types';
import { api, setAccessToken } from './api';

const AuthContext = createContext<UserContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Attempt to restore session on mount (silent refresh)
  useEffect(() => {
    async function restoreSession() {
      try {
        // Send a request to refresh endpoint. If the user has a valid HttpOnly refresh cookie,
        // it will succeed and return a new accessToken.
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (res.ok) {
          const data = await res.json();
          setAccessToken(data.accessToken);
          setIsAuthenticated(true);
          
          // Fetch user details
          const profile = await api.get<User>('/api/auth/me');
          setUser(profile);
        } else {
          setAccessToken(null);
        }
      } catch (err) {
        console.error('Session restoration failed:', err);
        setAccessToken(null);
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
      setAccessToken(null);
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    return () => {
      window.removeEventListener('auth-expired', handleAuthExpired);
    };
  }, []);

  const login = async (email: string, passcode: string, rememberMe: boolean = true) => {
    try {
      const data = await api.post<{ accessToken: string; userId: string; email: string }>('/api/auth/login', {
        email,
        password: passcode,
        rememberMe,
      }, { skipAuth: true });

      setAccessToken(data.accessToken);
      setIsAuthenticated(true);
      
      const profile = await api.get<User>('/api/auth/me');
      setUser(profile);
    } catch (err) {
      setIsAuthenticated(false);
      setUser(null);
      setAccessToken(null);
      throw err;
    }
  };

  const register = async (firstName: string, lastName: string, email: string, passcode: string) => {
    try {
      const data = await api.post<{ accessToken: string; userId: string; email: string }>('/api/auth/register', {
        firstName,
        lastName,
        email,
        password: passcode,
        confirmPassword: passcode,
      }, { skipAuth: true });

      setAccessToken(data.accessToken);
      setIsAuthenticated(true);

      const profile = await api.get<User>('/api/auth/me');
      setUser(profile);
    } catch (err) {
      setIsAuthenticated(false);
      setUser(null);
      setAccessToken(null);
      throw err;
    }
  };

  const updateProfile = async (firstName: string, lastName: string) => {
    try {
      const updatedUser = await api.put<User>('/api/auth/profile', { firstName, lastName });
      setUser(updatedUser);
    } catch (err) {
      console.error('Failed to update profile:', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/revoke', {});
    } catch (err) {
      console.error('Failed to revoke token on logout:', err);
    } finally {
      setIsAuthenticated(false);
      setUser(null);
      setAccessToken(null);
    }
  };

  // Permanently deletes the account and all server-side data. Only clears local
  // session state once the backend confirms the deletion succeeded.
  const deleteAccount = async () => {
    await api.delete('/api/auth/account');
    setIsAuthenticated(false);
    setUser(null);
    setAccessToken(null);
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
