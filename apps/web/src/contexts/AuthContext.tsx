'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { UNAUTHORIZED_EVENT } from '@/lib/api';
import { clearToken, getToken, setToken } from '@/lib/auth-storage';
import * as authService from '@/services/auth.service';
import type { AuthUser } from '@/types/domain';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  /** Set only after a failed login attempt; cleared on the next attempt. */
  loginError: string | null;
  isLoggingIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  // On boot: if a token is already persisted, re-validate it against the
  // database via GET /auth/me rather than trusting it blindly — catches an
  // expired or revoked (deactivated user) session immediately.
  useEffect(() => {
    const token = getToken();
    if (!token) {
      // Deferred to a microtask (react-hooks/set-state-in-effect forbids a
      // synchronous setState call in the effect body).
      void Promise.resolve().then(() => setStatus('unauthenticated'));
      return;
    }
    authService
      .me()
      .then((u) => {
        setUser(u);
        setStatus('authenticated');
      })
      .catch(() => {
        clearToken();
        setStatus('unauthenticated');
      });
  }, []);

  // Any apiFetch call that comes back 401 (expired/invalid token) forces a
  // logout, from anywhere in the app, without threading auth state through
  // every service call.
  useEffect(() => {
    const handler = () => logout();
    window.addEventListener(UNAUTHORIZED_EVENT, handler);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handler);
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const { token, user: loggedInUser } = await authService.login(email, password);
      setToken(token);
      setUser(loggedInUser);
      setStatus('authenticated');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Login failed. Please try again.';
      setLoginError(message);
      throw err;
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ status, user, loginError, isLoggingIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
