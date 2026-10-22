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

for (const route of ['/privacy', '/terms', '/help']) {
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
      navInnerZ: Number(getComputedStyle(h.querySelector('.nav-inner')).zIndex),
      drawerZ: Number(getComputedStyle(d).zIndex),
      toggleAtPoint: b.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)),
      backdropContent: getComputedStyle(h, '::before').content,
      shortcutDisplay: getComputedStyle(d.querySelector('kbd')).display
    };
  });
  expect(stack.headerPosition).toBe('fixed');
  expect(stack.headerZ).toBeGreaterThanOrEqual(40);
  expect(stack.navInnerZ).toBeGreaterThanOrEqual(stack.drawerZ);
  expect(stack.drawerZ).toBeGreaterThanOrEqual(50);
  expect(stack.toggleAtPoint, JSON.stringify(stack)).toBeTruthy();
  expect(stack.backdropContent).not.toBe('none');
  expect(stack.shortcutDisplay).toBe('none');
});

test('artist workspace preserves theme artwork, glass panels and saved widget sizing', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    document.documentElement.dataset.ieWorkspaceTheme = 'midnight-studio';
    document.documentElement.dataset.ieMode = 'dark';
    document.body.className = 'personalise-palette-midnight-studio';
    document.querySelector('#app').innerHTML = `
      <main class="page dashboard-page">
        <section class="dashboard-hero"><div class="dashboard-hero-copy"><h1>Artist workspace</h1></div><div class="hero-art"><div class="hero-record"></div></div></section>
        <div class="dashboard-widget-layout">
          <section class="dashboard-widget" data-dashboard-widget-card="metrics" data-widget-size="half"><section class="dashboard-panel">Metrics</section></section>
          <section class="dashboard-widget" data-dashboard-widget-card="shortcuts" data-widget-size="third"><section class="quick-links-panel">Shortcuts</section></section>
        </div>
      </main>`;
  });
  const result = await page.evaluate(() => {
    const hero = document.querySelector('.dashboard-hero');
    const cards = [...document.querySelectorAll('[data-dashboard-widget-card]')];
    return {
      themeArt: getComputedStyle(document.body).getPropertyValue('--ie-theme-art').trim(),
      heroBackground: getComputedStyle(hero).backgroundImage,
      heroColumns: getComputedStyle(hero).gridTemplateColumns,
      cardSpans: cards.map(card => getComputedStyle(card).gridColumnStart + '/' + getComputedStyle(card).gridColumnEnd),
      glassBlur: getComputedStyle(cards[0]).backdropFilter || getComputedStyle(cards[0]).webkitBackdropFilter,
      bodyTheme: document.body.classList.contains('personalise-palette-midnight-studio')
    };
  });
  expect(result.themeArt).toContain('midnight-studio.jpg');
  expect(result.heroBackground).toContain('url(');
  expect(result.heroColumns).not.toBe('none');
  expect(result.cardSpans[0]).not.toBe('1 / -1');
  expect(result.cardSpans[1]).not.toBe('1 / -1');
  expect(result.glassBlur).not.toBe('none');
  expect(result.bodyTheme).toBeTruthy();
});


test('all workspace themes keep their background artwork in light mode and on non-label routes', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  const results = await page.evaluate(() => {
    document.documentElement.dataset.ieMode = 'light';
    document.documentElement.dataset.ieTheme = 'blood';
    const themes = ['light-skies', 'midnight-studio', 'graphite-minimal', 'plum-dusk', 'forest-room'];
    return themes.map(theme => {
      document.documentElement.dataset.ieWorkspaceTheme = theme;
      const image = getComputedStyle(document.body).backgroundImage;
      return { theme, image };
    });
  });
  for (const result of results) {
    expect(result.image, result.theme + ' background image was overridden').toContain(result.theme + '.jpg');
  }
});


test('guest customiser persists an explicit workspace theme choice', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  const trigger = page.locator('#ie-personalise-trigger');
  await expect(trigger).toBeVisible({ timeout: 8000 });
  await trigger.click();
  await page.locator('#ie-personalise-panel select[aria-label="Workspace theme"]').selectOption('plum-dusk');
  const result = await page.evaluate(() => ({
    theme: document.documentElement.dataset.ieWorkspaceTheme,
    touched: JSON.parse(localStorage.getItem('ie-workspace-personalisation-touched-v1') || '[]'),
    background: getComputedStyle(document.body).backgroundImage
  }));
  expect(result.theme).toBe('plum-dusk');
  expect(result.touched).toContain('palette');
  expect(result.background).toContain('plum-dusk.jpg');
});



test('public help centre is crawlable and explains listener/workspace separation', async ({ request }) => {
  const response = await request.get('http://127.0.0.1:4173/help');
  expect(response.ok()).toBeTruthy();
  const html = await response.text();
  expect(html).toContain('name="robots" content="index,follow"');
  expect(html).toContain('Listener accounts are intentionally separated');
  expect(html).toContain('AI assistant');
});


test('liquid-glass chrome remains transparent and desktop navigation stays available', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  const result = await page.evaluate(() => {
    const nav = document.querySelector('.shell > header.nav');
    const desktop = nav?.querySelector('.desktop-nav');
    const inner = nav?.querySelector('.nav-inner');
    return { nav: !!nav, desktop: !!desktop, display: desktop ? getComputedStyle(desktop).display : 'missing',
      background: inner ? getComputedStyle(inner).backgroundColor : 'missing' };
  });
  expect(result.nav).toBeTruthy();
  expect(result.desktop).toBeTruthy();
  expect(result.display).not.toBe('none');
  expect(result.background).not.toBe('rgb(11, 15, 20)');
});

test('welcome hero does not duplicate the page wallpaper with artwork', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.dashboard-hero img, .welcome-card img, .welcome-widget img')).toHaveCount(0);
});
