import React, { useState } from 'react';
import { 
  CheckCircle, 
  Share2, 
  Printer, 
  Copy, 
  ArrowRight, 
  Building2, 
  QrCode as QrIcon, 
  ShieldCheck, 
  Check, 
  HeartHandshake
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Referral } from '../types';
import { QRCode } from '../components/QRCode';

interface CarePassViewProps {
  referral: Referral;
  onDone: () => void;
  onNavigateToReceiving: (referralCode: string) => void;
}

export const CarePassView: React.FC<CarePassViewProps> = ({
  referral,
  onDone,
  onNavigateToReceiving,
}) => {
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#0d9488', '#0f766e', '#14b8a6', '#0284c7'],
      });
    } catch {}
  }, []);

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(referral.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6 max-w-xl mx-auto text-center">
      {/* Visual Header */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold mb-1">
          <HeartHandshake className="w-3.5 h-3.5 text-teal-600" />
          <span>Care Continuity Authorization</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          CareNest Care Pass
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Digital health passport carrying Maria Okafor's field story to the receiving clinic
        </p>
      </div>

      {/* The Care Pass Physical Card */}
      <div className="bg-white rounded-3xl border-2 border-teal-600/30 p-6 sm:p-8 shadow-xl relative overflow-hidden space-y-6 text-left">
        {/* Top Watermark / Brand */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-teal-800">CareNest</span>
              <span className="text-[10px] uppercase font-bold tracking-wider bg-teal-50 text-teal-800 px-2 py-0.5 rounded border border-teal-200">
                Official Care Pass
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Primary Health Care Continuity</p>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-medium uppercase">Date Issued</span>
            <span className="text-xs font-bold text-slate-700">
              {new Date(referral.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Patient and Facility Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-semibold">
              Patient
            </span>
            <div className="text-base font-bold text-slate-900">
              {referral.patientName}
            </div>
            <div className="text-slate-600">
              {referral.patientAge} years • {referral.patientSex}
            </div>
            <div className="font-mono text-slate-500 font-bold">
              ID: {referral.patientId}
            </div>
          </div>

          <div className="space-y-2 sm:text-right">
            <div>
              <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-semibold">
                Referring Facility
              </span>
              <span className="font-semibold text-slate-800 block">{referral.referringFacility}</span>
              <span className="text-[11px] text-slate-500">CHW: {referral.chwName}</span>
            </div>

            <div>
              <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-semibold">
                Receiving Facility
              </span>
              <span className="font-bold text-teal-800">{referral.receivingFacility}</span>
            </div>
          </div>
        </div>

        {/* High-Contrast QR Code Centerpiece */}
        <div className="py-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center space-y-3">
          <QRCode value={referral.referralCode} size={180} />

          <div className="text-center space-y-1">
            <p className="text-xs font-semibold text-slate-700">
              Scan or enter this code at the receiving facility
            </p>
            <div className="inline-flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-slate-300 shadow-2xs">
              <span className="font-mono text-lg font-bold tracking-wider text-teal-800">
                {referral.referralCode}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
                title="Copy code"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Reason Brief */}
        <div className="bg-teal-50/50 p-3 rounded-xl border border-teal-100 text-xs text-slate-700">
          <strong className="text-teal-950 block mb-0.5">Escalation Reason:</strong>
          {referral.reason}
        </div>

        {/* Security watermark */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1 text-teal-700 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Digital Continuity Verification • Valid for 14 days</span>
          </div>
          <span>Status: Authorized</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Pass</span>
          </button>

          <button
            type="button"
            onClick={handleCopyCode}
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copied ? 'Code Copied!' : 'Copy Code'}</span>
          </button>
        </div>

        {/* Hero Demo Jump to Receiving Facility */}
        <button
          type="button"
          onClick={() => onNavigateToReceiving(referral.referralCode)}
          className="w-full py-3.5 px-6 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Open Receiving Facility to Retrieve Story</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onDone}
          className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          Done (Return to Dashboard)
        </button>
      </div>
    </div>
  );
};
