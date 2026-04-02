import { ChevronRight, Menu } from 'lucide-react';
import type {
  AppDataState,
  DamageAssessment,
  FleetFilterOptions,
  NotificationType,
  ViewMode,
} from '@/types/domain';
import { AuditModule } from './AuditModule';
import { CRMModule } from './CRMModule';
import { ContractModule } from './ContractModule';
import { CorporateModule } from './CorporateModule';
import { DamageModule } from './DamageModule';
import { FleetModule } from './FleetModule';
import { KPIModule } from './KPIModule';
import { MaintenanceModule } from './MaintenanceModule';
import { OpsModule } from './OpsModule';
import { PricingModule } from './PricingModule';
import { ReservationsModule } from './ReservationsModule';
import { UserManagementModule } from './UserManagementModule';

export interface ModuleViewProps {
  type: Exclude<ViewMode, 'chat'>;
  data: AppDataState;
  filters: FleetFilterOptions;
  setFilters: (filters: FleetFilterOptions) => void;
  onClose: () => void;
  onAnalyzeDamage: (image: string) => Promise<DamageAssessment | null>;
  onNotify: (title: string, message: string, type?: NotificationType) => void;
  onOpenMobileMenu?: () => void;
}

const TITLES: Record<Exclude<ViewMode, 'chat'>, string> = {
  fleet: 'Fleet Management',
  reservations: 'Reservations',
  crm: 'Customer CRM',
  ops: 'Operations',
  kpi: 'KPI Dashboard',
  maintenance: 'Maintenance Logistics',
  damage: 'AI Damage Assessment',
  pricing: 'Dynamic Pricing',
  contracts: 'Contract Lifecycle',
  corporate: 'Corporate Portal',
  audit: 'Audit Trail',
  users: 'User Management',
};

export default function ModuleView({
  type,
  data,
  filters,
  setFilters,
  onClose,
  onAnalyzeDamage,
  onNotify,
  onOpenMobileMenu,
}: ModuleViewProps) {
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-bg">
      <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-surface/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {onOpenMobileMenu && (
            <button
              onClick={onOpenMobileMenu}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-border text-text-muted hover:text-text transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <button onClick={onClose} aria-label="Back to chat" className="p-2 hover:bg-border rounded-md text-text-muted hover:text-text transition-colors">
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          <h2 className="text-sm font-bold">{TITLES[type]}</h2>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
        {type === 'fleet' && <FleetModule vehicles={data.fleet} maintenance={data.maintenance} damageReports={data.damageReports} filters={filters} setFilters={setFilters} onNotify={onNotify} />}
        {type === 'reservations' && <ReservationsModule reservations={data.reservations} isStaff={data.isStaff} onNotify={onNotify} />}
        {type === 'crm' && <CRMModule customers={data.customers} />}
        {type === 'ops' && <OpsModule tasks={data.tasks} onNotify={onNotify} />}
        {type === 'kpi' && <KPIModule vehicles={data.fleet} reservations={data.reservations} maintenance={data.maintenance} />}
        {type === 'maintenance' && <MaintenanceModule maintenance={data.maintenance} />}
        {type === 'damage' && <DamageModule damageReports={data.damageReports} onAnalyzeDamage={onAnalyzeDamage} />}
        {type === 'pricing' && <PricingModule pricingRules={data.pricingRules} />}
        {type === 'contracts' && <ContractModule contracts={data.contracts} />}
        {type === 'corporate' && <CorporateModule />}
        {type === 'audit' && <AuditModule />}
        {type === 'users' && <UserManagementModule onNotify={onNotify} />}
      </div>
    </div>
  );
}
