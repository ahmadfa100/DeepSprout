# DeepSprout Hero Opening

Review at `Client/hero-lab.html`, served over HTTP. No build step. The existing homepage and V2 experiment are unchanged.

```sh
cd Client
python3 -m http.server 8791 --bind 127.0.0.1
# http://127.0.0.1:8791/hero-lab.html
```

## Files and architecture

- `hero-lab.html`: accessible, live DOM copy and two CTAs. The primary CTA reuses the existing homepage's quick-check question and responses; the secondary explicitly replays this opening for independent review. It does not enter the future scroll story.
- `src/styles/hero/hero.css`: composition, responsive layouts, focus indicators, reduced-motion behavior and hover polish.
- `src/js/hero/hero.js`: mounts the scene, owns user pause, visibility, lifecycle and CTA interaction.
- `src/js/hero/environment.js`: deterministic layered SVG scenery: clouds, hills, lake, trees, ground rock, flowers and foreground foliage.
- `src/js/hero/stones.js`: exactly seven independently addressable seed stones, final coordinates, offsets, rotation and depth metadata.
- `src/js/hero/effects.js`: organic energy stem, ten seed motes, nine root branches and five growing leaves.
- `src/js/hero/timeline.js`: GSAP opening and a separate idle timeline; named phase labels and `hero:phase` events.
- `src/js/hero/bimo.js`: real signed Rive V2 canvas integration, view-model binding, resize, pause and cleanup.
- `assets/hero/bimo-source/`: web export of approved V2 RML and the original, unmodified controller/pose library. Only preview background/debug labels/font and initial input values differ from the experiment. Character artwork and rig are preserved.
- `assets/hero/bimo-hero-v2.riv`: signed browser artifact.
- `assets/hero/bimo-focus.png`: transparent frame captured from the real running V2 canvas, used during loading/failure. It is not a reconstructed character.
- `assets/vendor/rive/`: pinned official canvas runtime 2.44.1 and local WASM. Existing local GSAP 3.13.0 is reused.
- `tests/hero-opening.test.cjs`: browser acceptance checks.
- `docs/hero-validation/`: phase captures, responsive captures and machine-readable test report.

SVG is used for the illustrated stones because their current motion needs only transforms. Each stone has a separate outer transform, idle transform and aura. The shared 1600 × 1000 coordinate space and explicit layer ordering leave room for later front/back planes, stone wobble/fall and Reel choreography. Those later phases are not implemented.

## Bimo V2

Artboard: `Bimo V2`. State machine: `Bimo V2 narrative states`. Auto-bound model: `BimoV2`.

The host sets `emotionStage=1`, `pointerLookEnabled=false`, `useExternalLook=true`, and `lookX=lookY=0`. No pointer listeners or CTA character reactions are added. The approved controller supplies breathing and sprout movement. The matching still remains visible until the state blend completes, avoiding an open-eyed initial flash.

Scripts were signed using the Rive CLI's authenticated `--publish=local` after explicit user approval. The website has not been published, and no `rive push` was performed. **The CLI reports this export as watermarked because the derivative project is not bound to an account file.** A release without Rive's watermark requires an authorized Rive account file binding and re-export; do not remove vendor marks in code. The original experiment stays local and unchanged.

```sh
rive Client/assets/hero/bimo-source --verify
rive inspect Client/assets/hero/bimo-source --summary
rive Client/assets/hero/bimo-source --publish=local
cp Client/assets/hero/bimo-source/build/bimo-hero-v2.riv Client/assets/hero/bimo-hero-v2.riv
```

Do not copy an unsigned `--once` or `--screenshot` build over the signed browser artifact. Local native renders overwrite the build output with an unsigned file.

## Choreography

Times begin after the live rig is ready (or the bounded loading timeout). Text and its matching character still are available during loading.

| Time | Scene |
| --- | --- |
| 0.1–1.7 s | Headline lines softly resolve from slight blur and vertical offsets. Body and CTAs follow. No letter bounce or typewriter. |
| 0.48–2.22 s | Seven stones arrive from restrained individual offsets, with slight depth/rotation differences. |
| 2.2–3.32 s | Staggered final corrections resolve into the 1–2–4 formation. |
| 3.4–4.5 s | Stone auras illuminate sequentially; a warm green seed travels toward Bimo and the ground. A soft light sweep crosses “More living.” |
| 4.36–5.93 s | Roots draw outward, leaves open and motes fade. |
| After 5.93 s | Separate slow, reversible idle motion: 1–2 px stone drift, cloud/lake drift, tiny foliage rotation and soft root glow. The intro never automatically repeats. |

`See how it works` replays deliberately. An unobtrusive corner pause button pauses both the scene and Rive. The focus check does not change Bimo's pose.

## Performance and accessibility

No Three.js, WebGL scene, video textures, remote fonts, raster landscape, framework or build pipeline. Locally hosted runtime assets eliminate third-party requests during normal page use. The Rive runtime includes its WASM cost (about 2 MB uncompressed) plus approximately 557 KB JavaScript; the character file is about 65 KB. SVG is lightweight deterministic geometry. Expensive root blur is restricted to the roots rather than the entire viewport. Ten transient motes disappear after growth.

Canvas device pixel ratio is capped at 2. ResizeObserver resizes only the character canvas on layout changes. Per-frame scene animation uses GSAP transforms/opacity rather than repeatedly reading layout. Hidden documents pause Rive and both timelines; user pause persists. Reduced motion resolves immediately to the completed composition and stops ongoing animation. Page disposal cleans up Rive, observers, GSAP and event listeners; back-forward cache restoration resumes according to visibility/preferences.

Keyboard focus is visible. Native dialog behavior handles focus trapping, Escape and focus restoration. Artwork is decorative to assistive technology; the copy remains selectable HTML. The existing quick check is a local illustrative interaction, not a diagnostic assessment or account submission.

## Validation

```sh
NODE_PATH=/path/to/playwright/node_modules \
CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
node Client/tests/hero-opening.test.cjs
```

`BASE_URL` defaults to `http://127.0.0.1:8791`; `HERO_OUTPUT` can override the capture directory.

Passed: real signed V2 runtime and focus inputs, seven stones, no navbar, real-time playback without scrolling, no automatic intro repeat, non-colliding final stones, text separation, pause/resume, replay, modal selection/Escape/focus return, no horizontal overflow at 1440×900, 1280×800, 390×844, 700×900, 768×1024 and 1920×1080, reduced-motion changes and cold load, zero console errors and zero failed HTTP responses. Timing and transform samples in `report.json` document real playback, beyond timeline-seek screenshots.

Phase images: A arrival, B alignment, C balanced, D growth, E idle. Additional screenshots cover responsive and reduced-motion layouts. These are browser checks on this machine, not a claim of profiling every device or a guaranteed frame rate.

## Reference interpretation and remaining differences

The supplied primary PNG was read from `Client/references/hero-opening/Less Scrolling, More Living.png`. The alternate `hero-opening-target.png` filename did not exist. The supplied SVG was read from Downloads (`DeepSprout_Figma_Editable_Text_Final 1.svg`); `hero-base.svg` did not exist. The SVG contains 786 paths, no text elements and only two groups: it is a flattened color trace, not separated editable scene objects. The story was provided in the Arabic attachment rather than `hero-story.md`. Both canonical reference sheets live under `Client/references/rive-v2/`.

The scenery therefore follows the target's composition, palette and illustrated motifs with newly structured vector geometry rather than embedding its large traced asset or PNG. It has cleaner, flatter shading and fewer botanical details than the painted target. Bimo retains the approved V2 proportions, which are taller and slimmer than the generated target character. The final stones use small leaf veins and a deliberate 1–2–4 formation, never an orbit. On mobile the copy stacks above the scene, so the complete world extends beyond a short phone viewport. No subsequent narrative acts or product sections have been added.
