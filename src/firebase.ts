import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, serverTimestamp, Timestamp } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';
import { appEnv } from './config/env';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
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
