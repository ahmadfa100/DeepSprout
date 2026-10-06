# DeepSprout client

A static HTML, CSS, and JavaScript implementation of the supplied DeepSprout mockups. Open `index.html` or serve this folder locally:

```sh
python3 -m http.server 8765
```

Pages: `index.html` (Home), `recovery-plan.html`, `training.html`, `garden.html`, `insights.html`, and `pricing.html`. Each root file is a small redirect to the page's own folder under `src/pages/public/` or `src/pages/member/`. Every implemented page keeps its HTML, CSS, and JavaScript together in that folder.

## Shared structure

- `src/styles/theme.css` owns the common colors, typography, and design tokens. Each page loads this after its own stylesheet so the shared tokens stay consistent.
- `src/layouts/site-layout/site-layout.js` renders the shared navigation and footer into the page's `data-site-header` and `data-site-footer` mounts. `site-layout.css` styles them. The layout also owns mobile-menu and scrolled-header behavior.
- `assets/` contains illustration files, with each illustration's prompt notes beside it.
- The older zero-byte component/layout/style files in `src/` are unused scaffolding. They are not loaded by the implemented pages.

Garden includes interactive plot details, links to matching Training activities, a daily watering action, progress animation, and locally stored XP. Completing a Training session adds 20 Garden XP and one session; watering adds 10 XP once per local day. The starting values shown in the design are sample values, and browser local storage keeps changes on the same device. Insights also displays illustrative local data, not account analytics. Pricing plan details are interactive; checkout is not connected.

Animations follow the user's reduced-motion preference. No framework or build step is required.
