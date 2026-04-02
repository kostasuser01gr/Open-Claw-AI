import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CommandPalette } from '@/components/app/CommandPalette';

describe('CommandPalette', () => {
  it('renders navigation actions and routes to the selected module', () => {
    const onClose = vi.fn();
    const onNavigate = vi.fn();

    render(
      <CommandPalette
        isOpen
        onClose={onClose}
        onNavigate={onNavigate}
        onClearConversation={vi.fn()}
        onExportProject={vi.fn()}
        onOpenProjectDashboard={vi.fn()}
        onSwitchPersona={vi.fn()}
      />,
    );

    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reservations' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Contracts' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reservations' }));

    expect(onNavigate).toHaveBeenCalledWith('reservations');
    expect(onClose).toHaveBeenCalled();
  });

  it('exposes an accessible close action', () => {
    const onClose = vi.fn();

    render(
      <CommandPalette
        isOpen
        onClose={onClose}
        onNavigate={vi.fn()}
        onClearConversation={vi.fn()}
        onExportProject={vi.fn()}
        onOpenProjectDashboard={vi.fn()}
        onSwitchPersona={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close command palette' }));
    expect(onClose).toHaveBeenCalled();
  });
});
