import React from 'react';
import { 
  User, 
  Building2, 
  Wifi, 
  WifiOff, 
  HardDrive, 
  RotateCcw, 
  LogOut, 
  Shield, 
  Smartphone, 
  CheckCircle2, 
  Info 
} from 'lucide-react';
import { storage, DEFAULT_USER } from '../services/storage';

interface SettingsViewProps {
  isOnline: boolean;
  onToggleOnline: () => void;
  unsyncedCount: number;
  onSignOut: () => void;
  onResetData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  isOnline,
  onToggleOnline,
  unsyncedCount,
  onSignOut,
  onResetData,
}) => {
  return (
    <div className="space-y-6 pb-20 md:pb-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Settings & Device Profile</h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Field configuration and offline synchronization status
        </p>
      </div>

      {/* User & Facility Identity Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-700 text-white flex items-center justify-center text-lg font-bold shadow-sm">
            AB
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">{DEFAULT_USER.name}</h3>
            <p className="text-xs text-teal-800 font-semibold">{DEFAULT_USER.role}</p>
            <p className="text-xs text-slate-500 mt-0.5">{DEFAULT_USER.phone} • {DEFAULT_USER.community}</p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 flex items-center gap-3 text-xs">
          <Building2 className="w-5 h-5 text-teal-700 shrink-0" />
          <div>
            <div className="font-bold text-slate-900">{DEFAULT_USER.facilityName}</div>
            <div className="text-slate-500">Facility Code: {DEFAULT_USER.facilityId} • Primary Health Care Board</div>
          </div>
        </div>
      </div>

      {/* Interactive Network & Sync Simulator */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4 text-amber-600" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Connection & Sync Simulator</h3>
              <p className="text-xs text-slate-500">Toggle offline mode to demo rural clinic resilience</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleOnline}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isOnline
                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                : 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300'
            }`}
          >
            {isOnline ? 'Online (Tap for Offline)' : 'Offline (Tap for Online)'}
          </button>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium">Local Storage Sync Queue:</span>
            <span className="font-bold text-slate-900">
              {unsyncedCount > 0 ? `${unsyncedCount} visits waiting to sync` : 'All records synced to facility'}
            </span>
          </div>
          {unsyncedCount > 0 && isOnline && (
            <button
              onClick={() => storage.syncPendingRecords()}
              className="w-full py-2 bg-teal-700 text-white font-semibold rounded-lg hover:bg-teal-800 transition-colors text-xs"
            >
              Sync Pending Records Now
            </button>
          )}
        </div>
      </div>

      {/* PWA & System Information */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 text-xs">
        <h3 className="text-sm font-bold text-slate-900">CareNest Application Status</h3>

        <div className="divide-y divide-slate-100">
          <div className="py-2.5 flex items-center justify-between">
            <span className="text-slate-500">App Version</span>
            <span className="font-semibold text-slate-800">1.0.0 (MVP Field Edition)</span>
          </div>
          <div className="py-2.5 flex items-center justify-between">
            <span className="text-slate-500">PWA Manifest</span>
            <span className="font-semibold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Installed & Active
            </span>
          </div>
          <div className="py-2.5 flex items-center justify-between">
            <span className="text-slate-500">Offline Shell Storage</span>
            <span className="font-semibold text-slate-800">IndexedDB / LocalStorage</span>
          </div>
          <div className="py-2.5 flex items-center justify-between">
            <span className="text-slate-500">Speech Engine</span>
            <span className="font-semibold text-slate-800">Web Speech API + Simulated Waveform</span>
          </div>
        </div>
      </div>

      {/* Dangerous / Reset Actions */}
      <div className="pt-2 space-y-3">
        <button
          type="button"
          onClick={onResetData}
          className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Demo Data to Initial Maria Okafor Story</span>
        </button>

        <button
          type="button"
          onClick={onSignOut}
          className="w-full py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out of Ajegunle CHC</span>
        </button>
      </div>
    </div>
  );
};
