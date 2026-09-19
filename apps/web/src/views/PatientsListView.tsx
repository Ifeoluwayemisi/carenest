import React, { useState } from 'react';
import { Search, UserPlus, ChevronRight, Phone, MapPin, Calendar } from 'lucide-react';
import { Patient } from '../types';
import { storage } from '../services/storage';
import { RegisterPatientModal } from './RegisterPatientModal';

interface PatientsListViewProps {
  onSelectPatient: (patient: Patient) => void;
  onStartVisitForPatient: (patient: Patient) => void;
}

export const PatientsListView: React.FC<PatientsListViewProps> = ({
  onSelectPatient,
  onStartVisitForPatient,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [patients, setPatients] = useState<Patient[]>(storage.getPatients());

  // Filter patients based on query
  const filteredPatients = patients.filter((patient) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      patient.name.toLowerCase().includes(q) ||
      patient.patientId.toLowerCase().includes(q) ||
      patient.phone.includes(q) ||
      patient.community.toLowerCase().includes(q)
    );
  });

  const handlePatientCreated = (newPatient: Patient) => {
    setPatients(storage.getPatients());
    onSelectPatient(newPatient);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Patients</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Registered facility members in Ajegunle Community Health Centre
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsRegisterOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Register New Patient</span>
        </button>
      </div>

      {/* Large Search Field */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, patient ID or phone number..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent shadow-xs transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-semibold text-slate-400 hover:text-slate-600"
          >
            Clear
          </button>
        )}
      </div>

      {/* Patient Cards List */}
      <div className="space-y-3">
        {filteredPatients.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No patient found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No matching records for "{searchQuery}". You can register a new patient now.
            </p>
            <button
              onClick={() => setIsRegisterOpen(true)}
              className="px-4 py-2 bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 rounded-xl text-xs font-semibold"
            >
              + Register {searchQuery}
            </button>
          </div>
        ) : (
          filteredPatients.map((patient) => {
            const isHeroDemo = patient.name === 'Maria Okafor';

            return (
              <div
                key={patient.id}
                onClick={() => onSelectPatient(patient)}
                className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                  isHeroDemo ? 'border-teal-300 ring-1 ring-teal-200/60 bg-teal-50/20' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold shrink-0 ${
                    isHeroDemo
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {patient.name.split(' ').map(n => n[0]).join('')}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900">{patient.name}</h3>
                      {isHeroDemo && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
                          Demo Story Hero
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-600 mt-1 flex-wrap">
                      <span className="font-semibold text-slate-700">{patient.age} • {patient.sex}</span>
                      <span>•</span>
                      <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-bold text-slate-700">
                        {patient.patientId}
                      </span>
                      <span>•</span>
                      <span className="text-slate-500">{patient.community}</span>
                    </div>
                  </div>
                </div>

                {/* Right side: Last visit & direct action */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <span className="text-[11px] text-slate-400 block">Last visit</span>
                    <span className="text-xs font-semibold text-teal-700">{patient.lastVisit}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartVisitForPatient(patient);
                      }}
                      className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-semibold rounded-lg transition-colors"
                    >
                      New Visit
                    </button>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <RegisterPatientModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onPatientCreated={handlePatientCreated}
      />
    </div>
  );
};
