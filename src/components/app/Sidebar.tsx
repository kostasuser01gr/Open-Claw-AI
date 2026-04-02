import type { ReactNode } from 'react';
import {
  Bot,
  Brain,
  Calendar,
  Car,
  ClipboardList,
  Code,
  FileText,
  Layout,
  LineChart,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  Palette,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { HelpTooltip } from '@/components/app/HelpTooltip';
import type { CanvasState, PersonaType, ProjectFile, ThemeMode, UserRole, ViewMode } from '@/types/domain';
import type { Conversation } from '@/hooks/useConversations';

type NavItem = { view: ViewMode; icon: ReactNode; label: string; roles: UserRole[] };

const STAFF_ROLES: UserRole[] = ['admin', 'manager', 'staff'];
const ALL_ROLES: UserRole[] = ['admin', 'manager', 'staff', 'driver', 'customer'];

const NAV_ITEMS: NavItem[] = [
  { view: 'chat', icon: <Bot className="w-4 h-4" />, label: 'AI Workstation', roles: ALL_ROLES },
  { view: 'fleet', icon: <Car className="w-4 h-4" />, label: 'Fleet Management', roles: ALL_ROLES },
  { view: 'reservations', icon: <Calendar className="w-4 h-4" />, label: 'Reservations', roles: ALL_ROLES },
  { view: 'crm', icon: <Users className="w-4 h-4" />, label: 'Customer CRM', roles: STAFF_ROLES },
  { view: 'ops', icon: <ClipboardList className="w-4 h-4" />, label: 'Operations', roles: STAFF_ROLES },
  { view: 'kpi', icon: <TrendingUp className="w-4 h-4" />, label: 'KPI Dashboard', roles: ['admin', 'manager'] },
  { view: 'audit', icon: <Shield className="w-4 h-4" />, label: 'Audit Trail', roles: ['admin'] },
];

const LOGISTICS_ITEMS: NavItem[] = [
  { view: 'maintenance', icon: <Wrench className="w-4 h-4" />, label: 'Maintenance', roles: STAFF_ROLES },
  { view: 'damage', icon: <Sparkles className="w-4 h-4" />, label: 'AI Damage Assessment', roles: STAFF_ROLES },
  { view: 'pricing', icon: <Zap className="w-4 h-4" />, label: 'Dynamic Pricing', roles: ['admin', 'manager'] },
  { view: 'contracts', icon: <FileText className="w-4 h-4" />, label: 'Contracts', roles: [...STAFF_ROLES, 'customer'] },
];

function filterByRole(items: NavItem[], role: UserRole): NavItem[] {
  return items.filter((item) => item.roles.includes(role));
}

interface SidebarProps {
  user: {
    displayName?: string | null;
    email?: string | null;
  } | null;
  userRole: UserRole;
  viewMode: ViewMode;
  onViewModeChange: (viewMode: ViewMode) => void;
  persona: PersonaType;
  onPersonaChange: (persona: PersonaType) => void;
  highThinking: boolean;
  onToggleHighThinking: () => void;
  isLiteMode: boolean;
  onToggleLiteMode: () => void;
  useSearch: boolean;
  onToggleSearch: () => void;
  useMaps: boolean;
  onToggleMaps: () => void;
  files: ProjectFile[];
  canvas: CanvasState;
  onSelectFile: (fileId: string) => void;
  onResetProject: () => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onLogin: () => void;
  onLogout: () => void;
  onClearConversation: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onLoadConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onNewConversation: () => void;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

function NavButton({
  active,
  onClick,
  icon,
  label,
}: Readonly<{
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}>) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium',
        active
          ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-sm shadow-orange-500/5'
          : 'text-text-muted hover:text-text hover:bg-border/50 border border-transparent',
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function Toggle({
  active,
  onClick,
  icon,
  label,
  description,
  help,
}: Readonly<{
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  description: string;
  help?: string;
}>) {
  return (
    <div className="relative">
      <button
        onClick={onClick}
        aria-pressed={active}
        className={cn(
          'w-full p-3 rounded-xl border transition-all flex items-center justify-between gap-3',
          active ? 'border-orange-500/30 bg-orange-500/10 text-orange-500' : 'border-border bg-bg/40 text-text-muted',
        )}
      >
        <div className="flex items-center gap-3 text-left">
          <div className={cn('p-2 rounded-lg', active ? 'bg-orange-500/10' : 'bg-border/50')}>{icon}</div>
          <div>
            <div className="text-sm font-semibold flex items-center gap-1.5">
              {label}
              {help && <HelpTooltip content={help} />}
            </div>
            <div className="text-[10px] uppercase tracking-widest">{description}</div>
          </div>
        </div>
        <div
          className={cn(
            'w-10 h-6 rounded-full relative transition-colors',
            active ? 'bg-orange-500' : 'bg-border',
          )}
        >
          <div
            className={cn(
              'w-4 h-4 rounded-full bg-white absolute top-1 transition-transform',
              active ? 'translate-x-5' : 'translate-x-1',
            )}
          />
        </div>
      </button>
    </div>
  );
}

export function MobileMenuButton({ onClick }: Readonly<{ onClick: () => void }>) {
  return (
    <button
      onClick={onClick}
      aria-label="Open navigation menu"
      className="lg:hidden p-2 rounded-lg hover:bg-border text-text-muted hover:text-text transition-colors"
    >
      <Menu className="w-5 h-5" />
    </button>
  );
}

export function Sidebar({
  user,
  userRole,
  viewMode,
  onViewModeChange,
  persona,
  onPersonaChange,
  highThinking,
  onToggleHighThinking,
  isLiteMode,
  onToggleLiteMode,
  useSearch,
  onToggleSearch,
  useMaps,
  onToggleMaps,
  files,
  canvas,
  onSelectFile,
  onResetProject,
  theme,
  onThemeChange,
  onLogin,
  onLogout,
  onClearConversation,
  conversations,
  activeConversationId,
  onLoadConversation,
  onDeleteConversation,
  onNewConversation,
  mobileOpen = false,
  onMobileOpenChange,
}: SidebarProps) {
  const closeMobile = () => onMobileOpenChange?.(false);

  const handleNav = (view: ViewMode) => {
    onViewModeChange(view);
    closeMobile();
  };

  const sidebarContent = (
    <>
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-semibold text-lg tracking-tight">Open Claw</h1>
        </div>
        <button
          onClick={closeMobile}
          aria-label="Close menu"
          className="lg:hidden p-2 rounded-lg hover:bg-border text-text-muted hover:text-text transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-5">
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-widest text-text-muted/70 font-bold px-2">Navigation</p>
          <div className="grid grid-cols-1 gap-1.5">
            {filterByRole(NAV_ITEMS, userRole).map((item) => (
              <NavButton key={item.view} active={viewMode === item.view} onClick={() => handleNav(item.view)} icon={item.icon} label={item.label} />
            ))}
          </div>
        </div>

        {filterByRole(LOGISTICS_ITEMS, userRole).length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-widest text-text-muted/70 font-bold px-2">Logistics & AI</p>
          <div className="grid grid-cols-1 gap-1.5">
            {filterByRole(LOGISTICS_ITEMS, userRole).map((item) => (
              <NavButton key={item.view} active={viewMode === item.view} onClick={() => handleNav(item.view)} icon={item.icon} label={item.label} />
            ))}
          </div>
        </div>
        )}

        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-widest text-text-muted/70 font-bold px-2">Personas</p>
          <div className="grid grid-cols-1 gap-1.5">
            <NavButton active={persona === 'general'} onClick={() => onPersonaChange('general')} icon={<Layout className="w-4 h-4" />} label="General" />
            <NavButton active={persona === 'coder'} onClick={() => onPersonaChange('coder')} icon={<Code className="w-4 h-4" />} label="Developer" />
            <NavButton active={persona === 'strategist'} onClick={() => onPersonaChange('strategist')} icon={<Brain className="w-4 h-4" />} label="Strategist" />
            <NavButton active={persona === 'creative'} onClick={() => onPersonaChange('creative')} icon={<Palette className="w-4 h-4" />} label="Creative" />
            <NavButton active={persona === 'analyst'} onClick={() => onPersonaChange('analyst')} icon={<LineChart className="w-4 h-4" />} label="Analyst" />
            <NavButton active={persona === 'rentalAgent'} onClick={() => onPersonaChange('rentalAgent')} icon={<Car className="w-4 h-4" />} label="Rental Agent" />
          </div>
        </div>

        <div className="space-y-2.5">
          <p className="text-[10px] uppercase tracking-widest text-text-muted/70 font-bold px-2">Capabilities</p>
          <Toggle active={highThinking} onClick={onToggleHighThinking} icon={<Brain className="w-4 h-4" />} label="High Thinking" description="Deep reasoning" help="Uses an advanced model with extended reasoning. Produces more thorough answers but takes longer." />
          <Toggle active={isLiteMode} onClick={onToggleLiteMode} icon={<Zap className="w-4 h-4" />} label="Lite Mode" description="Fast responses" help="Switches to a lightweight model for faster, lower-cost replies. Best for simple questions." />
          <Toggle active={useSearch} onClick={onToggleSearch} icon={<Search className="w-4 h-4" />} label="Google Search" description="Live web data" help="Enables real-time web search grounding. Answers include citations from live search results." />
          <Toggle active={useMaps} onClick={onToggleMaps} icon={<MapPin className="w-4 h-4" />} label="Google Maps" description="Location data" help="Enables Google Maps grounding for location-aware answers with map links and directions." />
        </div>

        <div className="flex items-center justify-between px-2">
          <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold">Conversations</p>
          <button
            onClick={onNewConversation}
            aria-label="New conversation"
            className="p-1 hover:bg-border rounded-md text-text-muted hover:text-orange-500 transition-colors"
            title="New Conversation"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {conversations.length > 0 && (
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm group',
                  activeConversationId === conv.id
                    ? 'bg-orange-500/10 text-orange-500'
                    : 'text-text-muted hover:bg-border hover:text-text',
                )}
              >
                <button
                  onClick={() => onLoadConversation(conv.id)}
                  className="flex items-center gap-2 flex-1 min-w-0 text-left"
                >
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{conv.title}</span>
                </button>
                <button
                  onClick={() => onDeleteConversation(conv.id)}
                  className="p-0.5 rounded hover:bg-border text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                  aria-label="Delete conversation"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between px-2">
          <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold">Project Workspace</p>
          <button
            onClick={onResetProject}
            aria-label="Reset project workspace"
            className="p-1 hover:bg-border rounded-md text-text-muted hover:text-red-500 transition-colors"
            title="New Project"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {files.length > 0 && (
          <div className="space-y-1">
            {files.map((file) => (
              <button
                key={file.id}
                onClick={() => onSelectFile(file.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm group',
                  canvas.activeFileId === file.id ? 'bg-orange-500/10 text-orange-500' : 'text-text-muted hover:bg-border hover:text-text',
                )}
              >
                {file.type === 'code' && <Code className="w-4 h-4" />}
                {file.type === 'document' && <FileText className="w-4 h-4" />}
                {file.type === 'data' && <LineChart className="w-4 h-4" />}
                {file.type === 'gallery' && <Car className="w-4 h-4" />}
                {file.type === 'kpi' && <TrendingUp className="w-4 h-4" />}
                <span className="truncate flex-1 text-left">{file.title}</span>
              </button>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold px-2">Theme</p>
          <div className="flex gap-2 px-2">
            {(['dark', 'light', 'sepia'] as ThemeMode[]).map((themeOption) => (
              <button
                key={themeOption}
                onClick={() => onThemeChange(themeOption)}
                aria-pressed={theme === themeOption}
                className={cn(
                  'flex-1 h-8 rounded-md border text-[10px] font-bold uppercase tracking-wider transition-all',
                  theme === themeOption ? 'bg-orange-500 border-orange-500 text-white' : 'border-border text-text-muted hover:bg-border',
                )}
              >
                {themeOption}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-border space-y-2">
        {user ? (
          <div className="flex items-center gap-3 px-3 py-2 bg-bg rounded-lg border border-border">
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-xs">
              {user.displayName?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">{user.displayName || 'User'}</p>
              <p className="text-[10px] text-text-muted truncate">{user.email}</p>
            </div>
            <button
              onClick={onLogout}
              aria-label="Sign out"
              className="p-1.5 hover:bg-border rounded-md text-text-muted hover:text-red-500 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onLogin}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
          >
            <LogIn className="w-4 h-4" />
            Sign In with Google
          </button>
        )}
        <button
          onClick={onClearConversation}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-border transition-colors text-sm text-text-muted"
        >
          <Trash2 className="w-4 h-4" />
          Clear Conversation
        </button>
        <div className="px-3 text-[10px] text-text-muted uppercase tracking-widest flex items-center gap-2">
          <ShieldCheck className="w-3 h-3" />
          Hardened client mode
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="w-72 border-r border-border flex-col bg-surface hidden lg:flex shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile drawer overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/60"
            >
              <button
                type="button"
                className="absolute inset-0 w-full h-full cursor-default"
                aria-label="Close menu"
                onClick={closeMobile}
              />
            </motion.div>
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute inset-y-0 left-0 w-72 flex flex-col bg-surface border-r border-border shadow-2xl"
            >
              {sidebarContent}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
