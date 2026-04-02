const DEFAULT_FUNCTIONS_REGION = 'us-central1';
const DEFAULT_FUNCTIONS_HOST = '127.0.0.1';
const DEFAULT_FUNCTIONS_PORT = 5001;

function parseBoolean(value: string | undefined): boolean {
  return value === '1' || value === 'true';
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const appEnv = {
  functionsRegion: import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || DEFAULT_FUNCTIONS_REGION,
  useFunctionsEmulator: parseBoolean(import.meta.env.VITE_USE_FIREBASE_EMULATOR),
  functionsHost: import.meta.env.VITE_FIREBASE_FUNCTIONS_HOST || DEFAULT_FUNCTIONS_HOST,
  functionsPort: parseNumber(import.meta.env.VITE_FIREBASE_FUNCTIONS_PORT, DEFAULT_FUNCTIONS_PORT),
} as const;
