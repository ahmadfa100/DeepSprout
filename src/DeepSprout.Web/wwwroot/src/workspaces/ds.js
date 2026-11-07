/**
 * DeepSprout workspace design system (string components + one motion binder).
 *
 * Every component renders plain, semantic HTML/SVG from values the caller
 * derived from original records. Charts always ship a text summary and a
 * table twin, a legend for 2+ series, and a keyboard-reachable tooltip.
 * Motion is transform/opacity only and is skipped under reduced motion.
 */
import {esc, icon, href} from './ui.js';

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = n => Number.isFinite(Number(n)) ? Number(n).toLocaleString('en-GB') : String(n ?? '—');
let uid = 0;
const nextId = prefix => `${prefix}-${++uid}`;

/* ------------------------------------------------------------ layout */

export function pageHead({eyebrow = '', title, lead = '', actions = '', meta = '', cls = ''}) {
  return `<header class="ds-head iw-reveal ${cls}"><div class="ds-head-copy">${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}<h1>${esc(title)}</h1>${lead ? `<p class="ds-lead">${lead}</p>` : ''}${meta ? `<div class="ds-head-meta">${meta}</div>` : ''}</div>${actions ? `<div class="ds-head-actions">${actions}</div>` : ''}</header>`;
}
/** A content panel. `flush` removes inner padding for tables and lists. */
export function panel({title = '', eyebrow = '', actions = '', body = '', cls = '', id = '', flush = false}) {
  return `<section class="ds-panel iw-reveal ${flush ? 'is-flush' : ''} ${cls}" ${id ? `id="${esc(id)}"` : ''}>${title || actions ? `<header class="ds-panel-head"><div>${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}${title ? `<h2>${esc(title)}</h2>` : ''}</div>${actions ? `<div class="ds-panel-actions">${actions}</div>` : ''}</header>` : ''}<div class="ds-panel-body">${body}</div></section>`;
}
export function banner(tone, title, text = '', actions = '') {
  const glyph = tone === 'positive' ? 'check' : tone === 'critical' ? 'alert' : tone === 'info' ? 'info' : 'clock';
  return `<div class="ds-banner is-${esc(tone)}" role="${tone === 'critical' ? 'alert' : 'status'}">${icon(glyph)}<div><strong>${esc(title)}</strong>${text ? `<p>${text}</p>` : ''}</div>${actions ? `<div class="actions">${actions}</div>` : ''}</div>`;
}
export function empty(title, text, action = '', {art = true} = {}) {
  return `<div class="ds-empty iw-reveal">${art ? '<img src="assets/onboarding/bimo-calm.png" alt="" width="88" height="110">' : `<span class="ds-empty-mark">${icon('leaf')}</span>`}<h2>${esc(title)}</h2><p>${esc(text)}</p>${action ? `<div class="actions">${action}</div>` : ''}</div>`;
}
/** Status chip with a shape cue so state is never colour alone. */
const TONE = {
  positive:['Accepted','Published','Active','Present','Approved','Completed','Confirmed','Open','Running','Recommended','Checked In','Verified','Supervised','On duty','Submitted report'],
  attention:['Pending','Queued','Offered','Seat Offered','Submitted','Needs Revision','Draft','Late','Upcoming','Invited','In Progress','Assigned','Waitlisted','Pending Approval','Needs Review','Info Requested','Opens soon'],
  critical:['Rejected','Removed','Blocked','Suspended','Revoked','Cancelled','Absent','Expired','Offer Expired','Declined','Needs Supervisor','Closed','Withdrawn','Overdue','Not completed','Retired','Archived']
};
export const toneOf = status => TONE.positive.includes(status) ? 'positive' : TONE.attention.includes(status) ? 'attention' : TONE.critical.includes(status) ? 'critical' : 'neutral';
export const chip = (status, label = status) => `<span class="ds-chip is-${toneOf(status)}"><i aria-hidden="true"></i>${esc(label)}</span>`;

/* -------------------------------------------------------------- KPIs */

/**
 * A KPI tile. `of` adds a denominator and an animated meter; `trend` adds a
 * sparkline of real per-period counts (never invented). `href` makes the tile
 * the shortcut to the queue it counts.
 */
export function kpi({label, value, of = null, hint = '', href: to = '', tone = '', trend = null, unit = ''}) {
  const pct = of ? Math.min(100, Math.round(Number(value) / Math.max(1, Number(of)) * 100)) : null;
  const inner = `<span class="ds-kpi-label">${esc(label)}</span><span class="ds-kpi-value"><b data-count="${esc(value)}">${esc(fmt(value))}</b>${unit ? `<em>${esc(unit)}</em>` : ''}${of !== null ? `<small>/ ${esc(fmt(of))}</small>` : ''}</span>${pct !== null ? `<span class="ds-meter" role="img" aria-label="${esc(`${value} of ${of}`)}"><i style="--w:${pct}%"></i></span>` : ''}${trend && trend.length > 1 ? sparkline(trend, label) : ''}${hint ? `<span class="ds-kpi-hint">${esc(hint)}</span>` : ''}`;
  return to ? `<a class="ds-kpi ${tone ? `is-${tone}` : ''}" href="${href(to)}">${inner}<span class="ds-kpi-go" aria-hidden="true">${icon('arrow')}</span></a>` : `<div class="ds-kpi ${tone ? `is-${tone}` : ''}">${inner}</div>`;
}
export const kpis = (items, cls = '') => `<div class="ds-kpis iw-reveal ${cls}">${items.join('')}</div>`;
export function sparkline(values, label = '') {
  const w = 96, h = 26, max = Math.max(1, ...values), step = w / (values.length - 1);
  const pts = values.map((v, i) => [i * step, h - 2 - (v / max) * (h - 6)]);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return `<svg class="ds-spark" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(`${label}: ${values.join(', ')} per period`)}"><path d="${d} L${w} ${h} L0 ${h} Z" class="area"/><path d="${d}" class="line"/><circle cx="${pts.at(-1)[0]}" cy="${pts.at(-1)[1]}" r="2.5"/></svg>`;
}
export function meter(value, max, label, {tone = ''} = {}) {
  const pct = max ? Math.min(100, Math.round(value / max * 100)) : 0;
  return `<div class="ds-progress ${tone ? `is-${tone}` : ''}"><div class="ds-progress-top"><span>${esc(label)}</span><b>${esc(fmt(value))}<small> / ${esc(fmt(max))}</small></b></div><span class="ds-meter" role="img" aria-label="${esc(`${label}: ${value} of ${max}`)}"><i style="--w:${pct}%"></i></span></div>`;
}

/* ------------------------------------------------------------ charts */

/** Series colours follow the entity (slot order), never rank. Validated palette. */
const SLOT = ['s1', 's2', 's3'];
const tableTwin = (caption, head, rows) => `<details class="ds-table-twin"><summary>Show as table</summary><table><caption class="sr-only">${esc(caption)}</caption><thead><tr>${head.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => i ? `<td>${esc(c)}</td>` : `<th scope="row">${esc(c)}</th>`).join('')}</tr>`).join('')}</tbody></table></details>`;
const legend = series => series.length > 1 ? `<ul class="ds-legend">${series.map((s, i) => `<li><i class="is-${SLOT[i] || 'other'}" aria-hidden="true"></i>${esc(s.label)}</li>`).join('')}</ul>` : '';

/**
 * Line/area chart over shared periods. series: [{label, values:[n…]}],
 * periods: ['12 Oct', …]. One y-axis only. Points carry tooltips.
 */
export function trendChart({title, periods, series, summary = '', height = 190, showTable = true, empty: emptyText = 'No records in this range yet.'}) {
  const total = series.reduce((n, s) => n + s.values.reduce((a, b) => a + b, 0), 0);
  const id = nextId('ds-trend');
  if (!periods.length || !total) return `<figure class="ds-chart is-empty"><figcaption class="sr-only">${esc(title)}</figcaption><p class="ds-chart-empty">${icon('chart')}${esc(emptyText)}</p></figure>`;
  const w = 560, h = height, padL = 30, padR = 12, padT = 12, padB = 26, max = niceMax(Math.max(1, ...series.flatMap(s => s.values)));
  const x = i => padL + (periods.length === 1 ? (w - padL - padR) / 2 : i * (w - padL - padR) / (periods.length - 1));
  const y = v => padT + (h - padT - padB) * (1 - v / max);
  const ticks = [0, max / 2, max].map(v => Math.round(v));
  const grid = ticks.map(v => `<line x1="${padL}" x2="${w - padR}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${padL - 8}" y="${y(v) + 4}" class="tick" text-anchor="end">${v}</text>`).join('');
  const labelEvery = Math.ceil(periods.length / 7);
  const xLabels = periods.map((p, i) => i % labelEvery === 0 || i === periods.length - 1 ? `<text x="${x(i)}" y="${h - 6}" class="tick" text-anchor="middle">${esc(p)}</text>` : '').join('');
  const paths = series.map((s, si) => { const d = s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' '); return `<g class="ds-series is-${SLOT[si] || 'other'}">${si === 0 ? `<path class="area" d="${d} L${x(s.values.length - 1)} ${y(0)} L${x(0)} ${y(0)} Z"/>` : ''}<path class="line" pathLength="1" d="${d}"/></g>`; }).join('');
  const hits = periods.map((p, i) => `<g class="ds-hit" tabindex="0" role="button" aria-label="${esc(`${p}: ${series.map(s => `${s.label} ${s.values[i]}`).join(', ')}`)}" data-tip="${esc(`<strong>${esc(p)}</strong>${series.map((s, si) => `<span><i class='is-${SLOT[si] || 'other'}'></i>${esc(s.label)} <b>${s.values[i]}</b></span>`).join('')}`)}"><rect x="${x(i) - Math.max(12, (w - padL - padR) / periods.length / 2)}" y="${padT}" width="${Math.max(24, (w - padL - padR) / periods.length)}" height="${h - padT - padB}"/><line class="cross" x1="${x(i)}" x2="${x(i)}" y1="${padT}" y2="${h - padB}"/>${series.map((s, si) => `<circle class="dot is-${SLOT[si] || 'other'}" cx="${x(i)}" cy="${y(s.values[i])}" r="4"/>`).join('')}</g>`).join('');
  const last = series[0].values.length - 1;
  const endLabel = `<text class="ds-end-label" x="${x(last) - 6}" y="${y(series[0].values[last]) - 9}" text-anchor="end">${series[0].values[last]}</text>`;
  return `<figure class="ds-chart" id="${id}"><figcaption class="sr-only">${esc(title)}. ${esc(summary)}</figcaption>${legend(series)}<div class="ds-chart-plot"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(`${title}. ${summary}`)}">${grid}<line x1="${padL}" x2="${w - padR}" y1="${y(0)}" y2="${y(0)}" class="base"/>${paths}${endLabel}${xLabels}${hits}</svg><div class="ds-tip" role="status" aria-live="polite" hidden></div></div>${summary ? `<p class="ds-chart-summary">${esc(summary)}</p>` : ''}${showTable ? tableTwin(title, ['Period', ...series.map(s => s.label)], periods.map((p, i) => [p, ...series.map(s => s.values[i])])) : ''}</figure>`;
}
function niceMax(v) { const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }

/**
 * Part-to-whole (≤ 6 parts) as a ring with a centre figure and a labelled
 * legend carrying every value — status tones only when parts are statuses.
 */
export function donut({title, parts, center = null, summary = ''}) {
  const total = parts.reduce((n, p) => n + p.value, 0), r = 46, c = 2 * Math.PI * r;
  if (!total) return `<figure class="ds-donut is-empty"><figcaption class="sr-only">${esc(title)}</figcaption><p class="ds-chart-empty">${icon('chart')}No records to divide yet.</p></figure>`;
  let offset = 0;
  const gap = parts.filter(p => p.value).length > 1 ? 2.2 : 0;
  const arcs = parts.filter(p => p.value).map((p, i) => { const len = Math.max(0, p.value / total * c - gap); const a = `<circle class="seg is-${p.tone || SLOT[i] || 'other'}" r="${r}" cx="60" cy="60" stroke-dasharray="${len.toFixed(2)} ${(c - len).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" style="--i:${i}" tabindex="0" data-tip="${esc(`<strong>${esc(p.label)}</strong><span>${p.value} of ${total} · ${Math.round(p.value / total * 100)}%</span>`)}" aria-label="${esc(`${p.label}: ${p.value} of ${total}`)}"/>`; offset += p.value / total * c; return a; }).join('');
  return `<figure class="ds-donut"><figcaption class="sr-only">${esc(title)}. ${esc(summary)}</figcaption><div class="ds-donut-plot"><svg viewBox="0 0 120 120" role="img" aria-label="${esc(`${title}: ${parts.map(p => `${p.label} ${p.value}`).join(', ')}`)}"><circle class="track" r="${r}" cx="60" cy="60"/>${arcs}</svg>${center ? `<div class="ds-donut-center"><b>${esc(fmt(center.value))}</b><small>${esc(center.label)}</small></div>` : ''}<div class="ds-tip" role="status" aria-live="polite" hidden></div></div><ul class="ds-donut-legend">${parts.map((p, i) => `<li><i class="is-${p.tone || SLOT[i] || 'other'}" aria-hidden="true"></i><span>${esc(p.label)}</span><b>${esc(fmt(p.value))}</b></li>`).join('')}</ul>${summary ? `<p class="ds-chart-summary">${esc(summary)}</p>` : ''}</figure>`;
}

/** Horizontal comparison bars, one series (slot 1) — length is the only encoding. */
export function bars({title, items, unit = '', max = null, summary = '', empty: emptyText = 'No records in this scope yet.'}) {
  if (!items.length) return `<p class="ds-chart-empty">${icon('chart')}${esc(emptyText)}</p>`;
  const top = max ?? Math.max(1, ...items.map(i => i.value));
  return `<figure class="ds-bars"><figcaption class="sr-only">${esc(title)}. ${esc(summary)}</figcaption><ul>${items.map((it, i) => { const pct = Math.min(100, it.value / top * 100); const label = `<span class="ds-bar-label">${esc(it.label)}${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</span>`; const track = `<span class="ds-bar-track" aria-hidden="true"><i class="${it.tone ? `is-${it.tone}` : ''}" style="--w:${pct}%;--i:${i}"></i></span>`; const value = `<b>${esc(fmt(it.value))}${it.of != null ? `<small>/${esc(fmt(it.of))}</small>` : ''}${unit}</b>`; return `<li>${it.href ? `<a href="${href(it.href)}">${label}${track}${value}</a>` : `${label}${track}${value}`}</li>`; }).join('')}</ul>${summary ? `<p class="ds-chart-summary">${esc(summary)}</p>` : ''}</figure>`;
}

/**
 * Stacked part-to-whole bars, one row per entity (session, group). Parts use
 * status tones and always appear in the legend; each row states its total.
 */
export function stackBars({title, rows, parts, summary = '', empty: emptyText = 'No records in this scope yet.'}) {
  if (!rows.length) return `<p class="ds-chart-empty">${icon('chart')}${esc(emptyText)}</p>`;
  const legendHtml = `<ul class="ds-legend">${parts.map(p => `<li><i class="is-${p.tone}" aria-hidden="true"></i>${esc(p.label)}</li>`).join('')}</ul>`;
  return `<figure class="ds-stack"><figcaption class="sr-only">${esc(title)}. ${esc(summary)}</figcaption>${legendHtml}<ul>${rows.map((r, n) => { const total = parts.reduce((t, p) => t + (r.values[p.key] || 0), 0); return `<li><span class="ds-bar-label">${esc(r.label)}${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</span><span class="ds-stack-track" role="img" aria-label="${esc(`${r.label}: ${parts.map(p => `${p.label} ${r.values[p.key] || 0}`).join(', ')}`)}">${total ? parts.filter(p => r.values[p.key]).map(p => `<i class="is-${p.tone}" style="--w:${(r.values[p.key] / total * 100).toFixed(2)}%;--i:${n}" data-tip-text="${esc(`${p.label}: ${r.values[p.key]}`)}"></i>`).join('') : '<em>No records</em>'}</span><b>${total}</b></li>`; }).join('')}</ul>${summary ? `<p class="ds-chart-summary">${esc(summary)}</p>` : ''}${tableTwin(title, ['', ...parts.map(p => p.label)], rows.map(r => [r.label, ...parts.map(p => r.values[p.key] || 0)]))}</figure>`;
}

/** A stage funnel (ordinal): each stage is a subset of the one before. */
export function funnel(stages) {
  const top = Math.max(1, stages[0]?.value || 1);
  return `<ol class="ds-funnel">${stages.map((s, i) => `<li style="--w:${Math.max(6, s.value / top * 100)}%;--i:${i}"><span>${esc(s.label)}</span><b>${esc(fmt(s.value))}</b>${s.hint ? `<small>${esc(s.hint)}</small>` : ''}</li>`).join('')}</ol>`;
}

/* -------------------------------------------------- controls & motion */

/**
 * Segmented control (radio group) with a sliding indicator. `action` routes
 * the change through the module's change handler; `name` keeps it a form field.
 */
export function segmented({name, options, value, label, action = '', size = ''}) {
  return `<div class="ds-seg ${size ? `is-${size}` : ''}" role="radiogroup" aria-label="${esc(label)}" data-seg>${options.map(([v, l, ico]) => `<label class="ds-seg-option"><input type="radio" name="${esc(name)}" value="${esc(v)}" ${String(v) === String(value) ? 'checked' : ''} ${action ? `data-action="${esc(action)}"` : ''}><span>${ico ? icon(ico) : ''}${esc(l)}</span></label>`).join('')}<i class="ds-seg-indicator" aria-hidden="true"></i></div>`;
}
/** Tabs as links (state lives in the URL); the indicator slides between them. */
export function tabs(items, current, label = 'Sections') {
  return `<nav class="ds-tabs" aria-label="${esc(label)}" data-tabs>${items.map(([text, path, key, count]) => `<a href="${href(path)}" ${key === current ? 'aria-current="page"' : ''}>${esc(text)}${count ? `<span class="ds-count">${esc(count)}</span>` : ''}</a>`).join('')}<i class="ds-tabs-indicator" aria-hidden="true"></i></nav>`;
}
/** A filter row: search plus optional chip filters; works with ui.applyFilters (data-search/data-status). */
export function filterRow({statuses = [], placeholder = 'Search…', extra = ''} = {}) {
  return `<div class="ds-filters" role="search"><label class="ds-search">${icon('search')}<span class="sr-only">Search</span><input type="search" data-filter="search" placeholder="${esc(placeholder)}" autocomplete="off"></label>${statuses.length ? `<label class="ds-select"><span class="sr-only">Status</span><select data-filter="status"><option value="">All states</option>${statuses.map(x => `<option>${esc(x)}</option>`).join('')}</select></label>` : ''}${extra}<span class="filter-count" role="status" aria-live="polite"></span></div>`;
}

/** Position indicators, wire tooltips and reveal charts. Called after each render. */
export function mountMotion(root, {refresh = false} = {}) {
  root.querySelectorAll('[data-seg]').forEach(placeSegIndicator);
  root.querySelectorAll('[data-tabs]').forEach(placeTabIndicator);
  root.querySelectorAll('.ds-chart, .ds-donut').forEach(bindTips);
  const charts = root.querySelectorAll('.ds-chart, .ds-donut, .ds-bars, .ds-meter, .ds-funnel, .ds-progress, .ds-stack');
  if (refresh || reduced() || typeof IntersectionObserver !== 'function') { charts.forEach(c => c.classList.add('is-in')); return; }
  const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), {threshold:.2});
  charts.forEach(c => io.observe(c));
}
function placeSegIndicator(seg) {
  const checked = seg.querySelector('input:checked')?.closest('.ds-seg-option'), ind = seg.querySelector('.ds-seg-indicator');
  if (!checked || !ind) { if (ind) ind.style.opacity = 0; return; }
  ind.style.opacity = 1; ind.style.width = `${checked.offsetWidth}px`; ind.style.transform = `translateX(${checked.offsetLeft}px)`;
  if (!seg.dataset.bound) { seg.dataset.bound = '1'; seg.addEventListener('change', () => placeSegIndicator(seg)); }
}
function placeTabIndicator(nav) {
  const cur = nav.querySelector('[aria-current="page"]'), ind = nav.querySelector('.ds-tabs-indicator');
  if (!cur || !ind) return;
  ind.style.width = `${cur.offsetWidth}px`; ind.style.transform = `translateX(${cur.offsetLeft}px)`;
}
function bindTips(fig) {
  if (fig.dataset.tips) return; fig.dataset.tips = '1';
  const tip = fig.querySelector('.ds-tip'), plot = tip?.parentElement; if (!tip) return;
  const show = el => { tip.innerHTML = el.dataset.tip; tip.hidden = false; const pr = plot.getBoundingClientRect(), r = el.getBoundingClientRect(); let left = r.left + r.width / 2 - pr.left; left = Math.max(70, Math.min(pr.width - 70, left)); tip.style.left = `${left}px`; tip.style.top = `${Math.max(0, r.top - pr.top - 8)}px`; el.classList.add('is-hot'); };
  const hide = el => { tip.hidden = true; el?.classList.remove('is-hot'); };
  fig.querySelectorAll('[data-tip]').forEach(el => { el.addEventListener('pointerenter', () => show(el)); el.addEventListener('pointerleave', () => hide(el)); el.addEventListener('focus', () => show(el)); el.addEventListener('blur', () => hide(el)); });
}

/* ------------------------------------------------------- periods */

/** Count dated records into the last `n` days ending at `endDay` (YYYY-MM-DD). Real counts only. */
export function dailySeries(dates, endDay, n = 14) {
  const end = Date.parse(`${endDay}T12:00:00+03:00`), days = [], values = [];
  for (let i = n - 1; i >= 0; i--) { const d = new Date(end - i * 86400000); days.push(new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Amman'}).format(d)); }
  for (const day of days) values.push(dates.filter(x => String(dayOf(x)) === day).length);
  return {periods:days.map(d => new Intl.DateTimeFormat('en-GB', {day:'numeric', month:'short', timeZone:'Asia/Amman'}).format(new Date(`${d}T12:00:00+03:00`))), values, days};
}
export const dayOf = at => !at ? '' : /^\d{4}-\d{2}-\d{2}$/.test(at) ? at : new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Amman'}).format(new Date(at));
/** Weekly buckets (Mon–Sun) — useful when daily counts are sparse. */
export function weeklySeries(dates, endDay, n = 8) {
  const end = Date.parse(`${endDay}T12:00:00+03:00`), periods = [], values = [];
  for (let i = n - 1; i >= 0; i--) {
    const to = end - i * 7 * 86400000, from = to - 6 * 86400000;
    const a = dayOf(new Date(from).toISOString()), b = dayOf(new Date(to).toISOString());
    periods.push(new Intl.DateTimeFormat('en-GB', {day:'numeric', month:'short', timeZone:'Asia/Amman'}).format(new Date(from)));
    values.push(dates.filter(x => { const d = dayOf(x); return d >= a && d <= b; }).length);
  }
  return {periods, values};
}
export const rangeLabel = n => `last ${n} days`;
export {nextId};
