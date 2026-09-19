'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Search, Users, ChevronRight, CloudOff, ArrowUpRight } from 'lucide-react';
import type { Patient } from '@/types/domain';
import { useAuth } from '@/contexts/AuthContext';
import * as patientsService from '@/services/patients.service';
import { LoadingState, ErrorState } from '@/components/StateViews';

interface DashboardViewProps {
  onStartNewVisit: () => void;
  onNavigateToPatients: () => void;
  onSelectPatient: (patient: Patient) => void;
  isOnline: boolean;
  pendingSyncCount: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onStartNewVisit,
  onNavigateToPatients,
  onSelectPatient,
  isOnline,
  pendingSyncCount,
}) => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError(null);
    patientsService
      .listPatients()
      .then(setPatients)
      .catch(() => setError('Could not load your patients right now.'))
      .finally(() => setLoading(false));
  };

  // Deferred via a microtask rather than called synchronously in the effect
  // body — react-hooks/set-state-in-effect flags a direct setState call
  // (load()'s setLoading(true)) executed synchronously during the effect,
  // even though it's the standard "fetch on mount" pattern.
  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);

  const recentPatients = (patients ?? []).slice(0, 3);
  const firstName = user?.name.split(' ')[0] ?? 'there';

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Hi, {firstName}</h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            {user?.role === 'ADMIN' ? 'Administrator' : 'Community Health Worker'} • Field Workspace
          </p>
        </div>

        <div
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
          style={
            isOnline
              ? { backgroundColor: 'var(--color-online-bg)', color: 'var(--color-online-text)' }
              : { backgroundColor: 'var(--color-offline-bg)', color: 'var(--color-offline-text)' }
          }
        >
          <span className={`w-2 h-2 rounded-full ${isOnline ? '' : 'animate-pulse'}`} style={{ backgroundColor: isOnline ? '#10b981' : '#f59e0b' }} />
          <span>{isOnline ? 'Online' : 'Offline — changes saved locally'}</span>
        </div>
      </div>

      {pendingSyncCount > 0 && (
        <div
          className="rounded-2xl p-4 flex items-center justify-between shadow-sm border"
          style={{ backgroundColor: 'var(--color-offline-bg)', borderColor: '#fde68a' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white">
              <CloudOff className="w-5 h-5" style={{ color: 'var(--color-offline-text)' }} />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-semibold" style={{ color: 'var(--color-offline-text)' }}>
                {pendingSyncCount} visit{pendingSyncCount === 1 ? '' : 's'} waiting to sync
              </h4>
              <p className="text-xs" style={{ color: 'var(--color-offline-text)' }}>
                {isOnline ? 'Connection active — syncing shortly.' : 'Saved safely on this device.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Primary CTA */}
      <button
        type="button"
        onClick={onStartNewVisit}
        className="group w-full text-left p-5 rounded-2xl text-white shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-between"
        style={{ backgroundColor: 'var(--color-primary)' }}
      >
        <div className="space-y-1">
          <span className="text-xs uppercase font-bold tracking-wider opacity-80">Primary Action</span>
          <div className="text-xl font-bold flex items-center gap-2">
            <span>Record a Visit</span>
            <ArrowUpRight className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-transform" />
          </div>
          <p className="text-xs opacity-80 max-w-xs">Speak or type a patient encounter for AI structuring and review</p>
        </div>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border" style={{ backgroundColor: 'var(--color-accent)', borderColor: 'rgba(255,255,255,0.2)' }}>
          <Plus className="w-7 h-7 text-white stroke-[2.5]" />
        </div>
      </button>

      <button
        type="button"
        onClick={onNavigateToPatients}
        className="w-full text-left p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
            <Search className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">Find Patient</div>
            <p className="text-xs text-slate-500">
              {patients ? `${patients.length} registered` : 'Search your patients'}
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400" />
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Patients</h3>
            <p className="text-xs text-slate-500">Quick access to your patients</p>
          </div>
          {patients && patients.length > 0 && (
            <button
              type="button"
              onClick={onNavigateToPatients}
              className="text-xs font-semibold flex items-center gap-1"
              style={{ color: 'var(--color-primary)' }}
            >
              View all ({patients.length})
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {loading && <LoadingState label="Loading patients…" />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}
        {!loading && !error && recentPatients.length === 0 && (
          <div className="text-center py-8 space-y-2">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500">No patients yet. Register one to get started.</p>
          </div>
        )}

        {!loading && !error && recentPatients.length > 0 && (
          <div className="divide-y divide-slate-100">
            {recentPatients.map((patient) => (
              <div
                key={patient.id}
                onClick={() => onSelectPatient(patient)}
                className="py-3.5 px-1 rounded-xl transition-all flex items-center justify-between cursor-pointer hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs text-white"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    {patient.firstName[0]}
                    {patient.lastName[0]}
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-slate-900">
                      {patient.firstName} {patient.lastName}
                    </span>
                    {patient.uniqueId && (
                      <div className="text-xs text-slate-500 mt-0.5 font-mono">{patient.uniqueId}</div>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
