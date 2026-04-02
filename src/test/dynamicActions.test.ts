import { describe, expect, it, vi, beforeEach } from 'vitest';
import { executeDynamicAction, submitDynamicForm } from '@/services/dynamicActions';

const { addDocMock, collectionMock, handleFirestoreErrorMock } = vi.hoisted(() => ({
  addDocMock: vi.fn(),
  collectionMock: vi.fn(),
  handleFirestoreErrorMock: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  addDoc: addDocMock,
  collection: collectionMock,
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  query: vi.fn((...args: unknown[]) => args),
  limit: vi.fn(),
}));

vi.mock('@/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'user-123',
    },
  },
  db: {},
  handleFirestoreError: handleFirestoreErrorMock,
  OperationType: {
    CREATE: 'create',
    LIST: 'list',
  },
}));

vi.mock('@/services/ical', () => ({
  generateIcalFeed: vi.fn().mockReturnValue('BEGIN:VCALENDAR\nEND:VCALENDAR'),
  downloadIcalFile: vi.fn(),
}));

vi.mock('@/lib/normalize', () => ({
  normalizeReservation: vi.fn((id: string, data: unknown) => ({ id, ...(data as object) })),
}));

describe('dynamicActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    collectionMock.mockImplementation((_db: unknown, name: string) => ({ name }));
    addDocMock.mockResolvedValue({ id: 'doc-1' });
    handleFirestoreErrorMock.mockReturnValue({ userMessage: 'A safe Firestore error.' });
  });

  it('rejects unsupported dynamic collections', async () => {
    await expect(submitDynamicForm('users', { name: 'bad' })).rejects.toThrow(
      'Unsupported dynamic collection: users',
    );
  });

  it('submits reservations with sanitized, authenticated payloads', async () => {
    const message = await submitDynamicForm('reservations', {
      customerId: 'ignored-user',
      vehicleId: 'veh-42',
      pickupDate: '2026-03-27',
      dropoffDate: '2026-03-30',
      status: 'confirmed',
      notes: 'Airport pickup',
    });

    expect(collectionMock).toHaveBeenCalledWith({}, 'reservations');
    expect(addDocMock).toHaveBeenCalledWith(
      { name: 'reservations' },
      expect.objectContaining({
        customerId: 'user-123',
        vehicleId: 'veh-42',
        pickupDate: '2026-03-27',
        dropoffDate: '2026-03-30',
        status: 'confirmed',
        notes: 'Airport pickup',
      }),
    );
    expect(message).toBe('Successfully submitted reservation details for vehicle veh-42.');
  });

  it('submits inspections with enforced inspector identity and defaults', async () => {
    const message = await submitDynamicForm('inspections', {
      taskId: 'task-9',
      vehicleId: 'veh-42',
    });

    expect(addDocMock).toHaveBeenCalledWith(
      { name: 'inspections' },
      expect.objectContaining({
        taskId: 'task-9',
        vehicleId: 'veh-42',
        inspectorId: 'user-123',
        type: 'pre-rental',
        tirePressure: 'Normal',
        fluidLevels: 'Full',
        interiorCleanliness: 'Clean',
        existingDamage: 'None',
      }),
    );
    expect(message).toBe('Successfully submitted inspection for vehicle veh-42.');
  });

  it('surfaces safe Firestore errors', async () => {
    addDocMock.mockRejectedValueOnce(new Error('permission-denied'));

    await expect(submitDynamicForm('reservations', { vehicleId: 'veh-42' })).rejects.toThrow(
      'A safe Firestore error.',
    );
    expect(handleFirestoreErrorMock).toHaveBeenCalled();
  });

  it('executes the supported UI actions only', async () => {
    await expect(executeDynamicAction('send_message', 'Hello')).resolves.toBe('Hello');
    await expect(executeDynamicAction('sync_ical')).resolves.toBe(
      'Successfully exported 0 reservations as iCal file.',
    );
    await expect(executeDynamicAction('create_doc')).rejects.toThrow('Unsupported dynamic action: create_doc');
  });
});
