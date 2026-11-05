#!/usr/bin/env node
// DeepSprout v4 final design — generator and validator.
// Reads the structured schema in ./model, the live 129-table catalog extracted by Codex
// (../review/live-schema.json) and the recorded regression results (../phase-b/final-regression/*.jsonl).
// Writes the data dictionary, ERDs, migration matrix, test traceability and machine-readable files.
// Run:  node generate.mjs        (exit code 1 if any validation fails)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import t1 from './model/t1-identity-org.mjs';
import t2 from './model/t2-personal-journey.mjs';
import t3 from './model/t3-institution-coach-task.mjs';
import t4 from './model/t4-session-provider.mjs';
import t5 from './model/t5-forms-community-platform.mjs';
import migration from './model/migration.mjs';
import { suiteDefaults, overrides, prefixNotes } from './model/tests.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = (f, s) => fs.writeFileSync(path.join(here, f), s.replace(/\r?\n/g, '\n'), 'utf8');
const errors = [];
const fail = m => errors.push(m);

// ------------------------------------------------------------------ module metadata
const MODULES = [
  ['iam', 'الهوية والمصادقة'],
  ['org', 'المنظمات والتحقق والطاقم'],
  ['personal', 'الملف الشخصي والرحلة'],
  ['lab', 'Lab: الاختبارات'],
  ['recovery', 'Recovery Plan'],
  ['activity', 'Activities والروتين'],
  ['shield', 'Digital Shield'],
  ['evidence', 'الأدلة والحدائق'],
  ['institution', 'مبادرات المؤسسة'],
  ['coach', 'برامج المدربين والمجموعات'],
  ['task', 'محرك المهام والتقارير'],
  ['session', 'الجلسات والحضور والإكمال'],
  ['provider', 'تجارب المزوّد'],
  ['forms', 'النماذج والمسابقات'],
  ['community', 'المجتمع'],
  ['partnership', 'الشراكات'],
  ['governance', 'المحتوى المحكوم (CMS)'],
  ['ops', 'التشغيل: تدقيق، إشعارات، Outbox، Idempotency'],
  ['files', 'الملفات الآمنة'],
];
const moduleTitle = Object.fromEntries(MODULES);

// ------------------------------------------------------------------ parse & expand
const KEYWORDS = new Set(['AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'BETWEEN', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'LEN', 'TRIM', 'ISJSON', 'DATEADD', 'ISNULL', 'hour', 'N']);
const tables = [...t1, ...t2, ...t3, ...t4, ...t5];
const byName = new Map();

function parseCol(s) {
  const m = s.match(/^(\w+)\s+([a-z0-9]+(?:\([^)]*\))?)(\s+null)?(?:\s*=\s*(.+))?$/);
  if (!m) { fail(`column syntax: ${s}`); return null; }
  return { name: m[1], type: m[2], nullable: !!m[3], def: m[4] ? m[4].trim() : null, note: '' };
}
function parseFk(s, t) {
  const m = s.match(/^\(?([\w, ]+?)\)?\s*->\s*([\w.]+)(?:\(([\w, ]+)\))?$/);
  if (!m) { fail(`${t}: fk syntax: ${s}`); return null; }
  const cols = m[1].split(',').map(x => x.trim());
  const refCols = m[3] ? m[3].split(',').map(x => x.trim()) : ['Id'];
  return { cols, ref: m[2], refCols, text: s };
}
function parseIdx(s, t) {
  const m = s.match(/^\(([^)]*)\)\s*(?:INCLUDE\s*\(([^)]*)\))?\s*(?:WHERE\s+(.+))?$/);
  if (!m) { fail(`${t}: index syntax: ${s}`); return null; }
  return { cols: m[1].split(',').map(x => x.trim()), include: m[2] ? m[2].split(',').map(x => x.trim()) : [], where: m[3] || null };
}
function parseCk(s, t) {
  const i = s.indexOf(': ');
  if (i < 0) { fail(`${t}: check syntax: ${s}`); return null; }
  return { name: s.slice(0, i).trim(), expr: s.slice(i + 2).trim() };
}

for (const t of tables) {
  if (byName.has(t.name)) fail(`duplicate table ${t.name}`);
  const [schema, short] = t.name.split('.');
  t.schema = schema; t.short = short;
  if (!moduleTitle[schema]) fail(`unknown module ${schema}`);
  const cols = [{ name: 'Id', type: 'bigint', nullable: false, def: 'IDENTITY(1,1)', note: 'PK' }];
  if (t.pub) cols.push({ name: 'PublicId', type: 'uniqueidentifier', nullable: false, def: 'NEWSEQUENTIALID()', note: 'UQ — المعرّف الخارجي في الـAPI والروابط' });
  for (const c of t.cols) { const p = parseCol(c); if (p) cols.push(p); }
  cols.push({ name: 'CreatedAtUtc', type: 'datetime2(3)', nullable: false, def: 'SYSUTCDATETIME()', note: '' });
  if (t.std === 'm') {
    cols.push({ name: 'UpdatedAtUtc', type: 'datetime2(3)', nullable: false, def: 'SYSUTCDATETIME()', note: '' });
    cols.push({ name: 'RowVersion', type: 'rowversion', nullable: false, def: null, note: 'تزامن متفائل (EF IsRowVersion)' });
  } else if (t.std !== 'a') fail(`${t.name}: std must be m or a`);
  const names = new Set();
  for (const c of cols) { if (names.has(c.name)) fail(`${t.name}: duplicate column ${c.name}`); names.add(c.name); }
  t.columns = cols;
  t.colset = names;
  t.fks = (t.fk || []).map(s => parseFk(s, t.name)).filter(Boolean);
  t.uqs = (t.uq || []).map(s => parseIdx(s, t.name)).filter(Boolean);
  if (t.pub) t.uqs.unshift({ cols: ['PublicId'], include: [], where: null });
  t.ixs = (t.ix || []).map(s => parseIdx(s, t.name)).filter(Boolean);
  t.cks = (t.ck || []).map(s => parseCk(s, t.name)).filter(Boolean);
  byName.set(t.name, t);
}

// ------------------------------------------------------------------ validate structure
const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));
for (const t of tables) {
  for (const f of t.fks) {
    for (const c of f.cols) if (!t.colset.has(c)) fail(`${t.name}: FK column ${c} missing (${f.text})`);
    const target = byName.get(f.ref);
    if (!target) { fail(`${t.name}: FK target ${f.ref} missing`); continue; }
    for (const c of f.refCols) if (!target.colset.has(c)) fail(`${t.name}: FK target column ${f.ref}.${c} missing`);
    if (f.cols.length !== f.refCols.length) fail(`${t.name}: FK arity mismatch ${f.text}`);
    const keyed = sameSet(f.refCols, ['Id']) || target.uqs.some(u => !u.where && sameSet(u.cols, f.refCols));
    if (!keyed) fail(`${t.name}: FK ${f.text} does not reference PK or an unfiltered UNIQUE on ${f.ref}`);
    // type compatibility on single-column FKs
    f.cols.forEach((c, i) => {
      const a = t.columns.find(x => x.name === c), b = target.columns.find(x => x.name === f.refCols[i]);
      if (a && b && a.type !== b.type) fail(`${t.name}.${c} (${a.type}) vs ${f.ref}.${b.name} (${b.type}) type mismatch`);
    });
  }
  for (const ix of [...t.uqs, ...t.ixs]) for (const c of [...ix.cols, ...ix.include]) if (!t.colset.has(c)) fail(`${t.name}: index column ${c} missing`);
  for (const ck of t.cks) {
    const stripped = ck.expr.replace(/N?'[^']*'/g, ' ');
    for (const tok of stripped.match(/\b[A-Za-z_][A-Za-z0-9_]*\b/g) || []) {
      if (KEYWORDS.has(tok) || KEYWORDS.has(tok.toUpperCase())) continue;
      if (!t.colset.has(tok)) fail(`${t.name}: CHECK ${ck.name} references unknown identifier ${tok}`);
    }
  }
  for (const k of ['purpose', 'feature', 'why', 'lifecycle', 'privacy', 'history', 'example', 'breaks', 'source'])
    if (!t[k] || t[k].length < 10) fail(`${t.name}: missing narrative field ${k}`);
}

// ------------------------------------------------------------------ live catalog & migration reconciliation
const live = JSON.parse(fs.readFileSync(path.join(here, '../review/live-schema.json'), 'utf8').replace(/^﻿/, ''));
const liveTables = live.tables.filter(x => x.SchemaName !== 'dbo').map(x => `${x.SchemaName}.${x.TableName}`).sort();
const liveCols = {};
for (const c of live.columns) (liveCols[`${c.SchemaName}.${c.TableName}`] ||= []).push(c.ColumnName);
const liveFkIn = {}, liveFkOut = {};
{
  const seen = new Set();
  for (const f of live.foreign_key_columns) {
    const k = f.ForeignKeyName + f.FromSchema + f.FromTable; if (seen.has(k)) continue; seen.add(k);
    const from = `${f.FromSchema}.${f.FromTable}`, to = `${f.ToSchema}.${f.ToTable}`;
    liveFkOut[from] = (liveFkOut[from] || 0) + 1; liveFkIn[to] = (liveFkIn[to] || 0) + 1;
  }
}
const mig = migration.map(([old, action, target, kind, change, consequence]) => ({ old, action, target, kind, change, consequence }));
const migOld = mig.map(m => m.old).sort();
if (liveTables.length !== 129) fail(`live catalog has ${liveTables.length} product tables, expected 129`);
for (const n of liveTables) if (!migOld.includes(n)) fail(`migration matrix misses live table ${n}`);
for (const n of migOld) if (!liveTables.includes(n)) fail(`migration matrix row ${n} is not a live table`);
if (new Set(migOld).size !== migOld.length) fail('duplicate rows in migration matrix');
const counts = { KEEP: 0, MERGE: 0, REMOVE: 0, DEFER: 0 };
const keepOf = {};
for (const m of mig) {
  counts[m.action] = (counts[m.action] ?? 0) + 1;
  if (!(m.action in counts)) fail(`bad action ${m.action}`);
  if (['KEEP', 'MERGE'].includes(m.action) && !byName.has(m.target)) fail(`migration target ${m.target} (from ${m.old}) not in v4 schema`);
  if (['REMOVE', 'DEFER'].includes(m.action) && m.target) fail(`${m.old}: ${m.action} must not have a target`);
  if (m.action === 'KEEP') (keepOf[m.target] ||= []).push(m.old);
}
for (const t of tables) {
  const k = keepOf[t.name] || [];
  if (k.length !== 1) fail(`${t.name} must have exactly one KEEP source (has ${k.length}: ${k.join(', ')})`);
  t.keepFrom = k[0];
  t.mergedFrom = mig.filter(m => m.action === 'MERGE' && m.target === t.name).map(m => m.old);
}
if (counts.KEEP !== tables.length) fail(`KEEP count ${counts.KEEP} != final table count ${tables.length}`);
if (counts.KEEP + counts.MERGE + counts.REMOVE + counts.DEFER !== 129) fail('matrix does not reconcile to 129');

// ------------------------------------------------------------------ relationships
const incoming = {};
for (const t of tables) for (const f of t.fks) (incoming[f.ref] ||= []).push({ from: t, fk: f });
function cardinality(t, f) {
  const nullable = f.cols.some(c => t.columns.find(x => x.name === c)?.nullable);
  const uqExact = t.uqs.find(u => !u.where && u.cols.every(c => f.cols.includes(c))) || t.uqs.find(u => u.cols.every(c => f.cols.includes(c)));
  const childSide = uqExact ? (uqExact.where ? `صفر أو واحد ضمن (${uqExact.where})، وكثير خارجه` : 'صفر أو واحد') : 'صفر أو كثير';
  return { nullable, childSide, unique: !!uqExact && !uqExact.where };
}

// ------------------------------------------------------------------ tests traceability
const regDir = path.join(here, '../phase-b/final-regression');
const tests = [];
for (const f of fs.readdirSync(regDir).filter(f => f.endsWith('.jsonl')).sort()) {
  const suite = f.replace('.jsonl', '');
  for (const line of fs.readFileSync(path.join(regDir, f), 'utf8').split(/\r?\n/).filter(Boolean)) {
    const j = JSON.parse(line.replace(/^﻿/, ''));
    let disp, target, note = '';
    if (overrides[j.id]) [disp, target, note = ''] = overrides[j.id];
    else if (suiteDefaults[suite][0] === 'DEFER') [disp, target] = suiteDefaults[suite], note = 'Commercial مؤجل (§20 غير موقّع).';
    else {
      const p = prefixNotes.find(([re]) => re.test(j.id));
      if (p) [, disp, target, note] = p; else [disp, target] = suiteDefaults[suite];
    }
    tests.push({ suite, id: j.id, oldStatus: j.status, detail: String(j.detail || ''), disp, target, note });
  }
}
if (tests.length !== 330) fail(`expected 330 recorded checks, found ${tests.length}`);
const testIds = tests.map(t => t.suite + '/' + t.id);
if (new Set(testIds).size !== testIds.length) fail('duplicate test ids');
for (const t of tests) {
  if (!['CARRY', 'REWRITE', 'STRUCTURAL', 'DEFER', 'REGENERATE'].includes(t.disp)) fail(`test ${t.id}: bad disposition ${t.disp}`);
  if (t.disp === 'STRUCTURAL' && !/NEW-|يغطيه/.test(t.note)) fail(`test ${t.id}: STRUCTURAL needs a named replacement`);
  for (const name of (t.target.match(/\b[a-z]+\.[A-Z]\w+/g) || [])) if (!byName.has(name)) fail(`test ${t.id}: target ${name} not in v4`);
}

// ------------------------------------------------------------------ helpers for output
const esc = s => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const code = s => '`' + s + '`';
const anchor = n => n.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const mm = n => n.replace('.', '_');
const mmType = ty => ty.replace(/\(.*\)/, '');
const csv = rows => rows.map(r => r.map(v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\n') + '\n';
const bom = '﻿';
const genNote = '> **ملف مُولَّد** من `model/*.mjs` بواسطة `node generate.mjs`. لا تحرره يدويًا؛ عدّل النموذج ثم أعد التوليد.\n';

// ------------------------------------------------------------------ 02 data dictionary
{
  let s = `# DeepSprout v4 — قاموس البيانات للتصميم النهائي\n\n${genNote}\n`;
  s += `**العدد:** ${tables.length} جدولًا في ${MODULES.length} مخططًا (schema). كل جدول يظهر في مخطط وحدته في [03-erd-ar.md](03-erd-ar.md) وفي صف واحد KEEP في [04-migration-matrix-ar.md](04-migration-matrix-ar.md).\n\n`;
  s += `## اصطلاحات مشتركة\n\n`;
  s += `- **المفتاح الأساسي:** كل جدول له \`Id bigint IDENTITY(1,1)\` PK مجمّع (clustered). المعرّف الخارجي في الـAPI والروابط \`PublicId uniqueidentifier DEFAULT NEWSEQUENTIALID()\` فريد، ولا يُكشف \`Id\` الداخلي.\n`;
  s += `- **الوقت:** كل الأوقات \`datetime2(3)\` بتوقيت UTC وتنتهي بـ\`AtUtc\`؛ التواريخ المحلية (يوم الخطة، يوم الروتين) \`date\` مع \`TimeZoneId\` حيث يلزم.\n`;
  s += `- **صف قابل للتعديل (m):** \`CreatedAtUtc\`، \`UpdatedAtUtc\`، \`RowVersion rowversion\` للتزامن المتفائل في EF Core.\n`;
  s += `- **صف إلحاقي (a):** \`CreatedAtUtc\` فقط. دور قاعدة البيانات \`deepsprout_runtime\` يملك INSERT/SELECT فقط (DENY UPDATE, DELETE)، ومشغّل \`TR_<Table>_Immutable\` شبكة أمان. أي تعديل مسموح استثناءً مذكور في "الحراس".\n`;
  s += `- **الحالة:** \`nvarchar\` مع CHECK بقائمة مغلقة؛ في C# تُمثَّل كـenum مُحوَّل إلى نص (\`HasConversion<string>()\`).\n`;
  s += `- **المفاتيح المركبة:** \`(ChildId, OwnerId) → Parent(Id, OwnerId)\` تفرض أن الابن والأب يخصان المالك نفسه (الشخص، المبادرة، التجربة، النسخة). الأهداف قيود UNIQUE غير مفلترة على الأب.\n`;
  s += `- **JSON:** يُستعمل فقط للقطات منشورة ثابتة، أو إعدادات ذاتية الاحتواء، أو مجموعات صغيرة بلا دورة حياة ولا مرجع؛ دائمًا مع \`CHECK (ISJSON(...) = 1)\`، وكل موضع مبرر في جدوله.\n`;
  s += `- **الحذف:** لا DELETE على سجلات الأعمال؛ الإنهاء حالة. كل المفاتيح الأجنبية \`ON DELETE NO ACTION\`.\n`;
  s += `- **الحراس (guards):** ما لا يعبَّر عنه بـFK/UNIQUE/CHECK يُفرض بإجراء مخزن أو أمر تطبيق داخل معاملة واحدة مع قفل صف الأب، ومشغّل SQL كشبكة أمان عندما يكون الخطأ مكلفًا (السعة، الثبات). المسارات المهمة في [05-validation-plan-ar.md](05-validation-plan-ar.md).\n\n`;
  s += `## الفهرس\n\n`;
  for (const [m, title] of MODULES) {
    const ts = tables.filter(t => t.schema === m);
    s += `- **${m}** — ${title} (${ts.length}): ${ts.map(t => `[${t.short}](#${anchor(t.name)})`).join('، ')}\n`;
  }
  for (const [m, title] of MODULES) {
    s += `\n---\n\n## ${m} — ${title}\n`;
    for (const t of tables.filter(x => x.schema === m)) {
      s += `\n### ${t.name}\n\n`;
      s += `<a id="${anchor(t.name)}"></a>\n\n`;
      s += `| | |\n|---|---|\n`;
      s += `| **الغرض** | ${esc(t.purpose)} |\n| **الميزة وسير العمل** | ${esc(t.feature)} |\n| **لماذا جدول مستقل** | ${esc(t.why)} |\n`;
      s += `| **نوع الصف** | ${t.std === 'm' ? 'قابل للتعديل (m)' : 'إلحاقي (a)'} |\n`;
      s += `| **الأصل في المخطط الحالي** | ${code(t.keepFrom)}${t.mergedFrom.length ? ' + يستوعب ' + t.mergedFrom.map(code).join('، ') : ''} |\n\n`;
      s += `**الأعمدة**\n\n| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |\n|---|---|---|---|---|\n`;
      for (const c of t.columns) {
        const notes = [c.note];
        for (const f of t.fks) if (f.cols.includes(c.name)) notes.push(`FK → ${f.ref}${f.cols.length > 1 ? ` (مركب: ${f.cols.join(', ')})` : ''}`);
        s += `| ${code(c.name)} | ${c.type} | ${c.nullable ? 'نعم' : 'لا'} | ${c.def ? code(c.def.replace(/^'(.*)'$/, "N'$1'")) : ''} | ${esc(notes.filter(Boolean).join('؛ '))} |\n`;
      }
      s += `\n**المفاتيح والقيود والفهارس**\n\n- PK: ${code('PK_' + t.short + ' (Id)')}\n`;
      for (const f of t.fks) s += `- FK: ${code(`(${f.cols.join(', ')}) → ${f.ref}(${f.refCols.join(', ')})`)}\n`;
      for (const u of t.uqs) s += `- UNIQUE: ${code(`(${u.cols.join(', ')})${u.where ? ' WHERE ' + u.where : ''}`)}${u.where ? ' (فهرس فريد مفلتر)' : ''}\n`;
      for (const i of t.ixs) s += `- INDEX: ${code(`(${i.cols.join(', ')})${i.include.length ? ' INCLUDE (' + i.include.join(', ') + ')' : ''}${i.where ? ' WHERE ' + i.where : ''}`)}\n`;
      for (const c of t.cks) s += `- CHECK ${code('CK_' + t.short + '_' + c.name)}: ${code(c.expr)}\n`;
      if (t.std === 'a') s += `- صلاحيات: INSERT/SELECT فقط لدور التشغيل؛ ${code('TR_' + t.short + '_Immutable')} يمنع UPDATE/DELETE${t.guards?.some(g => /لا تحديث إلا|لا يتغير أي عمود إلا|Retired/.test(g)) ? ' عدا الاستثناء المذكور في الحراس' : ''}.\n`;
      for (const g of t.guards || []) s += `- حارس: ${esc(g)}\n`;
      s += `\n**العلاقات**\n\n`;
      if (!t.fks.length) s += `- صادرة: لا شيء.\n`;
      for (const f of t.fks) {
        const c = cardinality(t, f);
        s += `- صادرة: كل صف هنا يشير إلى ${c.nullable ? '**صفر أو واحد**' : '**واحد**'} في ${code(f.ref)} عبر ${code(f.cols.join(', '))}؛ وكل صف هناك يقابله ${c.childSide} هنا.\n`;
      }
      const inc = incoming[t.name] || [];
      if (!inc.length) s += `- واردة: لا شيء.\n`;
      else {
        const grouped = {};
        for (const { from, fk } of inc) (grouped[from.name] ||= []).push(fk.cols.join(', '));
        s += `- واردة: ${Object.entries(grouped).map(([n, cs]) => `${code(n)} (${cs.join(' | ')})`).join('، ')}\n`;
      }
      s += `\n| | |\n|---|---|\n| **دورة الحياة والانتقالات** | ${esc(t.lifecycle)} |\n| **الخصوصية والملكية والتفويض** | ${esc(t.privacy)} |\n| **التاريخ والنسخ والاحتفاظ** | ${esc(t.history)} |\n| **مثال ملموس** | ${esc(t.example)} |\n| **ماذا ينكسر لو حُذف أو دُمج** | ${esc(t.breaks)} |\n| **المصدر** | ${esc(t.source)} |\n`;
    }
  }
  out('02-data-dictionary-ar.md', s);
}

// ------------------------------------------------------------------ 03 ERDs
const PERSON_LINK = new Set(['PersonId', 'OwnerPersonId', 'ApplicantPersonId', 'SubjectPersonId', 'ContributorPersonId', 'RecipientPersonId', 'AuthorPersonId', 'CoachPersonId', 'ReporterPersonId']);
function erEntity(t, full) {
  const keyCols = new Set(['Id']);
  for (const f of t.fks) f.cols.forEach(c => keyCols.add(c));
  const lines = [];
  for (const c of t.columns) {
    const isFk = t.fks.some(f => f.cols.includes(c.name));
    const isUk = t.uqs.some(u => !u.where && u.cols.length === 1 && u.cols[0] === c.name);
    const show = full || keyCols.has(c.name) || /^(Status|Kind|Purpose|Role|Mode|EffectCode|EntryKind|Decision|Action|ActionKind|InstrumentCode|PracticeType)$/.test(c.name) || c.name === 'PublicId';
    if (!show) continue;
    const tags = [c.name === 'Id' ? 'PK' : null, isFk ? 'FK' : null, isUk ? 'UK' : null].filter(Boolean).join(', ');
    lines.push(`    ${mmType(c.type)} ${c.name}${tags ? ' ' + tags : ''}`);
  }
  return `  ${mm(t.name)} {\n${lines.join('\n')}\n  }`;
}
function erEdges(set, opts = {}) {
  const pairs = new Map();
  for (const t of tables) {
    if (!set.has(t.name)) continue;
    for (const f of t.fks) {
      if (!set.has(f.ref)) continue;
      if (f.ref === 'iam.Person' && !opts.allPerson && !f.cols.some(c => PERSON_LINK.has(c))) continue;
      const k = f.ref + '>' + t.name;
      const c = cardinality(t, f);
      const prev = pairs.get(k);
      const label = f.cols.join(',');
      if (prev) { prev.labels.add(label); prev.nullable &&= c.nullable; prev.unique ||= c.unique; }
      else pairs.set(k, { parent: f.ref, child: t.name, labels: new Set([label]), nullable: c.nullable, unique: c.unique });
    }
  }
  return [...pairs.values()].map(p => `  ${mm(p.parent)} ${p.nullable ? '|o' : '||'}--${p.unique ? 'o|' : 'o{'} ${mm(p.child)} : "${[...p.labels].join(' / ').slice(0, 60)}"`);
}
{
  let s = `# DeepSprout v4 — مخططات العلاقات (ERD)\n\n${genNote}\n`;
  s += `المخططات مولَّدة من المفاتيح الأجنبية المعرفة في النموذج نفسه، فلا توجد علاقة مرسومة غير موجودة في القاموس. تُعرض بـMermaid (GitHub وVS Code وأغلب عارضات Markdown).\n\n`;
  s += `**قراءة الرموز:** \`||--o{\` أب إلزامي وأبناء كثيرون؛ \`|o--o{\` الأب اختياري (FK يقبل NULL)؛ \`--o|\` علاقة واحد لواحد على الأكثر. الأعمدة المعروضة هي المفاتيح والحالة والنوع؛ الأعمدة الكاملة في [02-data-dictionary-ar.md](02-data-dictionary-ar.md). لتخفيف الزحام، روابط \`iam.Person\` لأعمدة الفاعل (\`…ByPersonId\`، المراجع، المقيِّم…) لا تُرسم في مخططات الوحدات؛ كلها مفاتيح حقيقية في القاموس.\n\n`;
  // high level
  const modEdges = new Map();
  for (const t of tables) for (const f of t.fks) {
    const a = t.schema, b = f.ref.split('.')[0]; if (a === b) continue;
    const k = a + '>' + b; modEdges.set(k, (modEdges.get(k) || 0) + 1);
  }
  s += `## 1. الخريطة العامة للوحدات\n\nكل عقدة وحدة (schema) بعدد جداولها، وكل سهم = مفاتيح أجنبية من الوحدة إلى الوحدة الهدف (بالعدد). \`iam\` هدف لكل الوحدات تقريبًا لأن الهوية واحدة.\n\n\`\`\`mermaid\nflowchart LR\n`;
  for (const [m, title] of MODULES) s += `  ${m}["${m}<br/>${tables.filter(t => t.schema === m).length} جداول"]\n`;
  for (const [k, n] of [...modEdges].sort()) { const [a, b] = k.split('>'); s += `  ${a} -->|${n}| ${b}\n`; }
  s += `\`\`\`\n\n`;
  // module diagrams
  s += `## 2. مخططات الوحدات\n\nكل جدول في التصميم يظهر في مخطط وحدته بالضبط. الجداول الخارجية تظهر كأطراف علاقات فقط.\n`;
  let n = 0;
  for (const [m, title] of MODULES) {
    const own = tables.filter(t => t.schema === m);
    const set = new Set(own.map(t => t.name));
    const ext = new Set();
    for (const t of own) for (const f of t.fks) if (!set.has(f.ref) && !(f.ref === 'iam.Person' && !f.cols.some(c => PERSON_LINK.has(c)))) ext.add(f.ref);
    for (const [ref, arr] of Object.entries(incoming)) if (set.has(ref)) for (const { from, fk } of arr) if (!set.has(from.name) && from.schema !== 'iam' && !(ref === 'iam.Person')) { /* incoming shown in their own module */ }
    const all = new Set([...set, ...ext]);
    n++;
    s += `\n### 2.${n} ${m} — ${title}\n\n\`\`\`mermaid\nerDiagram\n`;
    for (const t of own) s += erEntity(t, false) + '\n';
    for (const e of ext) s += `  ${mm(e)} {\n    bigint Id PK\n  }\n`;
    s += erEdges(all, { allPerson: m === 'iam' }).join('\n') + '\n```\n';
    s += `\nالجداول: ${own.map(t => code(t.name)).join('، ')}${ext.size ? `. أطراف خارجية: ${[...ext].map(code).join('، ')}` : ''}.\n`;
  }
  // cross-module maps
  const maps = [
    ['3.1 الهوية والتفويض: من يملك صلاحية على ماذا', 'كل صلاحية مورد هي صف بحالة وفترة يربط Person بمورد محدد؛ لا يوجد دور عام يمنح قراءة بيانات خاصة. مساحات العمل في الـWorkspace Switcher تُشتق من هذه الصفوف النشطة فقط.',
      ['iam.Person', 'iam.GlobalGrant', 'org.Organization', 'org.OrganizationMember', 'org.VerificationCase', 'org.StaffAppointment', 'institution.Initiative', 'provider.Experience', 'coach.CoachProgram', 'coach.OperationalGroup', 'coach.GroupMembership', 'coach.GroupCoachAssignment', 'session.Session', 'session.SessionDuty', 'provider.ProviderCohort'], true],
    ['3.2 العضوية والمشاركة عبر المالكين', 'المبادرة: طلب واحد يحمل الطابور والعرض والعضوية؛ التسكين في المجموعة يشير إليه. البرنامج: عضوية المجموعة بالدعوة. المزوّد: الحجز يحمل الطابور والعرض. الجلسة: تسجيل المبادرة أو حجز المزوّد مصدر الحضور (XOR). الإكمال يشير إلى أحد الثلاثة.',
      ['iam.Person', 'institution.Initiative', 'institution.InitiativeApplication', 'institution.InitiativeApplicationDecision', 'coach.OperationalGroup', 'coach.GroupMembership', 'coach.CoachProgram', 'provider.Experience', 'provider.ExperienceBooking', 'provider.ProviderCohortMember', 'session.Session', 'session.SessionRegistration', 'session.Attendance', 'session.AbsenceExcuse', 'session.Completion'], false],
    ['3.3 الأدلة والمكافآت: من المصدر إلى الحديقة', 'خمسة مصادر فقط تنتج EvidenceEvent بمفتاح مصدر فريد؛ دفترا المكافأة يستهلكان الحدث مرة واحدة لكل أثر، والعكس يشير إلى المنح. التسجيل والعذر المقبول والنقر والمنشورات لا تنتج دليلًا (المنشور يشير إلى دليل موجود فقط للمشاركة).',
      ['iam.Person', 'evidence.EvidenceEvent', 'activity.PracticeAttempt', 'activity.RoutineCheckIn', 'task.ReviewDecision', 'session.Attendance', 'session.Completion', 'community.Post', 'evidence.RewardPolicyVersion', 'evidence.PersonalRewardEntry', 'evidence.GroupRewardEntry', 'institution.Initiative', 'coach.OperationalGroup'], false],
    ['3.4 النسخ الثابتة ومن يثبّت عليها', 'كل مورد منشور له جذر قابل للتغيير ونسخ إلحاقية؛ كل فعل مشارك يثبَّت على النسخة التي تم بموجبها، فلا يُعاد كتابة شرط قُبل عليه أحد.',
      ['institution.Initiative', 'institution.InitiativeRevision', 'institution.InitiativeApplication', 'coach.CoachProgram', 'coach.ProgramRevision', 'provider.Experience', 'provider.ExperienceRevision', 'provider.ExperienceBooking', 'session.Session', 'session.SessionRevision', 'session.SessionRegistration', 'session.Completion', 'forms.Form', 'forms.FormVersion', 'forms.FormResponse', 'task.Assignment', 'task.AssignmentRevision', 'task.SubmissionAttempt', 'activity.PracticeDefinition', 'activity.PracticeVersion', 'activity.PracticeAttempt', 'lab.InstrumentVersion', 'lab.AssessmentAttempt'], false],
  ];
  s += `\n## 3. خرائط عابرة للوحدات\n`;
  for (const [title, text, list, allPerson] of maps) {
    for (const n of list) if (!byName.has(n)) fail(`cross map table ${n} missing`);
    const set = new Set(list);
    s += `\n### ${title}\n\n${text}\n\n\`\`\`mermaid\nerDiagram\n${list.map(n => `  ${mm(n)} {\n    bigint Id PK\n  }`).join('\n')}\n${erEdges(set, { allPerson }).join('\n')}\n\`\`\`\n`;
  }
  // identity usage summary
  const personRefs = {};
  for (const t of tables) for (const f of t.fks) if (f.ref === 'iam.Person') (personRefs[t.schema] ||= []).push(`${t.short}.${f.cols[0]}`);
  s += `\n### 3.5 كل الإشارات إلى الهوية الموحدة \`iam.Person\`\n\n| الوحدة | الأعمدة |\n|---|---|\n`;
  for (const [m] of MODULES) if (personRefs[m]) s += `| ${m} | ${personRefs[m].map(code).join('، ')} |\n`;
  out('03-erd-ar.md', s);
}

// ------------------------------------------------------------------ 04 migration matrix
{
  const KIND = { 'same': 'إبقاء (مع تعديلات أعمدة)', 'rename': 'إبقاء بإعادة تسمية/نقل مخطط', 'eliminate-structure': 'إزالة بنية غير لازمة', 'same-fact': 'دمج تمثيلين لحقيقة واحدة', 'json-snapshot': 'نقل إلى لقطة JSON ثابتة', 'to-logs': 'نقل telemetry من SQL إلى السجلات', 'defer-unapproved': 'تأجيل ميزة غير معتمدة', 'defer-excluded': 'استبعاد ميزة قيد المراجعة' };
  let s = `# DeepSprout v4 — مصفوفة الترحيل من 129 جدولًا\n\n${genNote}\n`;
  s += `## المطابقة الحسابية\n\n| الإجراء | العدد |\n|---|---:|\n| KEEP (يبقى مصدر هوية لجدول نهائي، مع إعادة تسمية أو توسيع) | ${counts.KEEP} |\n| MERGE (محتواه ينتقل إلى جدول نهائي مسمى) | ${counts.MERGE} |\n| REMOVE (بلا وجهة) | ${counts.REMOVE} |\n| DEFER (ميزة غير معتمدة أو مستبعدة) | ${counts.DEFER} |\n| **المجموع = جداول المنتج الحية في \`DeepSprout_Validation\`** | **${counts.KEEP + counts.MERGE + counts.REMOVE + counts.DEFER}** |\n\n`;
  s += `**الجدول النهائي = KEEP = ${counts.KEEP}.** كل جدول نهائي له مصدر KEEP واحد بالضبط (يتحقق منه المولّد)، ولا يوجد جدول نهائي بلا أصل: التصميم لا يضيف كيانات جديدة، بل يعيد تشكيل الموجود ويسد ثغراته بأعمدة.\n\n`;
  const byKind = {}; for (const m of mig) byKind[m.kind] = (byKind[m.kind] || 0) + 1;
  s += `### حسب نوع التغيير (تمييز المالك بين الحذف والدمج والتأجيل)\n\n| النوع | الصفوف |\n|---|---:|\n`;
  for (const [k, v] of Object.entries(byKind)) s += `| ${KIND[k] || k} | ${v} |\n`;
  s += `\nلا يوجد صف من نوع "إضعاف متطلب منتج". صفان فقط ينقلان تعقيدًا من SQL إلى C# بشكل مقصود وموثق: \`coach.ProgramStage\` (تحقق بنية JSON عند النشر) و\`session.SessionCapacityPool\` (مشغّل يتحقق أن الجلسة تعرض النمط). وصف واحد ينقل telemetry إلى السجلات: \`ops.DeliveryAttempt\`.\n\n`;
  s += `## المصفوفة الكاملة\n\nعمودا FK الحية من كتالوج SQL الفعلي (\`../review/live-schema.json\`).\n\n| # | الجدول الحالي | أعمدة | FK صادرة/واردة | الإجراء | الوجهة في v4 | النوع | التغيير | العاقبة العلائقية أو السلوكية |\n|---:|---|---:|---|---|---|---|---|---|\n`;
  mig.sort((a, b) => a.old.localeCompare(b.old)).forEach((m, i) => {
    s += `| ${i + 1} | ${code(m.old)} | ${(liveCols[m.old] || []).length} | ${liveFkOut[m.old] || 0}/${liveFkIn[m.old] || 0} | **${m.action}** | ${m.target ? code(m.target) : '—'} | ${KIND[m.kind] || m.kind} | ${esc(m.change)} | ${esc(m.consequence)} |\n`;
  });
  s += `\n## الاتجاه العكسي: كل جدول نهائي ومصادره\n\n| الجدول النهائي | مصدر KEEP | مدموج فيه |\n|---|---|---|\n`;
  for (const t of tables) s += `| ${code(t.name)} | ${code(t.keepFrom)} | ${t.mergedFrom.map(code).join('، ') || '—'} |\n`;
  out('04-migration-matrix-ar.md', s);
  out('migration-matrix.csv', bom + csv([['OldTable', 'LiveColumns', 'LiveFkOut', 'LiveFkIn', 'Action', 'V4Table', 'ChangeKind', 'Change', 'Consequence'], ...mig.map(m => [m.old, (liveCols[m.old] || []).length, liveFkOut[m.old] || 0, liveFkIn[m.old] || 0, m.action, m.target || '', m.kind, m.change, m.consequence])]));
}

// ------------------------------------------------------------------ 05a test traceability
{
  const dcount = {}; for (const t of tests) dcount[t.disp] = (dcount[t.disp] || 0) + 1;
  let s = `# DeepSprout v4 — تتبع الفحوص الـ330 المسجلة إلى المخطط الجديد\n\n${genNote}\n`;
  s += `المصدر: \`../phase-b/final-regression/*.jsonl\` (330 فحصًا، كلها PASS في 1 نوفمبر على \`DeepSprout_Validation\`). كل فحص يظهر هنا مرة واحدة بقرار صريح؛ لا يُحذف فحص بصمت لأن جدوله اختفى.\n\n`;
  s += `| القرار | المعنى | العدد |\n|---|---|---:|\n`;
  const DESC = { CARRY: 'الثابت نفسه على الجدول نفسه (أو اسمه الجديد): يُنقل كما هو', REWRITE: 'الثابت نفسه يُفرض الآن بجدول/قيد آخر بعد الدمج: يُعاد كتابته', STRUCTURAL: 'كان يحرس اتساق نسختين من حقيقة واحدة؛ النسخة اختفت، والبديل المسمى يثبت الضمان', DEFER: 'ميزته مؤجلة؛ يعود معها', REGENERATE: 'بيئة/عدد جداول/حفظ بيانات/ملخص: يُعاد توليده لقاعدة v4' };
  for (const k of ['CARRY', 'REWRITE', 'STRUCTURAL', 'DEFER', 'REGENERATE']) s += `| ${k} | ${DESC[k]} | ${dcount[k] || 0} |\n`;
  s += `| **المجموع** | | **${tests.length}** |\n\n`;
  s += `## الفحوص البنيوية (STRUCTURAL) وبدائلها\n\n| الفحص | الأصل | البديل |\n|---|---|---|\n`;
  for (const t of tests.filter(t => t.disp === 'STRUCTURAL')) s += `| ${code(t.id)} | ${esc(t.detail.slice(0, 90))} | ${esc(t.note)} |\n`;
  s += `\n## الجدول الكامل\n\n| الجناح | الفحص | النتيجة السابقة | التفصيل السابق | القرار | الهدف في v4 | ملاحظة |\n|---|---|---|---|---|---|---|\n`;
  for (const t of tests) s += `| ${t.suite} | ${code(t.id)} | ${t.oldStatus} | ${esc(t.detail.slice(0, 100))} | **${t.disp}** | ${esc(t.target)} | ${esc(t.note)} |\n`;
  out('05a-test-traceability-ar.md', s);
  out('test-traceability.csv', bom + csv([['Suite', 'OldTestId', 'OldStatus', 'OldDetail', 'Disposition', 'V4Target', 'Note'], ...tests.map(t => [t.suite, t.id, t.oldStatus, t.detail, t.disp, t.target, t.note])]));
}

// ------------------------------------------------------------------ machine-readable schema
{
  const json = tables.map(t => ({
    table: t.name, module: t.schema, rowKind: t.std === 'm' ? 'mutable' : 'append-only',
    columns: t.columns.map(c => ({ name: c.name, type: c.type, nullable: c.nullable, default: c.def })),
    primaryKey: ['Id'],
    foreignKeys: t.fks.map(f => ({ columns: f.cols, references: f.ref, referencedColumns: f.refCols })),
    unique: t.uqs.map(u => ({ columns: u.cols, filter: u.where })),
    indexes: t.ixs.map(u => ({ columns: u.cols, include: u.include, filter: u.where })),
    checks: t.cks.map(c => ({ name: `CK_${t.short}_${c.name}`, expression: c.expr })),
    guards: t.guards || [], keepFrom: t.keepFrom, mergedFrom: t.mergedFrom,
  }));
  out('schema.json', JSON.stringify({ version: 'v4-final', generatedFrom: 'model/*.mjs', tableCount: tables.length, tables: json }, null, 2) + '\n');
  out('final-tables.csv', bom + csv([['Module', 'Table', 'RowKind', 'Columns', 'ForeignKeys', 'UniqueConstraints', 'Checks', 'KeepFrom', 'MergedFrom'], ...tables.map(t => [t.schema, t.name, t.std === 'm' ? 'mutable' : 'append-only', t.columns.length, t.fks.length, t.uqs.length, t.cks.length, t.keepFrom, t.mergedFrom.join(' ')])]));
}

// ------------------------------------------------------------------ report
const stats = {
  tables: tables.length,
  columns: tables.reduce((n, t) => n + t.columns.length, 0),
  foreignKeys: tables.reduce((n, t) => n + t.fks.length, 0),
  compositeForeignKeys: tables.reduce((n, t) => n + t.fks.filter(f => f.cols.length > 1).length, 0),
  uniqueConstraints: tables.reduce((n, t) => n + t.uqs.length, 0),
  filteredUnique: tables.reduce((n, t) => n + t.uqs.filter(u => u.where).length, 0),
  checks: tables.reduce((n, t) => n + t.cks.length, 0),
  appendOnlyTables: tables.filter(t => t.std === 'a').length,
  migration: counts,
  tests: tests.reduce((o, t) => (o[t.disp] = (o[t.disp] || 0) + 1, o), {}),
};
out('validation-report.txt', `DeepSprout v4 generator validation\n${new Date().toISOString()}\n\n${JSON.stringify(stats, null, 2)}\n\nErrors: ${errors.length}\n${errors.join('\n')}\n`);
console.log(JSON.stringify(stats, null, 2));
if (errors.length) { console.error(`\n${errors.length} validation error(s):\n` + errors.join('\n')); process.exit(1); }
console.log('\nAll validations passed.');
