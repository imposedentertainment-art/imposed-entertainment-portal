const { test, expect } = require('@playwright/test');

test('Cloud OS starts after Null Core and exposes an isolated service registry', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.NullCore && window.NullCore.lifecycle === 'ready' && window.CloudOS && window.CloudOS.status === 'ready');
  const result = await page.evaluate(() => ({
    health: window.CloudOS.health(),
    coreEngines: window.NullCore.getEngines().map(engine => engine.name)
  }));
  expect(result.health.engine).toBe('cloud-os');
  expect(result.health.status).toBe('ready');
  expect(result.coreEngines).toContain('cloud-os');
});

test('Null Core boots, exposes a stable engine contract and accepts application configuration', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.NullCore && window.NullCore.lifecycle === 'ready');
  const health = await page.evaluate(() => ({
    health: window.NullCore.health(),
    engines: window.NullCore.getEngines().map(engine => engine.name),
    configIsObject: Boolean(window.NullCore.readConfig(window.IMPOSED_CONFIG) && typeof window.NullCore.readConfig(window.IMPOSED_CONFIG) === 'object')
  }));
  expect(health.health.engine).toBe('null-core');
  expect(health.health.lifecycle).toBe('ready');
  expect(health.engines).toContain('null-core');
  expect(health.configIsObject).toBeTruthy();
});

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


test('removed overview banner cannot return from stale saved appearance preferences', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#app')).toBeAttached();
  await page.waitForTimeout(1200);
  await expect(page.locator('.ie-banner, [data-banner-enabled], [data-banner-file]')).toHaveCount(0);
  const trigger = page.locator('#ie-personalise-trigger');
  if (await trigger.isVisible()) {
    await trigger.click();
    await expect(page.locator('#ie-personalise-panel')).toBeVisible();
    await expect(page.getByText('Overview banner', { exact: true })).toHaveCount(0);
  }
});

test('keyboard focus indicators remain visible and reduced-motion preference is respected', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.keyboard.press('Tab');
  const focus = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const style = getComputedStyle(el);
    return {
      tag: el.tagName,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow,
      motion: matchMedia('(prefers-reduced-motion: reduce)').matches
    };
  });
  expect(focus, 'Tab should move focus to an interactive element').not.toBeNull();
  expect(focus.motion).toBeTruthy();
  expect(focus.outlineStyle === 'none' && focus.boxShadow === 'none', JSON.stringify(focus)).toBeFalsy();
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
    const html = await response.text();
    expect(html).toContain('<html');
    if (route === '/privacy' || route === '/terms') {
      expect(html.toLowerCase()).toContain('routenote');
      expect(html.toLowerCase()).toContain('botpress');
    }
  });
}


test('hidden boot overlay and passive toasts do not intercept workspace controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#app-loading')).toHaveClass(/is-hidden/);
  const overlay = await page.locator('#app-loading').evaluate(el => ({
    display: getComputedStyle(el).display,
    pointerEvents: getComputedStyle(el).pointerEvents
  }));
  expect(overlay.display).toBe('none');
  expect(overlay.pointerEvents).toBe('none');
});

test('appearance launcher remains visible and opens its settings panel', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  const trigger = page.locator('#ie-personalise-trigger');
  await expect(trigger).toBeVisible({ timeout: 8000 });
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(await trigger.textContent()).toContain('✳');
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
  expect(['fixed', 'sticky']).toContain(stack.headerPosition);
  expect(stack.headerZ).toBeGreaterThanOrEqual(40);
  // The legacy mobile drawer is anchored below the header. Keep the header row above the drawer,
  // with the menu toggle above both so users can close it without the backdrop intercepting clicks.
  expect(stack.drawerZ).toBeLessThan(stack.navInnerZ);
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
      themeArt: getComputedStyle(document.body, '::before').backgroundImage,
      heroBackground: getComputedStyle(hero).backgroundImage,
      heroColumns: getComputedStyle(hero).gridTemplateColumns,
      cardSpans: cards.map(card => getComputedStyle(card).gridColumnStart + '/' + getComputedStyle(card).gridColumnEnd),
      glassBlur: getComputedStyle(cards[0]).backdropFilter || getComputedStyle(cards[0]).webkitBackdropFilter,
      bodyTheme: document.body.classList.contains('personalise-palette-midnight-studio')
    };
  });
  expect(result.themeArt).toContain('midnight-studio.jpg');
  expect(result.heroBackground).not.toContain('midnight-studio.jpg');
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
      // Production applies the selected workspace theme to <html>, not a palette class on <body>.
      const image = getComputedStyle(document.body, '::before').backgroundImage;
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
  await page.locator('#ie-personalise-panel button[aria-label="Use Plum dusk theme"]').click();
  const result = await page.evaluate(() => ({
    theme: document.documentElement.dataset.ieWorkspaceTheme,
    touched: JSON.parse(localStorage.getItem('ie-workspace-personalisation-touched-v1') || '[]'),
    background: getComputedStyle(document.body, '::before').backgroundImage
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
    const stylesheet = [...document.querySelectorAll('link[rel="stylesheet"]')]
      .find(link => link.href.includes('ui-engine.css'));
    const nav = document.querySelector('header.nav');
    const desktop = nav?.querySelector('.desktop-nav');
    const inner = nav?.querySelector('.nav-inner');
    return { stylesheetLoaded: !!stylesheet && !!stylesheet.sheet, navExists: !!nav,
      desktopExists: !!desktop, display: desktop ? getComputedStyle(desktop).display : 'not-rendered-for-guest',
      background: inner ? getComputedStyle(inner).backgroundColor : 'not-rendered-for-guest' };
  });
  expect(result.stylesheetLoaded).toBeTruthy();
  if (result.navExists) {
    expect(result.desktopExists).toBeTruthy();
    expect(result.display).not.toBe('none');
    expect(result.background).not.toBe('rgb(11, 15, 20)');
  }
});

test('welcome hero does not duplicate the page wallpaper with artwork', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.dashboard-hero .hero-art, .dashboard-hero .hero-index, .welcome-card img, .welcome-widget img')).toHaveCount(0);
});

test('Prism validates and persists personalisation preferences through its engine contract', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.Prism && window.CloudOS && window.NullCore);
  const result = await page.evaluate(() => {
    const saved = window.Prism.write({
      accent: '#12abef',
      palette: 'forest-room',
      theme: 'light',
      fontScale: 9,
      lineHeight: 0.2,
      buttonStyle: 'not-a-real-style',
      glow: true
    });
    const readBack = window.Prism.read();
    return {
      saved: saved.state,
      readBack,
      health: window.Prism.health(),
      engineRegistered: window.NullCore.getEngines().some(engine => engine.name === 'prism'),
      serviceRegistered: window.CloudOS.getServices().some(service => service.name === 'prism-preferences')
    };
  });
  expect(result.saved.accent).toBe('#12abef');
  expect(result.saved.palette).toBe('forest-room');
  expect(result.saved.fontScale).toBe(1.3);
  expect(result.saved.lineHeight).toBe(1.25);
  expect(result.saved.buttonStyle).toBe('soft');
  expect(result.saved.glow).toBeTruthy();
  expect(result.readBack.palette).toBe('forest-room');
  expect(result.health.preferenceCount).toBeGreaterThan(10);
  expect(result.engineRegistered).toBeTruthy();
  expect(result.serviceRegistered).toBeTruthy();
});

test('Prism stays aligned with account appearance events without starting a sync loop', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.Prism && window.NullCore);
  const result = await page.evaluate(() => {
    localStorage.removeItem('ie-workspace-personalisation-touched-v1');
    let syncEvents = 0;
    window.addEventListener('ie-personalise-change', () => { syncEvents += 1; });
    window.dispatchEvent(new CustomEvent('ie-appearance-change', { detail: {
      accent: '#123456',
      workspaceTheme: 'forest-room',
      mode: 'light',
      quickCustomiser: { buttonStyle: 'pill', surface: 'glass' }
    }}));
    const prefs = window.Prism.read();
    return { prefs, syncEvents };
  });
  expect(result.prefs.accent).toBe('#123456');
  expect(result.prefs.palette).toBe('forest-room');
  expect(result.prefs.theme).toBe('light');
  expect(result.prefs.buttonStyle).toBe('pill');
  expect(result.prefs.surface).toBe('glass');
  expect(result.syncEvents).toBe(0);
});

test('unified stylesheet retains the authentication, customiser, shop and navigation feature layers', async ({ request }) => {
  const response = await request.get('http://127.0.0.1:4173/ui-engine.css?v=3.3.78');
  expect(response.ok()).toBeTruthy();
  const css = await response.text();
  for (const selector of ['.auth-shell.auth-layout', '.ie-p-control', '.ie-shop-page', '.mobile-nav', '[data-ie-mode']) {
    expect(css, 'missing stylesheet contract: ' + selector).toContain(selector);
  }
  expect(css.length).toBeGreaterThan(150000);
});


test('workspace theme art remains visible and mobile background attachment avoids fixed scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  const desktopTheme = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    ['light-skies', 'midnight-studio', 'graphite-minimal', 'plum-dusk', 'forest-room'].forEach(theme => {
      body.classList.remove('personalise-palette-' + theme);
    });
    root.dataset.ieWorkspaceTheme = 'forest-room';
    body.classList.add('personalise-palette-forest-room');
    const layer = getComputedStyle(body, '::before');
    return {
      token: getComputedStyle(body).getPropertyValue('--theme-image'),
      image: layer.backgroundImage,
      display: layer.display
    };
  });
  expect(desktopTheme.token).toContain('forest-room.jpg');
  expect(desktopTheme.image).toContain('forest-room.jpg');
  expect(desktopTheme.display).not.toBe('none');

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileBackground = await page.evaluate(() => ({
    attachment: getComputedStyle(document.body).backgroundAttachment,
    wallpaperPosition: getComputedStyle(document.body, '::before').position
  }));
  expect(mobileBackground.attachment).toContain('scroll');
  expect(mobileBackground.wallpaperPosition).toBe('absolute');
});

test('support and appearance layouts respond cleanly across desktop and mobile widths', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    document.querySelector('#app').innerHTML =
      '<main id="main-content" class="page support-page">' +
        '<section class="support-centre-intro"><article class="support-hub-card card"><div class="support-hub-icon">?</div><div><h2>Help centre</h2><p>Guides</p></div></article><article class="support-hub-card card"><div class="support-hub-icon">!</div><div><h2>Contact support</h2><p>Contact us</p></div></article></section>' +
        '<section class="support-topic-panel card"><div class="support-topic-grid"><button class="support-topic-choice">Access</button><button class="support-topic-choice">Releases</button><button class="support-topic-choice">Profiles</button></div></section>' +
        '<section class="appearance-section"><div class="workspace-theme-grid"><button class="workspace-theme-option">Midnight</button><button class="workspace-theme-option">Forest</button></div><div class="appearance-choice-grid"><label class="appearance-choice">Vivid</label><label class="appearance-choice">Classic</label><label class="appearance-choice">Minimal</label></div></section>' +
      '</main>';
  });
  const desktop = await page.evaluate(() => {
    const columns = selector => getComputedStyle(document.querySelector(selector)).gridTemplateColumns.trim().split(/\s+/).length;
    return {
      supportIntro: columns('.support-centre-intro'),
      topicGrid: columns('.support-topic-grid'),
      themeGrid: columns('.workspace-theme-grid'),
      choiceGrid: columns('.appearance-choice-grid')
    };
  });
  expect(desktop.supportIntro).toBe(2);
  expect(desktop.topicGrid).toBe(3);
  expect(desktop.themeGrid).toBe(2);
  expect(desktop.choiceGrid).toBe(3);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await page.evaluate(() => ({
    supportIntro: getComputedStyle(document.querySelector('.support-centre-intro')).gridTemplateColumns.trim().split(/\s+/).length,
    topicGrid: getComputedStyle(document.querySelector('.support-topic-grid')).gridTemplateColumns.trim().split(/\s+/).length,
    themeGrid: getComputedStyle(document.querySelector('.workspace-theme-grid')).gridTemplateColumns.trim().split(/\s+/).length,
    viewport: document.documentElement.clientWidth,
    pageWidth: document.documentElement.scrollWidth
  }));
  expect(mobile.supportIntro).toBe(1);
  expect(mobile.topicGrid).toBe(1);
  expect(mobile.themeGrid).toBe(1);
  expect(mobile.pageWidth).toBeLessThanOrEqual(mobile.viewport + 2);
});

test('auth hero typography separates headline from explanatory copy', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    document.querySelector('#app').innerHTML =
      '<main class="auth-shell auth-layout"><section class="auth-story"><div class="auth-story-content"><h2>Your music.<br><em>Your next chapter.</em></h2><p class="auth-story-copy">One place to submit releases, stay connected with the label, and follow every step from review to release day.</p></div></section></main>';
  });
  const sizes = await page.evaluate(() => ({
    headline: parseFloat(getComputedStyle(document.querySelector('.auth-story h2')).fontSize),
    copy: parseFloat(getComputedStyle(document.querySelector('.auth-story-copy')).fontSize),
    copyWidth: document.querySelector('.auth-story-copy').getBoundingClientRect().width
  }));
  expect(sizes.headline).toBeGreaterThan(sizes.copy * 1.5);
  expect(sizes.copy).toBeLessThanOrEqual(20);
  expect(sizes.copyWidth).toBeGreaterThan(250);
});


test('font loading uses the document preload path without a redundant CSS import', async ({ request }) => {
  const htmlResponse = await request.get('http://127.0.0.1:4173/');
  expect(htmlResponse.ok()).toBeTruthy();
  const html = await htmlResponse.text();
  expect(html).toContain('fonts.googleapis.com/css2?family=DM+Sans');
  const cssResponse = await request.get('http://127.0.0.1:4173/ui-engine.css?v=3.3.78');
  expect(cssResponse.ok()).toBeTruthy();
  const css = await cssResponse.text();
  expect(css).not.toMatch(/^\s*@import\s/m);
  expect(css).toContain('--ui:"DM Sans"');
  expect(css).toContain('--display:"Space Grotesk"');
});


test('reduced-motion preference disables non-essential motion across the interface', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  const result = await page.evaluate(() => {
    const probe = document.createElement('button');
    probe.textContent = 'Motion preference probe';
    probe.style.animation = 'ie-motion-probe 4s infinite';
    probe.style.transition = 'opacity 4s';
    document.body.appendChild(probe);
    const style = getComputedStyle(probe);
    return {
      motion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      animationDuration: parseFloat(style.animationDuration),
      transitionDuration: parseFloat(style.transitionDuration),
      scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior
    };
  });
  expect(result.motion).toBeTruthy();
  expect(result.animationDuration).toBeLessThanOrEqual(0.001);
  expect(result.transitionDuration).toBeLessThanOrEqual(0.001);
  expect(result.scrollBehavior).toBe('auto');
});

test('high-contrast and forced-colours accessibility styles are present', async ({ request }) => {
  const response = await request.get('http://127.0.0.1:4173/ui-engine.css?v=3.3.78');
  expect(response.ok()).toBeTruthy();
  const css = await response.text();
  expect(css).toContain('@media (prefers-contrast: more)');
  expect(css).toContain('@media (forced-colors: active)');
  expect(css).toContain('outline: 2px solid Highlight');
  expect(css).toContain('color: LinkText');
});


test('cross-browser CSS fallbacks cover older engines without color-mix, :has, or backdrop-filter', async ({ request }) => {
  const response = await request.get('http://127.0.0.1:4173/ui-engine.css?v=3.3.78');
  expect(response.ok()).toBeTruthy();
  const css = await response.text();
  expect(css).toContain('@supports not (color: color-mix(in srgb, #000 50%, #fff))');
  expect(css).toContain('@supports not selector(.appearance-choice:has(input:checked))');
  expect(css).toContain('@supports not (backdrop-filter: blur(1px))');
  expect(css).toContain('--ie-safe-vh: 1vh');
  expect(css).toContain('@supports (height: 100svh)');
});

test('service-worker release query handling does not rely on URLSearchParams.size', async ({ request }) => {
  const response = await request.get('http://127.0.0.1:4173/sw.js');
  expect(response.ok()).toBeTruthy();
  const worker = await response.text();
  expect(worker).toContain('Array.from(url.searchParams).length === 1');
  expect(worker).not.toContain('url.searchParams.size');
});


test('browser engine and viewport primitives are available for compatibility diagnostics', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  const result = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    innerHeight: window.innerHeight,
    visualViewportHeight: window.visualViewport ? window.visualViewport.height : null,
    supportsColorMix: CSS.supports('color', 'color-mix(in srgb, #000 50%, #fff)'),
    supportsHas: CSS.supports('selector(:has(*))'),
    supportsBackdropFilter: CSS.supports('backdrop-filter', 'blur(1px)'),
    supportsSvH: CSS.supports('height', '100svh')
  }));
  expect(result.documentWidth, JSON.stringify({ browserName, ...result })).toBeLessThanOrEqual(result.viewportWidth + 2);
  expect(result.innerHeight).toBeGreaterThan(0);
  expect(result.viewportWidth).toBeGreaterThan(0);
  expect(typeof result.supportsColorMix).toBe('boolean');
  expect(typeof result.supportsHas).toBe('boolean');
  expect(typeof result.supportsBackdropFilter).toBe('boolean');
  expect(typeof result.supportsSvH).toBe('boolean');
});


test('Appearance Studio saves preferences across reloads and recovers from invalid stored values', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  const trigger = page.locator('#ie-personalise-trigger');
  await expect(trigger).toBeVisible({ timeout: 8000 });
  await trigger.click();
  await expect(page.locator('#ie-personalise-panel h2')).toHaveText('Appearance Studio');
  await page.locator('#ie-personalise-panel button[aria-label="Use Plum dusk theme"]').click();
  await expect(page.locator('#ie-personalise-panel button[aria-label="Use Plum dusk theme"]')).toHaveAttribute('aria-pressed', 'true');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ie-workspace-personalisation-v2')));
  expect(stored.palette).toBe('plum-dusk');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.ieWorkspaceTheme)).toBe('plum-dusk');
  await page.evaluate(() => localStorage.setItem('ie-workspace-personalisation-v2', JSON.stringify({ palette: 'not-a-theme', accent: 'nope', fontScale: 99 })));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.ieWorkspaceTheme)).toBe('midnight-studio');
  const recovered = await page.evaluate(() => JSON.parse(localStorage.getItem('ie-workspace-personalisation-v2')));
  expect(recovered.accent).toMatch(/^#[0-9a-f]{6}$/i);
  expect(recovered.fontScale).toBeLessThanOrEqual(1.3);
});

test('Appearance Studio remains usable without horizontal overflow on compact screens', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  const trigger = page.locator('#ie-personalise-trigger');
  await expect(trigger).toBeVisible({ timeout: 8000 });
  await trigger.click();
  await expect(page.locator('#ie-personalise-panel')).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    panel: document.querySelector('#ie-personalise-panel').getBoundingClientRect().width,
    panelRight: document.querySelector('#ie-personalise-panel').getBoundingClientRect().right
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 2);
  expect(dimensions.panel).toBeLessThanOrEqual(dimensions.viewport);
  expect(dimensions.panelRight).toBeLessThanOrEqual(dimensions.viewport + 1);
});


test('workspace shell uses responsive type and consistent component surfaces', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  const response = await page.request.get('http://127.0.0.1:4173/ui-engine.css?v=3.3.78');
  expect(response.ok()).toBeTruthy();
  const css = await response.text();
  expect(css).toContain('--ie-shell-max: 1440px');
  expect(css).toContain('3.3.78 — Workspace shell refresh');
  expect(css).toContain('@media (max-width: 420px)');
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    bodyFont: getComputedStyle(document.body).fontSize
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 2);
  expect(parseFloat(dimensions.bodyFont)).toBeGreaterThan(0);
});
