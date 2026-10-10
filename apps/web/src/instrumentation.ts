/** Runs once when the server starts: fail fast on bad config instead of on the first request (#53). */
export async function register(): Promise<void> {
  // Node-only code lives in its own module so the Edge bundle never sees process.exit.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateConfigOrExit } = await import('./instrumentation-node');
    validateConfigOrExit();
  }
}
