import { fileURLToPath } from 'node:url';

import type { NextConfig } from 'next';

import { PAGES_SOURCE, SECURITY_HEADERS } from './src/lib/security-headers';

const nextConfig: NextConfig = {
  // Self-contained server for the Docker image (#53).
  output: 'standalone',
  // Trace dependencies from the workspace root: pnpm keeps packages in the root node_modules.
  outputFileTracingRoot: fileURLToPath(new URL('../..', import.meta.url)),
  poweredByHeader: false,
  headers() {
    return Promise.resolve([{ source: PAGES_SOURCE, headers: [...SECURITY_HEADERS] }]);
  },
};

export default nextConfig;
