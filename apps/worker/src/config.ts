import { databaseUrl, type Env, parseEnv } from '@rumbo/config';
import { LOG_LEVELS, type LogLevel } from '@rumbo/logger';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: databaseUrl(),
  LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
});

export interface WorkerConfig {
  readonly databaseUrl: string;
  readonly logLevel: LogLevel;
}

/** Validates the environment once at boot; throws naming every invalid variable (#21). */
export function loadConfig(env: Env = process.env): WorkerConfig {
  const parsed = parseEnv(envSchema, env);
  return { databaseUrl: parsed.DATABASE_URL, logLevel: parsed.LOG_LEVEL };
}
