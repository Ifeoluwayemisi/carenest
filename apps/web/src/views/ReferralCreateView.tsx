import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Share2, 
  Building2, 
  Sparkles, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import { Patient, Encounter } from '../types';
import { storage } from '../services/storage';

interface ReferralCreateViewProps {
  patient: Patient;
  onBack: () => void;
  onGenerateSummary: (receivingFacility: string, reason: string) => void;
}

export const ReferralCreateView: React.FC<ReferralCreateViewProps> = ({
  patient,
  onBack,
  onGenerateSummary,
}) => {
  const [receivingFacility, setReceivingFacility] = useState('General Hospital');
  const [reason, setReason] = useState('Persistent symptoms requiring further evaluation and physician review');
  const encounters = storage.getPatientEncounters(patient.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    onGenerateSummary(receivingFacility, reason.trim());
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
          <span>Back to Profile</span>
        </button>

        <span className="text-xs font-semibold text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
          Care Continuity Escalation
        </span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          Refer Patient to Secondary Facility
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          CareNest packages {patient.name}'s continuous history so the receiving hospital doesn't start from zero.
        </p>
      </div>

      {/* Patient Identity Badge */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-700 text-white font-bold flex items-center justify-center text-xs">
            {patient.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">{patient.name}</span>
              <span className="font-mono text-xs text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded font-bold">
                {patient.patientId}
              </span>
            </div>
            <span className="text-xs text-slate-500">
              Referring From: <strong className="text-teal-900">Ajegunle Community Health Centre</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Receiving Facility *
          </label>
          <div className="relative">
            <select
              value={receivingFacility}
              onChange={(e) => setReceivingFacility(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
            >
              <option value="General Hospital">General Hospital (Lagos Island / Ajeromi)</option>
              <option value="Ajeromi General Hospital">Ajeromi General Hospital</option>
              <option value="Lagos University Teaching Hospital (LUTH)">LUTH (Tertiary Specialty)</option>
              <option value="Randle General Hospital">Randle General Hospital (Surulere)</option>
            </select>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            The receiving clinic can scan or lookup the Care Pass directly.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Clinical Reason for Referral *
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Persistent symptoms requiring further evaluation and physician review"
            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
            required
          />
        </div>

        {/* Selected Relevant Encounter History Preview */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Attached Community Encounters ({encounters.length})
            </span>
            <span className="text-[11px] text-teal-700 font-semibold">Included in Care Pass</span>
          </div>

          <div className="space-y-2">
            {encounters.map((enc) => (
              <div
                key={enc.id}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-slate-800">
                    {enc.date}: {enc.patientReported.chiefComplaint}
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    Recorded by {enc.chwName} • Vitals: {enc.chwObservations.vitals.temperature ? `${enc.chwObservations.vitals.temperature}°C, ` : ''}{enc.chwObservations.vitals.bloodPressure || 'Vitals noted'}
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full py-3.5 px-6 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-teal-200" />
            <span>Generate Referral Summary</span>
          </button>
          <p className="text-center text-[11px] text-slate-400 mt-2">
            CareNest synthesizes recorded visits into a doctor-ready referral summary.
          </p>
        </div>
      </form>
    </div>
  );
};
