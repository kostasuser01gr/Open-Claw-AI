import { getFirestore } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';

export interface AuditEntry {
  uid: string;
  action: string;
  collection: string;
  documentId?: string;
  details?: Record<string, unknown>;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  const db = getFirestore();

  try {
    await db.collection('audit_log').add({
      ...entry,
      timestamp: Date.now(),
    });
  } catch (error) {
    logger.error('Failed to write audit log', { entry, error });
  }
}
