# Upgrade Log

## 2026-03-27

### P0: Baseline, security, and type safety

- Fixed package hygiene in `package.json`
  - aligned ESLint packages
  - moved build-only packages into `devDependencies`
  - added missing `react-is`
  - added Functions scripts
- Enabled stricter TypeScript settings in `tsconfig.json`
- Removed client-side Gemini secret injection from `vite.config.ts`
- Added typed runtime config in `src/config/env.ts`
- Reworked Firebase bootstrapping in `src/firebase.ts`
  - added callable Functions client
  - removed import-time probe behavior
  - standardized Firestore error envelopes
- Replaced the browser Gemini SDK usage with callable-backed `src/services/gemini.ts`
- Added a Firebase Functions workspace in `functions/`
  - `chatWithGemini`
  - `transcribeAudio`
  - `textToSpeech`
  - `analyzeDamageImage`
- Replaced unsafe dynamic Firestore writes with whitelisted `src/services/dynamicActions.ts`
- Added shared domain models in `src/types/domain.ts`
- Added normalization helpers in `src/lib/normalize.ts`
- Added workspace parsing/export service in `src/services/workspace.ts`
- Added extracted app hooks
  - `useAppData`
  - `useNotifications`
  - `useVoiceRecorder`
- Replaced the monolithic `src/App.tsx` with an orchestrator shell
- Added lazy-loaded workspace and module surfaces
  - `src/components/app/WorkspacePanel.tsx`
  - `src/components/modules/ModuleView.tsx`
- Improved accessibility in `FleetFilters` and `DynamicUI`
- Removed the email-based admin backdoor from `firestore.rules`
- Aligned `firebase-blueprint.json` with the current domain model

### Validation and quality gates

- Updated and expanded tests for:
  - app shell behavior
  - Gemini callable client
  - dynamic UI whitelist behavior
  - fleet filters
  - role-aware data gating in `useAppData`
- Added CI workflow scaffolding in `.github/workflows/ci.yml`
- Rewrote `README.md`
- Added `ARCHITECTURE.md`

### Deferred follow-ups

- Split `ModuleView.tsx` into smaller per-domain files
- Add emulator or integration tests for the Functions layer
- Further reduce the main client bundle with manual chunking and additional lazy boundaries

### Final hardening follow-up

- Moved Gemini model/persona contracts into `shared/aiContracts.ts` so the client no longer imports from the Functions source tree
- Added direct regression coverage for:
  - `DamageModule`
  - `MaintenanceModule`
- Added low-churn accessibility improvements to touched module controls
- Documented that the remaining Functions audit findings are still low-severity transitive issues without a safe non-breaking remediation path
