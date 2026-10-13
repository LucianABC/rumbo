import { z } from 'zod';

/** Body of `GET /api/v1/healthz`, for both 200 and 503 (db down) (#14, #23). */
export const HealthReport = z.object({
  status: z.enum(['ok', 'degraded']),
  db: z.enum(['up', 'down']),
  version: z.string(),
  commit: z.string(),
  /** Last row written by the worker heartbeat job; null if none or the DB is down. */
  lastHeartbeatAt: z.iso.datetime().nullable(),
});
export type HealthReport = z.infer<typeof HealthReport>;
