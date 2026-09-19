'use client';

import React, { useEffect, useState } from 'react';
import { Users, UserCheck, Activity, CalendarDays, ClipboardList, CheckCircle2 } from 'lucide-react';
import type { DashboardSummary } from '@/types/domain';
import * as dashboardService from '@/services/dashboard.service';
import { ApiError } from '@/lib/api';
import { LoadingState, ErrorState } from '@/components/StateViews';

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: 'var(--color-offline-bg)', text: 'var(--color-offline-text)' },
  UNDER_REVIEW: { bg: 'var(--color-offline-bg)', text: 'var(--color-offline-text)' },
  CONFIRMED: { bg: 'var(--color-online-bg)', text: 'var(--color-online-text)' },
};

const MetricCard: React.FC<{ label: string; value: number; icon: React.ElementType; hint?: string }> = ({
  label,
  value,
  icon: Icon,
  hint,
}) => (
  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
    <div className="flex items-center justify-between text-slate-500 mb-1">
      <span className="text-xs font-medium">{label}</span>
      <Icon className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
    </div>
    <div className="text-2xl font-bold text-slate-900">{value}</div>
    {hint && <div className="text-[10px] text-slate-500 mt-0.5">{hint}</div>}
  </div>
);

export const SupervisorView: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError(null);
    dashboardService
      .getDashboardSummary()
      .then(setSummary)
      .catch((err) =>
        setError(
          err instanceof ApiError && err.status === 403
            ? "You don't have access to the supervisor dashboard."
            : 'Could not load the dashboard summary.',
        ),
      )
      .finally(() => setLoading(false));
  };

  // Deferred to a microtask so setLoading(true) inside load() doesn't run
  // synchronously in the effect body (react-hooks/set-state-in-effect).
  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);

  if (loading) return <LoadingState label="Loading dashboard…" />;
  if (error || !summary) return <ErrorState message={error ?? 'No data available.'} onRetry={load} />;

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Supervisor Dashboard</h1>
        <p className="text-xs sm:text-sm text-slate-500">Organization overview</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MetricCard label="Total Patients" value={summary.totalPatients} icon={Users} />
        <MetricCard label="Total CHWs" value={summary.totalCHWs} icon={UserCheck} />
        <MetricCard label="Visits Today" value={summary.visitsToday} icon={Activity} />
        <MetricCard label="Visits This Week" value={summary.visitsThisWeek} icon={CalendarDays} />
        <MetricCard label="Pending Follow-ups" value={summary.pendingFollowUps} icon={ClipboardList} />
        <MetricCard label="Completed Follow-ups" value={summary.completedFollowUps} icon={CheckCircle2} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-slate-900">Recent Activity</h2>
        {summary.recentVisits.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No recent visits.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {summary.recentVisits.map((visit) => {
              const style = STATUS_STYLE[visit.status] ?? STATUS_STYLE.DRAFT;
              return (
                <div key={visit.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-sm font-semibold text-slate-800">{visit.patientName}</span>
                    <p className="text-xs text-slate-500">
                      {visit.chwName} • {new Date(visit.visitedAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: style.bg, color: style.text }}
                  >
                    {visit.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
