import { databaseUrl, type Env, parseEnv } from '@rumbo/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: databaseUrl(),
});

export interface WorkerConfig {
  readonly databaseUrl: string;
}

/** Validates the environment once at boot; throws naming every invalid variable (#21). */
export function loadConfig(env: Env = process.env): WorkerConfig {
  const parsed = parseEnv(envSchema, env);
  return { databaseUrl: parsed.DATABASE_URL };
}
