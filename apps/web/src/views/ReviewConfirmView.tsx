import React, { useState } from 'react';
import { 
  CheckSquare, 
  Square, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowLeft, 
  Wifi, 
  WifiOff, 
  User, 
  Stethoscope, 
  CalendarClock,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Patient } from '../types';
import { ExtractedEncounterDraft } from '../services/aiService';

interface ReviewConfirmViewProps {
  patient: Patient;
  draft: ExtractedEncounterDraft;
  isOnline: boolean;
  onBackToDraft: () => void;
  onConfirmAndSave: (draft: ExtractedEncounterDraft) => void;
}

export const ReviewConfirmView: React.FC<ReviewConfirmViewProps> = ({
  patient,
  draft,
  isOnline,
  onBackToDraft,
  onConfirmAndSave,
}) => {
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    if (!hasConfirmed) return;

    // Trigger subtle celebratory confetti
    try {
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.7 },
        colors: ['#0d9488', '#14b8a6', '#5eead4', '#0f766e'],
      });
    } catch {}

    setIsSaved(true);

    setTimeout(() => {
      onConfirmAndSave(draft);
    }, 1200);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Top back */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToDraft}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Draft</span>
        </button>

        <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          Step 3 of 3 • Verification
        </span>
      </div>

      {/* Main Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          Review visit before saving
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Patient: <strong className="text-slate-800">{patient.name}</strong> • Record will be attached to facility history
        </p>
      </div>

      {/* Success Notification if saved */}
      {isSaved && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-5 shadow-md animate-in zoom-in-95 duration-200 text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-emerald-950">Visit saved successfully</h3>
          <p className="text-xs text-emerald-800">
            Patient timeline updated with verified record.
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-emerald-200 text-xs font-semibold text-emerald-800 shadow-2xs">
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span>Synced to Ajegunle CHC Central</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                <span>Saved locally — will sync when online</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Complete Structured Clinical Record Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
        {/* Record Header */}
        <div className="p-4 sm:p-5 bg-slate-50/70 flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
              Verified Clinical Record Summary
            </span>
            <div className="text-sm font-bold text-slate-900 mt-0.5">
              Community Health Encounter • {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
          <span className="text-xs font-semibold text-teal-800 bg-white border border-teal-200 px-2.5 py-1 rounded-md shadow-2xs">
            Amina Bello, CHW
          </span>
        </div>

        {/* Section 1: Patient Reported */}
        <div className="p-4 sm:p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <User className="w-4 h-4 text-teal-700" />
            <span>1. Patient-Reported Information</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Chief Complaint</span>
              <span className="font-bold text-slate-900 text-sm">{draft.patientReported.chiefComplaint}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Duration</span>
              <span className="font-semibold text-slate-800">{draft.patientReported.duration}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Details & Concerns</span>
              <span className="text-slate-700">{draft.patientReported.concerns.join(', ')}</span>
            </div>
          </div>
        </div>

        {/* Section 2: CHW Observations & Vitals */}
        <div className="p-4 sm:p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <Stethoscope className="w-4 h-4 text-teal-700" />
            <span>2. CHW Observations & Vitals</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-2">
            <div className="flex items-center gap-4 flex-wrap">
              {draft.chwObservations.vitals.temperature && (
                <span className="bg-white px-2.5 py-1 rounded-md border border-slate-200 font-semibold text-slate-800">
                  Temp: <strong className="text-slate-950">{draft.chwObservations.vitals.temperature}°C</strong>
                </span>
              )}
              {draft.chwObservations.vitals.bloodPressure && (
                <span className="bg-white px-2.5 py-1 rounded-md border border-slate-200 font-semibold text-slate-800">
                  Blood Pressure: <strong className="text-slate-950">{draft.chwObservations.vitals.bloodPressure}</strong>
                </span>
              )}
              {draft.chwObservations.vitals.pulse && (
                <span className="bg-white px-2.5 py-1 rounded-md border border-slate-200 font-semibold text-slate-800">
                  Pulse: <strong className="text-slate-950">{draft.chwObservations.vitals.pulse} bpm</strong>
                </span>
              )}
            </div>
            <p className="text-slate-700 leading-relaxed pt-1">
              {draft.chwObservations.clinicalNotes}
            </p>
          </div>
        </div>

        {/* Section 3: Follow-Up Action */}
        <div className="p-4 sm:p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <CalendarClock className="w-4 h-4 text-teal-700" />
            <span>3. Care Continuity Follow-Up</span>
          </div>
          <div className="bg-teal-50/50 p-3 rounded-xl border border-teal-100 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-teal-950 font-medium">
              {draft.followUp.recommendation}
            </p>
            <span className="text-teal-800 font-semibold bg-white px-2 py-0.5 rounded border border-teal-200 shrink-0">
              Due: {draft.followUp.dueDate}
            </span>
          </div>
        </div>
      </div>

      {/* Human In The Loop Confirmation Box */}
      <div className="bg-white rounded-2xl border-2 border-teal-600/30 p-5 shadow-sm space-y-4">
        <label 
          onClick={() => setHasConfirmed(!hasConfirmed)}
          className="flex items-start gap-3 cursor-pointer select-none"
        >
          <div className="mt-0.5 shrink-0 text-teal-700">
            {hasConfirmed ? (
              <CheckSquare className="w-6 h-6 fill-teal-600 text-white" />
            ) : (
              <Square className="w-6 h-6 text-slate-400" />
            )}
          </div>
          <div className="text-xs sm:text-sm text-slate-800 leading-relaxed">
            <span className="font-bold text-slate-900">
              I have reviewed this record and confirm the information is accurate.
            </span>
            <p className="text-xs text-slate-500 mt-0.5">
              You are certifying that this record reflects true field observation. CareNest stores this under your verified signature as CHW Amina Bello.
            </p>
          </div>
        </label>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            disabled={!hasConfirmed || isSaved}
            onClick={handleSave}
            className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
              hasConfirmed && !isSaved
                ? 'bg-teal-700 hover:bg-teal-800 text-white active:scale-[0.99] cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
            <span>{isSaved ? 'Saving...' : 'Confirm & Save'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
