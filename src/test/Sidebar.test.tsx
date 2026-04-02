import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Sidebar } from '@/components/app/Sidebar';
import type { CanvasState, PersonaType, ProjectFile, ThemeMode, UserRole, ViewMode } from '@/types/domain';
import type { Conversation } from '@/hooks/useConversations';

const files: ProjectFile[] = [
  {
    id: 'doc-1',
    type: 'document',
    title: 'Ops Summary',
    content: '# Ops Summary',
    createdAt: '2026-03-27T09:00:00Z',
  },
  {
    id: 'code-1',
    type: 'code',
    title: 'pricing.ts',
    content: 'export const price = 100;',
    createdAt: '2026-03-27T09:05:00Z',
  },
];

function renderSidebar(overrides?: Partial<{
  user: { displayName?: string | null; email?: string | null } | null;
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
  userRole: UserRole;
  conversations: Conversation[];
  activeConversationId: string | null;
  onLoadConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onNewConversation: () => void;
}>) {
  const props = {
    user: null,
    userRole: 'admin' as UserRole,
    viewMode: 'chat' as ViewMode,
    onViewModeChange: vi.fn(),
    persona: 'general' as PersonaType,
    onPersonaChange: vi.fn(),
    highThinking: true,
    onToggleHighThinking: vi.fn(),
    isLiteMode: false,
    onToggleLiteMode: vi.fn(),
    useSearch: true,
    onToggleSearch: vi.fn(),
    useMaps: false,
    onToggleMaps: vi.fn(),
    files,
    canvas: {
      isOpen: true,
      activeFileId: 'doc-1',
    } satisfies CanvasState,
    onSelectFile: vi.fn(),
    onResetProject: vi.fn(),
    theme: 'dark' as ThemeMode,
    onThemeChange: vi.fn(),
    onLogin: vi.fn(),
    onLogout: vi.fn(),
    onClearConversation: vi.fn(),
    conversations: [],
    activeConversationId: null,
    onLoadConversation: vi.fn(),
    onDeleteConversation: vi.fn(),
    onNewConversation: vi.fn(),
    ...overrides,
  };

  return {
    ...render(<Sidebar {...props} />),
    props,
  };
}

describe('Sidebar', () => {
  const navTargets = [
    ['AI Workstation', 'chat'],
    ['Fleet Management', 'fleet'],
    ['Reservations', 'reservations'],
    ['Customer CRM', 'crm'],
    ['Operations', 'ops'],
    ['KPI Dashboard', 'kpi'],
    ['Maintenance', 'maintenance'],
    ['AI Damage Assessment', 'damage'],
    ['Dynamic Pricing', 'pricing'],
    ['Contracts', 'contracts'],
  ] as const;
  const personaTargets = [
    ['General', 'general'],
    ['Developer', 'coder'],
    ['Strategist', 'strategist'],
    ['Creative', 'creative'],
    ['Analyst', 'analyst'],
    ['Rental Agent', 'rentalAgent'],
  ] as const;

  it('routes navigation actions across all sidebar modules', () => {
    const { props } = renderSidebar();
    const sidebar = screen.getByRole('complementary');

    navTargets.forEach(([label]) => fireEvent.click(within(sidebar).getByRole('button', { name: label })));

    navTargets.forEach(([, viewMode]) => {
      expect(props.onViewModeChange).toHaveBeenCalledWith(viewMode);
    });
  });

  it('routes persona and capability actions while preserving toggle semantics', () => {
    const { props } = renderSidebar();
    const sidebar = screen.getByRole('complementary');

    personaTargets.forEach(([label]) => fireEvent.click(within(sidebar).getByRole('button', { name: label })));
    personaTargets.forEach(([, persona]) => {
      expect(props.onPersonaChange).toHaveBeenCalledWith(persona);
    });

    fireEvent.click(within(sidebar).getByRole('button', { name: /High Thinking/i }));
    fireEvent.click(within(sidebar).getByRole('button', { name: /Lite Mode/i }));
    fireEvent.click(within(sidebar).getByRole('button', { name: /Google Search/i }));
    fireEvent.click(within(sidebar).getByRole('button', { name: /Google Maps/i }));

    expect(props.onToggleHighThinking).toHaveBeenCalled();
    expect(props.onToggleLiteMode).toHaveBeenCalled();
    expect(props.onToggleSearch).toHaveBeenCalled();
    expect(props.onToggleMaps).toHaveBeenCalled();
    expect(within(sidebar).getByRole('button', { name: /High Thinking/i })).toHaveAttribute('aria-pressed', 'true');
    expect(within(sidebar).getByRole('button', { name: /Lite Mode/i })).toHaveAttribute('aria-pressed', 'false');
    expect(within(sidebar).getByRole('button', { name: 'dark' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('routes workspace, theme, and guest account actions', () => {
    const { props } = renderSidebar();
    const sidebar = screen.getByRole('complementary');

    fireEvent.click(within(sidebar).getByRole('button', { name: 'pricing.ts' }));
    fireEvent.click(within(sidebar).getByRole('button', { name: 'Reset project workspace' }));
    fireEvent.click(within(sidebar).getByRole('button', { name: 'light' }));
    fireEvent.click(within(sidebar).getByRole('button', { name: 'Sign In with Google' }));
    fireEvent.click(within(sidebar).getByRole('button', { name: 'Clear Conversation' }));

    expect(props.onSelectFile).toHaveBeenCalledWith('code-1');
    expect(props.onResetProject).toHaveBeenCalled();
    expect(props.onThemeChange).toHaveBeenCalledWith('light');
    expect(props.onLogin).toHaveBeenCalled();
    expect(props.onClearConversation).toHaveBeenCalled();
  });

  it('shows authenticated account info and a named logout control', () => {
    const { props } = renderSidebar({
      user: {
        displayName: 'Kostas User',
        email: 'kostas@example.com',
      },
    });

    expect(screen.getByText('Kostas User')).toBeInTheDocument();
    expect(screen.getByText('kostas@example.com')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(props.onLogout).toHaveBeenCalled();
  });
});
