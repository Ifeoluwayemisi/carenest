'use client';

import React from 'react';
import { Wifi, WifiOff, RefreshCw, Activity } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface NavbarProps {
  isOnline: boolean;
  pendingSyncCount: number;
  onSyncNow: () => void;
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isOnline,
  pendingSyncCount,
  onSyncNow,
  onNavigate,
}) => {
  const { user } = useAuth();
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
    : '?';

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div onClick={() => onNavigate('home')} className="flex items-center gap-2.5 cursor-pointer select-none">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900">CareNest</span>
            <p className="text-[10px] text-slate-500 hidden sm:block -mt-0.5">Field Assistant</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {pendingSyncCount > 0 && (
            <button
              onClick={onSyncNow}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full cursor-pointer"
              style={{ backgroundColor: 'var(--color-offline-bg)', color: 'var(--color-offline-text)' }}
              title="Tap to sync now"
            >
              <RefreshCw className="w-3 h-3" />
              <span className="font-semibold">{pendingSyncCount}</span>
              <span className="hidden sm:inline">pending sync</span>
            </button>
          )}

          <div
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
            style={
              isOnline
                ? { backgroundColor: 'var(--color-online-bg)', color: 'var(--color-online-text)' }
                : { backgroundColor: 'var(--color-offline-bg)', color: 'var(--color-offline-text)' }
            }
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span className="hidden xs:inline font-semibold">{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          <button
            onClick={() => onNavigate('settings')}
            className="flex items-center gap-2 pl-2 border-l border-slate-200 text-slate-700 hover:text-slate-900"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: 'var(--color-accent-light)', color: 'var(--color-primary)' }}
            >
              {initials}
            </div>
            <div className="text-left hidden lg:block">
              <div className="text-xs font-semibold text-slate-800 leading-tight">{user?.name ?? '—'}</div>
              <div className="text-[10px] text-slate-500 leading-tight">{user?.role ?? ''}</div>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
