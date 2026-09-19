import React from 'react';
import { Home, Users, Plus, Share2, Menu } from 'lucide-react';

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
          className={`flex flex-col items-center justify-center flex-1 py-1 ${
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
          className={`flex flex-col items-center justify-center flex-1 py-1 ${
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
            className="w-13 h-13 rounded-full bg-teal-600 hover:bg-teal-700 text-white flex flex-col items-center justify-center shadow-lg border-2 border-white active:scale-95 transition-transform"
            aria-label="New Visit"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Referrals */}
        <button
          type="button"
          onClick={() => onNavigate('referrals')}
          className={`flex flex-col items-center justify-center flex-1 py-1 ${
            currentView === 'referrals' || currentView === 'care-pass'
              ? 'text-teal-700 font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Share2 className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Referrals</span>
        </button>

        {/* More Menu */}
        <button
          type="button"
          onClick={onOpenMoreMenu}
          className={`flex flex-col items-center justify-center flex-1 py-1 ${
            ['follow-ups', 'supervisor', 'settings', 'receiving-facility'].includes(currentView)
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
