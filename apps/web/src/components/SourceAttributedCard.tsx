import React from 'react';
import { User, CheckCircle2, FileText, ShieldCheck } from 'lucide-react';
import type { SourceType } from '@/types/domain';

/**
 * DESIGN.md §6, Component B — source-attributed content card. This is the
 * single most important visual pattern in CareNest: it's how the product
 * keeps patient-reported, CHW-recorded, and AI-suggested content visually
 * distinguishable everywhere it appears (AI review, confirmed visits,
 * timeline). Never render AI/CHW/patient content without one of these.
 */
const STYLES: Record<SourceType, { bg: string; border: string; text: string; label: string; Icon: React.ElementType }> = {
  PATIENT_REPORTED: {
    bg: 'var(--color-patient-bg)',
    border: 'var(--color-patient-border)',
    text: 'var(--color-patient-text)',
    label: 'Patient Reported',
    Icon: User,
  },
  CHW_RECORDED: {
    bg: 'var(--color-chw-bg)',
    border: 'var(--color-chw-border)',
    text: 'var(--color-chw-text)',
    label: 'CHW Recorded',
    Icon: CheckCircle2,
  },
  AI_SUGGESTED: {
    bg: 'var(--color-ai-bg)',
    border: 'var(--color-ai-border)',
    text: 'var(--color-ai-text)',
    label: 'AI Suggested',
    Icon: FileText,
  },
  PROVIDER_VERIFIED: {
    bg: 'var(--color-online-bg)',
    border: '#065f46',
    text: 'var(--color-online-text)',
    label: 'Provider Verified',
    Icon: ShieldCheck,
  },
};

interface SourceAttributedCardProps {
  sourceType: SourceType;
  children: React.ReactNode;
  className?: string;
}

export const SourceBadge: React.FC<{ sourceType: SourceType }> = ({ sourceType }) => {
  const s = STYLES[sourceType];
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
      style={{ backgroundColor: s.bg, borderColor: s.border, color: s.text }}
    >
      <s.Icon size={11} />
      {s.label}
    </span>
  );
};

export const SourceAttributedCard: React.FC<SourceAttributedCardProps> = ({
  sourceType,
  children,
  className = '',
}) => {
  const s = STYLES[sourceType];
  return (
    <div
      className={`border-l-4 p-3.5 rounded-r-lg shadow-xs ${className}`}
      style={{ backgroundColor: s.bg, borderColor: s.border }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <s.Icon size={13} style={{ color: s.text }} />
        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: s.text }}>
          {s.label}
        </span>
      </div>
      <div className="text-sm text-slate-800 leading-relaxed">{children}</div>
    </div>
  );
};
