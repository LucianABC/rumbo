import { createLogger } from '@rumbo/logger';

import { loadConfig } from './config.js';
import { installShutdown } from './shutdown.js';
import { startWorker } from './worker.js';

const config = loadConfig();
const logger = createLogger({ service: 'worker', level: config.logLevel });
const worker = await startWorker(config, logger);
logger.info('worker started');
installShutdown(worker, logger, process);
