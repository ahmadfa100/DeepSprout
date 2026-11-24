# DeepSprout design guidance

Read [DeepSprout-DESIGN.md](DeepSprout-DESIGN.md) for visual direction and the [v4.1 P0 target](docs/architecture/p0-target-v4.1.md) for current role, registration and organizer scope. Exact colors, type sizes, spacing, radii, and Inter font are **provisional**, not approved brand tokens. Preserve the established ivory/sage identity while reconciling proposals with rendered UI before adopting them.

## Current implementation evidence

| Area | Proposed brief | Current checkout | Guidance |
| --- | --- | --- | --- |
| Color | Forest `#305B48`, ivory `#FFFCF6`, white `#FFFFFF`, sage tints | `src/DeepSprout.Web/wwwroot/src/styles/style.css` defines ink `#173C33`, pine `#123F34`, leaf `#168557`, background `#F7F8F2`, surface `#FFFEFA`, and white `#FFFFFF` | Keep the current palette for existing pages. Treat the proposed hex values as candidates for later visual review. |
| Type | Inter with proposed 48/32/24/16/14 px scale | Shared CSS uses DM Sans, with Fraunces as a display face in some areas. Pages load those fonts; limited Inter assets are also present under `src/DeepSprout.Web/wwwroot/assets/hero-v2/fonts/`. | Do not switch the site to Inter or standardize page typography from the brief without comparing rendered pages. |
| Spacing and shape | 4/8/16/24/32/48/80 px scale, 1200 px container, 8/14/20/28 px radii | Shared CSS has a measured 1180 px container, a finer spacing scale, and 14/22/26/28 px radii. | Existing shared CSS and page behavior take precedence until visual reconciliation. |
| Components | Restrained buttons, cards, inputs, and quiet surfaces | `src/DeepSprout.Web/wwwroot/src/` holds shared layouts, page styles and local overrides. | Reuse established patterns and inspect the rendered target before consolidating tokens. |
| Partner workspaces | Calm, dense operational layouts | `src/DeepSprout.Web/wwwroot/src/workspaces/ds-system.css` and `ds.js` (Nov 2026) add the shared workspace layer: KPI tiles, validated chart palette (green `#2f8051`, slate blue `#4c74b9`, ochre `#b97c0e` + labelled status tones), timeline, scenes, page transitions; DM Sans kept | Reuse `ds.js` components and the shared timeline before adding page-specific patterns; see the [redesign log](docs/implementation/partner-workspaces-v41-redesign.md) |
| Partner workspace theme | One unified look for Institution, Supervisor, Coach and invited Student | `src/DeepSprout.Web/wwwroot/src/workspaces/ds-theme.css` (Nov 2026, "Forest & Pearl", loaded last): `--dt-*` tokens, curved deep-forest sidebar with gold edge, floating frosted top bar, pearl cards, KPI tiles with icon badge (`ui.kpiIcon`) and silk wave, pill tabs with sliding indicator, pill buttons, styled inputs and drop-lists (`appearance: base-select` where supported), dialog/toast motion; reduced-motion and forced-colors safe | The visual reference for new partner pages: use `--dt-*` tokens and existing classes. Attendance pages (`data-page="attendance"`) are deliberately excluded from content theming |
| Azm | Approved original art only | Original references are in `docs/references/bimo/`; runtime artwork and Rive files are in `src/DeepSprout.Web/wwwroot/assets/`. | Preserve these assets. Do not generate a substitute Azm. |
| Garden | One clean white/ivory scene with one main plant | `wwwroot/src/pages/member/garden/` renders a single scene with four trees. The signed-in Garden and Home share a SQL evidence reader. | The one-plant direction requires separate design and reward-mapping review. |

## Scope and status

The MVC app serves Razor views and assets under `src/DeepSprout.Web`. For signed-in Individual and Community views, distinguish SQL data from local Lab, Shield and demo-partner data when designing results, error and empty states. The [current product guide](docs/current-product-guide.md) records the scope of browser verification. A full accessibility audit remains pending.
