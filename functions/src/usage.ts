import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';

export type MeterableAction = 'chatMessages' | 'damageAnalyses' | 'transcriptions' | 'ttsRequests';

const ACTION_MAP: Record<string, MeterableAction> = {
  chatWithGemini: 'chatMessages',
  analyzeDamageImage: 'damageAnalyses',
  transcribeAudio: 'transcriptions',
  textToSpeech: 'ttsRequests',
};

export async function recordUsage(uid: string, functionName: string): Promise<void> {
  const action = ACTION_MAP[functionName];
  if (!action) return;

  const db = getFirestore();
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const docRef = db.doc(`usage/${uid}_${monthKey}`);

  try {
    await docRef.set(
      {
        uid,
        month: monthKey,
        [action]: FieldValue.increment(1),
        totalRequests: FieldValue.increment(1),
        lastRequestAt: Date.now(),
      },
      { merge: true },
    );
  } catch (error) {
    logger.error('Failed to record usage metric', { uid, functionName, action, error });
  }
}
