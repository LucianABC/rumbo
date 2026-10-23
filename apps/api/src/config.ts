import { databaseUrl, type Env, httpOrigin, parseEnv } from '@rumbo/config';
import { LOG_LEVELS } from '@rumbo/logger';
import { z } from 'zod';

/**
 * Comma-separated origins allowed to call the API cross-origin (#22). Empty by default: the browser
 * talks only to the web origin, which proxies /api/* (ADR 0002), so no client needs CORS today.
 */
const corsOrigins = z
  .string()
  .default('')
  .transform((value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  )
  .pipe(z.array(httpOrigin()));

const envSchema = z
  .object({
    DATABASE_URL: databaseUrl(),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
    // Loopback unless told otherwise: nothing is exposed before real auth (CLAUDE.md, #76). The
    // container sets 0.0.0.0, which the compose network alone can reach.
    HOST: z.string().min(1).default('127.0.0.1'),
    // Defaults for local runs; images get real values from Dockerfile build args (#53).
    APP_VERSION: z.string().default('dev'),
    GIT_COMMIT: z.string().default('unknown'),
    LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
    CORS_ORIGINS: corsOrigins,
  })
  .transform((env) => ({
    port: env.PORT,
    host: env.HOST,
    databaseUrl: env.DATABASE_URL,
    version: env.APP_VERSION,
    commit: env.GIT_COMMIT,
    logLevel: env.LOG_LEVEL,
    corsOrigins: env.CORS_ORIGINS,
  }));

export type AppConfig = Readonly<z.output<typeof envSchema>>;

export const APP_CONFIG = Symbol('APP_CONFIG');

/** Validates the environment once at boot; throws naming every invalid variable (#21). */
export function loadConfig(env: Env = process.env): AppConfig {
  return parseEnv(envSchema, env);
}
