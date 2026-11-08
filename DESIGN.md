# DeepSprout design guidance

Read [DeepSprout-DESIGN.md](DeepSprout-DESIGN.md) for visual direction and the [v4.1 P0 target](docs/architecture/p0-target-v4.1.md) for current role, registration and organizer scope. Exact colors, type sizes, spacing, radii, and Inter font are **provisional**, not approved brand tokens. Preserve the established ivory/sage identity while reconciling proposals with rendered UI before adopting them.

## Current implementation evidence

| Area | Proposed brief | Current checkout | Guidance |
| --- | --- | --- | --- |
| Color | Forest `#305B48`, ivory `#FFFCF6`, white `#FFFFFF`, sage tints | `src/DeepSprout.Web/wwwroot/src/styles/style.css` defines ink `#173C33`, pine `#123F34`, leaf `#168557`, background `#F7F8F2`, surface `#FFFEFA`, and white `#FFFFFF` | Keep the current palette for existing pages. Treat the proposed hex values as candidates for later visual review. |
| Type | Inter with proposed 48/32/24/16/14 px scale | Shared CSS uses DM Sans, with Fraunces as a display face in some areas. Pages load those fonts; limited Inter assets are also present under `src/DeepSprout.Web/wwwroot/assets/hero-v2/fonts/`. | Do not switch the site to Inter or standardize page typography from the brief without comparing rendered pages. |
| Spacing and shape | 4/8/16/24/32/48/80 px scale, 1200 px container, 8/14/20/28 px radii | Shared CSS has a measured 1180 px container, a finer spacing scale, and 14/22/26/28 px radii. | Existing shared CSS and page behavior take precedence until visual reconciliation. |
| Components | Restrained buttons, cards, inputs, and quiet surfaces | `Client/src/layouts/`, `Client/src/pages/`, and `Client/src/styles/` contain working page and layout styles, including some local overrides. | Reuse established patterns and inspect the rendered target before consolidating tokens. |
| Partner workspaces | Calm, dense operational layouts | `src/DeepSprout.Web/wwwroot/src/workspaces/ds-system.css` and `ds.js` (Nov 2026) add the shared workspace layer: KPI tiles, validated chart palette (green `#2f8051`, slate blue `#4c74b9`, ochre `#b97c0e` + labelled status tones), timeline, scenes, page transitions; DM Sans kept | Reuse `ds.js` components and the shared timeline before adding page-specific patterns; see the [redesign log](docs/implementation/partner-workspaces-v41-redesign.md) |
| Bimo | Approved original art only | Original references are in `docs/references/bimo/`; runtime artwork and Rive files are in `src/DeepSprout.Web/wwwroot/assets/`. | Preserve these assets. Do not generate a substitute Bimo. |
| Garden | One clean white/ivory scene with one main plant | `Client/src/pages/member/garden/` currently renders a single scene with four small trees. | The one-plant direction is a future design change requiring a separate scoped implementation and product review. Do not alter Garden behavior during setup. |

## Scope and status

The browser-local HTML/CSS/JavaScript demonstration is served through Razor views in the ASP.NET Core MVC solution under `src/DeepSprout.Web`; runtime assets are in `src/DeepSprout.Web/wwwroot`. EF Core/SQL Server work exists separately; product interactions have not all moved to server persistence. Use this design guidance after inspecting actual styles, components and rendered pages. This file records a source comparison only, not browser or accessibility validation. The one-main-plant Garden direction remains separately scoped.
