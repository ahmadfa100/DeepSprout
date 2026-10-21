# Living registration

Implemented directly in the existing HTML/CSS/ES-module client. This repository has no Angular application, backend authentication service or build pipeline. Existing browser-local account, verification, application and invitation commands remain the source of truth. No password is persisted or used by the animation system; the UI does not claim production account creation.

## Entry and architecture

- `register.html` still resolves to `src/pages/auth/register/register.html`. The first view has exactly two choices: Join as Individual and Join as a Partner. `#individual` opens the existing account form; `#partner` opens Mentor / Coach, Institution Representative and Outdoor Provider, plus the existing institution invitation link. Selecting a card never navigates; only Continue does.
- `workspaces.html#/auth/register` and `/auth/register/partner` use the same chooser. Partner account, verification, application and invitation routes keep the same canvas during hash navigation.
- `experience/living-world.js` owns the editorial copy, a single white-field network canvas, the Individual ↔ Partner reorganisation and all signal propagation.
- `experience/glyphs.js` is the one line-icon set shared by the cards (inline SVG) and the network hubs (`Path2D`), so Mentor, Institution and Outdoor hubs use the same marks as the Partner subtype cards.
- `experience/entry.js` owns the chooser markup, pressed-state buttons, the mode-aware Continue label ("Continue as Individual" / "Continue as Partner") and the note that names the next step.
- `experience/workspace-entry.js` adapts the workspace router, asks the network to re-measure after each route render and owns listener cleanup. Business commands are unchanged.
- `experience/experience.css` scopes the composition to `body.living-register`. Login styling, shared tokens and operational workspaces are unaffected.

## The network

- **One graph, two layouts.** Every node has a stable identity and two deterministic targets. Individual is a calm constellation: a focal "you" node between the copy and the panel, a few loose clusters and quiet ambient nodes. Partner reorganises the same nodes into communities around icon hubs (Mentors, Institutions, Outdoor experiences, Communities, Workshops, Initiatives — as many as the free space allows), links hubs to each other and to the focal node, and reveals preallocated partner-only nodes that branch out of existing ones. Hubs illustrate the ecosystem; they are not registration roles.
- **Composition-aware placement.** Layouts are planned from the measured copy, panel and header rectangles: hubs and their labels only occupy open space, nodes are never placed under the panel, and anything crossing copy is veiled to low contrast.
- **Transformation.** Each node runs its own critically damped spring, started with a delay proportional to its distance from the chosen card, so expansion travels outward (about 1.1 s) and the return gathers from the edges. Reversing mid-transition is continuous; repeated switching allocates nothing new. Copy crossfades between "A little intention. A new beginning." and "Meaningful change grows together."
- **Signals.** Impulses travel along actual edges from a fixed pool of 44, with a hop limit, branching cap and a per-wave stamp per node (no growing per-node history). Background clicks activate the nearest node and add one small ring; card selection, Continue, field focus and typing emit progressively smaller, rate-limited impulses from the open edge beside the panel. Idle impulses are occasional: personal paths in Individual, hub-to-hub exchange in Partner.
- **Privacy.** Handlers pass only event kinds, field indices and element geometry. The renderer never reads field values, typed characters or key names.

## Motion, performance and accessibility

Delta-time simulation; idle drift renders at about 30 fps, transitions and signals at full rate; one requestAnimationFrame chain, cancelled while the document is hidden. Pixel ratio is capped at two. Glows use one pre-rendered sprite. The canvas height only grows for a given width, so a virtual keyboard never reflows or reseeds the scene. Background clicks on links, buttons, fields, labels, the panel and the header are ignored.

Reduced motion renders the matching still arrangement for each mode on demand, with no running loop and no impulses. The canvas is `aria-hidden` and ignores pointer events. Cards expose `aria-pressed`, the chooser keeps visible focus rings, the next-step note is announced politely, and progression moves focus to the new heading. Mobile input text is 16 px to avoid automatic zoom.

## Validation, 17 October 2026

Run against `python3 Client/serve.py --port 8791` in headless Chrome:

- `tests/register-experience.test.cjs` passed with zero page errors (two paths, rapid reversal on one canvas, keyboard flow, focus/typing signals, field-value trap, validation, unavailable-service recovery, local registration, partner routes, invitation, scene removal, reduced motion, hidden-page pause, 320/390/768 overflow, keyboard-sized viewport stability, touch taps).
- `tests/partner-browser.test.cjs` (with `SHOTS_DIR` outside the repository), `tests/round0-browser.test.cjs`, `tests/round2a-browser.test.cjs` and `tests/institution-browser.test.cjs` passed.
- Visual review of captured screenshots at 1920×1080, 1440×900, 1280×800, 1280×640, 820×1180, 768×1024, 844×390, 390×844, 360×740 and 320×640 in both modes, mid-transition frames, rapid switching, background-click propagation, reduced motion, keyboard focus and the workspaces account route at 1440 and 390.
- A simulated back/forward-cache `pagehide` → `pageshow` (persisted) leaves exactly one canvas and one copy host, and selection works afterwards.
- Not run: a screen reader pass, and real-GPU or device profiling. Performance figures below come from headless software rendering.
- Headless CDP measurement at 1440×900, 2× pixel ratio: roughly 30–50 ms of script per second while idle, a JS heap of about 3–6 MB, and an unchanged node count after repeated switching.

Run:

```sh
python3 Client/serve.py --port 8765
BASE_URL=http://127.0.0.1:8765 NODE_PATH=/path/to/node_modules node Client/tests/register-experience.test.cjs
```

Requires Playwright and Chrome (or set `CHROME_PATH`). Captures and the machine-readable report default to `/tmp/deepsprout-register-validation`; override with `REGISTER_CAPTURE_DIR`. No runtime dependencies were added.
