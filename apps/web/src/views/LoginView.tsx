'use client';

import React, { useState } from 'react';
import { Activity, AlertCircle, Loader2, Shield, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const LoginView: React.FC = () => {
  const { login, isLoggingIn, loginError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
    } catch {
      // loginError is already set by the auth context; nothing else to do.
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--color-bg-app)' }}>
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl text-white shadow-lg mb-4 ring-8"
          style={{ backgroundColor: 'var(--color-primary)', boxShadow: '0 0 0 8px var(--color-accent-light)' }}
        >
          <Activity className="w-8 h-8" />
        </div>

        <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text-main)' }}>
          CareNest
        </h1>
        <p className="mt-1 text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
          Your patient&apos;s story, carried forward.
        </p>
        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
          AI-assisted field documentation for Community Health Workers
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-sm border border-slate-200 rounded-2xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:bg-white transition-all"
                style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
                placeholder="you@organization.org"
                required
                disabled={isLoggingIn}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:bg-white transition-all"
                required
                disabled={isLoggingIn}
              />
            </div>

            {loginError && (
              <div
                className="flex items-start gap-2 p-3 rounded-xl text-xs font-medium"
                style={{ backgroundColor: 'var(--color-urgent-bg)', color: 'var(--color-urgent-text)' }}
                role="alert"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full h-[52px] px-4 rounded-xl text-sm font-semibold text-white shadow-md transition-all active:scale-[0.99] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in…</span>
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />
              <span>Organization-scoped access</span>
            </div>
            <div className="flex items-center gap-1 font-medium" style={{ color: 'var(--color-online-text)' }}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>PWA Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
