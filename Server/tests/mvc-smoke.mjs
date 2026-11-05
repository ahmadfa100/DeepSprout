#!/usr/bin/env node
// Run with the MVC host listening on BASE_URL (default http://127.0.0.1:8765).
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const base = process.env.BASE_URL ?? 'http://127.0.0.1:8765';
const routes = JSON.parse(await readFile(join(root, 'Server/src/DeepSprout.Web/page-routes.json')));
const homeSource = (await readFile(join(root, 'Client/index.html'), 'utf8')).replaceAll('\r\n', '\n');
const home = await fetch(new URL('/', base));
assert.equal(home.status, 200);
assert.equal((await home.text()).replaceAll('\r\n', '\n'), homeSource, 'MVC home route');

for (const { path: route } of routes) {
  const response = await fetch(new URL(`/${route}`, base));
  assert.equal(response.status, route === '404.html' ? 404 : 200, route);
  assert.match(response.headers.get('content-type') ?? '', /text\/html/, route);
  const source = (await readFile(join(root, 'Client', route), 'utf8')).replaceAll('\r\n', '\n');
  const rendered = (await response.text()).replaceAll('\r\n', '\n');
  assert.equal(rendered, source, `Rendered markup changed: ${route}`);
}

for (const asset of ['assets/brand/logo.png', 'src/styles/style.css', 'src/workspaces/app.js']) {
  const response = await fetch(new URL(`/${asset}`, base));
  assert.equal(response.status, 200, asset);
  assert.ok(Number(response.headers.get('content-length')) > 0, asset);
}

const missing = await fetch(new URL('/no-such-page.html', base));
assert.equal(missing.status, 404);
assert.match(await missing.text(), /Page not found/);

process.stdout.write(`MVC smoke passed: home, ${routes.length} views, 3 assets, custom 404\n`);
