# Reels / attention collapse — integration lab

Open `Client/hero-reels-lab.html` through a static HTTP server. This is a separate lab;
the main homepage and approved Hero V2 files are unchanged. It ends at **THE TRAP**.

## Architecture and continuity

The integration imports Hero V2's stone system, effects, intro gate, world motion,
and complete opening timeline. Its bootstrap creates these once and waits for the
original intro completion gate. The same seven DOM stones and the same 700×860
Rive canvas remain mounted throughout. There is no scene reload or character swap.

Two locally vendored Three.js 0.180.0 renderers composite back scene → approved
Bimo Rive layer → front scene. Real camera-space Z assigns media, chips and debris
to the appropriate scene. Original foreground foliage fades only as the trap
engulfs the world. Live HTML contains all primary narrative copy and controls.

New implementation: `src/js/reels/{experience,story-math,bimo,native-motion,media,
vortex,shaders}.js`, `src/styles/reels/reels.css`, `hero-reels-lab.html`.
New assets: `assets/reels/bimo-narrative.json`, `assets/vendor/three/` with MIT license.
Reproducibility: `scripts/reels/export-narrative.py`, `compare-frames.py`, and
`record-sequence.cjs`. Tests: `tests/reels-experience.test.cjs` and
`tests/reels-lifecycle.test.cjs`. Evidence: `references/reels-validation/`.

## Narrative mapping

| Progress | State | Bimo | Media and stones |
| --- | --- | --- | --- |
| 0–.08 | Post Hero calm | DEEP FOCUS | Same balanced stack; no reels or decoders |
| .08–.20 | Tiny distraction | Opens into NOTICE | Small peripheral card/chip; top stone wobbles |
| .20–.36 | Temptation orbit | NOTICE, authored gaze | Three cards; one live source, two posters |
| .36–.52 | First collapse | CONCERNED | Seven cards; top stone slips, hesitates, accelerates and impacts |
| .52–.70 | Swarm / spiral | Guarded CONCERNED | 10–16 cards; next two stones fall; Z depth expands |
| .70–.88 | Black-hole burst | OVERWHELMED | Up to 32 cards; remaining stones collapse into the funnel |
| .88–1 | The trap | OVERWHELMED, recoiling | Up to 46 cards; world obscured; “Where did the day go?” |

Native scrolling changes `targetProgress` across an eight-viewport travel region.
`visualProgress` follows exponentially, capped at .145 progress/second forward
and .19 backward. Even an End-key fling takes about seven seconds to tell the
story. No wheel cancellation, body scroll lock, random jitter or one-shot physics
is used. Reverse scroll derives all poses, density, grade and camera from progress.
Low-amplitude ambient drift continues when scroll stops, so poster locations are
not intended to be pixel-identical at different wall-clock times.

Stones retain their original names and gain persistent DOM IDs `stone_01` through
`stone_07`. Each has a wobble/recovery envelope, lateral slip, short hesitation,
quadratic fall, impact compression, then capture/scatter. They keep the original
artwork; instanced environmental rubble adds fragments without replacing stones.

## Bimo and media

The approved native controller was sampled into nine clips: NOTICE, CONCERNED,
OVERWHELMED, each with left/center/right external gaze. No RML, geometry, original
controller, or `.riv` was edited. The lab adapter extends the existing clip-blend
approach and retains its planted-leg solve. Pointer tracking stays disabled;
`useExternalLook` stays enabled. The original awake/focus transition is reused.

Only five video elements exist. They are muted, looping, inline, and initially
have no source. Stage 2 starts one; collapse allows two; swarm allows five. A
sustained slow-frame condition lowers the active cap to three. Pause, hidden tabs,
reverse-to-calm and page teardown stop playback. Failed/delayed videos retain one
of the four supplied posters; even a missing poster has a procedural fallback.
Additional cards reuse these texture objects with varied crops, depths and scales.
No remote CDN is needed at runtime. Supplied captions remain inside their media;
the surrounding fictional card chrome carries no social-platform logo.

## Vortex and environment

The throat uses a custom polar/logarithmic turbulence shader: continuous spiral
arms, layered noise, violet/magenta emission, thin warm filaments and a dark core.
Perspective ribbon meshes follow curved paths through the same center. Cards,
faceted rubble and leaves populate front, middle and distant planes. Selected
near-camera media samples receive blur. Gentle camera push/roll and Bimo recoil
increase after .70; the center migrates behind him as the trap takes over.

The original illustrated environment remains underneath. A multiplying violet atmosphere, weakening roots, dimmer foliage and eventual shader
occlusion transform it continuously. Sparse duration/like chips and Read, Walk,
Rest, Finish work, and F O C U S fragments are pulled into the system.

## Performance and access

DPR begins at min(device DPR, 1.5), decreases under sustained slow frames, and caps
lower on narrow screens. Geometry and textures are shared; rubble/leaves are
instanced. Shader turbulence has three octaves. The shader is not drawn before
spiral formation. Expensive original masked-SVG ambient animation pauses once
Reels begins; inexpensive parent-layer drift continues cloud and water motion.
This preserves Hero V2 idle while avoiding simultaneous heavy SVG/WebGL work.

Reduced motion uses representative static stage compositions, zero ambient
clock, and no video requests. Primary copy stays semantic HTML. Hidden hero
buttons become inert; the pause control and existing focus-check dialog work.
WebGL failure/context loss uses a static poster composition instead of a blank
story. Original decoded Bimo posters remain available if Rive fails.

Measured timings are in `validation.json`; they describe this Apple M3/Chrome
session, not a device-independent frame-rate guarantee. Final continuous-scroll
peak sample: median **33.3 ms**, p95 **50.1 ms**, with
**3 active videos** after adaptive quality. A separate held-state profile reached
16.7 ms median with five sources, but that is not the continuous-scroll result.
The final build is substantially improved over the initial ~50 ms median;
a locked 60 fps during scrolling remains a performance limitation.

## Gold comparisons and remaining differences

See [all seven gold/live pairs](../references/reels-validation/gold-comparison.jpg)
and full-resolution 1440×900 and 1280×800 PNGs in the evidence directory.

| Gold | Comparison / remaining deviation |
| --- | --- |
| 00 Calm | Same Hero V2 composition, seven stones, closed eyes and roots. Existing vector Bimo differs from the painted reference. A small scroll cue is added. |
| 01 Tiny distraction | Peripheral small card and chip, NOTICE, top wobble. Live narrative copy replaces the concept's hero wording. |
| 02 Temptation | Three spatial cards around Bimo and restrained paths. Supplied real media replaces the reference's dog/food/landscape imagery. |
| 03 Collapse | Original top stone visibly falls with a guarded reaction; seven cards. The original plateau is graded, not physically cracked or repainted. |
| 04 Swarm | 10–16 cards, depth, leaves/rubble and growing violet funnel. Shader atmosphere is procedural rather than painted storm-cloud artwork. |
| 05 Burst | Dominant luminous throat, foreground clipping/blur, debris, stolen-time chips, camera push. Approved Bimo has a subtler worried mouth/guarded pose than the reference's leaping expression. |
| 06 Trap | Dense surrounding planes, smaller tilted Bimo, almost-obscured world, final DOM copy. Stones scatter/shrink rather than breaking into new illustrated glyph fragments. |

This is a continuous authored implementation and a review candidate, not a
pixel-identical reproduction or an assertion of user visual approval.

## Validation and rerun

```sh
python3 -m http.server 8794 --bind 127.0.0.1 --directory Client
# In another terminal, with Playwright and Chrome installed:
REELS_URL=http://127.0.0.1:8794 node Client/tests/reels-experience.test.cjs
REELS_URL=http://127.0.0.1:8794 node Client/tests/reels-lifecycle.test.cjs
python3 Client/scripts/reels/compare-frames.py
REELS_URL=http://127.0.0.1:8794 node Client/scripts/reels/record-sequence.cjs
```

`PLAYWRIGHT_MODULE` and `CHROME_PATH` can select local installations. The public
page has no debug toolbar. `?reelsDebug` exposes explicit seek/replay/state controls
for review and tests. Tests cover natural intro, fast native wheel input, slow
scroll, reverse/repeated direction changes, pause, resize, two desktop sizes,
390×844 overflow, delayed/failed video, reduced motion, real tab hide/restore,
console errors, canvas identity and painted pixels. The WebM records actual
Chromium compositor frames; its capture/encoding overhead can affect cadence.

Approved Hero source/asset hashes are recorded in `preservation.json`. Existing
unrelated homepage edits are excluded from the Reels commit. The unchanged Hero
runtime prerequisites and supplied media are included because they had not yet
been tracked and the new lab must work from a checkout.
