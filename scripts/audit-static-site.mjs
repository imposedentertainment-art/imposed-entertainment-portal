import { readFileSync, existsSync, readdirSync } from 'node:fs';
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


const migrationDir = resolve(root, 'supabase/migrations');
if (existsSync(migrationDir)) {
  const migrations = readdirSync(migrationDir).filter(name => /^\d{14}_.+\.sql$/.test(name));
  const byVersion = new Map();
  for (const name of migrations) {
    const migrationVersion = name.slice(0, 14);
    byVersion.set(migrationVersion, [...(byVersion.get(migrationVersion) || []), name]);
  }
  for (const [migrationVersion, names] of byVersion) {
    if (names.length > 1) warnings.push(`Duplicate Supabase migration version prefix ${migrationVersion}: ${names.join(', ')}. Reconcile before using the Supabase CLI to push or reset schema.`);
  }
}

if (!version) fail('VERSION is empty.');
for (const [label, source] of [['index.html', html], ['sw.js', worker]]) {
  if (!source.includes(version)) fail(`${label} does not contain the current VERSION (${version}).`);
}
if (!html.includes(`content="${version}"`) || !html.includes(`data-portal-build="${version}"`)) {
  fail('index.html build metadata does not match VERSION.');
}
if (!worker.includes(`const CACHE_NAME = 'imposed-v${version}'`)) fail('sw.js cache name does not match VERSION.');
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
const events = read('js/events.js');
const boot = read('js/boot.js');
const personalisation = read('js/personalise.js');
const navigationCss = read('mobile-navigation.css');
const core = read('js/core.js');
const personalisationFixes = read('ui-personalisation-fixes.css');
const themeOverhaul = read('ui-theme-overhaul.css');
const coreIcons = read('js/core.js');

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
if (!personalisation.includes("palette:'midnight-studio'") ||
    !personalisation.includes("'palette','density'")) {
  fail('Workspace theme preference must be validated and included in settings import/export.');
}
if (!html.includes('/ui-theme-overhaul.css?v=' + version) ||
    !worker.includes("'/ui-theme-overhaul.css'")) {
  fail('Full theme stylesheet must be versioned and included in the service-worker asset allow-list.');
}
if (!themeOverhaul.includes('personalise-palette-light-skies') ||
    !themeOverhaul.includes('radial-gradient') ||
    !themeOverhaul.includes('personalise-palette-forest-room')) {
  fail('Named themes must include the Light Skies cloud treatment and alternate complete themes.');
}
if (!personalisation.includes("['light-skies','Light skies · blue & cloud']") ||
    !personalisation.includes("'light-skies','midnight-studio','graphite-minimal','plum-dusk','forest-room'")) {
  fail('Theme picker must expose the new named themes and validate saved selections.');
}
['briefcase-business','mic-vocal','chart-no-axes-combined','panel-left-open','panel-left-close','check-square','shopping-bag','headphones'].forEach(name => {
  if (!personalisation.includes('root.dataset.ieMode=') || !personalisation.includes('root.dataset.ieWorkspaceTheme=')) fail('Quick customiser must apply saved mode and workspace palette to the shared semantic theme attributes.');
if (!personalisation.includes('workspaceTheme:state.palette') || !events.includes("workspaceTheme:['light-skies','midnight-studio','graphite-minimal','plum-dusk','forest-room'].includes(s.workspaceTheme)")) fail('Quick customiser must sync the selected workspace theme to account preferences.');
if (!core.includes("['dark','light','system','amoled'].includes(out.mode)") || !core.includes("['dark','light','system','amoled'].includes(a.mode)") || !events.includes("['dark','light','system','amoled'].includes(next.mode)") || !views.includes('value="amoled"') || !themeOverhaul.includes('html[data-ie-mode="amoled"] body')) fail('AMOLED mode must be selectable, persisted, validated and styled end to end.');
if (!coreIcons.includes("'" + name + "':") && !coreIcons.includes(name + ':')) fail('SVG icon map is missing navigation icon: ' + name);
});
if (!coreIcons.includes("p[name]||p.music")) fail('Unknown icon names must use a visible SVG fallback.');
if (!personalisationFixes.includes('.nav-accordion > button.active') ||
    !personalisationFixes.includes('var(--user-accent, #d8bd73)') ||
    !personalisationFixes.includes('personalise-palette-forest')) {
  fail('Personalisation CSS must map active navigation to the chosen accent and include workspace palettes.');
}
if (!worker.includes("'/ui-personalisation-fixes.css'") ||
    !html.includes('/ui-personalisation-fixes.css?v=' + version)) {
  fail('Personalisation fixes stylesheet must be versioned and included in the service-worker asset allow-list.');
}
if (!personalisation.includes("s.addEventListener('change',function(){state[key]=s.value;pendingTouchedKey=key;save()})") ||
    !personalisation.includes("input.addEventListener('change',function(){state[key]=input.checked;pendingTouchedKey=key;save()")) {
  fail('Personalisation controls must persist changes instead of only changing their preview.');
}
if (!boot.includes('Retry a single transient Supabase Auth failure') ||
    !boot.includes('const transient=Number(lastError?.status)>=500')) {
  fail('Supabase startup must retry transient session-read failures.');
}
if (!core.includes('if(refreshed.error)throw refreshed.error') ||
    !core.includes('Your session could not be refreshed')) {
  fail('Storage uploads must not continue with a stale access token after refresh failure.');
}



if (personalisation.includes("palette:'midnight'")) fail('Personalisation defaults must use the current named theme system.');
if (!themeOverhaul.includes('body.personalise-theme-light') ||
    !themeOverhaul.includes('--ui-text:#172536') ||
    !themeOverhaul.includes('personalise-font-mono') ||
    !themeOverhaul.includes('personalise-content-wide') ||
    !themeOverhaul.includes('personalise-motion-none') ||
    !themeOverhaul.includes('var(--user-accent,#d8bd73)')) {
  fail('Light mode, typography, layout, motion, and accent preferences must map to semantic UI tokens.');
}
if ((views.match(/data-action="settings"[^>]*>\$\{icon\('settings',17\)\} Account settings/g) || []).length > 0) {
  fail('Mobile navigation must not show a duplicate Account settings action alongside Settings & preferences.');
}
if (html.includes('2.8.2') || worker.includes('2.8.2')) fail('HTML and service worker must not retain stale 2.8.2 asset versions.');
const criticalAssetsBlock = worker.match(/const criticalAssets = \[([\s\S]*?)\];/);
if (!criticalAssetsBlock || !criticalAssetsBlock[1].includes("'/ui-theme-overhaul.css'") || !criticalAssetsBlock[1].includes("'/js/personalise.js'")) {
  fail('Theme overhaul CSS and personalisation script must be included in critical service-worker assets.');
}


if (!core.includes("workspaceTheme:'midnight-studio'") ||
    !core.includes("root.dataset.ieWorkspaceTheme") ||
    !events.includes("workspaceTheme:['light-skies','midnight-studio','graphite-minimal','plum-dusk','forest-room']")) {
  fail('Named workspace themes must be stored, validated and applied through shared account preferences.');
}
if (!views.includes('Workspace themes') ||
    !views.includes('data-workspace-theme') ||
    !views.includes('Light Skies') ||
    !views.includes('Midnight Studio') ||
    !views.includes('Graphite Minimal') ||
    !views.includes('Plum Dusk') ||
    !views.includes('Forest Room')) {
  fail('All five named themes must be selectable from Settings > Appearance.');
}
if (!themeOverhaul.includes('html[data-ie-mode="light"] body') ||
    !themeOverhaul.includes('html[data-ie-mode="light"][data-ie-theme] body .nav') ||
    !themeOverhaul.includes('html[data-ie-mode="light"][data-ie-workspace-theme="light-skies"] body') ||
    !core.includes("root.style.setProperty('--user-accent',accent)")) {
  fail('Light mode must override legacy dark navigation and surfaces, Light Skies must keep its cloud palette, and account accents must be global.');
}
if (html.includes('2.8.4') || worker.includes('2.8.4')) fail('HTML and service worker must not retain stale 2.8.4 asset versions.');

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


/* Regression guards for the artist workspace visual system. */
const repairCss = read('ui-ux-repair.css');
const dashboardCss = read('ui-dashboard-finish.css');
const resizeCss = read('ui-dashboard-resize.css');
for (const palette of ['light-skies','midnight-studio','graphite-minimal','plum-dusk','forest-room']) {
  if (!repairCss.includes(`/themes/${palette}.jpg`)) fail(`Artist workspace must map the ${palette} palette to its background artwork.`);
}
if (/body:not\(\.personalise-hide-decorative\)\s*\{[^}]*background-image\s*:/s.test(repairCss)) {
  fail('Global repair CSS must not override the selected palette background image.');
}
if (repairCss.includes('grid-column:var(--dashboard-grid-column,span 12)!important')) {
  fail('Global repair CSS must not force every dashboard widget to full width.');
}
if (!resizeCss.includes('[data-widget-size="half"]') || !resizeCss.includes('[data-widget-size="third"]')) {
  fail('Dashboard layout must retain half-width and third-width widget sizing.');
}
if (!dashboardCss.includes('var(--ie-theme-art)')) {
  fail('Dashboard hero must use the active workspace theme artwork.');
}
if (!html.includes('ui-ux-repair.css?v=' + version) || !worker.includes("'/ui-ux-repair.css'")) {
  fail('Final UI repair layer must be versioned and available to the service worker.');
}


if (!core.includes("localStorage.getItem('ie-workspace-personalisation-v2')") ||
    !core.includes("ie-workspace-personalisation-touched-v1") ||
    !core.includes("locallyChosen('palette'") ||
    !core.includes("locallyChosen('theme'")) {
  fail('Device themes and colour mode must remain available when an account has no saved appearance preference.');
}
for (const palette of ['light-skies','midnight-studio','graphite-minimal','plum-dusk','forest-room']) {
  if (!themeOverhaul.includes(`html[data-ie-workspace-theme="${palette}"] body`) ||
      !themeOverhaul.includes(`/themes/${palette}.jpg`)) {
    fail(`The ${palette} theme must apply its real background artwork to every route, not only the label dashboard.`);
  }
}
if (!themeOverhaul.includes('.page:not(.dashboard-page) > .page-heading') ||
    !repairCss.includes('.artist-profile-page') ||
    !themeOverhaul.includes('@media(max-width:700px)')) {
  fail('Non-label pages need shared responsive page hierarchy and artist/public profile styling.');
}


/* Supabase source parity: applied migrations and active Edge Functions remain reproducible. */
const supabaseFunctionConfig = read('supabase/config.toml');
const expectedEdgeFunctions = [
  ['send-portal-email', true],
  ['verify-turnstile', false],
  ['portal-health', true],
  ['printful-catalog', true],
];
for (const [name, verifyJwt] of expectedEdgeFunctions) {
  const sourcePath = `supabase/functions/${name}/index.ts`;
  if (!existsSync(resolve(root, sourcePath))) fail(`Supabase Edge Function source is missing: ${sourcePath}`);
  const expectedConfig = `[functions.${name}]\nverify_jwt = ${verifyJwt}`;
  if (!supabaseFunctionConfig.includes(expectedConfig)) fail(`Supabase JWT gateway configuration is missing or incorrect for ${name}.`);
  if (existsSync(resolve(root, sourcePath)) && /\b(?:sb_secret_[A-Za-z0-9_-]{20,}|sk_(?:live|test)_[A-Za-z0-9]{16,}|whsec_[A-Za-z0-9]{16,})\b/i.test(read(sourcePath))) fail(`Possible hard-coded provider secret found in ${sourcePath}.`);
}
for (const palette of ['light-skies','midnight-studio','graphite-minimal','plum-dusk','forest-room']) {
  if (!repairCss.includes(`html[data-ie-workspace-theme="${palette}"][data-ie-mode] body`)) {
    fail(`Final CSS cascade can override the ${palette} theme background in light mode.`);
  }
}
if (!personalisation.includes("TOUCH_KEY='ie-workspace-personalisation-touched-v1'") ||
    !personalisation.includes('pendingTouchedKey=key;save()') ||
    !core.includes("locallyChosen('palette'") ||
    !core.includes("locallyChosen('theme'")) {
  fail('Explicit local appearance choices must survive account-level default preference loading.');
}

if (errors.length) {
  console.error('Static-site audit failed:');
  for (const error of errors) console.error(` - ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Static-site audit passed for version ${version}.`);
}
for (const warning of warnings) console.warn(`Warning: ${warning}`);
