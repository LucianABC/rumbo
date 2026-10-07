export interface AppConfig {
  readonly port: number;
  readonly databaseUrl: string;
  readonly version: string;
  readonly commit: string;
}

export const APP_CONFIG = Symbol('APP_CONFIG');

/**
 * Minimal boot-time config: fails fast on missing or invalid values.
 * Replaced by a Zod-validated config module in #21.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('Missing required environment variable DATABASE_URL');
  }

  const rawPort = env.PORT ?? '3001';
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error(`Invalid PORT: ${rawPort}`);
  }

  return {
    port,
    databaseUrl,
    // Set at image build time (#53); local runs report dev/unknown.
    version: env.APP_VERSION ?? 'dev',
    commit: env.GIT_COMMIT ?? 'unknown',
  };
}
