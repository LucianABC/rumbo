import { coverage } from '@rumbo/vitest-config';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    coverage: coverage('app', [
      {
        glob: 'src/main.ts',
        reason:
          'Entrypoint: only wires config, logger and installShutdown, which are tested (#28).',
      },
    ]),
    // Integration tests start a Postgres container; the first image pull can be slow.
    testTimeout: 120_000,
    hookTimeout: 180_000,
  },
});
