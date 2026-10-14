# DeepSprout client

A static HTML, CSS, and JavaScript implementation of the supplied DeepSprout mockups. Open `index.html` or serve this folder locally:

```sh
python3 -m http.server 8765
```

Pages: `index.html` (Home), `landing.html` (the former animated landing page), `onboarding.html`, `lab.html`, `recovery-plan.html`, `weekly-review.html`, `training.html` (Activities), `shield.html`, `garden.html`, `insights.html`, `explore.html`, `community.html`, `profile.html`, `pricing.html`, `login.html`, and `register.html`. Home content lives in `index.html` with its CSS and JS under `src/pages/public/home/`. Most other root files redirect to their page folder.

## The individual cycle

The whole journey for a regular user runs end to end, in this order:

1. **Register** → `src/pages/member/onboarding/onboarding.html` — Meet Bimo, Before We Begin, then eight quick setup questions.
2. **Lab** → `src/pages/member/lab/` — the four baseline instruments. All four genuinely run: a questionnaire, a sustained-attention task, a go/no-go task, and a passage with comprehension questions. `assessment.html?test=<id>` runs one; `lab.html` is the hub with status and retest eligibility.
3. **Your Starting Point** → `src/pages/member/onboarding/starting-point.html` — four separate results, a short plan-building transition, a plan preview, and **Activate My Plan**.
4. **The running plan** — Recovery Plan, Activities (including the offline-routine checklist), Digital Shield, Garden, Insights.
5. **Weekly Review** → `src/pages/member/weekly-review/weekly-review.html` — what was recorded, two questions, and a choice for next week.
6. **Explore** and **Profile & settings** are reachable from the navbar and account menu.

`src/js/utils/storage.js` holds the shared journey state (`deepsprout-user-v1`): setup answers, assessment attempts, the active plan, the offline routine, activity log and registrations. Every page reads and writes that one record, which is what keeps the cycle joined up. It is browser-local only — there is no backend, no AI and no account service in this build.

Profile & settings has a **Reset everything** control so the full cycle can be demonstrated more than once on the same machine.

## Tests

```sh
node tests/page-wiring.test.cjs      # element ids, icon symbols and asset paths resolve
node tests/member-journey.test.cjs   # the whole individual cycle, in jsdom
```

The journey test needs `jsdom`; without it the test reports that it was skipped and exits cleanly. To run it against a jsdom installed elsewhere: `NODE_PATH=/path/to/node_modules node tests/member-journey.test.cjs`.

`tests/seed-demo.html` is a demo helper: opening it writes a mid-journey state (setup answers, four assessment results, an active day-7 plan, a routine and some history) and redirects, so the later screens can be shown without walking the whole first run. `tests/seed-demo.html?go=/weekly-review.html` jumps to a specific page.

## Shared structure

- `src/styles/theme.css` owns the common colors, typography, and design tokens. Each page loads this after its own stylesheet so the shared tokens stay consistent.
- `src/layouts/member-layout/member-layout.js` renders the shared Home and member navigation and footer, including the responsive menu and illustrated page-transition loader. `member-layout.css` styles them. The former landing page and Pricing retain the public `site-layout`.
- `assets/` contains illustration files, with each illustration's prompt notes beside it.
- Login and Register use `src/assets/backgrounds/image.png`, the same DM Sans typography and card styling, and the reusable footer in `src/layouts/auth-footer/`. Register builds on the Login styles with its own form layout. Both forms and their text remain live HTML.
- `src/styles/page-hero.css` is the shared hero for Roadmap, Activities, Digital Shield, Insights and Community: one fixed-height frame with copy on the left and art on the right.
- Digital Shield preferences are local browser preview data. The Digital Shield preview does not block apps or provide browser protection.

Garden draws one isometric plot per week of the active plan (one plot before a plan exists). Each practice or offline-routine day logged that week grows its plot through five stages: seed, sprout, sapling, tree, blossom. Four rewards unlock on visible rules: New Flower (3 practices), Special Bloom (first weekly review), Garden Decor (5 routine days) and Visual Effect (something recorded on 5 different days). There is no XP. Home, Roadmap, Activities and Garden all read their numbers from `DeepSprout.stats()` in `src/js/utils/storage.js`, which counts only what was recorded on this device; nothing in this build measures screen time, so no screen-time figure is shown. Insights still displays illustrative sample data.

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
