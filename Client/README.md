# DeepSprout client

DeepSprout's current static HTML/CSS/JavaScript demonstration. The [authoritative v4.0 specification](../DeepSprout.md) covers the Individual, Institution Representative, Coach/Mentor, Invited Student, Outdoor Provider, Supervisor and one Platform Admin. The eventual stack is Angular plus ASP.NET Core/C#, EF Core and SQL Server. Serve this folder locally:

```sh
python3 serve.py --port 8765
```

Pages: `index.html` (Home), `landing.html` (the former animated landing page), `onboarding.html`, `lab.html`, `recovery-plan.html`, `weekly-review.html`, `training.html` (Activities), `shield.html`, `garden.html`, `insights.html`, `explore.html`, `community.html`, `profile.html`, `pricing.html`, `login.html`, and `register.html`. Home content lives in `index.html` with its CSS and JS under `src/pages/public/home/`. Most other root files redirect to their page folder.

`404.html` is the illustrated missing-page screen, with an animated SVG garden and Bimo, home and activity links, a pause control, and automatic reduced-motion support. The preview server above automatically displays it for any missing URL, including nested paths, while returning HTTP status 404. Try `/does-not-exist` to see it. Assets and recovery links use root-relative URLs so they also work at nested missing paths. For production, serve `Client/` as the site root and configure the host's missing-page handler to serve `/404.html` with HTTP status 404 (for example, Nginx `error_page 404 /404.html;` or Apache `ErrorDocument 404 /404.html`). Hosts with automatic `404.html` support need no extra rule.

For VS Code Live Server, open the **DeepSprout repository** as the workspace. `.vscode/settings.json` configures port **5501** and `liveServer.settings.file: "Client/404.html"`, so missing URLs such as `/Client/well/index.html` display the illustrated page. **Stop and restart Live Server after changing this setting.** The error page detects whether assets live at `/` or `/Client/` and keeps recovery links within the app. Live Server's fallback returns HTTP 200; use `serve.py` or a production error handler when an actual HTTP 404 status is required.

## Current Individual and partner cycles

The regular Individual routes include Register/Login, Bimo onboarding, four Lab tasks, Your Starting Point, Recovery Plan, Activities/Offline Routine, Digital Shield, Garden, Insights, Explore, Community and Profile. `src/pages/member/` contains most destination pages; root HTML files retain public entry URLs. `index.html` is the current Home entry. A fresh four-baseline-to-active-plan run is **not verified** on this working tree; Starting Point still reads the older `DeepSprout` store while several current pages read `DeepSproutAccount`. The earlier [cycle audit](../docs/cycles/README.md) found first-run breaks. Do not call the flow complete merely because all screens render.

`workspaces.html` and `partners.html` provide browser-local Institution, Coach, Invited Student, Outdoor Provider, Supervisor, partner Participant and Admin workflows. Their local command/state flows are richer than mock screens, but **regular** `explore.html` currently reads `src/data/listings.json` and separate Individual records; a new partner-published Initiative did not appear there in the dated browser audit. Identity, applications, bookings, assignments and Garden evidence still need one cross-workspace contract. The limited partner Participant view is not the regular Individual account.

The current personal Garden renders a journey tree plus achievement trees and dims after quiet days. The approved target is **exactly four practice-type trees** in one fixed Personal scene, bounded flower/rabbit/birdhouse effects and neutral no-data status. The current Lab opens official rechecks around the end of a plan cycle; the approved target opens eligibility weekly, using Digital Habits plus one rotating task as the current implementation direction. See [master §§4, 9 and 29](../DeepSprout.md).

The application uses multiple browser-local stores (`deepsprout-user-v1`, `deepsprout-account-changes-v1:<choice>`, `deepsprout-ecosystem-demo-v1` and legacy Admin data). No real login, email/OTP, payment, browser extension, secure QR, backend authorization or cross-device capacity guarantee is present. Demo prices and external-service outcomes must be labeled as illustrative or simulated.

## Tests

```sh
node tests/page-wiring.test.cjs      # element ids, icon symbols and asset paths resolve
node tests/member-journey.test.cjs   # the whole individual cycle, in jsdom
python3 tests/not-found-server.test.py # custom 404 responses, nested URLs, HEAD and normal assets
```

The journey test needs `jsdom`; without it the test reports that it was skipped and exits cleanly. To run it against a jsdom installed elsewhere: `NODE_PATH=/path/to/node_modules node tests/member-journey.test.cjs`.

`tests/seed-demo.html` is a demo helper: opening it writes a mid-journey state (setup answers, four assessment results, an active day-7 plan, a routine and some history) and redirects, so the later screens can be shown without walking the whole first run. `tests/seed-demo.html?go=/weekly-review.html` jumps to a specific page.

## Shared structure

- `src/styles/theme.css` owns the common colors, typography, and design tokens. Each page loads this after its own stylesheet so the shared tokens stay consistent.
- `src/layouts/member-layout/member-layout.js` renders the shared Home and member navigation and footer, including the responsive menu and illustrated page-transition loader. `member-layout.css` styles them. The former landing page and Pricing retain the public `site-layout`.
- `assets/` contains runtime media. Illustration prompt notes live in `docs/design/image-prompts/`; original design references live in `references/`, and test captures live in `docs/validation/`.
- Login and Register use `assets/auth/background.png`, the same DM Sans typography and card styling, and the reusable footer in `src/layouts/auth-footer/`. Register builds on the Login styles with its own form layout. Both forms and their text remain live HTML.
- `src/styles/page-hero.css` is the shared hero for Roadmap, Activities, Digital Shield, Insights and Community: one fixed-height frame with copy on the left and art on the right.
- Digital Shield preferences are local browser preview data. The Digital Shield preview does not block apps or provide browser protection.

Garden and Insights currently read `DeepSproutAccount` records, while some onboarding paths still use `DeepSprout`/`storage.js`; inspect the specific route before relying on a shared-state claim. The Personal Garden and official reassessment behavior in the current code differ from the owner-approved target described above. Current source-specific metrics must never be described as verified cross-workspace analytics.

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

See [the implementation handoff](docs/experience/break-the-loop.md) for scenes, architecture, all changed files, asset requirements, device behavior, and performance limits.

A browser regression suite lives at `tests/home-story.test.cjs`. With this folder served on port 8765 and Playwright available to Node, run `node tests/home-story.test.cjs`. Set `BASE_URL` for another local origin, `CHROME_PATH` for an installed Chromium browser, and `NODE_PATH` if using an external Playwright installation. These are test-only dependencies.

## Admin demo

The Login page includes the explicitly simulated **Continue as Admin (Demo)** shortcut. It opens a separate, responsive legacy Admin workspace at `admin.html#/dashboard` with all management, recovery operations, Content Studio, community moderation, subscriptions and revenue, settings, and audit screens. Platform analytics live on Dashboard. Admin records persist locally across navigation and refreshes. Published activities appear in Training as previews; published Content Studio regions appear on the public landing page. See [the dated Admin architecture report](docs/architecture/admin-cycle.md) and the [Admin/member IA and integration audit](docs/architecture/admin-member-ia-audit.md).

## File organization

See the [documentation index](docs/README.md), [dated cross-workspace audit](../docs/cycles/README.md) and [authoritative master](../DeepSprout.md), [asset guide](assets/README.md), and [reference guide](references/README.md). Runtime artwork is consolidated under `assets/`; `src/` contains application source and local demo data. Root HTML files remain stable public entry URLs and animation labs.
