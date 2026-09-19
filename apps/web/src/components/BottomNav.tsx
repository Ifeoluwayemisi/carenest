import React from 'react';
import { Home, Users, Plus, CalendarClock, Menu } from 'lucide-react';

interface BottomNavProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenNewVisit: () => void;
  onOpenMoreMenu: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentView,
  onNavigate,
  onOpenNewVisit,
  onOpenMoreMenu,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg safe-bottom">
      <div className="flex items-center justify-around px-2 py-1.5 h-16">
        {/* Home */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer ${
            currentView === 'home' ? 'text-teal-700 font-semibold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Home</span>
        </button>

        {/* Patients */}
        <button
          type="button"
          onClick={() => onNavigate('patients')}
          className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer ${
            currentView === 'patients' || currentView === 'patient-profile'
              ? 'text-teal-700 font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Patients</span>
        </button>

        {/* Center Action: + New Visit */}
        <div className="flex-1 flex justify-center -mt-5">
          <button
            type="button"
            onClick={onOpenNewVisit}
            className="w-13 h-13 rounded-full bg-teal-600 hover:bg-teal-700 text-white flex flex-col items-center justify-center shadow-lg border-2 border-white active:scale-95 transition-transform cursor-pointer"
            aria-label="New Visit"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Follow-ups */}
        <button
          type="button"
          onClick={() => onNavigate('follow-ups')}
          className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer ${
            currentView === 'follow-ups'
              ? 'text-teal-700 font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarClock className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Follow-ups</span>
        </button>

        {/* More Menu */}
        <button
          type="button"
          onClick={onOpenMoreMenu}
          className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer ${
            ['supervisor', 'settings'].includes(currentView)
              ? 'text-teal-700 font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">More</span>
        </button>
      </div>
    </nav>
  );
};
