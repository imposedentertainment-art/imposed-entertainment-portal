import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, normalize } from 'node:path';

const root = process.cwd();
const errors = [];
const fail = (message) => errors.push(message);
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const version = read('VERSION').trim();
const html = read('index.html');
const worker = read('sw.js');
const cssPath = 'ui-engine.css';
const css = read(cssPath).replace(/\/\*[\s\S]*?\*\//g, '');

if (!version) fail('VERSION is empty.');
if (!html.includes(`content="${version}"`) || !html.includes(`data-portal-build="${version}"`)) fail('HTML build metadata does not match VERSION.');
if (!worker.includes(`const CACHE_NAME = 'imposed-jitter-v${version}'`)) fail('Service-worker cache name does not match VERSION.');
if (!html.includes(`/${cssPath}?v=${version}`)) fail('App shell must load the single versioned Jitter UI engine stylesheet.');
const cssLinks = [...html.matchAll(/<link\b(?=[^>]*\brel=["']stylesheet["'])[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)].map(m => m[1]).filter(href => href.startsWith('/'));
if (cssLinks.length !== 1 || !cssLinks[0].startsWith('/ui-engine.css?')) fail(`Expected one local UI stylesheet (ui-engine.css), found ${cssLinks.join(', ') || 'none'}.`);
let depth = 0;
for (const char of css) { if (char === '{') depth++; else if (char === '}') depth--; if (depth < 0) { fail('UI engine CSS has an unmatched closing brace.'); break; } }
if (depth !== 0) fail(`UI engine CSS has unbalanced braces (final depth ${depth}).`);
const assets = [...worker.matchAll(/['"]((?:\/[A-Za-z0-9_./-]+))['"]/g)].map(m => m[1]).filter(p => /\.(?:css|js|webmanifest|html|png|jpg|jpeg|webp|svg)$/i.test(p));
// A legacy URL may intentionally be absent because Cloudflare Pages redirects it to a canonical document.
const redirectSources = new Set(read('_redirects').split(/\r?\n/).map(line => line.trim().split(/\s+/)[0]).filter(Boolean));
for (const path of assets) if (!existsSync(resolve(root, path.slice(1))) && !redirectSources.has(path)) fail(`Service worker references missing asset: ${path}`);
const localRef = (value) => { if (!value || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(value)) return null; const path = value.split(/[?#]/,1)[0]; return path.startsWith('/') ? path.slice(1) : path; };
for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)) {
 const value = match[1], path = localRef(value);
 if (!path || ['privacy','privacy/','terms','terms/'].includes(path)) continue;
 const target = normalize(path);
 if (target.startsWith('..') || !existsSync(resolve(root,target))) fail(`HTML references a missing local asset: ${value}`);
 if (/\.(?:js|css)$/i.test(path) && new URL(value,'https://audit.invalid').searchParams.get('v') !== version) fail(`Local JS/CSS asset must use v=${version}: ${value}`);
}
const staticBlock = worker.match(/const STATIC_ASSETS\s*=\s*\[([\s\S]*?)\];/);
if (!staticBlock) fail('Service-worker STATIC_ASSETS list is missing.');
else {
 const allow = new Set([...staticBlock[1].matchAll(/['"]([^'"]+)['"]/g)].map(m => m[1]));
 if (!allow.has('/ui-engine.css')) fail('Service worker must allow-list ui-engine.css.');
 for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)) {
  const path = localRef(match[1]);
  if (path && /\.(?:js|css)$/i.test(path) && path !== 'config.js' && !allow.has('/'+path)) fail(`App shell asset missing from service-worker allow-list: ${match[1]}`);
 }
}
if (!read('_redirects').includes('/* /index.html 200')) fail('_redirects is missing the SPA fallback.');
if (!read('_headers').includes('Content-Security-Policy:')) fail('_headers is missing Content-Security-Policy.');
if (/service_role|SUPABASE_SECRET_KEY|sb_secret_/i.test(read('config.js'))) fail('config.js appears to contain a server-side Supabase secret.');
const migrationsDir = resolve(root,'supabase/migrations');
if (existsSync(migrationsDir)) {
 const migrations = readdirSync(migrationsDir).filter(name => /^\d{14}_.+\.sql$/.test(name));
 const versions = new Map();
 for (const name of migrations) { const key=name.slice(0,14); versions.set(key,(versions.get(key)||0)+1); }
 for (const [key,count] of versions) if(count>1) fail(`Duplicate Supabase migration prefix ${key} (${count} files).`);
}
if (errors.length) { console.error('Static-site audit failed:'); for (const error of errors) console.error(' - '+error); process.exitCode=1; }
else console.log(`Static-site audit passed for build ${version}: one Jitter UI stylesheet, valid CSS structure, versioned assets and deployment guards.`);
