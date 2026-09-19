import React from 'react';
import { Share2, QrCode, ArrowRight, Building2, CheckCircle2, Clock } from 'lucide-react';
import { storage } from '../services/storage';
import { Referral } from '../types';

interface ReferralsListViewProps {
  onOpenCarePass: (referral: Referral) => void;
  onNavigateToReceiving: (code: string) => void;
}

export const ReferralsListView: React.FC<ReferralsListViewProps> = ({
  onOpenCarePass,
  onNavigateToReceiving,
}) => {
  const referrals = storage.getReferrals();

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Referrals & Care Passes</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Active care continuity passports issued for secondary health facilities
          </p>
        </div>
        <span className="text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full">
          {referrals.length} active passes
        </span>
      </div>

      <div className="space-y-4">
        {referrals.map((ref) => {
          const isReceived = ref.status === 'received';

          return (
            <div
              key={ref.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs shrink-0">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{ref.patientName}</h3>
                      <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-700">
                        {ref.patientId}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      To: <strong className="text-slate-800">{ref.receivingFacility}</strong> • From: {ref.referringFacility}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs bg-teal-50 text-teal-900 px-2.5 py-1 rounded-md border border-teal-200">
                    {ref.referralCode}
                  </span>

                  {isReceived ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Received
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      <Clock className="w-3 h-3 text-amber-600" />
                      Active Pass
                    </span>
                  )}
                </div>
              </div>

              <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <strong className="text-slate-900 block mb-0.5">Referral Reason:</strong>
                {ref.reason}
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onOpenCarePass(ref)}
                  className="px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>View Care Pass QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateToReceiving(ref.referralCode)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Intake at Hospital</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
