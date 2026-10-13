import { coverage } from '@rumbo/vitest-config';
import { defineConfig } from 'vitest/config';

// Vite's Oxc transformer reads experimentalDecorators/emitDecoratorMetadata from tsconfig.json,
// so NestJS dependency injection works in tests without SWC.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    coverage: coverage('app', [
      {
        glob: 'src/main.ts',
        reason:
          'Entrypoint: only creates the app configureApp builds for the e2e tests, then listens (#28).',
      },
    ]),
    setupFiles: ['reflect-metadata'],
    // e2e tests start a Postgres container; the first image pull can be slow.
    testTimeout: 120_000,
    hookTimeout: 180_000,
  },
});
