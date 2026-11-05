# Validation evidence

Each folder contains original screenshots, measurements, reports, or recordings for one implementation milestone.

| Folder | Evidence |
| --- | --- |
| `admin/` | Admin dashboard proof |
| `home-redesign/` | Desktop, mobile, and reference-width captures |
| `hero-opening/` | First hero phase and responsive captures |
| `hero-v2/` | V2 phases, gold comparisons, and validation report |
| `hero-v2-patch/` | Transition sequences, lifecycle checks, and ambient patch |
| `hero-v2-bimo-continuity/` | Before/after Bimo captures and measurements |
| `reels/` | Reels sequence, recordings, and lifecycle reports |
| `reels-pacing/` | Reels timing and narrative pacing |
| `vortex-clarity/` | Desktop, mobile, reduced-motion, and fallback checks |
| `way-back/` | Assessment-to-growth narrative captures |
| `product-journey/` | Garden and invitation checks |
| `garden-handoff/` | Garden transition comparison frames and recordings |
| `partner-workspaces/` | Workspace routes and entry-flow evidence |

Numbered frames and matching screenshots from separate test scenarios are retained even when their pixels are identical: sequence positions and scenario names form part of the evidence. JSON reports preserve historical data, including recorded hashes and paths. Test and capture scripts write new results to these folders.

Original reference artwork belongs in `Client/references/`, and runtime media belongs in `Client/assets/`.
