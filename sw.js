/* Imposed Entertainment v3.3.90: versioned static assets; never cache query-bearing navigations/auth callbacks. */
const CACHE_NAME = 'imposed-jitter-v3.3.90';
const STATIC_ASSETS = [
  '/engines/cloud-os.js',
  '/engines/null-core.js',
  '/engines/prism.js',
  '/ui-engine.css',
  '/index.html',
  '/themes/light-skies.jpg', '/themes/midnight-studio.jpg', '/themes/graphite-minimal.jpg', '/themes/plum-dusk.jpg', '/themes/forest-room.jpg', '/js/shop.js', '/manifest.webmanifest', '/privacy/index.html', '/terms/index.html',
  '/img/logo-64.png', '/img/logo-128.png', '/img/logo-192.png', '/img/logo-512.png',
  '/js/i18n.js', '/js/core.js', '/js/boot.js', '/js/data.js', '/js/audio.js',
  '/js/extras.js', '/js/podcasts.js', '/js/business.js', '/js/views.js', '/js/release.js', '/js/profiles.js', '/js/support-assistant.js', '/help/index.html', '/knowledge/index.html', 
  '/js/ui-targeted-fixes.js', '/js/discography.js', '/js/studio.js', '/js/vault.js', '/js/captcha.js', '/js/events.js', '/js/personalise.js', '/js/quality.js', 
];
const STATIC_PATHS = new Set(STATIC_ASSETS.map(path => new URL(path, self.location.origin).pathname));
const NETWORK_TIMEOUT_MS = 7000;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Keep first-install activation fast: precache only the app shell and legal documents.
    // Other allow-listed assets are cached as they are requested by the app.
    const criticalAssets = [
      '/ui-engine.css',
      '/index.html', '/engines/null-core.js', '/engines/cloud-os.js', '/engines/prism.js', '/js/personalise.js', '/js/quality.js', '/js/i18n.js', '/js/core.js', '/js/boot.js',
      '/privacy/index.html', '/terms/index.html', '/img/logo-128.png'
    ];
    await Promise.allSettled(criticalAssets.map(async path => {
      try {
        const response = await fetch(path, { cache: 'reload' });
        if (response.ok && response.type === 'basic') await cache.put(path, response);
      } catch (_) { /* Optional/offline assets must not prevent install. */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => event.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter(key => key.startsWith('imposed-') && key !== CACHE_NAME).map(key => caches.delete(key)));
  await self.clients.claim();
})()));

async function fetchWithTimeout(request) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
  try { return await fetch(new Request(request, { signal: controller.signal })); }
  finally { clearTimeout(timer); }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/config.js' || url.pathname === '/sw.js') return;

  const isNavigation = request.mode === 'navigate';
  const isStaticAsset = STATIC_PATHS.has(url.pathname);
  // Only accept the known release query on allow-listed public assets. All other query-bearing
  // requests (auth codes, invites, search state, user-specific data) bypass Cache Storage.
  const releaseVersion = CACHE_NAME.slice(CACHE_NAME.lastIndexOf('-v') + 2);
  const isVersionedStaticAsset = isStaticAsset && Array.from(url.searchParams).length === 1 && url.searchParams.get('v') === releaseVersion;
  if ((url.search && !isVersionedStaticAsset) || url.hash || /\/(auth|callback|invite)(\/|$)/i.test(url.pathname)) return;
  if (!isNavigation && !isStaticAsset) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetchWithTimeout(request);
      // Cache only allow-listed public assets, never HTML navigation responses or user-specific data.
      if (isStaticAsset && !isNavigation && response && response.ok && response.type === 'basic') {
        cache.put(url.pathname, response.clone()).catch(() => {});
      }
      return response;
    } catch (_) {
      if (isStaticAsset) {
        const cachedAsset = await cache.match(url.pathname);
        if (cachedAsset) return cachedAsset;
      }
      if (isNavigation) {
        const path = url.pathname.replace(/\/+$/, '') || '/';
        if (path === '/privacy' || path === '/privacy.html') {
          const legal = await cache.match('/privacy/index.html');
          if (legal) return legal;
        }
        if (path === '/terms' || path === '/terms.html') {
          const legal = await cache.match('/terms/index.html');
          if (legal) return legal;
        }
        if (path === '/help' || path === '/help/') {
          const help = await cache.match('/help/index.html');
          if (help) return help;
        }
        if (path === '/knowledge' || path === '/knowledge/') {
          const knowledge = await cache.match('/knowledge/index.html');
          if (knowledge) return knowledge;
        }
        // Serve the cached app shell for known SPA paths; preserve the address bar URL.
        const spaPaths = new Set(['/','/index.html','/dashboard','/listen','/listen/account','/support','/settings','/earnings','/statements','/operations','/notifications','/activity','/bands','/roster','/discover','/listen/artist','/link','/discography','/podcasts','/calendar','/insights','/pipeline','/studio','/vault','/business','/builder','/shop','/shop/manage']);
        if (spaPaths.has(path) || (path.startsWith('/profile/') && path.endsWith('/edit') && path.split('/').length===4) || /^\/(release|profile|listen\/artist|link)\/[^/]+$/.test(path)) {
          const shell = await cache.match('/index.html');
          if (shell) return shell;
        }
      }
      return new Response('You appear to be offline. Reconnect and reload Imposed Entertainment.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'Retry-After': '10' }
      });
    }
  })());
});
