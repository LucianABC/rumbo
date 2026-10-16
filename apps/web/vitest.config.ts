import { fileURLToPath } from 'node:url';

import { coverage } from '@rumbo/vitest-config';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Mirrors the `@/` path in tsconfig.json for shadcn/ui imports (ADR 0007).
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['test/**/*.test.ts'],
    coverage: coverage('app', [
      {
        glob: 'src/components/ui/**',
        reason: 'shadcn/ui output (ADR 0007); covered through the views that use it',
      },
    ]),
  },
});
