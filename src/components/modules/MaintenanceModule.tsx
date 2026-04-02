import { Clock, TrendingUp, Wrench } from 'lucide-react';
import type { MaintenanceRecord } from '@/types/domain';
import { StatCard } from './StatCard';

interface MaintenanceModuleProps {
  maintenance: MaintenanceRecord[];
}

export function MaintenanceModule({ maintenance }: MaintenanceModuleProps) {
  const avgCost =
    maintenance.length === 0 ? 0 : Math.round(maintenance.reduce((sum, entry) => sum + entry.cost, 0) / maintenance.length);
  const nextSevenDays = maintenance.filter((entry) => {
    const date = new Date(entry.date);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 7);
    return date <= cutoff;
  }).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Active Maintenance" value={maintenance.length} icon={<Wrench className="w-4 h-4" />} />
        <StatCard title="Avg Cost" value={`$${avgCost}`} icon={<TrendingUp className="w-4 h-4" />} color="text-red-500" />
        <StatCard title="Next 7 Days" value={nextSevenDays} icon={<Clock className="w-4 h-4" />} color="text-blue-500" />
      </div>

      <div className="bg-surface/50 rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table aria-label="Maintenance records" className="min-w-[720px] w-full text-left text-sm">
          <thead className="bg-border/50 text-text-muted uppercase text-[10px] font-bold tracking-widest">
            <tr>
              <th className="px-4 py-3">Vehicle ID</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Cost</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {maintenance.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-muted">
                  No maintenance records found.
                </td>
              </tr>
            ) : (
              maintenance.map((entry) => (
                <tr key={entry.id} className="hover:bg-border/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{entry.vehicleId}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full bg-border text-[10px] font-bold uppercase">{entry.type}</span>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{entry.description || 'No description'}</td>
                  <td className="px-4 py-3 font-bold">${entry.cost}</td>
                  <td className="px-4 py-3 text-text-muted">{entry.date}</td>
                </tr>
              ))
            )}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
