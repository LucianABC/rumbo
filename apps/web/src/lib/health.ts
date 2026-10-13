import { HealthReport } from '@rumbo/contracts';

export type { HealthReport };

// The worker writes one every minute (#14); a few missed runs are tolerated.
export const HEARTBEAT_STALE_AFTER_MS = 5 * 60_000;
const HEALTH_TIMEOUT_MS = 3_000;

/** Returns the API's report, or null when the API is unreachable or answers something unexpected. */
export async function fetchHealth(
  apiBaseUrl: URL,
  fetchFn: typeof fetch = fetch,
): Promise<HealthReport | null> {
  try {
    const res = await fetchFn(new URL('/api/v1/healthz', apiBaseUrl), {
      cache: 'no-store',
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    // 503 still carries a report (db down), so the body is read for both.
    if (!res.ok && res.status !== 503) {
      return null;
    }
    // Parsed with the same schema the API is tested against (#27).
    const parsed = HealthReport.safeParse(await res.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export type HeartbeatState = 'fresh' | 'stale' | 'none' | 'unknown';

export interface StatusView {
  readonly api: 'up' | 'down';
  readonly db: 'up' | 'down' | 'unknown';
  readonly heartbeat: HeartbeatState;
  /** Human-readable heartbeat age, e.g. "42s ago"; null when there is no heartbeat to report. */
  readonly heartbeatAge: string | null;
  readonly version: string | null;
  readonly commit: string | null;
}

export function toStatusView(report: HealthReport | null, now: Date): StatusView {
  if (!report) {
    return {
      api: 'down',
      db: 'unknown',
      heartbeat: 'unknown',
      heartbeatAge: null,
      version: null,
      commit: null,
    };
  }

  const base = {
    api: 'up',
    db: report.db,
    version: report.version,
    commit: report.commit,
  } as const;
  if (report.lastHeartbeatAt === null) {
    // The API only reads heartbeats while the DB is up.
    return { ...base, heartbeat: report.db === 'up' ? 'none' : 'unknown', heartbeatAge: null };
  }

  const ageMs = Math.max(0, now.getTime() - new Date(report.lastHeartbeatAt).getTime());
  return {
    ...base,
    heartbeat: ageMs > HEARTBEAT_STALE_AFTER_MS ? 'stale' : 'fresh',
    heartbeatAge: formatAge(ageMs),
  };
}

export function formatAge(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${String(seconds)}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${String(minutes)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${String(hours)}h ago`;
  return `${String(Math.floor(hours / 24))}d ago`;
}
