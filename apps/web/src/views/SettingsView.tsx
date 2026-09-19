'use client';

import React, { useEffect, useState } from 'react';
import { LogOut, RefreshCw, Wifi, WifiOff, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { listQueuedVisits, syncQueuedVisits, retryQueuedVisit, type QueuedVisit } from '@/lib/offline-queue';

interface SettingsViewProps {
  isOnline: boolean;
  onQueueChanged: () => void;
}

const STATUS_LABEL: Record<QueuedVisit['status'], string> = {
  SAVED_LOCALLY: 'Saved locally',
  PENDING_SYNC: 'Pending sync',
  SYNCING: 'Syncing…',
  SYNCED: 'Synced',
  SYNC_FAILED: 'Sync failed',
};

export const SettingsView: React.FC<SettingsViewProps> = ({ isOnline, onQueueChanged }) => {
  const { user, logout } = useAuth();
  const [queue, setQueue] = useState<QueuedVisit[]>([]);
  const [syncing, setSyncing] = useState(false);

  const refresh = () => {
    listQueuedVisits().then((items) => setQueue(items.filter((q) => q.status !== 'SYNCED')));
  };

  useEffect(refresh, []);

  const handleSyncNow = async () => {
    setSyncing(true);
    await syncQueuedVisits();
    refresh();
    onQueueChanged();
    setSyncing(false);
  };

  const handleRetry = async (id: string) => {
    await retryQueuedVisit(id);
    refresh();
    onQueueChanged();
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6 max-w-lg">
      <h1 className="text-xl font-bold text-slate-900">Settings</h1>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center font-bold"
            style={{ backgroundColor: 'var(--color-accent-light)', color: 'var(--color-primary)' }}
          >
            <User className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{user?.name}</p>
            <p className="text-xs text-slate-500">{user?.email} • {user?.role}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Connection &amp; Sync</h2>
          <div
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
            style={
              isOnline
                ? { backgroundColor: 'var(--color-online-bg)', color: 'var(--color-online-text)' }
                : { backgroundColor: 'var(--color-offline-bg)', color: 'var(--color-offline-text)' }
            }
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>

        {queue.length === 0 ? (
          <p className="text-xs text-slate-500">All visits synced.</p>
        ) : (
          <div className="space-y-2">
            {queue.map((item) => (
              <div key={item.clientGeneratedId} className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div>
                  <p className="text-xs font-semibold text-slate-800">{STATUS_LABEL[item.status]}</p>
                  <p className="text-[11px] text-slate-500 line-clamp-1 max-w-[220px]">{item.transcript}</p>
                  {item.lastError && <p className="text-[11px] text-rose-600 mt-0.5">{item.lastError}</p>}
                </div>
                {item.status === 'SYNC_FAILED' && isOnline && (
                  <button
                    onClick={() => handleRetry(item.clientGeneratedId)}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg border"
                    style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
                  >
                    Retry
                  </button>
                )}
              </div>
            ))}
            {isOnline && (
              <button
                onClick={handleSyncNow}
                disabled={syncing}
                className="w-full mt-1 flex items-center justify-center gap-2 text-xs font-semibold py-2 rounded-xl border disabled:opacity-60"
                style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                Sync Now
              </button>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={logout}
        className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-rose-600 bg-white border border-rose-200 rounded-xl hover:bg-rose-50 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </button>
    </div>
  );
};
