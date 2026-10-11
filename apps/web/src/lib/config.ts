import { type Env, httpUrl, parseEnv } from '@rumbo/config';
import { z } from 'zod';

const envSchema = z.object({
  // Where the web server reaches the API (e.g. http://api:3001 inside Docker Compose).
  API_INTERNAL_URL: httpUrl(),
});

/**
 * Base URL of the API as seen from the web server. Read at runtime, not at build time, so one
 * image runs in every environment; validated at boot by instrumentation.ts (#21).
 */
export function getApiInternalUrl(env: Env = process.env): URL {
  return new URL(parseEnv(envSchema, env).API_INTERNAL_URL);
}
