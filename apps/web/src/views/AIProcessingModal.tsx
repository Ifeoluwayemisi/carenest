import React, { useState, useEffect } from 'react';
import { Check, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { PROCESSING_STEPS } from '../services/aiService';

interface AIProcessingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const AIProcessingModal: React.FC<AIProcessingModalProps> = ({
  isOpen,
  onComplete,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      void Promise.resolve().then(() => setCurrentStepIndex(0));
      return;
    }

    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < PROCESSING_STEPS.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          setTimeout(() => {
            onComplete();
          }, 500);
          return prev;
        }
      });
    }, 450);

    return () => clearInterval(interval);
  }, [isOpen, onComplete]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 sm:p-7 shadow-2xl border border-slate-200 text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto shadow-xs">
          <Sparkles className="w-7 h-7 text-teal-600 animate-pulse" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-900">Structuring visit...</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Organizing natural documentation into clinical sections
          </p>
        </div>

        {/* 4-step progress list */}
        <div className="space-y-3 text-left bg-slate-50 p-4 rounded-2xl border border-slate-100">
          {PROCESSING_STEPS.map((step, idx) => {
            const isDone = idx < currentStepIndex;
            const isInProgress = idx === currentStepIndex;

            return (
              <div key={step} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isDone 
                    ? 'bg-emerald-600 text-white' 
                    : isInProgress 
                    ? 'bg-teal-600 text-white animate-pulse' 
                    : 'bg-slate-200 text-slate-400'
                }`}>
                  {isDone ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  ) : isInProgress ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  )}
                </div>

                <span className={`text-xs font-medium ${
                  isDone ? 'text-slate-800' : isInProgress ? 'text-teal-900 font-semibold' : 'text-slate-400'
                }`}>
                  {step}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
          <span>CareNest Clinical Extraction • Human review required</span>
        </div>
      </div>
    </div>
  );
};
