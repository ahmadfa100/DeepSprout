/**
 * My Garden — the Personal Garden (master §9.1): one fixed ivory scene with
 * exactly four small practice-type trees (Depth, Listening & Recall,
 * Practical Micro-Challenge, Protected Work) and no central fifth tree.
 * Trees grow from valid practice attempts in the private journal and from
 * Coach-approved tasks in the shared records — each source once. A flower
 * (Offline Routine), rabbit (Supervisor-confirmed attendance) and birdhouse
 * (verified camp completion) are bounded decorations. Missing data is
 * neutral: nothing dims or wilts. The low-poly isometric engine below is
 * unchanged: one camera, one light, focusable buttons over every object.
 */
(() => {
  if (window.DeepSproutPersonal?.denied()) { try { window.DeepSproutPersonal.requireAccess(); } catch {} return; }
  const Account = window.DeepSproutAccount;
  const canvas = document.getElementById('garden-canvas');
  if (!Account || !canvas) return;

  const fmt = Account.format;
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const SESSION_KEY = 'deepsprout-garden-entrance-v2';

  /* ------------------------------------------------------------ colours */

  // Every colour comes from style.css tokens; shades are mixed from them.
  const css = getComputedStyle(document.documentElement);
  const hex = name => {
    const value = css.getPropertyValue(name).trim();
    const full = value.length === 4 ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}` : value;
    return [1, 3, 5].map(index => parseInt(full.slice(index, index + 2), 16));
  };
  const C = {
    ink: hex('--color-ink'), pine: hex('--color-pine'), leaf: hex('--color-leaf'), mint: hex('--color-mint'),
    surface: hex('--color-surface'), white: hex('--color-white'), muted: hex('--color-muted'), gold: hex('--color-gold'),
    alert: hex('--color-alert'), soil: hex('--color-soil'), grass: hex('--color-grass'), grassDeep: hex('--color-grass-deep')
  };
  const mix = (a, b, t) => a.map((value, index) => Math.round(value + (b[index] - value) * t));
  const rgb = (color, alpha = 1) => `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
  const shade = (color, amount) => (amount >= 0 ? mix(color, C.white, amount) : mix(color, C.ink, -amount));

  // The scene's calm palette: sage greens and a soft soil, desaturated toward muted.
  const P = {
    grass: mix(mix(C.grass, C.surface, 0.3), C.muted, 0.3),
    soil: mix(mix(C.soil, C.surface, 0.3), C.muted, 0.22),
    bark: mix(mix(C.soil, C.ink, 0.3), C.muted, 0.35),
    round: mix(mix(C.grassDeep, C.muted, 0.38), C.surface, 0.06),
    pine: mix(mix(C.leaf, C.muted, 0.42), C.grassDeep, 0.22),
    crown: mix(mix(C.grassDeep, C.grass, 0.3), C.muted, 0.3),
    bloom: [mix(C.gold, C.white, 0.62), mix(C.alert, C.white, 0.8)]
  };

  /* ---------------------------------------------------------------- math */

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const ease = t => (t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  const easeOut = t => 1 - (1 - t) ** 3;
  const easeBack = t => { const c = 1.4; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };
  const phase = (t, start, length) => clamp((t - start) / length);
  const rng = seed => () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const centroid = pts => pts.reduce((sum, p) => [sum[0] + p[0] / pts.length, sum[1] + p[1] / pts.length, sum[2] + p[2] / pts.length], [0, 0, 0]);

  /* ------------------------------------------------------------- the world */

  const HALF = 6;              // half-size of the square ground plane
  const LIP = 0.1;             // the thin grass edge
  const SOIL = 0.26;           // the flat soil band under it
  const EL = Math.PI / 6;      // 30° elevation: a true 2:1 isometric view
  const REST_AZ = Math.PI / 4;
  const START_AZ = REST_AZ - 0.42;
  const LIGHT = norm([-0.4, 1, 0.62]); // one light, from the upper left, for the whole scene
  const MAX_TREES = 8;
  const TREE_SCALE = 1.7;     // trees are modelled in small units, then scaled to the plane

  // Fixed slots for achievement trees, one per policy rule (achievement.slot). (u, w) are
  // screen-aligned at rest: u across, w toward the viewer. All clear of the
  // centre line, so no tree hides the journey tree's canopy or sits behind it.
  const SLOTS = [[-3.8, -0.9], [3.9, -1.1], [-5.2, 0.6], [5, 0.8], [-2.8, -3.9], [2.9, -3.9], [-3, 3.2], [3.2, 3.4]]
    .map(([u, w]) => ({ x: (u + w) / Math.SQRT2, z: (w - u) / Math.SQRT2 }));

  /* ------------------------------------------------------------- meshes */

  // A part is a convex shape: polygons in tree-local space with outward normals.
  function part(polys, centre, color, foliage = false) {
    return {
      centre, color, foliage,
      faces: polys.map(pts => {
        let n = norm(cross(sub(pts[1], pts[0]), sub(pts[2], pts[0])));
        if (dot(n, sub(centroid(pts), centre)) < 0) n = n.map(value => -value);
        return { pts, n, mid: centroid(pts) };
      })
    };
  }

  function ring(radius, y, sides, random) {
    const turn = random() * Math.PI * 2;
    return Array.from({ length: sides }, (_, index) => {
      const angle = turn + index / sides * Math.PI * 2;
      const r = radius * (0.94 + random() * 0.12);
      return [Math.cos(angle) * r, y, Math.sin(angle) * r];
    });
  }

  function prism(radius, y0, y1, random) {
    const bottom = ring(radius, y0, 6, random);
    const top = bottom.map(([x, , z]) => [x * 0.7, y1, z * 0.7]);
    return part(bottom.map((p, index) => [p, bottom[(index + 1) % 6], top[(index + 1) % 6], top[index]]), [0, (y0 + y1) / 2, 0], P.bark);
  }

  function cone(radius, y0, apex, random, color) {
    const base = ring(radius, y0, 7, random);
    const tip = [0, apex, 0];
    return part(base.map((p, index) => [tip, p, base[(index + 1) % base.length]]), [0, y0 + (apex - y0) * 0.3, 0], color, true);
  }

  // A once-subdivided icosahedron: 80 faces, enough to read as a faceted crown.
  const ICO = (() => {
    const p = (1 + Math.sqrt(5)) / 2;
    const verts = [[-1, p, 0], [1, p, 0], [-1, -p, 0], [1, -p, 0], [0, -1, p], [0, 1, p], [0, -1, -p], [0, 1, -p], [p, 0, -1], [p, 0, 1], [-p, 0, -1], [-p, 0, 1]].map(norm);
    const base = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
      [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    const cache = new Map();
    const mid = (a, b) => {
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (!cache.has(key)) { verts.push(norm(verts[a].map((value, index) => (value + verts[b][index]) / 2))); cache.set(key, verts.length - 1); }
      return cache.get(key);
    };
    const faces = base.flatMap(([a, b, c]) => { const ab = mid(a, b); const bc = mid(b, c); const ca = mid(c, a); return [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]]; });
    return { verts, faces };
  })();

  function crown(radius, centre, random, color) {
    const verts = ICO.verts.map(v => {
      const r = radius * (0.93 + random() * 0.14);
      return [centre[0] + v[0] * r, centre[1] + v[1] * r * 0.9, centre[2] + v[2] * r];
    });
    return part(ICO.faces.map(face => face.map(index => verts[index])), centre, color, true);
  }

  /** A small achievement tree: a three-tier pine or a round-leaf tree. */
  function companion(kind, seed) {
    const random = rng(seed);
    const size = (0.92 + random() * 0.16) * TREE_SCALE * 0.92;
    const s = value => value * size;
    if (kind === 'pine') {
      return {
        size, reach: s(0.52), height: s(1.6),
        parts: [prism(s(0.06), 0, s(0.45), random),
          cone(s(0.52), s(0.26), s(1.0), random, P.pine), cone(s(0.4), s(0.62), s(1.32), random, P.pine), cone(s(0.28), s(0.95), s(1.6), random, P.pine)],
        sortParts: false
      };
    }
    const R = s(0.42);
    return {
      size, reach: R, height: s(0.44) + R * 1.6,
      parts: [prism(s(0.06), 0, s(0.44) + R * 0.4, random), crown(R, [0, s(0.44) + R * 0.62, 0], random, P.round)],
      sortParts: true
    };
  }

  /** The journey tree for a stage, a little fuller as the next stage nears. */
  const JOURNEY = [
    { trunk: 0.5, width: 0.045, crown: 0.3, blobs: 0 },   // seed: a small sapling
    { trunk: 0.72, width: 0.065, crown: 0.48, blobs: 0 },  // sprout
    { trunk: 0.95, width: 0.09, crown: 0.74, blobs: 1 },   // sapling
    { trunk: 1.2, width: 0.13, crown: 0.98, blobs: 3 },    // tree
    { trunk: 1.3, width: 0.15, crown: 1.08, blobs: 4 }     // blossom
  ];
  const BLOBS = [[-0.66, -0.24, 0.28, 0.62], [0.62, -0.18, -0.24, 0.6], [0.14, 0.26, -0.64, 0.58], [0.22, -0.32, 0.66, 0.52]];

  function journey(stage, fraction, seed = 41) {
    const spec = JOURNEY[stage];
    const g = (1 + 0.14 * fraction) * TREE_SCALE * 0.94;
    const random = rng(seed);
    const R = spec.crown * g;
    const trunk = spec.trunk * g;
    const centre = [0, trunk + R * 0.6, 0];
    const parts = [prism(spec.width * g, 0, trunk + R * 0.3, random), crown(R, centre, random, P.crown)];
    BLOBS.slice(0, spec.blobs).forEach(([dx, dy, dz, rr]) => {
      parts.push(crown(R * rr, [dx * R, centre[1] + dy * R, dz * R], random, P.crown));
    });
    if (stage === 4) {
      // Blossom: small cream and blush petals set into the upper facets of the canopy.
      const pick = rng(7);
      parts.slice(1).forEach(item => item.faces.forEach(face => {
        if (face.n[1] > -0.1 && pick() < 0.2) face.bloom = P.bloom[pick() < 0.6 ? 0 : 1];
      }));
    }
    return { reach: R * 1.5, height: centre[1] + R, parts, sortParts: true };
  }

  /* -------------------------------------------------------------- camera */

  let W = 0;
  let H = 0;
  let dpr = 1;
  let k = 1;                   // world units → CSS pixels
  let ox = 0;
  let oy = 0;
  const ctx = canvas.getContext('2d');
  let cam = null;

  function setCamera(az) {
    const t = [Math.sin(az) * Math.cos(EL), Math.sin(EL), Math.cos(az) * Math.cos(EL)];
    const right = [Math.cos(az), 0, -Math.sin(az)];
    cam = { t, right, up: cross(t, right) };
  }

  const project = p => ({ x: ox + dot(p, cam.right) * k, y: oy - dot(p, cam.up) * k });

  /** Fit the plane plus the tallest slot trees into the canvas, below the replay button. */
  function fit() {
    k = 1; ox = 0; oy = 0;
    setCamera(REST_AZ);
    const bottom = -(LIP + SOIL);
    const points = [];
    [-HALF, HALF].forEach(x => [-HALF, HALF].forEach(z => points.push([x, 0, z], [x, bottom, z])));
    SLOTS.forEach(slot => points.push([slot.x, 1.7 * TREE_SCALE, slot.z]));
    points.push([0, 3.2 * TREE_SCALE, 0]);
    const xs = points.map(p => project(p).x);
    const ys = points.map(p => project(p).y);
    const minX = Math.min(...xs); const maxX = Math.max(...xs);
    const minY = Math.min(...ys); const maxY = Math.max(...ys);
    const padX = W < 640 ? 16 : 40;
    const padTop = W < 640 ? 56 : 64;
    const padBottom = 32;
    k = Math.min((W - padX * 2) / (maxX - minX), (H - padTop - padBottom) / (maxY - minY));
    ox = W / 2 - (minX + maxX) / 2 * k;
    oy = padTop + ((H - padTop - padBottom) - (maxY - minY) * k) / 2 - minY * k;
  }

  /* ------------------------------------------------------------ drawing */

  function poly(points, fill, seam = false) {
    ctx.beginPath();
    points.forEach((p, index) => (index ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (seam) { ctx.strokeStyle = fill; ctx.lineWidth = 0.6; ctx.lineJoin = 'round'; ctx.stroke(); }
  }

  /** Flat shading from the one light; downward faces a touch darker. */
  const lit = (color, n) => rgb(shade(color, dot(n, LIGHT) * 0.26 - 0.1 + n[1] * 0.05));

  function drawGround(appear) {
    if (appear <= 0) return;
    const drop = (1 - easeOut(appear)) * 0.8;
    const at = (x, y, z) => project([x, y - drop, z]);
    const bottom = -(LIP + SOIL);
    ctx.save();
    ctx.globalAlpha = appear;
    // The soft shadow the slab casts on the card.
    ctx.save();
    ctx.shadowColor = rgb(C.ink, 0.13);
    ctx.shadowBlur = 44 * dpr;
    ctx.shadowOffsetY = 18 * dpr;
    poly([at(-HALF, bottom, -HALF), at(HALF, bottom, -HALF), at(HALF, bottom, HALF), at(-HALF, bottom, HALF)], rgb(P.soil));
    ctx.restore();
    // The visible sides: a thin grass edge over a flat, smooth soil band.
    const sides = [
      { n: [1, 0, 0], a: [HALF, -HALF], b: [HALF, HALF] }, { n: [0, 0, 1], a: [HALF, HALF], b: [-HALF, HALF] },
      { n: [-1, 0, 0], a: [-HALF, HALF], b: [-HALF, -HALF] }, { n: [0, 0, -1], a: [-HALF, -HALF], b: [HALF, -HALF] }
    ].filter(side => dot(side.n, cam.t) > 0);
    sides.forEach(({ n, a, b }) => {
      const light = dot(n, LIGHT);
      poly([at(a[0], -LIP, a[1]), at(b[0], -LIP, b[1]), at(b[0], bottom, b[1]), at(a[0], bottom, a[1])], rgb(shade(P.soil, light * 0.2 - 0.04)), true);
      poly([at(a[0], 0, a[1]), at(b[0], 0, b[1]), at(b[0], -LIP, b[1]), at(a[0], -LIP, a[1])], rgb(shade(P.grass, light * 0.2 - 0.1)), true);
    });
    // The top: one sage plane with a gentle wash of light across it.
    const top = [at(-HALF, 0, -HALF), at(HALF, 0, -HALF), at(HALF, 0, HALF), at(-HALF, 0, HALF)];
    const far = at(-HALF, 0, HALF); const near = at(HALF, 0, -HALF);
    const wash = ctx.createLinearGradient(far.x, far.y, near.x, near.y);
    wash.addColorStop(0, rgb(shade(P.grass, 0.1)));
    wash.addColorStop(1, rgb(shade(P.grass, -0.03)));
    poly(top, wash);
    // A crisp lit edge where the top meets the visible sides.
    ctx.strokeStyle = rgb(C.white, 0.45);
    ctx.lineWidth = 1;
    sides.forEach(({ a, b }) => {
      const p = at(a[0], 0, a[1]); const q = at(b[0], 0, b[1]);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
    });
    ctx.restore();
  }

  /** A soft ellipse lying on the ground: a circle drawn in the ground plane's own space. */
  function groundBlob(x, z, radius, alpha) {
    if (radius <= 0 || alpha <= 0) return;
    const o = project([x, 0.002, z]);
    const ex = [cam.right[0] * k, -cam.up[0] * k];
    const ez = [cam.right[2] * k, -cam.up[2] * k];
    ctx.save();
    ctx.transform(ex[0], ex[1], ez[0], ez[1], o.x, o.y);
    const fill = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    fill.addColorStop(0, rgb(C.ink, alpha));
    fill.addColorStop(0.5, rgb(C.ink, alpha * 0.55));
    fill.addColorStop(1, rgb(C.ink, 0));
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  /** Contact shadows: a tight core at the trunk and the canopy's shadow, cast away from the light. */
  function treeShadow(tree, grow) {
    if (grow <= 0) return;
    const g = Math.min(grow, 1);
    const reach = tree.model.reach * g;
    const cast = tree.model.height * g * 0.32;
    groundBlob(tree.x - LIGHT[0] / LIGHT[1] * cast, tree.z - LIGHT[2] / LIGHT[1] * cast, reach * 1.25, 0.12);
    groundBlob(tree.x, tree.z, Math.max(0.22, reach * 0.55), 0.2);
  }

  function drawTree(tree, grow) {
    if (grow <= 0.001) return;
    const lift = reduced.matches ? 0 : tree.hover * 0.14;
    const [first, ...rest] = tree.model.parts;
    const parts = tree.model.sortParts ? [first, ...rest.sort((a, b) => dot(a.centre, cam.t) - dot(b.centre, cam.t))] : tree.model.parts;
    parts.forEach(item => {
      let base = item.color;
            base = shade(base, tree.hover * 0.08);
      item.faces
        .filter(face => dot(face.n, cam.t) > 0)
        .map(face => ({ face, depth: dot(face.mid, cam.t) }))
        .sort((a, b) => a.depth - b.depth)
        .forEach(({ face }) => {
          const pts = face.pts.map(p => project([tree.x + p[0] * grow, lift + p[1] * grow, tree.z + p[2] * grow]));
          poly(pts, lit(base, face.n), true);
          if (face.bloom && tree.grow > 0.85) {
            const c = pts.reduce((sum, p) => ({ x: sum.x + p.x / 3, y: sum.y + p.y / 3 }), { x: 0, y: 0 });
            poly(pts.map(p => ({ x: c.x + (p.x - c.x) * 0.42, y: c.y + (p.y - c.y) * 0.42 })), lit(face.bloom, face.n));
          }
        });
    });
  }

  /* -------------------------------------------------------------- frame */

  let state = { stage: 0, fraction: 0, vitality: 1 };
  let trees = [];
  let entranceStart = null;
  let entranceEnd = 0;
  let lastNow = 0;
  let active = null;

  function render(now) {
    const t = entranceStart === null ? Infinity : (now - entranceStart) / 1000;
    const dt = lastNow ? Math.min(0.05, (now - lastNow) / 1000) : 0.016;
    lastNow = now;
    setCamera(START_AZ + (REST_AZ - START_AZ) * ease(phase(t, 0, 2.4)));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    drawGround(phase(t, 0, 0.9));

    let settling = false;
    trees.forEach(tree => {
      const target = tree === active ? 1 : 0;
      tree.hover = reduced.matches ? target : tree.hover + (target - tree.hover) * (1 - Math.exp(-dt * 16));
      if (Math.abs(tree.hover - target) > 0.004) settling = true; else tree.hover = target;
      tree.grow = easeBack(phase(t, tree.delay, tree.kind ? 0.6 : 1.1));
    });
    trees.forEach(tree => treeShadow(tree, tree.grow));
    trees.slice().sort((a, b) => (a.x * cam.t[0] + a.z * cam.t[2]) - (b.x * cam.t[0] + b.z * cam.t[2])).forEach(tree => drawTree(tree, tree.grow));
    if (t >= entranceEnd) showHits();
    return t < entranceEnd || settling;
  }

  let frame = 0;
  function tick(now) {
    frame = 0;
    if (render(now)) frame = requestAnimationFrame(tick);
    else lastNow = 0;
  }
  const draw = () => { if (!frame) frame = requestAnimationFrame(tick); };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    fit();
    layoutHits();
    if (active) placeTip();
    draw();
  }

  function playEntrance() {
    closeTip();
    if (reduced.matches) { entranceStart = null; draw(); return; }
    hits.hidden = true;
    entranceStart = performance.now();
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* replays next visit */ }
    draw();
  }

  /* ------------------------------------------------- tree buttons + tooltip */

  const hits = $('garden-trees');
  const tip = $('garden-tip');
  const scene = canvas.parentElement;
  let pinned = false;
  let closeTimer = 0;

  function showHits() { if (hits.hidden) hits.hidden = false; }

  /** Each button covers its tree's resting silhouette (at least 44px square). */
  function layoutHits() {
    setCamera(REST_AZ);
    trees.forEach(tree => {
      const pts = tree.model.parts.flatMap(item => item.faces.flatMap(face => face.pts)).map(p => project([tree.x + p[0], p[1], tree.z + p[2]]));
      const xs = pts.map(p => p.x); const ys = pts.map(p => p.y);
      let left = Math.min(...xs); let right = Math.max(...xs); let top = Math.min(...ys); let bottom = Math.max(...ys);
      const grow = (min, a, b) => { const extra = Math.max(0, min - (b - a)) / 2; return [a - extra, b + extra]; };
      [left, right] = grow(44, left, right);
      [top, bottom] = grow(44, top, bottom);
      tree.box = { left, right, top, bottom };
      tree.button.style.zIndex = String(Math.round(10 + (tree.x * cam.t[0] + tree.z * cam.t[2]) * 2)); // nearer trees on top
      Object.assign(tree.button.style, { left: `${left}px`, top: `${top}px`, width: `${right - left}px`, height: `${bottom - top}px` });
    });
  }

  function placeTip() {
    const box = active.box;
    const width = tip.offsetWidth; const height = tip.offsetHeight;
    const centre = (box.left + box.right) / 2;
    const middle = (box.top + box.bottom) / 2;
    // Above the tree if it fits, else beside it, else below — never over it.
    let side = 'above';
    if (box.top - height - 12 < 8) {
      if (box.right + width + 12 <= W - 8) side = 'right';
      else if (box.left - width - 12 >= 8) side = 'left';
      else side = 'below';
    }
    let x; let y;
    if (side === 'above' || side === 'below') {
      x = clamp(centre - width / 2, 8, W - width - 8);
      y = side === 'above' ? box.top - height - 12 : box.bottom + 12;
      tip.style.setProperty('--arrow', `${clamp(centre - x, 16, width - 16)}px`);
    } else {
      x = side === 'right' ? box.right + 12 : box.left - width - 12;
      y = clamp(middle - height / 2, 8, H - height - 8);
      tip.style.setProperty('--arrow', `${clamp(middle - y, 16, height - 16)}px`);
    }
    tip.dataset.side = side;
    tip.style.left = `${x}px`;
    tip.style.top = `${y}px`;
  }

  function openTip(tree, pin = false) {
    clearTimeout(closeTimer);
    if (active !== tree) pinned = false;
    active = tree;
    pinned = pinned || pin;
    tip.innerHTML = tree.tip;
    tip.hidden = false;
    placeTip();
    draw();
  }

  function closeTip() {
    clearTimeout(closeTimer);
    if (!active) return;
    active = null;
    pinned = false;
    tip.hidden = true;
    draw();
  }

  /** Hover-out waits a moment, so the pointer can move onto the tooltip itself. */
  function scheduleClose() {
    clearTimeout(closeTimer);
    if (pinned || (active && document.activeElement === active.button)) return;
    closeTimer = setTimeout(closeTip, 160);
  }

  function bindTree(tree) {
    const button = tree.button;
    button.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') openTip(tree); });
    button.addEventListener('pointerleave', event => { if (event.pointerType !== 'touch') scheduleClose(); });
    button.addEventListener('focus', () => openTip(tree));
    button.addEventListener('blur', event => {
      if (!hits.contains(event.relatedTarget)) pinned = false; // focus left the garden: don't strand a pinned tip
      if (!pinned) scheduleClose();
    });
    // Tap or Enter pins the tooltip open; a second tap closes it.
    button.addEventListener('click', () => { if (active === tree && pinned) closeTip(); else openTip(tree, true); });
  }

  tip.addEventListener('pointerenter', () => clearTimeout(closeTimer));
  tip.addEventListener('pointerleave', scheduleClose);
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && active) closeTip(); });
  document.addEventListener('pointerdown', event => {
    if (active && !hits.contains(event.target) && !tip.contains(event.target)) closeTip();
  });

  /* -------------------------------------------------------------- page */

  /**
   * Personal Garden contract (master §9.1–9.2, D06–D11): exactly four small
   * practice-type trees in fixed places, no central fifth tree; a bounded
   * flower (Offline Routine), rabbit (confirmed session attendance) and
   * birdhouse (verified camp completion). Each source counts once; no-data is
   * neutral and nothing wilts. Thresholds are configurable demo defaults.
   */
  const TREE_SPOTS = { depth: [-3.1, -2.1], listening: [3.1, -2.1], practical: [-3.1, 2.3], 'protected-work': [3.1, 2.3] };
  const SPECIES = { depth: { crown: P.pine, seed: 11, label: 'a deep green pine-like crown' }, listening: { crown: P.round, seed: 23, label: 'a round, soft crown' }, practical: { crown: P.crown, seed: 37, label: 'a bright, branching crown' }, 'protected-work': { crown: mix(P.crown, C.gold, 0.18), seed: 53, label: 'a warm, dense crown' } };
  let TREE_STEPS = [1, 3, 7, 12];                // overwritten from the journal's shared policy
  let STAGE_NAMES = ['Not started', 'Sprout', 'Sapling', 'Young tree', 'Full tree'];
  let FLOWER_AT = [3, 10, 21];                   // routine days → up to three flowers
  let MAX_RABBITS = 3;
  const DECOR_SPOTS = { flower: [[-1.2, 4.3], [0, 4.6], [1.2, 4.3]], rabbit: [[-0.7, 0.4], [0.9, 0.9], [0.1, -0.6]], birdhouse: [[0, -4.2]] };
  const at = ([u, w]) => ({ x: (u + w) / Math.SQRT2, z: (w - u) / Math.SQRT2 });
  const moved = (item, d) => ({ ...item, centre: item.centre.map((v, i) => v + d[i]), faces: item.faces.map(f => ({ ...f, pts: f.pts.map(p => p.map((v, i) => v + d[i])), mid: f.mid.map((v, i) => v + d[i]) })) });
  const tinted = (item, color) => ({ ...item, color });
  function box(w, h, d, y0, color) {
    const x = w / 2, z = d / 2, y1 = y0 + h;
    const v = [[-x, y0, -z], [x, y0, -z], [x, y0, z], [-x, y0, z], [-x, y1, -z], [x, y1, -z], [x, y1, z], [-x, y1, z]];
    return part([[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]].map(f => f.map(i => v[i])), [0, y0 + h / 2, 0], color);
  }
  function practiceTree(type, stage, fraction) {
    const spec = SPECIES[type];
    const model = journey(Math.max(0, stage), fraction, spec.seed);
    const scale = stage === 0 ? 0.32 : 0.5 + stage * 0.035;
    const parts = model.parts.map((item, index) => ({ ...(index ? tinted(item, stage === 0 ? mix(spec.crown, C.muted, 0.5) : spec.crown) : item), faces: item.faces.map(f => ({ ...f, pts: f.pts.map(p => p.map(v => v * scale)), mid: f.mid.map(v => v * scale) })), centre: item.centre.map(v => v * scale) }));
    return { reach: model.reach * scale, height: model.height * scale, parts, sortParts: true };
  }
  function flower(seed) {
    const random = rng(seed);
    const petals = P.bloom[seed % 2];
    return { reach: 0.3, height: 0.6, sortParts: true, parts: [tinted(prism(0.03, 0, 0.42, random), mix(P.round, C.ink, 0.1)), crown(0.09, [0.12, 0.2, 0], random, P.round), crown(0.13, [0, 0.5, 0], random, petals)] };
  }
  function rabbit(seed) {
    const random = rng(seed);
    const fur = mix(C.white, C.muted, 0.14);
    return { reach: 0.34, height: 0.62, sortParts: true, parts: [crown(0.2, [0, 0.19, 0], random, fur), crown(0.13, [0.2, 0.36, 0.02], random, fur), moved(cone(0.04, 0, 0.24, random, fur), [0.17, 0.44, -0.04]), moved(cone(0.04, 0, 0.24, random, fur), [0.25, 0.44, 0.06]), crown(0.06, [-0.2, 0.2, 0], random, C.white)] };
  }
  function birdhouse(seed) {
    const random = rng(seed);
    return { reach: 0.4, height: 1.25, sortParts: false, parts: [prism(0.05, 0, 0.8, random), box(0.42, 0.34, 0.36, 0.78, mix(P.soil, C.white, 0.25)), moved(cone(0.36, 0, 0.26, random, mix(P.bark, C.ink, 0.1)), [0, 1.12, 0])] };
  }
  const scaled = (model, f) => ({ ...model, reach: model.reach * f, height: model.height * f, parts: model.parts.map(item => ({ ...item, centre: item.centre.map(v => v * f), faces: item.faces.map(face => ({ ...face, pts: face.pts.map(p => p.map(v => v * f)), mid: face.mid.map(v => v * f) })) })) });
  const stageOf = n => TREE_STEPS.filter(step => n >= step).length;
  const ICONS = {
    tree: '<path d="M12 21v-7m0 0c-4 0-6-2.5-6-5.5S8.5 3 12 3s6 2.5 6 5.5-2 5.5-6 5.5Z"/>',
    flower: '<circle cx="12" cy="8" r="3"/><path d="M12 11v10m0-4c-2-2-4-2-5-1m5-1c2-2 4-2 5-1"/>',
    rabbit: '<path d="M8 21c-2 0-3-2-3-4 0-3 3-5 7-5s6 2 6 4-1 3-3 3M14 12l1-8m-3 8-1-7"/>',
    birdhouse: '<path d="M5 10 12 4l7 6v8H5Zm7 11v-3"/><circle cx="12" cy="13" r="2"/>'
  };
  // The practice icons Activities uses (32-unit grid), so a category reads the same on both pages.
  const KIND_ICONS = {
    depth: '<path d="M16 7c-4-3-9-3-13-2v19c5-1 10 0 13 3 3-3 8-4 13-3V5c-4-1-9-1-13 2Zm0 0v20"/>',
    listening: '<path d="M5 18v-3a11 11 0 0 1 22 0v3M5 17h4a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-9Zm22 0h-4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-9Z"/>',
    practical: '<path d="m6 25 2-7L23 3l6 6-15 15-8 1Zm12-17 6 6M6 25l7-2"/>',
    'protected-work': '<circle cx="16" cy="18" r="11"/><path d="M16 7V3m-5 0h10m-5 15 4-5m7-4 2-2"/>'
  };
  const kindIcon = kind => (KIND_ICONS[kind] ? `<svg viewBox="0 0 32 32">${KIND_ICONS[kind]}</svg>` : `<svg viewBox="0 0 24 24">${ICONS[kind] || ICONS.tree}</svg>`);

  Account.load().then(account => {
    const repo = window.DeepSproutRepo;
    const me = repo?.me();
    const shared = me && repo && repo.selectors.hasPersonalGarden(repo.read(), me.id) ? repo.selectors.personalGardenEffects(repo.read(), me.id) : [];  // Invited Students: Group Garden only until upgrade (D12).
    const journal = account.practiceGarden();
    ({ treeSteps: TREE_STEPS, stageNames: STAGE_NAMES, flowerAt: FLOWER_AT, maxRabbits: MAX_RABBITS } = journal.policy);
    const sourcesFor = type => [...journal.types.find(t => t.id === type)?.sources || [], ...shared.filter(e => e.effect === 'tree' && e.type === type).map(e => ({ key: e.key, on: e.on, title: e.title, detail: e.detail, source: 'Coach-approved task' }))];
    const typeTitle = { depth: 'Depth Practice', listening: 'Listening & Recall', practical: 'Practical Micro-Challenge', 'protected-work': 'Protected Work' };
    state = { stage: 0, fraction: 0, vitality: 1 };
    const practice = Object.keys(TREE_SPOTS).map((type, index) => {
      const sources = sourcesFor(type), n = sources.length, stage = stageOf(n), next = TREE_STEPS[stage];
      const fraction = next ? (n - (TREE_STEPS[stage - 1] || 0)) / (next - (TREE_STEPS[stage - 1] || 0)) : 0;
      const nextLine = next ? `${next - n} more qualifying ${next - n === 1 ? 'record' : 'records'} to ${STAGE_NAMES[stage + 1].toLowerCase()}` : 'Fully grown — it simply stays';
      return { type, title: typeTitle[type], sources, stage, ...at(TREE_SPOTS[type]), model: practiceTree(type, stage, fraction), delay: 0.7 + index * 0.18,
        label: `${typeTitle[type]} tree: ${STAGE_NAMES[stage]}, from ${n} qualifying ${n === 1 ? 'record' : 'records'}. ${nextLine}.`,
        tip: `<p class="garden-tip-eyebrow">${esc(typeTitle[type])}</p><p class="garden-tip-title">${esc(STAGE_NAMES[stage])}</p><p>${n ? `${n} qualifying ${n === 1 ? 'record' : 'records'} · ${esc(SPECIES[type].label)}` : 'No practice recorded yet. Nothing has been earned here.'}</p><p class="garden-tip-meta">${esc(nextLine)}</p>` };
    });
    const flowers = FLOWER_AT.filter(need => journal.routineDays.length >= need).map((need, index) => ({ kind: 'flower', ...at(DECOR_SPOTS.flower[index]), model: scaled(flower(index + 3), 1.9), delay: 1.6 + index * 0.12,
      label: `Flower: unlocked by ${need} self-reported Offline Routine days.`, tip: `<p class="garden-tip-eyebrow">Offline Routine</p><p class="garden-tip-title">Flower</p><p>Unlocked at ${need} routine days (self-reported).</p>` }));
    const attended = shared.filter(e => e.effect === 'rabbit');
    const rabbits = attended.slice(0, MAX_RABBITS).map((e, index) => ({ kind: 'rabbit', ...at(DECOR_SPOTS.rabbit[index]), model: scaled(rabbit(index + 5), 1.7), delay: 1.8 + index * 0.12,
      label: `Rabbit: ${e.title}, ${e.detail}.`, tip: `<p class="garden-tip-eyebrow">Session attendance</p><p class="garden-tip-title">${esc(e.title)}</p><p>${esc(e.detail)}</p><p class="garden-tip-meta">${esc(fmt.date(e.on, { year: true }))}</p>` }));
    const camps = shared.filter(e => e.effect === 'birdhouse');
    const houses = camps.slice(0, 1).map(e => ({ kind: 'birdhouse', ...at(DECOR_SPOTS.birdhouse[0]), model: scaled(birdhouse(9), 1.4), delay: 2,
      label: `Birdhouse: ${e.title}, ${e.detail}.`, tip: `<p class="garden-tip-eyebrow">Camp completion</p><p class="garden-tip-title">${esc(e.title)}</p><p>${esc(e.detail)}</p>` }));
    trees = [...practice, ...flowers, ...rabbits, ...houses];
    entranceEnd = Math.max(...trees.map(t => t.delay)) + 1;
    trees.forEach(tree => {
      tree.hover = 0;
      tree.button = Object.assign(document.createElement('button'), { type: 'button', className: 'garden-hit' });
      tree.button.setAttribute('aria-label', tree.label);
      hits.append(tree.button);
      bindTree(tree);
    });
    const grown = practice.filter(t => t.stage > 0).length;
    canvas.setAttribute('aria-label', `Four practice trees: ${practice.map(t => `${t.title} ${STAGE_NAMES[t.stage].toLowerCase()}`).join(', ')}. ${flowers.length} flower${flowers.length === 1 ? '' : 's'}, ${rabbits.length} rabbit${rabbits.length === 1 ? '' : 's'}${houses.length ? ', a birdhouse' : ''}.`);
    $('garden-subtitle').textContent = 'Four small trees, one for each kind of practice. They grow only from records — and nothing wilts while you rest.';
    $('garden-hint').textContent = grown ? 'Hover, tap or tab to a tree or decoration to see exactly what grew it.' : 'All four places are ready. A valid practice — or a Coach-approved task — starts the matching tree.';

    // One summary card per practice type. The space between name and stage keeps "Protected Work Sprout (2)" readable as text.
    const next = $('garden-next');
    next.innerHTML = `<ul class="garden-kinds-list">${practice.map(t => `<li class="garden-kind" data-kind="${esc(t.type)}"><span class="garden-kind-icon" aria-hidden="true">${kindIcon(t.type)}</span><span class="garden-kind-text"><b>${esc(t.title)}</b> <span>${esc(STAGE_NAMES[t.stage])} (${t.sources.length})</span></span></li>`).join('')}</ul>`;

    const card = $('garden-achievement');
    const catalogTitle = type => journal.types.find(t => t.id === type)?.title;
    const recent = [...practice.flatMap(t => t.sources.map(x => ({ ...x, kind: t.type, what: t.title, named: x.title !== catalogTitle(t.type) && x.title !== t.title }))), ...attended.map(e => ({ ...e, kind: 'rabbit', what: 'Rabbit', named: true, source: 'Supervisor-confirmed attendance' })), ...camps.map(e => ({ ...e, kind: 'birdhouse', what: 'Birdhouse', named: true, source: 'Provider-verified completion' }))]
      .sort((a, b) => String(b.on).localeCompare(String(a.on))).slice(0, 5);
    // The meta line keeps the record's own outcome and source; a generic catalog title is not repeated.
    const metaOf = x => [x.named ? x.title : '', x.detail, x.source].filter((part, index, all) => part && all.indexOf(part) === index).map(esc).join(' · ');
    const groupLinks = repo && me ? repo.selectors.myInitiatives(repo.read(), me.id).filter(m => ['Accepted', 'Completed', 'Suspended'].includes(m.admission.status)) : [];
    const routineCount = journal.routineDays.length;
    card.innerHTML = `<header class="garden-achievement-head">
        <p class="garden-achievement-eyebrow">Recently grown</p>
        <h2 id="achievement-title">Your latest growth</h2>
        <p>${recent.length ? 'See the activities that helped your garden grow.' : 'Nothing has grown yet. Each qualifying activity will appear here with its date and source.'}</p>
      </header>
      ${recent.length ? `<ul class="garden-recent">${recent.map(x => `<li class="garden-recent-item" data-kind="${esc(x.kind)}">
        <span class="garden-recent-icon" aria-hidden="true">${kindIcon(x.kind)}</span>
        <span class="garden-recent-text"><b>${esc(x.what)}</b><span>${metaOf(x)}</span></span>
        <time datetime="${esc(x.on)}">${esc(fmt.date(x.on, { year: true }))}</time>
      </li>`).join('')}</ul>` : ''}
      <footer class="garden-achievement-foot">
        ${groupLinks.length ? `<p class="garden-groups">Group Gardens are shared and separate: ${groupLinks.map(m => `<a href="#group-${esc(m.initiative.id)}" data-group-garden="${esc(m.initiative.id)}">${esc(m.initiative.title)}</a>`).join(', ')}</p><div id="group-garden-panel"></div>` : ''}
        <details class="garden-rules">
          <summary><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>How flowers, rabbits and birdhouses appear</summary>
          <ul>
            <li><b>Flower</b> — your Offline Routine, self-reported. ${routineCount} day${routineCount === 1 ? '' : 's'} recorded; flowers at ${FLOWER_AT.join(', ')} days.</li>
            <li><b>Rabbit</b> — Supervisor-confirmed session attendance, up to ${MAX_RABBITS}.</li>
            <li><b>Birdhouse</b> — a verified camp completion.</li>
          </ul>
          <p>Joining, registering, an accepted excuse or completing an initiative add nothing here. Thresholds are demo defaults.</p>
        </details>
      </footer>`;
    card.querySelectorAll('[data-group-garden]').forEach(link => link.addEventListener('click', event => {
      event.preventDefault();
      const g = repo.selectors.initiativeGarden(repo.read(), link.dataset.groupGarden);
      $('group-garden-panel').innerHTML = `<div class="garden-group-card"><p class="garden-achievement-eyebrow">Group Garden · ${esc(g.owner)}</p><h3>${esc(g.initiative.title)}</h3><p>Stage ${g.stage} of 5 · ${g.count} qualifying contributions from ${g.contributors} students across ${g.groups.length} group${g.groups.length === 1 ? '' : 's'}.${g.completedMilestone ? ' Initiative completed.' : ''}</p><p class="garden-tip-meta">${g.next ? `Next collective milestone “${esc(g.next.title)}” at ${g.next.at}.` : 'Every collective milestone reached.'} It is shared by everyone in the initiative and never mixes with your Personal Garden.</p></div>`;
    }));

    const seen = (() => { try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return false; } })();
    const replay = $('garden-replay');
    replay.hidden = reduced.matches;
    replay.addEventListener('click', playEntrance);
    resize();
    if (!seen && !reduced.matches) playEntrance();

    let resizeTimer = 0;
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 120); });
    reduced.addEventListener?.('change', () => { replay.hidden = reduced.matches; entranceStart = null; draw(); });
  }).catch(error => {
    console.error(error);
    $('garden-next').setAttribute('role', 'alert');
    $('garden-next').textContent = 'Your garden couldn’t be loaded.';
  });
})();
