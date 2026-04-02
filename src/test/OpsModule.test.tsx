import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OpsModule } from '@/components/modules/OpsModule';
import type { Task } from '@/types/domain';

const {
  addDocMock,
  collectionMock,
  docMock,
  updateDocMock,
} = vi.hoisted(() => ({
  addDocMock: vi.fn(),
  collectionMock: vi.fn(),
  docMock: vi.fn(),
  updateDocMock: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  addDoc: addDocMock,
  collection: collectionMock,
  doc: docMock,
  updateDoc: updateDocMock,
}));

vi.mock('@/firebase', () => ({
  auth: { currentUser: { uid: 'staff-1' } },
  db: {},
  handleFirestoreError: vi.fn(() => ({ userMessage: 'Request failed.' })),
  OperationType: {
    UPDATE: 'update',
    WRITE: 'write',
  },
}));

const tasks: Task[] = [
  {
    id: 'task-1',
    title: 'Prepare vehicle for pickup',
    description: 'Inspect and clean SUV.',
    status: 'pending',
    priority: 'medium',
    dueDate: '2026-03-28',
    relatedId: 'veh-1',
  },
  {
    id: 'task-2',
    title: 'Completed return checklist',
    status: 'completed',
    priority: 'low',
    dueDate: '2026-03-26',
    relatedId: 'veh-2',
  },
];

describe('OpsModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    docMock.mockImplementation((_db, collectionName: string, id: string) => ({ collectionName, id }));
    collectionMock.mockImplementation((_db, name: string) => ({ name }));
    updateDocMock.mockResolvedValue(undefined);
    addDocMock.mockResolvedValue({ id: 'inspection-1' });
  });

  it('updates task priority and notifies on success', async () => {
    const onNotify = vi.fn();
    render(<OpsModule tasks={tasks} onNotify={onNotify} />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Task priority for Prepare vehicle for pickup' }), {
      target: { value: 'high' },
    });

    await waitFor(() => {
      expect(updateDocMock).toHaveBeenCalledWith({ collectionName: 'tasks', id: 'task-1' }, { priority: 'high' });
    });

    expect(onNotify).toHaveBeenCalledWith('Task updated', 'Priority changed to high.', 'success');
  });

  it('submits an inspection checklist and completes the selected task', async () => {
    const onNotify = vi.fn();
    render(<OpsModule tasks={tasks} onNotify={onNotify} />);

    fireEvent.click(screen.getByText('Prepare vehicle for pickup'));
    expect(screen.getByText('Vehicle Inspection Checklist')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Tire pressure' }), {
      target: { value: 'Low - Needs Air' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Existing damage' }), {
      target: { value: 'Small chip on windshield' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Submit Inspection & Complete Task/i }));

    await waitFor(() => {
      expect(addDocMock).toHaveBeenCalledWith(
        { name: 'inspections' },
        expect.objectContaining({
          taskId: 'task-1',
          vehicleId: 'veh-1',
          inspectorId: 'staff-1',
          tirePressure: 'Low - Needs Air',
          existingDamage: 'Small chip on windshield',
          type: 'pre-rental',
        }),
      );
    });

    expect(updateDocMock).toHaveBeenCalledWith({ collectionName: 'tasks', id: 'task-1' }, { status: 'completed' });
    expect(onNotify).toHaveBeenCalledWith('Inspection submitted', 'Inspection completed for task Prepare vehicle for pickup.', 'success');
  });
});
