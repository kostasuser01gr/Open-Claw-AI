import { TrendingUp, Zap } from 'lucide-react';
import type { PricingRule } from '@/types/domain';

interface PricingModuleProps {
  pricingRules: PricingRule[];
}

export function PricingModule({ pricingRules }: PricingModuleProps) {
  const activeRules = pricingRules.filter((rule) => rule.isActive);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 bg-surface/50 rounded-2xl border border-border space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted">Active Multipliers</h3>
          <div className="space-y-4">
            {activeRules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between p-3 bg-bg/50 rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{rule.name}</p>
                    <p className="text-[10px] text-text-muted uppercase">{rule.vehicleType || 'All Vehicles'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-orange-500">x{rule.multiplier}</p>
                  <p className="text-[10px] text-text-muted">Active</p>
                </div>
              </div>
            ))}
            {activeRules.length === 0 && <div className="text-sm text-text-muted">No active pricing rules found.</div>}
          </div>
        </div>

        <div className="p-6 bg-surface/50 rounded-2xl border border-border space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted">Market Insights</h3>
          <div className="space-y-3">
            <div className="p-3 bg-bg/50 rounded-xl border border-border flex items-center gap-3">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <p className="text-xs">Dynamic pricing suggestions are available when active rules exist.</p>
            </div>
            <button
              disabled
              className="w-full py-2 bg-border text-text-muted rounded-lg text-xs font-bold cursor-not-allowed"
              title="Automated rate publishing is intentionally deferred until server-side review rules are added."
            >
              Apply AI Optimized Rates (Coming Soon)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
