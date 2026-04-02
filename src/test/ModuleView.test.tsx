import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ModuleView from '@/components/modules/ModuleView';
import type { AppDataState, FleetFilterOptions } from '@/types/domain';

vi.mock('@/firebase', () => ({
  auth: { currentUser: { uid: 'staff-1' } },
  db: {},
  storage: {},
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
  handleFirestoreError: vi.fn(() => ({ userMessage: 'Request failed.' })),
  OperationType: {
    UPDATE: 'update',
    WRITE: 'write',
  },
}));

vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  updateDoc: vi.fn(),
}));

const baseData: AppDataState = {
  userProfile: null,
  fleet: [],
  reservations: [
    {
      id: 'res-123456',
      customerId: 'cust-1',
      customerName: 'Alex Doe',
      vehicleId: 'veh-1',
      vehicleName: 'Toyota RAV4',
      pickupDate: '2026-03-28',
      dropoffDate: '2026-03-31',
      status: 'pending',
      totalPrice: 360,
    },
  ],
  customers: [],
  tasks: [],
  maintenance: [],
  damageReports: [],
  pricingRules: [
    {
      id: 'rule-1',
      name: 'Weekend multiplier',
      vehicleType: 'SUV',
      multiplier: 1.2,
      isActive: true,
    },
  ],
  contracts: [],
  isStaff: true,
};

const baseFilters: FleetFilterOptions = {
  carType: 'all',
  transmission: 'all',
  availability: 'all',
  maxPrice: 200,
};

function renderModuleView(
  overrides?: Partial<React.ComponentProps<typeof ModuleView>>,
) {
  const props: React.ComponentProps<typeof ModuleView> = {
    type: 'reservations',
    data: baseData,
    filters: baseFilters,
    setFilters: vi.fn(),
    onClose: vi.fn(),
    onAnalyzeDamage: vi.fn().mockResolvedValue(null),
    onNotify: vi.fn(),
    ...overrides,
  };

  return {
    ...render(<ModuleView {...props} />),
    props,
  };
}

describe('ModuleView', () => {
  it('renders reservation data and routes the close action', () => {
    const { props } = renderModuleView();

    expect(screen.getByRole('heading', { name: 'Reservations' })).toBeInTheDocument();
    expect(screen.getByText('Alex Doe')).toBeInTheDocument();
    expect(screen.getByText('$360')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to chat' }));
    expect(props.onClose).toHaveBeenCalled();
  });

  it('renders pricing state with an intentionally disabled publish action', () => {
    renderModuleView({ type: 'pricing' });

    expect(screen.getByText('Weekend multiplier')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Apply AI Optimized Rates/i })).toBeDisabled();
  });

  it('renders the corporate module as a read-only surface', () => {
    renderModuleView({ type: 'corporate' });

    expect(screen.getByText(/Corporate workflows are intentionally read-only/i)).toBeInTheDocument();
  });
});
