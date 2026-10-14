/**
 * Static wiring check for the member pages.
 *
 * Catches the failure modes that break a demo silently: a script reaching for
 * an element id the markup does not define, an <use href="#icon"> with no
 * matching <symbol>, and a src/href pointing at a file that is not there.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const problems = [];

/** Pages to check, as [html, ...scripts the page loads]. */
const pages = [
  ['src/pages/member/onboarding/onboarding.html'],
  ['src/pages/member/onboarding/starting-point.html'],
  ['src/pages/member/lab/lab.html'],
  ['src/pages/member/lab/assessment.html'],
  ['src/pages/member/explore/explore.html'],
  ['src/pages/member/profile/profile.html'],
  ['src/pages/member/weekly-review/weekly-review.html'],
  ['src/pages/member/training/training.html'],
  ['src/pages/member/insights/insights.html'],
  ['src/pages/member/community/community.html'],
  ['src/pages/member/recovery-plan/recovery-plan.html'],
  ['index.html']
];

const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const matchAll = (text, pattern) => [...text.matchAll(pattern)].map(match => match[1]);

for (const [page] of pages) {
  if (!fs.existsSync(path.join(root, page))) {
    problems.push(`${page}: file is missing`);
    continue;
  }
  const dir = path.dirname(page);
  const html = read(page);

  const ids = new Set(matchAll(html, /\sid="([^"]+)"/g));
  const symbols = new Set(matchAll(html, /<symbol id="([^"]+)"/g));

  // Every local asset and script referenced by the page must exist.
  const refs = [
    ...matchAll(html, /\ssrc="([^"]+)"/g),
    ...matchAll(html, /<link[^>]+href="([^"]+)"/g)
  ].filter(ref => !/^(https?:)?\/\//.test(ref) && !ref.startsWith('data:'));

  for (const ref of refs) {
    const target = path.resolve(root, dir, ref.split(/[?#]/)[0]);
    if (!fs.existsSync(target)) problems.push(`${page}: missing file "${ref}"`);
  }

  // Every icon reference must resolve to a symbol defined on the page.
  for (const use of matchAll(html, /<use href="#([^"]+)"/g)) {
    if (!symbols.has(use)) problems.push(`${page}: <use href="#${use}"> has no matching <symbol>`);
  }

  // Scripts the page loads from its own folder: check their element lookups.
  const scripts = matchAll(html, /<script src="([^"]+)"/g)
    .filter(src => !src.startsWith('http'));

  for (const script of scripts) {
    const file = path.resolve(root, dir, script);
    if (!fs.existsSync(file)) continue;
    const code = fs.readFileSync(file, 'utf8');

    // Only check pages' own scripts — shared modules are used by many pages.
    if (!file.includes(path.resolve(root, dir)) || /[\\/]src[\\/](layouts|js)[\\/]/.test(file)) continue;

    for (const lookup of matchAll(code, /getElementById\('([^']+)'\)/g)) {
      if (!ids.has(lookup)) problems.push(`${page}: ${script} looks up #${lookup}, not in the markup`);
    }
    for (const lookup of matchAll(code, /querySelector(?:All)?\('#([a-zA-Z0-9-]+)'\)/g)) {
      if (!ids.has(lookup)) problems.push(`${page}: ${script} queries #${lookup}, not in the markup`);
    }
    for (const icon of matchAll(code, /href="#(i-[a-z-]+)"/g)) {
      if (!symbols.has(icon)) problems.push(`${page}: ${script} renders icon #${icon}, no matching <symbol>`);
    }
  }
}

if (problems.length) {
  console.error(`page-wiring: ${problems.length} problem(s)\n` + problems.map(p => `  - ${p}`).join('\n'));
  process.exit(1);
}
console.log(`page-wiring: ${pages.length} pages OK`);
