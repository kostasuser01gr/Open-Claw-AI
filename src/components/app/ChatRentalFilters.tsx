import { Trash2 } from 'lucide-react';
import { FleetFilters } from '@/components/FleetFilters';
import type { FleetFilterOptions } from '@/types/domain';

interface ChatRentalFiltersProps {
  filters: FleetFilterOptions;
  onChange: (filters: FleetFilterOptions) => void;
}

const DEFAULT_FILTERS: FleetFilterOptions = {
  carType: 'all',
  transmission: 'all',
  availability: 'all',
  maxPrice: 200,
};

export function ChatRentalFilters({ filters, onChange }: ChatRentalFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4 p-4 bg-surface/50 border-b border-border items-center">
      <FleetFilters filters={filters} setFilters={onChange} />
      <button
        onClick={() => onChange(DEFAULT_FILTERS)}
        className="ml-auto text-[10px] font-bold uppercase tracking-wider text-text-muted hover:text-orange-500 transition-colors flex items-center gap-1"
      >
        <Trash2 className="w-3 h-3" />
        Reset
      </button>
    </div>
  );
}
