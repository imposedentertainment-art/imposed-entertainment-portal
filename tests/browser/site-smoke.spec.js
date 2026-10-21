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
  await expect(page.locator('.boot-skeleton, main, #app').first()).toBeAttached();
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


test('appearance launcher remains visible and opens its settings panel', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  const trigger = page.locator('#ie-personalise-trigger');
  await expect(trigger).toBeVisible({ timeout: 8000 });
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  const glyph = await trigger.evaluate(el => getComputedStyle(el, '::before').content);
  expect(glyph).toContain('✳');
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#ie-personalise-panel')).toBeVisible();
});

test('mobile navigation drawer and toggle sit above the backdrop', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const app = document.querySelector('#app');
    app.innerHTML = '<div class="shell"><header class="nav"><div class="nav-inner"><button class="brand" type="button">Imposed Entertainment</button><button class="mobile-menu icon-btn" type="button" aria-label="Close navigation" aria-expanded="true" aria-controls="mobile-navigation-menu"><svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true"><path d="M4 4L20 20M20 4L4 20" stroke="currentColor" stroke-width="2"/></svg></button></div><nav class="mobile-nav" id="mobile-navigation-menu" aria-label="Mobile navigation"><button type="button">Overview</button><button type="button">Discography</button><input placeholder="Find a page…"><kbd>Ctrl / ⌘ K</kbd></nav></header><main class="main"><section class="card">Dashboard content behind drawer</section></main></div>';
  });
  const header = page.locator('.shell > header.nav');
  const toggle = page.locator('.mobile-menu');
  const drawer = page.locator('#mobile-navigation-menu');
  await expect(toggle).toBeVisible();
  await expect(drawer).toBeVisible();
  const stack = await page.evaluate(() => {
    const h = document.querySelector('.shell > header.nav');
    const b = document.querySelector('.mobile-menu');
    const d = document.querySelector('#mobile-navigation-menu');
    const r = b.getBoundingClientRect();
    return {
      headerPosition: getComputedStyle(h).position,
      headerZ: Number(getComputedStyle(h).zIndex),
      drawerZ: Number(getComputedStyle(d).zIndex),
      toggleAtPoint: document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === b,
      backdropContent: getComputedStyle(h, '::before').content,
      shortcutDisplay: getComputedStyle(d.querySelector('kbd')).display
    };
  });
  expect(stack.headerPosition).toBe('fixed');
  expect(stack.headerZ).toBeGreaterThanOrEqual(40);
  expect(stack.drawerZ).toBeGreaterThanOrEqual(50);
  expect(stack.toggleAtPoint).toBeTruthy();
  expect(stack.backdropContent).not.toBe('none');
  expect(stack.shortcutDisplay).toBe('none');
});
