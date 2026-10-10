import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Integration tests start a Postgres container; the first image pull can be slow.
    testTimeout: 120_000,
    hookTimeout: 180_000,
  },
});
