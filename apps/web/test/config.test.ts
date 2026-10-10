import { describe, expect, it } from 'vitest';

import { getApiInternalUrl } from '../src/lib/config';

describe('getApiInternalUrl', () => {
  it('fails fast and names API_INTERNAL_URL when it is missing', () => {
    expect(() => getApiInternalUrl({})).toThrow('API_INTERNAL_URL');
  });

  it('parses an http URL', () => {
    expect(getApiInternalUrl({ API_INTERNAL_URL: 'http://api:3001' }).href).toBe(
      'http://api:3001/',
    );
  });

  it.each(['not a url', 'ftp://api:3001'])('rejects API_INTERNAL_URL=%s', (value) => {
    expect(() => getApiInternalUrl({ API_INTERNAL_URL: value })).toThrow(
      `Invalid API_INTERNAL_URL: ${value}`,
    );
  });
});
