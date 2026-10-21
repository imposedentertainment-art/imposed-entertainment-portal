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
  if (/\.(?:js|css)$/i.test(path) && !new URL(value, 'https://audit.invalid').searchParams.has('v')) {
    warnings.push(`Local script/stylesheet is not versioned for cache invalidation: ${value}`);
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
  for (const path of paths) {
    if (!path.startsWith('/')) fail(`Service-worker asset path must be root-relative: ${path}`);
    else if (!existsSync(resolve(root, path.slice(1)))) fail(`Service-worker allow-list references a missing file: ${path}`);
  }
}

for (const path of ['styles.css', 'ui-polish.css', 'personalise.css', 'quality.css', 'theme-system.css', 'auth-overhaul.css', 'v2-design-system.css']) {
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
