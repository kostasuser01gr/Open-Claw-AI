import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

/**
 * Processes reservation lifecycle transitions based on current date:
 * - confirmed → active: when pickupDate has passed
 * - active → completed: when dropoffDate has passed
 * - pending no-show: cancel if pickupDate passed 24h ago and still pending
 * - overdue: flag active reservations 1+ day past dropoff
 * Creates prep tasks before pickup and inspection tasks after return.
 */
export async function processReservationLifecycle(): Promise<{
  activated: number;
  completed: number;
  prepTasksCreated: number;
  inspectionTasksCreated: number;
  noShowsCancelled: number;
  overduesFlagged: number;
}> {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  let activated = 0;
  let completed = 0;
  let prepTasksCreated = 0;
  let inspectionTasksCreated = 0;
  let noShowsCancelled = 0;
  let overduesFlagged = 0;

  // --- Create prep tasks for confirmed reservations arriving within 24h ---
  const tomorrowStr = new Date(now.getTime() + 86_400_000).toISOString().slice(0, 10);
  const upcomingSnapshot = await db
    .collection('reservations')
    .where('status', '==', 'confirmed')
    .where('pickupDate', '<=', tomorrowStr)
    .where('pickupDate', '>', todayStr)
    .get();

  for (const doc of upcomingSnapshot.docs) {
    const data = doc.data();
    // Check if a prep task already exists for this reservation
    const existingPrep = await db
      .collection('tasks')
      .where('relatedId', '==', doc.id)
      .where('title', '==', 'Vehicle Prep')
      .limit(1)
      .get();

    if (existingPrep.empty) {
      await db.collection('tasks').add({
        title: 'Vehicle Prep',
        description: `Prepare vehicle ${data.vehicleId ?? 'unknown'} for pickup on ${data.pickupDate}.`,
        status: 'pending',
        priority: 'high',
        relatedId: doc.id,
        dueDate: data.pickupDate,
      });
      prepTasksCreated++;
    }
  }

  // --- Activate confirmed reservations whose pickup date has arrived ---
  const confirmedSnapshot = await db
    .collection('reservations')
    .where('status', '==', 'confirmed')
    .where('pickupDate', '<=', todayStr)
    .get();

  for (const doc of confirmedSnapshot.docs) {
    const batch = db.batch();
    batch.update(doc.ref, { status: 'active' });

    const vehicleId = doc.data().vehicleId;
    if (typeof vehicleId === 'string' && vehicleId.length > 0) {
      batch.update(db.collection('vehicles').doc(vehicleId), { status: 'rented' });
    }

    await batch.commit();
    activated++;
  }

  // --- Complete active reservations whose dropoff date has passed ---
  const activeSnapshot = await db
    .collection('reservations')
    .where('status', '==', 'active')
    .where('dropoffDate', '<=', todayStr)
    .get();

  for (const doc of activeSnapshot.docs) {
    const batch = db.batch();
    batch.update(doc.ref, { status: 'completed' });

    const vehicleId = doc.data().vehicleId;
    if (typeof vehicleId === 'string' && vehicleId.length > 0) {
      // Check if another reservation starts today for this vehicle
      const nextReservation = await db
        .collection('reservations')
        .where('vehicleId', '==', vehicleId)
        .where('status', '==', 'confirmed')
        .where('pickupDate', '<=', todayStr)
        .limit(1)
        .get();

      if (nextReservation.empty) {
        batch.update(db.collection('vehicles').doc(vehicleId), { status: 'available' });
      }
    }

    await batch.commit();
    completed++;

    // Create post-return inspection task
    const existingInspection = await db
      .collection('tasks')
      .where('relatedId', '==', doc.id)
      .where('title', '==', 'Post-Return Inspection')
      .limit(1)
      .get();

    if (existingInspection.empty) {
      await db.collection('tasks').add({
        title: 'Post-Return Inspection',
        description: `Inspect vehicle ${doc.data().vehicleId ?? 'unknown'} after return from reservation ${doc.id.slice(0, 6)}.`,
        status: 'pending',
        priority: 'medium',
        relatedId: doc.id,
        dueDate: todayStr,
      });
      inspectionTasksCreated++;
    }
  }

  // --- Cancel no-shows: pending reservations where pickup was 24h+ ago ---
  const yesterdayStr = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);
  const noShowSnapshot = await db
    .collection('reservations')
    .where('status', '==', 'pending')
    .where('pickupDate', '<=', yesterdayStr)
    .get();

  for (const doc of noShowSnapshot.docs) {
    await doc.ref.update({ status: 'cancelled' });
    noShowsCancelled++;
  }

  // --- Flag overdue returns: active reservations 1+ day past dropoff ---
  const overdueSnapshot = await db
    .collection('reservations')
    .where('status', '==', 'active')
    .where('dropoffDate', '<', todayStr)
    .get();

  for (const doc of overdueSnapshot.docs) {
    const data = doc.data();
    if (!data.overdue) {
      await doc.ref.update({ overdue: true });
      overduesFlagged++;
    }
  }

  return { activated, completed, prepTasksCreated, inspectionTasksCreated, noShowsCancelled, overduesFlagged };
}
