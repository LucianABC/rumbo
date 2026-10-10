import { fileURLToPath } from 'node:url';

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Self-contained server for the Docker image (#53).
  output: 'standalone',
  // Trace dependencies from the workspace root: pnpm keeps packages in the root node_modules.
  outputFileTracingRoot: fileURLToPath(new URL('../..', import.meta.url)),
  poweredByHeader: false,
};

export default nextConfig;
