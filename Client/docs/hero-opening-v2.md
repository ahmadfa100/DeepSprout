# DeepSprout Hero Opening V2

Updated continuity and ambient behavior: [P0/P1 patch report](hero-opening-v2-patch.md).

A separate, local opening at `Client/hero-lab-v2.html`. The previous hero lab,
homepage, and approved `experiments/bimo-rive-v2` source remain unchanged.
The opening runs once through ARRIVAL → LIFT → VERTICAL ALIGNMENT → PERFECT
BALANCE → GROW → LIVING IDLE. This milestone contains no Reels or disruption states.

## 1. Files

| Path beneath Client | Purpose |
| --- | --- |
| `hero-lab-v2.html` | Semantic live copy, CTAs, seven physical stones, poster, Rive canvas and accessible motion control |
| `src/styles/hero-v2/hero.css` | Gold composition, local typography, responsive layout and reduced-motion scene |
| `src/js/hero-v2/scene-config.js` | Storyboard coordinates, phase boundaries and capture times |
| `src/js/hero-v2/stones.js` | Persistent stone objects with independent position, size, rotation and depth |
| `src/js/hero-v2/timeline.js` | Deterministic GSAP choreography and a separate living-idle timeline |
| `src/js/hero-v2/effects.js` | Organic energy propagation, roots, leaves and restrained bloom |
| `src/js/hero-v2/bimo.js` | Asynchronous approved-rig loading behind matching stills |
| `src/js/hero-v2/native-motion.js` | Playback of motion recorded from the approved native controller |
| `src/js/hero-v2/intro-gate.js` | Native scroll intent, smooth acceleration and completion gate |
| `src/js/hero-v2/hero.js` | Lifecycle, visibility, replay, reduced motion, CTA and diagnostics |
| `assets/hero-v2/` | Environment, seven transparent sprites, first-paint image, matching Bimo stills, local Inter/OFL fonts, `.riv`, motion clips and editable source derivatives |
| `scripts/hero-v2/export-bimo.py` | Reproducible native-motion export; no upload or signing |
| `scripts/hero-v2/compare-frames.py` | Labeled gold/live review sheet |
| `tests/hero-opening-v2.test.cjs` | Playback, scroll, real hidden-tab, loading, reduced-motion, accessibility and capture validation |
| `references/hero-v2-validation/` | Twelve desktop captures, comparison sheet, loading/reduced/mobile captures and measured validation report |
| `docs/hero-opening-v2.md` | This handoff |

Existing local GSAP and `@rive-app/canvas` 2.44.1 vendor files are reused.

## 2. Exact timeline

These are master-clock seconds; scroll input changes playback speed, not phase order.

| Time | State and behavior |
| --- | --- |
| 0–1.2 | ARRIVAL. Seven ground stones; awake, calm Bimo; full initial composition holds. Scroll cannot shorten this hold. |
| 1.2–3.8 | LIFT. Each stone travels through an eased lift with slight rotation and size change. Starts stagger by 35 ms. Bimo stays awake. |
| 3.8–5.4 | VERTICAL ALIGNMENT. All seven converge toward the vertical stack. Bimo's recorded pose settles in stages: head/gaze first, then arms, eyelids and calmer breathing; complete by 5.3 s. Character scale settles gradually. |
| 5.4–6.4 | PERFECT BALANCE. Micro-settle; the top heart/chart stones exchange through shallow side paths to reconcile their different ordering in gold 02 and 03. No GROW illumination yet. |
| 6.4–8.2 | GROW. Stone illumination travels top to bottom at 95 ms intervals. Soft winding energy activates; a seed travels down the stack and Bimo from 6.55–7.38. Root draw starts at 7.05. Leaves, bloom and a restrained light sweep across “More living.” respond. |
| 8.2 onward | LIVING IDLE. Master clock ends at exactly 8.2; intro gate opens once. Only the separate ambient timelines continue. |

The primary CTA opens the existing local focus-check interaction. “See how it
works” explicitly replays the opening. It never auto-replays.

## 3. First paint

A composed arrival WebP contains the environment, seven ground stones and the
actual approved Bimo awake render. It is available in HTML before JavaScript.
Live text remains accessible DOM text. Critical image and local-font preloads
start in the head; seven stone elements also have their initial positions inline.
Once the individual stone images, matching awake still and fonts are ready, the
arrival composite fades out over 180 ms. A bounded 1.8-second wait prevents a
failed request from indefinitely withholding the intro. Slow character loading
cannot leave an empty character area.

Reduced motion has a complete vertical stack and focused still in CSS, even
with JavaScript disabled. With JavaScript available, the complete roots are
established and the gate opens immediately. Static images still depend on their
network delivery; there is no claim of zero-byte instant rendering.

## 4. Rive strategy and limitation

Bimo uses the approved V2 vector geometry, bindings, view model and state machine.
Its Luau controller and pose library are unchanged in the derivative export
source. Preview background, debug labels and debug font are removed.

The earlier script-bearing signed export displayed a Rive watermark panel in
Chrome. This opening therefore uses a **script-free offline export**: Rive CLI
1.5.1 executes the original controller locally and records two 12-second motion
clips, awake and deep focus, with 79 output channels sampled every 100 ms.
The browser smoothly interpolates those channels through the original view model;
no replacement robot drawing or invented pose is used. The exported `.riv` has
zero runtime scripts, verifies with zero errors/warnings and has no inspect
problems. This export uses no Rive account upload or signing service.

Pointer tracking stays disabled; external gaze ownership stays enabled and
centered. Stage 0 is awake; stage 1 is deep focus. The canvas remains invisible
through runtime initialization and pose setup, then the poster above it fades away over 160 ms after two painted frames are verified. The canvas itself does not fade. Late deep-focus initialization also allows the original state transition to settle. DPR is capped at 2; a ResizeObserver watches the stable world bounds.
The persistent bitmap is sized from the world viewport, never from the animated Bimo box. Only actual viewport changes resize it, retaining its previous pixels synchronously. Visibility, pause, reduced motion and teardown stop Rive and host playback.
If Rive fails, matching awake/focus stills remain in place.

**Deliberate limitation:** the full Luau controller does not execute in the
browser. This opening supports its recorded awake/deep-focus motion. Future
interactive NOTICE/CONCERNED/OVERWHELMED or gaze behavior requires additional
native clips or an account-bound signed full-controller export. `bimo.js` is the
adapter boundary for that upgrade; it does not require rebuilding this opening.

To reproduce locally, from the repository root:

```sh
python3 Client/scripts/hero-v2/export-bimo.py
```

## 5. Seven stones

Seven persistent illustrated DOM objects use transparent lossless WebP sprites.
They physically travel through position, size and rotation; opacity is never
the primary entrance. Their authored coordinates are derived from the gold
1672×941 space. A separate inner wrapper carries at most 1 px of idle movement,
so the final vertical formation stays intact. No Three.js runtime was necessary
for this illustrated opening. Independent outer objects preserve an extension
point for later depth, wobble or falling behavior.

Final order, top to bottom: chart → heart → lotus → clock → book → community →
sprout. Every centerline ends at x=1058. Exactly seven stones exist throughout.

## 6. Intro gate

Wheel, touch and non-control keyboard scroll stay native. The hero remains
sticky through a short 15svh scroll region. No wheel cancellation, body overflow
lock or eight-second scroll lock is used. Until completion, absolute intent is
absorbed into a bounded accumulator, smoothly raising speed from 1 to a maximum
of 2.45. The initial 1.2-second hold remains intact. There is no seek/skip.

Only master completion dispatches `hero:intro-complete` with `progress:1` and
`absorbedIntent`; the event fires once. After that, `hero:story-intent` forwards
new wheel/touch/keyboard intent to a future host. `#story-slot` stays hidden in
this milestone. No future narrative state is mounted or activated. Replay
explicitly resets the gate.

## 7. Living idle

Native recorded breathing and restrained sprout sway continue. Stone inner
wrappers move up to 1 px over 5.8-second eased cycles. Ambient motion starts with ARRIVAL: three cloud groups drift at different rates, independently repeating selected foreground/small-leaf sways stay below 0.3°, and three lake reflection bands drift at different rates while their opacity softens. Root bloom and the quiet stack ribbon pulse slowly.
A few leaves move gently. These are separate from the finished intro clock.
Hidden tabs and user pause stop both systems; resume continues from the same
phase rather than catching up elapsed hidden time.

## 8. Performance and verification

All assets are local. The measured cold local transfer is about 5.4 MB, dominated
by the shared Rive JS/WASM, fonts and seven lossless sprites. The character asset
itself is only 27 KB; motion clips are about 107 KB. Environment WebP is about
241 KB, first-paint WebP about 313 KB. PNG/atlas/source files are authoring assets
and are not fetched by the hero.

Chrome on this host delivered a 33.3 ms median and 33.4 ms p95 RAF interval
(about 30 fps). An empty page and the fully paused scene measured the same
interval, indicating the local browser/display baseline. This is a measurement
on this host, not a guarantee for all devices. Animation work pauses when the
page is hidden, and canvas resolution is bounded.

The automated validation passes:

- Normal autoplay: all six phases in order, awake throughout lift, deep focus
  after alignment, final seven-stone vertical stack, no intro loop.
- Immediate scroll and aggressive wheel flings: native scroll moves; every
  phase is visited; no future intent is dispatched before completion.
- Actual Chrome tab hidden/restored: `document.hidden=true`, unchanged master
  clock while hidden, smooth progress after restore. The test uses an isolated
  Chrome profile without Playwright's forced-visible focus override.
- Delayed `.riv` delivery: matching poster visible; canvas concealed; initialized
  live crossfade. Reduced motion completes immediately; CSS-only first paint
  also aligns the seven stones.
- 1440×900 and 1280×800: six captures each; pause/resume and Escape/dialog focus
  return pass. No console errors. A 390×844 mobile layout was also reviewed;
  it uses a taller scene and native scrolling, with no horizontal overflow.

Run against a local server (requires installed Playwright and Chrome):

```sh
python3 -m http.server 8792 --bind 127.0.0.1 --directory Client
# In a second terminal:
HERO_URL=http://127.0.0.1:8792 node Client/tests/hero-opening-v2.test.cjs
```

`PLAYWRIGHT_MODULE` and `CHROME_PATH` may select local installations.
Machine-readable results: [validation.json](../references/hero-v2-validation/validation.json).

## 9. Six live validation states

| Target | Capture time | 1440×900 | 1280×800 |
| --- | --- | --- | --- |
| 00 Arrival | 0.8 s | [Capture](../references/hero-v2-validation/1440x900-00-arrival.png) | [Capture](../references/hero-v2-validation/1280x800-00-arrival.png) |
| 01 Lift | 3.72 s | [Capture](../references/hero-v2-validation/1440x900-01-lift.png) | [Capture](../references/hero-v2-validation/1280x800-01-lift.png) |
| 02 Vertical alignment | 5.35 s | [Capture](../references/hero-v2-validation/1440x900-02-vertical-alignment.png) | [Capture](../references/hero-v2-validation/1280x800-02-vertical-alignment.png) |
| 03 Perfect balance | 6.399 s | [Capture](../references/hero-v2-validation/1440x900-03-perfect-balance.png) | [Capture](../references/hero-v2-validation/1280x800-03-perfect-balance.png) |
| 04 Grow | 7.7 s | [Capture](../references/hero-v2-validation/1440x900-04-grow.png) | [Capture](../references/hero-v2-validation/1280x800-04-grow.png) |
| 05 Living idle | 9.5 s | [Capture](../references/hero-v2-validation/1440x900-05-living-idle.png) | [Capture](../references/hero-v2-validation/1280x800-05-living-idle.png) |

[Gold/live comparison sheet](../references/hero-v2-validation/1440x900-gold-comparison.jpg).
The review sheet scales both sources to a common aspect ratio for composition
comparison. Desktop hero imagery fills the requested 16:10 viewports, so it
stretches slightly vertically compared with the original 16:9 gold images.

## 10. Remaining gold-master deviations

This is a close continuous reconstruction, **not a pixel-identical match**.

| Frame | Remaining difference and reason |
| --- | --- |
| 00 | Approved vector Bimo has a slimmer body, flatter ceramic shading and more relaxed awake arms than the raster gold character. Ground stones are separate derived sprites, so silhouettes, moss and glyph details vary slightly. Original rooted arrival ground light is deferred to GROW. |
| 01 | Stone centers and suspended arrangement follow the gold; shapes and trails are more restrained. Approved awake Bimo remains relaxed rather than reproducing the illustrated palms-up pose. |
| 02 | Same seven-stone vertical arrangement and deep-focus timing; the approved rig's face/body styling differs. The environment and character pedestal remain stable rather than following the gold frame's shifting rock/camera details. |
| 03 | Final order is chart/heart/lotus/clock/book/community/sprout. Approved Bimo proportions and hand details differ; glow stays quiet until GROW. |
| 04 | Gold shows seven overhead stones **and another seven on the ground**. The explicit exactly-seven rule takes precedence: the original seven stay overhead; none are duplicated. Bimo stays in deep focus as requested, although gold 04 shows open eyes. Bloom and organic root energy are more restrained than the gold illustration. |
| 05 | The same duplicate-ground-stone conflict applies. Breathing, stable stack, roots and ambient motion remain; approved vector styling, lower glow intensity and sparse floating leaves differ from the raster frame. |

Across all states, one environment plate preserves the arrival scene instead
of switching among six changing illustrations. Text uses local Inter with
matched size/weight/spacing, but exact letterforms differ from the raster.
Minor cloud/foliage reconstruction around removed objects is visible on close
inspection. The supplied SVG was contextual; the newer gold storyboard controls
this V2 milestone.

### Asset provenance

The environment is an ImageGen precise edit of gold 00: remove baked text,
buttons, Bimo, seven glyph stones and roots; preserve camera, lake, mountains,
clouds, sun, foliage and base rock. The transparent atlas derives seven stones
from gold 00/01, preserving glyph order and moss/leaves. A second precise edit
removes dense grass and daisies so suspended stones do not carry ground bouquets.
Images are not substituted whole storyboard frames during playback.

Editable authoring assets are `environment.png` and `stones-atlas.png`; alpha-bbox
cropping and lossless WebP packaging produce the seven sprites. Matching Bimo
stills and the composed arrival image are rendered from the actual approved rig
and live scene. Font licensing is included under `assets/hero-v2/fonts/OFL.txt`.
