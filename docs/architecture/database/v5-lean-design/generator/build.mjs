// Builds the v5 lean model from model.mjs + the v4 schema (read-only) and writes the generated documents.
// Run from this folder:  node build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TABLES, MERGES, DEFERRED, META } from './model.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '..');
const v4Dir = path.resolve(here, '../../v4-final-design-review');
const v4 = JSON.parse(fs.readFileSync(path.join(v4Dir, 'schema.json'), 'utf8'));
const v4By = Object.fromEntries(v4.tables.map((t) => [t.table, t]));
const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

// ── 1. name map v4 → v5 ──────────────────────────────────────────────
const map = {};
const keepSet = new Set();
for (const t of TABLES) {
  if (!v4By[t.base]) err(`unknown base ${t.base}`);
  if (keepSet.has(t.base)) err(`base used twice ${t.base}`);
  keepSet.add(t.base);
  map[t.base] = t.n;
}
for (const [k, [kind, dest]] of Object.entries(MERGES)) {
  if (!v4By[k]) err(`unknown merged table ${k}`);
  if (keepSet.has(k)) err(`${k} is both KEEP and MERGE/REMOVE`);
  if (kind === 'MERGE') {
    if (!TABLES.some((t) => t.n === dest) && dest !== 'ops.AuditEvent') err(`merge destination missing: ${dest}`);
    map[k] = dest;
  } else map[k] = null;
}
for (const t of v4.tables) if (!(t.table in map)) err(`v4 table not mapped: ${t.table}`);
const names = TABLES.map((t) => t.n);
if (new Set(names).size !== names.length) err('duplicate v5 table names');

const META_DROP = new Set(['UpdatedAtUtc']);
const words = (s) => s.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
const enumRe = /^\s*([A-Za-z]+)\s+IN\s*\(/;
const keepCkName = /_(Scope|Owner|Parent|Target|Source|Subject)$/;

// ── 2. build each v5 table ──────────────────────────────────────────
const out = [];
for (const spec of TABLES) {
  const b = v4By[spec.base];
  const rename = spec.rename || {};
  const drop = new Set(spec.drop || []);
  const cols = [];
  const fks = [];
  const cks = [];
  const baseNames = new Set(b.columns.map((c) => c.name));
  const removedNames = new Set();

  for (const c of b.columns) {
    if (META_DROP.has(c.name)) continue;
    if (c.name === 'RowVersion' && !spec.rv) continue;
    if (drop.has(c.name)) { removedNames.add(c.name); continue; }
    const nn = rename[c.name] || c.name;
    const col = { name: nn, type: c.type, nullable: c.nullable, default: c.default, note: '' };
    if (spec.alter && spec.alter[nn]) Object.assign(col, spec.alter[nn]);
    cols.push(col);
  }
  const have = () => new Set(cols.map((c) => c.name));

  // columns absorbed from another v4 table
  const takenCk = [];
  for (const tk of spec.take || []) {
    const s = v4By[tk.from];
    if (!s) { err(`${spec.n}: take from unknown ${tk.from}`); continue; }
    for (const cn of tk.cols) {
      const sc = s.columns.find((c) => c.name === cn);
      if (!sc) { err(`${spec.n}: ${tk.from}.${cn} not found`); continue; }
      const nn = (tk.rename && tk.rename[cn]) || cn;
      if (have().has(nn)) { err(`${spec.n}: column clash ${nn}`); continue; }
      const nullable = tk.nullable || (tk.nullableCols || []).includes(nn) ? true : sc.nullable;
      cols.push({ name: nn, type: sc.type, nullable, default: nullable ? null : sc.default, note: `from v4 ${tk.from.split('.')[1]}` });
      for (const f of s.foreignKeys) {
        if (f.columns[0] === cn && f.referencedColumns[0] === 'Id') fks.push({ column: nn, ref: f.references });
      }
      for (const ck of s.checks) {
        const m = ck.expression.match(enumRe);
        if (m && m[1] === cn) takenCk.push({ name: `CK_${spec.n.split('.')[1]}_${nn}`, expression: ck.expression.replace(new RegExp(`\\b${cn}\\b`), nn) });
      }
    }
  }

  // new columns
  for (const [name, type, nullable, def, note] of spec.add || []) {
    if (have().has(name)) { err(`${spec.n}: add clash ${name}`); continue; }
    cols.push({ name, type, nullable, default: def, note });
  }
  if (spec.rv && !cols.some((c) => c.name === 'RowVersion')) cols.push({ name: 'RowVersion', type: 'rowversion', nullable: false, default: null, note: '' });
  const colSet = have();
  // note for renamed columns
  for (const [o, n] of Object.entries(rename)) { const c = cols.find((x) => x.name === n); if (c && !c.note) c.note = `was ${o} in v4`; }
  for (const t of spec.take || []) for (const cn of t.cols) { const nn = (t.rename && t.rename[cn]) || cn; const c = cols.find((x) => x.name === nn); if (c && !c.note) c.note = `from v4 ${t.from.split('.')[1]}`; }

  // FKs from the base table (single-column only)
  for (const f of b.foreignKeys) {
    // v4 composite ownership FK (A, Owner) -> T(Id, Owner) becomes a plain FK A -> T(Id)
    if (f.columns.length !== 1 && f.referencedColumns[0] !== 'Id') { warn(`${spec.n}: composite FK (${f.columns}) not convertible`); continue; }
    const c0 = f.columns[0];
    const nn = rename[c0] || c0;
    if (!colSet.has(nn)) continue;
    fks.push({ column: nn, ref: f.references });
  }
  for (const [column, ref] of spec.fk || []) fks.push({ column, ref, direct: true });
  const seen = new Set();
  const finalFks = [];
  for (const f of fks) {
    const target = f.direct ? f.ref : map[f.ref];
    if (!target) { warn(`${spec.n}.${f.column}: FK to ${f.ref} dropped (target removed)`); continue; }
    const key = `${f.column}->${target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!colSet.has(f.column)) { err(`${spec.n}: FK column missing ${f.column}`); continue; }
    if (target === 'ops.AuditEvent') { err(`${spec.n}.${f.column}: FK to AuditEvent not allowed`); continue; }
    finalFks.push({ column: f.column, references: target });
  }

  // UNIQUE
  const uqs = [];
  const missingWord = (expr) => words(expr).some((w) => removedNames.has(w) && !colSet.has(w));
  if (spec.uqMode !== 'own') {
    for (const u of b.unique) {
      if (u.columns.includes('Id')) continue;
      const cs = u.columns.map((c) => rename[c] || c);
      if (!cs.every((c) => colSet.has(c))) { warn(`${spec.n}: unique (${u.columns}) dropped (column removed)`); continue; }
      if (u.filter && missingWord(u.filter)) { warn(`${spec.n}: unique (${u.columns}) dropped (filter uses removed column)`); continue; }
      uqs.push({ columns: cs, filter: u.filter || null });
    }
  } else {
    for (const u of b.unique) if (!u.columns.includes('Id')) warn(`${spec.n}: v4 unique (${u.columns}${u.filter ? ' WHERE ' + u.filter.slice(0, 40) : ''}) replaced by own set`);
  }
  for (const [cs, filter] of spec.uq || []) {
    if (!cs.every((c) => colSet.has(c))) err(`${spec.n}: unique column missing in ${cs}`);
    uqs.push({ columns: cs, filter: filter || null });
  }

  // CHECK
  for (const ck of b.checks) {
    if ((spec.dropCk || []).includes(ck.name)) continue;
    const m = ck.expression.match(enumRe);
    const isEnum = m && colSet.has(m[1]);
    const isShape = keepCkName.test(ck.name);
    if (!isEnum && !isShape) continue;
    if (words(ck.expression).some((w) => removedNames.has(w) && !colSet.has(w))) continue;
    if (isShape && !words(ck.expression).filter((w) => /^[A-Z][A-Za-z]+(Id|Utc)$/.test(w)).every((w) => colSet.has(w))) continue;
    let ex = ck.expression;
    for (const [o, n] of Object.entries(rename)) ex = ex.replace(new RegExp(`\\b${o}\\b`, 'g'), n);
    cks.push({ name: ck.name, expression: ex });
  }
  for (const c of takenCk) cks.push(c);
  for (const [name, expression] of spec.ck || []) if (!cks.some((c) => c.name === name)) cks.push({ name, expression });

  // INDEX
  const ixs = [];
  for (const i of b.indexes) {
    const cs = i.columns.map((c) => rename[c] || c);
    if (cs.every((c) => colSet.has(c))) ixs.push({ columns: cs, filter: i.filter || null });
  }
  for (const [cs] of spec.ix || []) ixs.push({ columns: cs, filter: null });

  const enums = {};
  for (const c of cks) { const m = c.expression.match(/^\s*([A-Za-z]+)\s+IN\s*\(((?:'[^']*'\s*,?\s*)+)\)\s*$/); if (m) enums[m[1]] = m[2].replace(/'/g, '').split(',').map((s) => s.trim()); }

  out.push({
    table: spec.n, module: spec.n.split('.')[0], rowKind: b.rowKind, rv: !!spec.rv,
    columns: cols, primaryKey: ['Id'], foreignKeys: finalFks, unique: uqs, checks: cks, indexes: ixs, enums,
    purpose: spec.purpose, ar: spec.ar, feature: spec.feature, why: spec.why, json: spec.json || {},
    base: spec.base, absorbs: Object.entries(MERGES).filter(([, v]) => v[1] === spec.n).map(([k]) => k),
  });
}

// referential checks
const outBy = Object.fromEntries(out.map((t) => [t.table, t]));
for (const t of out) for (const f of t.foreignKeys) if (!outBy[f.references]) err(`${t.table}.${f.column} -> unknown ${f.references}`);
for (const t of out) {
  for (const c of t.columns) if (/Json$/.test(c.name) && !t.json[c.name]) warn(`${t.table}.${c.name}: JSON column has no shape note`);
}

// ── 3. stats ────────────────────────────────────────────────────────
const stats = {
  tables: out.length,
  modules: new Set(out.map((t) => t.module)).size,
  columns: out.reduce((n, t) => n + t.columns.length, 0),
  foreignKeys: out.reduce((n, t) => n + t.foreignKeys.length, 0),
  uniqueConstraints: out.reduce((n, t) => n + t.unique.length, 0),
  filteredUnique: out.reduce((n, t) => n + t.unique.filter((u) => u.filter).length, 0),
  checks: out.reduce((n, t) => n + t.checks.length, 0),
  jsonColumns: out.reduce((n, t) => n + t.columns.filter((c) => /Json$/.test(c.name)).length, 0),
  rowVersionTables: out.filter((t) => t.rv).length,
  triggers: 0, storedProcedures: 0,
  mapping: { KEEP: TABLES.length, MERGE: Object.values(MERGES).filter((v) => v[0] === 'MERGE').length, REMOVE: Object.values(MERGES).filter((v) => v[0] === 'REMOVE').length, DEFER: DEFERRED.length },
};
const v4Stats = { tables: 87, columns: v4.tables.reduce((n, t) => n + t.columns.length, 0), foreignKeys: 234, checks: 294, guards: v4.tables.reduce((n, t) => n + (t.guards || []).length, 0), jsonColumns: v4.tables.reduce((n, t) => n + t.columns.filter((c) => /Json$/.test(c.name)).length, 0) };
if (stats.mapping.KEEP + stats.mapping.MERGE + stats.mapping.REMOVE !== 87) err(`87 does not reconcile: ${JSON.stringify(stats.mapping)}`);

// ── 4. writers ──────────────────────────────────────────────────────
const w = (f, s) => fs.writeFileSync(path.join(outDir, f), s, 'utf8');
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|');
const short = (n) => n.split('.')[1];
const modOrder = ['iam', 'org', 'personal', 'lab', 'recovery', 'activity', 'shield', 'institution', 'coach', 'task', 'session', 'provider', 'forms', 'community', 'partnership', 'governance', 'ops', 'files'];
const mods = modOrder.filter((m) => out.some((t) => t.module === m));
const colText = (c) => `${c.name} ${c.type}${c.nullable ? ' NULL' : ''}`;

// 01 inventory
{
  let s = `# DeepSprout v5 — Proposed Table Inventory (${stats.tables} tables)\n\n> Generated by \`generator/build.mjs\` from \`generator/model.mjs\`. Do not edit by hand. Columns, types and constraints per table are in [02-data-dictionary.md](02-data-dictionary.md).\n\n`;
  s += `**${stats.tables} tables in ${stats.modules} schemas.** v4 had 87 tables / ${v4Stats.columns} columns / 234 FKs / 294 CHECKs / ${v4Stats.guards} documented guards. v5 has ${stats.columns} columns / ${stats.foreignKeys} FKs / ${stats.checks} CHECKs / 0 triggers.\n\n`;
  s += `| Metric | v4 | v5 |\n|---|---:|---:|\n| Tables | 87 | ${stats.tables} |\n| Columns | ${v4Stats.columns} | ${stats.columns} |\n| Foreign keys | 234 (85 composite) | ${stats.foreignKeys} (0 composite) |\n| UNIQUE constraints/indexes | 172 (53 filtered) | ${stats.uniqueConstraints} (${stats.filteredUnique} filtered) |\n| CHECK constraints | 294 | ${stats.checks} |\n| Triggers / stored procedures | ${v4Stats.guards} documented guards | 0 / 0 |\n| JSON columns | ${v4Stats.jsonColumns} | ${stats.jsonColumns} |\n| Tables with RowVersion | 87 | ${stats.rowVersionTables} |\n\n`;
  s += `## Design rules applied to every table\n\n${META.rules.map((r) => `- ${r}`).join('\n')}\n\n`;
  let i = 0;
  for (const m of mods) {
    const ts = out.filter((t) => t.module === m);
    s += `## ${m} (${ts.length})\n\n`;
    for (const t of ts) {
      i++;
      const parents = t.foreignKeys.map((f) => `${f.column} → ${short(f.references)}`).join(', ') || '— (root)';
      const uq = t.unique.map((u) => `(${u.columns.join(', ')})${u.filter ? ' WHERE ' + u.filter : ''}`).join('; ') || '—';
      s += `### ${i}. \`${t.table}\`${t.rv ? ' · RowVersion' : ''}\n\n`;
      s += `- **Purpose:** ${t.purpose}\n- **بالعربي:** ${t.ar}\n- **Feature using it:** ${t.feature}\n- **Why it is independent:** ${t.why}\n`;
      s += `- **Keys:** PK \`Id\`; FKs: ${parents}\n- **Unique:** ${uq}\n`;
      if (t.absorbs.length) s += `- **Absorbs from v4:** ${t.absorbs.map((a) => `\`${a}\``).join(', ')}\n`;
      s += `- **Main columns:** ${t.columns.filter((c) => !['Id', 'CreatedAtUtc', 'RowVersion', 'PublicId'].includes(c.name)).slice(0, 12).map((c) => `\`${c.name}\` ${c.type}`).join(', ')}${t.columns.length > 15 ? ', …' : ''}\n\n`;
    }
  }
  w('01-table-inventory.md', s);
}

// 02 dictionary
{
  let s = `# DeepSprout v5 — Data Dictionary\n\n> Generated. Every table, every column. English technical text with short Arabic explanations. All FKs are single-column, NO ACTION on delete (nothing cascades; deletes are soft status changes). \`bigint IDENTITY\` primary keys. Times are UTC \`datetime2(3)\`.\n\n`;
  for (const m of mods) {
    s += `## Schema \`${m}\`\n\n`;
    for (const t of out.filter((x) => x.module === m)) {
      s += `### \`${t.table}\`\n\n${t.purpose}\n\n*${t.ar}*\n\n`;
      s += `| Column | Type | Null | Default | Note |\n|---|---|:-:|---|---|\n`;
      for (const c of t.columns) {
        let note = c.note || '';
        if (t.enums[c.name]) note = (note ? note + ' · ' : '') + 'Values: ' + t.enums[c.name].join(', ');
        if (t.json[c.name]) note = (note ? note + ' · ' : '') + `JSON: ${t.json[c.name]}`;
        const fk = t.foreignKeys.find((f) => f.column === c.name);
        if (fk) note = (note ? note + ' · ' : '') + `FK → ${fk.references}`;
        s += `| ${c.name}${c.name === 'Id' ? ' (PK)' : ''} | ${c.type} | ${c.nullable ? 'Y' : ''} | ${esc(c.default || '')} | ${esc(note)} |\n`;
      }
      s += '\n';
      if (t.unique.length) s += `**Unique:** ${t.unique.map((u) => `\`(${u.columns.join(', ')})\`${u.filter ? ` WHERE ${esc(u.filter)}` : ''}`).join(' · ')}\n\n`;
      const other = t.checks.filter((c) => !enumRe.test(c.expression));
      if (other.length) s += `**CHECK:** ${other.map((c) => `\`${c.name}\`: ${esc(c.expression)}`).join(' · ')}\n\n`;
      if (t.indexes.length) s += `**Indexes:** ${t.indexes.map((i) => `(${i.columns.join(', ')})${i.filter ? ' WHERE ' + esc(i.filter) : ''}`).join(' · ')}\n\n`;
      s += `**Used by:** ${t.feature}\n\n---\n\n`;
    }
  }
  w('02-data-dictionary.md', s);
}

// 03 mapping
{
  const rows = [];
  for (const t of v4.tables) {
    if (keepSet.has(t.table)) { const sp = TABLES.find((x) => x.base === t.table); rows.push([t.table, 'KEEP', sp.n, sp.n === t.table ? 'Kept' + (sp.take ? ' and absorbs columns of merged tables.' : '.') : `Kept, renamed to ${sp.n}.`]); }
    else { const [k, d, r] = MERGES[t.table]; rows.push([t.table, k, d || '—', r]); }
  }
  for (const [t, r] of DEFERRED) rows.push([t, 'DEFER', '—', r + ' (unchanged from v4)']);
  rows.sort((a, b) => a[0].localeCompare(b[0]));
  let s = `# DeepSprout v4 (87) → v5 (${stats.tables}) Mapping\n\n> Generated. Every v4 table has exactly one disposition.\n\n`;
  s += `## Reconciliation\n\n| | Count |\n|---|---:|\n| v4 tables | 87 |\n| KEEP (survive as a v5 table) | ${stats.mapping.KEEP} |\n| MERGE (folded into another v5 table or column) | ${stats.mapping.MERGE} |\n| REMOVE (no storage; derived or covered by existing keys) | ${stats.mapping.REMOVE} |\n| **KEEP + MERGE + REMOVE** | **${stats.mapping.KEEP + stats.mapping.MERGE + stats.mapping.REMOVE}** |\n| DEFER (from the 129-table database; not in v4, still not built) | ${stats.mapping.DEFER} |\n\n`;
  s += `87 = ${stats.mapping.KEEP} + ${stats.mapping.MERGE} + ${stats.mapping.REMOVE}. v5 table count = KEEP = **${stats.tables}** (no new table is introduced).\n\n`;
  s += `| v4 table | Disposition | v5 destination | Reason |\n|---|---|---|---|\n`;
  for (const r of rows) s += `| \`${r[0]}\` | **${r[1]}** | ${r[2] === '—' ? '—' : '`' + r[2] + '`'} | ${esc(r[3])} |\n`;
  w('03-v4-to-v5-mapping.md', s);
  w('v4-to-v5-mapping.csv', '﻿V4Table,Disposition,V5Destination,Reason\n' + rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n') + '\n');
}

// 04 ERD
{
  let s = `# DeepSprout v5 — Entity Relationship Diagrams\n\n> Generated from the model. Each diagram shows keys, foreign keys and status columns only (full columns in the data dictionary). Dashed boxes are entities from other schemas shown as stubs. \`||--o{\` = one to many; \`|o--o{\` = optional parent.\n\n`;
  s += `## 1. Schema dependencies\n\n\`\`\`mermaid\nflowchart LR\n`;
  const edges = new Map();
  for (const t of out) for (const f of t.foreignKeys) { const a = t.module, b = outBy[f.references].module; if (a !== b) edges.set(`${a}|${b}`, (edges.get(`${a}|${b}`) || 0) + 1); }
  for (const m of mods) s += `  ${m}["${m} (${out.filter((t) => t.module === m).length})"]\n`;
  for (const [k, n] of edges) { const [a, b] = k.split('|'); s += `  ${a} -->|${n}| ${b}\n`; }
  s += `\`\`\`\n\nArrow = "has foreign keys into"; the number is how many FK columns cross that boundary.\n\n`;
  let n = 2;
  for (const m of mods) {
    const ts = out.filter((t) => t.module === m);
    const stubs = new Set();
    s += `## ${n++}. ${m}\n\n\`\`\`mermaid\nerDiagram\n`;
    const id = (x) => x.replace('.', '_');
    for (const t of ts) {
      s += `  ${id(t.table)} {\n`;
      for (const c of t.columns) {
        const isFk = t.foreignKeys.some((f) => f.column === c.name);
        const keep = c.name === 'Id' || isFk || c.name === 'Status' || c.name === 'Kind';
        if (!keep) continue;
        s += `    ${c.type.replace(/\(.*\)/, '').replace(/ /g, '_')} ${c.name}${c.name === 'Id' ? ' PK' : isFk ? ' FK' : ''}\n`;
      }
      s += `  }\n`;
      for (const f of t.foreignKeys) {
        const tgt = outBy[f.references];
        if (tgt.module !== m) stubs.add(f.references);
        const nullable = t.columns.find((c) => c.name === f.column).nullable;
        s += `  ${id(f.references)} ${nullable ? '|o' : '||'}--o{ ${id(t.table)} : "${f.column}"\n`;
      }
    }
    for (const st of stubs) s += `  ${id(st)} {\n    bigint Id PK\n  }\n`;
    s += `\`\`\`\n\n`;
  }
  w('04-erd.md', s);
}

// 05 legacy test disposition
{
  const csv = fs.readFileSync(path.join(v4Dir, 'test-traceability.csv'), 'utf8').replace(/^﻿/, '');
  const rows = []; let cur = [], f = '', q = false;
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (q) { if (ch === '"') { if (csv[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { cur.push(f); f = ''; }
    else if (ch === '\n') { cur.push(f.replace(/\r$/, '')); rows.push(cur); cur = []; f = ''; }
    else f += ch;
  }
  if (f || cur.length) { cur.push(f); rows.push(cur); }
  const body = rows.slice(1).filter((r) => r.length >= 6);
  const res = [];
  const tally = {};
  for (const r of body) {
    const [suite, id, , , disp, target] = r;
    const tgts = (target.match(/[a-z]+\.[A-Za-z*]+/g) || []);
    let v5, why;
    const detail = r[3] || '';
    const names = tgts.flatMap((x) => { const [mod, tn] = x.split('.'); return tn === '*' ? [`${mod}.*`] : [x]; });
    const removed = names.filter((x) => !x.endsWith('.*') && v4By[x] && map[x] !== x && !keepSet.has(x));
    const survives = names.some((x) => x.endsWith('.*') || keepSet.has(x));
    if (disp === 'DEFER') { v5 = 'DEFER'; why = 'Feature still deferred.'; }
    else if (disp === 'REGENERATE' || disp === 'STRUCTURAL') { v5 = 'RETIRE'; why = 'Environment, table-count or schema-shape check of the old database; replaced by the generator model check and one migration smoke test.'; }
    else if (/immutable|append-only|sealed/i.test(detail)) { v5 = 'RETIRE'; why = 'Immutability trigger retired. v5 code has no path that edits these rows; covered only where a user-facing edit exists.'; }
    else if (/SQL 547/.test(detail) && /FOREIGN KEY/.test(detail)) { v5 = 'RETIRE'; why = 'Composite ownership FK replaced by a C# ownership check; covered by the ownership/authorization scenarios.'; }
    else if (/SQL 547/.test(detail)) { v5 = 'RETIRE'; why = 'v4 CHECK on status/timestamp coherence retired; the application service sets both together and the status list CHECK remains.'; }
    else if (names.length && removed.length === names.length && !survives) { v5 = 'RETIRE'; why = `Targets table(s) that no longer exist (${removed.join(', ')}); behavior is covered by the scenario of the owning table.`; }
    else { v5 = 'RETAIN-AS-SCENARIO'; why = removed.length ? `Behavior retained; rewrite against ${removed.map((x) => map[x] || 'derived data').join(', ')}.` : 'Behavior retained; assert through the application service or a unique index.'; }
    tally[v5] = (tally[v5] || 0) + 1;
    res.push([suite, id, disp, v5, why]);
  }
  fs.writeFileSync(path.join(outDir, 'legacy-checks-disposition.csv'), '﻿Suite,OldTestId,V4Disposition,V5Disposition,Reason\n' + res.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n') + '\n', 'utf8');
  stats.legacy = { total: res.length, ...tally };
}

// appendix: table width, v4 vs v5
{
  const rows = out.map((t) => ({ t: t.table, v4: v4By[t.base].columns.length, v5: t.columns.length, nul: t.columns.filter((c) => c.nullable).length, json: t.columns.filter((c) => /Json$/.test(c.name)).length })).sort((a, b) => b.v5 - a.v5);
  let s = '# Appendix — Table width, v4 vs v5\n\n> Generated. v4 counts include CreatedAtUtc/UpdatedAtUtc/RowVersion on every table; v5 removes UpdatedAtUtc everywhere and RowVersion from 70 tables. A table that absorbed others can gain columns.\n\n| v5 table | v4 columns | v5 columns | nullable (v5) | JSON columns |\n|---|---:|---:|---:|---:|\n';
  for (const r of rows) s += `| \`${r.t}\` | ${r.v4} | ${r.v5} | ${r.nul} | ${r.json} |\n`;
  const wide = rows.filter((r) => r.v5 >= 20).length;
  const wide4 = out.filter((t) => v4By[t.base].columns.length >= 20).length;
  s += `\nTables with 20 or more columns among these ${out.length}: v4 ${wide4}, v5 ${wide}.\n`;
  w('appendix-table-width.md', s);
  stats.wide = { v4: wide4, v5: wide };
}
fs.writeFileSync(path.join(outDir, 'schema.json'), JSON.stringify({ version: META.version, generatedFrom: 'generator/model.mjs + v4 schema.json (read-only)', tableCount: out.length, stats, tables: out.map(({ ar, feature, why, json, enums, absorbs, base, ...t }) => ({ ...t, purpose: t.purpose, absorbs, base })) }, null, 1), 'utf8');
fs.writeFileSync(path.join(outDir, 'validation-report.txt'), `DeepSprout v5 generator validation\n${new Date().toISOString()}\n\n${JSON.stringify(stats, null, 2)}\n\nWarnings (${warnings.length}):\n${warnings.join('\n')}\n\nErrors (${errors.length}):\n${errors.join('\n')}\n`, 'utf8');
console.log(JSON.stringify(stats, null, 1));
console.log('warnings', warnings.length, 'errors', errors.length);
if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
