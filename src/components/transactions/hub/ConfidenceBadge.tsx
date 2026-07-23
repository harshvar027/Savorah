import React from 'react';
import { Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ConfidenceBadgeProps {
  score: number; // 0-100
  className?: string;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ score, className = '' }) => {
  if (score >= 88) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 text-[11px] font-bold ${className}`}>
        <CheckCircle2 className="w-3 h-3" />
        AI Confidence {score}%
      </span>
    );
  }
  if (score >= 70) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-100 border border-amber-200 text-amber-700 text-[11px] font-bold ${className}`}>
        <Sparkles className="w-3 h-3" />
        AI Confidence {score}% — Review suggested
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-bold ${className}`}>
      <AlertTriangle className="w-3 h-3" />
      Low Confidence {score}% — Please verify
    </span>
  );
};
