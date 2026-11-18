import { defineConfig } from 'vitest/config';

// Security rules tests. They need the Firebase emulators, so run them with
// `npm run test:rules`, which starts the emulators first. Requires Java 21+.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    // Both files share the emulators; run them one at a time.
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 30000,
  },
});
