/**
 * Garden artwork, drawn as SVG strings: isometric grass tiles and the five
 * growth stages of a tree (seed, sprout, sapling, tree, blossom), plus the
 * unlockable extras. Shared by the Garden page and the Home garden card.
 *
 * Geometry: a tile is a 2:1 diamond, TILE_W wide, with a soil block below it.
 * (cx, cy) is the centre of the diamond's top face.
 */
(() => {
  const TILE_W = 200;
  const TILE_H = 100;
  const DEPTH = 38;

  /** Small deterministic random, so a plot always looks the same. */
  const rng = seed => () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  /** A point inside the top diamond, kept away from the edges. */
  const insideDiamond = (random, cx, cy, margin = .78) => {
    const u = (random() - .5) * margin;
    const v = (random() - .5) * margin;
    return [cx + (u - v) * TILE_W / 2, cy + (u + v) * TILE_H / 2];
  };

  function tile(cx, cy, seed = 1) {
    const w = TILE_W / 2;
    const h = TILE_H / 2;
    const random = rng(seed * 7 + 3);
    const top = `${cx},${cy - h} ${cx + w},${cy} ${cx},${cy + h} ${cx - w},${cy}`;
    const left = `${cx - w},${cy} ${cx},${cy + h} ${cx},${cy + h + DEPTH} ${cx - w},${cy + DEPTH}`;
    const right = `${cx},${cy + h} ${cx + w},${cy} ${cx + w},${cy + DEPTH} ${cx},${cy + h + DEPTH}`;
    // The grass lip hangs over the soil with a soft scalloped edge.
    const lip = (x1, y1, x2, y2) => {
      let d = `M${x1},${y1} L${x2},${y2}`;
      const steps = 7;
      for (let i = steps; i >= 0; i -= 1) {
        const t = i / steps;
        const x = x1 + (x2 - x1) * t;
        const y = y1 + (y2 - y1) * t + 9 + (i % 2 ? 4 : 0);
        d += ` L${x.toFixed(1)},${y.toFixed(1)}`;
      }
      return `${d} Z`;
    };
    let specks = '';
    for (let i = 0; i < 9; i += 1) {
      const side = random() > .5;
      const t = random();
      const x = side ? cx + w * t : cx - w * t;
      const y = (side ? cy + h - h * t : cy + h - h * t) + 18 + random() * (DEPTH - 22);
      specks += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(2 + random() * 3).toFixed(1)}" ry="${(1.4 + random() * 1.4).toFixed(1)}" fill="#6b3f22" opacity=".35"/>`;
    }
    let tufts = '';
    for (let i = 0; i < 16; i += 1) {
      const [x, y] = insideDiamond(random, cx, cy, .9);
      const s = 3 + random() * 3;
      tufts += `<path d="M${(x - s).toFixed(1)},${y.toFixed(1)} l${(s * .6).toFixed(1)},-${(s * 1.2).toFixed(1)} l${(s * .4).toFixed(1)},${(s * 1.2).toFixed(1)} l${(s * .5).toFixed(1)},-${(s * 1.4).toFixed(1)} l${(s * .5).toFixed(1)},${(s * 1.4).toFixed(1)}" fill="none" stroke="#4f9a2f" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>`;
    }
    return `<g class="g-tile">
      <ellipse cx="${cx}" cy="${cy + h + DEPTH - 4}" rx="${w * 1.02}" ry="${h * .55}" fill="#20402a" opacity=".1" filter="url(#g-soft)"/>
      <polygon points="${left}" fill="url(#g-soil-left)"/>
      <polygon points="${right}" fill="url(#g-soil-right)"/>
      ${specks}
      <path d="${lip(cx - w, cy, cx, cy + h)}" fill="#5aa832"/>
      <path d="${lip(cx, cy + h, cx + w, cy)}" fill="#4c9a2a"/>
      <polygon points="${top}" fill="url(#g-grass)"/>
      <polygon points="${top}" fill="none" stroke="#ffffff" stroke-opacity=".35" stroke-width="2"/>
      ${tufts}
    </g>`;
  }

  /** Dashed outline for a week that has not started yet. */
  function ghostTile(cx, cy, label) {
    const w = TILE_W / 2;
    const h = TILE_H / 2;
    return `<g class="g-ghost"><polygon points="${cx},${cy - h} ${cx + w},${cy} ${cx},${cy + h} ${cx - w},${cy}" fill="#eef3e8" fill-opacity=".55" stroke="#b9cdb5" stroke-width="2" stroke-dasharray="7 7"/>
      <text x="${cx}" y="${cy + 5}" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="15" font-weight="700" fill="#8aa491">${label}</text></g>`;
  }

  const blossom = (x, y, r, random) => {
    const pinks = ['#f7a8c4', '#f48fb1', '#ee7aa3', '#fbc2d6'];
    let out = '';
    for (let i = 0; i < 4; i += 1) {
      const fx = x + (random() - .5) * r * 1.2;
      const fy = y + (random() - .5) * r * 1.1;
      out += `<circle cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="${(r * (.42 + random() * .14)).toFixed(1)}" fill="${pinks[i % pinks.length]}"/>`;
    }
    return out;
  };
  const petalFlower = (px, py, size, color = '#fff', centre = '#f6c445') => {
    const x = Number(px);
    const y = Number(py);
    let petals = '';
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2;
      petals += `<circle cx="${(x + Math.cos(a) * size).toFixed(1)}" cy="${(y + Math.sin(a) * size).toFixed(1)}" r="${(size * .78).toFixed(1)}" fill="${color}"/>`;
    }
    return `${petals}<circle cx="${x}" cy="${y}" r="${(size * .6).toFixed(1)}" fill="${centre}"/>`;
  };

  /** The plant for a growth stage, rooted at (x, y). */
  function plant(stage, x, y, seed = 1) {
    const random = rng(seed * 13 + 5);
    if (stage <= 0) {
      return `<g class="g-plant st-0"><ellipse cx="${x}" cy="${y + 2}" rx="20" ry="8" fill="#8a5530"/><ellipse cx="${x}" cy="${y}" rx="15" ry="5.5" fill="#a86b3d"/><ellipse cx="${x + 2}" cy="${y - 2}" rx="4" ry="3" fill="#d9a26a"/></g>`;
    }
    if (stage === 1) {
      return `<g class="g-plant st-1"><ellipse cx="${x}" cy="${y + 2}" rx="16" ry="6" fill="#8a5530" opacity=".8"/>
        <path d="M${x},${y} C${x - 1},${y - 14} ${x},${y - 22} ${x},${y - 28}" stroke="#3f8a35" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M${x},${y - 22} C${x - 20},${y - 22} ${x - 24},${y - 36} ${x - 22},${y - 42} C${x - 8},${y - 40} ${x - 2},${y - 32} ${x},${y - 22}Z" fill="#6cc04f"/>
        <path d="M${x},${y - 26} C${x + 16},${y - 28} ${x + 22},${y - 42} ${x + 20},${y - 48} C${x + 6},${y - 46} ${x},${y - 38} ${x},${y - 26}Z" fill="#4faa3e"/></g>`;
    }
    const trunk = (height, width) => `<path d="M${x - width},${y} C${x - width * .6},${y - height * .5} ${x - width * .3},${y - height * .8} ${x - 2},${y - height} L${x + 2},${y - height} C${x + width * .3},${y - height * .8} ${x + width * .6},${y - height * .5} ${x + width},${y} Z" fill="#7a4a2a"/>
      <path d="M${x - 1},${y - height * .55} L${x - width * 2.4},${y - height * .95}" stroke="#7a4a2a" stroke-width="${width * .8}" stroke-linecap="round"/>
      <path d="M${x + 1},${y - height * .65} L${x + width * 2.2},${y - height * 1.05}" stroke="#7a4a2a" stroke-width="${width * .7}" stroke-linecap="round"/>`;
    if (stage === 2) {
      return `<g class="g-plant st-2"><ellipse cx="${x}" cy="${y + 2}" rx="18" ry="6" fill="#20402a" opacity=".15"/>${trunk(40, 5)}
        <circle cx="${x - 12}" cy="${y - 48}" r="17" fill="#5aa847"/><circle cx="${x + 12}" cy="${y - 50}" r="16" fill="#4c9a3c"/><circle cx="${x}" cy="${y - 62}" r="19" fill="#7cc35a"/>
        <circle cx="${x - 5}" cy="${y - 68}" r="6" fill="#a7dd85" opacity=".7"/></g>`;
    }
    const canopy = (colours, scale) => {
      const blobs = [[-30, -62, 26], [30, -64, 25], [-16, -86, 28], [18, -88, 27], [0, -104, 26], [0, -70, 30]];
      return blobs.map(([dx, dy, r], i) => `<circle cx="${x + dx * scale}" cy="${y + dy * scale}" r="${r * scale}" fill="${colours[i % colours.length]}"/>`).join('');
    };
    if (stage === 3) {
      return `<g class="g-plant st-3"><ellipse cx="${x}" cy="${y + 3}" rx="30" ry="9" fill="#20402a" opacity=".15"/>${trunk(62, 7)}
        ${canopy(['#4c9a3c', '#5aa847', '#6bb84f', '#7cc35a', '#8fd06a', '#62b04a'], 1)}
        <circle cx="${x - 10}" cy="${y - 108}" r="9" fill="#b6e494" opacity=".55"/></g>`;
    }
    // Blossom: the full pink tree from the reference, with white flowers.
    let flowers = '';
    for (let i = 0; i < 9; i += 1) {
      const fx = x + (random() - .5) * 92;
      const fy = y - 62 - random() * 52;
      flowers += petalFlower(fx.toFixed(1), fy.toFixed(1), 3.4, '#fff', '#f9c74f');
    }
    let clusters = '';
    for (let i = 0; i < 14; i += 1) {
      const a = random() * Math.PI * 2;
      const d = random() * 40;
      clusters += blossom(x + Math.cos(a) * d * 1.3, y - 84 + Math.sin(a) * d * .9, 18, random);
    }
    return `<g class="g-plant st-4"><ellipse cx="${x}" cy="${y + 3}" rx="34" ry="10" fill="#20402a" opacity=".15"/>${trunk(64, 7.5)}
      ${canopy(['#ec6f9b', '#f48fb1', '#f7a8c4', '#ee7aa3', '#fbc2d6', '#f48fb1'], 1.05)}${clusters}${flowers}</g>`;
  }

  /** Little flowers scattered over a tile (the "New Flower" unlock). */
  function flowerBed(cx, cy, seed) {
    const random = rng(seed * 31 + 11);
    const colours = [['#ffffff', '#f6c445'], ['#ffd34f', '#e48a1f'], ['#c9a6f2', '#fff3b0'], ['#ff9cb8', '#fff']];
    let out = '';
    for (let i = 0; i < 6; i += 1) {
      const [x, y] = insideDiamond(random, cx, cy, .82);
      if (Math.abs(x - cx) < 34 && Math.abs(y - cy) < 18) continue;
      const [petal, centre] = colours[i % colours.length];
      out += `<g class="g-flower" style="--d:${(i * .12).toFixed(2)}s"><path d="M${x.toFixed(1)},${y.toFixed(1)} v-9" stroke="#3f8a35" stroke-width="1.6"/>${petalFlower(x.toFixed(1), (y - 10).toFixed(1), 2.6, petal, centre)}</g>`;
    }
    return out;
  }

  /** The golden bloom (the "Special Bloom" unlock). */
  function goldenBloom(x, y) {
    let petals = '';
    for (let i = 0; i < 8; i += 1) {
      petals += `<ellipse cx="${x}" cy="${y - 34}" rx="6" ry="13" fill="${i % 2 ? '#ffd166' : '#f6b73c'}" transform="rotate(${i * 45} ${x} ${y - 22})"/>`;
    }
    return `<g class="g-bloom"><path d="M${x},${y} C${x - 3},${y - 8} ${x + 2},${y - 14} ${x},${y - 20}" stroke="#3f8a35" stroke-width="3" fill="none"/>
      <path d="M${x},${y - 8} c-12,-2 -14,-10 -12,-14 c8,0 11,6 12,14Z" fill="#5aa847"/>
      <circle cx="${x}" cy="${y - 22}" r="24" fill="#ffe08a" opacity=".35" class="g-glow"/>${petals}<circle cx="${x}" cy="${y - 22}" r="7" fill="#e07a1f"/></g>`;
  }

  /** A lantern and stepping stones (the "Garden Decor" unlock). */
  function decor(x, y) {
    return `<g class="g-decor">
      <ellipse cx="${x - 40}" cy="${y + 26}" rx="13" ry="6" fill="#c9c3b5"/><ellipse cx="${x - 14}" cy="${y + 40}" rx="12" ry="5.5" fill="#d6d0c2"/><ellipse cx="${x + 12}" cy="${y + 52}" rx="11" ry="5" fill="#c9c3b5"/>
      <rect x="${x + 36}" y="${y - 40}" width="5" height="62" rx="2" fill="#5b4636"/>
      <path d="M${x + 26},${y - 40} h25 l-4,-8 h-17Z" fill="#3e5f4c"/>
      <rect x="${x + 29}" y="${y - 40}" width="19" height="22" rx="4" fill="#fff4cc" stroke="#3e5f4c" stroke-width="3"/>
      <circle cx="${x + 38.5}" cy="${y - 29}" r="13" fill="#ffe08a" opacity=".45" class="g-glow"/>
      <ellipse cx="${x + 38}" cy="${y + 22}" rx="12" ry="4" fill="#20402a" opacity=".15"/></g>`;
  }

  const defs = `<defs>
    <linearGradient id="g-grass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9ad957"/><stop offset=".55" stop-color="#84cc45"/><stop offset="1" stop-color="#6fbb3a"/></linearGradient>
    <linearGradient id="g-soil-left" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a7683b"/><stop offset="1" stop-color="#8c5430"/></linearGradient>
    <linearGradient id="g-soil-right" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8f5631"/><stop offset="1" stop-color="#744325"/></linearGradient>
    <filter id="g-soft" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
  </defs>`;

  window.GardenArt = { TILE_W, TILE_H, DEPTH, defs, tile, ghostTile, plant, flowerBed, goldenBloom, decor };
})();
