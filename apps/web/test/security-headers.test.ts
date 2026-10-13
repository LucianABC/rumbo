import { describe, expect, it } from 'vitest';

import nextConfig from '../next.config';
import { PAGES_SOURCE } from '../src/lib/security-headers';

// Same matching Next.js applies to `source` (path-to-regexp, anchored).
const pages = new RegExp(`^${PAGES_SOURCE}$`);

describe('web security headers', () => {
  it('are configured for the pages', async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    const headers = Object.fromEntries(
      rules.flatMap((rule) => rule.headers).map(({ key, value }) => [key.toLowerCase(), value]),
    );

    expect(rules.map((rule) => rule.source)).toEqual([PAGES_SOURCE]);
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['strict-transport-security']).toBe('max-age=31536000');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('no-referrer');
  });

  it.each(['/', '/status', '/profile/edit'])('apply to %s', (path) => {
    expect(pages.test(path)).toBe(true);
  });

  it('leave /api/* to the API, whose responses carry their own headers', () => {
    expect(pages.test('/api/v1/healthz')).toBe(false);
  });
});
