import { useState } from 'react';
import { Image as ImageIcon, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import type { DamageAssessment, DamageReport } from '@/types/domain';
import { cn } from '@/lib/utils';

interface DamageModuleProps {
  damageReports: DamageReport[];
  onAnalyzeDamage: (image: string) => Promise<DamageAssessment | null>;
}

export function DamageModule({ damageReports, onAnalyzeDamage }: DamageModuleProps) {
  const [isAssessing, setIsAssessing] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<DamageAssessment | null>(null);

  const handleAIAnalyze = async (image: string) => {
    setIsAssessing(true);
    try {
      const result = await onAnalyzeDamage(image);
      setAssessmentResult(result);
    } finally {
      setIsAssessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-6 bg-surface/50 rounded-2xl border border-border space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted">New AI Assessment</h3>
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-xl bg-bg/50 hover:border-orange-500/50 transition-all group cursor-pointer relative overflow-hidden">
          <input
            type="file"
            accept="image/*"
            aria-label="Upload vehicle photo for AI damage assessment"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) {
                return;
              }

              const reader = new FileReader();
              reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                  void handleAIAnalyze(reader.result);
                }
              };
              reader.readAsDataURL(file);
            }}
          />
          <div className="flex flex-col items-center gap-3">
            <div className="p-4 rounded-full bg-border group-hover:bg-orange-500 group-hover:text-white transition-all">
              {isAssessing ? <Loader2 className="w-8 h-8 animate-spin" /> : <ImageIcon className="w-8 h-8" />}
            </div>
            <p className="text-sm font-bold">Upload Vehicle Photo for AI Assessment</p>
            <p className="text-xs text-text-muted">Gemini Vision will analyze damage and estimate costs</p>
          </div>
        </div>

        {assessmentResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-surface/50 border border-orange-500/30 rounded-2xl space-y-4 shadow-xl shadow-orange-500/5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-orange-500">
                <Sparkles className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-widest">AI Assessment Result</span>
              </div>
              <span
                className={cn(
                  'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest',
                  assessmentResult.severity === 'critical'
                    ? 'bg-red-500/20 text-red-500'
                    : assessmentResult.severity === 'high'
                      ? 'bg-orange-500/20 text-orange-500'
                      : 'bg-blue-500/20 text-blue-500',
                )}
              >
                {assessmentResult.severity} Severity
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Estimated Repair Cost</p>
                <p className="text-2xl font-bold text-red-500">${assessmentResult.estimatedRepairCost}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">AI Summary</p>
                <p className="text-sm italic text-text-muted">"{assessmentResult.aiAssessment}"</p>
              </div>
            </div>
            <div className="pt-4 border-t border-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">Detailed Description</p>
              <p className="text-sm leading-relaxed text-text-muted">{assessmentResult.description}</p>
            </div>
            <button
              onClick={() => setAssessmentResult(null)}
              aria-label="Clear AI assessment"
              className="w-full py-2 text-xs font-bold uppercase tracking-widest text-text-muted hover:text-text transition-colors"
            >
              Clear Assessment
            </button>
          </motion.div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted">Recent Damage Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {damageReports.map((entry) => (
            <div key={entry.id} className="p-4 bg-surface/50 rounded-xl border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                    entry.severity === 'critical'
                      ? 'bg-red-500/10 text-red-500'
                      : entry.severity === 'high'
                        ? 'bg-orange-500/10 text-orange-500'
                        : 'bg-blue-500/10 text-blue-500',
                  )}
                >
                  {entry.severity} Severity
                </span>
                <span className="text-[10px] text-text-muted">{entry.createdAt}</span>
              </div>
              <p className="text-sm font-medium">{entry.description}</p>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-xs text-text-muted">Est. Cost:</span>
                <span className="text-sm font-bold text-red-500">${entry.estimatedRepairCost}</span>
              </div>
            </div>
          ))}
          {damageReports.length === 0 && (
            <div className="p-8 text-center text-text-muted bg-surface/50 rounded-xl border border-border">
              No damage reports found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
