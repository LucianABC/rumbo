import type { Logger } from '@rumbo/logger';

import type { Worker } from './worker.js';

export const SHUTDOWN_SIGNALS = ['SIGTERM', 'SIGINT'] as const;

interface ShutdownProcess {
  once(signal: (typeof SHUTDOWN_SIGNALS)[number], listener: () => void): unknown;
  exit(code: number): void;
}

/**
 * ECS and Docker send SIGTERM before killing the container; Ctrl+C sends SIGINT locally. The exit
 * code tells the orchestrator whether the worker stopped cleanly. Takes the process as a
 * parameter so the behavior is testable (#28).
 */
export function installShutdown(worker: Worker, logger: Logger, proc: ShutdownProcess): void {
  for (const signal of SHUTDOWN_SIGNALS) {
    proc.once(signal, () => {
      logger.info({ signal }, 'stopping worker');
      worker.stop().then(
        () => {
          proc.exit(0);
        },
        (error: unknown) => {
          logger.error({ err: error }, 'worker failed to stop cleanly');
          proc.exit(1);
        },
      );
    });
  }
}
