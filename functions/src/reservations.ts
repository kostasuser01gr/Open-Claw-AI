import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { requireAuth, toRecord } from './request';
import { writeAuditLog } from './audit';
import type { BookingRule, CreateReservationRequest, CreateReservationResult } from './types';

const db = getFirestore();

function parseDate(dateStr: string): Date {
  const d = new Date(dateStr + 'T00:00:00Z');
  if (isNaN(d.getTime())) throw new HttpsError('invalid-argument', `Invalid date: ${dateStr}`);
  return d;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

async function getActiveBookingRule(): Promise<Omit<BookingRule, 'id'>> {
  const snap = await db.collection('booking_rules').where('isActive', '==', true).limit(1).get();
  if (snap.empty) {
    // Return sensible defaults when no rule is configured
    return {
      minDurationDays: 1,
      maxDurationDays: 90,
      minAdvanceHours: 2,
      maxAdvanceDays: 365,
      allowSameDayPickup: true,
      blockedDates: [],
      isActive: true,
    };
  }
  return snap.docs[0].data() as Omit<BookingRule, 'id'>;
}

function validateBookingRules(
  rule: Omit<BookingRule, 'id'>,
  pickupDate: Date,
  dropoffDate: Date,
  now: Date,
): void {
  const durationDays = daysBetween(pickupDate, dropoffDate);
  if (durationDays < rule.minDurationDays) {
    throw new HttpsError('invalid-argument', `Minimum rental duration is ${rule.minDurationDays} day(s).`);
  }
  if (durationDays > rule.maxDurationDays) {
    throw new HttpsError('invalid-argument', `Maximum rental duration is ${rule.maxDurationDays} days.`);
  }

  const hoursUntilPickup = (pickupDate.getTime() - now.getTime()) / 3_600_000;
  if (hoursUntilPickup < rule.minAdvanceHours) {
    throw new HttpsError('invalid-argument', `Reservations must be made at least ${rule.minAdvanceHours} hour(s) in advance.`);
  }

  const daysUntilPickup = daysBetween(now, pickupDate);
  if (daysUntilPickup > rule.maxAdvanceDays) {
    throw new HttpsError('invalid-argument', `Reservations cannot be made more than ${rule.maxAdvanceDays} days in advance.`);
  }

  if (!rule.allowSameDayPickup) {
    const todayStr = now.toISOString().slice(0, 10);
    const pickupStr = pickupDate.toISOString().slice(0, 10);
    if (pickupStr === todayStr) {
      throw new HttpsError('invalid-argument', 'Same-day pickups are not allowed.');
    }
  }

  // Check blocked dates
  const blockedSet = new Set(rule.blockedDates ?? []);
  const current = new Date(pickupDate);
  while (current <= dropoffDate) {
    const dateStr = current.toISOString().slice(0, 10);
    if (blockedSet.has(dateStr)) {
      throw new HttpsError('invalid-argument', `Date ${dateStr} is blocked for reservations.`);
    }
    current.setDate(current.getDate() + 1);
  }
}

export async function handleCreateReservation(
  request: CallableRequest<unknown>,
): Promise<CreateReservationResult> {
  const uid = requireAuth(request.auth);
  const data = toRecord(request.data) as unknown as CreateReservationRequest;

  // Input validation
  if (!data.vehicleId || typeof data.vehicleId !== 'string') {
    throw new HttpsError('invalid-argument', 'vehicleId is required.');
  }
  if (!data.pickupDate || typeof data.pickupDate !== 'string') {
    throw new HttpsError('invalid-argument', 'pickupDate is required (YYYY-MM-DD).');
  }
  if (!data.dropoffDate || typeof data.dropoffDate !== 'string') {
    throw new HttpsError('invalid-argument', 'dropoffDate is required (YYYY-MM-DD).');
  }

  const pickupDate = parseDate(data.pickupDate);
  const dropoffDate = parseDate(data.dropoffDate);
  const now = new Date();

  if (pickupDate >= dropoffDate) {
    throw new HttpsError('invalid-argument', 'Dropoff date must be after pickup date.');
  }
  if (pickupDate < new Date(now.toISOString().slice(0, 10) + 'T00:00:00Z')) {
    throw new HttpsError('invalid-argument', 'Pickup date cannot be in the past.');
  }

  // Validate booking rules
  const rule = await getActiveBookingRule();
  validateBookingRules(rule, pickupDate, dropoffDate, now);

  // Transactional reservation creation
  const reservationRef = db.collection('reservations').doc();

  try {
    await db.runTransaction(async (tx) => {
      // 1. Verify vehicle exists and is available
      const vehicleRef = db.collection('vehicles').doc(data.vehicleId);
      const vehicleSnap = await tx.get(vehicleRef);
      if (!vehicleSnap.exists) {
        throw new HttpsError('not-found', 'Vehicle not found.');
      }
      const vehicle = vehicleSnap.data()!;
      if (vehicle.status === 'maintenance' || vehicle.status === 'incident') {
        throw new HttpsError('failed-precondition', `Vehicle is currently in ${vehicle.status} and cannot be reserved.`);
      }

      // 2. Check for conflicting reservations
      const conflictSnap = await db
        .collection('reservations')
        .where('vehicleId', '==', data.vehicleId)
        .where('status', 'in', ['pending', 'confirmed', 'active'])
        .get();

      for (const doc of conflictSnap.docs) {
        const existing = doc.data();
        if (data.pickupDate < existing.dropoffDate && existing.pickupDate < data.dropoffDate) {
          throw new HttpsError(
            'already-exists',
            'Vehicle is already booked for the requested dates.',
          );
        }
      }

      // 3. Fetch customer info
      const userSnap = await tx.get(db.collection('users').doc(uid));
      const userName = userSnap.exists ? (userSnap.data()?.displayName ?? '') : '';

      // 4. Calculate total price
      const durationDays = daysBetween(pickupDate, dropoffDate);
      const dailyRate = typeof vehicle.dailyRate === 'number' ? vehicle.dailyRate : 0;
      const totalPrice = dailyRate * durationDays;

      // 5. Create reservation
      tx.set(reservationRef, {
        id: reservationRef.id,
        customerId: uid,
        customerName: userName,
        vehicleId: data.vehicleId,
        vehicleName: `${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim(),
        pickupDate: data.pickupDate,
        dropoffDate: data.dropoffDate,
        status: 'pending',
        totalPrice,
        notes: data.notes ?? '',
        createdAt: new Date().toISOString(),
      });
    });

    await writeAuditLog({
      uid,
      action: 'create_reservation',
      collection: 'reservations',
      documentId: reservationRef.id,
      details: {
        vehicleId: data.vehicleId,
        pickupDate: data.pickupDate,
        dropoffDate: data.dropoffDate,
      },
    });

    logger.info('Reservation created', { uid, reservationId: reservationRef.id });
    return { reservationId: reservationRef.id, status: 'pending' };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('Transaction failed during reservation creation', { uid, error });
    throw new HttpsError('internal', 'Failed to create reservation. Please try again.');
  }
}
