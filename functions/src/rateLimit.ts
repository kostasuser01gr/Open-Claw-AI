import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';

const RATE_LIMITS: Record<string, { maxRequests: number; windowMs: number }> = {
  chatWithGemini: { maxRequests: 60, windowMs: 3600_000 },
  transcribeAudio: { maxRequests: 30, windowMs: 3600_000 },
  textToSpeech: { maxRequests: 30, windowMs: 3600_000 },
  analyzeDamageImage: { maxRequests: 20, windowMs: 3600_000 },
};

export async function enforceRateLimit(uid: string, functionName: string): Promise<void> {
  const config = RATE_LIMITS[functionName];
  if (!config) return;

  const db = getFirestore();
  const windowStart = Date.now() - config.windowMs;
  const docRef = db.doc(`rate_limits/${uid}_${functionName}`);

  try {
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      const data = snap.data() as { timestamps: number[] } | undefined;

      const recent = (data?.timestamps ?? []).filter((t) => t > windowStart);

      if (recent.length >= config.maxRequests) {
        return { allowed: false, count: recent.length };
      }

      recent.push(Date.now());
      tx.set(docRef, { timestamps: recent, uid, functionName, updatedAt: Date.now() });
      return { allowed: true, count: recent.length };
    });

    if (!result.allowed) {
      logger.warn('Rate limit exceeded', { uid, functionName, count: result.count });
      throw new HttpsError(
        'resource-exhausted',
        `Rate limit exceeded. Maximum ${config.maxRequests} requests per hour for ${functionName}.`,
      );
    }
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('Rate limit check failed, allowing request', { uid, functionName, error });
  }
}
