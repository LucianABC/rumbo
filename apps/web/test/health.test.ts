import { describe, expect, it, vi } from 'vitest';

import {
  fetchHealth,
  formatAge,
  HEARTBEAT_STALE_AFTER_MS,
  type HealthReport,
  toStatusView,
} from '../src/lib/health';

const NOW = new Date('2026-10-10T12:00:00.000Z');
const API = new URL('http://api:3001');

function report(overrides: Partial<HealthReport> = {}): HealthReport {
  return {
    status: 'ok',
    db: 'up',
    version: '1.0.0',
    commit: 'abc123',
    lastHeartbeatAt: new Date(NOW.getTime() - 42_000).toISOString(),
    ...overrides,
  };
}

function fakeFetch(status: number, body: unknown) {
  return vi.fn<typeof fetch>().mockResolvedValue(Response.json(body, { status }));
}

describe('toStatusView', () => {
  it('reports everything up with a fresh heartbeat', () => {
    expect(toStatusView(report(), NOW)).toEqual({
      api: 'up',
      db: 'up',
      heartbeat: 'fresh',
      heartbeatAge: '42s ago',
      version: '1.0.0',
      commit: 'abc123',
    });
  });

  it('marks a heartbeat older than 5 minutes as stale', () => {
    const old = new Date(NOW.getTime() - HEARTBEAT_STALE_AFTER_MS - 1_000).toISOString();

    expect(toStatusView(report({ lastHeartbeatAt: old }), NOW)).toMatchObject({
      heartbeat: 'stale',
      heartbeatAge: '5m ago',
    });
  });

  it('keeps a heartbeat of exactly 5 minutes fresh', () => {
    const edge = new Date(NOW.getTime() - HEARTBEAT_STALE_AFTER_MS).toISOString();

    expect(toStatusView(report({ lastHeartbeatAt: edge }), NOW).heartbeat).toBe('fresh');
  });

  it('reports no heartbeat yet when the DB is up but empty', () => {
    expect(toStatusView(report({ lastHeartbeatAt: null }), NOW)).toMatchObject({
      heartbeat: 'none',
      heartbeatAge: null,
    });
  });

  it('reports the heartbeat as unknown when the DB is down', () => {
    expect(
      toStatusView(report({ status: 'degraded', db: 'down', lastHeartbeatAt: null }), NOW),
    ).toMatchObject({ api: 'up', db: 'down', heartbeat: 'unknown' });
  });

  it('reports the API down and everything else unknown without a report', () => {
    expect(toStatusView(null, NOW)).toEqual({
      api: 'down',
      db: 'unknown',
      heartbeat: 'unknown',
      heartbeatAge: null,
      version: null,
      commit: null,
    });
  });

  it('treats a heartbeat slightly in the future (clock skew) as just now', () => {
    const ahead = new Date(NOW.getTime() + 2_000).toISOString();

    expect(toStatusView(report({ lastHeartbeatAt: ahead }), NOW).heartbeatAge).toBe('0s ago');
  });
});

describe('formatAge', () => {
  it.each([
    [0, '0s ago'],
    [59_999, '59s ago'],
    [60_000, '1m ago'],
    [3_599_999, '59m ago'],
    [3_600_000, '1h ago'],
    [86_400_000, '1d ago'],
  ])('formats %d ms as %s', (ms, expected) => {
    expect(formatAge(ms)).toBe(expected);
  });
});

describe('fetchHealth', () => {
  it('calls healthz on the internal API URL and returns the report', async () => {
    const fetchFn = fakeFetch(200, report());

    await expect(fetchHealth(API, fetchFn)).resolves.toEqual(report());
    expect(fetchFn).toHaveBeenCalledWith(
      new URL('http://api:3001/api/v1/healthz'),
      expect.objectContaining({ cache: 'no-store' }),
    );
  });

  it('returns the report from a 503 (db down)', async () => {
    const degraded = report({ status: 'degraded', db: 'down', lastHeartbeatAt: null });

    await expect(fetchHealth(API, fakeFetch(503, degraded))).resolves.toEqual(degraded);
  });

  it('returns null on other error statuses', async () => {
    await expect(fetchHealth(API, fakeFetch(500, report()))).resolves.toBeNull();
  });

  it('returns null when the body is not a health report', async () => {
    await expect(fetchHealth(API, fakeFetch(200, { status: 'ok' }))).resolves.toBeNull();
  });

  it('returns null when the API is unreachable', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('fetch failed'));

    await expect(fetchHealth(API, fetchFn)).resolves.toBeNull();
  });
});
