import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore();

/**
 * Checks all vehicles with a nextServiceDue date and creates
 * maintenance tasks for vehicles that are due or overdue.
 */
export async function processMaintenanceSchedule(): Promise<{ tasksCreated: number }> {
  const todayStr = new Date().toISOString().slice(0, 10);
  let tasksCreated = 0;

  // Find maintenance records where nextServiceDue <= today
  const dueSnapshot = await db
    .collection('maintenance')
    .where('nextServiceDue', '<=', todayStr)
    .get();

  for (const maintenanceDoc of dueSnapshot.docs) {
    const data = maintenanceDoc.data();
    const vehicleId = data.vehicleId;

    if (typeof vehicleId !== 'string' || vehicleId.length === 0) continue;

    // Check if a pending/in-progress maintenance task already exists for this vehicle
    const existingTask = await db
      .collection('tasks')
      .where('relatedId', '==', vehicleId)
      .where('status', 'in', ['pending', 'in-progress'])
      .limit(1)
      .get();

    if (!existingTask.empty) continue;

    // Create a new maintenance task
    const taskRef = db.collection('tasks').doc();
    await taskRef.set({
      id: taskRef.id,
      title: `Scheduled maintenance: ${data.type || 'General service'}`,
      description: `Auto-generated maintenance task for vehicle ${vehicleId}. Last service: ${data.date || 'unknown'}. Type: ${data.type || 'routine'}.`,
      assignedTo: '',
      status: 'pending',
      priority: 'medium',
      dueDate: todayStr,
      relatedId: vehicleId,
      createdAt: FieldValue.serverTimestamp(),
    });

    tasksCreated++;
  }

  return { tasksCreated };
}
