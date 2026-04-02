# Architecture

## System Overview

Open Claw AI is a client-heavy operations console backed by Firebase Auth, Firestore, Storage, and Firebase HTTPS callable Functions.

### Client

- `src/App.tsx`
  - Owns auth state, view switching, conversation state, project workspace state, and app-wide notifications.
  - Delegates Firestore data access to `useAppData`.
  - Delegates microphone capture and cleanup to `useVoiceRecorder`.
  - Delegates Gemini requests to the callable-backed `GeminiService`.
- `src/components/app`
  - `Sidebar.tsx`: navigation, persona selection, capability toggles, theme, auth controls.
  - `ChatView.tsx`: chat transcript, quick actions, markdown rendering, dynamic UI rendering, media input.
  - `WorkspacePanel.tsx`: generated artifact viewer/editor for document, code, data, gallery, and KPI files.
  - `CommandPalette.tsx`: keyboard-driven quick commands.
  - `NotificationStack.tsx`: transient in-app alerts.
- `src/components/modules/ModuleView.tsx`
  - Fleet, reservations, CRM, operations, KPI, maintenance, damage, pricing, contracts, and corporate placeholder modules.
  - Lazy-loaded to keep the chat shell lighter.

### Data Layer

- `src/hooks/useAppData.ts`
  - Loads the authenticated user profile first.
  - Determines `isStaff` from the stored role.
  - Subscribes all users to vehicles.
  - Subscribes customers only to their own reservations.
  - Subscribes staff to CRM, tasks, maintenance, damage reports, pricing rules, and contracts.
- `src/lib/normalize.ts`
  - Normalizes Firestore documents into stable UI-safe domain shapes.
  - Reconciles schema drift such as legacy task statuses.

### AI Layer

- `shared/aiContracts.ts`
  - Defines the shared Gemini model IDs and persona prompts used by both the client and Functions.
- `src/services/gemini.ts`
  - Thin client wrapper around Firebase callable Functions.
  - Exposes `chat`, `transcribe`, `textToSpeech`, and `analyzeDamage`.
- `functions/src/index.ts`
  - Validates auth on every callable.
  - Reads `GEMINI_API_KEY` from Firebase Secrets.
  - Calls `@google/genai` server-side.
  - Returns safe envelopes to the browser.

### Firestore Safety Model

- `src/services/dynamicActions.ts`
  - Restricts model-driven form submissions to `reservations` and `inspections`.
  - Enforces caller identity for `customerId` and `inspectorId`.
- `firestore.rules`
  - Removes the old email-based admin backdoor.
  - Uses profile roles for admin/staff checks.
  - Allows customer access only where ownership is explicit.

## Main End-to-End Flows

### Secure chat request

1. User signs in with Google.
2. `App.tsx` subscribes to auth state and passes the session to `useAppData`.
3. User submits a prompt in `ChatView`.
4. `GeminiService.chat()` calls `chatWithGemini`.
5. The Function validates auth, loads the Gemini secret, sends the request to Gemini, and returns text plus grounding metadata.
6. `App.tsx` parses any `<canvas>` blocks into project files and renders the response.

### Dynamic UI action

1. Gemini returns a fenced `ui` block in markdown.
2. `ChatView` parses the block and renders `DynamicUI`.
3. `DynamicUI` can only call `executeDynamicAction()` or `submitDynamicForm()` for approved operations.
4. Firestore writes remain constrained by both client-side whitelists and server-side rules.

### Role-aware data subscription

1. `useAppData` reads `/users/{uid}`.
2. The normalized role determines `isStaff`.
3. Customers receive only vehicles and owned reservations.
4. Staff receive the wider operational collections.
5. On logout, `App.tsx` clears local workspace and operational state.

## Build And Validation Boundaries

- Root app validation:
  - `npm run lint`
  - `npm run lint:sast`
  - `npm test`
  - `npm run test:coverage`
  - `npm run build`
- Functions validation:
  - `npm run lint --prefix functions`
  - `npm run build --prefix functions`

## Known Deferred Items

- Some dashboard modules still have lighter direct coverage than the app shell and core trust boundaries.
- The Functions production dependency chain still reports low-severity transitive advisories with no safe non-breaking remediation identified yet.
- Local Firestore rules execution still depends on a Java runtime for the emulator, though CI enforces the suite automatically.
