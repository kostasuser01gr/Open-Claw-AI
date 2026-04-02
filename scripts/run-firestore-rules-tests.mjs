import { spawnSync } from 'node:child_process';

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
    ...options,
  });
}

const javaCheck = spawnSync('java', ['-version'], {
  encoding: 'utf8',
  shell: false,
});

if (javaCheck.status !== 0) {
  const stderr = javaCheck.stderr?.trim();
  const stdout = javaCheck.stdout?.trim();

  console.error('Firestore rules tests require a local Java runtime for the emulator.');
  console.error('Run `java -version` to verify the prerequisite, install a JRE/JDK if needed, then rerun `npm run test:rules`.');
  if (stdout) {
    console.error(stdout);
  }
  if (stderr) {
    console.error(stderr);
  }
  process.exit(javaCheck.status ?? 1);
}

const firebaseCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const firebaseRun = run(firebaseCommand, [
  'firebase-tools',
  'emulators:exec',
  '--project',
  'demo-open-claw-ai',
  '--only',
  'firestore',
  'vitest run src/test/firestore.rules.test.ts',
]);

process.exit(firebaseRun.status ?? 1);
