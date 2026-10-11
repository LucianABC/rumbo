import { databaseUrl, type Env, parseEnv } from '@rumbo/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: databaseUrl(),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
  // Set at image build time (Dockerfile build args); local runs report dev/unknown.
  APP_VERSION: z.string().default('dev'),
  GIT_COMMIT: z.string().default('unknown'),
});

export interface AppConfig {
  readonly port: number;
  readonly databaseUrl: string;
  readonly version: string;
  readonly commit: string;
}

export const APP_CONFIG = Symbol('APP_CONFIG');

/** Validates the environment once at boot; throws naming every invalid variable (#21). */
export function loadConfig(env: Env = process.env): AppConfig {
  const parsed = parseEnv(envSchema, env);
  return {
    port: parsed.PORT,
    databaseUrl: parsed.DATABASE_URL,
    version: parsed.APP_VERSION,
    commit: parsed.GIT_COMMIT,
  };
}
