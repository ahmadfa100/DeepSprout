# The garden beat

`Client/hero-reels-lab.html`, `#product-journey`: what remains of the original product journey —
the seed growing into a garden, then the waitlist invitation. Chapters 01–04 (assessment, plan,
activities, focus), the community pull-back, the journey chrome (wordmark header, chapter nav,
bottom bar) and the connection network were removed; section 4, "the way back", now tells that part.

## Files

- `src/js/journey/garden.js`, `choreography.js`, `camera.js`, `assets/journey/garden.svg`:
  the original modules and art, byte-identical to before.
- `src/js/journey/garden-stage.js`: the driver. It carries over the original garden, seed and copy
  logic from the removed `journey.js` and runs on the page's single scroll reader
  (`src/js/reels/experience.js`).
- `src/styles/journey/garden.css`: the rules the garden and invitation use, copied
  character-for-character, in order and in their `@media` blocks, from the original `journey.css`
  (now removed). `tests/product-journey.test.cjs` checks every rule against HEAD.
- `src/styles/lines/garden-stage.css`: the overlap with section 4 and the root's layer.
- `src/js/lines/root.js`: the root's shape, shared by section 4 and the garden.

## Timeline

The garden runs on the original timeline (`t`, 0–10.5) from `T0 = 6.22`, the moment the focus panel
has gone and only the seed's origin is left on screen. That origin used to be the focus chart's last
point; it is now the tip of the root that section 4 grows down to. The root's tip sits on the chart's
old point, so the seed's flight is the original code with the original numbers.

- 6.22–8.15: the original garden beat, unchanged. The camera then holds.
- 8.18–9.18: the garden's UI fades and its copy leaves, as before.
- The community chapter's time (9.18–9.87) is skipped; the invitation follows (`finish`).

Scroll pacing per unit of `t` is the original's (one viewport height; 11.8/10.5 on phones).

## The seam

`#product-journey` overlaps the last screen of section 4 and its stage stays hidden until it pins,
exactly as section 4 does with section 3. Its first frame draws the root — trunk, soil line, tail and
rootlets — in the garden's own world, mapped from the same screen shape section 4 ends on.

## Evidence

- `references/garden-handoff/garden-before-after-{1440,390}.webm`: HEAD on the left, now on the right,
  t = 6.22–8.15 in steps of 0.025, 12 fps.
- `references/garden-handoff/comparison.json`: differing pixels per frame against HEAD with the
  removed layers (chrome, chapter nav, network) hidden, at the exact t HEAD drew. From t = 6.595 every
  frame is pixel-identical at both widths; before that, the only difference is the seed's origin.
- `references/garden-handoff/head-{1440,390}/`: nine HEAD reference frames per width with the exact
  t of each, used by `tests/product-journey.test.cjs`. They are software-rasterised: run that test
  with headless Chrome's default renderer (GPU raster anti-aliases differently).

`gardenLab.seek(t)` and `gardenLab.renderAt(t)` (with `?reelsDebug`) review any frame on the original
timeline.
