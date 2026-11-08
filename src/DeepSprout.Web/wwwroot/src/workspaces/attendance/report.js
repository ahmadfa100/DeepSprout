/**
 * Meeting attendance reports (.csv / .xlsx) exported from Zoom, Google Meet,
 * Microsoft Teams or a similar tool. Pure parsing only: no network, no
 * integration. The .xlsx reader handles the first worksheet of a standard
 * Office Open XML workbook with the browser's DecompressionStream.
 */
import {sessionTimestamp} from '../initiative-rules.js';

export const MAX_REPORT_BYTES = 5 * 1024 * 1024;
export const REPORT_TYPES = ['csv', 'xlsx'];

export function fileKind(name = '') {
  const ext = String(name).toLowerCase().split('.').pop();
  if (ext === 'csv') return 'csv';
  if (ext === 'xlsx') return 'xlsx';
  if (ext === 'xls') throw new Error('Older .xls files cannot be read. Save the report as .xlsx or .csv and try again.');
  throw new Error('Choose an .xlsx or .csv attendance report.');
}

/* ------------------------------------------------------------- CSV */

export function parseCSV(text) {
  const src = String(text).replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] || '';
  const delimiter = [',', ';', '\t'].map(d => [d, firstLine.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.map(r => r.map(v => v.trim()));
}

/* ------------------------------------------------------------ XLSX */

const u16 = (b, o) => b[o] | b[o + 1] << 8;
const u32 = (b, o) => (b[o] | b[o + 1] << 8 | b[o + 2] << 16 | b[o + 3] << 24) >>> 0;

async function inflate(bytes) {
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot open .xlsx files. Save the report as .csv and try again.');
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function unzip(buffer) {
  const b = new Uint8Array(buffer);
  let end = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (u32(b, i) === 0x06054b50) { end = i; break; }
  if (end < 0) throw new Error('This file is not a valid .xlsx workbook.');
  const count = u16(b, end + 10), files = new Map();
  let p = u32(b, end + 16);
  for (let n = 0; n < count; n++) {
    if (u32(b, p) !== 0x02014b50) throw new Error('This .xlsx workbook is damaged.');
    const method = u16(b, p + 10), size = u32(b, p + 20), nameLen = u16(b, p + 28), extra = u16(b, p + 30), comment = u16(b, p + 32), local = u32(b, p + 42);
    const name = new TextDecoder().decode(b.subarray(p + 46, p + 46 + nameLen));
    files.set(name, {method, size, local});
    p += 46 + nameLen + extra + comment;
  }
  return async name => {
    const f = files.get(name);
    if (!f) return null;
    const start = f.local + 30 + u16(b, f.local + 26) + u16(b, f.local + 28), data = b.subarray(start, start + f.size);
    const raw = f.method === 0 ? data : f.method === 8 ? await inflate(data) : null;
    if (!raw) throw new Error('This .xlsx workbook uses an unsupported compression method.');
    return new TextDecoder().decode(raw);
  };
}
const xmlText = v => v.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&amp;/g, '&');
const columnIndex = ref => [...ref.replace(/\d+/g, '')].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;

export async function readXlsx(buffer) {
  const entry = await unzip(buffer);
  const workbook = await entry('xl/workbook.xml');
  if (!workbook) throw new Error('This file is not a valid .xlsx workbook.');
  const rels = await entry('xl/_rels/workbook.xml.rels') || '';
  const firstSheet = workbook.match(/<sheet\b[^>]*r:id="([^"]+)"/)?.[1];
  const target = rels.match(new RegExp(`<Relationship\\b[^>]*Id="${firstSheet}"[^>]*Target="([^"]+)"`))?.[1] || rels.match(new RegExp(`<Relationship\\b[^>]*Target="([^"]+)"[^>]*Id="${firstSheet}"`))?.[1] || 'worksheets/sheet1.xml';
  const sheet = await entry(target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`);
  if (!sheet) throw new Error('The workbook has no readable worksheet.');
  const shared = [...(await entry('xl/sharedStrings.xml') || '').matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => [...m[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(t => xmlText(t[1])).join(''));
  const rows = [];
  for (const r of sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = [];
    for (const c of r[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1], body = c[2] || '', ref = attrs.match(/\br="([A-Z]+\d+)"/)?.[1], type = attrs.match(/\bt="(\w+)"/)?.[1];
      const v = body.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      let value = '';
      if (type === 's') value = shared[Number(v)] ?? '';
      else if (type === 'inlineStr') value = [...body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(t => xmlText(t[1])).join('');
      else if (v != null) value = type === 'str' || type === 'b' ? xmlText(v) : Number.isFinite(Number(v)) ? Number(v) : xmlText(v);
      row[ref ? columnIndex(ref) : row.length] = value;
    }
    rows.push(Array.from(row, v => typeof v === 'string' ? v.trim() : v ?? ''));
  }
  return rows;
}

/* ---------------------------------------------------- column detection */

const norm = v => String(v ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const COLUMNS = {
  name:['name original name', 'name', 'full name', 'participant', 'participant name', 'display name', 'attendee', 'attendee name', 'user name'],
  first:['first name', 'given name'],
  last:['last name', 'surname', 'family name'],
  email:['user email', 'email', 'email address', 'attendee email', 'participant email', 'participant id upn', 'upn', 'e mail'],
  join:['join time', 'time joined', 'first join', 'joined', 'join', 'first seen', 'joined at', 'join date time'],
  leave:['leave time', 'time exited', 'last leave', 'left', 'leave', 'exited', 'last seen', 'left at'],
  duration:['duration minutes', 'duration', 'in meeting duration', 'attendance duration', 'minutes', 'time in call', 'duration mins', 'total duration', 'duration seconds', 'time in meeting'],
  role:['role', 'participant role'],
  guest:['guest']
};
function headerMap(row) {
  const cells = row.map(norm), map = {};
  for (const [key, names] of Object.entries(COLUMNS)) {
    const at = cells.findIndex(c => names.includes(c));
    const loose = at >= 0 ? at : cells.findIndex(c => c && names.some(n => n.length > 4 && c.startsWith(n)));
    if (loose >= 0) map[key] = loose;
  }
  if (map.duration != null) map.durationUnit = /second|secs?\b/.test(cells[map.duration]) ? 'seconds' : /minute|mins?\b/.test(cells[map.duration]) ? 'minutes' : 'auto';
  return map;
}
export function detectColumns(rows) {
  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const cells = rows[i].map(norm);
    if (cells.some(c => ['meeting id', 'topic', 'meeting title', 'meeting code'].includes(c))) continue;
    const map = headerMap(rows[i]);
    if ((map.name != null || map.email != null || map.first != null) && (map.join != null || map.duration != null)) return {headerRow:i, map};
  }
  return null;
}
export function detectSource(rows) {
  const text = rows.slice(0, 40).map(r => r.join(' ')).join(' ').toLowerCase();
  if (/name \(original name\)|zoom/.test(text)) return 'Zoom';
  if (/time joined|time exited|google meet|meet\.google/.test(text)) return 'Google Meet';
  if (/first join|last leave|in-meeting duration|participant id \(upn\)|teams/.test(text)) return 'Microsoft Teams';
  return 'Meeting report';
}

/* --------------------------------------------- timestamps & durations */

const pad = n => String(n).padStart(2, '0');
const wall = (date, h, m, sec, tz) => sessionTimestamp(date, `${pad(h)}:${pad(m)}`, tz) + sec * 1000;
/** A report cell → epoch ms. Wall-clock values are read in the session's time zone. */
export function parseWhen(value, tz, sessionDate) {
  if (value === '' || value == null) return null;
  if (typeof value === 'number') {
    if (value < 1) { const secs = Math.round(value * 86400); return sessionDate ? wall(sessionDate, Math.floor(secs / 3600), Math.floor(secs / 60) % 60, secs % 60, tz) : null; }
    const ms = Math.round((value - 25569) * 86400000), d = new Date(ms);
    return wall(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), tz);
  }
  const v = String(value).trim().replace(/ | /g, ' ');
  if (/^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:?\d{2})$/.test(v)) { const t = Date.parse(v); return Number.isFinite(t) ? t : null; }
  const time = s => { const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap]\.?m\.?)?$/i); if (!m) return null; let h = Number(m[1]); const ap = m[4]?.toLowerCase()[0]; if (ap === 'p' && h < 12) h += 12; if (ap === 'a' && h === 12) h = 0; return [h, Number(m[2]), Number(m[3] || 0)]; };
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T]+(.+)$/);
  if (m) { const t = time(m[4]); return t ? wall(`${m[1]}-${pad(m[2])}-${pad(m[3])}`, ...t, tz) : null; }
  m = v.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4}),?\s+(.+)$/);
  if (m) {
    const t = time(m[4]); if (!t) return null;
    const a = Number(m[1]), b = Number(m[2]), y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const [, sm, sd] = (sessionDate || '').split('-').map(Number);
    const dayFirst = a > 12 || (b <= 12 && a === sd && b === sm && !(a === sm && b === sd));
    const [month, day] = dayFirst ? [b, a] : [a, b];
    return wall(`${y}-${pad(month)}-${pad(day)}`, ...t, tz);
  }
  const t = time(v);
  return t && sessionDate ? wall(sessionDate, ...t, tz) : null;
}
export function parseMinutes(value, unit = 'auto') {
  if (value === '' || value == null) return null;
  if (typeof value === 'number') return unit === 'seconds' ? value / 60 : value < 1 && unit !== 'minutes' ? value * 1440 : value;
  const v = String(value).trim().toLowerCase();
  if (/^\d+(\.\d+)?$/.test(v)) return unit === 'seconds' ? Number(v) / 60 : Number(v);
  let m = v.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]) + Number(m[3]) / 60;
  m = v.match(/^(\d{1,3}):(\d{2})$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  const part = re => Number(v.match(re)?.[1] || 0);
  const h = part(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/), min = part(/(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes)\b/), sec = part(/(\d+(?:\.\d+)?)\s*(?:s|sec|secs|second|seconds)\b/);
  return h || min || sec ? h * 60 + min + sec / 60 : null;
}

/**
 * Rows → participant records. `tz` and `sessionDate` resolve wall-clock and
 * time-only values. Every record keeps its 1-based source line number.
 */
export function extractRecords(rows, tz, sessionDate) {
  const found = detectColumns(rows);
  if (!found) throw new Error('No participant columns were found. The report needs a Name or Email column, and a Join time or Duration column.');
  const {headerRow, map} = found, out = [];
  for (let i = headerRow + 1; i < rows.length; i++) {
    const r = rows[i], get = k => map[k] == null ? '' : r[map[k]] ?? '';
    if (!r.some(v => String(v).trim())) continue;
    if (detectColumns([r])) break;
    const name = String(get('name') || [get('first'), get('last')].filter(Boolean).join(' ')).trim(), email = String(get('email')).trim().toLowerCase();
    if (!name && !email) continue;
    out.push({line:i + 1, name, email:/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '', joinedAt:parseWhen(get('join'), tz, sessionDate), leftAt:parseWhen(get('leave'), tz, sessionDate), minutes:parseMinutes(get('duration'), map.durationUnit), role:String(get('role')), guest:/^(yes|true|1)$/i.test(String(get('guest')))});
  }
  if (!out.length) throw new Error('The report has column headings but no participant rows.');
  return {records:out, source:detectSource(rows), columns:Object.keys(map).filter(k => k !== 'durationUnit')};
}

/** Read a File/Blob into participant records (async because .xlsx is zipped). */
export async function readReport(file, tz, sessionDate) {
  const kind = fileKind(file.name);
  if (!file.size) throw new Error('This file is empty.');
  if (file.size > MAX_REPORT_BYTES) throw new Error('This file is larger than 5 MB. Export only the participant list and try again.');
  const buffer = await file.arrayBuffer();
  const rows = kind === 'csv' ? parseCSV(new TextDecoder().decode(buffer)) : await readXlsx(buffer);
  return {kind, fingerprint:await fingerprint(buffer), ...extractRecords(rows, tz, sessionDate)};
}

/** SHA-256 of the file bytes (FNV-1a fallback outside a secure context). */
export async function fingerprint(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (globalThis.crypto?.subtle) return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
  let h = 0x811c9dc5;
  for (const b of bytes) h = Math.imul(h ^ b, 0x01000193) >>> 0;
  return `fnv1a-${h.toString(16)}-${bytes.length}`;
}
