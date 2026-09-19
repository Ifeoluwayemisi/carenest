import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  ShieldCheck
} from 'lucide-react';
import { Patient } from '../types';
import { storage } from '../services/storage';

interface PatientProfileViewProps {
  patient: Patient;
  onBack: () => void;
  onStartNewVisit: (patient: Patient) => void;
}

export const PatientProfileView: React.FC<PatientProfileViewProps> = ({
  patient,
  onBack,
  onStartNewVisit,
}) => {
  const encounters = storage.getPatientEncounters(patient.id);
  const [expandedEncounterId, setExpandedEncounterId] = useState<string | null>(
    encounters.length > 0 ? encounters[0].id : null
  );

  const toggleExpand = (id: string) => {
    setExpandedEncounterId(expandedEncounterId === id ? null : id);
  };

  const latestEncounter = encounters.length > 0 ? encounters[0] : null;

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Back button & Facility context */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Patients</span>
        </button>

        <span className="text-xs font-medium text-slate-500">
          Ajegunle CHC Record
        </span>
      </div>

      {/* Main Patient Hero Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-700 text-white flex items-center justify-center text-lg font-bold shadow-md ring-4 ring-teal-50 shrink-0">
              {patient.name.split(' ').map(n => n[0]).join('')}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {patient.name}
                </h1>
                <span className="font-mono bg-teal-50 text-teal-800 border border-teal-200 text-xs px-2.5 py-0.5 rounded-md font-bold">
                  {patient.patientId}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
                {patient.age} years old • {patient.sex} • {patient.community}
              </p>
            </div>
          </div>

          {/* Action CTAs: New Visit */}
          <div className="flex items-center gap-2.5 pt-2 sm:pt-0">
            <button
              type="button"
              onClick={() => onStartNewVisit(patient)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Record New Visit</span>
            </button>
          </div>
        </div>

        {/* Demographics row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 block font-medium">Phone</span>
            <span className="text-slate-700 font-semibold">{patient.phone}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Address</span>
            <span className="text-slate-700 font-semibold truncate block">{patient.address || 'Ajegunle'}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">First Registered</span>
            <span className="text-slate-700 font-semibold">{patient.registeredAt}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Continuity Records</span>
            <span className="text-teal-700 font-semibold">{encounters.length} Encounters</span>
          </div>
        </div>
      </div>

      {/* Current / Most Recent Encounter Snapshot Card */}
      {latestEncounter && (
        <div className="bg-gradient-to-br from-teal-50/70 to-teal-100/30 rounded-2xl border border-teal-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-teal-900">
                Most Recent Recorded Encounter
              </span>
            </div>
            <span className="text-xs font-medium text-teal-700 bg-white px-2 py-0.5 rounded border border-teal-200">
              {latestEncounter.date}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">
                {latestEncounter.patientReported.chiefComplaint}
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-slate-600 font-medium">
                Duration: {latestEncounter.patientReported.duration}
              </span>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              {latestEncounter.chwObservations.clinicalNotes}
            </p>

            {/* Quick vitals chips */}
            {latestEncounter.chwObservations.vitals && (
              <div className="flex items-center gap-2 pt-2 flex-wrap text-xs">
                {latestEncounter.chwObservations.vitals.temperature && (
                  <span className="bg-white px-2.5 py-1 rounded-lg border border-teal-200 text-slate-700 font-semibold">
                    Temp: {latestEncounter.chwObservations.vitals.temperature}°C
                  </span>
                )}
                {latestEncounter.chwObservations.vitals.bloodPressure && (
                  <span className="bg-white px-2.5 py-1 rounded-lg border border-teal-200 text-slate-700 font-semibold">
                    BP: {latestEncounter.chwObservations.vitals.bloodPressure}
                  </span>
                )}
                <span className="text-xs text-teal-800 ml-auto font-medium">
                  Confirmed by {latestEncounter.confirmedBy || latestEncounter.chwName}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Patient Story Continuity & Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Patient Timeline</h2>
            <p className="text-xs text-slate-500">
              Continuous healthcare journey carried forward across community visits
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {encounters.length} recorded
          </span>
        </div>

        {/* Vertical Timeline */}
        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-teal-200">
          {encounters.map((encounter, index) => {
            const isExpanded = expandedEncounterId === encounter.id;
            const isLatest = index === 0;

            return (
              <div key={encounter.id} className="relative group">
                <div className={`absolute -left-6 sm:-left-8 top-1 w-5 h-5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center border-2 border-white shadow-xs ${
                  isLatest ? 'bg-teal-600 text-white ring-4 ring-teal-100' : 'bg-slate-200 text-slate-600'
                }`}>
                  <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </div>

                <div className={`rounded-xl border transition-all ${
                  isLatest ? 'border-teal-300 bg-teal-50/10' : 'border-slate-200 bg-white'
                }`}>
                  <div
                    onClick={() => toggleExpand(encounter.id)}
                    className="p-4 flex items-center justify-between cursor-pointer select-none"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-teal-800">
                          {encounter.date}
                        </span>
                        <span className="text-[11px] text-slate-400">•</span>
                        <span className="text-xs font-semibold text-slate-800">
                          {encounter.patientReported.chiefComplaint}
                        </span>
                        {encounter.status === 'pending_sync' && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded">
                            Pending Sync
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Documented by {encounter.chwName} • {encounter.facilityName}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 hidden sm:inline">
                        {isExpanded ? 'Collapse' : 'Details'}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-slate-100 space-y-3 text-xs">
                      {encounter.chwObservations.vitals && (
                        <div className="bg-slate-50 p-3 rounded-lg flex items-center gap-4 flex-wrap border border-slate-100">
                          <span className="font-semibold text-slate-700">Vitals Recorded:</span>
                          {encounter.chwObservations.vitals.temperature && (
                            <span className="text-slate-600">Temp: <strong className="text-slate-800">{encounter.chwObservations.vitals.temperature}°C</strong></span>
                          )}
                          {encounter.chwObservations.vitals.bloodPressure && (
                            <span className="text-slate-600">BP: <strong className="text-slate-800">{encounter.chwObservations.vitals.bloodPressure}</strong></span>
                          )}
                          {encounter.chwObservations.vitals.pulse && (
                            <span className="text-slate-600">Pulse: <strong className="text-slate-800">{encounter.chwObservations.vitals.pulse} bpm</strong></span>
                          )}
                        </div>
                      )}

                      <div>
                        <span className="font-bold text-slate-700 block mb-1">Patient-reported Notes:</span>
                        <p className="text-slate-600 leading-relaxed">
                          {encounter.patientReported.concerns.join(', ')} (Duration: {encounter.patientReported.duration})
                        </p>
                      </div>

                      <div>
                        <span className="font-bold text-slate-700 block mb-1">CHW Field Observations:</span>
                        <p className="text-slate-600 leading-relaxed">
                          {encounter.chwObservations.clinicalNotes}
                        </p>
                      </div>

                      {encounter.followUp && (
                        <div className="bg-teal-50/50 p-2.5 rounded-lg border border-teal-100">
                          <span className="font-bold text-teal-900 block mb-0.5">Follow-up Plan:</span>
                          <p className="text-teal-800">
                            {encounter.followUp.recommendation}
                            {encounter.followUp.dueDate && ` (Due: ${encounter.followUp.dueDate})`}
                          </p>
                        </div>
                      )}

                      <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400">
                        <div className="flex items-center gap-1 text-emerald-700 font-medium">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>AI-assisted documentation • Confirmed by {encounter.confirmedBy || encounter.chwName}</span>
                        </div>
                        <span>Input: {encounter.inputMethod === 'voice' ? 'Voice Captured' : 'Text Entry'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
