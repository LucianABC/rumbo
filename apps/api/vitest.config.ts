import { defineConfig } from 'vitest/config';

// Vite's Oxc transformer reads experimentalDecorators/emitDecoratorMetadata from tsconfig.json,
// so NestJS dependency injection works in tests without SWC.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    setupFiles: ['reflect-metadata'],
    // e2e tests start a Postgres container; the first image pull can be slow.
    testTimeout: 120_000,
    hookTimeout: 180_000,
  },
});
