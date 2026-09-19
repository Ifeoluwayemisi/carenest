import React from 'react';
import { 
  Plus, 
  Search, 
  Users, 
  Clock, 
  Share2, 
  CloudOff, 
  CheckCircle2, 
  ChevronRight, 
  AlertCircle,
  Activity,
  ArrowUpRight
} from 'lucide-react';
import { Patient } from '../types';
import { storage } from '../services/storage';

interface DashboardViewProps {
  onStartNewVisit: (patient?: Patient) => void;
  onNavigateToPatients: () => void;
  onSelectPatient: (patient: Patient) => void;
  onNavigate: (view: string) => void;
  isOnline: boolean;
  unsyncedCount: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onStartNewVisit,
  onNavigateToPatients,
  onSelectPatient,
  onNavigate,
  isOnline,
  unsyncedCount,
}) => {
  const patients = storage.getPatients();
  const recentPatients = patients.slice(0, 3);

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header Greetings & Connection */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Good morning, Amina
            </h1>
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Ajegunle Community Health Centre • Field Workspace
          </p>
        </div>

        {/* Network & Sync Status Pill */}
        <div className="flex items-center gap-2">
          {isOnline ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Online</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-900 border border-amber-300 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>Offline — changes saved locally</span>
            </div>
          )}
        </div>
      </div>

      {/* Unsynced Offline Banner Alert if pending */}
      {unsyncedCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <CloudOff className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-amber-900">
                {unsyncedCount} visit waiting to sync
              </h4>
              <p className="text-xs text-amber-700">
                {isOnline ? 'Connection active. Tap Sync to update central record.' : 'Changes are safely preserved on your phone.'}
              </p>
            </div>
          </div>
          {isOnline ? (
            <button
              onClick={() => storage.syncPendingRecords()}
              className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
            >
              Sync Now
            </button>
          ) : (
            <span className="text-xs font-medium text-amber-800 bg-amber-100/70 px-2.5 py-1 rounded-md">
              Queued
            </span>
          )}
        </div>
      )}

      {/* Primary Action Hero Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <button
          type="button"
          onClick={() => {
            // Find Maria Okafor by default for the primary story
            const maria = storage.getPatient('pat-001') || patients[0];
            onStartNewVisit(maria);
          }}
          className="group text-left p-5 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-between cursor-pointer"
        >
          <div className="space-y-1">
            <span className="text-xs uppercase font-bold tracking-wider text-teal-200">
              Primary Task
            </span>
            <div className="text-xl font-bold flex items-center gap-2">
              <span>+ New Visit</span>
              <ArrowUpRight className="w-5 h-5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
            <p className="text-xs text-teal-100/90 max-w-xs">
              Record natural voice or text notes for community patient encounter
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-600/60 flex items-center justify-center shrink-0 border border-teal-500/30">
            <Plus className="w-7 h-7 text-white stroke-[2.5]" />
          </div>
        </button>

        <button
          type="button"
          onClick={onNavigateToPatients}
          className="group text-left p-5 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 shadow-sm hover:shadow-md active:scale-[0.99] transition-all flex items-center justify-between cursor-pointer"
        >
          <div className="space-y-1">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
              Directory
            </span>
            <div className="text-xl font-bold flex items-center gap-2 text-slate-900">
              <span>Find Patient</span>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-xs text-slate-500 max-w-xs">
              Search by name, patient ID (e.g. CB-00421), or phone number
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
            <Search className="w-6 h-6 text-slate-700" />
          </div>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Today's Visits</span>
            <Activity className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">8</div>
          <div className="text-[10px] text-teal-700 font-medium mt-0.5">3 in Ajegunle Ward 3</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Patients</span>
            <Users className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">142</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Registered in facility</div>
        </div>

        <div 
          onClick={() => onNavigate('follow-ups')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-teal-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Follow-ups</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">3</div>
          <div className="text-[10px] text-amber-700 font-medium mt-0.5">1 due this week</div>
        </div>

        <div 
          onClick={() => onNavigate('referrals')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-teal-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Referrals</span>
            <Share2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">2</div>
          <div className="text-[10px] text-indigo-700 font-medium mt-0.5">1 Care Pass active</div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Unsynced</span>
            <CloudOff className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{unsyncedCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {unsyncedCount === 0 ? 'All records current' : 'Pending upload'}
          </div>
        </div>
      </div>

      {/* Recent Patients Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Patients</h3>
            <p className="text-xs text-slate-500">Quick access to today's active encounters</p>
          </div>
          <button
            type="button"
            onClick={onNavigateToPatients}
            className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1"
          >
            View all ({patients.length})
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {recentPatients.map((patient) => {
            const isHeroDemo = patient.name === 'Maria Okafor';

            return (
              <div
                key={patient.id}
                onClick={() => onSelectPatient(patient)}
                className={`py-3.5 px-3 -mx-3 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                  isHeroDemo ? 'bg-teal-50/40 hover:bg-teal-50' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${
                    isHeroDemo ? 'bg-teal-700 text-white ring-2 ring-teal-200' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {patient.name.split(' ').map(n => n[0]).join('')}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{patient.name}</span>
                      {isHeroDemo && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-100 text-teal-800 px-2 py-0.2 rounded-full">
                          Demo Story
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                      <span>{patient.age} • {patient.sex}</span>
                      <span>•</span>
                      <span className="font-mono text-slate-600">{patient.patientId}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex items-center gap-3">
                  <div className="hidden xs:block">
                    <span className="text-xs font-medium text-slate-700">Last visit:</span>
                    <span className="text-xs text-teal-700 font-semibold ml-1">{patient.lastVisit}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
