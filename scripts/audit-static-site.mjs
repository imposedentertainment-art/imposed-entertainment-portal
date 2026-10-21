import { readFileSync, existsSync } from 'node:fs';
import { resolve, normalize } from 'node:path';

const root = process.cwd();
const errors = [];
const warnings = [];
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const fail = (message) => errors.push(message);
const version = read('VERSION').trim();
const html = read('index.html');
const worker = read('sw.js');
const config = read('config.js');

if (!version) fail('VERSION is empty.');
for (const [label, source] of [['index.html', html], ['sw.js', worker]]) {
  if (!source.includes(version)) fail(`${label} does not contain the current VERSION (${version}).`);
}
if (!html.includes(`content="${version}"`) || !html.includes(`data-portal-build="${version}"`)) {
  fail('index.html build metadata does not match VERSION.');
}
if (!worker.includes(`'${version}'`)) fail('sw.js versioned-static-asset allow-list does not match VERSION.');
try {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  if (manifest.start_url && new URL(manifest.start_url, 'https://audit.invalid').search) {
    fail('manifest.webmanifest start_url must not contain a query string because query-bearing navigations bypass the service-worker cache.');
  }
} catch (error) {
  fail(`manifest.webmanifest is not valid JSON: ${error.message}`);
}
if (html.includes('\\\\n  <link')) fail('index.html contains a literal escaped newline before a stylesheet link.');
if (!read('_redirects').includes('/* /index.html 200')) fail('_redirects is missing the SPA fallback.');
if (!read('_headers').includes('Content-Security-Policy:')) fail('_headers is missing Content-Security-Policy.');
if (!read('_headers').includes('Cache-Control: no-store')) fail('_headers is missing no-store protection for configuration/private responses.');
if (/service_role|SUPABASE_SECRET_KEY|sb_secret_/i.test(config)) fail('config.js appears to contain a server-side Supabase secret.');

// Cross-file regression checks for navigation, routes and saved interface preferences.
const views = read('js/views.js');
const boot = read('js/boot.js');
const personalisation = read('js/personalise.js');
const navigationCss = read('mobile-navigation.css');
const core = read('js/core.js');
const personalisationFixes = read('ui-personalisation-fixes.css');

if (!views.includes('mobile-menu icon-btn') || !views.includes('id="mobile-navigation-menu"')) {
  fail('Workspace navigation trigger and mobile menu container must both exist.');
}
if (!views.includes('class="nav-link nav-shop-link" href="/shop"') || !views.includes('class="nav-shop-link" href="/shop"')) {
  fail('Shop must be directly reachable from desktop and mobile workspace navigation.');
}
if (!boot.includes("path==='/shop'") || !boot.includes("path==='/shop/manage'") || !boot.includes('renderShopRoute()')) {
  fail('Shop catalogue and product-management routes must be recognised by the app router.');
}
if (!navigationCss.includes('.nav-inner>.mobile-menu') || !navigationCss.includes('.mobile-nav')) {
  fail('Mobile navigation styles must target the actual nested menu trigger and drawer.');
}
if (!personalisation.includes("palette:'midnight'") ||
    !personalisation.includes("['midnight','graphite','navy','plum','forest']") ||
    !personalisation.includes("'palette','density'")) {
  fail('Workspace palette preference must be validated, applied, and included in settings import/export.');
}
if (!personalisationFixes.includes('.nav-accordion > button.active') ||
    !personalisationFixes.includes('var(--user-accent, #d8bd73)') ||
    !personalisationFixes.includes('personalise-palette-forest')) {
  fail('Personalisation CSS must map active navigation to the chosen accent and include workspace palettes.');
}
if (!worker.includes("'/ui-personalisation-fixes.css'") ||
    !html.includes('/ui-personalisation-fixes.css?v=' + version)) {
  fail('Personalisation fixes stylesheet must be versioned and included in the service-worker asset allow-list.');
}
if (!personalisation.includes("s.addEventListener('change',function(){state[key]=s.value;save()})") ||
    !personalisation.includes("input.addEventListener('change',function(){state[key]=input.checked;save()")) {
  fail('Personalisation controls must persist changes instead of only changing their preview.');
if (!boot.includes('Retry a single transient Supabase Auth failure') ||
    !boot.includes('const transient=Number(lastError?.status)>=500')) {
  fail('Supabase startup must retry transient session-read failures.');
}
if (!core.includes('if(refreshed.error)throw refreshed.error') ||
    !core.includes('Your session could not be refreshed')) {
  fail('Storage uploads must not continue with a stale access token after refresh failure.');
}
}


const localRef = (value) => {
  if (!value || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(value)) return null;
  const pathname = value.split(/[?#]/, 1)[0];
  if (!pathname) return null;
  return pathname.startsWith('/') ? pathname.slice(1) : pathname;
};
for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)) {
  const value = match[1];
  const path = localRef(value);
  if (!path) continue;
  // These are intentional route aliases handled by Cloudflare Pages _redirects.
  if (['privacy', 'privacy/', 'terms', 'terms/'].includes(path)) continue;
  const target = normalize(path);
  if (target.startsWith('..') || !existsSync(resolve(root, target))) {
    fail(`index.html references a missing local asset: ${value}`);
  }
  if (/\.(?:js|css)$/i.test(path)) {
    const assetVersion = new URL(value, 'https://audit.invalid').searchParams.get('v');
    if (assetVersion !== version) fail(`Local script/stylesheet must use v=${version}: ${value}`);
  }
}

const ids = new Map();
for (const match of html.matchAll(/\bid=["']([^"']+)["']/gi)) {
  const id = match[1];
  ids.set(id, (ids.get(id) || 0) + 1);
}
for (const [id, count] of ids) if (count > 1) fail(`index.html contains duplicate id="${id}" (${count} occurrences).`);

const staticBlock = worker.match(/const STATIC_ASSETS\s*=\s*\[([\s\S]*?)\];/);
if (!staticBlock) fail('sw.js STATIC_ASSETS allow-list could not be parsed.');
else {
  const paths = [...staticBlock[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
  const allowList = new Set(paths);
  for (const path of paths) {
    if (!path.startsWith('/')) fail(`Service-worker asset path must be root-relative: ${path}`);
    else if (!existsSync(resolve(root, path.slice(1)))) fail(`Service-worker allow-list references a missing file: ${path}`);
  }
  // All local JS/CSS loaded by the app shell must be eligible for offline caching,
  // except config.js, which is intentionally network-only and bypassed by the worker.
  for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)) {
    const value = match[1];
    const path = localRef(value);
    if (path && /\.(?:js|css)$/i.test(path) && path !== 'config.js' && !allowList.has('/' + path)) {
      fail(`HTML loads a local script/stylesheet missing from the service-worker allow-list: ${value}`);
    }
  }
}

// Audit every stylesheet linked by the actual HTML shell so newly added design layers
// cannot silently escape the CSS integrity checks.
const stylesheetPaths = [...new Set(
  [...html.matchAll(/<link\b[^>]*\bhref=["']([^"']+\.css(?:\?[^"']*)?)["'][^>]*>/gi)]
    .map((match) => localRef(match[1]))
    .filter(Boolean)
)];
for (const path of stylesheetPaths) {
  if (!existsSync(resolve(root, path))) continue; // Missing references are reported above.
  const css = read(path).replace(/\/\*[\s\S]*?\*\//g, '');
  const opens = (css.match(/{/g) || []).length;
  const closes = (css.match(/}/g) || []).length;
  if (opens !== closes) fail(`${path} has unbalanced CSS braces (${opens} opening, ${closes} closing).`);
}

if (errors.length) {
  console.error('Static-site audit failed:');
  for (const error of errors) console.error(` - ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Static-site audit passed for version ${version}.`);
}
for (const warning of warnings) console.warn(`Warning: ${warning}`);
