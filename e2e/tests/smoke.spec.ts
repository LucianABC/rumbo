import { expect, test } from '@playwright/test';

test('status page shows the database up and a fresh worker heartbeat', async ({ page }) => {
  await page.goto('/status');

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

test('pages ship processed Tailwind CSS', async ({ page, request }) => {
  // The build passes even when Tailwind is not processed, so check what the browser gets (#104).
  await page.goto('/roadmap');
  const href = await page.locator('link[rel="stylesheet"]').first().getAttribute('href');
  expect(href).toBeTruthy();

  const css = await (await request.get(href ?? '')).text();
  expect(css).toContain('box-sizing:border-box');
  expect(css).not.toContain('@theme');
  // A utility class only Tailwind can have produced (#108), on the line switcher, which shows at
  // every size (#148).
  await expect(page.getByRole('group', { name: 'Show line' })).toHaveCSS('display', 'flex');
});

test('the web origin proxies /api/* to the API', async ({ request }) => {
  const res = await request.get('/api/v1/healthz');

  expect(res.status()).toBe(200);
  expect(await res.json()).toMatchObject({ status: 'ok', db: 'up' });
});
