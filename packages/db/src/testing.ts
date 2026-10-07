import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { PostgreSqlContainer } from '@testcontainers/postgresql';

// Same image family as production (RDS PostgreSQL 16 + pgvector, ADR 0002).
const IMAGE = 'pgvector/pgvector:pg16';
// Works from src/ (tests in this package) and dist/ (consumers): both sit one level below the root.
const packageDir = fileURLToPath(new URL('..', import.meta.url));
const prismaCli = createRequire(import.meta.url).resolve('prisma/build/index.js');

export interface TestDatabase {
  readonly url: string;
  stop(): Promise<void>;
}

/** Applies migrations exactly like the deploy step: `prisma migrate deploy`. */
export function migrateDeploy(databaseUrl: string): void {
  execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    cwd: packageDir,
    env: { ...process.env, DATABASE_URL: databaseUrl, PRISMA_HIDE_UPDATE_MESSAGE: '1' },
    stdio: 'pipe',
  });
}

/** Starts a throwaway Postgres + pgvector container with all migrations applied. Test-only. */
export async function startTestDatabase(): Promise<TestDatabase> {
  const container = await new PostgreSqlContainer(IMAGE).start();
  const url = container.getConnectionUri();
  migrateDeploy(url);
  return {
    url,
    stop: async () => {
      await container.stop();
    },
  };
}
