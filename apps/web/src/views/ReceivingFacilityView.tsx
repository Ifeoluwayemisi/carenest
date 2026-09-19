import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  Search, 
  Building2, 
  CheckCircle2, 
  User, 
  Stethoscope, 
  Clock, 
  FileText, 
  AlertCircle, 
  Camera, 
  ArrowLeft,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Referral } from '../types';
import { storage } from '../services/storage';

interface ReceivingFacilityViewProps {
  initialCode?: string;
  onBackToCHW: () => void;
}

export const ReceivingFacilityView: React.FC<ReceivingFacilityViewProps> = ({
  initialCode = 'REF-10281',
  onBackToCHW,
}) => {
  const [inputCode, setInputCode] = useState(initialCode);
  const [retrievedReferral, setRetrievedReferral] = useState<Referral | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isMarkedReceived, setIsMarkedReceived] = useState(false);

  // Auto-search if initialCode is provided
  useEffect(() => {
    if (initialCode) {
      handleLookup(initialCode);
    }
  }, [initialCode]);

  const handleLookup = (codeToSearch: string) => {
    const clean = codeToSearch.trim();
    if (!clean) return;

    const ref = storage.getReferralByCode(clean);
    if (ref) {
      setRetrievedReferral(ref);
      setIsMarkedReceived(ref.status === 'received');
    } else {
      // Fallback to first available referral for seamless demo
      const all = storage.getReferrals();
      if (all.length > 0) {
        setRetrievedReferral(all[0]);
        setInputCode(all[0].referralCode);
        setIsMarkedReceived(all[0].status === 'received');
      }
    }
  };

  const handleSimulateScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      const all = storage.getReferrals();
      const demoRef = all[0];
      if (demoRef) {
        setInputCode(demoRef.referralCode);
        setRetrievedReferral(demoRef);
        setIsMarkedReceived(demoRef.status === 'received');
      }
    }, 1200);
  };

  const handleMarkReceived = () => {
    if (!retrievedReferral) return;

    storage.markReferralReceived(retrievedReferral.referralCode, 'Dr. T. Adeleke (General Hospital Intake)');
    setIsMarkedReceived(true);

    try {
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.6 },
        colors: ['#0f766e', '#0d9488', '#3b82f6'],
      });
    } catch {}
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Top Banner indicating Receiving Facility Mode */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold">General Hospital — Intake Portal</h2>
              <span className="text-[10px] bg-teal-400 text-slate-950 font-bold px-2 py-0.2 rounded uppercase">
                Receiving Facility
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Dr. T. Adeleke • Outpatient & Triage Continuity Desk
            </p>
          </div>
        </div>

        <button
          onClick={onBackToCHW}
          className="self-start sm:self-auto text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Switch back to CHW Field Mode</span>
        </button>
      </div>

      {/* Lookup Card: Enter Code or Scan QR */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">Receive Care Pass</h1>
          <p className="text-xs text-slate-500">
            Retrieve verified field history transmitted from Ajegunle Community Health Centre
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder="Enter referral ID (e.g. REF-10281)..."
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none uppercase"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleLookup(inputCode)}
              className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-sm active:scale-[0.98] cursor-pointer"
            >
              Retrieve Record
            </button>

            <button
              type="button"
              onClick={handleSimulateScan}
              disabled={isScanning}
              className="px-4 py-3 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-semibold text-xs sm:text-sm rounded-xl transition-all flex items-center gap-1.5 active:scale-[0.98] cursor-pointer"
            >
              <Camera className="w-4 h-4 text-teal-700" />
              <span>{isScanning ? 'Scanning...' : 'Scan QR'}</span>
            </button>
          </div>
        </div>

        {/* Demo Shortcut helper */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Quick Demo Code:</span>
          <button
            type="button"
            onClick={() => {
              setInputCode('REF-10281');
              handleLookup('REF-10281');
            }}
            className="font-mono font-bold text-teal-700 hover:underline bg-teal-50 px-2 py-0.5 rounded border border-teal-200"
          >
            REF-10281 (Maria Okafor)
          </button>
        </div>
      </div>

      {/* Retrieved Referral Clinical Record */}
      {retrievedReferral && (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
          {/* Status Header */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-teal-800">
                  Referral Verified & Authorized
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <h3 className="text-xl font-bold text-slate-900">
                    {retrievedReferral.patientName}
                  </h3>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-xs font-semibold text-slate-600">
                    {retrievedReferral.patientAge} yrs • {retrievedReferral.patientSex}
                  </span>
                  <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-700">
                    {retrievedReferral.patientId}
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                {isMarkedReceived ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-2xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Referral status: Received</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Referral status: Pending Intake</span>
                  </div>
                )}
              </div>
            </div>

            {/* Core Idea Value Proposition Callout */}
            <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-3.5 text-xs text-teal-950 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <p>
                <strong>The receiving health worker gets the patient's relevant story without the patient having to start from zero.</strong>
                All observations were captured by certified CHW {retrievedReferral.chwName} at {retrievedReferral.referringFacility}.
              </p>
            </div>

            {/* Structured Clinical Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Box 1: Escalation reason & Symptoms */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Primary Referral Reason
                </span>
                <p className="text-sm font-semibold text-slate-900">
                  {retrievedReferral.reason}
                </p>
                <div className="pt-2">
                  <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Symptoms Reported by Patient:
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                    {retrievedReferral.symptomsReported.map((sym, i) => (
                      <li key={i} className="font-medium">{sym}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Box 2: Recorded Field Vitals & History */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Vitals Recorded in Field
                </span>
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  {retrievedReferral.recordedObservations.vitals.temperature && (
                    <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-300 font-bold text-slate-900">
                      Temp: {retrievedReferral.recordedObservations.vitals.temperature}°C
                    </span>
                  )}
                  {retrievedReferral.recordedObservations.vitals.bloodPressure && (
                    <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-300 font-bold text-slate-900">
                      BP: {retrievedReferral.recordedObservations.vitals.bloodPressure}
                    </span>
                  )}
                  {retrievedReferral.recordedObservations.vitals.pulse && (
                    <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-300 font-bold text-slate-900">
                      Pulse: {retrievedReferral.recordedObservations.vitals.pulse} bpm
                    </span>
                  )}
                </div>

                <div className="pt-2 text-slate-600">
                  <span className="text-[11px] font-semibold text-slate-500 block">Previous Encounter Linked:</span>
                  <span>{retrievedReferral.previousEncounterDate} (Medication refill access issues noted)</span>
                </div>
              </div>
            </div>

            {/* Full Referral Narrative Summary */}
            <div className="space-y-1 pt-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Authorized Referral Summary
              </span>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 leading-relaxed">
                {retrievedReferral.referralSummary}
              </div>
            </div>

            {/* Action Button: Mark referral received */}
            <div className="pt-3 flex items-center justify-between gap-3 border-t border-slate-100">
              <span className="text-xs text-slate-400">
                Care Pass REF: <strong className="font-mono text-slate-700">{retrievedReferral.referralCode}</strong>
              </span>

              {!isMarkedReceived ? (
                <button
                  type="button"
                  onClick={handleMarkReceived}
                  className="px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-[0.99] flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark referral received</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Intake Logged in Hospital Records</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
