# Operations Runbook

## Runtime Baseline

- Node.js: `>=20 <26`
- npm: `>=10`
- Firebase CLI: required for emulators and deploys

## Install

```bash
npm ci
npm ci --prefix functions
```

## Local Development

Start the Vite app:

```bash
npm run dev
```

Build and run the Functions emulator:

```bash
npm run build --prefix functions
npm run emulate --prefix functions
```

## Gemini Secret Handling

Gemini requests now run through Firebase callable Functions. Do not add a Gemini API key to the client `.env`.

For local emulator work:

1. Copy `functions/.secret.local.example` to a local secret file or export the secret in your shell.
2. Set `GEMINI_API_KEY` for the Functions runtime only.
3. Start the emulator from `functions/` or with `npm run emulate --prefix functions`.

For deployed environments:

```bash
firebase functions:secrets:set GEMINI_API_KEY
firebase deploy --only functions
```

## Validation Commands

Root app:

```bash
npm run lint
npm run lint:sast
npm test
npm run test:coverage
npm run test:rules
npm run build
npm run audit:prod
```

Functions:

```bash
npm run lint --prefix functions
npm run build --prefix functions
npm test --prefix functions
npm run audit:prod:functions
```

## Common Failures

### `npm ci --prefix functions` shows an engine warning

Check your local Node version:

```bash
node -v
```

The repo expects Node `>=20 <26`. Use an LTS release in that range.

### Functions fail with `GEMINI_API_KEY secret is not configured`

- Confirm the secret exists in Firebase for deployed environments.
- Confirm the local emulator has access to the secret before startup.
- Rebuild Functions after changing local runtime configuration.

### Firestore permission errors during reservation or inspection writes

- Confirm the authenticated user is present.
- Customer reservation writes must keep `customerId` equal to the signed-in user.
- Inspection writes require staff access and an `inspectorId` matching the signed-in user.

### `npm run test:rules` fails before starting the emulator

The Firestore emulator requires a local Java runtime.

Check Java availability:

```bash
java -version
```

If Java is missing, install an LTS JRE/JDK and rerun:

```bash
npm run test:rules
```

The `test:rules` script now performs a `java -version` preflight and exits early with this same guidance. GitHub Actions installs Java and runs this rules suite automatically, so local Java is a developer prerequisite rather than a gap in repository enforcement.

### Production audit failures in `functions/`

`npm run audit:prod:functions` currently reports low-severity transitive findings from the Firebase admin chain. Avoid `npm audit fix --force` unless you are explicitly scheduling a dependency compatibility pass, because the proposed fix path is breaking.
