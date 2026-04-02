import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppData } from '@/hooks/useAppData';

const {
  firestoreState,
  collectionMock,
  docMock,
  limitMock,
  onSnapshotMock,
  orderByMock,
  queryMock,
  whereMock,
  handleFirestoreErrorMock,
} = vi.hoisted(() => ({
  firestoreState: {
    role: 'customer' as 'customer' | 'manager',
    vehicles: [
      {
        id: 'veh-1',
        data: {
          make: 'Tesla',
          model: 'Model 3',
          type: 'sedan',
          transmission: 'automatic',
          status: 'available',
          dailyRate: 120,
          photoUrls: [],
        },
      },
    ],
    reservations: [
      {
        id: 'res-1',
        data: {
          customerId: 'user-123',
          vehicleId: 'veh-1',
          pickupDate: '2026-03-27',
          dropoffDate: '2026-03-30',
          status: 'pending',
          totalPrice: 360,
        },
      },
    ],
    customers: [
      {
        id: 'cust-1',
        data: {
          name: 'Ada Lovelace',
          email: 'ada@example.com',
        },
      },
    ],
    tasks: [
      {
        id: 'task-1',
        data: {
          title: 'Prep vehicle',
          status: 'pending',
          priority: 'high',
        },
      },
    ],
    maintenance: [
      {
        id: 'maint-1',
        data: {
          vehicleId: 'veh-1',
          type: 'routine',
          cost: 120,
          date: '2026-03-28',
        },
      },
    ],
    damageReports: [
      {
        id: 'damage-1',
        data: {
          vehicleId: 'veh-1',
          severity: 'medium',
          description: 'Scratch',
          estimatedRepairCost: 200,
          createdAt: '2026-03-27T10:00:00Z',
        },
      },
    ],
    pricingRules: [
      {
        id: 'price-1',
        data: {
          name: 'Weekend uplift',
          multiplier: 1.2,
          isActive: true,
        },
      },
    ],
    contracts: [
      {
        id: 'contract-1',
        data: {
          reservationId: 'res-1',
          customerId: 'user-123',
          status: 'signed',
        },
      },
    ],
  },
  collectionMock: vi.fn((_db: unknown, name: string) => ({ kind: 'collection', name })),
  docMock: vi.fn((_db: unknown, collectionName: string, id: string) => ({
    kind: 'doc',
    path: `${collectionName}/${id}`,
  })),
  limitMock: vi.fn((value: number) => ({ type: 'limit', value })),
  onSnapshotMock: vi.fn(),
  orderByMock: vi.fn((field: string, direction: string) => ({ type: 'orderBy', field, direction })),
  queryMock: vi.fn((source: unknown, ...constraints: unknown[]) => ({ kind: 'query', source, constraints })),
  whereMock: vi.fn((field: string, operator: string, value: string) => ({
    type: 'where',
    field,
    operator,
    value,
  })),
  handleFirestoreErrorMock: vi.fn((error: unknown) => ({
    userMessage: error instanceof Error ? error.message : 'safe error',
  })),
}));

function createDoc(id: string, data: Record<string, unknown>) {
  return {
    id,
    data: () => data,
  };
}

vi.mock('firebase/firestore', () => ({
  collection: collectionMock,
  doc: docMock,
  limit: limitMock,
  onSnapshot: onSnapshotMock,
  orderBy: orderByMock,
  query: queryMock,
  where: whereMock,
}));

vi.mock('@/firebase', () => ({
  db: {},
  handleFirestoreError: handleFirestoreErrorMock,
  OperationType: {
    GET: 'get',
    LIST: 'list',
  },
}));

describe('useAppData', () => {
  const mockUser = {
    uid: 'user-123',
    email: 'test@example.com',
    displayName: 'Test User',
  } as never;

  beforeEach(() => {
    vi.clearAllMocks();

    onSnapshotMock.mockImplementation((target: { kind: string; path?: string; source?: { name: string } }, onNext: (snapshot: unknown) => void) => {
      if (target.kind === 'doc' && target.path === 'users/user-123') {
        onNext({
          exists: () => true,
          id: 'user-123',
          data: () => ({
            uid: 'user-123',
            email: 'test@example.com',
            displayName: 'Test User',
            role: firestoreState.role,
          }),
        });
        return vi.fn();
      }

      const collectionName = target.kind === 'query' && target.source && 'name' in target.source ? target.source.name : '';
      const docsByCollection: Record<string, Array<{ id: string; data: Record<string, unknown> }>> = {
        vehicles: firestoreState.vehicles,
        reservations: firestoreState.reservations,
        customers: firestoreState.customers,
        tasks: firestoreState.tasks,
        maintenance: firestoreState.maintenance,
        damage_reports: firestoreState.damageReports,
        pricing_rules: firestoreState.pricingRules,
        contracts: firestoreState.contracts,
      };

      onNext({
        docs: (docsByCollection[collectionName] || []).map((entry) => createDoc(entry.id, entry.data)),
      });

      return vi.fn();
    });
  });

  it('gates privileged collections for customer users', async () => {
    firestoreState.role = 'customer';
    const addNotification = vi.fn();

    const { result } = renderHook(() => useAppData(mockUser, addNotification));

    await waitFor(() => {
      expect(result.current.userProfile?.role).toBe('customer');
    });

    expect(result.current.isStaff).toBe(false);
    expect(result.current.fleet).toHaveLength(1);
    expect(result.current.reservations).toHaveLength(1);
    expect(result.current.customers).toEqual([]);
    expect(result.current.tasks).toEqual([]);
    expect(result.current.maintenance).toEqual([]);
    expect(result.current.damageReports).toEqual([]);
    expect(result.current.pricingRules).toEqual([]);
    expect(result.current.contracts).toEqual([]);
    expect(whereMock).toHaveBeenCalledWith('customerId', '==', 'user-123');
  });

  it('subscribes staff users to operational collections', async () => {
    firestoreState.role = 'manager';
    const addNotification = vi.fn();

    const { result } = renderHook(() => useAppData(mockUser, addNotification));

    await waitFor(() => {
      expect(result.current.isStaff).toBe(true);
    });

    expect(result.current.customers).toHaveLength(1);
    expect(result.current.tasks[0]?.priority).toBe('high');
    expect(result.current.maintenance).toHaveLength(1);
    expect(result.current.damageReports).toHaveLength(1);
    expect(result.current.pricingRules).toHaveLength(1);
    expect(result.current.contracts).toHaveLength(1);
  });
});
