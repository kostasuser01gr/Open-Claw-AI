import { addDoc, collection, getDocs, query, limit } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '@/firebase';
import { generateIcalFeed, downloadIcalFile } from '@/services/ical';
import type { Reservation } from '@/types/domain';
import { normalizeReservation } from '@/lib/normalize';

export const SUPPORTED_DYNAMIC_COLLECTIONS = ['inspections', 'reservations'] as const;
export type SupportedDynamicCollection = (typeof SUPPORTED_DYNAMIC_COLLECTIONS)[number];

function isSupportedDynamicCollection(value: string): value is SupportedDynamicCollection {
  return SUPPORTED_DYNAMIC_COLLECTIONS.includes(value as SupportedDynamicCollection);
}

function sanitizeString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function buildReservationPayload(formData: Record<string, unknown>) {
  return {
    customerId: auth.currentUser?.uid ?? sanitizeString(formData.customerId) ?? '',
    vehicleId: sanitizeString(formData.vehicleId) ?? '',
    pickupDate: sanitizeString(formData.pickupDate) ?? '',
    dropoffDate: sanitizeString(formData.dropoffDate) ?? '',
    status: sanitizeString(formData.status) ?? 'pending',
    notes: sanitizeString(formData.notes),
    createdAt: new Date().toISOString(),
  };
}

function buildInspectionPayload(formData: Record<string, unknown>) {
  return {
    taskId: sanitizeString(formData.taskId) ?? '',
    vehicleId: sanitizeString(formData.vehicleId) ?? '',
    inspectorId: auth.currentUser?.uid ?? '',
    type: sanitizeString(formData.type) ?? 'pre-rental',
    tirePressure: sanitizeString(formData.tirePressure) ?? 'Normal',
    fluidLevels: sanitizeString(formData.fluidLevels) ?? 'Full',
    interiorCleanliness: sanitizeString(formData.interiorCleanliness) ?? 'Clean',
    existingDamage: sanitizeString(formData.existingDamage) ?? 'None',
    createdAt: new Date().toISOString(),
  };
}

export async function submitDynamicForm(collectionName: string, formData: Record<string, unknown>): Promise<string> {
  if (!isSupportedDynamicCollection(collectionName)) {
    throw new Error(`Unsupported dynamic collection: ${collectionName}`);
  }

  try {
    const payload =
      collectionName === 'reservations' ? buildReservationPayload(formData) : buildInspectionPayload(formData);

    await addDoc(collection(db, collectionName), payload);

    return collectionName === 'reservations'
      ? `Successfully submitted reservation details for vehicle ${payload.vehicleId}.`
      : `Successfully submitted inspection for vehicle ${payload.vehicleId}.`;
  } catch (error) {
    const appError = handleFirestoreError(error, OperationType.CREATE, collectionName);
    throw new Error(appError.userMessage);
  }
}

export async function executeDynamicAction(action: string, message?: string): Promise<string> {
  if (action === 'send_message' && message) {
    return message;
  }

  if (action === 'sync_ical') {
    try {
      const snap = await getDocs(query(collection(db, 'reservations'), limit(200)));
      const reservations: Reservation[] = snap.docs.map((doc) => normalizeReservation(doc.id, doc.data()));
      const icalContent = generateIcalFeed(reservations);
      downloadIcalFile(icalContent);
      return `Successfully exported ${reservations.length} reservations as iCal file.`;
    } catch (error) {
      const appError = handleFirestoreError(error, OperationType.LIST, 'reservations');
      throw new Error(appError.userMessage);
    }
  }

  throw new Error(`Unsupported dynamic action: ${action}`);
}
