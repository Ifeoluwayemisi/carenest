'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import type { Patient, Visit } from '@/types/domain';
import * as visitsService from '@/services/visits.service';
import { ApiError } from '@/lib/api';
import { LoadingState, ErrorState } from '@/components/StateViews';
import { SourceAttributedCard } from '@/components/SourceAttributedCard';
import { AIReviewView } from './AIReviewView';

interface VisitDetailViewProps {
  visitId: string;
  patient: Patient;
  onBack: () => void;
  onConfirmed: (visit: Visit) => void;
}

export const VisitDetailView: React.FC<VisitDetailViewProps> = ({
  visitId,
  patient,
  onBack,
  onConfirmed,
}) => {
  const [visit, setVisit] = useState<Visit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError(null);
    visitsService
      .getVisit(visitId)
      .then(setVisit)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load this visit.'))
      .finally(() => setLoading(false));
  };

  // Deferred to a microtask so setLoading(true) inside load() doesn't run
  // synchronously in the effect body (react-hooks/set-state-in-effect).
  useEffect(() => {
    void Promise.resolve().then(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitId]);

  if (loading) return <LoadingState label="Loading visit…" />;
  if (error || !visit) return <ErrorState message={error ?? 'Visit not found.'} onRetry={load} />;

  if (visit.status !== 'CONFIRMED') {
    return <AIReviewView visit={visit} patient={patient} onBack={onBack} onConfirmed={onConfirmed} />;
  }

  const record = visit.confirmedJson;

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
          style={{ backgroundColor: 'var(--color-online-bg)', color: 'var(--color-online-text)' }}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Confirmed
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">
          {patient.firstName} {patient.lastName}
        </h2>
        <p className="text-xs text-slate-500">
          Visit {new Date(visit.visitedAt).toLocaleString()} • Confirmed{' '}
          {visit.confirmedAt ? new Date(visit.confirmedAt).toLocaleString() : ''}
        </p>
      </div>

      {record && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <SourceAttributedCard sourceType={record.summary.sourceType}>{record.summary.text}</SourceAttributedCard>

          {record.reportedConcerns.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Reported Concerns</h3>
              {record.reportedConcerns.map((item, i) => (
                <SourceAttributedCard key={i} sourceType={item.sourceType}>
                  {item.text}
                </SourceAttributedCard>
              ))}
            </div>
          )}

          {record.missingInformation.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Missing Information</h3>
              {record.missingInformation.map((item, i) => (
                <SourceAttributedCard key={i} sourceType={item.sourceType}>
                  {item.text}
                </SourceAttributedCard>
              ))}
            </div>
          )}

          {record.suggestedFollowUps.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Suggested Follow-ups</h3>
              {record.suggestedFollowUps.map((item, i) => (
                <SourceAttributedCard key={i} sourceType={item.sourceType}>
                  {item.text}
                </SourceAttributedCard>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
