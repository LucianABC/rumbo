import { defineConfig } from 'vitest/config';

// Imported from source: this package builds the preset the others import from dist (#28).
import { coverage } from './src/index.js';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    coverage: coverage('package'),
  },
});
