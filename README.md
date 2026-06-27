# Open Claw AI

Open Claw AI is a Vite + React operations console for car-rental teams. It combines a chat workspace, fleet and reservation dashboards, CRM views, logistics modules, and a Firebase-backed Gemini proxy so AI requests stay server-side.

## What Changed

- Gemini API calls now go through authenticated Firebase HTTPS callables instead of the browser bundle.
- Dynamic UI actions are whitelisted and typed. Model output can no longer write to arbitrary Firestore collections.
- Firestore access is role-aware. Customer sessions only receive their own reservation data, and logout clears privileged in-memory state.
- `src/App.tsx` is now an orchestrator that composes hooks and extracted modules instead of carrying the full product in one file.
- The repo now includes Functions source, CI validation, architecture notes, and an upgrade log.

## Repo Layout

- `src/App.tsx`: shell orchestration, auth wiring, notifications, and view switching.
- `src/components/app`: chat, sidebar, command palette, notifications, workspace panel.
- `src/components/modules`: dashboard and operations modules.
- `src/hooks`: typed app-data subscriptions, notifications, voice recorder.
- `src/services`: Gemini callable client, safe dynamic actions, workspace parsing/export.
- `shared`: neutral Gemini model and persona contracts consumed by both the client and Functions.
- `src/types`: shared domain models.
- `functions/src/index.ts`: authenticated Firebase callable proxy for chat, transcription, TTS, and damage analysis.
- `firestore.rules`: Firestore authorization model.
- `firebase-blueprint.json`: schema contract and collection inventory.

## Prerequisites

- Node.js `>=20 <26`
- npm `>=10`
- Firebase project access for `gen-lang-client-0185406044`
- A server-side Gemini API key configured through Firebase Secrets or local emulator secrets

## Local Setup

1. Install the web app dependencies:
   `npm ci`
2. Install the Firebase Functions dependencies:
   `npm ci --prefix functions`
3. Copy the client env example if you need emulator overrides:
   `cp .env.example .env.local`
4. For the Functions emulator, create a local secret file:
   `cp functions/.secret.local.example functions/.secret.local`
5. Put your server-side Gemini key in `functions/.secret.local` or configure it with Firebase Secrets:
   `firebase functions:secrets:set GEMINI_API_KEY`

## Running Locally

- Web app: `npm run dev`
- Functions build check: `npm run functions:build`
- Functions emulator: `npm run emulate --prefix functions`

If you use the emulator, set `VITE_USE_FIREBASE_EMULATOR="true"` in `.env.local`.

## Validation

Run the same checks used in CI:

```bash
npm ci
npm ci --prefix functions
npm run lint
npm run lint:sast
npm test
npm run test:coverage
npm run test:rules
npm run build
npm run functions:lint
npm run functions:build
npm run functions:test
```

Or use the aggregate command after installs:

```bash
npm run ci:validate
```

GitHub Actions also installs Java and runs `npm run test:rules`, so Firestore authorization regressions are enforced in CI even if a local machine is missing the emulator prerequisites. The local `test:rules` wrapper now checks `java -version` first and fails with an explicit prerequisite message before trying to boot the emulator.

## Security Notes

- Do not add `GEMINI_API_KEY` to client-side `.env` files.
- The Firebase web config in `firebase-applet-config.json` is public project configuration, not a server secret.
- Firestore admin access is role-based only; there is no hardcoded email bypass.
- Dynamic UI actions are limited to supported reservation and inspection flows.
- Firestore rules regression tests require the Firestore emulator and a local Java runtime.

## Additional Docs

- [Architecture](./ARCHITECTURE.md)
- [Operations Runbook](./OPERATIONS.md)
- [Upgrade Log](./UPGRADE_LOG.md)

---

## Author

**Konstantinos Foskolakis**
Full-stack engineer — Heraklion, Crete, Greece
[github.com/kostasuser01gr](https://github.com/kostasuser01gr)

---

## Portfolio Positioning

This project demonstrates full-stack Firebase architecture with security as a first-class concern: Gemini API calls proxied through authenticated Firebase HTTPS callables to keep credentials server-side, dynamic AI actions whitelisted and typed to prevent arbitrary Firestore writes, and Firestore rules enforcing role-aware data access at the database layer. The ARCHITECTURE.md and OPERATIONS.md document the system design and operational runbook. The Vitest suite covers Firestore rules regression with emulator support. This reflects platform thinking: security boundaries, data modeling, AI integration, and operational documentation as a complete package.

*Built as a portfolio-grade AI-powered car rental SaaS console. Estimated implementation effort for the current public version: 5–8 focused development days.*
