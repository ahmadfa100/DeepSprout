# DeepSprout — Break the Loop

## What ships

The existing homepage now opens inside a single illustrated world. Feed fragments arrive as the visitor scrolls, assemble into an infinity ribbon, and react to scroll speed. Stopping in the loop settles the scene. A botanical pulse releases the interruptions into leaves and petals; the first feed frame folds toward a seed. The ribbon opens into a path. Continuing follows the seed underground, where roots branch toward the four existing product features.

The rest of the page retains its existing product copy, practice tabs, focus timer, breathing control, offline quests, sample habit controls, shared navigation, and final CTA. The closing illustration shows the same character tending a plant, with one supporting line connecting it to the reclaimed moment.

## Audit and technical direction

- Static HTML/CSS/vanilla JavaScript, without a build step. Root HTML files redirect to individual page folders.
- Shared colors and fonts: `src/styles/theme.css`; shared navigation/footer: `src/layouts/site-layout/`.
- Fonts: DM Sans and Fraunces, with system and Georgia fallbacks.
- Existing local GSAP 3.13.0 and ScrollTrigger remain the only animation dependencies.
- Hero, feature, closing, and garden artwork are flattened PNG illustrations. No transparent mascot poses, independent foliage layers, or rigged mascot assets were present. The supplied attachment was a textual creative brief.
- The previous separate noise panel and scroll-distance growth stages were replaced. The old pointer micro-interaction file is no longer loaded; it remains available in the repository but does not run on this homepage.
- Implementation plan: one story controller; one ribbon renderer; existing growth controller for intentional actions; CSS/SVG for the underground connection.

## Files

Changed:

- `src/pages/public/home/home.html`: continuous opening, accessible controls, root networks, path, final continuity line.
- `src/pages/public/home/animations/story.css`: new scene composition, responsive layouts, static and reduced-motion states.
- `src/pages/public/home/animations/scroll-story.js`: state, velocity, stillness, release, seed descent, root/journey effects, lifecycle.
- `src/pages/public/home/animations/growth-system.js`: visible garden growth follows sample habit choices instead of scroll distance.
- `README.md`: current architecture and verification instructions.

Created:

- `src/pages/public/home/animations/loop-scene.js`: projected SVG ribbon and traveling HTML feed fragments.
- `tests/home-story.test.cjs`: browser regression suite.
- `docs/break-the-loop.md`: this handoff.

## Scenes and behavior

1. **Serenity:** original reading mascot and garden; simple text entrance; approximately 2px whole-image breathing.
2. **Distraction:** the first few abstract feed fragments arrive. No real platform branding.
3. **Overload:** 12 fragments on desktop, 10 on economical tablet initialization, 8 on mobile. Scattered positions become more restless at higher speed.
4. **Infinite loop:** fragments converge onto the same projected figure-eight curve as the continuous ribbon. They travel around it, with perspective scale, rotation, depth ordering, and inertia.
5. **Stillness:** a quiet “Don’t scroll” invitation appears, followed by “Just for a moment.” A fine circular indicator acknowledges the pause without blocking input.
6. **Calm / focus pulse:** motion decelerates over 2.1 seconds, warmth increases, a soft ring expands, and digital forms crossfade into leaves/petals.
7. **Seed:** the primary frame converges toward the seed location and folds away as a shaded seed emerges. It remains available to contemplate until the visitor continues.
8. **Descent:** the scene moves upward and the soil rises past the seed, keeping the camera centered on it.
9. **Roots:** SVG path reveals connect the seed into the next section, then branch toward each feature. Mobile uses its own root drawing.
10. **Path / garden:** the same infinity geometry unfolds into an open curve. The journey section echoes that open path through four milestones. The interactive garden grows from deliberate sample habit selections. The closing garden completes the visual circle.

## Scroll velocity and stillness

Native passive scroll events measure pixels per second. The velocity sample decays when input stops, is normalized against 1,800px/s, and is exponentially filtered with a rate of 5/s. It affects card travel speed, small positional/rotational irregularity, scatter depth, and the amplitude of the whole-image breeze. It never affects native scrolling itself.

Stillness is active only in the loop invitation range. A filtered normalized speed below 0.032 (roughly 58px/s before filtering) for 1.3 continuous seconds starts calm mode. Crossing the 75% story position also starts calm; a spatial fallback between 76% and 94% guarantees a resolved scene for rapid scrolling and restored mid-page positions. Nobody must stop to access the content. Scrolling back before 12% resets the signature interaction.

`CONFIG` at the top of `scroll-story.js` contains the timing, speed, and threshold values. `?storyDebug` exposes progress, filtered speed, stillness duration, calm, and release on the stage's `data-debug` attribute; it adds no production overlay.

## Rendering architecture and Three.js decision

Three.js is intentionally not introduced. This composition needs a ribbon and a dozen stylized cards, not a WebGL environment. A parametric figure-eight is projected into screen coordinates with perspective and depth; 72 shaded SVG strips form the surface (44 on economical/mobile initialization). HTML cards use the same curve. The curve itself interpolates into an open path, preserving continuity.

This avoids a new runtime dependency, canvas resolution management, WebGL context failure, and GPU resource disposal. The renderer has an explicit `destroy()` method; observers, listeners, animation frames, and ScrollTriggers are cleaned up across preference/breakpoint changes. There is no canvas and no WebGL-only content.

## Mobile, reduced motion, and accessibility

- Desktop story: 290svh total, including its viewport. Mobile: 220svh total, with only about one additional viewport of native scrolling.
- Mobile has eight smaller fragments, fewer surface segments, 30 visual updates per second, a separate text/art composition, and its own vertical root path. No pointer lens or gesture capture.
- Quiet desktop states also use 30 visual updates per second; active desktop digital scenes follow requestAnimationFrame.
- Rendering stops when the chapter is offscreen or the document is hidden. Time spent hidden does not satisfy stillness.
- A keyboard-visible skip link bypasses the scene. Pause/resume stops ambient scene time; scroll remains available.
- Reduced motion removes the sticky sequence, loop, velocity motion, large travel, and root drawing animation. The original hero, static explanation, all features, and practice controls remain visible. Live preference changes are supported.
- Without JavaScript or GSAP/ScrollTrigger, the hero, static story explanation, all product content, and ordinary links remain readable. A no-JavaScript registration link is supplied; interactive practice controls require JavaScript, as before.
- Decorative graphics are hidden from assistive technology. Existing dialog and tab semantics are retained. Hidden hero buttons are inert during the cinematic scene and restored when reversing or selecting reduced motion.
- No wheel prevention, touch interception, scroll physics replacement, audio, flashing, or forced scroll movement.

## Reused artwork and future asset specifications

Reused unchanged: `assets/home/hero-v2.png`, `features-v2.png`, `closing-v2.png`, `assets/garden/scene-v1.png`, the shared SVG sprout logo, and the existing icon symbols.

No character sheet was cut into body parts. The feature sheet is an existing four-illustration grid; its intended quadrants remain CSS crops, with centered subjects.

The next material art improvement would be a true foreground/background split, allowing the rear ribbon to pass *behind* the mascot rather than over the flat illustration. Recommended exports:

- **Mascot poses:** reading, noticing a distraction, eyes-closed calm, looking at a seed, and tending a plant. Each 1,200×1,400px RGBA PNG or lossless WebP, identical canvas size, lighting, palette, outline weight, and foot baseline; 10% transparent padding; no baked background, lettering, or cast shadow. Preserve the original face/sprout proportions. Separate soft contact shadow as an optional layer. Whole-pose swaps are sufficient; no limb rig is required.
- **Landscape plates:** 2,880×1,800px desktop and 1,170×1,800px mobile. Export sky/hills, middle-ground garden, and foreground foliage separately. Foreground/middle-ground layers need transparent backgrounds and 15% overscan. Supply both sparse and healthy garden variants from the same camera.
- **Seed-to-plant set:** the same recognizable seed, two-leaf seedling, and final plant in a common 512×768px transparent canvas, consistent ground baseline and palette. Prefer layered SVG with named seed/stem/leaf groups, or matching transparent PNG poses.

The current version uses safe whole-image movement and existing scene art instead of pretending those missing layers exist. It does not animate facial features or walking.

## Verification and performance limits

Rendered screenshots were inspected in local Chrome at 1440×1000, 1024×900, 768×900, and 390×844, across the opening, loop, seed, and roots/features. The second polish pass corrected subject crops, mobile typography, footer contrast, loop bounds, root continuity, and unnecessary per-frame text replacement.

The automated suite passes: velocity response, stillness → seed, continuing without stopping, reverse/reset, restored mid-page refresh, resize/breakpoint cleanup, pause/resume, live reduced-motion changes, unchanged practice interactions, no-JavaScript readability, no horizontal overflow, and no uncaught browser errors.

Run with a server serving `Client/` on port 8765 and Playwright available to Node:

```sh
node tests/home-story.test.cjs
```

Optional environment variables: `BASE_URL`, `CHROME_PATH`, and `NODE_PATH` for an externally supplied Playwright installation. No test package is required by the production page.

Remaining performance considerations:

- The existing four PNG illustrations total roughly 9MB uncompressed-on-network file size. Responsive WebP/AVIF exports would substantially improve cold loading; this change preserves the originals. Google Fonts is still external, with local font fallbacks.
- SVG path geometry is updated during the visible ribbon scene. Counts are bounded, but the test machine is not a substitute for physical low-end Android/iOS hardware testing.
- Responsive screenshots and the regression suite were run in Chrome. Safari/iOS and other browser-specific performance remain unmeasured; no universal 60fps claim is made.
- The scene uses sticky positioning and modern SVG/CSS, not scroll pinning spacers. Its visual renderer is progressive enhancement; core content remains available when animation dependencies fail.
