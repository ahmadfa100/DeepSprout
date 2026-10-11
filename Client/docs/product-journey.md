# DeepSprout product journey

## Preview

The journey is part of the existing prototype, immediately after the research section:

```sh
cd Client
python3 -m http.server 8792 --bind 127.0.0.1
```

Open `http://127.0.0.1:8792/hero-reels-lab.html#product-journey`.
Scroll normally, use the six chapter links, or choose **Skip to the invitation**.
**View without motion** opens the same content in normal document flow. It is
also the default for reduced motion, disabled JavaScript, and viewports shorter
than 600 pixels, where a pinned interface would be too small to read.

The invitation links to the supplied Tally waitlist, `https://tally.so/r/QKgA0G`.
No existing waitlist destination was configured in the inspected Client source.
No form submission, product account creation, or assessment persistence is implemented.

## Integration and files

- `hero-reels-lab.html`: seven semantic beats, sample interfaces, chapter links,
  invitation, and a small connecting line at the end of research.
- `src/styles/journey/journey.css`: scoped typography, interfaces, portrait
  layouts, pinned stage and readable fallbacks.
- `src/js/journey/journey.js`: DOM assembly, cached geometry, native scroll
  scheduling, object continuity, scene contents, navigation and cleanup.
- `src/js/journey/choreography.js`: pure camera poses, chapter bounds, equal-point
  stroke geometry, sample chart data and a deterministic community lattice.
- `src/js/journey/camera.js`: the virtual camera's CSS transform and viewport fit.
- `src/js/journey/network.js`: one shared SVG graph, path growth, nodes and pulses.
- `src/js/journey/garden.js`: editable bed, seedling, leaves, flower, shrub and tree;
  growth stages and three reusable garden combinations.
- `assets/journey/garden.svg`: native vector illustration for the no-JS fallback.
- `tests/product-journey.test.cjs`: browser and geometry validation.
- `references/product-journey-validation/`: desktop/mobile scenes, connecting
  beats, responsive/fallback screenshots and validation report.

The new module has its own lifecycle. It does not change the hero's intro gate,
Rive inputs, reels choreography, vortex renderer, portal or research reveal logic.
No Bimo or other character is mounted in the product journey. The member pages,
legacy homepage and Rive experiments are unchanged by this addition.

## Camera and pacing

One sticky viewport uses a master scroll range of 10.5 viewport heights on
desktop and 11.8 on portrait mobile, plus its final viewport. There is no wheel
interception, scroll lock or independent scene scroll position.

The interfaces occupy a single coordinate system around the garden. The camera
travels between their anchors using smooth, bounded position, zoom, roll and
pitch keys. It holds during readable product demonstrations. Earlier interfaces
contract back into their network nodes as the camera moves onward.

The copy remains on a stable editorial plane, with masked entrances. Mobile
uses a portrait roadmap, different anchors, less roll, a denser community
lattice, and a lower final composition to leave the invitation clear.

Every pose is a function of absolute scroll progress. There are no random
forces, one-shot animation flags or timer-driven completions. Reversing returns
to the same questions, selections, task completions, plant stages and paths.

## Connected scene transitions

| Beat | Continuity |
| --- | --- |
| Research → assessment | The green research thread leads into a sparse graph. The camera approaches a node; its circular mask and outline open into the assessment. |
| Assessment → plan | Three masked sample questions demonstrate selections. Saved answer indicators detach and travel to the roadmap's milestone positions. The roadmap draws through those nodes. |
| Plan → activities | The camera approaches Week 01. A shared circular carrier opens into the Week 1 interface frame while the previous roadmap recedes. |
| Activities → timer | Two tasks complete, their timeline and progress advance, and Week 2 appears behind the shifted first week. The focus activity's ring travels into the larger timer ring. |
| Timer → analytics | A compressed 25-minute sample completes. The **same SVG stroke** unwraps into an open arc, flattens, then takes the chart's shape. It does not cross itself or swap to a second chart stroke. |
| Analytics → garden | The last chart point becomes the seed carrier, travels toward the garden, and lands at the sprout's base. Growth follows achievement pulses. |
| Garden → community | The original garden stays mounted. The camera orbits subtly, rises and continues pulling back as 34 additional garden instances emerge from connected nodes. |
| Community → invitation | The field settles, the community headline holds, then the invitation enters on the same cream stage. |

## One network, with memory

The same SVG graph connects assessment branches, the roadmap, completed
activities, focus tracking, the seed and all community gardens. Connections draw
progressively; their activated state is retained at later forward progress.
Reverse scroll intentionally restores the corresponding earlier graph.

Pulses are dots sampled from the exact cubic Bézier geometry of a connecting
path. They travel between nodes rather than flashing the background. Rear
branches have restrained parallax; their pulse coordinates receive the same
offset. Garden growth and community connections use fixed scroll events.
Strokes remain legible during the final pullback.

The graph is a **visual metaphor for habits and connection**, not a representation
of measured neurological activity. All questions, sessions, achievements and
community interactions are illustrative. There are no invented real members,
testimonials or user counts. The sample chart's five sessions total 125 minutes.

## Performance, accessibility and assets

The controller schedules one animation frame in response to scroll or resize.
It has no perpetual RAF loop. Geometry is cached outside render; hidden tabs
cancel pending work, and offscreen scrolling does not render the journey.
Listeners use an abort signal and resources are cleaned up on navigation;
back/forward-cache restoration remeasures and resumes. Garden instances share
SVG symbols instead of duplicating their full artwork.

Semantic headings, descriptions, native links, keyboard chapter navigation and
the waitlist remain available. Motion can be disabled without losing content.
The static fallback uses the same scene DOM, not an unrelated screenshot.

No additional runtime dependency is needed: this section uses native DOM, CSS,
SVG and browser animation frames. It reuses the existing local Inter fonts.
Existing GSAP/Rive/Three.js continue serving the preceding story only.

The inspected garden PNG includes scenery and a robot, so it is not used here.
The new vector fallback uses soft organic outlines, muted botanical colours,
gentle gradient shading and a small defined planting bed. It is intentionally
an illustration rather than a realistic garden. Optional brand-authored SVG
plant species and a few alternate bed compositions could add more individual
character to the community; they are not required to run the experience.

To regenerate the static asset after editing garden geometry:

```sh
node --input-type=module -e "import fs from 'node:fs'; import {staticGardenSVG} from './src/js/journey/garden.js'; fs.writeFileSync('assets/journey/garden.svg',staticGardenSVG());"
```

## Review and validation

Append `?journeyDebug` to the page URL to expose the local review API:

```js
productJourney.seek(2.75);  // Roadmap hold; range is 0–10.5.
productJourney.seek(5.95);  // Timer stroke unwrapping.
productJourney.seek(8.13);  // Complete personal garden.
productJourney.seek(9.48);  // Community hold.
productJourney.state;      // Camera, graph, lifecycle and render counters.
```

`?reelsDebug&journeyDebug` also enables the existing preceding-story review API.
Review APIs are absent from the public URL unless requested.

Run the browser checks with Node and Playwright available:

```sh
REELS_URL=http://127.0.0.1:8792 node tests/product-journey.test.cjs
REELS_URL=http://127.0.0.1:8792 node tests/vortex-clarity.test.cjs
REELS_URL=http://127.0.0.1:8792 node tests/reels-experience.test.cjs
REELS_URL=http://127.0.0.1:8792 node tests/reels-pacing.test.cjs
REELS_URL=http://127.0.0.1:8792 node tests/reels-lifecycle.test.cjs
```

The journey checks cover equal-point path geometry, continuous deterministic
camera movement, all scene and transition screenshots, reverse/rapid native
scroll, retained connection memory, persistent object identity, no idle or
offscreen frames, chapter/skip/CTA links, static-view switching, tablet, narrow
phone, landscape, reduced motion, disabled JS and horizontal overflow.
The earlier suites protect the already approved story.

### Completed checks

Validated on 11 October 2026. The product journey suite and all four existing
story suites passed. Saved reports and desktop/mobile screenshots are in
`references/product-journey-validation/`; `regressions.json` records the existing
story results. The live in-app browser was also checked at its compact viewport
and at the desktop breakpoint. The compact view uses normal document flow.

The geometry checks additionally verify that intermediate timer/chart paths
never cross themselves and that visible pulses remain on their actual SVG
connections after camera and depth transforms.
