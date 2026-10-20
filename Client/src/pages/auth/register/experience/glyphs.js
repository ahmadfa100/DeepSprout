/** One light line-icon language (34-unit box, round 1.35 strokes) shared by the
 * registration cards (inline SVG) and the network's partner hubs (Path2D).
 * Circles are written as arcs so every glyph is a single path string.
 */
const circle = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;

export const glyphs = {
  // A personal path: one beginning connected onward.
  individual: `${circle(9, 24, 3)}${circle(17, 11, 3)}${circle(26, 19, 2.4)}M10.7 21.4l4.6-7.8M19.5 12.8l4.6 4.3`,
  // People gathered: communities and shared purpose.
  partner: `${circle(17, 11, 4)}M10 27v-1.5a7 7 0 0 1 14 0V27${circle(7.5, 14, 2.8)}M2.5 25v-.8a5 5 0 0 1 5-5${circle(26.5, 14, 2.8)}M31.5 25v-.8a5 5 0 0 0-5-5`,
  community: `${circle(17, 11, 4)}M10 27v-1.5a7 7 0 0 1 14 0V27${circle(7.5, 14, 2.8)}M2.5 25v-.8a5 5 0 0 1 5-5${circle(26.5, 14, 2.8)}M31.5 25v-.8a5 5 0 0 0-5-5`,
  mentor: `${circle(12, 10, 5)}M3 28v-3a9 9 0 0 1 18 0v3m2-22a5 5 0 0 1 0 10m2 4a8 8 0 0 1 5 8`,
  organization: 'M3 12 16 4l13 8H3Zm3 3v12m10-12v12m10-12v12M3 29h26',
  provider: 'm2 28 12-22 8 14 4-7 6 15H2Zm7-13 5 3 4-3',
  workshop: 'M5 6h24v15H5ZM12 28l5-7 5 7M10 11.5h10M10 15.5h6',
  initiative: 'M9 30V4M9 5.5h16l-3.8 5.2L25 16H9',
  check: 'M10 17.5l4.6 4.5L24.5 12',
  arrow: 'M6 17h22m-8-8 8 8-8 8'
};

export const glyphSvg = (key, className = '') =>
  `<svg${className ? ` class="${className}"` : ''} viewBox="0 0 34 34" aria-hidden="true" focusable="false"><path d="${glyphs[key]}"/></svg>`;
