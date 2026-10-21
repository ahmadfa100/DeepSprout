# DeepSprout design guidance

Read [DeepSprout-DESIGN.md](DeepSprout-DESIGN.md) for the proposed visual direction and product-specific screen guidance. Its exact colors, type sizes, spacing, radii, and Inter font are **provisional**, not approved brand tokens. Preserve the established ivory/sage identity while reconciling proposals with the rendered UI and the owner before adopting them.

## Current implementation evidence

| Area | Proposed brief | Current checkout | Guidance |
| --- | --- | --- | --- |
| Color | Forest `#305B48`, ivory `#FFFCF6`, white `#FFFFFF`, sage tints | `Client/src/styles/style.css` defines ink `#173C33`, pine `#123F34`, leaf `#168557`, background `#F7F8F2`, surface `#FFFEFA`, and white `#FFFFFF` | Keep the current palette for existing pages. Treat the proposed hex values as candidates for later visual review. |
| Type | Inter with proposed 48/32/24/16/14 px scale | Shared CSS uses DM Sans, with Fraunces as a display face in some areas. Pages load those fonts; limited Inter assets are also present under `Client/assets/hero-v2/fonts/`. | Do not switch the site to Inter or standardize page typography from the brief without comparing rendered pages. |
| Spacing and shape | 4/8/16/24/32/48/80 px scale, 1200 px container, 8/14/20/28 px radii | Shared CSS has a measured 1180 px container, a finer spacing scale, and 14/22/26/28 px radii. | Existing shared CSS and page behavior take precedence until visual reconciliation. |
| Components | Restrained buttons, cards, inputs, and quiet surfaces | `Client/src/layouts/`, `Client/src/pages/`, and `Client/src/styles/` contain working page and layout styles, including some local overrides. | Reuse established patterns and inspect the rendered target before consolidating tokens. |
| Bimo | Approved original art only | Original references are in `Client/references/bimo/`; runtime artwork and Rive files are in `Client/assets/`. | Preserve these assets. Do not generate a substitute Bimo. |
| Garden | One clean white/ivory scene with one main plant | `Client/src/pages/member/garden/` currently renders a single scene with four small trees. | The one-plant direction is a future design change requiring a separate scoped implementation and product review. Do not alter Garden behavior during setup. |

## Scope and status

This checkout is the static HTML/CSS/JavaScript demonstration described in `README.md`; Angular and ASP.NET Core are the eventual target and are not present here. Use the same design guidance when that application is added, after inspecting its actual styles and components. The proposed source document also references a theme audit that is absent at `docs/design/theme-audit.md`; shared CSS and rendered pages are the available evidence. This file records a source comparison only, not a browser or accessibility validation.
