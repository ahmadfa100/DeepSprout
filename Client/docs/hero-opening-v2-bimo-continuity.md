# Bimo continuity — fixed stage

Scope: Bimo continuity only. Environment source artwork, environment motion, all seven stone assets, stone animation, the intro gate, hero copy, and the Rive artwork remain unchanged. No Reels work.

## Reproduction and remaining root cause

Manually reloaded the existing in-app browser before editing, inspected full-page INTRO and focus screenshots, and observed the large character becoming smaller and moving down. Replay alone was not a reliable baseline: its old wrapper could retain the ending dimensions until the sizing tween ran again.

The previous bitmap fix left `timeline.js` animating Bimo's wrapper from `{left:854, top:180, width:420, height:534}` to `{left:888, top:358, width:340, height:378}` between 3.8 and 5.4 seconds. `object-fit:contain` consequently changed the actual character scale and feet location. The remaining failure was visual/layout continuity: the baseline canvas remained painted, so alpha-only telemetry did not catch it. Its apparent height fell by about 80 pixels; the foot anchor moved almost 60 pixels vertically at 1440 × 900.

The full-scene first-paint image also baked in the larger INTRO character. That duplicate could bypass a fixed wrapper and stretch differently at another viewport aspect ratio.

## Fix

- A single CSS stage, authored at `(888,358,340,378)` in the 1672 × 941 world, applies from the initial HTML through every pose and reduced motion.
- The stage has a constant bottom transform origin. All character wrapper position/size tweens are removed.
- The same HTML canvas retains its original 700 × 860 bitmap for its lifetime. There are no dimension assignments, viewport resize callbacks, canvas replacements, or transition opacity/visibility changes.
- The renderer remains `opacity:1`; matching decoded poster images cover initialization and fade away after painted frames exist.
- INTRO uses the same containment as DEEP FOCUS from the beginning. The original native head, arms, torso and eye motion play internally.
- The original controller's planted-leg calculation runs after clip blending, maintaining both foot anchors despite torso settling and breathing. Rive artwork and native source scripts are unchanged.
- The existing scene poster is rendered from the same environment and seven ground stones with Bimo excluded. His one persistent stage sits above it, including first paint. This eliminates the duplicated large character.

## Measurements at 1440 × 900

Bounding rectangles are CSS pixels, with a constant viewport and page position.

| Measurement | Before INTRO | Before DEEP FOCUS | After, every sample |
|---|---:|---:|---:|
| Stage x | 735.500 | 764.781 | 764.781 |
| Stage y | 172.156 | 342.391 | 342.391 |
| Stage width | 361.719 | 292.813 | 292.813 |
| Stage height | 510.719 | 361.516 | 361.516 |
| Canvas CSS width × height | 361.719 × 510.719 | 292.813 × 361.516 | 292.813 × 361.516 |
| Canvas bitmap | 362 × 445 | 362 × 445 | 700 × 860 |

Baseline: 17 distinct stage rectangles. Fixed version: one exact rectangle; zero bitmap writes; zero renderer swaps. Transform remains `none`, bottom origin and parent dimensions remain constant.

Fixed apparent character height is approximately 338.4–339.7 pixels (less than 0.4% variation from pose/breathing). Left and right native foot anchors remain at `(884.834,677.084)` and `(937.541,677.084)` screen pixels to three decimals. Float32 rig precision produces less than 0.001 pixel variation. Actual rendered sole bounds, measured from opaque pixels in the canonical canvas, are identical in every sample:

- Left: x=228..345, y=830..848.
- Right: x=354..471, y=830..848.

## Visual and runtime evidence

`references/hero-v2-bimo-continuity/` contains the before/after contact sheet, full scene captures, raw canonical canvas captures, and complete 100 ms measurements. The contact sheet uses the exact same screen crop for all frames, without normalizing each character's size or location.

The measurements include stage and parent rectangles, CSS sizes, bitmap dimensions, transform/origin, visibility, opacity, runtime status, Rive emotion inputs, native transform channels, calculated foot anchors, rendered sole bounds, and painted pixel counts. Live frames are also checked at animation-frame cadence for visible painted pixels and the same canvas identity.

Additional Bimo checks cover narrow layout, Rive delayed by 5.6 seconds, pause/resume during the transition, replay, aggressive scroll, reduced motion, and JavaScript-free first paint. Preservation hashes document every unchanged environment/stone asset and module.

Run `tests/hero-opening-v2-bimo-continuity.test.cjs` for the 100 ms audit and screenshots; run `tests/hero-opening-v2-bimo-lifecycle.test.cjs` for lifecycle regressions. `PLAYWRIGHT_MODULE` and `CHROME_PATH` can select locally installed tools; `HERO_URL` or the first CLI argument selects the local server.
