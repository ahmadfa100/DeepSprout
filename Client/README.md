# DeepSprout client

A static HTML, CSS, and JavaScript implementation of the supplied DeepSprout mockups. Open `index.html` or serve this folder locally:

```sh
python3 -m http.server 8765
```

Pages: `index.html` (Home), `landing.html` (the former animated landing page), `recovery-plan.html`, `training.html` (Activities), `shield.html`, `garden.html`, `insights.html`, `community.html`, `pricing.html`, `login.html`, and `register.html`. Home content lives in `index.html` with its CSS and JS under `src/pages/public/home/`. Most other root files redirect to their page folder. The old Lab URLs redirect to Activities.

## Shared structure

- `src/styles/theme.css` owns the common colors, typography, and design tokens. Each page loads this after its own stylesheet so the shared tokens stay consistent.
- `src/layouts/member-layout/member-layout.js` renders the shared Home and member navigation and footer, including the responsive menu and illustrated page-transition loader. `member-layout.css` styles them. The former landing page and Pricing retain the public `site-layout`.
- `assets/` contains illustration files, with each illustration's prompt notes beside it.
- Login and Register use `src/assets/backgrounds/image.png`, the same DM Sans typography and card styling, and the reusable footer in `src/layouts/auth-footer/`. Register builds on the Login styles with its own form layout. Both forms and their text remain live HTML.
- Goal and mission choices on Home, plus Digital Shield preferences, are local browser preview data. The Digital Shield preview does not block apps or provide browser protection.

Garden includes interactive plot details, links to matching Training activities, a daily watering action, progress animation, and locally stored XP. Completing a Training session adds 20 Garden XP and one session; watering adds 10 XP once per local day. The starting values shown in the design are sample values, and browser local storage keeps changes on the same device. Insights also displays illustrative local data, not account analytics. Pricing plan details are interactive; checkout is not connected.

Community reproduces the supplied 1440 × 960 SVG with live cards, filters, search, post composer, likes, comments, bookmarks, challenge toggle, and responsive layouts. New posts, likes, bookmarks, and challenge membership are demo data stored on the same device; there is no community backend.

Login validates email and password, toggles password visibility, and links to Register. Register validates name, email, password length, password confirmation, and acceptance of terms. Both pages show clear messages for actions needing a backend, including social sign-in. Authentication is not connected to a backend, and credentials are never sent or saved.

Animations follow the user's reduced-motion preference. No framework or build step is required.

## Landing: Break the Loop

The former landing page at `landing.html` is a continuous attention story: garden → distractions → infinity ribbon → stillness → seed → roots → path → garden. Scrolling remains native. Stop in the loop for about 1.3 seconds to let the world settle, or keep scrolling to continue through the fallback.

- `src/pages/public/landing/animations/scroll-story.js` owns the state, filtered velocity, stillness, camera/seed handoff, and root/journey reveals.
- `animations/loop-scene.js` projects a shaded SVG ribbon and HTML feed fragments, then unfolds the same geometry into a path. No Three.js/WebGL dependency is needed.
- `animations/story.css` contains scene styling and separate mobile/reduced-motion layouts.
- `animations/growth-system.js` ties the sample garden's growth to intentional habit controls.
- `animations/motion-preferences.js` remains the small shared preference helper. The older pointer `micro-interactions.js` is no longer loaded by this page.

GSAP 3.13.0 and ScrollTrigger remain bundled locally in `assets/vendor/gsap/`; their license headers are retained. There is no framework, package installation, or build step for the site. Reduced motion and failed/missing animation libraries produce a readable static page. Existing artwork is flat, so mascot movement remains a whole-image treatment.

See [the implementation handoff](docs/break-the-loop.md) for scenes, architecture, all changed files, asset requirements, device behavior, and performance limits.

A browser regression suite lives at `tests/home-story.test.cjs`. With this folder served on port 8765 and Playwright available to Node, run `node tests/home-story.test.cjs`. Set `BASE_URL` for another local origin, `CHROME_PATH` for an installed Chromium browser, and `NODE_PATH` if using an external Playwright installation. These are test-only dependencies.

## Admin demo

The Login page includes **Continue as Admin (Demo)**. It opens a separate, responsive Admin workspace at `admin.html#/dashboard` with all management, recovery operations, Content Studio, community moderation, analytics, settings, and audit screens. Admin records persist locally across navigation and refreshes. Published activities appear in Training as previews; published Content Studio regions appear on the public landing page. See [Admin architecture and demo boundaries](docs/admin-cycle.md).
