/** @vitest-environment node */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

const describeRules = process.env.FIRESTORE_EMULATOR_HOST ? describe : describe.skip;
const projectId = 'demo-open-claw-ai';

describeRules('firestore rules', () => {
  let testEnv!: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: {
        rules: readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8'),
      },
    });
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();

      await Promise.all([
        setDoc(doc(adminDb, 'users', 'customer-1'), {
          uid: 'customer-1',
          email: 'customer@example.com',
          role: 'customer',
        }),
        setDoc(doc(adminDb, 'users', 'staff-1'), {
          uid: 'staff-1',
          email: 'staff@example.com',
          role: 'staff',
        }),
        setDoc(doc(adminDb, 'tasks', 'task-1'), {
          title: 'Prep vehicle',
          status: 'pending',
          priority: 'medium',
          assignedTo: 'staff-1',
          vehicleId: 'veh-1',
        }),
      ]);
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  it('allows customers to create reservations for themselves with valid payloads', async () => {
    const customerDb = testEnv.authenticatedContext('customer-1').firestore();

    await assertSucceeds(
      setDoc(doc(customerDb, 'reservations', 'res-1'), {
        customerId: 'customer-1',
        vehicleId: 'veh-1',
        pickupDate: '2026-03-27T10:00:00Z',
        dropoffDate: '2026-03-30T10:00:00Z',
        status: 'pending',
        createdAt: '2026-03-20T10:00:00Z',
      }),
    );
  });

  it('rejects customer reservation writes for another user or invalid payloads', async () => {
    const customerDb = testEnv.authenticatedContext('customer-1').firestore();

    await assertFails(
      setDoc(doc(customerDb, 'reservations', 'res-2'), {
        customerId: 'customer-2',
        vehicleId: 'veh-1',
        pickupDate: '2026-03-27T10:00:00Z',
        dropoffDate: '2026-03-30T10:00:00Z',
        status: 'pending',
      }),
    );

    await assertFails(
      setDoc(doc(customerDb, 'reservations', 'res-3'), {
        customerId: 'customer-1',
        pickupDate: '2026-03-27T10:00:00Z',
        dropoffDate: '2026-03-30T10:00:00Z',
        status: 'pending',
      }),
    );
  });

  it('allows staff inspections with matching inspector identity and rejects customer inspection writes', async () => {
    const staffDb = testEnv.authenticatedContext('staff-1').firestore();
    const customerDb = testEnv.authenticatedContext('customer-1').firestore();

    await assertSucceeds(
      setDoc(doc(staffDb, 'inspections', 'insp-1'), {
        taskId: 'task-1',
        vehicleId: 'veh-1',
        inspectorId: 'staff-1',
        type: 'pre-rental',
        tirePressure: 'Normal',
        fluidLevels: 'Full',
        interiorCleanliness: 'Clean',
        existingDamage: 'None',
        createdAt: '2026-03-27T10:00:00Z',
      }),
    );

    await assertFails(
      setDoc(doc(customerDb, 'inspections', 'insp-2'), {
        taskId: 'task-1',
        vehicleId: 'veh-1',
        inspectorId: 'customer-1',
        type: 'pre-rental',
        createdAt: '2026-03-27T10:00:00Z',
      }),
    );
  });

  it('allows staff task updates and rejects invalid task state transitions', async () => {
    const staffDb = testEnv.authenticatedContext('staff-1').firestore();

    await assertSucceeds(updateDoc(doc(staffDb, 'tasks', 'task-1'), { priority: 'high', status: 'completed' }));
    await assertFails(updateDoc(doc(staffDb, 'tasks', 'task-1'), { priority: 'urgent' }));
  });
});
