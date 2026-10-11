# Vortex → void → clarity

The existing purple-vortex experience is `Client/hero-reels-lab.html`. This extends
that page. The separate legacy homepage, application, approved Hero source files,
Bimo artwork, Rive project and exported `.riv` remain unchanged.

## Preview

From the repository root:

```sh
python3 -m http.server 8792 --bind 127.0.0.1 --directory Client
```

Open <http://127.0.0.1:8792/hero-reels-lab.html>. Allow the existing opening to
complete, then scroll through **Where did the day go?** and onward. Native scroll
is never canceled or locked. Reverse scroll restores the entire sequence.

For precise review, add `?reelsDebug` and use the browser console:

```js
reelsLab.seek(.97);        // Existing trap; original 0–1 review API is retained.
reelsLab.seekExit(.33);    // Cards nearly swallowed; Bimo remains.
reelsLab.seekExit(.42);    // Bimo's final inward arc.
reelsLab.seekExit(.72);    // Full dark hold.
reelsLab.seekExit(.82);    // Warm circular opening.
reelsLab.seekExit(1);      // Complete heading, normal-flow handoff.
reelsLab.play();           // Return to native scrolling / ambient animation.
reelsLab.state;            // Progress, phase, measured core, decoder and lifecycle state.
```

## Files

New:

- `src/js/reels/collapse.js`: shared core, deterministic curved paths, Bimo gravity
  wrapper, decorative-object capture, void/portal masks and heading handoff.
- `src/js/reels/clarity.js`: reversible editorial reveals, staggered counts and
  restrained Brain Rot typography disturbance. Reads its data from semantic HTML.
- `src/styles/reels/clarity.css`: portal, responsive editorial layout, no-JS and
  reduced-motion presentation.
- `tests/vortex-clarity.test.cjs`: browser/pixel/scroll/access-fallback checks.
- `references/vortex-clarity-validation/`: captures, overview and validation result.
- This document.

Modified:

- `hero-reels-lab.html`: semantic section, statistics, citations and portal layers.
- `src/js/reels/experience.js`: separate exit progress, lifecycle and review API.
- `src/js/reels/vortex.js`: optional exit parameter for existing meshes and media.
- `src/js/reels/shaders.js`: additional polar acceleration/distortion, dark throat.
- `tests/reels-{experience,pacing,lifecycle}.test.cjs`: original story tests now use
  the original story distance rather than the extended total track height.
- `docs/reels-experience.md`: links to this continuation.

**No runtime dependency was added.** The implementation uses existing Three.js,
Rive, GSAP and vanilla DOM/CSS. Editorial reveals use the existing native scroll
driver; ScrollTrigger is unnecessary. Test tooling uses Playwright and pngjs.

## Continuity and choreography

The original story keeps eight viewport heights of scroll travel (7.5 on mobile).
Its seven stages, pacing, math, card sources, geometry and Bimo motion clips are
retained. A further five viewport heights drive `exitProgress` independently:

| Exit | Event |
| --- | --- |
| 0–.12 | Gravity strengthens; original copy clears; polar shader accelerates |
| .025–.49 | Staggered cards, chips, stones, particles and ribbons spiral inward |
| .36–.58 | Same Bimo canvas rotates/recedes along its final arc, after the cards |
| .59–.70 | The shared dark core expands beyond every viewport corner |
| .70–.735 | A full, quiet dark hold |
| .735–.89 | Tiny warm light grows into a cream circular opening |
| .875–1 | Masked heading lines, then support; single heading enters normal flow |

All object positions, angular changes, depth and scale derive from scroll progress.
There are no accumulated physics, timers controlling choreography, random paths,
replacement Bimo images or exit opacity fades. Objects become invisible only
when their curves have reached the throat. Bimo retains the approved overwhelmed
pose; the existing native character canvas is neither remounted nor resized.

`CORE` matches the existing trap shader. Its viewport position is measured from
the actual world rectangle, including the mobile crop. The void and light use
that same position, not an unrelated screen-centered overlay. Corner distance
determines the final mask radius. Section background remains transparent until
the portal is complete, preventing a rectangular cream strip from arriving early.

The heading exists once in semantic HTML. During its reveal it translates upward
from its future section position. At the sticky scene's end the translation is
zero; it continues in normal document flow without a duplicate/crossfade.
Statistics then draw a rule and stagger number → label → source. Mobile uses
each statistic's own viewport entry. Brain Rot has one small, scroll-derived
disturbance that resolves to sharp type, followed by the source row.

## Editing statistics and sources

**Source of truth: `hero-reels-lab.html`, inside `#not-alone`.** Each statistic has
`data-count`, `data-format`, a final readable number, a screen-reader number,
population/measure text, publication/survey date and a direct source link.
Change these together. No duplicate content lives in JavaScript or a runtime API.

| Figure | Meaning and source |
| --- | --- |
| 2h 21m | Daily social-media time in GWI's survey, reported in [DataReportal Digital 2025](https://datareportal.com/reports/digital-2025-global-overview-report). This is use, not a measure of addiction or harm. |
| 46% | U.S. teens 13–17 online “almost constantly,” [Pew's 2024 survey](https://www.pewresearch.org/internet/2024/12/12/teens-social-media-and-technology-2024/). Exact result is in the linked report's topline questionnaire, INTREQ. |
| 38% | U.S. teens 13–17 report too much smartphone time, [Pew report published March 2024](https://www.pewresearch.org/internet/2024/03/11/how-teens-and-parents-approach-screen-time/), fielded September–October 2023. |

These dated snapshots were verified against the linked published sources; they
are not labeled as the latest available figures. The storyboard's illustrative
numbers were not used. Different populations/measures are explicitly identified.

[Oxford Languages' 2024 announcement](https://corp.oup.com/news/brain-rot-named-oxford-word-of-the-year-2024/)
supports the language context, not a medical claim. Brain Rot is presented as a
popular term, not diagnosis or established brain damage. Only actually cited
sources appear in the source row, and it explicitly does not imply endorsement.

## Access, lifecycle and limitations

- No-JS: a compact opening and the entire semantic section with final figures and
  source links remain readable. Enhancement is opt-in.
- Reduced motion: static existing story snapshots, no portal/swirling exit, no
  live video requests, no count/typography disturbance; normal readable content.
- Pause/hidden tabs stop ambient animation/media. Offscreen research content
  stops the hero's character/rendering work. Bimo pauses after being swallowed;
  WebGL submissions stop after the void closes. Reverse scroll resumes as needed.
- Quick page jumps land at a coherent exit/content position. Within the original
  story range, the original capped pacing remains. A jump beyond the whole story
  completes the offscreen intro gate so returning cannot leave it paused forever.
  There is no native scroll lock.
- WebGL/context failure keeps poster fallback, and the CSS portal still works.
- The existing vortex's procedural appearance and vector Bimo remain; this is
  not a pixel reproduction of the illustrated storyboard. Bimo has no new fall
  deformation or volumetric motion blur. The glow is a restrained CSS approximation
  rather than a fluid/volumetric simulation. No sound was introduced.
- This machine's Chrome checks do not establish universal frame rates or Safari
  performance. Two existing WebGL contexts and the original media are retained;
  adaptive quality and decoder limits still apply.

## Validation

With Playwright, pngjs and local Chrome installed:

```sh
REELS_URL=http://127.0.0.1:8792 node Client/tests/vortex-clarity.test.cjs
REELS_URL=http://127.0.0.1:8792 node Client/tests/reels-pacing.test.cjs
REELS_URL=http://127.0.0.1:8792 node Client/tests/reels-experience.test.cjs
REELS_URL=http://127.0.0.1:8792 node Client/tests/reels-lifecycle.test.cjs
```

`PLAYWRIGHT_MODULE` and `CHROME_PATH` can select existing installations. The new
suite captures desktop/mobile phases, samples rendered pixels across the dark
viewport, catches early rectangular cream ingress, checks heading handoff,
forward/reverse/rapid native scrolling, End/Home jumps, preserved canvas/stones,
offscreen media pause, desktop row alignment, mobile overflow, reduced motion,
no-JS source links and failed-WebGL completion. It writes evidence to the new
validation directory. The original suites retain their original acceptance
assertions and use the original story distance.
