import { defineConfig, devices } from '@playwright/test';

/**
 * Black-box smoke tests against a running stack (#54): locally and in CI that is
 * `docker compose up --build --wait`; after the Production launch, the deployed web URL (#19).
 */
export default defineConfig({
  testDir: 'tests',
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? `http://127.0.0.1:${process.env.WEB_PORT ?? '3000'}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
