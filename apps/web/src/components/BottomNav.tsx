'use client';

import React from 'react';
import { Home, Users, Plus, ShieldCheck, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface BottomNavProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenNewVisit: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onNavigate, onOpenNewVisit }) => {
  const { user } = useAuth();
  const canSeeSupervisor = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR';
  const activeColor = { color: 'var(--color-primary)', fontWeight: 600 };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg">
      <div className="flex items-center justify-around px-2 py-1.5 h-16">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="flex flex-col items-center justify-center flex-1 py-1 text-slate-500"
          style={currentView === 'home' ? activeColor : undefined}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Home</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('patients')}
          className="flex flex-col items-center justify-center flex-1 py-1 text-slate-500"
          style={currentView === 'patients' || currentView === 'patient-profile' ? activeColor : undefined}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Patients</span>
        </button>

        <div className="flex-1 flex justify-center -mt-5">
          <button
            type="button"
            onClick={onOpenNewVisit}
            className="w-13 h-13 rounded-full text-white flex flex-col items-center justify-center shadow-lg border-2 border-white active:scale-95 transition-transform"
            style={{ backgroundColor: 'var(--color-accent)' }}
            aria-label="Record a visit"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {canSeeSupervisor ? (
          <button
            type="button"
            onClick={() => onNavigate('supervisor')}
            className="flex flex-col items-center justify-center flex-1 py-1 text-slate-500"
            style={currentView === 'supervisor' ? activeColor : undefined}
          >
            <ShieldCheck className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Supervisor</span>
          </button>
        ) : (
          <div className="flex-1" />
        )}

        <button
          type="button"
          onClick={() => onNavigate('settings')}
          className="flex flex-col items-center justify-center flex-1 py-1 text-slate-500"
          style={currentView === 'settings' ? activeColor : undefined}
        >
          <Settings className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Settings</span>
        </button>
      </div>
    </nav>
  );
};
