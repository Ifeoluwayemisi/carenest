'use client';

import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  ShieldAlert,
  FileText,
} from 'lucide-react';
import type { AttributedItem, CareNestAiResult, Patient, SourceType, Visit } from '@/types/domain';
import { SourceBadge } from '@/components/SourceAttributedCard';
import { ApiError } from '@/lib/api';
import * as visitsService from '@/services/visits.service';
import * as followUpsService from '@/services/follow-ups.service';

interface AIReviewViewProps {
  visit: Visit;
  patient: Patient;
  onBack: () => void;
  onConfirmed: (visit: Visit) => void;
}

const SOURCE_OPTIONS: { value: SourceType; label: string }[] = [
  { value: 'PATIENT_REPORTED', label: 'Patient Reported' },
  { value: 'CHW_RECORDED', label: 'CHW Recorded' },
  { value: 'AI_SUGGESTED', label: 'AI Suggested' },
];

function seedDraft(visit: Visit): CareNestAiResult {
  if (visit.aiGeneratedJson) return structuredClone(visit.aiGeneratedJson);
  // AI structuring failed — start from the raw transcript so nothing the CHW
  // already said is lost, but everything is explicitly CHW-authored from here.
  return {
    summary: { text: visit.transcript ?? '', sourceType: 'CHW_RECORDED' },
    reportedConcerns: [],
    missingInformation: [],
    suggestedFollowUps: [],
  };
}

const ItemList: React.FC<{
  title: string;
  items: AttributedItem[];
  onChange: (items: AttributedItem[]) => void;
  defaultSourceType: SourceType;
}> = ({ title, items, onChange, defaultSourceType }) => {
  const update = (index: number, patch: Partial<AttributedItem>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };
  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));
  const add = () => onChange([...items, { text: '', sourceType: defaultSourceType }]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">{title}</h3>
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50"
          style={{ color: 'var(--color-primary)' }}
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>
      {items.length === 0 && <p className="text-xs text-slate-400 italic">None</p>}
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-start gap-2 bg-slate-50 rounded-xl p-2.5 border border-slate-200">
            <div className="flex-1 space-y-1.5">
              <textarea
                rows={2}
                value={item.text}
                onChange={(e) => update(index, { text: e.target.value })}
                className="w-full text-sm bg-white border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
              />
              <select
                value={item.sourceType}
                onChange={(e) => update(index, { sourceType: e.target.value as SourceType })}
                className="text-xs font-medium bg-white border border-slate-200 rounded-lg px-2 py-1"
              >
                {SOURCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => remove(index)}
              className="text-slate-400 hover:text-rose-600 p-1"
              aria-label="Remove item"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AIReviewView: React.FC<AIReviewViewProps> = ({ visit, patient, onBack, onConfirmed }) => {
  const [draft, setDraft] = useState<CareNestAiResult>(() => seedDraft(visit));
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aiFailed = visit.aiStatus === 'FAILED';
  const canConfirm = draft.summary.text.trim().length > 0;

  const handleConfirm = async () => {
    if (!canConfirm || isConfirming) return;
    setError(null);
    setIsConfirming(true);
    try {
      const confirmed = await visitsService.confirmVisit(visit.id, draft);
      // The CHW has reviewed and accepted whatever remains in "Suggested
      // Follow-ups" here, so promote those to real follow-ups. Best-effort:
      // a failure after the record is confirmed shouldn't block navigation.
      const accepted = draft.suggestedFollowUps
        .map((item) => item.text.trim())
        .filter(Boolean);
      if (accepted.length > 0) {
        await Promise.allSettled(
          accepted.map((summary) =>
            followUpsService.createFollowUp({
              patientId: patient.id,
              visitId: visit.id,
              summary,
            }),
          ),
        );
      }
      confetti({ particleCount: 80, spread: 65, origin: { y: 0.7 } });
      onConfirmed(confirmed);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not confirm this visit. Please try again.');
    } finally {
      setIsConfirming(false);
    }
  };

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
          style={{ backgroundColor: 'var(--color-offline-bg)', color: 'var(--color-offline-text)' }}
        >
          Draft — not yet confirmed
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">
          {patient.firstName} {patient.lastName}
        </h2>
        <p className="text-xs text-slate-500">Visit recorded {new Date(visit.visitedAt).toLocaleString()}</p>
      </div>

      {aiFailed && (
        <div
          className="rounded-2xl border p-4 flex items-start gap-3"
          style={{ backgroundColor: 'var(--color-urgent-bg)', borderColor: '#fecaca' }}
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--color-urgent-text)' }} />
          <div>
            <h4 className="text-sm font-bold" style={{ color: 'var(--color-urgent-text)' }}>
              AI structuring failed
            </h4>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-urgent-text)' }}>
              {visit.aiError ?? 'The AI could not process this transcript.'} The raw transcript is
              preserved below — complete this visit manually and confirm.
            </p>
          </div>
        </div>
      )}

      {visit.transcript && (
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-1.5 mb-1.5 text-slate-500">
            <FileText className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Raw Transcript</span>
          </div>
          <p className="text-sm text-slate-700 italic leading-relaxed">&quot;{visit.transcript}&quot;</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
        <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-slate-500" />
          <p className="text-xs text-slate-600 leading-relaxed">
            {visit.aiGeneratedJson?.safety?.disclaimer ??
              'This is a draft. It is not a diagnosis or medical advice. Review, correct, and confirm before it becomes part of the record.'}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Summary</h3>
            <SourceBadge sourceType={draft.summary.sourceType} />
          </div>
          <textarea
            rows={3}
            value={draft.summary.text}
            onChange={(e) => setDraft({ ...draft, summary: { ...draft.summary, text: e.target.value } })}
            className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:bg-white"
            style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
          />
        </div>

        <ItemList
          title="Reported Concerns"
          items={draft.reportedConcerns}
          onChange={(items) => setDraft({ ...draft, reportedConcerns: items })}
          defaultSourceType="PATIENT_REPORTED"
        />
        <ItemList
          title="Missing Information"
          items={draft.missingInformation}
          onChange={(items) => setDraft({ ...draft, missingInformation: items })}
          defaultSourceType="AI_SUGGESTED"
        />
        <ItemList
          title="Suggested Follow-ups"
          items={draft.suggestedFollowUps}
          onChange={(items) => setDraft({ ...draft, suggestedFollowUps: items })}
          defaultSourceType="AI_SUGGESTED"
        />

        {error && (
          <div
            className="flex items-start gap-2 p-3 rounded-xl text-xs font-medium"
            style={{ backgroundColor: 'var(--color-urgent-bg)', color: 'var(--color-urgent-text)' }}
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canConfirm || isConfirming}
          className="w-full h-[52px] px-6 rounded-xl text-white font-bold text-sm shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          {isConfirming ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Confirming…</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm Visit</span>
            </>
          )}
        </button>
        <p className="text-center text-[11px] text-slate-400">
          Confirming makes this the official record for {patient.firstName}. Review carefully first.
        </p>
      </div>
    </div>
  );
};
