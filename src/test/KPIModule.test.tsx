import { act, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { KPIModule } from '@/components/modules/KPIModule';
import type { MaintenanceRecord, Reservation, Vehicle } from '@/types/domain';

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');

  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-responsive-container">{children}</div>,
  };
});

const vehicles: Vehicle[] = [
  {
    id: 'veh-1',
    make: 'Toyota',
    model: 'Corolla',
    type: 'sedan',
    transmission: 'automatic',
    status: 'rented',
    dailyRate: 75,
    photoUrls: [],
    images: [],
    name: 'Toyota Corolla',
  },
  {
    id: 'veh-2',
    make: 'Nissan',
    model: 'Qashqai',
    type: 'suv',
    transmission: 'automatic',
    status: 'maintenance',
    dailyRate: 110,
    photoUrls: [],
    images: [],
    name: 'Nissan Qashqai',
  },
];

const reservations: Reservation[] = [
  {
    id: 'res-1',
    customerId: 'cust-1',
    vehicleId: 'veh-1',
    pickupDate: '2026-03-28',
    dropoffDate: '2026-03-31',
    status: 'active',
    totalPrice: 300,
  },
];

const maintenance: MaintenanceRecord[] = [
  {
    id: 'maint-1',
    vehicleId: 'veh-2',
    type: 'inspection',
    cost: 180,
    date: '2026-03-29',
  },
];

describe('KPIModule', () => {
  it('renders summary stats and labeled chart regions', () => {
    render(<KPIModule vehicles={vehicles} reservations={reservations} maintenance={maintenance} />);

    const utilizationCard = screen.getByText('Avg Utilization').parentElement;
    const bookingCard = screen.getByText('Avg Booking Value').parentElement;
    const downtimeCard = screen.getByText('Fleet Downtime').parentElement;

    expect(utilizationCard).not.toBeNull();
    expect(bookingCard).not.toBeNull();
    expect(downtimeCard).not.toBeNull();

    expect(within(utilizationCard as HTMLElement).getByText('50%')).toBeInTheDocument();
    expect(within(bookingCard as HTMLElement).getByText('$300')).toBeInTheDocument();
    expect(within(downtimeCard as HTMLElement).getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('Operations Overview')).toBeInTheDocument();
    expect(screen.getByLabelText('Operations overview chart')).toBeInTheDocument();
    expect(screen.getByLabelText('Fleet status mix chart')).toBeInTheDocument();
    expect(screen.getByLabelText('Trend line chart')).toBeInTheDocument();
  });

  it('renders zero-state summary values without crashing', () => {
    render(<KPIModule vehicles={[]} reservations={[]} maintenance={[]} />);

    const utilizationCard = screen.getByText('Avg Utilization').parentElement;
    const bookingCard = screen.getByText('Avg Booking Value').parentElement;

    expect(utilizationCard).not.toBeNull();
    expect(bookingCard).not.toBeNull();
    expect(within(utilizationCard as HTMLElement).getByText('0%')).toBeInTheDocument();
    expect(within(bookingCard as HTMLElement).getByText('$0')).toBeInTheDocument();
    expect(screen.getByText('Active Rentals')).toBeInTheDocument();
  });

  it('waits for measurable chart space before mounting chart applications', () => {
    const originalResizeObserver = globalThis.ResizeObserver;
    const rectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect');
    const observers: Array<() => void> = [];
    let width = 0;
    let height = 0;

    class MockResizeObserver {
      private readonly callback: ResizeObserverCallback;

      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
        observers.push(() => this.callback([], this as unknown as ResizeObserver));
      }

      observe() {}

      disconnect() {}

      unobserve() {}
    }

    globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
    rectSpy.mockImplementation(() => ({
      width,
      height,
      top: 0,
      left: 0,
      right: width,
      bottom: height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }));

    try {
      render(<KPIModule vehicles={vehicles} reservations={reservations} maintenance={maintenance} />);

      expect(screen.queryAllByRole('application')).toHaveLength(0);

      width = 640;
      height = 300;

      act(() => {
        observers.forEach((notify) => notify());
      });

      expect(screen.getAllByRole('application')).toHaveLength(3);
    } finally {
      rectSpy.mockRestore();
      globalThis.ResizeObserver = originalResizeObserver;
    }
  });
});
