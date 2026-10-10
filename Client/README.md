# DeepSprout client

A static HTML, CSS, and JavaScript implementation of the supplied DeepSprout mockups. Open `index.html` or serve this folder locally:

```sh
python3 -m http.server 8765
```

Pages: `index.html` (Home), `recovery-plan.html`, `training.html`, `garden.html`, `insights.html`, `pricing.html`, `login.html`, and `register.html`. Each root file is a small redirect to the page's own folder under `src/pages/public/`, `src/pages/member/`, or `src/pages/auth/`. Every implemented page keeps its HTML, CSS, and JavaScript together in that folder.

## Shared structure

- `src/styles/theme.css` owns the common colors, typography, and design tokens. Each page loads this after its own stylesheet so the shared tokens stay consistent.
- `src/layouts/site-layout/site-layout.js` renders the shared navigation and footer into the page's `data-site-header` and `data-site-footer` mounts. `site-layout.css` styles them. The layout also owns mobile-menu and scrolled-header behavior.
- `assets/` contains illustration files, with each illustration's prompt notes beside it.
- Login and Register use their supplied SVGs as decorative landscapes and share the floral mark embedded in those SVGs as a local image. Their forms, footer, buttons, and text are live HTML. The auth footer is a variant of the shared site layout, and `src/styles/auth.css` contains their common styles.
- The older zero-byte component/layout/style files in `src/` are unused scaffolding. They are not loaded by the implemented pages.

Garden includes interactive plot details, links to matching Training activities, a daily watering action, progress animation, and locally stored XP. Completing a Training session adds 20 Garden XP and one session; watering adds 10 XP once per local day. The starting values shown in the design are sample values, and browser local storage keeps changes on the same device. Insights also displays illustrative local data, not account analytics. Pricing plan details are interactive; checkout is not connected.

Login validates email and password, toggles password visibility, and links to Register. Register validates name, email, password length, password confirmation, and acceptance of terms. Both pages show clear messages for actions needing a backend, including social sign-in. Authentication is not connected to a backend, and credentials are never sent or saved.

Animations follow the user's reduced-motion preference. No framework or build step is required.

## Home: Break the Loop

The homepage is a continuous attention story: garden → distractions → infinity ribbon → stillness → seed → roots → path → garden. Scrolling remains native. Stop in the loop for about 1.3 seconds to let the world settle, or keep scrolling to continue through the fallback.

- `src/pages/public/home/animations/scroll-story.js` owns the state, filtered velocity, stillness, camera/seed handoff, and root/journey reveals.
- `animations/loop-scene.js` projects a shaded SVG ribbon and HTML feed fragments, then unfolds the same geometry into a path. No Three.js/WebGL dependency is needed.
- `animations/story.css` contains scene styling and separate mobile/reduced-motion layouts.
- `animations/growth-system.js` ties the sample garden's growth to intentional habit controls.
- `animations/motion-preferences.js` remains the small shared preference helper. The older pointer `micro-interactions.js` is no longer loaded by this page.

GSAP 3.13.0 and ScrollTrigger remain bundled locally in `assets/vendor/gsap/`; their license headers are retained. There is no framework, package installation, or build step for the site. Reduced motion and failed/missing animation libraries produce a readable static page. Existing artwork is flat, so mascot movement remains a whole-image treatment.

See [the implementation handoff](docs/break-the-loop.md) for scenes, architecture, all changed files, asset requirements, device behavior, and performance limits.

A browser regression suite lives at `tests/home-story.test.cjs`. With this folder served on port 8765 and Playwright available to Node, run `node tests/home-story.test.cjs`. Set `BASE_URL` for another local origin, `CHROME_PATH` for an installed Chromium browser, and `NODE_PATH` if using an external Playwright installation. These are test-only dependencies.
