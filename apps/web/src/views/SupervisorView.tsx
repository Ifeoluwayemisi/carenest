import React from 'react';
import { 
  ShieldCheck, 
  Users, 
  Activity, 
  CalendarClock, 
  CloudOff 
} from 'lucide-react';
import { storage } from '../services/storage';

export const SupervisorView: React.FC = () => {
  const unsynced = storage.getUnsyncedCount();

  const chwTeam = [
    { name: 'Amina Bello', area: 'Ajegunle Ward 3', visitsToday: 8, status: 'Active (Field)' },
    { name: 'Chukwudi Eze', area: 'Boundary Market Zone', visitsToday: 7, status: 'Active (Clinic)' },
    { name: 'Zainab Ibrahim', area: 'Orodu Settlement', visitsToday: 6, status: 'Active (Field)' },
    { name: 'Babatunde Fashola', area: 'Kirikiri Canal Zone', visitsToday: 9, status: 'Active (Field)' },
    { name: 'Grace Danjuma', area: 'Alaba Suru Quarter', visitsToday: 5, status: 'Active (Field)' },
    { name: 'Emeka Obi', area: 'Bale Road Zone', visitsToday: 7, status: 'Active (Field)' },
  ];

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Facility Supervisor Overview
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
              Supervisor Area
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Ajegunle Community Health Centre • Ajeromi-Ifelodun LGA Supervision
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <span>Facility In-Charge Active</span>
        </div>
      </div>

      {/* Aggregate Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Active CHWs</span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">8</div>
          <div className="text-[10px] text-teal-700 font-semibold mt-0.5">Full field coverage</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Visits Today</span>
            <Activity className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">42</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Across 6 sub-zones</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Pending Follow-ups</span>
            <CalendarClock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">4</div>
          <div className="text-[10px] text-amber-700 font-semibold mt-0.5">Scheduled this week</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Unsynced Records</span>
            <CloudOff className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{unsynced}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Awaiting connectivity</div>
        </div>
      </div>

      {/* Field Worker Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Active Field Workers</h3>
          <p className="text-xs text-slate-500">Live documentation status across community wards</p>
        </div>

        <div className="divide-y divide-slate-100">
          {chwTeam.map((chw, i) => (
            <div key={i} className="py-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-800 flex items-center justify-center font-bold">
                  {chw.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="font-bold text-slate-900">{chw.name}</div>
                  <div className="text-slate-500">{chw.area}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div>
                  <span className="font-bold text-slate-800">{chw.visitsToday}</span> visits
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {chw.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
