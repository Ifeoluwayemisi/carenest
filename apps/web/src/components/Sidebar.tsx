import React from 'react';
import { 
  Home, 
  Users, 
  PlusCircle, 
  CalendarClock, 
  ShieldCheck, 
  Settings, 
  LogOut 
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenNewVisit: () => void;
  onSignOut: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  onOpenNewVisit,
  onSignOut,
}) => {
  const navItems = [
    { id: 'home', label: 'Dashboard', icon: Home },
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'follow-ups', label: 'Follow-ups', icon: CalendarClock },
    { id: 'supervisor', label: 'Supervisor View', icon: ShieldCheck },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-3.5rem)] p-4 shrink-0 justify-between">
      <div className="space-y-6">
        {/* Quick Action Button */}
        <div>
          <button
            type="button"
            onClick={onOpenNewVisit}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm py-2.5 px-4 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            <PlusCircle className="w-5 h-5" />
            <span>+ New Patient Visit</span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id || 
              (item.id === 'patients' && currentView === 'patient-profile');

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors text-left cursor-pointer ${
                  isActive
                    ? 'bg-teal-50 text-teal-800 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-teal-700' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / Sign Out */}
      <div className="border-t border-slate-200 pt-4 space-y-2">
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
          <p className="text-xs font-semibold text-slate-700">Ajegunle CHC</p>
          <p className="text-[11px] text-slate-500">Offline-first local cache active</p>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-500 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
