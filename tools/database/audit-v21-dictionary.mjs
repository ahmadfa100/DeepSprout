import fs from 'node:fs';
import path from 'node:path';

// Static pre-implementation audit. This never changes the preserved dictionary.
const root = path.resolve(import.meta.dirname, '../..');
const source = path.join(root, 'docs/architecture/database/v2.1/02-canonical-dictionary.md');
const predecessor = path.join(root, 'docs/architecture/database/v2/03-target-dictionary.md');
const out = path.join(root, 'docs/architecture/database/phase-b');
fs.mkdirSync(out, { recursive: true });
const rows = new Map();
const priorColumns = new Map();
for (const line of fs.readFileSync(predecessor, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\| `([a-z]+\.[A-Za-z]+)` [MHPV]\/[USROI] \| (.*?) \|/);
  if (!m) continue;
  const found = [...m[2].matchAll(/`([A-Z][A-Za-z0-9]*) (?:bigint|int|smallint|tinyint|bit|date|datetime2|decimal|nvarchar|varchar|char|varbinary|uniqueidentifier|rowversion)[^`]*`/g)].map(x=>x[1]);
  priorColumns.set(m[1], found);
}
for (const line of fs.readFileSync(source, 'utf8').split(/\r?\n/)) {
  const match = line.match(/^\| `([a-z]+\.[A-Za-z]+)` ([MHPV])\/([USROI]) \| (.*?) \| (.*?) \|$/);
  if (!match) continue;
  const [, name, cls, privacy, columns, rules] = match;
  const declared = [...columns.matchAll(/`([A-Z][A-Za-z0-9]*) ((?:bigint|int|smallint|tinyint|bit|date|datetime2|decimal|nvarchar|varchar|char|varbinary|uniqueidentifier|rowversion)[^`]*)`/g)].map(x => x[1]);
  rows.set(name, { name, schema: name.split('.')[0], cls, privacy, columns, rules, declared: new Set(declared), missing: new Set(), predecessorOnly: [], invalidTargets: [] });
}

const base = new Set(['Id', 'CreatedAtUtc', 'UpdatedAtUtc', 'RowVersion']);
for (const row of rows.values()) {
  row.predecessorOnly = (priorColumns.get(row.name) ?? []).filter(c => !row.declared.has(c) && !base.has(c));
  const required = new Set();
  // Explicit child columns in all declared composite FK clauses.
  for (const m of row.rules.matchAll(/FK `\(([^)]+)\)→([a-z]+\.[A-Za-z]+)\(([^)]+)\)`/g)) {
    for (const c of m[1].split(',')) required.add(c.trim());
    const target = rows.get(m[2]);
    if (!target) row.invalidTargets.push(`missing table ${m[2]}`);
    else for (const c of m[3].split(',')) if (!target.declared.has(c.trim()) && !base.has(c.trim()))
      row.invalidTargets.push(`missing target ${m[2]}.${c.trim()}`);
  }
  // Columns named in UQ/IX/UXF tuples, including filter predicates.
  for (const m of row.rules.matchAll(/(?:UQ|IX|UXF) `([^`]+)`/g)) {
    const token = m[1];
    const tuple = token.match(/^\(([^)]+)\)/);
    if (tuple) for (const c of tuple[1].split(',')) required.add(c.trim().replace(/\s+DESC$/i, ''));
    else required.add(token.split(/\s+/)[0]);
    const filter = token.match(/\bWHERE\s+(.+)$/i)?.[1] ?? '';
    for (const id of filter.matchAll(/\b([A-Z][A-Za-z0-9]*(?:Id|AtUtc|Status))\b/g)) required.add(id[1]);
  }
  // Time, ownership and status fields mentioned by explicit CHECK expressions.
  for (const m of row.rules.matchAll(/CK `([^`]+)`/g))
    for (const id of m[1].matchAll(/\b([A-Z][A-Za-z0-9]*(?:Id|AtUtc|LocalDate|Seconds|Minutes|No|Status|Capacity|Version))\b/g)) required.add(id[1]);
  for (const c of required) if (!row.declared.has(c) && !base.has(c) && /^[A-Z]/.test(c)) row.missing.add(c);
}
const modules = new Map();
for (const row of rows.values()) {
  if (!modules.has(row.schema)) modules.set(row.schema, []);
  modules.get(row.schema).push(row);
}
const csv = ['module,table,missing_columns,predecessor_only_columns,invalid_fk_targets'];
for (const row of rows.values()) if (row.missing.size || row.predecessorOnly.length || row.invalidTargets.length)
  csv.push([row.schema, row.name, [...row.missing].sort().join(';'), row.predecessorOnly.join(';'), row.invalidTargets.join(';')].map(x => `"${x.replaceAll('"', '""')}"`).join(','));
fs.writeFileSync(path.join(out, 'static-dictionary-defects.csv'), csv.join('\n') + '\n');
const lines = [
  '# Phase B — v2.1 dictionary pre-implementation audit',
  '',
  'This is a static audit of the preserved canonical dictionary. It is not evidence of migrated tables or executed SQL constraints. The CSV lists fields named by explicit keys, indexes, or CHECK expressions but absent from each row’s declared column list.',
  '',
  '| Module | Target tables | Rows with undeclared referenced columns | Rows with predecessor-only columns | Invalid FK target columns |',
  '|---|---:|---:|---:|---:|',
];
for (const [module, group] of modules)
  lines.push(`| ${module} | ${group.length} | ${group.filter(r => r.missing.size).length} | ${group.filter(r => r.predecessorOnly.length).length} | ${group.reduce((n,r) => n+r.invalidTargets.length,0)} |`);
lines.push('', `Total target tables: **${rows.size}**; implemented M1 tables: **19**; remaining target: **${rows.size - 19}**.`, '',
  'Before each module migration, resolve every CSV finding against product requirements and prior architecture, then verify ownership tuples, status transitions, and negative cases. No inferred column type or owner policy is approved by this static report.', '');
fs.writeFileSync(path.join(out, '01-audit.md'), lines.join('\n'));
console.log(`tables=${rows.size}; modules=${modules.size}; rowsWithMissing=${[...rows.values()].filter(r=>r.missing.size).length}; predecessorOnly=${[...rows.values()].filter(r=>r.predecessorOnly.length).length}; invalidTargets=${[...rows.values()].reduce((n,r)=>n+r.invalidTargets.length,0)}`);
