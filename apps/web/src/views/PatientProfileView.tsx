'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Calendar, Phone, MapPin, ClipboardList, CheckCircle2, Clock } from 'lucide-react';
import type { FollowUp, Patient, TimelineEntry } from '@/types/domain';
import * as patientsService from '@/services/patients.service';
import * as followUpsService from '@/services/follow-ups.service';
import { ApiError } from '@/lib/api';
import { LoadingState, ErrorState } from '@/components/StateViews';

interface PatientProfileViewProps {
  patient: Patient;
  onBack: () => void;
  onStartNewVisit: (patient: Patient) => void;
  onOpenVisit: (visitId: string) => void;
}

function patientAge(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  return Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

const STATUS_STYLE: Record<TimelineEntry['status'], { bg: string; text: string; label: string }> = {
  DRAFT: { bg: 'var(--color-offline-bg)', text: 'var(--color-offline-text)', label: 'Draft' },
  UNDER_REVIEW: { bg: 'var(--color-offline-bg)', text: 'var(--color-offline-text)', label: 'Under Review' },
  CONFIRMED: { bg: 'var(--color-online-bg)', text: 'var(--color-online-text)', label: 'Confirmed' },
};

export const PatientProfileView: React.FC<PatientProfileViewProps> = ({
  patient,
  onBack,
  onStartNewVisit,
  onOpenVisit,
}) => {
  const [visits, setVisits] = useState<TimelineEntry[] | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError(null);
    patientsService
      .getPatientTimeline(patient.id)
      .then((t) => setVisits(t.visits))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load this patient.'))
      .finally(() => setLoading(false));

    // Follow-ups are best-effort — the endpoint may still be rolling out;
    // failure here shouldn't block the rest of the profile.
    followUpsService
      .listPatientFollowUps(patient.id)
      .then(setFollowUps)
      .catch(() => setFollowUps([]));
  };

  // Deferred to a microtask so setLoading(true) inside load() doesn't run
  // synchronously in the effect body (react-hooks/set-state-in-effect).
  useEffect(() => {
    void Promise.resolve().then(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient.id]);

  const age = patientAge(patient.dateOfBirth);

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Patients</span>
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl text-white flex items-center justify-center text-lg font-bold shadow-md shrink-0"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {patient.firstName[0]}
              {patient.lastName[0]}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                {patient.firstName} {patient.lastName}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
                {age !== null ? `${age} years old` : 'Age unknown'}
                {patient.gender ? ` • ${patient.gender}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onStartNewVisit(patient)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition-all active:scale-[0.98]"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Record Visit</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5 pt-5 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-700 font-semibold">{patient.phone ?? '—'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-700 font-semibold truncate">{patient.address ?? '—'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-700 font-semibold">Registered {new Date(patient.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {followUps.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <ClipboardList className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
            Follow-ups
          </h2>
          <div className="space-y-2">
            {followUps.map((f) => (
              <div key={f.id} className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="flex items-center gap-2">
                  {f.status === 'COMPLETED' ? (
                    <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--color-online-text)' }} />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-500" />
                  )}
                  <span className="text-xs font-medium text-slate-800">{f.summary}</span>
                </div>
                {f.dueDate && <span className="text-[11px] text-slate-500">Due {f.dueDate}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">Visit Timeline</h2>
          {visits && (
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              {visits.length} visit{visits.length === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {loading && <LoadingState label="Loading timeline…" />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}
        {!loading && !error && visits && visits.length === 0 && (
          <p className="text-xs text-slate-500 py-6 text-center">No visits recorded yet.</p>
        )}

        {!loading && !error && visits && visits.length > 0 && (
          <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
            {visits.map((visit, index) => {
              const style = STATUS_STYLE[visit.status];
              return (
                <div
                  key={visit.id}
                  onClick={() => onOpenVisit(visit.id)}
                  className="relative rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer p-4"
                >
                  <div
                    className="absolute -left-6 sm:-left-8 top-4 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center border-2 border-white shadow-xs"
                    style={{ backgroundColor: index === 0 ? 'var(--color-primary)' : '#cbd5e1' }}
                  >
                    <Calendar className="w-3 h-3 text-white" />
                  </div>

                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-700">
                      {new Date(visit.visitedAt).toLocaleString()}
                    </span>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: style.bg, color: style.text }}
                    >
                      {style.label}
                    </span>
                  </div>

                  <p className="text-sm text-slate-800 mt-1.5">
                    {visit.summary ?? (visit.aiStatus === 'FAILED' ? 'AI processing failed — manual review needed' : 'Processing…')}
                  </p>

                  {visit.confirmedAt && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Confirmed {new Date(visit.confirmedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
