'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { PWAInstallBanner } from './PWAInstallBanner';

import { LoginView } from '../views/LoginView';
import { DashboardView } from '../views/DashboardView';
import { PatientsListView } from '../views/PatientsListView';
import { PatientProfileView } from '../views/PatientProfileView';
import { NewVisitView } from '../views/NewVisitView';
import { AIProcessingModal } from '../views/AIProcessingModal';
import { StructuredDraftView } from '../views/StructuredDraftView';
import { ReviewConfirmView } from '../views/ReviewConfirmView';
import { ReferralCreateView } from '../views/ReferralCreateView';
import { AIReferralSummaryView } from '../views/AIReferralSummaryView';
import { CarePassView } from '../views/CarePassView';
import { ReceivingFacilityView } from '../views/ReceivingFacilityView';
import { FollowUpsView } from '../views/FollowUpsView';
import { ReferralsListView } from '../views/ReferralsListView';
import { SupervisorView } from '../views/SupervisorView';
import { SettingsView } from '../views/SettingsView';

import { storage, DEFAULT_USER } from '../services/storage';
import { AIService, ExtractedEncounterDraft } from '../services/aiService';
import { Patient, Vitals, Referral } from '../types';

export function CareNestApp() {
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [currentView, setCurrentView] = useState<string>('home');
  const [activePatient, setActivePatient] = useState<Patient | null>(null);

  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [unsyncedCount, setUnsyncedCount] = useState<number>(0);

  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<ExtractedEncounterDraft | null>(null);
  const [pendingRawNotes, setPendingRawNotes] = useState('');
  const [pendingInputMethod, setPendingInputMethod] = useState<'voice' | 'text'>('voice');

  const [referralTargetFacility, setReferralTargetFacility] = useState('General Hospital');
  const [referralReason, setReferralReason] = useState('');
  const [referralNarrativeSummary, setReferralNarrativeSummary] = useState('');
  const [activeCarePass, setActiveCarePass] = useState<Referral | null>(null);

  const [receivingLookupCode, setReceivingLookupCode] = useState<string>('REF-10281');
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsOnline(storage.isOnline());
    setUnsyncedCount(storage.getUnsyncedCount());
    const initialPatient = storage.getPatient('pat-001') || storage.getPatients()[0];
    setActivePatient(initialPatient);

    const unsubscribe = storage.subscribe(() => {
      setIsOnline(storage.isOnline());
      setUnsyncedCount(storage.getUnsyncedCount());
    });
    return () => unsubscribe();
  }, []);

  if (!mounted || !activePatient) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Loading CareNest Workspace...</p>
        </div>
      </div>
    );
  }

  const handleToggleOnline = () => {
    storage.toggleOnlineStatus();
  };

  const handleStartNewVisit = (patient?: Patient) => {
    if (patient) setActivePatient(patient);
    setCurrentView('new-visit');
  };

  const handleStructureWithAI = (notesText: string, vitals: Vitals, inputMethod: 'voice' | 'text') => {
    setPendingRawNotes(notesText);
    setPendingInputMethod(inputMethod);
    setIsAIProcessing(true);
  };

  const handleAIProcessingDone = () => {
    setIsAIProcessing(false);
    const vitals: Vitals = {
      temperature: 37.4,
      bloodPressure: '130/85',
      pulse: 76,
      weight: 68,
    };
    const draft = AIService.structureVisitNotes(pendingRawNotes, vitals);
    setPendingDraft(draft);
    setCurrentView('structured-draft');
  };

  const handleProceedToConfirm = (updatedDraft: ExtractedEncounterDraft) => {
    setPendingDraft(updatedDraft);
    setCurrentView('review-confirm');
  };

  const handleConfirmAndSave = (draft: ExtractedEncounterDraft) => {
    storage.saveEncounter({
      patientId: activePatient.id,
      chwId: DEFAULT_USER.id,
      chwName: DEFAULT_USER.name,
      facilityId: DEFAULT_USER.facilityId,
      facilityName: DEFAULT_USER.facilityName,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      rawNotes: pendingRawNotes || 'Community field visit documentation',
      inputMethod: pendingInputMethod,
      patientReported: draft.patientReported,
      chwObservations: draft.chwObservations,
      followUp: draft.followUp,
      confirmed: true,
      confirmedBy: DEFAULT_USER.name,
      confirmedAt: new Date().toISOString(),
    });

    const refreshed = storage.getPatient(activePatient.id);
    if (refreshed) setActivePatient(refreshed);

    setCurrentView('patient-profile');
  };

  const handleReferPatient = (patient: Patient) => {
    setActivePatient(patient);
    setCurrentView('referral-create');
  };

  const handleGenerateReferralSummary = (targetFacility: string, reason: string) => {
    setReferralTargetFacility(targetFacility);
    setReferralReason(reason);

    const summary = AIService.generateReferralSummary(
      activePatient.name,
      activePatient.age,
      activePatient.sex,
      DEFAULT_USER.facilityName,
      targetFacility,
      reason,
      ['Headache for three days', 'Difficulty obtaining medication'],
      { temperature: 37.4, bloodPressure: '130/85', pulse: 76 },
      'Sept 05, 2026'
    );

    setReferralNarrativeSummary(summary);
    setCurrentView('referral-summary');
  };

  const handleConfirmReferral = (data: { receivingFacility: string; reason: string; summary: string }) => {
    const newRef = storage.createReferral({
      patientId: activePatient.id,
      patientName: activePatient.name,
      patientAge: activePatient.age,
      patientSex: activePatient.sex,
      referringFacility: DEFAULT_USER.facilityName,
      receivingFacility: data.receivingFacility,
      chwName: DEFAULT_USER.name,
      reason: data.reason,
      relevantHistory: `Patient has reported recurring headaches over the past 3 days and difficulty accessing regular hypertension medication. Past community visit on Sept 05 noted medication supply interruption.`,
      symptomsReported: ['Headache for three days', 'Difficulty obtaining medication'],
      recordedObservations: {
        vitals: { temperature: 37.4, bloodPressure: '130/85', pulse: 76 },
        notes: 'Elevated blood pressure observed during field visit. Temperature mildly elevated.',
      },
      previousEncounterDate: 'Sept 05, 2026',
      referralSummary: data.summary,
    });

    setActiveCarePass(newRef);
    setReceivingLookupCode(newRef.referralCode);
    setCurrentView('care-pass');
  };

  const handleNavigateToReceiving = (referralCode: string) => {
    setReceivingLookupCode(referralCode);
    setCurrentView('receiving-facility');
  };

  const handleResetData = () => {
    storage.resetDemoData();
    const refreshed = storage.getPatient('pat-001') || storage.getPatients()[0];
    setActivePatient(refreshed);
    setCurrentView('home');
    alert('Demo data has been reset to initial Maria Okafor state.');
  };

  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-teal-100 text-slate-900">
      <PWAInstallBanner />

      <Navbar
        isOnline={isOnline}
        onToggleOnline={handleToggleOnline}
        unsyncedCount={unsyncedCount}
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          setShowMoreMenu(false);
        }}
        onSignOut={() => setIsAuthenticated(false)}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar
          currentView={currentView}
          onNavigate={(view) => setCurrentView(view)}
          onOpenNewVisit={() => handleStartNewVisit()}
          onSignOut={() => setIsAuthenticated(false)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl w-full mx-auto">
          {currentView === 'home' && (
            <DashboardView
              onStartNewVisit={handleStartNewVisit}
              onNavigateToPatients={() => setCurrentView('patients')}
              onSelectPatient={(p) => {
                setActivePatient(p);
                setCurrentView('patient-profile');
              }}
              onNavigate={(view) => setCurrentView(view)}
              isOnline={isOnline}
              unsyncedCount={unsyncedCount}
            />
          )}

          {currentView === 'patients' && (
            <PatientsListView
              onSelectPatient={(p) => {
                setActivePatient(p);
                setCurrentView('patient-profile');
              }}
              onStartVisitForPatient={(p) => handleStartNewVisit(p)}
            />
          )}

          {currentView === 'patient-profile' && (
            <PatientProfileView
              patient={activePatient}
              onBack={() => setCurrentView('patients')}
              onStartNewVisit={handleStartNewVisit}
              onReferPatient={handleReferPatient}
            />
          )}

          {currentView === 'new-visit' && (
            <NewVisitView
              patient={activePatient}
              onBack={() => setCurrentView('patient-profile')}
              onStructureWithAI={handleStructureWithAI}
            />
          )}

          {currentView === 'structured-draft' && pendingDraft && (
            <StructuredDraftView
              patient={activePatient}
              draft={pendingDraft}
              onProceedToConfirm={handleProceedToConfirm}
              onBackToEditNotes={() => setCurrentView('new-visit')}
            />
          )}

          {currentView === 'review-confirm' && pendingDraft && (
            <ReviewConfirmView
              patient={activePatient}
              draft={pendingDraft}
              isOnline={isOnline}
              onBackToDraft={() => setCurrentView('structured-draft')}
              onConfirmAndSave={handleConfirmAndSave}
            />
          )}

          {currentView === 'referral-create' && (
            <ReferralCreateView
              patient={activePatient}
              onBack={() => setCurrentView('patient-profile')}
              onGenerateSummary={handleGenerateReferralSummary}
            />
          )}

          {currentView === 'referral-summary' && (
            <AIReferralSummaryView
              patient={activePatient}
              receivingFacility={referralTargetFacility}
              reason={referralReason}
              symptomsReported={['Headache for three days', 'Difficulty obtaining medication']}
              recordedVitals={{ temperature: 37.4, bloodPressure: '130/85', pulse: 76 }}
              previousEncounterDate="Sept 05, 2026"
              generatedSummary={referralNarrativeSummary}
              onBack={() => setCurrentView('referral-create')}
              onConfirmReferral={handleConfirmReferral}
            />
          )}

          {currentView === 'care-pass' && activeCarePass && (
            <CarePassView
              referral={activeCarePass}
              onDone={() => setCurrentView('home')}
              onNavigateToReceiving={handleNavigateToReceiving}
            />
          )}

          {currentView === 'receiving-facility' && (
            <ReceivingFacilityView
              initialCode={receivingLookupCode}
              onBackToCHW={() => setCurrentView('home')}
            />
          )}

          {currentView === 'follow-ups' && (
            <FollowUpsView
              onSelectPatient={(p) => {
                setActivePatient(p);
                setCurrentView('patient-profile');
              }}
            />
          )}

          {currentView === 'referrals' && (
            <ReferralsListView
              onOpenCarePass={(ref) => {
                setActiveCarePass(ref);
                setCurrentView('care-pass');
              }}
              onNavigateToReceiving={handleNavigateToReceiving}
            />
          )}

          {currentView === 'supervisor' && <SupervisorView />}

          {currentView === 'settings' && (
            <SettingsView
              isOnline={isOnline}
              onToggleOnline={handleToggleOnline}
              unsyncedCount={unsyncedCount}
              onSignOut={() => setIsAuthenticated(false)}
              onResetData={handleResetData}
            />
          )}
        </main>
      </div>

      <AIProcessingModal
        isOpen={isAIProcessing}
        onComplete={handleAIProcessingDone}
      />

      <BottomNav
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          setShowMoreMenu(false);
        }}
        onOpenNewVisit={() => handleStartNewVisit()}
        onOpenMoreMenu={() => setShowMoreMenu(true)}
      />

      {showMoreMenu && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end md:hidden">
          <div className="bg-white rounded-t-3xl w-full p-6 space-y-3 animate-in slide-in-from-bottom duration-200">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-900 mb-2">More Field Options</h3>

            <button
              onClick={() => {
                setCurrentView('follow-ups');
                setShowMoreMenu(false);
              }}
              className="w-full text-left py-3 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 font-semibold text-xs text-slate-800 flex items-center justify-between"
            >
              <span>Pending Follow-ups</span>
              <span className="text-teal-700 font-bold">3 Due</span>
            </button>

            <button
              onClick={() => {
                setCurrentView('receiving-facility');
                setShowMoreMenu(false);
              }}
              className="w-full text-left py-3 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 font-semibold text-xs text-slate-800 flex items-center justify-between"
            >
              <span>Receiving Facility Portal</span>
              <span className="text-xs text-teal-800">Hospital Intake</span>
            </button>

            <button
              onClick={() => {
                setCurrentView('supervisor');
                setShowMoreMenu(false);
              }}
              className="w-full text-left py-3 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 font-semibold text-xs text-slate-800 flex items-center justify-between"
            >
              <span>Supervisor View</span>
              <span className="text-xs text-slate-500">Ajegunle CHC</span>
            </button>

            <button
              onClick={() => {
                setCurrentView('settings');
                setShowMoreMenu(false);
              }}
              className="w-full text-left py-3 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 font-semibold text-xs text-slate-800 flex items-center justify-between"
            >
              <span>Settings & Sync Queue</span>
              <span className="text-xs text-slate-500">Offline Profile</span>
            </button>

            <button
              onClick={() => setShowMoreMenu(false)}
              className="w-full py-3 text-center text-xs font-semibold text-slate-500 hover:text-slate-800 pt-2"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
