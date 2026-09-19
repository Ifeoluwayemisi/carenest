import React from 'react';
import { Wifi, WifiOff, RefreshCw, Building2, User, Activity, QrCode } from 'lucide-react';
import { storage } from '../services/storage';

interface NavbarProps {
  isOnline: boolean;
  onToggleOnline: () => void;
  unsyncedCount: number;
  currentView: string;
  onNavigate: (view: string) => void;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isOnline,
  onToggleOnline,
  unsyncedCount,
  currentView,
  onNavigate,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm safe-top">
      {/* Top Banner / Facility bar */}
      <div className="bg-slate-900 text-slate-200 px-4 py-1 text-xs flex items-center justify-between">
        <div className="flex items-center gap-1.5 truncate">
          <Building2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span className="font-medium text-slate-100 truncate">Ajegunle Community Health Centre</span>
          <span className="text-slate-500 hidden sm:inline">•</span>
          <span className="text-slate-400 hidden sm:inline">Facility ID: AJG-CHC-04</span>
        </div>

        {/* Quick Portal Switcher for demo ease */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigate(currentView === 'receiving-facility' ? 'home' : 'receiving-facility')}
            className={`text-[11px] px-2 py-0.5 rounded font-medium transition-colors flex items-center gap-1 ${
              currentView === 'receiving-facility'
                ? 'bg-teal-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="Switch to receiving facility doctor view"
          >
            <QrCode className="w-3 h-3" />
            <span className="hidden xs:inline">{currentView === 'receiving-facility' ? 'Return to CHW' : 'Receiving Facility'}</span>
          </button>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 cursor-pointer select-none"
        >
          <div className="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center text-white shadow-sm">
            <Activity className="w-5 h-5 text-teal-200" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900">CareNest</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 bg-teal-50 text-teal-700 border border-teal-200 rounded">
                Field PWA
              </span>
            </div>
            <p className="text-[10px] text-slate-500 hidden sm:block -mt-0.5">Your patient's story, carried forward</p>
          </div>
        </div>

        {/* Right Action: Network status toggle & CHW profile */}
        <div className="flex items-center gap-2.5">
          {/* Unsynced Badge */}
          {unsyncedCount > 0 && (
            <button
              onClick={() => {
                if (isOnline) {
                  storage.syncPendingRecords();
                } else {
                  onToggleOnline();
                }
              }}
              className="flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-2.5 py-1 rounded-full animate-pulse cursor-pointer"
              title="Click to sync records"
            >
              <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" />
              <span className="font-semibold">{unsyncedCount}</span>
              <span className="hidden sm:inline">pending sync</span>
            </button>
          )}

          {/* Network Status Toggle Button */}
          <button
            onClick={onToggleOnline}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
              isOnline
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
            }`}
            title="Click to toggle simulated online/offline mode"
          >
            {isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden xs:inline font-semibold">Online</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                <span className="font-semibold">Offline</span>
                <span className="text-[10px] text-amber-700 hidden md:inline">— saved locally</span>
              </>
            )}
          </button>

          {/* CHW Profile Button */}
          <button
            onClick={() => onNavigate('settings')}
            className="flex items-center gap-2 pl-2 border-l border-slate-200 text-slate-700 hover:text-slate-900"
          >
            <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-xs font-bold border border-teal-200">
              AB
            </div>
            <div className="text-left hidden lg:block">
              <div className="text-xs font-semibold text-slate-800 leading-tight">Amina Bello</div>
              <div className="text-[10px] text-slate-500 leading-tight">CHW</div>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
