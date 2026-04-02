import type { ReactNode } from 'react';
import { Calendar, Car, ClipboardList, FileText, Layout, Sparkles, TrendingUp, Users, Wrench, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import type { UserRole, ViewMode } from '@/types/domain';
import type { QuickPromptOptions } from './chatTypes';

interface ChatEmptyStateProps {
  onQuickPrompt: (prompt: string, options?: QuickPromptOptions) => void;
  onViewModeChange: (viewMode: ViewMode) => void;
  userRole?: UserRole;
}

interface QuickActionProps {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

function QuickAction({ icon, title, description, onClick }: Readonly<QuickActionProps>) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start p-5 sm:p-6 rounded-[20px] bg-surface border border-border hover:border-orange-500/30 hover:bg-bg transition-all duration-200 text-left group shadow-lg hover:shadow-xl hover:-translate-y-0.5 h-full"
    >
      <div className="mb-3 sm:mb-4 p-2 rounded-xl bg-border/30 group-hover:bg-orange-500/10 transition-colors duration-200">{icon}</div>
      <h3 className="font-semibold text-sm sm:text-base mb-1">{title}</h3>
      <p className="text-xs sm:text-sm text-text-muted leading-relaxed">{description}</p>
    </button>
  );
}

function getQuickActions(
  role: UserRole,
  onQuickPrompt: ChatEmptyStateProps['onQuickPrompt'],
  onViewModeChange: ChatEmptyStateProps['onViewModeChange'],
): QuickActionProps[] {
  const common: QuickActionProps[] = [
    {
      icon: <Car className="w-5 h-5 text-orange-500" />,
      title: 'Find Rentals',
      description: 'Search near your location',
      onClick: () =>
        onQuickPrompt('Find car rental locations near me and show available SUV models in a visual gallery.', {
          persona: 'rentalAgent',
          useMaps: true,
        }),
    },
  ];

  if (role === 'customer' || role === 'driver') {
    return [
      ...common,
      { icon: <Calendar className="w-5 h-5 text-blue-500" />, title: 'My Reservations', description: 'View your bookings', onClick: () => onViewModeChange('reservations') },
      { icon: <FileText className="w-5 h-5 text-green-500" />, title: 'Contracts', description: 'Your agreements', onClick: () => onViewModeChange('contracts') },
    ];
  }

  if (role === 'staff') {
    return [
      ...common,
      { icon: <ClipboardList className="w-5 h-5 text-blue-500" />, title: 'Operations', description: 'Pending tasks & ops', onClick: () => onViewModeChange('ops') },
      { icon: <Wrench className="w-5 h-5 text-yellow-500" />, title: 'Maintenance', description: 'Fleet health status', onClick: () => onViewModeChange('maintenance') },
      { icon: <Sparkles className="w-5 h-5 text-purple-500" />, title: 'AI Damage Check', description: 'Scan vehicle for damage', onClick: () => onViewModeChange('damage') },
      { icon: <Layout className="w-5 h-5 text-indigo-500" />, title: 'Fleet Management', description: 'Full inventory control', onClick: () => onViewModeChange('fleet') },
      { icon: <Calendar className="w-5 h-5 text-teal-500" />, title: 'Reservations', description: 'Manage bookings', onClick: () => onViewModeChange('reservations') },
    ];
  }

  // admin & manager
  return [
    ...common,
    { icon: <TrendingUp className="w-5 h-5 text-red-500" />, title: 'KPI Dashboard', description: 'Real-time analytics', onClick: () => onViewModeChange('kpi') },
    { icon: <Users className="w-5 h-5 text-cyan-500" />, title: 'Customer CRM', description: 'Manage relationships', onClick: () => onViewModeChange('crm') },
    { icon: <Zap className="w-5 h-5 text-yellow-500" />, title: 'Pricing Insights', description: 'AI optimized rates', onClick: () => onViewModeChange('pricing') },
    { icon: <ClipboardList className="w-5 h-5 text-blue-500" />, title: 'Operations', description: 'Pending tasks & ops', onClick: () => onViewModeChange('ops') },
    { icon: <Sparkles className="w-5 h-5 text-purple-500" />, title: 'AI Damage Check', description: 'Scan vehicle for damage', onClick: () => onViewModeChange('damage') },
  ];
}

export function ChatEmptyState({ onQuickPrompt, onViewModeChange, userRole = 'customer' }: Readonly<ChatEmptyStateProps>) {
  const actions = getQuickActions(userRole, onQuickPrompt, onViewModeChange);

  return (
    <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-8 sm:space-y-12 px-2">
      <div className="space-y-4 sm:space-y-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-orange-500 to-red-600 mx-auto flex items-center justify-center shadow-2xl shadow-orange-500/20"
        >
          <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
        </motion.div>
        <div className="space-y-2">
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tighter bg-gradient-to-b from-text to-text-muted bg-clip-text text-transparent">
            Open Claw AI
          </h2>
          <p className="text-text-muted text-base sm:text-xl font-medium">The next generation of adaptive intelligence.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 w-full">
        {actions.map((action) => (
          <QuickAction key={action.title} {...action} />
        ))}
      </div>
    </div>
  );
}
