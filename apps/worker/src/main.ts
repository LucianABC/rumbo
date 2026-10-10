import { loadConfig } from './config.js';
import { startWorker } from './worker.js';

const worker = await startWorker(loadConfig());
console.log('worker started');

// ECS and Docker send SIGTERM before killing the container; Ctrl+C sends SIGINT locally.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    console.log(`${signal} received, stopping worker`);
    worker.stop().then(
      () => process.exit(0),
      (error: unknown) => {
        console.error('worker failed to stop cleanly', error);
        process.exit(1);
      },
    );
  });
}
