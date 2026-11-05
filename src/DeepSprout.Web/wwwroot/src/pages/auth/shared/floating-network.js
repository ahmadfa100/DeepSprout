/**
 * Floating network behind the centered auth card (Login and Register).
 *
 * Individual: nodes drift on a few slow elliptical orbits that frame the card,
 * each one bobbing gently so the whole field seems to float.
 * Partner: the same nodes leave their orbits and gather into small communities
 * around icon hubs (mentors, institutions, outdoor, communities, workshops,
 * initiatives) on either side of the card. Every node keeps its identity and
 * eases between the two layouts, so switching paths is reversible at any time.
 *
 * Decorative only: the canvas is aria-hidden and listeners use event kinds,
 * never field values. A hidden `.registration-world` element mirrors the mode
 * and the latest activity so tests can observe them.
 */
import {glyphs} from '../register/experience/glyphs.js';

const TAU = Math.PI * 2;
const HUBS = [['mentor', 'Mentors'], ['organization', 'Institutions'], ['provider', 'Outdoor'], ['community', 'Communities'], ['workshop', 'Workshops'], ['initiative', 'Initiatives']];
const QUIET = 'a,button,input,textarea,select,label,summary,dialog,[role=button],.login-card';
const LINE = '86,132,118', DOT = '63,138,118', SPARK = '23,160,127', LABEL = '#4c6259';

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const mix = (a, b, t) => a + (b - a) * t;
const ease = t => t * t * (3 - 2 * t);
function seeded(seed) {
  return () => {seed = seed + 0x6d2b79f5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296;};
}

export function createFloatingNetwork(scene, initialMode = 'individual') {
  const card = scene.querySelector('.login-card');
  const canvas = document.createElement('canvas');
  canvas.className = 'auth-network';
  canvas.setAttribute('aria-hidden', 'true');
  scene.prepend(canvas);
  const state = document.createElement('aside');
  state.className = 'registration-world';
  state.hidden = true;
  scene.before(state);
  const ctx = canvas.getContext('2d');
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const abort = new AbortController(), on = {signal: abort.signal};
  const icons = Object.fromEntries(HUBS.map(([key]) => [key, new Path2D(glyphs[key])]));
  const glow = document.createElement('canvas');
  glow.width = glow.height = 64;
  {
    const g = glow.getContext('2d'), gradient = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(36,170,132,.5)'); gradient.addColorStop(.4, 'rgba(36,170,132,.14)'); gradient.addColorStop(1, 'rgba(36,170,132,0)');
    g.fillStyle = gradient; g.fillRect(0, 0, 64, 64);
  }

  let mode = initialMode === 'partner' ? 'partner' : 'individual', target = mode === 'partner' ? 1 : 0, blend = target;
  let W = 0, H = 0, dpr = 1, spacing = 100, compact = false, built = false, disposed = false;
  let nodes = [], rings = [], hubs = [], centre = {x: 0, y: 0, tx: 0, ty: 0};
  let raf = 0, last = 0, clock = 0, nextSpark = 1.2, edgeCount = 0;
  const edgeA = new Int16Array(1024), edgeB = new Int16Array(1024);
  const sparks = Array.from({length: 12}, () => ({on: false, a: 0, b: 0, t: 0, dur: 1}));
  const ripples = Array.from({length: 4}, () => ({on: false, x: 0, y: 0, t: 0}));
  state.dataset.mode = mode;

  /* ── Geometry ─────────────────────────────────────────────── */
  function measure() {
    const s = scene.getBoundingClientRect(), c = card.getBoundingClientRect();
    return {W: s.width, H: s.height, l: c.left - s.left, t: c.top - s.top, r: c.right - s.left, b: c.bottom - s.top};
  }
  // Where the orbits and hubs should sit for the current card size.
  function targets(g) {
    const cx = (g.l + g.r) / 2, half = (g.r - g.l) / 2;
    const cy = compact ? g.t + 24 : (g.t + Math.min(g.b, g.H)) / 2;
    const inner = compact ? g.W * .34 : half + 84;
    const outer = Math.max(inner + 40, compact ? g.W * .98 : Math.max(cx, g.W - cx) - 20);
    const squash = compact ? .42 : clamp(g.H / g.W * 1.12, .62, 1);
    const radii = rings.length ? rings.map((_, k) => mix(inner, outer, rings.length > 1 ? k / (rings.length - 1) : 0)) : null;
    const side = g.l, list = [];
    if (!compact && side >= 120) {
      const perSide = side >= 190 ? 3 : 2;
      const top = Math.max(g.t, 0) + 90, bottom = Math.min(g.b, g.H) - 90;
      const offset = clamp(side * .48, 70, 250);
      for (let s = 0; s < 2; s++) for (let i = 0; i < perSide; i++) {
        const f = perSide === 3 ? [.08, .5, .92][i] : [.25, .75][i];
        const out = perSide === 3 && i === 1 ? Math.min(46, side * .14) : 0;
        list.push({x: s ? g.r + offset + out : g.l - offset - out, y: mix(top, bottom, f)});
      }
    }
    return {cx, cy, inner, outer, squash, radii, hubs: list};
  }

  function build() {
    const g = measure();
    W = g.W; H = g.H; compact = W < 720;
    const rand = seeded(compact ? 911 : 2027);
    spacing = compact ? 64 : 118;
    const t = targets(g);
    const count = compact ? 3 : clamp(Math.round((t.outer - t.inner) / 130) + 1, 2, 4);
    rings = Array.from({length: count}, (_, k) => {
      const rx = mix(t.inner, t.outer, count > 1 ? k / (count - 1) : 0);
      return {rx, ry: rx * t.squash, tx: rx, ty: rx * t.squash, sq: t.squash};
    });
    centre = {x: t.cx, y: t.cy, tx: t.cx, ty: t.cy};
    hubs = t.hubs.map((h, i) => ({...h, tx: h.x, ty: h.y, key: HUBS[i < t.hubs.length / 2 ? i : 3 + i - t.hubs.length / 2][0], label: HUBS[i < t.hubs.length / 2 ? i : 3 + i - t.hubs.length / 2][1], side: i < t.hubs.length / 2 ? 0 : 1, phase: rand() * TAU}));

    nodes = [];
    rings.forEach((ring, k) => {
      const perimeter = TAU * Math.sqrt((ring.rx ** 2 + ring.ry ** 2) / 2);
      const n = Math.max(8, Math.round(perimeter / spacing));
      const dir = k % 2 ? -1 : 1, speed = dir * TAU / (210 + k * 50);
      for (let i = 0; i < n; i++) {
        const roll = rand();
        nodes.push({
          ring: k, a0: (i + (rand() - .5) * .45) / n * TAU, dr: (rand() - .5) * 16, speed,
          bobA: 5 + rand() * 6, bobF: TAU / (7 + rand() * 6), bobP: rand() * TAU, bobQ: rand() * TAU,
          kind: roll < .12 ? 'ring' : roll < .2 ? 'focal' : 'dot', r: 1.5 + rand() * 1.2, alpha: .55 + rand() * .3,
          hub: -1, hr: 0, ha0: 0, hspeed: 0, lag: rand() * .18, e: 0, x: 0, y: 0
        });
      }
    });
    // Each node links to the next one along its orbit (the last closes the loop).
    nodes.forEach((n, i) => {n.next = nodes[i + 1]?.ring === n.ring ? i + 1 : nodes.findIndex(m => m.ring === n.ring);});
    // Partner communities: each hub claims its nearest free nodes.
    if (hubs.length) {
      const cap = compact ? 6 : 11, groups = hubs.map(() => []);
      const at0 = nodes.map(n => {const r = rings[n.ring]; return {x: centre.x + Math.cos(n.a0) * r.rx, y: centre.y + Math.sin(n.a0) * r.ry};});
      const order = nodes.map((_, i) => i).sort(() => rand() - .5);
      for (const i of order) {
        if (rand() < .3) continue; // ambient: stays on its orbit as quiet context
        let best = -1, bestD = Infinity;
        hubs.forEach((h, j) => {const d = Math.hypot(h.x - at0[i].x, h.y - at0[i].y); if (groups[j].length < cap && d < bestD) {bestD = d; best = j;}});
        if (best >= 0) {groups[best].push(i); nodes[i].hub = best;}
      }
      groups.forEach(group => group.forEach((i, j) => {
        const n = nodes[i], outerBand = j % 2;
        n.hr = outerBand ? 76 + rand() * 20 : 50 + rand() * 8;
        n.ha0 = (j + rand() * .4) / group.length * TAU;
        n.hspeed = (outerBand ? -1 : 1) * TAU / (70 + rand() * 30);
      }));
      hubs.forEach((h, j) => {h.members = groups[j];});
    }
    built = true;
    resizeCanvas();
  }

  function resizeCanvas() {
    dpr = Math.min(2, devicePixelRatio || 1);
    const w = Math.round(W * dpr), h = Math.round(H * dpr);
    if (canvas.width !== w || canvas.height !== h) {canvas.width = w; canvas.height = h;}
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  }

  // Card height changes (choice → form) move the orbits smoothly, not in a jump.
  function relayout() {
    if (disposed) return;
    const g = measure();
    if (!built || Math.abs(g.W - W) > 1) {build(); if (still.matches) draw(); return;}
    H = g.H; resizeCanvas();
    const t = targets(g);
    centre.tx = t.cx; centre.ty = t.cy;
    rings.forEach((ring, k) => {ring.tx = t.radii[k]; ring.ty = t.radii[k] * t.squash;});
    hubs.forEach((h, i) => {if (t.hubs[i]) {h.tx = t.hubs[i].x; h.ty = t.hubs[i].y;}});
    if (still.matches) {settle(); draw();}
  }
  function settle() {
    centre.x = centre.tx; centre.y = centre.ty;
    rings.forEach(r => {r.rx = r.tx; r.ry = r.ty;});
    hubs.forEach(h => {h.x = h.tx; h.y = h.ty;});
  }

  /* ── Motion ───────────────────────────────────────────────── */
  function step(dt) {
    clock += dt;
    const k = 1 - Math.exp(-dt * 3);
    centre.x += (centre.tx - centre.x) * k; centre.y += (centre.ty - centre.y) * k;
    rings.forEach(r => {r.rx += (r.tx - r.rx) * k; r.ry += (r.ty - r.ry) * k;});
    hubs.forEach(h => {h.x += (h.tx - h.x) * k; h.y += (h.ty - h.y) * k;});
    blend = target > blend ? Math.min(target, blend + dt / 1.5) : Math.max(target, blend - dt / 1.5);
    for (const s of sparks) if (s.on && (s.t += dt) > s.dur) s.on = false;
    for (const r of ripples) if (r.on && (r.t += dt) > 1.6) r.on = false;
    if ((nextSpark -= dt) <= 0) {spark(1); nextSpark = 1.8 + Math.random() * 1.6;}
  }
  function position(n, t) {
    const ring = rings[n.ring], a = n.a0 + n.speed * t;
    let x = centre.x + Math.cos(a) * (ring.rx + n.dr), y = centre.y + Math.sin(a) * (ring.ry + n.dr * ring.sq);
    n.e = n.hub >= 0 ? ease(clamp((blend - n.lag) / .82, 0, 1)) : 0;
    if (n.e > 0) {
      const h = hubs[n.hub], ha = n.ha0 + n.hspeed * t, hy = h.y + Math.sin(t * .5 + h.phase) * 5;
      x = mix(x, h.x + Math.cos(ha) * n.hr, n.e); y = mix(y, hy + Math.sin(ha) * n.hr * .86, n.e);
    }
    n.x = x + Math.sin(t * n.bobF + n.bobP) * n.bobA;
    n.y = y + Math.cos(t * n.bobF * .83 + n.bobQ) * n.bobA;
  }

  function spark(count) {
    for (let c = 0; c < count && edgeCount; c++) {
      const s = sparks.find(item => !item.on);
      if (!s) return;
      const e = Math.floor(Math.random() * edgeCount);
      Object.assign(s, {on: true, a: edgeA[e], b: edgeB[e], t: 0, dur: 1.6 + Math.random() * .8});
    }
  }
  function ripple(x, y) {
    const r = ripples.find(item => !item.on) || ripples[0];
    Object.assign(r, {on: true, x, y, t: 0});
  }

  /* ── Drawing ──────────────────────────────────────────────── */
  function line(a, b, alpha) {
    if (alpha < .01) return;
    ctx.strokeStyle = `rgba(${LINE},${alpha})`;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  function draw() {
    if (!built) return;
    const t = clock, fade = still.matches ? 1 : clamp(clock / 1.4, 0, 1);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = fade;
    for (const n of nodes) position(n, t);

    // Orbit guides: the quiet structure the nodes travel along.
    ctx.lineWidth = 1;
    const guide = .075 * (1 - blend * .55);
    rings.forEach(r => {ctx.strokeStyle = `rgba(${LINE},${guide})`; ctx.beginPath(); ctx.ellipse(centre.x, centre.y, r.rx, r.ry, 0, 0, TAU); ctx.stroke();});

    // Links along each orbit, plus short bridges between neighbouring orbits.
    edgeCount = 0;
    const record = (a, b) => {if (edgeCount < edgeA.length) {edgeA[edgeCount] = a; edgeB[edgeCount] = b; edgeCount++;}};
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i], b = nodes[a.next], free = (1 - a.e) * (1 - b.e);
      if (free > .02 && Math.hypot(a.x - b.x, a.y - b.y) < spacing * 2) {line(a, b, .2 * free); if (blend < .5) record(i, a.next);}
    }
    const reach = spacing * 1.05;
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      if (b.ring !== a.ring + 1) continue;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < reach) line(a, b, .1 * (1 - d / reach) * (1 - a.e) * (1 - b.e));
    }

    // Partner communities: spokes to each hub and a ring of neighbours.
    if (blend > 0) {
      hubs.forEach((h, j) => {
        const m = h.members || [];
        m.forEach((i, k) => {
          const n = nodes[i], next = nodes[m[(k + 2) % m.length]];
          if (k % 2 === 0) line(n, h, .26 * n.e);
          if (m.length > 2) {line(n, next, .14 * Math.min(n.e, next.e)); if (n.e > .5) record(i, m[(k + 2) % m.length]);}
        });
      });
      ctx.setLineDash([3, 6]);
      hubs.forEach((h, i) => {const next = hubs[i + 1]; if (next && next.side === h.side) line(h, next, .22 * blend);});
      ctx.setLineDash([]);
    }

    // Nodes.
    for (const n of nodes) {
      if (n.x < -12 || n.y < -12 || n.x > W + 12 || n.y > H + 12) continue;
      const a = n.alpha * (n.hub < 0 ? 1 - blend * .45 : 1);
      if (n.kind === 'focal') {
        ctx.globalAlpha = fade * a * .9; ctx.drawImage(glow, n.x - 14, n.y - 14, 28, 28); ctx.globalAlpha = fade;
        ctx.fillStyle = `rgba(${DOT},${a + .1})`; ctx.beginPath(); ctx.arc(n.x, n.y, 3.2, 0, TAU); ctx.fill();
      } else if (n.kind === 'ring') {
        ctx.fillStyle = '#fff'; ctx.strokeStyle = `rgba(${DOT},${a})`; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.arc(n.x, n.y, 4.4, 0, TAU); ctx.fill(); ctx.stroke(); ctx.lineWidth = 1;
      } else {
        ctx.fillStyle = `rgba(${DOT},${a})`; ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, TAU); ctx.fill();
      }
    }

    // Hubs: an icon in a soft white disc, its name beneath.
    if (blend > 0) {
      ctx.font = '600 10.5px "DM Sans", "Avenir Next", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '1.8px';
      hubs.forEach((h, i) => {
        const s = ease(clamp(blend * 1.3 - i * .05, 0, 1));
        if (s <= 0) return;
        const y = h.y + Math.sin(t * .5 + h.phase) * 5, r = 25 * (.6 + .4 * s);
        ctx.globalAlpha = fade * s;
        ctx.drawImage(glow, h.x - r * 2.2, y - r * 2.2, r * 4.4, r * 4.4);
        ctx.fillStyle = '#fff'; ctx.strokeStyle = `rgba(${LINE},.42)`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(h.x, y, r, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.save(); ctx.translate(h.x - 13.5 * (r / 25), y - 13.5 * (r / 25)); ctx.scale(27 / 34 * (r / 25), 27 / 34 * (r / 25));
        ctx.strokeStyle = '#2c6b59'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(icons[h.key]); ctx.restore();
        ctx.strokeStyle = 'rgba(253,253,249,.92)'; ctx.lineWidth = 5; ctx.strokeText(h.label.toUpperCase(), h.x, y + r + 10);
        ctx.fillStyle = LABEL; ctx.fillText(h.label.toUpperCase(), h.x, y + r + 10);
      });
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      ctx.globalAlpha = fade;
    }

    // Signals travelling along links, and taps on the open field.
    for (const s of sparks) {
      if (!s.on) continue;
      const a = nodes[s.a], b = nodes[s.b];
      if (!a || !b) {s.on = false; continue;}
      const p = s.t / s.dur, x = mix(a.x, b.x, p), y = mix(a.y, b.y, p);
      ctx.globalAlpha = fade * Math.sin(p * Math.PI);
      ctx.drawImage(glow, x - 9, y - 9, 18, 18);
      ctx.fillStyle = `rgb(${SPARK})`; ctx.beginPath(); ctx.arc(x, y, 1.8, 0, TAU); ctx.fill();
    }
    for (const r of ripples) {
      if (!r.on) continue;
      const p = r.t / 1.6;
      ctx.globalAlpha = fade * (1 - p) * .5; ctx.strokeStyle = `rgb(${SPARK})`;
      ctx.beginPath(); ctx.arc(r.x, r.y, 6 + p * 44, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /* ── Loop ─────────────────────────────────────────────────── */
  function frame(now) {
    raf = 0;
    if (disposed || document.hidden || still.matches) return;
    const dt = last ? Math.min(.05, (now - last) / 1000) : 0;
    last = now; step(dt); draw();
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (raf || disposed || document.hidden || still.matches) return;
    last = 0; raf = requestAnimationFrame(frame);
  }
  function stop() {cancelAnimationFrame(raf); raf = 0;}
  function onMotionPreference() {
    if (still.matches) {stop(); blend = target; settle(); draw();} else start();
  }

  /* ── Public API ───────────────────────────────────────────── */
  function setActivity(kind) {state.dataset.activity = kind;}
  function setMode(next) {
    next = next === 'partner' ? 'partner' : 'individual';
    if (next === mode) return false;
    mode = next; target = next === 'partner' ? 1 : 0; state.dataset.mode = next;
    if (still.matches) {blend = target; draw();} else spark(2);
    return true;
  }
  function signal(kind = 'activity') {
    setActivity(kind);
    if (!still.matches) spark(kind === 'error' || kind === 'invalid' ? 1 : 2);
  }
  function destroy() {
    disposed = true; stop(); abort.abort(); watch.disconnect();
    canvas.remove(); state.remove();
  }

  document.addEventListener('pointerdown', e => {
    if (e.target.closest?.(QUIET)) return;
    setActivity('background');
    const r = canvas.getBoundingClientRect();
    if (!still.matches && e.clientY >= r.top && e.clientY <= r.bottom) {ripple(e.clientX - r.left, e.clientY - r.top); spark(2);}
  }, on);
  document.addEventListener('focusin', e => {if (e.target.matches?.('input,textarea,select')) setActivity('focus');}, on);
  document.addEventListener('input', e => {if (e.target.matches?.('input,textarea')) setActivity('typing');}, on);
  document.addEventListener('visibilitychange', () => {if (document.hidden) stop(); else start();}, on);
  still.addEventListener('change', onMotionPreference, on);
  const watch = new ResizeObserver(relayout);
  watch.observe(scene); watch.observe(card);

  build();
  if (still.matches) {settle(); draw();} else start();
  return {setMode, signal, destroy, relayout};
}
