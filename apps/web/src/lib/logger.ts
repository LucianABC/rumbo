import { createLogger } from '@rumbo/logger';

/**
 * Server-side logs for the web app, through @rumbo/logger like api and worker (AI rule 5): errors
 * are reduced to their type and code, never their message. First used by the Roadmap summary band
 * so a degraded band leaves a trace (#112).
 */
export const logger = createLogger({ service: 'web' });
