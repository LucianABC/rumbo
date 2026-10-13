import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// getApiInternalUrl caches the parsed URL per module, so each test loads fresh modules.
beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function load() {
  const [{ register }, { validateConfigOrExit }] = await Promise.all([
    import('../src/instrumentation'),
    import('../src/instrumentation-node'),
  ]);
  return { register, validateConfigOrExit };
}

function stubExit() {
  return vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
}

describe('validateConfigOrExit', () => {
  it('does nothing when API_INTERNAL_URL is valid', async () => {
    const { validateConfigOrExit } = await load();
    vi.stubEnv('API_INTERNAL_URL', 'http://api:3001');
    const exit = stubExit();

    validateConfigOrExit();

    expect(exit).not.toHaveBeenCalled();
  });

  it('logs the problem and exits 1 when the config is invalid', async () => {
    const { validateConfigOrExit } = await load();
    vi.stubEnv('API_INTERNAL_URL', 'not a url');
    const exit = stubExit();
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    validateConfigOrExit();

    expect(exit).toHaveBeenCalledWith(1);
    expect(String(error.mock.calls[0]?.[0])).toContain('API_INTERNAL_URL');
  });
});

describe('register', () => {
  it('validates the config on the Node.js runtime', async () => {
    const { register } = await load();
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');
    vi.stubEnv('API_INTERNAL_URL', 'not a url');
    const exit = stubExit();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await register();

    expect(exit).toHaveBeenCalledWith(1);
  });

  it('skips validation on the Edge runtime, which cannot exit the process', async () => {
    const { register } = await load();
    vi.stubEnv('NEXT_RUNTIME', 'edge');
    vi.stubEnv('API_INTERNAL_URL', 'not a url');
    const exit = stubExit();

    await register();

    expect(exit).not.toHaveBeenCalled();
  });
});
