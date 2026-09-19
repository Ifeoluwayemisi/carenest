'use client';

import React from 'react';
import { Home, Users, PlusCircle, ShieldCheck, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenNewVisit: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, onOpenNewVisit }) => {
  const { user, logout } = useAuth();
  const canSeeSupervisor = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR';

  const navItems = [
    { id: 'home', label: 'Dashboard', icon: Home },
    { id: 'patients', label: 'Patients', icon: Users },
    ...(canSeeSupervisor ? [{ id: 'supervisor', label: 'Supervisor View', icon: ShieldCheck }] : []),
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-3.5rem)] p-4 shrink-0 justify-between">
      <div className="space-y-6">
        <button
          type="button"
          onClick={onOpenNewVisit}
          className="w-full text-white font-semibold text-sm py-2.5 px-4 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          <PlusCircle className="w-5 h-5" />
          <span>Record a Visit</span>
        </button>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id || (item.id === 'patients' && currentView === 'patient-profile');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors text-left"
                style={
                  isActive
                    ? { backgroundColor: 'var(--color-accent-light)', color: 'var(--color-primary)', fontWeight: 600 }
                    : undefined
                }
              >
                <Icon className={`w-4 h-4 ${isActive ? '' : 'text-slate-400'}`} style={isActive ? { color: 'var(--color-primary)' } : undefined} />
                <span className={isActive ? '' : 'text-slate-600'}>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-200 pt-4 space-y-2">
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
          <p className="text-xs font-semibold text-slate-700">{user?.name}</p>
          <p className="text-[11px] text-slate-500">{user?.email}</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-500 hover:text-rose-600 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
