'use client';

import React, { useEffect, useState } from 'react';
import { Search, UserPlus, ChevronRight } from 'lucide-react';
import type { Patient } from '@/types/domain';
import * as patientsService from '@/services/patients.service';
import { ApiError } from '@/lib/api';
import { LoadingState, ErrorState, EmptyState } from '@/components/StateViews';
import { RegisterPatientModal } from './RegisterPatientModal';

interface PatientsListViewProps {
  onSelectPatient: (patient: Patient) => void;
  onStartVisitForPatient: (patient: Patient) => void;
}

function patientAge(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const diff = Date.now() - dob.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export const PatientsListView: React.FC<PatientsListViewProps> = ({
  onSelectPatient,
  onStartVisitForPatient,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [patients, setPatients] = useState<Patient[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPatients = (search: string) => {
    setLoading(true);
    setError(null);
    patientsService
      .listPatients(search)
      .then(setPatients)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load patients.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const handle = setTimeout(() => fetchPatients(searchQuery), searchQuery ? 300 : 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handlePatientCreated = (newPatient: Patient) => {
    setPatients((prev) => (prev ? [newPatient, ...prev] : [newPatient]));
    onSelectPatient(newPatient);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Patients</h1>
          <p className="text-xs sm:text-sm text-slate-500">Patients registered in your organization</p>
        </div>

        <button
          type="button"
          onClick={() => setIsRegisterOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition-all active:scale-[0.98] shrink-0"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          <UserPlus className="w-4 h-4" />
          <span>Register Patient</span>
        </button>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, ID, or phone…"
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent shadow-xs transition-all"
          style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
        />
      </div>

      {loading && <LoadingState label="Loading patients…" />}
      {!loading && error && <ErrorState message={error} onRetry={() => fetchPatients(searchQuery)} />}
      {!loading && !error && patients && patients.length === 0 && (
        <EmptyState
          title={searchQuery ? `No patients matching "${searchQuery}"` : 'No patients yet'}
          description="Register a patient to start recording visits."
          action={
            <button
              onClick={() => setIsRegisterOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold border"
              style={{ backgroundColor: 'var(--color-accent-light)', color: 'var(--color-primary)', borderColor: 'var(--color-accent)' }}
            >
              Register Patient
            </button>
          }
        />
      )}

      {!loading && !error && patients && patients.length > 0 && (
        <div className="space-y-3">
          {patients.map((patient) => {
            const age = patientAge(patient.dateOfBirth);
            return (
              <div
                key={patient.id}
                onClick={() => onSelectPatient(patient)}
                className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold shrink-0 text-white"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    {patient.firstName[0]}
                    {patient.lastName[0]}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {patient.firstName} {patient.lastName}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-600 mt-1 flex-wrap">
                      {age !== null && <span className="font-semibold text-slate-700">{age} yrs</span>}
                      {patient.gender && <span>• {patient.gender}</span>}
                      {patient.uniqueId && (
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-bold text-slate-700">
                          {patient.uniqueId}
                        </span>
                      )}
                      {patient.phone && <span className="text-slate-500">{patient.phone}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartVisitForPatient(patient);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors"
                    style={{ backgroundColor: 'var(--color-accent-light)', color: 'var(--color-primary)', borderColor: 'var(--color-accent)' }}
                  >
                    New Visit
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <RegisterPatientModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onPatientCreated={handlePatientCreated}
      />
    </div>
  );
};
