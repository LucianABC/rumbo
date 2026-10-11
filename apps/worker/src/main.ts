import { createLogger } from '@rumbo/logger';

import { loadConfig } from './config.js';
import { startWorker } from './worker.js';

const config = loadConfig();
const logger = createLogger({ service: 'worker', level: config.logLevel });
const worker = await startWorker(config, logger);
logger.info('worker started');

// ECS and Docker send SIGTERM before killing the container; Ctrl+C sends SIGINT locally.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    logger.info({ signal }, 'stopping worker');
    worker.stop().then(
      () => process.exit(0),
      (error: unknown) => {
        logger.error({ err: error }, 'worker failed to stop cleanly');
        process.exit(1);
      },
    );
  });
}
