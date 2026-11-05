#!/usr/bin/env node
// Mirror website HTML into feature-grouped Razor views while preserving URLs.
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const client = join(root, 'Client');
const web = join(root, 'Server', 'src', 'DeepSprout.Web');
const check = process.argv.includes('--check');

async function htmlFiles(folder) {
  const found = [];
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) found.push(...await htmlFiles(path));
    else if (entry.isFile() && entry.name.endsWith('.html')) found.push(path);
  }
  return found;
}

// Extension documents run in Chrome. The seed page is a test fixture.
const routes = (await htmlFiles(client))
  .map(path => relative(client, path).replaceAll('\\', '/'))
  .filter(path => !path.startsWith('extensions/') && !path.startsWith('tests/'))
  .sort();

const pascal = name => name.replace(/(^|-)([a-z0-9])/g, (_, prefix, char) => char.toUpperCase());

function viewFor(route) {
  if (route === '404.html') return 'Shared/NotFound';
  if (route === 'index.html') return 'Home/Index';
  if (route === 'workspaces.html') return 'Workspaces/Index';
  if (route === 'join.html') return 'Workspaces/Join';
  if (route === 'admin.html') return 'Admin/Index';
  if (route === 'hero-lab.html') return 'Labs/Hero';
  if (route === 'hero-lab-v2.html') return 'Labs/HeroV2';
  if (route === 'hero-reels-lab.html') return 'Labs/HeroReels';

  const parts = route.split('/');
  if (parts[0] === 'src' && parts[1] === 'pages') {
    const [, , area, , filename] = parts;
    if (area === 'demo' && parts.length === 4) return `Demo/${pascal(parts[3].slice(0, -5))}`;
    if (area === 'auth') return `Auth/${pascal(filename.slice(0, -5))}`;
    if (area === 'member') return `Member/${pascal(filename.slice(0, -5))}`;
    if (area === 'public') {
      const [, , , section] = parts;
      return `Public/${pascal(section === 'home' ? 'home-entry' : section)}`;
    }
  }

  if (parts.length === 1) return `Entry/${pascal(route.slice(0, -5))}`;
  throw new Error(`No MVC view group for ${route}`);
}

const pageRoutes = routes.map(path => ({ path, view: viewFor(path) }));
const uniqueViews = new Set(pageRoutes.map(page => page.view));
if (uniqueViews.size !== pageRoutes.length) throw new Error('Two page URLs map to the same Razor view');

for (const { path, view } of pageRoutes) {
  const source = await readFile(join(client, path), 'utf8');
  const target = join(web, 'Views', `${view}.cshtml`);
  // Razor's @@ escape emits one literal @. All other markup stays intact.
  const expected = source.replaceAll('@', '@@');
  if (check) {
    const actual = await readFile(target, 'utf8').catch(() => null);
    if (actual !== expected) throw new Error(`MVC view differs from Client/${path}`);
  } else {
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, expected);
  }
}

const manifest = join(web, 'page-routes.json');
const expectedManifest = JSON.stringify(pageRoutes, null, 2) + '\n';
if (check) {
  const actual = await readFile(manifest, 'utf8').catch(() => null);
  if (actual !== expectedManifest) throw new Error('MVC page manifest differs from Client page inventory');
} else {
  await writeFile(manifest, expectedManifest);
}
process.stdout.write(`${check ? 'Verified' : 'Synced'} ${routes.length} website pages in MVC Views\n`);
