#!/usr/bin/env node
// Smoke test for the MVC site. Start it first:  dotnet run --project src/DeepSprout.Web
// Checks public pages, anonymous challenges for protected pages, and local assets.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const web = join(root, 'src/DeepSprout.Web');
const base = process.env.BASE_URL ?? 'http://127.0.0.1:8765';
const routes = JSON.parse(await readFile(join(web, 'page-routes.json')));
const norm = (text) => text.replaceAll('\r\n', '\n');
const comparableView = text => norm(text)
  .replace(/^@addTagHelper[^\n]*\n/m, '')
  .replace(/ asp-append-version="true"/g, '')
  .replace(/((?:href|src)=")~\//g, '$1/')
  .replace(/\?v=[A-Za-z0-9_-]+(?=")/g, '');

const home = await fetch(new URL('/', base));
assert.equal(home.status, 200, 'home');
const homeView = norm(await readFile(join(web, 'Views/Home/Index.cshtml'), 'utf8')).replaceAll('@@', '@');
assert.equal(norm(await home.text()), homeView, 'home markup');

const problems = [];
const checked = new Map();
async function exists(url) {
  const key = url.split('#')[0].split('?')[0];
  if (!checked.has(key)) {
    const response = await fetch(key);
    checked.set(key, response.status);
  }
  return checked.get(key);
}

for (const { path: route, view } of routes) {
  const protectedPage = route.startsWith('src/pages/member/') || [
    'dashboard.html', 'profile.html', 'community.html', 'explore.html',
    'garden.html', 'insights.html', 'lab.html', 'onboarding.html',
    'recovery-plan.html', 'shield.html', 'training.html', 'weekly-review.html'
  ].includes(route);
  const response = await fetch(new URL(`/${route}`, base), { redirect: 'manual' });
  if (protectedPage) {
    assert.equal(response.status, 302, route);
    assert.match(response.headers.get('location') ?? '', /^\/src\/pages\/auth\/login\/login\.html\?returnUrl=/, route);
    continue;
  }
  assert.equal(response.status, route === '404.html' ? 404 : 200, route);
  assert.match(response.headers.get('content-type') ?? '', /text\/html/, route);
  const rendered = norm(await response.text());
  const source = norm(await readFile(join(web, 'Views', `${view}.cshtml`), 'utf8')).replaceAll('@@', '@');
  if (route.startsWith('src/pages/auth/')) {
    assert.match(rendered, /name="__RequestVerificationToken"/, route);
    assert.match(rendered, /method="post"/, route);
  } else {
    assert.equal(comparableView(rendered), comparableView(source), `Rendered markup differs from view: ${route}`);
  }

  const pageUrl = new URL(`/${route}`, base);
  for (const match of rendered.matchAll(/\b(?:href|src)\s*=\s*"([^"]+)"/g)) {
    const ref = match[1];
    if (/^(https?:|mailto:|tel:|data:|blob:|javascript:|#|\/\/)/i.test(ref) || ref.includes('{{') || ref.includes('${')) continue;
    const target = new URL(ref, pageUrl);
    if (target.origin !== pageUrl.origin) continue;
    const status = await exists(target.href);
    if (status >= 400) problems.push(`${route} -> ${ref} (${status})`);
  }
}

const missing = await fetch(new URL('/no-such-page.html', base));
assert.equal(missing.status, 404);
assert.match(await missing.text(), /Page not found/);

if (problems.length) {
  console.error(`Broken local references (${problems.length}):\n` + problems.join('\n'));
  process.exit(1);
}
console.log(`MVC smoke passed: home, ${routes.length} routes, ${checked.size} unique local resources resolved, custom 404`);
