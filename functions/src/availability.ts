import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export interface AvailabilityRequest {
  vehicleId: string;
  pickupDate: string;
  dropoffDate: string;
  excludeReservationId?: string;
}

export interface AvailabilityResult {
  available: boolean;
  conflictingReservationIds: string[];
}

/**
 * Checks whether a vehicle is available for the given date range.
 * Returns conflicts if the vehicle is already booked.
 */
export async function checkVehicleAvailability(
  req: AvailabilityRequest,
): Promise<AvailabilityResult> {
  const { vehicleId, pickupDate, dropoffDate, excludeReservationId } = req;

  // Find reservations for this vehicle that overlap with the requested range.
  // Two date ranges [A, B] and [C, D] overlap when A < D and C < B.
  const snapshot = await db
    .collection('reservations')
    .where('vehicleId', '==', vehicleId)
    .where('status', 'in', ['pending', 'confirmed', 'active'])
    .get();

  const conflictingReservationIds: string[] = [];

  for (const doc of snapshot.docs) {
    if (excludeReservationId && doc.id === excludeReservationId) continue;

    const data = doc.data();
    const existingPickup = data.pickupDate as string;
    const existingDropoff = data.dropoffDate as string;

    // Overlap check
    if (pickupDate < existingDropoff && existingPickup < dropoffDate) {
      conflictingReservationIds.push(doc.id);
    }
  }

  return {
    available: conflictingReservationIds.length === 0,
    conflictingReservationIds,
  };
}
