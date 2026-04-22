import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  type Firestore,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  persistentSingleTabManager,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { appEnv } from './config/env';

const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DB_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

const app = initializeApp(firebaseConfig);

/**
 * Initialize Firestore with IndexedDB persistence. Prefer multi-tab cache when supported,
 * fall back to single-tab cache, and finally to the in-memory cache. Never throws — the
 * app must remain functional even if persistence fails (private-browsing, storage quota,
 * browser conflict, etc.).
 */
function initializeFirestoreWithOfflineCache(firebaseApp: FirebaseApp): Firestore {
  const databaseId = firebaseConfig.firestoreDatabaseId;
  try {
    return initializeFirestore(
      firebaseApp,
      {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      },
      databaseId,
    );
  } catch (multiTabError) {
    if (import.meta.env.DEV) {
      console.warn(
        '[firebase] Multi-tab persistent cache unavailable; falling back to single-tab.',
        multiTabError,
      );
    }
    try {
      return initializeFirestore(
        firebaseApp,
        {
          localCache: persistentLocalCache({ tabManager: persistentSingleTabManager({}) }),
        },
        databaseId,
      );
    } catch (singleTabError) {
      if (import.meta.env.DEV) {
        console.warn(
          '[firebase] Persistent cache unavailable; using in-memory cache.',
          singleTabError,
        );
      }
      return getFirestore(firebaseApp, databaseId);
    }
  }
}

export const db: Firestore = initializeFirestoreWithOfflineCache(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, appEnv.functionsRegion);
export const googleProvider = new GoogleAuthProvider();

let functionsEmulatorConnected = false;

if (typeof window !== 'undefined' && appEnv.useFunctionsEmulator && !functionsEmulatorConnected) {
  connectFunctionsEmulator(functions, appEnv.functionsHost, appEnv.functionsPort);
  functionsEmulatorConnected = true;
}

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface AppError {
  code?: string;
  operationType: OperationType;
  path: string | null;
  userMessage: string;
  debugMessage: string;
}

function getFirestoreUserMessage(code: string | undefined, operationType: OperationType): string {
  switch (code) {
    case 'permission-denied':
      return 'You do not have permission to perform that action.';
    case 'unavailable':
      return 'The data service is temporarily unavailable. Please try again.';
    case 'unauthenticated':
      return 'Please sign in again to continue.';
    default:
      return `The ${operationType} request could not be completed.`;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): AppError {
  const debugMessage = error instanceof Error ? error.message : String(error);
  const code =
    error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
      ? error.code
      : undefined;

  const appError: AppError = {
    code,
    operationType,
    path,
    userMessage: getFirestoreUserMessage(code, operationType),
    debugMessage,
  };

  if (import.meta.env.DEV) {
    console.error('Firestore error', {
      ...appError,
      uid: auth.currentUser?.uid,
    });
  }

  return appError;
}

export { serverTimestamp, Timestamp, ref, uploadBytes, getDownloadURL };
