import { databaseUrl, type Env, parseEnv } from '@rumbo/config';
import { z } from 'zod';

const envSchema = z
  .object({
    DATABASE_URL: databaseUrl(),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
    // Defaults for local runs; images get real values from Dockerfile build args (#53).
    APP_VERSION: z.string().default('dev'),
    GIT_COMMIT: z.string().default('unknown'),
  })
  .transform((env) => ({
    port: env.PORT,
    databaseUrl: env.DATABASE_URL,
    version: env.APP_VERSION,
    commit: env.GIT_COMMIT,
  }));

export type AppConfig = Readonly<z.output<typeof envSchema>>;

export const APP_CONFIG = Symbol('APP_CONFIG');

/** Validates the environment once at boot; throws naming every invalid variable (#21). */
export function loadConfig(env: Env = process.env): AppConfig {
  return parseEnv(envSchema, env);
}
