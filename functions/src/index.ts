import { initializeApp } from 'firebase-admin/app';
import { onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { checkVehicleAvailability } from './availability';
import { callableOptions, REGION } from './gemini';
import {
  handleAnalyzeDamageImage,
  handleChatWithGemini,
  handleTextToSpeech,
  handleTranscribeAudio,
} from './handlers';
import { processReservationLifecycle } from './lifecycle';
import { processMaintenanceSchedule } from './maintenance';
import { handleCreateReservation } from './reservations';
import { handleGdprExport, handleGdprDeletion } from './gdpr';
import { handleCreateUser, handleUpdateUserRole, handleListUsers } from './userManagement';
import { handleCreateCheckoutSession } from './payments';
import { processEmailNotifications } from './notifications';

initializeApp();

export const chatWithGemini = onCall(callableOptions, handleChatWithGemini);
export const transcribeAudio = onCall(callableOptions, handleTranscribeAudio);
export const textToSpeech = onCall(callableOptions, handleTextToSpeech);
export const analyzeDamageImage = onCall(callableOptions, handleAnalyzeDamageImage);

export const createReservation = onCall(
  { region: REGION },
  handleCreateReservation,
);

export const vehicleAvailability = onCall(callableOptions, async (request) => {
  const { vehicleId, pickupDate, dropoffDate, excludeReservationId } = request.data as {
    vehicleId: string;
    pickupDate: string;
    dropoffDate: string;
    excludeReservationId?: string;
  };

  if (!vehicleId || !pickupDate || !dropoffDate) {
    return { available: false, conflictingReservationIds: [], error: 'Missing required fields.' };
  }

  return checkVehicleAvailability({ vehicleId, pickupDate, dropoffDate, excludeReservationId });
});

export const reservationLifecycle = onSchedule(
  { schedule: 'every 1 hours', region: REGION, timeoutSeconds: 120 },
  async () => {
    const result = await processReservationLifecycle();
    console.log(
      `Lifecycle: activated=${result.activated}, completed=${result.completed}, ` +
      `prep=${result.prepTasksCreated}, inspections=${result.inspectionTasksCreated}, ` +
      `noShows=${result.noShowsCancelled}, overdue=${result.overduesFlagged}`,
    );
  },
);

export const maintenanceScheduler = onSchedule(
  { schedule: 'every day 06:00', region: REGION, timeoutSeconds: 120 },
  async () => {
    const result = await processMaintenanceSchedule();
    console.log(`Maintenance: created=${result.tasksCreated} tasks`);
  },
);

// --- GDPR compliance ---
export const gdprExport = onCall({ region: REGION }, handleGdprExport);
export const gdprDeletion = onCall({ region: REGION }, handleGdprDeletion);

// --- User management (admin-only) ---
export const adminCreateUser = onCall({ region: REGION }, handleCreateUser);
export const adminUpdateUserRole = onCall({ region: REGION }, handleUpdateUserRole);
export const adminListUsers = onCall({ region: REGION }, handleListUsers);

// --- Payments ---
export const createCheckoutSession = onCall({ region: REGION }, handleCreateCheckoutSession);

// --- Email notifications (scheduled) ---
export const emailNotificationProcessor = onSchedule(
  { schedule: 'every 15 minutes', region: REGION, timeoutSeconds: 60 },
  async () => {
    const result = await processEmailNotifications();
    if (result.processed > 0) {
      console.log(`Emails: processed=${result.processed}, failed=${result.failed}`);
    }
  },
);
