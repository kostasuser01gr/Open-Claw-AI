/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_FUNCTIONS_REGION?: string;
  readonly VITE_USE_FIREBASE_EMULATOR?: string;
  readonly VITE_FIREBASE_FUNCTIONS_HOST?: string;
  readonly VITE_FIREBASE_FUNCTIONS_PORT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
