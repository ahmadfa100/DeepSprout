# Living registration

Implemented directly in the existing HTML/CSS/ES-module client. This repository has no Angular application, backend authentication service or build pipeline. Existing browser-local account, verification, application and invitation commands remain the source of truth. No password is persisted or used by the animation system; the UI does not claim production account creation.

## Entry and architecture

- `register.html` still resolves to `src/pages/auth/register/register.html`. Initial view has exactly two choices. `#individual` opens the existing account form; `#partner` opens Mentor / Coach, Institution Representative and Outdoor Provider, plus the existing institution invitation link.
- `workspaces.html#/auth/register` and `/auth/register/partner` use the same chooser. Partner account, verification, application and invitation routes retain the world without replacing its canvas during hash navigation.
- `experience/living-world.js` owns the canvas, stable topology, interpolated identities, pointer response, capped ripple propagation and field activity envelope. Roots and network use the same points and edges, not swapped assets. Signals travel existing Bézier connections. Person, institution and outdoor glyphs emerge at selected nodes.
- `experience/entry.js` owns reusable chooser markup, pressed-state buttons, keyboard-compatible selection and restrained card depth response.
- `experience/workspace-entry.js` adapts the existing workspace router and owns route/form listener cleanup. `app.js` adds the lifecycle and submission feedback hooks; `pages/auth.js` reuses the chooser. Business commands are unchanged.
- `experience/experience.css` scopes styling to registration. Existing brand artwork and typography are retained. Login and operational workspace styling are unaffected.
- `register.js` preserves existing validation, password visibility, informational dialogs and local account creation. It adds progression, valid-state styling, a submission guard, unavailable-service failure handling and lifecycle cleanup.

## Motion and accessibility

Focus and typing pass only generic event kinds and field indices to the renderer. It does not inspect field values. Activity is bounded to four traveling signals (at most one per 110 ms), five ripples and a decaying intensity envelope. Pointer coordinates are interpolated; fields never move on focus. The scene uses 13 fixed nodes, with a smaller visible subgraph on small screens. Pixel ratio is capped at two, idle rendering targets 30 fps, and slow frames lower its update rate.

Reduced motion renders still but distinct identities on demand; no idle frame loop remains. Hidden documents cancel the animation frame. Route exit/pagehide abort listeners, disconnect the resize observer and cancel frames; restored pages recreate one scene. Canvas height is independent of viewport height, preventing a virtual-keyboard resize from reseeding or resetting geometry. Mobile input text is 16 px to avoid automatic input zoom.

Buttons expose pressed state and visible focus. Hidden steps leave the tab order. Progression moves focus to the new heading or main landmark. All forms keep labels, error associations and native validation where used. Artwork is decorative and hidden from assistive technology.

## Validation, 16 October 2026

`tests/register-experience.test.cjs` passed in headless Chrome against the running preview server, with zero page errors. It covers:

- Repeated mode reversal on the same canvas; two top-level and three secondary choices.
- Keyboard selection/progression, background clicks, field focus, rapid typing, password visibility and accessible validation.
- Missing service retry, local registration, onboarding navigation and duplicate email rejection.
- Password non-persistence and an input getter trap demonstrating that the environment does not read field contents.
- Partner scene continuity, invitation entry and animation removal on route exit.
- Still reduced-motion scenes, stopping/resuming on visibility changes.
- 320, 390 and 768 px layouts, no horizontal overflow, keyboard-sized viewport stability and touch feedback.

Additional browser checks passed for Partner mobile layout, keyboard focus after route progression and pagehide/pageshow restoration. The existing `page-wiring.test.cjs` passed (14 pages); changed JavaScript passed syntax checks and the diff passed whitespace checks. This static client has no build command.

The unmodified legacy `partner-entry.test.cjs` stops at an outdated Mentor dashboard heading assertion (`Create Your First Group`), outside registration. A temporary run omitting only that copy assertion passed all three account → simulated OTP → application → seven review statuses → approved workspace flows, existing identity reuse, password non-persistence, storage isolation and unique control IDs. This is not a claim that the unmodified legacy suite passes.

Run:

```sh
python3 Client/serve.py --port 8765
BASE_URL=http://127.0.0.1:8765 NODE_PATH=/path/to/node_modules node Client/tests/register-experience.test.cjs
```

Requires Playwright and Chrome (or set `CHROME_PATH`). Captures and the machine-readable report default to `/tmp/deepsprout-register-validation`; override with `REGISTER_CAPTURE_DIR`. No runtime dependencies were added.
