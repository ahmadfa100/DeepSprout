# Hero Opening V2 — continuity and ambient patch

This patches the existing `hero-lab-v2.html` and its supporting files. The copy,
six gold states, seven-stone story, final stack, intro gate and GROW/root sequence
are preserved. No Reels or next narrative milestone was added. This is a patch
for review, not an assertion that the hero is approved.

## 1. Exact disappearance cause

The Bimo `ResizeObserver` watched the animated `.bimo` container. GSAP changes
that container's width and height continuously between master seconds 3.8 and
5.4. Every notification called `resizeDrawingSurfaceToCanvas()`, which writes
both `canvas.width` and `canvas.height`. Each assignment clears the bitmap.
Those clears occur after the runtime's render; its deferred redraw loses the
race against another resize on the next frame. The live canvas stayed at CSS
opacity 1 while `.bimo-stills` stayed at opacity 0, leaving an empty visible area.

The unpatched live trace reproduces this: **190 canvas size writes**, with canvas
alpha coverage **0** in sampled frames from 3.950 through 5.300 seconds, despite
canvas opacity 1. Before screenshots and trace:
[baseline metrics](../references/hero-v2-patch-validation/before-transition/metrics.json).
There was no DOM replacement, renderer reload, z-index change or black asset
swap during that interval. The fault was bitmap clearing during size choreography.
Earlier six-state endpoint screenshots missed this interval; the new test checks
natural playback throughout it.

## 2. Code and architecture fix

- `bimo.js` keeps one canvas and one Rive instance for the whole opening. Its
  bitmap has a stable 700:860 artboard aspect ratio, sized for the largest
  arrival pose and capped at DPR 2. CSS `object-fit:contain` handles the existing
  smooth size transition without changing the bitmap.
- The observer now watches `.world`, whose bounds do not change during intro
  choreography. Identical bitmap dimensions return immediately. A real viewport
  resize snapshots and restores the previous frame synchronously into the same
  canvas before the next Rive draw; no second character surface is mounted.
- Canvas opacity no longer animates. Initialization happens behind decoded
  posters. Actual painted pixels must be present for two rendered frames before
  the poster-only 160 ms reveal. If loading enters deep focus late, the original
  650 ms state transition is allowed to settle first.
- Focus-poster readiness is explicit: the outgoing awake still stays selected
  until the incoming focus image has decoded. Failed runtime loading keeps the
  poster. No artificial long fade masks the old resize bug.
- `native-motion.js` interpolates the same approved native clips with separate
  settling windows: centered gaze 3.8–4.08, head/face 3.8–4.25, arms/hands
  4.02–4.85, eyelids 4.15–4.85, torso/breathing 3.85–5.25, sprout 4.1–5.3.
  The existing emotion state switches at 4.1; no geometry or rig asset changes.

## 3. Continuous visibility

After initialization, the same painted bitmap remains on screen throughout
pose changes. Choreography never clears it, replaces it or lowers its opacity.
Before initialization, decoded artwork remains above the canvas. Poster reveal
only proceeds after render readiness, with the canvas already fully opaque
beneath it. Actual viewport resizing restores the previous pixels within the
same JavaScript task. This removes the observed empty-frame path rather than
covering it with a longer transition.

The readiness checks cover loading, transition and lifecycle paths. If Rive fails
to load, the decoded poster remains visible.

## 4. Clouds

`world-motion.js` owns ambient motion independently of the intro and living-idle
choreography. It starts in ARRIVAL. Three softly masked regions reuse the
existing environment artwork without changing the illustration or camera:

| Group | Artwork | Motion | One-way duration |
| --- | --- | --- | --- |
| Far | Upper central cloud | +16 artboard px | 40 s |
| Mid | Lower central cloud | −24 artboard px | 27 s |
| Near | Large left cloud mass | +18 artboard px | 20 s |

Independent sine easing and yoyo reversals avoid a teleport/reset seam. The
sun, distant landscape and copy stay anchored. Masks soften local patch edges.
In 1440×900 screenshots six seconds apart, measured displacements are
**+2.67 px, −7.18 px and +6.99 px**, respectively. Full-scene proof:
[9 s](../references/hero-v2-patch-validation/idle-09s.png),
[15 s](../references/hero-v2-patch-validation/idle-15s.png),
[20 s](../references/hero-v2-patch-validation/idle-20s.png).

## 5. Vegetation

Two selected foreground regions sway independently: left +0.24°/0.8 px over
8.7 s; right −0.29°/−1 px over 11.3 s. Four smaller leaves keep fixed SVG anchors
and animate only their inner wrappers with differing 7.7, 11.1, 9.3 and 13.7 s
cycles. Most vegetation remains fixed. Foreground movement is stronger than
far-cloud movement; no mouse-driven camera motion is present.

## 6. Lake

A dedicated SVG behind Bimo and the stones carries three sparse, horizontally
fading reflection bands. They drift +13, −19 and +23 artboard px over 13, 9.7 and
16.1 s, with low-opacity variation. GROW briefly adds a wider 0.16-opacity
highlight at 7.05 s, returning to zero by 8.2. There is no moving texture noise.

## 7. Living idle and lifecycle

The intro still ends at exactly 8.2 and never replays automatically. Its existing
stone micro-settle, breathing/sprout playback, roots and quiet bloom remain.
Ambient loops continue independently after 15–20 seconds. GROW foliage/root
response is preserved, with only the added water-light response. Every ambient
loop is created once, paused with tab hiding/user pause, resumed from the same
position, and killed during teardown. Replay does not duplicate ambient loops.
Reduced motion freezes ambient loops at their initial positions while completing
the focused seven-stone balanced scene and roots.

## 8. Frame-by-frame validation

`tests/hero-opening-v2-patch.test.cjs` audits painted pixels after animation frames
across four natural playback cases. It records **25 images per case** at roughly
125 ms master-clock intervals across 3.5–6.5 s, plus canvas identity, allocation
writes, displayed position/size, phase order and source visibility. The contact
sheets normalize the character canvas for face/body inspection; recorded display
rectangles and full-scene captures preserve the actual size/position evidence.

| Case | Audited frames | Transition images | Minimum painted samples | Bitmap size writes |
| --- | ---: | ---: | ---: | ---: |
| Normal | 494 | 25 | 9,756 | 2 initial; 0 during transition |
| Rive delayed 5.6 s | 505 | 25 | 9,756 | 2 initial; 0 during transition |
| Focus image delayed 5 s | 505 | 25 | 9,756 | 2 initial; 0 during transition |
| Immediate aggressive scroll | 270 | 25 | 9,756 | 2 initial; 0 during transition |

**Zero empty Bimo frames in all 1,774 audited frames.** One persistent canvas
identity in each run. Visual inspection of the sheets shows continuous body,
head, face and attached limbs; eyes gradually close and arms open. The outer
box continues its authored smooth scale/position easing; no renderer pop-in.

The full existing suite also passes at 1440×900 and 1280×800: all six states,
seven stones, aggressive-scroll gate, delayed runtime, real hidden/restored
Chrome tab, reduced motion, pause/resume and dialog keyboard focus return.
No console errors. A further lifecycle check confirms both clouds and the master clock remain frozen in a real hidden tab. Across 89 sampled frames around actual viewport changes, Bimo stayed painted (minimum 2,065 alpha samples). The lifecycle report is included. Both validation suites and their raw reports are included.

## 9. Transition proof

- [Normal transition contact sheet](../references/hero-v2-patch-validation/normal-transition-contact.jpg)
- [Delayed Rive transition contact sheet](../references/hero-v2-patch-validation/delayed-rive-transition-contact.jpg)
- [Normal 25 individual PNGs and metrics](../references/hero-v2-patch-validation/normal-transition/metrics.json)
- [Delayed Rive metrics](../references/hero-v2-patch-validation/delayed-rive-transition/metrics.json)
- [Delayed focus image metrics](../references/hero-v2-patch-validation/delayed-focus-image/metrics.json)
- [Aggressive scroll metrics](../references/hero-v2-patch-validation/aggressive-transition/metrics.json)
- [Patch validation report](../references/hero-v2-patch-validation/validation.json)
- [Viewport/tab lifecycle report](../references/hero-v2-patch-validation/lifecycle.json)
- [Full regression report](../references/hero-v2-validation/validation.json)
- [Reduced-motion composition](../references/hero-v2-patch-validation/reduced-motion.png)

Run against a local server, with installed Playwright/Chrome:

```sh
HERO_URL=http://127.0.0.1:8792 node Client/tests/hero-opening-v2-patch.test.cjs
HERO_URL=http://127.0.0.1:8792 node Client/tests/hero-opening-v2.test.cjs
HERO_URL=http://127.0.0.1:8792 node Client/tests/hero-opening-v2-lifecycle.test.cjs
```

`PLAYWRIGHT_MODULE` and `CHROME_PATH` select local installations. Rebuild sheets:

```sh
python3 Client/scripts/hero-v2/transition-sheet.py
python3 Client/scripts/hero-v2/transition-sheet.py --sequence delayed-rive-transition
```

## 10. Remaining visual differences

Bimo is still the previously approved, flatter vector rig rather than the raster
robot in the gold frames. The original hand variants briefly crossfade during
pose interpolation; fingers may have a faint overlapping outline, while the
palm/body remain visible and attached. Existing gold/frame differences documented
in the V2 handoff are unchanged. Cloud groups reuse masked portions of the
existing plate rather than replacing it with new artwork; close inspection can
reveal soft local blend edges. No blank character frames remain in the tested
paths, and the intro/gate/story remain unchanged.

Modified application files: `hero-lab-v2.html`, `hero.css`, `bimo.js`,
`native-motion.js`, `timeline.js`; new application module: `world-motion.js`.
Added patch test, transition-sheet helper, proof captures and this report;
refreshed the existing validation captures and handoff. The approved Rive export,
clips, original experiment, copy and seven-stone configuration are unchanged.
