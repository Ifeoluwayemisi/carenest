import React from 'react';
import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';

/** Shared loading/error/empty states — every screen that fetches real data uses these instead of rolling its own. */

export const LoadingState: React.FC<{ label?: string }> = ({ label = 'Loading…' }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
    <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'var(--color-accent)' }} />
    <p className="text-sm font-medium">{label}</p>
  </div>
);

export const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({
  message,
  onRetry,
}) => (
  <div
    className="rounded-2xl border p-6 text-center space-y-3"
    style={{ backgroundColor: 'var(--color-urgent-bg)', borderColor: '#fecaca' }}
  >
    <AlertTriangle className="w-8 h-8 mx-auto" style={{ color: 'var(--color-urgent-text)' }} />
    <p className="text-sm font-semibold" style={{ color: 'var(--color-urgent-text)' }}>
      {message}
    </p>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="text-xs font-semibold px-4 py-2 rounded-lg border bg-white hover:bg-slate-50 transition-colors"
        style={{ borderColor: 'var(--color-urgent-text)', color: 'var(--color-urgent-text)' }}
      >
        Try again
      </button>
    )}
  </div>
);

export const EmptyState: React.FC<{ title: string; description?: string; action?: React.ReactNode }> = ({
  title,
  description,
  action,
}) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
      <Inbox className="w-6 h-6" />
    </div>
    <h3 className="text-sm font-bold text-slate-800">{title}</h3>
    {description && <p className="text-xs text-slate-500 max-w-sm mx-auto">{description}</p>}
    {action}
  </div>
);
