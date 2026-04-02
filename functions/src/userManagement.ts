import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { requireAuth, toRecord } from './request';
import { writeAuditLog } from './audit';
import type { CreateUserRequest, UpdateUserRoleRequest } from './types';

const db = getFirestore();
const VALID_ROLES = new Set(['admin', 'manager', 'staff', 'driver', 'customer']);

async function requireAdmin(uid: string): Promise<void> {
  const userSnap = await db.collection('users').doc(uid).get();
  if (!userSnap.exists || userSnap.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Admin access required.');
  }
}

export async function handleCreateUser(
  request: CallableRequest<unknown>,
): Promise<{ uid: string }> {
  const uid = requireAuth(request.auth);
  await requireAdmin(uid);

  const data = toRecord(request.data) as unknown as CreateUserRequest;

  if (!data.email || typeof data.email !== 'string') {
    throw new HttpsError('invalid-argument', 'Valid email is required.');
  }
  if (!data.displayName || typeof data.displayName !== 'string') {
    throw new HttpsError('invalid-argument', 'Display name is required.');
  }
  if (!data.role || !VALID_ROLES.has(data.role)) {
    throw new HttpsError('invalid-argument', 'Valid role is required.');
  }

  // Check for duplicate email
  const existing = await db.collection('users').where('email', '==', data.email).limit(1).get();
  if (!existing.empty) {
    throw new HttpsError('already-exists', 'A user with this email already exists.');
  }

  try {
    // Create a user document (Firebase Auth user creation requires Admin SDK auth)
    // Here we create the Firestore profile; Auth user is created on first sign-in
    const userRef = db.collection('users').doc();
    await userRef.set({
      uid: userRef.id,
      email: data.email,
      displayName: data.displayName,
      role: data.role,
      branchId: data.branchId ?? '',
      createdAt: new Date().toISOString(),
    });

    await writeAuditLog({
      uid,
      action: 'create_user',
      collection: 'users',
      documentId: userRef.id,
      details: { email: data.email, role: data.role },
    });

    logger.info('User created by admin', { adminUid: uid, newUserUid: userRef.id });
    return { uid: userRef.id };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('User creation failed', { uid, error });
    throw new HttpsError('internal', 'Failed to create user.');
  }
}

export async function handleUpdateUserRole(
  request: CallableRequest<unknown>,
): Promise<{ success: boolean }> {
  const uid = requireAuth(request.auth);
  await requireAdmin(uid);

  const data = toRecord(request.data) as unknown as UpdateUserRoleRequest;

  if (!data.targetUid || typeof data.targetUid !== 'string') {
    throw new HttpsError('invalid-argument', 'Target user ID is required.');
  }
  if (!data.role || !VALID_ROLES.has(data.role)) {
    throw new HttpsError('invalid-argument', 'Valid role is required.');
  }

  // Prevent self-demotion
  if (data.targetUid === uid && data.role !== 'admin') {
    throw new HttpsError('failed-precondition', 'Cannot change your own admin role.');
  }

  try {
    const userRef = db.collection('users').doc(data.targetUid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      throw new HttpsError('not-found', 'User not found.');
    }

    const oldRole = userSnap.data()?.role;
    await userRef.update({ role: data.role });

    await writeAuditLog({
      uid,
      action: 'update_user_role',
      collection: 'users',
      documentId: data.targetUid,
      details: { oldRole, newRole: data.role },
    });

    logger.info('User role updated', { adminUid: uid, targetUid: data.targetUid, role: data.role });
    return { success: true };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('Role update failed', { uid, error });
    throw new HttpsError('internal', 'Failed to update user role.');
  }
}

export async function handleListUsers(
  request: CallableRequest<unknown>,
): Promise<{ users: Record<string, unknown>[] }> {
  const uid = requireAuth(request.auth);
  await requireAdmin(uid);

  try {
    const snap = await db.collection('users').orderBy('createdAt', 'desc').limit(200).get();
    const users = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return { users };
  } catch (error) {
    logger.error('List users failed', { uid, error });
    throw new HttpsError('internal', 'Failed to list users.');
  }
}
