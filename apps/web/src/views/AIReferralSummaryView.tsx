import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Edit3, 
  ArrowRight, 
  Building2, 
  User, 
  Stethoscope, 
  Clock, 
  ShieldCheck,
  ArrowLeft 
} from 'lucide-react';
import { Patient, Vitals, Referral } from '../types';

interface AIReferralSummaryViewProps {
  patient: Patient;
  receivingFacility: string;
  reason: string;
  symptomsReported: string[];
  recordedVitals: Vitals;
  previousEncounterDate: string;
  generatedSummary: string;
  onBack: () => void;
  onConfirmReferral: (confirmedReferral: {
    receivingFacility: string;
    reason: string;
    summary: string;
  }) => void;
}

export const AIReferralSummaryView: React.FC<AIReferralSummaryViewProps> = ({
  patient,
  receivingFacility,
  reason,
  symptomsReported,
  recordedVitals,
  previousEncounterDate,
  generatedSummary,
  onBack,
  onConfirmReferral,
}) => {
  const [summaryText, setSummaryText] = useState(generatedSummary);
  const [isEditing, setIsEditing] = useState(false);

  const handleConfirm = () => {
    onConfirmReferral({
      receivingFacility,
      reason,
      summary: summaryText,
    });
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Top back */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <span className="text-xs font-semibold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
          Referral Package Review
        </span>
      </div>

      {/* Header & Review Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Referral Summary
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Prepared for receiving physician review at <strong className="text-slate-800">{receivingFacility}</strong>
          </p>
        </div>

        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
          <span>AI-generated summary — review required</span>
        </div>
      </div>

      {/* Decision Notice */}
      <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
        <div className="text-xs text-teal-950">
          <span className="font-bold block mb-0.5">CHW-Directed Care Continuity</span>
          The Community Health Worker, not AI, makes the referral decision. CareNest packages the clinical story to prevent diagnostic delay at the secondary facility.
        </div>
      </div>

      {/* Structured Referral Document Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
        {/* Top Meta */}
        <div className="p-5 bg-slate-50/60 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block font-medium">Patient</span>
            <span className="text-sm font-bold text-slate-900">
              {patient.name} ({patient.age} • {patient.sex})
            </span>
            <span className="text-slate-500 font-mono text-[11px] block mt-0.5">
              ID: {patient.patientId}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block font-medium">Facilities</span>
            <div className="text-slate-800 font-semibold">
              From: <span className="text-teal-900">Ajegunle Community Health Centre</span>
            </div>
            <div className="text-slate-800 font-semibold">
              To: <span className="text-indigo-900">{receivingFacility}</span>
            </div>
          </div>
        </div>

        {/* Clinical Reason */}
        <div className="p-5 space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            Reason for Referral
          </span>
          <p className="text-sm font-semibold text-slate-900">
            {reason}
          </p>
        </div>

        {/* Symptoms & Observations */}
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Symptoms Reported
              </span>
              <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
                {symptomsReported.map((s, idx) => (
                  <li key={idx} className="font-medium">{s}</li>
                ))}
              </ul>
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Recorded Observations
              </span>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {recordedVitals.temperature && (
                  <span className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded font-semibold text-slate-800">
                    Temp: {recordedVitals.temperature}°C
                  </span>
                )}
                {recordedVitals.bloodPressure && (
                  <span className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded font-semibold text-slate-800">
                    BP: {recordedVitals.bloodPressure}
                  </span>
                )}
                {recordedVitals.pulse && (
                  <span className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded font-semibold text-slate-800">
                    Pulse: {recordedVitals.pulse} bpm
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="pt-2 text-xs text-slate-500 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-teal-600" />
            <span>Previous relevant encounter linked: <strong className="text-slate-700">{previousEncounterDate}</strong></span>
          </div>
        </div>

        {/* Synthesized Narrative Referral Letter */}
        <div className="p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Continuity Narrative Letter
            </span>
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs font-medium text-teal-700 hover:text-teal-900 flex items-center gap-1"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Save Text' : 'Edit'}</span>
            </button>
          </div>

          {isEditing ? (
            <textarea
              rows={4}
              value={summaryText}
              onChange={(e) => setSummaryText(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none leading-relaxed"
            />
          ) : (
            <p className="text-xs sm:text-sm text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-100 leading-relaxed font-normal">
              {summaryText}
            </p>
          )}
        </div>
      </div>

      {/* Action CTA buttons */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className="px-5 py-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs sm:text-sm transition-colors"
        >
          {isEditing ? 'Lock Text' : 'Edit'}
        </button>

        <button
          type="button"
          onClick={handleConfirm}
          className="flex-1 py-3.5 px-6 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Confirm Referral & Generate Care Pass</span>
        </button>
      </div>
    </div>
  );
};
