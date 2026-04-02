import { useState } from 'react';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AppDataState } from '@/types/domain';

interface ContractModuleProps {
  contracts: AppDataState['contracts'];
}

export function ContractModule({ contracts }: ContractModuleProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'signed' | 'expired' | 'terminated'>('all');
  const filteredContracts = contracts.filter((contract) => statusFilter === 'all' || contract.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Filter Status</p>
          <div role="group" aria-label="Filter contracts by status" className="flex flex-wrap gap-1">
              {(['all', 'draft', 'signed', 'expired', 'terminated'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  aria-pressed={statusFilter === status}
                  className={cn(
                    'px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all',
                    statusFilter === status
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                      : 'bg-surface border border-border text-text-muted hover:border-orange-500/50',
                  )}
                >
                  {status}
                </button>
              ))}
          </div>
        </div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted sm:text-right">
          Showing {filteredContracts.length} of {contracts.length}
        </div>
      </div>

      <div className="bg-surface/50 rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table aria-label="Contracts" className="min-w-[760px] w-full text-left text-sm">
          <thead className="bg-border/50 text-text-muted uppercase text-[10px] font-bold tracking-widest">
            <tr>
              <th className="px-4 py-3">Contract ID</th>
              <th className="px-4 py-3">Reservation</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Signed At</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredContracts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-muted">
                  No {statusFilter !== 'all' ? statusFilter : ''} contracts found.
                </td>
              </tr>
            ) : (
              filteredContracts.map((contract) => (
                <tr key={contract.id} className="hover:bg-border/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{contract.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-text-muted">#{contract.reservationId.slice(0, 6)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                        contract.status === 'signed'
                          ? 'bg-green-500/10 text-green-500'
                          : contract.status === 'expired' || contract.status === 'terminated'
                            ? 'bg-red-500/10 text-red-500'
                            : 'bg-border text-text-muted',
                      )}
                    >
                      {contract.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{contract.signedAt || 'N/A'}</td>
                  <td className="px-4 py-3">
                    {contract.documentUrl ? (
                      <a
                        href={contract.documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Download contract ${contract.id.slice(0, 8)}`}
                        className="inline-flex p-1.5 hover:bg-border rounded-md text-text-muted hover:text-text transition-all"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    ) : (
                      <button
                        disabled
                        aria-label="Contract document unavailable"
                        className="p-1.5 text-text-muted/50 cursor-not-allowed"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                  </td>
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
