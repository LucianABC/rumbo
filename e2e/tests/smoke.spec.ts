import { expect, test } from '@playwright/test';

test('status page shows the database up and a fresh worker heartbeat', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('api-status')).toHaveText('up');
  await expect(page.getByTestId('db-status')).toHaveText('db: up');
  // The worker's cron fires once a minute, so a freshly started stack may have no heartbeat yet.
  // "ok" means younger than 5 minutes (apps/web/src/lib/health.ts).
  await expect(async () => {
    await page.reload();
    await expect(page.getByTestId('heartbeat-status')).toHaveText(/^ok, last /, {
      timeout: 1_000,
    });
  }).toPass({ timeout: 90_000, intervals: [5_000] });
});

test('the web origin proxies /api/* to the API', async ({ request }) => {
  const res = await request.get('/api/v1/healthz');

  expect(res.status()).toBe(200);
  expect(await res.json()).toMatchObject({ status: 'ok', db: 'up' });
});
