import type { ReactNode } from 'react';
import {
  Bot,
  Calendar,
  Car,
  ClipboardList,
  Code,
  Download,
  FileText,
  Layout,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { PersonaType, ViewMode } from '@/types/domain';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (viewMode: ViewMode) => void;
  onClearConversation: () => void;
  onExportProject: () => void;
  onOpenProjectDashboard: () => void;
  onSwitchPersona: (persona: PersonaType) => void;
}

const NAVIGATION_ITEMS: Array<{
  icon: ReactNode;
  label: string;
  viewMode: ViewMode;
}> = [
  { icon: <Bot />, label: 'AI Workstation', viewMode: 'chat' },
  { icon: <Car />, label: 'Fleet Management', viewMode: 'fleet' },
  { icon: <Calendar />, label: 'Reservations', viewMode: 'reservations' },
  { icon: <Users />, label: 'Customer CRM', viewMode: 'crm' },
  { icon: <ClipboardList />, label: 'Operations', viewMode: 'ops' },
  { icon: <TrendingUp />, label: 'KPI Dashboard', viewMode: 'kpi' },
  { icon: <Wrench />, label: 'Maintenance', viewMode: 'maintenance' },
  { icon: <Sparkles />, label: 'AI Damage Assessment', viewMode: 'damage' },
  { icon: <Zap />, label: 'Dynamic Pricing', viewMode: 'pricing' },
  { icon: <FileText />, label: 'Contracts', viewMode: 'contracts' },
];

function CommandItem({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm text-text-muted hover:bg-border hover:text-text">
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onClearConversation,
  onExportProject,
  onOpenProjectDashboard,
  onSwitchPersona,
}: CommandPaletteProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-bg/40 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="w-full max-w-xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-border flex items-center gap-3">
              <Search className="w-5 h-5 text-text-muted" />
              <input
                autoFocus
                placeholder="Search commands, personas, files..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm"
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    onClose();
                  }
                }}
              />
              <button onClick={onClose} aria-label="Close command palette" className="text-text-muted hover:text-text">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 max-h-[400px] overflow-y-auto">
              <div className="px-3 py-2 text-[10px] font-bold text-text-muted uppercase tracking-widest">Navigation</div>
              {NAVIGATION_ITEMS.map((item) => (
                <CommandItem
                  key={item.viewMode}
                  icon={item.icon}
                  label={item.label}
                  onClick={() => {
                    onNavigate(item.viewMode);
                    onClose();
                  }}
                />
              ))}

              <div className="px-3 py-2 text-[10px] font-bold text-text-muted uppercase tracking-widest">Actions</div>
              <CommandItem icon={<Trash2 />} label="Clear Conversation" onClick={() => { onClearConversation(); onClose(); }} />
              <CommandItem icon={<Download />} label="Export Project (ZIP)" onClick={() => { onExportProject(); onClose(); }} />
              <CommandItem icon={<Layout />} label="Project Dashboard" onClick={() => { onOpenProjectDashboard(); onClose(); }} />

              <div className="px-3 py-2 mt-2 text-[10px] font-bold text-text-muted uppercase tracking-widest">Personas</div>
              <CommandItem icon={<Layout />} label="Switch to General" onClick={() => { onSwitchPersona('general'); onClose(); }} />
              <CommandItem icon={<Code />} label="Switch to Developer" onClick={() => { onSwitchPersona('coder'); onClose(); }} />
              <CommandItem icon={<Car />} label="Switch to Rental Agent" onClick={() => { onSwitchPersona('rentalAgent'); onClose(); }} />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
