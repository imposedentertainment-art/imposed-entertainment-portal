const { test, expect } = require('@playwright/test');

test('homepage loads and local assets resolve', async ({ page }) => {
  const failedLocalResponses = [];
  page.on('response', response => {
    if (response.url().startsWith('http://127.0.0.1:4173/') && response.status() >= 400) {
      failedLocalResponses.push({ url: response.url(), status: response.status() });
    }
  });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('#app')).toBeAttached();
  await expect(page.locator('.boot-skeleton, main, #app')).toBeAttached();
  await page.waitForTimeout(1200);
  expect(failedLocalResponses, JSON.stringify(failedLocalResponses)).toEqual([]);
});

test('mobile shell fits viewport without horizontal page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toBeVisible();
  const sizes = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth
  }));
  expect(sizes.document, JSON.stringify(sizes)).toBeLessThanOrEqual(sizes.viewport + 2);
});

for (const route of ['/privacy', '/terms']) {
  test(`direct route ${route} responds with the expected document`, async ({ request }) => {
    const response = await request.get(`http://127.0.0.1:4173${route}`);
    expect(response.ok()).toBeTruthy();
    expect(await response.text()).toContain('<html');
  });
}
