import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { requireAuth } from './request';
import { writeAuditLog } from './audit';
import type { GdprExportResult, GdprDeletionResult } from './types';

const db = getFirestore();

const USER_DATA_COLLECTIONS = [
  { name: 'reservations', field: 'customerId' },
  { name: 'conversations', field: 'uid' },
  { name: 'damage_reports', field: 'customerId' },
  { name: 'contracts', field: 'customerId' },
  { name: 'payments', field: 'customerId' },
] as const;

export async function handleGdprExport(
  request: CallableRequest<unknown>,
): Promise<GdprExportResult> {
  const uid = requireAuth(request.auth);

  try {
    // Fetch user profile
    const profileSnap = await db.collection('users').doc(uid).get();
    const profile = profileSnap.exists ? profileSnap.data()! : {};

    // Fetch data from all user collections
    const results: GdprExportResult = {
      profile,
      reservations: [],
      conversations: [],
      damageReports: [],
    };

    for (const col of USER_DATA_COLLECTIONS) {
      const snap = await db.collection(col.name).where(col.field, '==', uid).get();
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      if (col.name === 'reservations') results.reservations = docs;
      else if (col.name === 'conversations') results.conversations = docs;
      else if (col.name === 'damage_reports') results.damageReports = docs;
    }

    await writeAuditLog({ uid, action: 'gdpr_export', collection: 'users', details: {} });
    await db.collection('gdpr_requests').add({
      uid,
      type: 'export',
      status: 'completed',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    });

    logger.info('GDPR data export completed', { uid });
    return results;
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('GDPR export failed', { uid, error });
    throw new HttpsError('internal', 'Data export failed. Please try again.');
  }
}

export async function handleGdprDeletion(
  request: CallableRequest<unknown>,
): Promise<GdprDeletionResult> {
  const uid = requireAuth(request.auth);

  try {
    let deletedDocumentCount = 0;
    const deletedCollections: string[] = [];

    // Record the request before deletion starts
    await db.collection('gdpr_requests').add({
      uid,
      type: 'deletion',
      status: 'processing',
      createdAt: new Date().toISOString(),
    });

    // Delete from all user data collections
    for (const col of USER_DATA_COLLECTIONS) {
      const snap = await db.collection(col.name).where(col.field, '==', uid).get();
      if (snap.empty) continue;

      const batch = db.batch();
      for (const doc of snap.docs) {
        batch.delete(doc.ref);
        deletedDocumentCount++;
      }
      await batch.commit();
      deletedCollections.push(col.name);
    }

    // Delete rate limits and usage
    for (const prefix of ['rate_limits', 'usage']) {
      const snap = await db.collection(prefix).where('uid', '==', uid).get();
      if (!snap.empty) {
        const batch = db.batch();
        for (const doc of snap.docs) {
          batch.delete(doc.ref);
          deletedDocumentCount++;
        }
        await batch.commit();
        deletedCollections.push(prefix);
      }
    }

    // Anonymize user profile (keep audit trail intact)
    await db.collection('users').doc(uid).update({
      email: '[deleted]',
      displayName: '[deleted]',
    });
    deletedDocumentCount++;
    deletedCollections.push('users');

    await writeAuditLog({
      uid,
      action: 'gdpr_deletion',
      collection: 'users',
      details: { deletedCollections, deletedDocumentCount },
    });

    logger.info('GDPR data deletion completed', { uid, deletedDocumentCount });
    return { deletedCollections, deletedDocumentCount };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('GDPR deletion failed', { uid, error });
    throw new HttpsError('internal', 'Data deletion failed. Please contact support.');
  }
}
