'use client';

import React, { useState } from 'react';
import { ArrowLeft, FileText, Loader2, Mic, AlertCircle, WifiOff } from 'lucide-react';
import type { Patient, Visit } from '@/types/domain';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { ApiError } from '@/lib/api';
import * as visitsService from '@/services/visits.service';
import { queueOfflineVisit } from '@/lib/offline-queue';

interface NewVisitViewProps {
  patient: Patient;
  isOnline: boolean;
  onBack: () => void;
  onVisitCreated: (visit: Visit) => void;
  onSavedOffline: () => void;
}

export const NewVisitView: React.FC<NewVisitViewProps> = ({
  patient,
  isOnline,
  onBack,
  onVisitCreated,
  onSavedOffline,
}) => {
  const [activeTab, setActiveTab] = useState<'voice' | 'text'>('text');
  const [notesText, setNotesText] = useState('');
  const [audioBlob, setAudioBlob] = useState<{ blob: Blob; mimeType: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = activeTab === 'text' ? notesText.trim().length > 0 : audioBlob !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || isSubmitting) return;
    setError(null);

    const clientGeneratedId = crypto.randomUUID();
    const visitedAt = new Date().toISOString();

    // Offline: only text visits are queued in the MVP (per product scope —
    // audio capture without a live upload isn't handled offline yet).
    if (!isOnline) {
      if (activeTab === 'voice') {
        setError('Voice visits require a connection. Switch to text, or reconnect and try again.');
        return;
      }
      await queueOfflineVisit({
        clientGeneratedId,
        patientId: patient.id,
        transcript: notesText.trim(),
        visitedAt,
      });
      onSavedOffline();
      return;
    }

    setIsSubmitting(true);
    try {
      const visit =
        activeTab === 'text'
          ? await visitsService.createTextVisit({
              patientId: patient.id,
              transcript: notesText.trim(),
              visitedAt,
              clientGeneratedId,
            })
          : await visitsService.createAudioVisit({
              patientId: patient.id,
              audio: audioBlob!.blob,
              filename: `visit-audio.${audioBlob!.mimeType.split('/')[1]?.split(';')[0] ?? 'webm'}`,
              visitedAt,
              clientGeneratedId,
            });
      onVisitCreated(visit);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Cancel &amp; Back</span>
        </button>

        {!isOnline && (
          <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: 'var(--color-offline-bg)', color: 'var(--color-offline-text)' }}
          >
            <WifiOff className="w-3.5 h-3.5" />
            Offline — text visits save locally
          </span>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-xl text-white font-bold flex items-center justify-center text-sm shrink-0"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          {patient.firstName[0]}
          {patient.lastName[0]}
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">
            {patient.firstName} {patient.lastName}
          </h2>
          <p className="text-xs text-slate-500">
            {patient.dateOfBirth ? `DOB ${patient.dateOfBirth}` : 'DOB unknown'}
            {patient.gender ? ` • ${patient.gender}` : ''}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">New Patient Visit</h3>
            <p className="text-xs text-slate-500">Capture the visit by voice or by typing</p>
          </div>

          <div className="inline-flex p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('text')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'text' ? 'bg-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              style={activeTab === 'text' ? { color: 'var(--color-primary)' } : undefined}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Text</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('voice')}
              disabled={!isOnline}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                activeTab === 'voice' ? 'bg-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              style={activeTab === 'voice' ? { color: 'var(--color-primary)' } : undefined}
              title={!isOnline ? 'Voice visits require a connection' : undefined}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Voice</span>
            </button>
          </div>
        </div>

        {activeTab === 'voice' ? (
          <VoiceRecorder
            onAudioReady={(blob, mimeType) => setAudioBlob({ blob, mimeType })}
            onClear={() => setAudioBlob(null)}
            hasRecording={audioBlob !== null}
            disabled={isSubmitting}
          />
        ) : (
          <div className="space-y-2">
            <label htmlFor="visit-notes" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Visit Notes
            </label>
            <textarea
              id="visit-notes"
              rows={5}
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Describe what happened during the visit — what the patient reported, what you observed, and anything relevant…"
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:ring-2 focus:outline-none transition-all leading-relaxed"
              style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
              disabled={isSubmitting}
            />
          </div>
        )}

        {error && (
          <div
            className="flex items-start gap-2 p-3 rounded-xl text-xs font-medium"
            style={{ backgroundColor: 'var(--color-urgent-bg)', color: 'var(--color-urgent-text)' }}
            role="alert"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="pt-3">
          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className="w-full py-3.5 px-6 rounded-xl text-white font-bold text-sm shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing — transcribing &amp; structuring…</span>
              </>
            ) : !isOnline ? (
              <span>Save Locally</span>
            ) : (
              <span>Submit Visit</span>
            )}
          </button>
          <p className="text-center text-[11px] text-slate-400 mt-2">
            CareNest structures your observations for clinical review. No automated diagnoses or prescriptions.
          </p>
        </div>
      </form>
    </div>
  );
};
