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

## Home scroll story

The Home page keeps its markup and existing practice demos in `src/pages/public/home/`. Its story layer lives in `animations/`:

- `story.css` contains the scene styling and responsive/reduced-motion states.
- `motion-preferences.js` reads pointer and motion preferences.
- `growth-system.js` owns the page-wide growth stage and the interactive garden progress.
- `scroll-story.js` connects the noise-to-seed, trail, journey, and final planting scenes to native scroll with GSAP ScrollTrigger.
- `micro-interactions.js` adds a small desktop pointer response and cleans it up when media preferences change.

GSAP 3.13.0 and ScrollTrigger are pinned locally in `assets/vendor/gsap/`, so the page can be opened from `file://` without a CDN for its motion scripts. The bundled files retain their GreenSock license headers; see [GSAP's standard license](https://gsap.com/standard-license/). The existing hero and closing mascot illustrations are single flat images, so their animation is limited to subtle whole-image movement; limbs and facial features are not separated for rigging. The noise-to-seed and growth details are HTML/CSS/SVG. Native scrolling, keyboard access to controls, and static content remain available when motion is reduced or JavaScript animation is unavailable.
