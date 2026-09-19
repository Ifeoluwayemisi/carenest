'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { PWAInstallBanner } from './PWAInstallBanner';

import { LoginView } from '../views/LoginView';
import { DashboardView } from '../views/DashboardView';
import { PatientsListView } from '../views/PatientsListView';
import { PatientProfileView } from '../views/PatientProfileView';
import { NewVisitView } from '../views/NewVisitView';
import { AIReviewView } from '../views/AIReviewView';
import { VisitDetailView } from '../views/VisitDetailView';
import { SupervisorView } from '../views/SupervisorView';
import { SettingsView } from '../views/SettingsView';

import { useAuth } from '@/contexts/AuthContext';
import type { Patient, Visit } from '@/types/domain';
import { getPendingCount, syncQueuedVisits } from '@/lib/offline-queue';

type View =
  | 'home'
  | 'patients'
  | 'patient-profile'
  | 'new-visit'
  | 'visit-review'
  | 'visit-detail'
  | 'supervisor'
  | 'settings';

export function CareNestApp() {
  const { status } = useAuth();

  const [currentView, setCurrentView] = useState<View>('home');
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [pendingVisit, setPendingVisit] = useState<Visit | null>(null);
  const [activeVisitId, setActiveVisitId] = useState<string | null>(null);

  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const refreshSyncCount = useCallback(() => {
    getPendingCount().then(setPendingSyncCount);
  }, []);

  useEffect(() => {
    // Deferred to a microtask so the initial setIsOnline/refreshSyncCount
    // calls don't run synchronously in the effect body
    // (react-hooks/set-state-in-effect).
    void Promise.resolve().then(() => {
      setIsOnline(navigator.onLine);
      refreshSyncCount();
    });

    const handleOnline = async () => {
      setIsOnline(true);
      await syncQueuedVisits();
      refreshSyncCount();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshSyncCount]);

  const handleSyncNow = async () => {
    if (!isOnline) return;
    await syncQueuedVisits();
    refreshSyncCount();
  };

  const handleStartNewVisit = () => {
    if (!activePatient) {
      setCurrentView('patients');
      return;
    }
    setCurrentView('new-visit');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--color-bg-app)' }}>
        <div className="text-center space-y-2">
          <div
            className="w-10 h-10 border-3 border-t-transparent rounded-full animate-spin mx-auto"
            style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
          />
          <p className="text-xs font-semibold text-slate-600">Loading CareNest…</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg-app)' }}>
      <PWAInstallBanner />

      <Navbar
        isOnline={isOnline}
        pendingSyncCount={pendingSyncCount}
        onSyncNow={handleSyncNow}
        currentView={currentView}
        onNavigate={(v) => setCurrentView(v as View)}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar currentView={currentView} onNavigate={(v) => setCurrentView(v as View)} onOpenNewVisit={handleStartNewVisit} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl w-full mx-auto">
          {currentView === 'home' && (
            <DashboardView
              onStartNewVisit={handleStartNewVisit}
              onNavigateToPatients={() => setCurrentView('patients')}
              onSelectPatient={(p) => {
                setActivePatient(p);
                setCurrentView('patient-profile');
              }}
              isOnline={isOnline}
              pendingSyncCount={pendingSyncCount}
            />
          )}

          {currentView === 'patients' && (
            <PatientsListView
              onSelectPatient={(p) => {
                setActivePatient(p);
                setCurrentView('patient-profile');
              }}
              onStartVisitForPatient={(p) => {
                setActivePatient(p);
                setCurrentView('new-visit');
              }}
            />
          )}

          {currentView === 'patient-profile' && activePatient && (
            <PatientProfileView
              patient={activePatient}
              onBack={() => setCurrentView('patients')}
              onStartNewVisit={() => setCurrentView('new-visit')}
              onOpenVisit={(visitId) => {
                setActiveVisitId(visitId);
                setCurrentView('visit-detail');
              }}
            />
          )}

          {currentView === 'new-visit' && activePatient && (
            <NewVisitView
              patient={activePatient}
              isOnline={isOnline}
              onBack={() => setCurrentView('patient-profile')}
              onVisitCreated={(visit) => {
                setPendingVisit(visit);
                setCurrentView('visit-review');
              }}
              onSavedOffline={() => {
                refreshSyncCount();
                setCurrentView('patient-profile');
              }}
            />
          )}

          {currentView === 'visit-review' && pendingVisit && activePatient && (
            <AIReviewView
              visit={pendingVisit}
              patient={activePatient}
              onBack={() => setCurrentView('patient-profile')}
              onConfirmed={() => {
                setPendingVisit(null);
                setCurrentView('patient-profile');
              }}
            />
          )}

          {currentView === 'visit-detail' && activeVisitId && activePatient && (
            <VisitDetailView
              visitId={activeVisitId}
              patient={activePatient}
              onBack={() => setCurrentView('patient-profile')}
              onConfirmed={() => {
                setActiveVisitId(null);
                setCurrentView('patient-profile');
              }}
            />
          )}

          {currentView === 'supervisor' && <SupervisorView />}

          {currentView === 'settings' && (
            <SettingsView isOnline={isOnline} onQueueChanged={refreshSyncCount} />
          )}
        </main>
      </div>

      <BottomNav currentView={currentView} onNavigate={(v) => setCurrentView(v as View)} onOpenNewVisit={handleStartNewVisit} />
    </div>
  );
}
