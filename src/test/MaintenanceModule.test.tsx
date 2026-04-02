import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MaintenanceModule } from '@/components/modules/MaintenanceModule';
import type { MaintenanceRecord } from '@/types/domain';

const maintenance: MaintenanceRecord[] = [
  {
    id: 'maint-1',
    vehicleId: 'veh-1',
    type: 'inspection',
    description: 'Quarterly checkup',
    cost: 120,
    date: '2026-03-29',
  },
  {
    id: 'maint-2',
    vehicleId: 'veh-2',
    type: 'repair',
    description: 'Brake pad replacement',
    cost: 380,
    date: '2026-04-12',
  },
];

describe('MaintenanceModule', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-27T09:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows an empty state when there are no maintenance records', () => {
    render(<MaintenanceModule maintenance={[]} />);

    expect(screen.getByText('No maintenance records found.')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Maintenance records' })).toBeInTheDocument();
  });

  it('renders summary stats and maintenance rows', () => {
    render(<MaintenanceModule maintenance={maintenance} />);

    expect(screen.getByText('Active Maintenance')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('$250')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Quarterly checkup')).toBeInTheDocument();
    expect(screen.getByText('Brake pad replacement')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Maintenance records' })).toBeInTheDocument();
  });
});
