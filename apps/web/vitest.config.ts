import { coverage } from '@rumbo/vitest-config';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    coverage: coverage('app', [
      {
        glob: 'src/**/*.md',
        reason: 'Docs next to the code they describe (src/mocks/README.md), not code.',
      },
    ]),
  },
});
