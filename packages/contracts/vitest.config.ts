import { coverage } from '@rumbo/vitest-config';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    coverage: coverage('package'),
  },
});
