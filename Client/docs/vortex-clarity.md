# Vortex → void → the line field → the way back

`Client/hero-reels-lab.html`, sections 2 and 3. Section 1 (the opening and the reels
story) is unchanged. Section 2 is the black hole; it now ends on the full dark void.
Section 3, "You're not alone", is one pinned canvas of lines.

## Preview

```sh
python3 -m http.server 8792 --bind 127.0.0.1 --directory Client
```

Open <http://127.0.0.1:8792/hero-reels-lab.html> and scroll. Add `?reelsDebug` for
the review APIs:

```js
reelsLab.seekExit(.42);   // Bimo's final inward arc.
reelsLab.seekExit(.70);   // Full dark void: the end of section 2.
linesLab.seek(.13);       // Section 3, 0–1. Scene keys are listed below.
linesLab.state;           // Scene, line count, lit count, year, word box, handoff line.
```

## One scroll driver

There is still one scroll reader and one animation frame for the page, both in
`src/js/reels/experience.js`. The reader calls `field.scroll()`; the frame calls
`field.frame(now, dt)`. No ScrollTrigger and no CSS scroll timelines. GSAP only
drives the section 1 opening, as before.

## Section 2 exit

`collapse.js` keeps its phases up to the void and exports `EXIT_END = .70`; the exit
progress is capped there. The old spark, cream opening and travelling heading were
the start of the old section 3 and are removed. The hero track is shorter by the
1.5 screens those steps used (1250svh desktop, 1200svh mobile). Section 3 starts
on the same `#05040a`, so the release of the pinned hero is invisible.

## Section 3 scenes

`src/js/lines/field.js`. One array of lines (280; 120 at ≤700px), stored as typed
arrays and never recreated. Scroll progress picks each line's state; scrubbing up
replays it backwards. Only the feed jitter and the three flies use the clock.

| Progress | Scene | Key frame |
| --- | --- | --- |
| 0–.06 | Void. Background eases `#05040a` → `#0E1713`. Nothing moves. | .03 |
| .06–.14 | One cream line at the centre, jittering in bursts and pauses. | .13 |
| .14–.30 | 2, then 6, then waves outward, to the whole field. "You're not alone." | .285 |
| .30–.40 | The field reorders into a row of exactly 100 lines; 20 light sage. | .39 |
| .40–.48 | 24 → 40 lit while the year runs 2015 → 2025. | .46 |
| .48–.70 | Wobble, then knot into one tangle; "brain rot" is cut out of it. | .69 |
| .70–.82 | A horizontal line tries to cross and breaks in the dense knots. | .79 |
| .82–1 | The user's line pulls free, straightens, turns horizontal; dark → cream. | 1 |

- **"brain rot"** is a mask: the word is drawn once per resize to an offscreen canvas,
  its edges are bitten for an eaten look, and it is erased out of the tangle with
  `destination-out`. It is never a visible DOM heading; a visually hidden `<h3>`
  carries the text. Olive `#6B7260` spots grow on the glyph edges only.
- **Copy** is real DOM text over the canvas, in `hero-reels-lab.html` inside
  `#not-alone`. Statistics and sources are fixed strings; the test checks them
  verbatim.
- **Colours:** cream `#faf8f3`, ink `#292d2a`, sage `#82ab80`, the dark scene
  `#0E1713`, and the rot olive `#6B7260` for the spots only.
- **Reduced motion:** each scene is drawn as its key frame, with no jitter or flies.
  Scroll still moves from scene to scene.
- **No JS:** the canvas is hidden and every statement reads in normal flow.
- **Handoff:** the last frame is one ink line, horizontal, centred on the viewport
  (`linesLab.state.handoff`). Section 4 takes it from there.

## Section 3 copy anchors

Every line of copy sits at a fixed anchor in the pinned stage; nothing is positioned
by another element's height. The headline's bottom edge is 20px above the top of the
user's line (39% of the stage), sized to its own text; the paragraph sits 20px below
the line in a reserved box. Station 6 reuses these numbers, recorded in
`references/vortex-clarity-validation/validation.json` under `headline`.

## Section 4 — the way back

`src/js/lines/path.js`, `src/styles/lines/path.css`. `#way-back` overlaps the last
screen of section 3 (`margin-top:-100svh`); its stage stays hidden until it pins, the
same moment section 3's turn completes, and its first frame is that turn's last frame:
the same ink line (`handoffLength`), the same place, the same eyebrow.

The path is SVG. Solid stretches draw with `stroke-dashoffset`; the dashed future weeks
are revealed by a clip that follows the same drawn end. The camera is one matrix on the
wrapper group. Scroll time `t` runs 0–17.6 viewport heights; `pathLab.seek(t)` reviews it.

| t | Station | Key |
| --- | --- | --- |
| 0–.7 | Handoff: the line from section 3, "The way back" | .1 |
| .7–2.6 | Quick assessments: four gates, a tick each, four bars, no score | 2.4 |
| 2.6–4.4 | Your plan: W1 solid with seven days; W2–W4 faint dashes, no days | 3.9 |
| 4.4–7.6 | Activities: days fill as a cursor sweeps W1; days 3 and 6 stay empty | 6.6 |
| 7.6–10.6 | Protection: a wall rises, feed lines stop at it, it dissolves once passed | 8.95 |
| 10.6–13.4 | Beyond the screen: the page's one big camera move, a zoom out to ×0.3 onto a field of nodes; a branch leaves the path, touches one node and rejoins | 12.9 |
| 13.4–15.9 | Together: section 3's own lines (`LINES` in `field.js`: order, lengths, alphas) lie beside yours, joined by threads; "You're not alone." returns at the Scene 2 headline's exact anchor, in ink | 15.1 |
| 15.9–17.6 | Growth: the camera pans (no zoom) as the path turns down, crosses the soil and becomes the root that ends on the garden's entry point (`root.js`) | 17.6 |

While the camera is wide, `--sw` on the camera group keeps strokes at their on-screen weight. Station 7's
final pose is solved from the garden stage's entry point (`settleRoot`), so the root's last frame is the
garden's first; see `docs/product-journey.md`.

## Validation

With Playwright, pngjs and local Chrome (`tests/way-back.test.cjs` covers section 4):

```sh
REELS_URL=http://127.0.0.1:8792 node Client/tests/vortex-clarity.test.cjs
```

It checks the exit phases and the void by pixel, the cap at the void under native
forward/reverse/fast scroll, the same-dark seam into section 3, every scene at
1440 and 390, the verbatim copy, the 100-line row (counted from pixels), the glyph
cut-out (pixels inside the mask vs around it), the horizontal ink line on cream,
reversibility, one canvas, offscreen pause, End/Home, reduced motion, no JS and
failed WebGL. Captures go to `references/vortex-clarity-validation/`.
