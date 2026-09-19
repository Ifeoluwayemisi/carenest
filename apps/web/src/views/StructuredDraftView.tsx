import React, { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle, 
  AlertTriangle, 
  Edit3, 
  Thermometer, 
  Heart, 
  ArrowRight, 
  User, 
  Stethoscope, 
  CalendarClock,
  ArrowLeft
} from 'lucide-react';
import { Patient, Vitals } from '../types';
import { ExtractedEncounterDraft } from '../services/aiService';

interface StructuredDraftViewProps {
  patient: Patient;
  draft: ExtractedEncounterDraft;
  onProceedToConfirm: (updatedDraft: ExtractedEncounterDraft) => void;
  onBackToEditNotes: () => void;
}

export const StructuredDraftView: React.FC<StructuredDraftViewProps> = ({
  patient,
  draft,
  onProceedToConfirm,
  onBackToEditNotes,
}) => {
  // Allow full editing of every extracted field
  const [chiefComplaint, setChiefComplaint] = useState(draft.patientReported.chiefComplaint);
  const [duration, setDuration] = useState(draft.patientReported.duration);
  const [concernsText, setConcernsText] = useState(draft.patientReported.concerns.join(', '));
  const [clinicalNotes, setClinicalNotes] = useState(draft.chwObservations.clinicalNotes);
  const [temperature, setTemperature] = useState(draft.chwObservations.vitals.temperature?.toString() || '');
  const [bloodPressure, setBloodPressure] = useState(draft.chwObservations.vitals.bloodPressure || '');
  const [pulse, setPulse] = useState(draft.chwObservations.vitals.pulse?.toString() || '');
  const [recommendation, setRecommendation] = useState(draft.followUp.recommendation);
  const [dueDate, setDueDate] = useState(draft.followUp.dueDate);
  const [isEditing, setIsEditing] = useState(false);

  const handleProceed = () => {
    const updatedDraft: ExtractedEncounterDraft = {
      patientReported: {
        chiefComplaint: chiefComplaint.trim(),
        duration: duration.trim(),
        concerns: concernsText.split(',').map(c => c.trim()).filter(Boolean),
      },
      chwObservations: {
        clinicalNotes: clinicalNotes.trim(),
        vitals: {
          temperature: temperature ? parseFloat(temperature) : undefined,
          bloodPressure: bloodPressure.trim() || undefined,
          pulse: pulse ? parseInt(pulse, 10) : undefined,
        }
      },
      followUp: {
        recommendation: recommendation.trim(),
        dueDate: dueDate.trim(),
      }
    };
    onProceedToConfirm(updatedDraft);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header with Review Required Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <button
            onClick={onBackToEditNotes}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to raw notes</span>
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              AI-Generated Visit Draft
            </h1>
            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-700" />
              Review required
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Patient: <strong className="text-slate-800">{patient.name}</strong> ({patient.patientId})
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
            isEditing 
              ? 'bg-teal-700 text-white shadow-xs' 
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>{isEditing ? 'Done Editing' : 'Edit Fields'}</span>
        </button>
      </div>

      {/* Mandatory Human Review Callout */}
      <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900">
          <strong className="font-semibold block mb-0.5">AI-generated draft. Review and confirm before saving.</strong>
          CareNest organized your raw notes into clinical categories. Verify that symptoms, duration, and observations are accurately reflected.
        </div>
      </div>

      {/* Card 1: Patient-Reported */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Patient-reported</h3>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-800 px-2 py-0.5 rounded border border-teal-200">
            Patient reported
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">
              Chief Complaint
            </label>
            {isEditing ? (
              <input
                type="text"
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-teal-600"
              />
            ) : (
              <div className="text-sm font-bold text-slate-900 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                {chiefComplaint}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">
              Reported Duration
            </label>
            {isEditing ? (
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-teal-600"
              />
            ) : (
              <div className="text-sm font-semibold text-slate-800 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                {duration}
              </div>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-500 block mb-1">
              Patient Concerns & Specific Details
            </label>
            {isEditing ? (
              <input
                type="text"
                value={concernsText}
                onChange={(e) => setConcernsText(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:ring-1 focus:ring-teal-600"
              />
            ) : (
              <div className="text-xs sm:text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                {concernsText}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card 2: CHW Observations & Vitals */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <Stethoscope className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">CHW observations</h3>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
            CHW observed
          </span>
        </div>

        {/* Vitals Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[11px] font-medium text-slate-500 block mb-0.5 flex items-center gap-1">
              <Thermometer className="w-3 h-3 text-rose-500" />
              Temperature
            </span>
            {isEditing ? (
              <input
                type="number"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm font-bold text-slate-900"
              />
            ) : (
              <span className="text-base font-bold text-slate-900">{temperature || '—'} °C</span>
            )}
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[11px] font-medium text-slate-500 block mb-0.5 flex items-center gap-1">
              <Heart className="w-3 h-3 text-indigo-500" />
              Blood Pressure
            </span>
            {isEditing ? (
              <input
                type="text"
                value={bloodPressure}
                onChange={(e) => setBloodPressure(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm font-bold text-slate-900"
              />
            ) : (
              <span className="text-base font-bold text-slate-900">{bloodPressure || '—'}</span>
            )}
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
            <span className="text-[11px] font-medium text-slate-500 block mb-0.5">
              Pulse
            </span>
            {isEditing ? (
              <input
                type="number"
                value={pulse}
                onChange={(e) => setPulse(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm font-bold text-slate-900"
              />
            ) : (
              <span className="text-base font-bold text-slate-900">{pulse ? `${pulse} bpm` : '76 bpm'}</span>
            )}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 block mb-1">
            Field Clinical Notes
          </label>
          {isEditing ? (
            <textarea
              rows={2}
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-1 focus:ring-teal-600"
            />
          ) : (
            <p className="text-xs sm:text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">
              {clinicalNotes}
            </p>
          )}
        </div>
      </div>

      {/* Card 3: Follow-Up & Continuity */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <CalendarClock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Follow-up</h3>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded border border-indigo-200">
            AI structured
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-500 block mb-1">
              Care Continuity Task
            </label>
            {isEditing ? (
              <input
                type="text"
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:ring-1 focus:ring-teal-600"
              />
            ) : (
              <div className="text-xs sm:text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 font-medium">
                {recommendation}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">
              Target Follow-up Date
            </label>
            {isEditing ? (
              <input
                type="text"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:ring-1 focus:ring-teal-600"
              />
            ) : (
              <div className="text-xs sm:text-sm text-teal-800 bg-teal-50/50 p-3 rounded-lg border border-teal-100 font-semibold">
                {dueDate}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className="px-5 py-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs sm:text-sm transition-colors"
        >
          {isEditing ? 'Lock Changes' : 'Edit'}
        </button>

        <button
          type="button"
          onClick={handleProceed}
          className="flex-1 py-3 px-6 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Review & Confirm</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
