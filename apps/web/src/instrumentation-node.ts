import { getApiInternalUrl } from './lib/config';

export function validateConfigOrExit(): void {
  try {
    getApiInternalUrl();
  } catch (error) {
    // Next logs errors thrown from register() and keeps serving; exiting lets the orchestrator see it.
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
