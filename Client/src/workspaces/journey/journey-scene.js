/**
 * System Journey scene: one SVG that diffs from one declared step to the
 * next. Nodes enter, move and leave; new connections draw from their origin;
 * the step's active connections illuminate in the direction of travel while a
 * small token rides along them; recipients then highlight, status chips change
 * and the step's note is released. Every phase can be cancelled and
 * fast-forwarded, so rapid navigation always lands on the declared final state.
 * Under reduced motion the final state is applied at once.
 */
const NS = 'http://www.w3.org/2000/svg';
const el = (name, attrs = {}, parent) => {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  if (parent) parent.append(node);
  return node;
};

/* 24-unit stroke glyphs for objects and travelling tokens. */
export const GLYPHS = {
  envelope: 'M3 6h18v12H3Z M3 7l9 6 9-6',
  check: 'm5 12.5 4.5 4.5L19 7',
  cross: 'M7 7l10 10M17 7 7 17',
  doc: 'M6 3h9l4 4v14H6Z M14 3v5h5 M9 12h7 M9 16h5',
  initiative: 'M12 4v5 M12 15v5 M4 12h5 M15 12h5 M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z M12 4h.01 M12 20h.01 M4 12h.01 M20 12h.01',
  calendar: 'M4 6h16v14H4Z M8 3v5 M16 3v5 M4 10h16',
  qr: 'M4 4h6v6H4Z M14 4h6v6h-6Z M4 14h6v6H4Z M14 14h2v2h-2Z M18 18h2v2h-2Z M14 18h2 M18 14h2',
  seat: 'M7 13V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v7 M5 13h14v4H5Z M7 17v3 M17 17v3',
  leaf: 'M20 4C8 1 2 8 5 15s13 7 15-11Z M5 20 16 9',
  chart: 'M4 4v16h16 M8 16v-4 M12 16V8 M16 16v-6',
  group: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M3 20v-1a5 5 0 0 1 10 0v1 M16 11a3 3 0 1 0 0-6 M18 20v-1a5 5 0 0 0-3-4.6',
  book: 'M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4Z M20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6Z',
  mountain: 'm3 19 6-10 4 6 2-3 6 7Z M15 7a2 2 0 1 0 0-.01',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 7v5l3 2',
  shield: 'M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6Z M9 12l2 2 4-4',
  key: 'M8 20a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Z M11.2 12.3 20 3.5 M16.5 7l2.5 2.5 M14 9.5l2 2',
  lock: 'M6 11h12v9H6Z M8 11V8a4 4 0 0 1 8 0v3',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18',
  flask: 'M9 3h6 M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3 M7.5 15h9',
  map: 'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3Z M9 3v15 M15 6v15',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4Z M10 21h4',
  flag: 'M5 21V4 M5 4h11l-2 4 2 4H5',
  bubble: 'M4 5h16v11H9l-5 4Z',
  layers: 'M12 3 3 8l9 5 9-5Z M3 13l9 5 9-5',
  edit: 'M4 20h4L19 9l-4-4L4 16Z M13 7l4 4',
  scale: 'M12 4v16 M7 20h10 M5 8h14 M5 8l-3 6a3 3 0 0 0 6 0Z M19 8l-3 6a3 3 0 0 0 6 0Z',
  spark: 'M12 3v4 M12 17v4 M3 12h4 M17 12h4 M6 6l2.5 2.5 M15.5 15.5 18 18 M6 18l2.5-2.5 M15.5 8.5 18 6',
  flower: 'M12 9a3 3 0 1 0 0-.01 M12 12v9 M12 6a3 3 0 0 1 3-3 3 3 0 0 1-3 3 3 3 0 0 1-3-3 3 3 0 0 1 3 3Z M12 17c-2-2-4-2-5-1m5 1c2-2 4-2 5-1',
  rabbit: 'M8 21c-2 0-3-2-3-4 0-3 3-5 7-5s6 2 6 4-1 3-3 3M14 12l1-8m-3 8-1-7',
  birdhouse: 'M5 10 12 4l7 6v8H5Zm7 11v-3 M12 11a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
  arrow: 'M5 12h14 M13 6l6 6-6 6'
};

/* Muted tones for the small human figures: [light, deep]. */
const TONES = {
  forest: ['#7fa492', '#335d4c'], sage: ['#b4cda6', '#6a9363'], slate: ['#a9bccb', '#557187'],
  clay: ['#e2baa5', '#a86f56'], ochre: ['#e5c98f', '#9c7a3a'], ink: ['#93a0a8', '#3f4c55'], plum: ['#c8b4cf', '#77607f']
};

const STAGE_MID = 286;
const FIGURE_TOP = 40;    // attach point above a node's centre (status chips sit above it)
const SIDE = 38;

/**
 * Text keeps a readable on-screen size at every width: `k` is user units per
 * CSS pixel, so labels and chips grow in the viewBox as the canvas shrinks.
 * Downward connections leave from below a node's label, never through it.
 */
// Figures grow a little on narrow screens too, so they stay recognisable next to their labels.
const figOf = k => Math.min(1.55, Math.max(1, k * .66));
const topOf = k => FIGURE_TOP * figOf(k);
// A connection arriving from above stops at the status chip, never behind it.
const entryOf = (node, k) => node.chip ? topOf(k) + 25 * k : topOf(k);
const labelY = k => 34 * figOf(k) + 13 * k;
const subY = k => labelY(k) + 14 * k;
const hasSub = (node, k) => Boolean(node.sub) && !(k > 1.5 && node.crowded);
const bottomOf = (node, k) => (hasSub(node, k) ? subY(k) : labelY(k)) + 9 * k;

const glyph = (name, parent, size = 24, x = -size / 2, y = -size / 2) => {
  const g = el('g', { class: 'jn-glyph', transform: `translate(${x} ${y}) scale(${size / 24})` }, parent);
  el('path', { d: GLYPHS[name] || GLYPHS.leaf }, g);
  return g;
};

/** Orthogonal route from one node to another, chosen by their relative place. */
export function route(a, b, shape = 'auto', k = 1) {
  const dx = b.x - a.x, dy = b.y - a.y;
  if (shape === 'auto') shape = Math.abs(dy) < 30 ? 'flat' : Math.abs(dx) < 4 ? 'line' : 'elbow';
  if (shape === 'under') {
    // Below both labels, for two people on one row with someone between them.
    const y0 = a.y + bottomOf(a, k), y1 = b.y + bottomOf(b, k), yb = Math.max(y0, y1) + 24 * k, s = Math.sign(dx) || 1, r = 12;
    return `M${a.x} ${y0} V${yb - r} Q${a.x} ${yb} ${a.x + s * r} ${yb} H${b.x - s * r} Q${b.x} ${yb} ${b.x} ${yb - r} V${y1}`;
  }
  if (shape === 'flat') {
    const s = Math.sign(dx) || 1, side = SIDE * figOf(k);
    return `M${a.x + s * side} ${a.y} H${b.x - s * side}`;
  }
  const down = dy > 0;
  const y0 = a.y + (down ? bottomOf(a, k) : -entryOf(a, k)), y1 = b.y + (down ? -entryOf(b, k) : bottomOf(b, k));
  if (shape === 'line') return `M${a.x} ${y0} V${y1}`;
  if (shape === 'side') {
    const s = Math.sign(dx) || 1;
    return `M${a.x + s * SIDE * figOf(k)} ${a.y} H${b.x} V${y1}`;
  }
  const mid = Math.round((y0 + y1) / 2);
  const r = Math.min(14, Math.abs(dx) / 2, Math.abs(mid - y0));
  const sx = Math.sign(dx), sy = down ? 1 : -1;
  return `M${a.x} ${y0} V${mid - sy * r} Q${a.x} ${mid} ${a.x + sx * r} ${mid} H${b.x - sx * r} Q${b.x} ${mid} ${b.x} ${mid + sy * r} V${y1}`;
}

export function createScene(svg, { onEvent = () => {}, reducedMotion = () => false } = {}) {
  const defs = el('defs', {}, svg);
  for (const [tone, [light, deep]] of Object.entries(TONES)) {
    const head = el('radialGradient', { id: `jn-head-${tone}`, cx: '35%', cy: '30%', r: '75%' }, defs);
    el('stop', { offset: '0%', 'stop-color': '#fff', 'stop-opacity': '.85' }, head);
    el('stop', { offset: '28%', 'stop-color': light }, head);
    el('stop', { offset: '100%', 'stop-color': deep }, head);
    const body = el('linearGradient', { id: `jn-body-${tone}`, x1: '0', y1: '0', x2: '.4', y2: '1' }, defs);
    el('stop', { offset: '0%', 'stop-color': light }, body);
    el('stop', { offset: '100%', 'stop-color': deep }, body);
  }
  const layers = { edges: el('g', { class: 'jn-edges' }, svg), glows: el('g', { class: 'jn-glows' }, svg), nodes: el('g', { class: 'jn-nodes' }, svg), chips: el('g', { class: 'jn-chips' }, svg), tokens: el('g', { class: 'jn-tokens' }, svg) };
  const nodes = new Map(), edges = new Map(), chips = new Map();
  let timers = [], frames = [], pending = null, version = 0, k = 1, current = null, raw = null;
  // Narrow screens enlarge text and chips, so rows spread apart vertically to keep their spacing.
  const project = scene => {
    const spread = k > 1.5 ? 1.32 : 1;
    return spread === 1 ? scene : { ...scene, nodes: scene.nodes.map(n => ({ ...n, y: STAGE_MID + (n.y - STAGE_MID) * spread })) };
  };

  const later = (ms, fn) => { const t = setTimeout(fn, ms); timers.push(t); };
  const cancel = () => { timers.forEach(clearTimeout); frames.forEach(cancelAnimationFrame); timers = []; frames = []; layers.tokens.replaceChildren(); layers.glows.replaceChildren(); };

  function makeNode(node) {
    const g = el('g', { class: `jn-node is-${node.kind}`, 'data-node': node.id }, layers.nodes);
    const fig = el('g', { class: 'jn-fig' }, g);
    el('circle', { class: 'jn-halo', r: 44, cy: node.kind === 'person' ? -4 : 0 }, fig);
    if (node.kind === 'person') {
      el('ellipse', { class: 'jn-shadow', cx: 0, cy: 30, rx: 21, ry: 4.5 }, fig);
      el('path', { class: 'jn-body', d: 'M-19 29c0-14 7-22 19-22s19 8 19 22Z', fill: `url(#jn-body-${node.tone})` }, fig);
      el('circle', { class: 'jn-head', cx: 0, cy: -9, r: 12, fill: `url(#jn-head-${node.tone})` }, fig);
    } else {
      el('ellipse', { class: 'jn-shadow', cx: 0, cy: 28, rx: 22, ry: 4.5 }, fig);
      el('rect', { class: 'jn-tile', x: -24, y: -24, width: 48, height: 48, rx: 14 }, fig);
      glyph(node.glyph, fig, 24);
    }
    const label = el('text', { class: 'jn-label', y: 0 }, g);
    const sub = el('text', { class: 'jn-sub', y: 0 }, g);
    const record = { g, fig, label, sub, x: node.x, y: node.y };
    nodes.set(node.id, record);
    return record;
  }

  function setNode(record, node) {
    record.x = node.x; record.y = node.y;
    record.g.style.transform = `translate(${node.x}px, ${node.y}px)`;
    record.node = node;
    record.g.classList.toggle('is-dim', Boolean(node.dim));
    record.g.classList.remove('is-focus');
    paintLabel(record);
  }

  function paintLabel(record) {
    const { node } = record;
    record.label.textContent = k > 1.5 && node.short ? node.short : node.label;
    record.sub.textContent = k > 1.5 && node.crowded ? '' : node.sub || '';
    record.label.setAttribute('y', labelY(k));
    record.sub.setAttribute('y', subY(k));
    record.fig.setAttribute('transform', `scale(${figOf(k)})`);
  }

  function makeChip(id, record) {
    const g = el('g', { class: 'jn-chip', 'data-chip': id }, layers.chips);
    el('rect', { class: 'jn-chip-bg', rx: 11, height: 22, y: -11 }, g);
    const text = el('text', { class: 'jn-chip-text', y: 0, 'dominant-baseline': 'central', 'text-anchor': 'middle' }, g);
    const chip = { g, text, record };
    chips.set(id, chip);
    return chip;
  }

  function paintChip(chip, value) {
    const warn = value.startsWith('!'), label = warn ? value.slice(1) : value;
    chip.text.textContent = label;
    chip.g.classList.toggle('is-warn', warn);
    chip.g.classList.toggle('is-positive', /^(Accepted|Active|Approved|Published|Confirmed|Present|Completed|Verified|Enrolled|Upgraded|Linked)/.test(label));
    const width = Math.max(48, chip.text.getComputedTextLength() + 22);
    const rect = chip.g.querySelector('rect');
    rect.setAttribute('width', width);
    rect.setAttribute('x', -width / 2);
  }

  function placeChip(chip) {
    const { x, y } = chip.record;
    chip.g.style.transform = `translate(${x}px, ${y - topOf(k) - 13 * k}px) scale(${k})`;
  }

  /** The token's point and distance along the path; the lit segment trails it. */
  function point(path, t, reverse) {
    const total = path.getTotalLength(), length = (reverse ? 1 - t : t) * total;
    const { x, y } = path.getPointAtLength(length);
    return { x, y, length };
  }

  /** Light one connection in its direction of travel and send a token along it. */
  function flow(edge, reverse, token, duration, done) {
    const path = edge.path, length = path.getTotalLength();
    const glow = el('path', { class: 'jn-glow', d: path.getAttribute('d') }, layers.glows);
    const dash = Math.min(120, length * .45);
    glow.setAttribute('stroke-dasharray', `${dash} ${length + dash}`);
    const bead = el('g', { class: 'jn-token' }, layers.tokens);
    el('circle', { r: 13 }, bead);
    glyph(token, bead, 14);
    const start = performance.now();
    const tick = now => {
      const t = Math.min(1, (now - start) / duration), eased = t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const p = point(path, eased, reverse);
      bead.setAttribute('transform', `translate(${p.x} ${p.y})`);
      // The bright segment leads the token, so the path lights in the direction of travel.
      glow.setAttribute('stroke-dashoffset', reverse ? -p.length : dash - p.length);
      if (t < 1) frames.push(requestAnimationFrame(tick));
      else { bead.remove(); glow.classList.add('is-fading'); later(420, () => glow.remove()); done(); }
    };
    frames.push(requestAnimationFrame(tick));
  }

  function finalize(scene) {
    cancel();
    for (const [id, record] of nodes) {
      record.g.classList.remove('is-entering', 'is-leaving');
      record.g.classList.toggle('is-focus', scene.focus.includes(id));
      if (!scene.nodes.some(n => n.id === id)) { record.g.remove(); nodes.delete(id); }
    }
    for (const [key, edge] of edges) {
      if (!scene.edges.some(e => e.key === key)) { edge.path.remove(); edges.delete(key); continue; }
      edge.path.classList.remove('is-drawing', 'is-leaving');
      edge.path.style.strokeDashoffset = '0';
      edge.path.classList.toggle('is-latest', scene.flows.some(f => f.key === key));
    }
    for (const [id, chip] of chips) {
      const value = scene.status[id];
      if (value === undefined) { chip.g.remove(); chips.delete(id); continue; }
      chip.g.classList.remove('is-entering');
      placeChip(chip);
      paintChip(chip, Array.isArray(value) ? value[value.length - 1] : value);
      chip.g.classList.toggle('is-changed', Array.isArray(value));
    }
    if (pending) { const fire = pending; pending = null; fire(); }
  }

  /**
   * Show a declared scene. `animate` false (reduced motion, restore on mount)
   * jumps to the end state; `flows` false (going back) reflows without
   * replaying the event itself.
   */
  function show(declared, { animate = true, flows = true } = {}) {
    raw = declared;
    const scene = project(declared);
    if (pending) finalize(current || scene);
    cancel();
    const run = ++version;
    current = scene;
    const motion = animate && !reducedMotion();
    svg.classList.toggle('is-static', !motion);
    pending = () => onEvent(scene);

    // 1 · Leave.
    for (const [id, record] of nodes) if (!scene.nodes.some(n => n.id === id)) {
      if (motion) { record.g.classList.add('is-leaving'); later(220, () => { if (run === version) { record.g.remove(); nodes.delete(id); } }); }
      else { record.g.remove(); nodes.delete(id); }
    }
    for (const [key, edge] of edges) if (!scene.edges.some(e => e.key === key)) {
      if (motion) { edge.path.classList.add('is-leaving'); later(220, () => { if (run === version) { edge.path.remove(); edges.delete(key); } }); }
      else { edge.path.remove(); edges.delete(key); }
    }
    for (const [id, chip] of chips) if (scene.status[id] === undefined) { chip.g.remove(); chips.delete(id); }

    // 2 · Enter and move.
    const entering = [];
    for (const node of scene.nodes) {
      let record = nodes.get(node.id);
      if (!record) { record = makeNode(node); entering.push(record); if (motion) record.g.classList.add('is-entering', 'no-move'); }
      setNode(record, node);
    }
    if (motion) requestAnimationFrame(() => entering.forEach(r => { r.g.classList.remove('no-move'); requestAnimationFrame(() => r.g.classList.remove('is-entering')); }));

    // 3 · Draw new connections from their origin.
    const drawing = [];
    for (const edge of scene.edges) {
      const a = scene.nodes.find(n => n.id === edge.from), b = scene.nodes.find(n => n.id === edge.to);
      const d = route(a, b, edge.shape, k);
      let record = edges.get(edge.key);
      if (!record) { record = { path: el('path', { class: 'jn-edge', 'data-edge': edge.key }, layers.edges) }; edges.set(edge.key, record); drawing.push(record); }
      record.path.setAttribute('d', d);
      record.path.classList.remove('is-latest', 'is-leaving');
      const length = record.path.getTotalLength();
      record.path.style.strokeDasharray = `${length}`;
      record.path.style.strokeDashoffset = drawing.includes(record) && motion ? `${length}` : '0';
    }

    // Status chips start at their "from" value.
    for (const [id, value] of Object.entries(scene.status)) {
      const record = nodes.get(id);
      if (!record) continue;
      const chip = chips.get(id) || makeChip(id, record);
      chip.record = record;
      placeChip(chip);
      chip.g.classList.remove('is-changed');
      paintChip(chip, Array.isArray(value) ? value[0] : value);
    }

    if (!motion) { finalize(scene); return; }
    const drawAt = entering.length ? 320 : 120;
    if (drawing.length) later(drawAt, () => drawing.forEach(r => { r.path.classList.add('is-drawing'); r.path.style.strokeDashoffset = '0'; }));
    const flowAt = drawing.length ? drawAt + 620 : drawAt + 80;
    const active = flows ? scene.flows : [];
    const arrive = f => nodes.get(f.reverse ? f.from : f.to)?.g.classList.add('is-focus');
    later(flowAt, () => {
      if (!active.length) return later(60, () => finalize(scene));
      if (scene.sequence) {
        // A chain: each event leaves only after the previous one arrives.
        let i = 0;
        const next = () => { const f = active[i++]; if (!f) return later(160, () => finalize(scene)); flow(edges.get(f.key), f.reverse, f.token || scene.token, 680, () => { arrive(f); next(); }); };
        return next();
      }
      let left = active.length;
      active.forEach(f => flow(edges.get(f.key), f.reverse, f.token || scene.token, 760, () => {
        arrive(f);
        if (--left === 0) later(160, () => finalize(scene));
      }));
    });
  }

  /** Re-lay text and connections for a new on-screen scale; no animation. */
  function setScale(next) {
    if (Math.abs(next - k) < .01) return;
    k = next;
    svg.style.setProperty('--k', k);
    if (raw) show(raw, { animate: false });
  }

  return {
    show,
    setScale,
    finish: () => { if (current) finalize(current); },
    destroy: () => { cancel(); pending = null; svg.replaceChildren(); },
    snapshot: () => ({ nodes: [...nodes.keys()].sort(), edges: [...edges.keys()].sort(), chips: [...chips.keys()].sort(), tokens: layers.tokens.childElementCount })
  };
}
