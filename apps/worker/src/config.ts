export interface WorkerConfig {
  readonly databaseUrl: string;
}

/**
 * Minimal boot-time config: fails fast on missing values.
 * Replaced by Zod-validated config together with the API's (#21).
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): WorkerConfig {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('Missing required environment variable DATABASE_URL');
  }
  return { databaseUrl };
}
