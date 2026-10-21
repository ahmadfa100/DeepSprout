/** DeepSprout registration network.
 *
 * One persistent graph expresses both intentions. Individual is a calm personal
 * constellation around one focal node; Partner reorganises the same nodes into
 * communities around icon hubs. Every node keeps a stable identity and moves
 * between two deterministic layouts on its own delayed spring, so the change
 * travels outward from the chosen card and reverses cleanly at any moment.
 * Partner-only nodes are preallocated and revealed, signals come from a fixed
 * pool, and nothing is allocated per frame or per selection.
 *
 * Interaction handlers receive only event kinds and element geometry. They never
 * read field values, typed characters or key names.
 */
import {glyphs} from './glyphs.js';

const TAU = Math.PI * 2;
const HUBS = [['mentor', 'MENTORS'], ['organization', 'INSTITUTIONS'], ['provider', 'OUTDOOR EXPERIENCES'], ['community', 'COMMUNITIES'], ['workshop', 'WORKSHOPS'], ['initiative', 'INITIATIVES']];
const TEXT = '.world-copy>*';
const PANELS = '.register-card,.entry-shell,.auth-wrap>.auth-intro,.auth-wrap>.auth-form,.auth-wrap>.demo-panel,.auth-wrap>.status-scene';
const CHROME = '.register-header,.auth-top';
const QUIET = 'a,button,input,textarea,select,label,summary,dialog,[role=button],.register-card,.entry-shell,.auth-form,.demo-panel,.register-header,.auth-top';
const COPY = {
  individual: ['A place to become', 'A little intention.<br>A new beginning.', 'Grow at your own pace. <br>Find connection along the way.', 'People <i></i> Ideas <i></i> Opportunities'],
  partner: ['Growing together', 'Meaningful change<br>grows together.', 'Bring people, ideas and <br>opportunities together.', 'Mentors <i></i> Institutions <i></i> Experiences']
};
// Palette: sage-teal links, two restrained node hues, one brighter signal tone.
const INK = '#173c33', EDGE = '#5f8a7e', NODE = ['#3f8a76', '#4d8fa0'], SIGNAL = '#17a07f', RING = '#2a8a70';
const SIGNAL_POOL = 44, RIPPLE_POOL = 6;

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => {const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t);};
function seeded(seed) {
  return () => {seed = seed + 0x6d2b79f5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296;};
}
// Signed distance from a point to a rectangle (negative inside).
function rectDistance(x, y, r) {
  const dx = Math.max(r.l - x, 0, x - r.r), dy = Math.max(r.t - y, 0, y - r.b);
  return dx || dy ? Math.hypot(dx, dy) : -Math.min(x - r.l, r.r - x, y - r.t, r.b - y);
}

export function createLivingWorld(host, initialMode = 'individual') {
  host.innerHTML = Object.entries(COPY).map(([key, [eyebrow, title, lede, tags]]) =>
    `<div class="world-copy" data-copy="${key}"><p class="world-eyebrow">${eyebrow}</p><p class="world-title">${title}</p><p class="world-lede">${lede}</p><p class="world-tags">${tags}</p></div>`).join('');
  host.setAttribute('aria-label', 'Welcome to DeepSprout');
  host.removeAttribute('aria-hidden');
  const canvas = document.createElement('canvas');
  canvas.className = 'world-network';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');
  const media = matchMedia('(prefers-reduced-motion: reduce)'), fine = matchMedia('(pointer: fine)');
  const abort = new AbortController(), options = {signal: abort.signal};

  let mode = initialMode === 'partner' ? 'partner' : 'individual', target = mode === 'partner' ? 1 : 0;
  let width = 0, height = 0, stableHeight = 0, dpr = 1, compact = false, layoutKey = '';
  let raf = 0, last = 0, lastDraw = 0, moved = false, clock = 0, disposed = false, nextIdle = 0, bootAt = 0, generation = 1, lastSignal = 0;
  let nodes = [], edges = [], incident = [], hubNodes = [], selfIndex = 0;
  let textRects = [], panelRects = [], pointer = {x: -1e4, y: -1e4, on: false};
  const signals = Array.from({length: SIGNAL_POOL}, () => ({on: false, edge: 0, from: 0, to: 0, t0: 0, dur: 1, hops: 0, strength: 0, gen: 0}));
  const ripples = Array.from({length: RIPPLE_POOL}, () => ({on: false, x: 0, y: 0, t0: 0}));
  const icons = {};
  for (const [key] of HUBS) icons[key] = new Path2D(glyphs[key]);
  const glow = document.createElement('canvas');
  glow.width = glow.height = 64;
  {
    const g = glow.getContext('2d'), gradient = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(36,170,132,.55)'); gradient.addColorStop(.35, 'rgba(36,170,132,.18)'); gradient.addColorStop(1, 'rgba(36,170,132,0)');
    g.fillStyle = gradient; g.fillRect(0, 0, 64, 64);
  }

  /* ── Geometry of the page, in canvas coordinates ───────────── */
  function localRects(selector, pad) {
    const origin = canvas.getBoundingClientRect(), list = [];
    document.querySelectorAll(selector).forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      list.push({l: r.left - origin.left - pad, t: r.top - origin.top - pad, r: r.right - origin.left + pad, b: r.bottom - origin.top + pad});
    });
    return list;
  }
  const insideAny = (x, y, rects) => rects.some(r => x > r.l && x < r.r && y > r.t && y < r.b);
  let veilBox = null;
  function veilAt(x, y) {
    if (!veilBox || x < veilBox.l || x > veilBox.r || y < veilBox.t || y > veilBox.b) return 1;
    let v = 1;
    for (const r of textRects) v = Math.min(v, mix(.1, 1, smooth(-2, 26, rectDistance(x, y, r))));
    return v;
  }

  /* ── Deterministic layouts ─────────────────────────────────── */
  function build() {
    const W = width, H = height, rand = seeded(compact ? 4127 : 1017);
    textRects = [...localRects(TEXT, 8), ...localRects('.register-header>*,.auth-top>*', 6)];
    panelRects = localRects(PANELS, 0);
    veilBox = textRects.length ? textRects.reduce((u, r) => ({l: Math.min(u.l, r.l - 30), t: Math.min(u.t, r.t - 30), r: Math.max(u.r, r.r + 30), b: Math.max(u.b, r.b + 30)}), {l: Infinity, t: Infinity, r: -Infinity, b: -Infinity}) : null;
    const blockers = [...localRects(TEXT, compact ? 14 : 30), ...localRects(PANELS, compact ? 18 : 28), ...localRects(CHROME, compact ? 4 : 10)];
    const clearance = (x, y) => {let c = Infinity; for (const r of blockers) c = Math.min(c, rectDistance(x, y, r)); return c;};
    const step = compact ? 14 : 22, margin = compact ? 22 : 40, grid = [];
    for (let y = margin; y < H - margin; y += step) for (let x = margin; x < W - margin; x += step) grid.push({x, y, c: clearance(x, y)});
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const copy = localRects(TEXT, 8), text = copy.length ? copy.reduce((u, r) => ({l: Math.min(u.l, r.l), t: Math.min(u.t, r.t), r: Math.max(u.r, r.r), b: Math.max(u.b, r.b)})) : {l: W * .08, t: H * .2, r: W * .42, b: H * .6};
    const panel = panelRects[0] || {l: W * .6, t: H * .15, r: W * .92, b: H * .9};

    // The personal focal node sits in open space between the words and the panel.
    // Side by side: the gutter between copy and panel. Stacked: the open side beside the copy.
    const stacked = panel.t > text.b - 20;
    const preferred = stacked ? {x: Math.min(W - 40, (text.r + W) / 2), y: (text.t + text.b) / 2} : {x: panel.l - text.r > 60 ? (text.r + panel.l) / 2 : text.l + (text.r - text.l) * .55, y: panel.l - text.r > 60 ? H * .58 : Math.min(H - 70, text.b + (H - text.b) * .5)};
    const pick = (list, score) => list.reduce((best, c) => {const s = score(c); return s > best.s ? {c, s} : best;}, {c: null, s: -Infinity}).c;
    const near = [...localRects(TEXT, 12), ...localRects(PANELS, 14), ...localRects(CHROME, 6)];
    const self = pick(grid.filter(c => near.every(r => rectDistance(c.x, c.y, r) > (compact ? 10 : 16))), c => -dist(c, preferred)) || preferred;

    // Partner hubs: spread through free space, but kept close to the focal node.
    const wantHubs = compact ? 3 : W < 960 ? 4 : W < 1100 ? 5 : 6, cap = compact ? 68 : clamp(Math.min(W, H) * .3, 180, 290);
    const hubFree = grid.filter(c => c.c > (compact ? 13 : 36) && c.y < H - 52 && c.x > (compact ? 26 : 48) && c.x < W - (compact ? 26 : 48));
    const tight = [...localRects(TEXT, 6), ...localRects(PANELS, 8), ...localRects(CHROME, 4)];
    const labelFits = (x, y, half) => x - half > 4 && x + half < W - 4 && y + 14 < H && !tight.some(r => x + half > r.l && x - half < r.r && y + 14 > r.t && y - 4 < r.b);
    const hubs = [];
    while (hubs.length < wantHubs) {
      const chosen = [self, ...hubs];
      const near = c => chosen.reduce((m, h) => Math.min(m, dist(c, h)), Infinity);
      const best = pick(hubFree, c => Math.min(near(c), cap) - .14 * dist(c, self));
      if (!best || near(best) < cap * .62) break;
      hubs.push({x: best.x, y: best.y, label: !compact && labelFits(best.x, best.y + 34, HUBS[hubs.length][1].length * 4.4 + 6)});
    }

    // Individual constellation: a few loose clusters and quiet ambient nodes.
    const centres = [self];
    const wantCentres = compact ? 3 : 5, centreCap = compact ? 120 : 270;
    const centreFree = grid.filter(c => c.c > 6);
    while (centres.length <= wantCentres) {
      const best = pick(centreFree, c => Math.min(centres.reduce((m, h) => Math.min(m, dist(c, h)), Infinity), centreCap) + rand() * 46);
      if (!best) break;
      centres.push(best);
    }
    const area = W * H, baseCount = compact ? 28 : clamp(Math.round(area / 19500), 44, 76), extraCount = compact ? 12 : Math.round(baseCount * .7);
    const spread = compact ? 66 : 118, list = [];
    const chrome = localRects(CHROME, 0);
    const open = (x, y) => x > -10 && x < W + 10 && y > -10 && y < H + 10 && !insideAny(x, y, panelRects) && (!insideAny(x, y, chrome) || rand() < .25) && list.every(n => Math.hypot(n.xI - x, n.yI - y) > (compact ? 15 : 22));
    const node = (xI, yI, kind, centre) => {
      const n = {xI, yI, xP: xI, yP: yI, aI: 1, aP: 1, kind, centre, hub: -1, parent: -1, r: 1.7 + rand() * 1, hue: rand() < .7 ? 0 : 1,
        phase: rand() * TAU, phase2: rand() * TAU, amp: (compact ? 2.5 : 4) + rand() * (compact ? 3 : 5), freq: .00022 + rand() * .00022, bend: (rand() - .5) * .5,
        b: target, v: 0, delayUntil: 0, act: 0, stamp: 0, x: xI, y: yI, alpha: 1, veil: 1};
      if (rand() < .2) n.r += 1;
      list.push(n); return n;
    };
    node(self.x, self.y, 'self', 0).r = 3;
    centres.slice(1).forEach((c, i) => {
      const focal = node(c.x, c.y, 'focal', i + 1); focal.r = 2.6;
      const members = compact ? 5 : 6 + Math.floor(rand() * 3);
      for (let m = 0; m < members; m++) {
        for (let attempt = 0; attempt < 8; attempt++) {
          const a = rand() * TAU, radius = mix(26, spread, Math.sqrt(rand())), x = c.x + Math.cos(a) * radius, y = c.y + Math.sin(a) * radius * .8;
          if (open(x, y)) {node(x, y, 'node', i + 1); break;}
        }
      }
    });
    for (let tries = 0; list.length < baseCount && tries < baseCount * 30; tries++) {
      const x = rand() * W, y = rand() * H;
      if (open(x, y) && (clearance(x, y) > 0 || rand() < .25)) node(x, y, 'node', -1);
    }

    // Partner layout: hubs claim their nearest nodes; members ring each hub.
    const base = list.length;
    hubs.forEach((h, k) => {
      const candidate = list.reduce((best, n, i) => n.kind !== 'self' && n.hub < 0 && Math.hypot(n.xI - h.x, n.yI - h.y) < best.d ? {i, d: Math.hypot(n.xI - h.x, n.yI - h.y)} : best, {i: -1, d: Infinity});
      if (candidate.i < 0) return;
      const n = list[candidate.i]; n.kind = n.kind === 'focal' ? 'focal-hub' : 'hub'; n.hub = k; n.xP = h.x; n.yP = h.y; n.label = h.label;
    });
    const hubIndex = list.map((n, i) => n.hub >= 0 ? i : -1).filter(i => i >= 0);
    const groups = hubIndex.map(() => []), capacity = Math.min(compact ? 6 : 13, Math.ceil(base / Math.max(1, hubIndex.length) * 1.25));
    const rIn = compact ? 22 : 36, rOut = compact ? Math.min(58, cap * .5) : Math.min(108, cap * .44);
    const place = (n, h, radiusMin, radiusMax, towards) => {
      const hx = list[h].xP, hy = list[h].yP;
      for (let attempt = 0; attempt < 7; attempt++) {
        const a = towards + (rand() - .5) * .9 + (attempt ? (attempt % 2 ? 1 : -1) * Math.ceil(attempt / 2) * .55 : 0);
        const radius = mix(radiusMin, radiusMax, rand()), x = hx + Math.cos(a) * radius, y = hy + Math.sin(a) * radius;
        if (clearance(x, y) > 2 || attempt === 6) {n.xP = clamp(x, 8, W - 8); n.yP = clamp(y, 8, H - 8); return;}
      }
    };
    list.forEach((n, i) => {
      if (n.kind === 'self' || n.hub >= 0) return;
      if (!hubIndex.length || (n.centre < 0 && rand() < .45)) {
        // Ambient nodes stay as context, drifting a little outward.
        n.kind = n.kind === 'focal' ? 'focal' : 'ambient';
        n.xP = clamp(self.x + (n.xI - self.x) * 1.07, 6, W - 6); n.yP = clamp(self.y + (n.yI - self.y) * 1.07, 6, H - 6);
        return;
      }
      const order = hubIndex.map((h, g) => ({g, d: Math.hypot(list[h].xP - n.xI, list[h].yP - n.yI)})).sort((a, b) => a.d - b.d);
      const open = order.find(o => groups[o.g].length < capacity);
      if (!open) {n.kind = n.kind === 'focal' ? 'focal' : 'ambient'; n.xP = n.xI; n.yP = n.yI; return;}
      const g = open.g, h = hubIndex[g];
      groups[g].push(i); n.group = g;
      place(n, h, rIn, rOut, Math.atan2(n.yI - list[h].yP, n.xI - list[h].xP));
    });
    for (let e = 0; e < Math.min(extraCount, hubIndex.length * (compact ? 4 : 9)) && hubIndex.length; e++) {
      const g = e % hubIndex.length, h = hubIndex[g], members = groups[g], parent = members.length ? members[Math.floor(rand() * members.length)] : h;
      const n = node(list[parent].xI, list[parent].yI, 'extra', -1);
      n.aI = 0; n.parent = parent; n.group = g; n.b = target;
      place(n, h, rOut * .55, rOut * 1.3, rand() * TAU);
      groups[g].push(list.length - 1);
    }

    // Topology: distance-based links per layout, then structured partner links.
    const keys = new Map(), out = [];
    const link = (a, b, mask) => {
      if (a === b) return;
      const key = a < b ? a * 4096 + b : b * 4096 + a, existing = keys.get(key);
      if (existing !== undefined) {out[existing].mask |= mask; return;}
      keys.set(key, out.length);
      out.push({a, b, mask, restI: Math.hypot(list[a].xI - list[b].xI, list[a].yI - list[b].yI), restP: Math.hypot(list[a].xP - list[b].xP, list[a].yP - list[b].yP), heat: 0, trunk: false});
    };
    const nearest = (i, pool, k, max, useP) => pool
      .map(j => ({j, d: useP ? Math.hypot(list[i].xP - list[j].xP, list[i].yP - list[j].yP) : Math.hypot(list[i].xI - list[j].xI, list[i].yI - list[j].yI)}))
      .filter(o => o.j !== i && o.d < max).sort((a, b) => a.d - b.d).slice(0, k);
    const visibleI = list.map((n, i) => n.aI ? i : -1).filter(i => i >= 0), reachI = compact ? 104 : 158;
    visibleI.forEach(i => nearest(i, visibleI, list[i].kind === 'self' ? 4 : 2 + (rand() < .4), list[i].kind === 'self' ? reachI * 1.5 : reachI, false).forEach(o => link(i, o.j, 1)));
    groups.forEach((members, g) => {
      const h = hubIndex[g], ordered = members.slice().sort((a, b) => Math.hypot(list[a].xP - list[h].xP, list[a].yP - list[h].yP) - Math.hypot(list[b].xP - list[h].xP, list[b].yP - list[h].yP)), done = [h];
      for (const m of ordered) {
        // Branch towards the hub through nearer members: a dendritic community.
        const to = done.reduce((best, d) => {const s = Math.hypot(list[m].xP - list[d].xP, list[m].yP - list[d].yP) * (d === h ? .78 : 1); return s < best.s ? {d, s} : best;}, {d: h, s: Infinity}).d;
        link(m, to, 2); done.push(m);
        if (rand() < .35) nearest(m, members, 1, compact ? 46 : 70, true).forEach(o => link(m, o.j, 2));
      }
    });
    hubIndex.forEach(h => nearest(h, hubIndex, 2, Infinity, true).forEach(o => link(h, o.j, 2)));
    nearest(0, hubIndex, compact ? 4 : 3, Infinity, true).forEach(o => link(0, o.j, 2));
    list.forEach((n, i) => {if (n.kind === 'ambient' || n.kind === 'focal') nearest(i, list.map((_, j) => j), 2, compact ? 110 : 150, true).forEach(o => link(i, o.j, 2));});
    out.forEach(e => {e.trunk = list[e.a].hub >= 0 && list[e.b].hub >= 0 || (e.a === 0 && list[e.b].hub >= 0);});

    nodes = list; edges = out; selfIndex = 0;
    hubNodes = hubIndex;
    incident = list.map(() => []);
    out.forEach((e, i) => {incident[e.a].push(i); incident[e.b].push(i);});
    signals.forEach(s => {s.on = false;}); ripples.forEach(r => {r.on = false;});
    nodes.forEach(n => {n.b = target; n.v = 0; n.delayUntil = 0;});
  }

  /* ── Signals that travel through edges ─────────────────────── */
  function edgeAlpha(e) {
    const a = nodes[e.a], b = nodes[e.b], lo = Math.min(a.b, b.b), hi = Math.max(a.b, b.b);
    const weight = e.mask === 3 ? 1 : e.mask === 1 ? 1 - smooth(.1, .55, hi) : smooth(.5, .95, lo);
    const rest = mix(e.restI, e.restP, (a.b + b.b) / 2) || 1, length = Math.hypot(a.x - b.x, a.y - b.y);
    return weight * Math.min(a.alpha, b.alpha) * (1 - smooth(1.3, 1.9, length / rest));
  }
  function fire(index, hops, strength, now, gen = ++generation) {
    const n = nodes[index];
    if (!n) return;
    n.act = Math.max(n.act, strength); n.stamp = gen;
    if (hops <= 0) return;
    let sent = 0;
    const list = incident[index], start = Math.floor(Math.random() * list.length), branches = hops > 2 ? 3 : 2;
    for (let k = 0; k < list.length && sent < branches; k++) {
      const e = edges[list[(start + k) % list.length]], to = e.a === index ? e.b : e.a;
      if (nodes[to].stamp === gen || edgeAlpha(e) < .08) continue;
      const slot = signals.find(s => !s.on);
      if (!slot) return;
      nodes[to].stamp = gen;
      const length = Math.hypot(nodes[to].x - n.x, nodes[to].y - n.y);
      Object.assign(slot, {on: true, edge: list[(start + k) % list.length], from: index, to, t0: now + sent * 70, dur: clamp(length / .34, 220, 900), hops: hops - 1, strength: strength * .86, gen});
      sent++;
    }
  }
  function ripple(x, y, now) {
    const slot = ripples.find(r => !r.on) || ripples.reduce((a, b) => a.t0 < b.t0 ? a : b);
    Object.assign(slot, {on: true, x, y, t0: now});
  }
  function nearestNode(x, y, avoidPanels = true) {
    let best = -1, bestD = Infinity;
    nodes.forEach((n, i) => {
      if (n.alpha < .5 || (avoidPanels && insideAny(n.x, n.y, panelRects))) return;
      const d = Math.hypot(n.x - x, n.y - y) * (n.veil < .6 ? 1.6 : 1);
      if (d < bestD) {bestD = d; best = i;}
    });
    return best;
  }
  // Points inside the panel answer from the open edge beside it, where they can be seen.
  const local = (point, raw = false) => {
    const r = canvas.getBoundingClientRect(), p = {x: point.x - r.left, y: point.y - r.top};
    if (raw) return p;
    const panel = panelRects.find(q => p.x > q.l && p.x < q.r && p.y > q.t && p.y < q.b);
    if (panel && panel.l > 60) p.x = panel.l - 34;
    return p;
  };
  const panelEdge = () => {const p = panelRects[0]; return p ? {x: p.l - 20, y: (p.t + Math.min(p.b, height)) / 2} : {x: width * .55, y: height * .55};};

  /* ── Mode changes: one staggered, reversible reorganisation ─── */
  function setMode(next, {origin} = {}) {
    next = next === 'partner' ? 'partner' : 'individual';
    host.dataset.mode = next;
    if (next === mode && nodes.length) return false;
    mode = next; target = mode === 'partner' ? 1 : 0;
    if (!nodes.length) return true;
    if (media.matches) {nodes.forEach(n => {n.b = target; n.v = 0;}); host.dataset.activity = 'selection'; draw(clock, true); return true;}
    const now = performance.now(), from = origin ? local(origin) : panelEdge();
    const source = target ? nearestNode(from.x, from.y) : selfIndex, s = nodes[source] || nodes[0];
    let reach = 1;
    nodes.forEach(n => {reach = Math.max(reach, Math.hypot(n.x - s.x, n.y - s.y));});
    nodes.forEach(n => {
      const d = Math.hypot(n.x - s.x, n.y - s.y) / reach;
      // Expansion travels outward from the chosen card; retreat gathers from the edges.
      n.delayUntil = now + (target ? 60 + d * 560 : 40 + (1 - d) * 340);
    });
    host.dataset.activity = 'selection';
    fire(source, target ? 5 : 3, target ? 1 : .8, now);
    if (target) ripple(s.x, s.y, now);
    nextIdle = now + 2400;
    wake();
    return true;
  }

  function signal(kind = 'typing', index = 0, point) {
    host.dataset.activity = kind;
    if (media.matches || !nodes.length) return;
    const now = performance.now();
    if (now - lastSignal < (kind === 'typing' ? 210 : 90)) return;
    lastSignal = now;
    const spec = {typing: [1, .45], focus: [2, .62], 'card-hover': [1, .5], 'card-focus': [1, .5], selection: [3, .85], advance: [4, .9], submitting: [4, .9], 'local-complete': [5, 1], background: [4, 1], invalid: [0, .4], error: [0, .4]}[kind] || [1, .5];
    let source;
    if (kind === 'local-complete') source = selfIndex;
    else {const p = point ? local(point) : panelEdge(); source = nearestNode(p.x, p.y);}
    if (source < 0) source = Math.abs(index) % nodes.length;
    fire(source, spec[0], spec[1], now);
    if (kind === 'background') ripple(nodes[source].x, nodes[source].y, now);
    nextIdle = now + 2200;
    wake();
  }

  /* ── Simulation and drawing ────────────────────────────────── */
  function update(now, dt) {
    const step = Math.min(dt, 50) / 1000, omega = 8.5;
    let busy = false;
    for (const n of nodes) {
      if (now >= n.delayUntil && (Math.abs(target - n.b) > .0005 || Math.abs(n.v) > .0005)) {
        n.v += (omega * omega * (target - n.b) - 2 * omega * n.v) * step;
        n.b += n.v * step; busy = true;
      } else if (Math.abs(target - n.b) > .0005) busy = true;
      else {n.b = target; n.v = 0;}
      if (n.act > .004) {n.act *= Math.exp(-dt / 520); busy = true;} else n.act = 0;
    }
    for (const e of edges) e.heat = e.heat > .004 ? e.heat * Math.exp(-dt / 640) : 0;
    for (const s of signals) {
      if (!s.on || now < s.t0) {busy ||= s.on; continue;}
      busy = true;
      const p = (now - s.t0) / s.dur, e = edges[s.edge];
      e.heat = Math.max(e.heat, s.strength * .9);
      if (p >= 1) {s.on = false; nodes[s.to].act = Math.max(nodes[s.to].act, s.strength); if (s.hops > 0) fire(s.to, s.hops, s.strength, now, s.gen);}
    }
    for (const r of ripples) if (r.on) {busy = true; if (now - r.t0 > 1100) r.on = false;}
    if (now > nextIdle && nodes.length) {
      // Occasional quiet impulses: personal paths, or exchange between partner hubs.
      const settled = Math.abs(nodes[0].b - target) < .01;
      if (settled) {
        const pool = target && hubNodes.length ? hubNodes : nodes.map((n, i) => n.alpha > .9 && n.veil > .9 && !insideAny(n.x, n.y, panelRects) ? i : -1).filter(i => i >= 0);
        if (pool.length) fire(pool[Math.floor(Math.random() * pool.length)], target ? 2 : 2, target ? .7 : .55, now);
      }
      nextIdle = now + (target ? 1700 + Math.random() * 1300 : 2600 + Math.random() * 1800);
    }
    if (bootAt && now > bootAt) {bootAt = 0; fire(selfIndex, 3, .75, now);}
    return busy;
  }

  function place(time, still) {
    for (const n of nodes) {
      const t = n.b, dx = n.xP - n.xI, dy = n.yP - n.yI, length = Math.hypot(dx, dy) || 1;
      const arc = Math.sin(Math.PI * clamp(t, 0, 1)) * Math.min(42, length * n.bend);
      const sway = still ? 0 : n.amp * (n.hub >= 0 ? mix(1, .35, t) : 1);
      n.x = n.xI + dx * t - dy / length * arc + Math.sin(time * n.freq + n.phase) * sway;
      n.y = n.yI + dy * t + dx / length * arc + Math.cos(time * n.freq * .8 + n.phase2) * sway;
      n.alpha = mix(n.aI, n.aP, smooth(.25, .85, t));
      n.veil = veilAt(n.x, n.y);
    }
  }

  function draw(time, still = false, now = performance.now()) {
    if (!ctx) return;
    place(time, still);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const near = n => pointer.on ? 1 - smooth(0, 150, Math.hypot(n.x - pointer.x, n.y - pointer.y)) : 0;
    const base = compact ? .24 : .27;

    ctx.lineCap = 'round';
    ctx.strokeStyle = EDGE;
    for (const e of edges) {
      const a = nodes[e.a], b = nodes[e.b], w = edgeAlpha(e);
      if (w < .01) continue;
      const veil = Math.min(a.veil, b.veil, veilAt(mix(a.x, b.x, .25), mix(a.y, b.y, .25)), veilAt((a.x + b.x) / 2, (a.y + b.y) / 2), veilAt(mix(a.x, b.x, .75), mix(a.y, b.y, .75)));
      ctx.globalAlpha = w * veil * (base + .06 * Math.min(a.b, b.b) + (e.trunk ? .08 * smooth(.6, 1, Math.min(a.b, b.b)) : 0) + (near(a) + near(b)) * .09);
      ctx.lineWidth = e.trunk ? 1.1 : .9;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.strokeStyle = SIGNAL; ctx.lineWidth = 1.3;
    for (const e of edges) {
      if (e.heat < .02) continue;
      const a = nodes[e.a], b = nodes[e.b];
      ctx.globalAlpha = e.heat * .5 * edgeAlpha(e) * Math.min(a.veil, b.veil);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }

    // Impulses: a short luminous trail and head moving along the actual edge.
    for (const s of signals) {
      if (!s.on || now < s.t0) continue;
      const p = clamp((now - s.t0) / s.dur, 0, 1), a = nodes[s.from], b = nodes[s.to];
      const x = mix(a.x, b.x, p), y = mix(a.y, b.y, p), tail = Math.max(0, p - .28), tx = mix(a.x, b.x, tail), ty = mix(a.y, b.y, tail);
      const veil = Math.min(veilAt(x, y), 1), strength = s.strength * veil;
      const gradient = ctx.createLinearGradient(tx, ty, x, y);
      gradient.addColorStop(0, 'rgba(23,160,127,0)'); gradient.addColorStop(1, 'rgba(23,160,127,.85)');
      ctx.globalAlpha = strength; ctx.strokeStyle = gradient; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke();
      ctx.globalAlpha = strength * .9; ctx.drawImage(glow, x - 11, y - 11, 22, 22);
      ctx.globalAlpha = strength; ctx.fillStyle = SIGNAL;
      ctx.beginPath(); ctx.arc(x, y, 1.9, 0, TAU); ctx.fill();
    }

    for (const r of ripples) {
      if (!r.on) continue;
      const p = clamp((now - r.t0) / 1100, 0, 1), eased = 1 - Math.pow(1 - p, 3);
      ctx.globalAlpha = .3 * (1 - p); ctx.strokeStyle = RING; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(r.x, r.y, 6 + eased * 46, 0, TAU); ctx.stroke();
    }

    ctx.font = `600 9.5px 'DM Sans','Avenir Next',sans-serif`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '1.8px';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    nodes.forEach((n, i) => {
      if (n.alpha < .01) return;
      const t = n.b, act = n.act, hover = near(n), shade = n.alpha * n.veil;
      if (act > .04) {const size = 18 + 26 * act; ctx.globalAlpha = act * .75 * shade; ctx.drawImage(glow, n.x - size / 2, n.y - size / 2, size, size);}
      if (n.kind === 'self') {
        const breath = still ? 0 : Math.sin(time * .0012) * 1.2;
        ctx.globalAlpha = shade * .12; ctx.fillStyle = RING; ctx.beginPath(); ctx.arc(n.x, n.y, 15 + breath, 0, TAU); ctx.fill();
        ctx.globalAlpha = shade * .16; ctx.strokeStyle = RING; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(n.x, n.y, 24 + breath * 1.5, 0, TAU); ctx.stroke();
        ctx.globalAlpha = shade * .07; ctx.beginPath(); ctx.arc(n.x, n.y, 36 + breath * 2, 0, TAU); ctx.stroke();
        ctx.globalAlpha = shade; ctx.fillStyle = '#fff'; ctx.lineWidth = 2.4; ctx.strokeStyle = act > .1 ? SIGNAL : RING;
        ctx.beginPath(); ctx.arc(n.x, n.y, 7 + act * 1.5, 0, TAU); ctx.fill(); ctx.stroke();
        return;
      }
      const hubness = n.hub >= 0 ? smooth(.45, 1, t) : 0, focal = n.kind.startsWith('focal') ? 1 - t : 0;
      if (hubness > .01) {
        const radius = mix(n.r, compact ? 14 : 18, hubness);
        ctx.globalAlpha = shade * hubness * .5; ctx.drawImage(glow, n.x - radius * 1.9, n.y - radius * 1.9, radius * 3.8, radius * 3.8);
        ctx.globalAlpha = shade; ctx.fillStyle = '#fff'; ctx.strokeStyle = act > .1 ? SIGNAL : RING; ctx.lineWidth = 1.2 + act * .6;
        ctx.beginPath(); ctx.arc(n.x, n.y, radius + act * 1.4, 0, TAU); ctx.fill();
        ctx.globalAlpha = shade * (.45 + .35 * hubness + .2 * act); ctx.stroke();
        const icon = smooth(.7, 1, t);
        if (icon > .01) {
          const size = compact ? 14 : 17, k = size / 34;
          ctx.save(); ctx.translate(n.x - size / 2, n.y - size / 2); ctx.scale(k, k);
          ctx.globalAlpha = shade * icon; ctx.strokeStyle = INK; ctx.lineWidth = 1.5 / k * .62; ctx.lineJoin = 'round';
          ctx.stroke(icons[HUBS[n.hub][0]]); ctx.restore();
        }
        const label = n.label ? smooth(.85, 1, t) : 0;
        if (label > .01) {
          const lx = n.x, ly = n.y + radius + 10;
          ctx.globalAlpha = shade * label * .9; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.strokeText(HUBS[n.hub][1], lx, ly);
          ctx.globalAlpha = shade * label * .74; ctx.fillStyle = INK; ctx.fillText(HUBS[n.hub][1], lx, ly);
        }
        if (hubness > .9) return;
      }
      if (focal > .02) {
        ctx.globalAlpha = shade * focal * .1; ctx.fillStyle = RING; ctx.beginPath(); ctx.arc(n.x, n.y, 11, 0, TAU); ctx.fill();
        ctx.globalAlpha = shade * focal; ctx.fillStyle = '#fff'; ctx.strokeStyle = RING; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(n.x, n.y, 4.6 + act, 0, TAU); ctx.fill(); ctx.stroke();
        if (focal > .9) return;
      }
      ctx.globalAlpha = shade * (.56 + .1 * t + .35 * act + .3 * hover) * (1 - hubness);
      ctx.fillStyle = act > .25 ? SIGNAL : NODE[n.hue];
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r + t * .4 + act * 1.4 + hover * .5, 0, TAU); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function tick(now) {
    raf = 0;
    if (disposed || document.hidden || media.matches) return;
    const dt = last ? Math.min(64, now - last) : 16;
    last = now; clock += dt;
    const busy = update(now, dt);
    // Idle drift renders at ~30 fps; transitions, signals and pointer response at full rate.
    if (busy || moved || now - lastDraw >= 31) {lastDraw = now; moved = false; draw(clock, false, now);}
    raf = requestAnimationFrame(tick);
  }
  function wake() {if (ctx && !raf && !disposed && !document.hidden && !media.matches) {last = 0; raf = requestAnimationFrame(tick);}}
  function still() {if (!nodes.length) return; nodes.forEach(n => {n.b = target; n.v = 0; n.act = 0;}); signals.forEach(s => {s.on = false;}); ripples.forEach(r => {r.on = false;}); edges.forEach(e => {e.heat = 0;}); draw(0, true);}

  function resize() {
    const w = canvas.getBoundingClientRect().width || document.documentElement.clientWidth, h = innerHeight;
    // Height only grows for a given width, so a virtual keyboard never reflows the scene.
    if (Math.abs(w - width) < 1 && h <= stableHeight) return;
    stableHeight = Math.abs(w - width) >= 1 ? h : Math.max(stableHeight, h);
    width = w; height = Math.max(stableHeight, 480); compact = width < 600;
    canvas.style.height = `${height}px`;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    relayout(true);
  }
  function relayout(force) {
    if (!width) return;
    // Copy crossfades move vertically; only horizontal copy geometry and panel placement re-plan the graph.
    const key = `${width}x${height}|${localRects(TEXT, 0).map(r => `${Math.round(r.l)},${Math.round(r.r)}`).join(';')}|${localRects(PANELS, 0).map(r => `${Math.round(r.l)},${Math.round(r.t)},${Math.round(r.r)}`).join(';')}`;
    if (!force && key === layoutKey) return;
    layoutKey = key; build();
    // Routes replace panels; observe only the current ones so removed nodes are released.
    panelWatch.disconnect(); panelWatch.observe(host);
    document.querySelectorAll(PANELS).forEach(el => panelWatch.observe(el));
    if (media.matches) still(); else {draw(clock); wake();}
  }

  const listen = (el, type, fn, extra = {}) => el.addEventListener(type, fn, {...options, ...extra});
  listen(document, 'pointermove', e => {
    if (!fine.matches || media.matches || e.pointerType !== 'mouse') return;
    const p = local({x: e.clientX, y: e.clientY}, true); pointer.x = p.x; pointer.y = p.y; pointer.on = p.y < height; moved = true; wake();
  }, {passive: true});
  listen(document.documentElement, 'pointerleave', () => {pointer.on = false;});
  listen(document, 'pointerdown', e => {
    if (e.target.closest(QUIET)) return;
    signal('background', 0, {x: e.clientX, y: e.clientY});
  }, {passive: true});
  const fieldIndex = target => Array.from(target.form?.elements || []).indexOf(target);
  const fieldPoint = target => {const r = target.getBoundingClientRect(); return {x: r.left, y: r.top + r.height / 2};};
  listen(document, 'focusin', e => {
    if (!e.target.matches('input,textarea,select')) return;
    host.dataset.attentive = 'true'; signal('focus', fieldIndex(e.target), fieldPoint(e.target));
  });
  listen(document, 'focusout', () => {host.dataset.attentive = 'false';});
  listen(document, 'input', e => {if (e.target.matches('input,textarea,select')) signal('typing', fieldIndex(e.target), fieldPoint(e.target));});
  listen(document, 'invalid', () => signal('invalid'), {capture: true});
  listen(document, 'visibilitychange', () => {cancelAnimationFrame(raf); raf = 0; if (!document.hidden) wake();});
  listen(media, 'change', () => {cancelAnimationFrame(raf); raf = 0; if (media.matches) still(); else wake();});
  listen(window, 'resize', resize);
  const observer = new ResizeObserver(() => resize());
  observer.observe(canvas);
  // Web fonts change the measured copy; settle the layout once they arrive.
  document.fonts?.ready.then(() => {if (!disposed) relayout(false);});
  const panelWatch = new ResizeObserver(() => {if (!disposed && width) relayout(false);});
  document.querySelectorAll(PANELS).forEach(el => panelWatch.observe(el));
  panelWatch.observe(host);

  function destroy() {
    disposed = true; abort.abort(); observer.disconnect(); panelWatch.disconnect(); cancelAnimationFrame(raf); raf = 0;
    signals.forEach(s => {s.on = false;}); nodes = []; edges = [];
    canvas.remove(); host.remove();
  }
  host.dataset.mode = mode;
  if (!ctx) {host.classList.add('world-unavailable'); canvas.remove(); return {setMode: next => {host.dataset.mode = next === 'partner' ? 'partner' : 'individual'; return false;}, signal: kind => {host.dataset.activity = kind;}, destroy};}
  resize();
  bootAt = performance.now() + 650;
  return {setMode, signal, destroy, relayout: () => relayout(false)};
}
