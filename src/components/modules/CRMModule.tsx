import { Sparkles, Users } from 'lucide-react';
import type { AppDataState } from '@/types/domain';
import { StatCard } from './StatCard';

interface CRMModuleProps {
  customers: AppDataState['customers'];
}

export function CRMModule({ customers }: CRMModuleProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard title="Total Customers" value={customers.length} icon={<Users className="w-4 h-4" />} />
        <StatCard
          title="Loyalty Members"
          value={customers.filter((customer) => customer.loyaltyTier && customer.loyaltyTier !== 'none').length}
          icon={<Sparkles className="w-4 h-4" />}
          color="text-purple-500"
        />
      </div>

      <div role="list" aria-label="Customer CRM entries" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {customers.map((customer) => (
          <article key={customer.id} role="listitem" className="p-4 bg-surface/50 rounded-xl border border-border space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{customer.name}</h3>
              <span className="text-[10px] uppercase tracking-widest text-text-muted">
                {customer.loyaltyTier || 'Standard'}
              </span>
            </div>
            <div className="text-sm text-text-muted space-y-1">
              <p>{customer.email || 'No email'}</p>
              <p>{customer.phone || 'No phone'}</p>
              <p>Points: {customer.loyaltyPoints || 0}</p>
            </div>
          </article>
        ))}
        {customers.length === 0 && (
          <div role="status" className="p-8 text-center text-text-muted bg-surface/50 rounded-xl border border-border">
            No customers found.
          </div>
        )}
      </div>
    </div>
  );
}
