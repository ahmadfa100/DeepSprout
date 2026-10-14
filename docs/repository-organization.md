# Repository organization

Completed on 14 October 2026. The audit covered all 1,160 repository files present at the start, including ignored local Rive outputs, and excluded Git internals.

## Results

| Action | Files |
| --- | ---: |
| Moved or renamed | 437 |
| Retained at the same location | 332 |
| Removed | 391 |

The removals consist of 127 unreferenced empty scaffolds, 231 ignored generated Rive outputs, 29 unused exported icons or illustrations, three exact duplicate images, and one server placeholder replaced by a README. Removed content totaled approximately 46 MiB. Validation checks generated small temporary logs afterward; those were cleaned up separately.

The [organization manifest](organization-manifest.json) records every original file, its original size and SHA-256 hash, its disposition, and its new or canonical location where applicable.

## Structure and naming

- `docs/product-specification.md` is the project-wide product specification.
- `Client/docs/architecture/` contains admin and partner-workspace architecture.
- `Client/docs/experience/` contains animation and journey handoffs.
- `Client/docs/design/` contains the theme audit and illustration prompt history.
- `Client/docs/validation/` contains screenshots, videos, and measured reports, grouped by milestone.
- `Client/references/` contains original mascot artwork, character sheets, authentication reference art, and approved storyboards.
- `Client/assets/` contains all runtime media. Former `src/assets/` artwork now lives in page-specific asset folders, shared branding lives in `brand/`, and reels videos and posters live under `reels/`.
- `Client/src/`, `Client/tests/`, and `Client/scripts/` retain their working code organization.
- `Server/README.md` explains the backend placeholder. `experiments/README.md` indexes the two independent Rive projects.

Ambiguous or misspelled images were renamed, including `Image.png` → `logo.png`, the authentication `image.png` → `background.png`, and the Bimo Activities/Insights/Roadmap/Community artwork. Poster timestamps became `poster-01.png` through `poster-04.png`. Reference image names now use lowercase kebab-case and have no leading spaces.

## Preserved deliberately

Public entry URLs, animation labs, source modules, third-party runtimes, licenses, Rive project configuration, required fonts, and tool instruction filenames remain in their required locations. The separate hero export projects retain matching controllers and pose libraries because each project builds independently.

Repeated validation frames remain where their timing or test scenario is meaningful. Historical JSON measurements and recorded hashes were moved without changing their contents. Unique unused design references were retained as reference artwork. All existing user code edits were preserved; working code changes are limited to file paths and filenames required by the moves.

## Verification

- Static reference audit: 585 original local references checked across HTML, CSS, imports, and Markdown; no new broken targets after reorganization. All 76 local Markdown links also resolve after guide creation.
- Syntax: all 123 JavaScript and Python files checked successfully.
- Page wiring: all 12 pages passed.
- Partner domain tests: all 10 tests passed.
- Local HTTP server: all three existing 404, nested URL, HEAD, and normal-asset tests passed.
- Both Rive authoring projects: verification reported zero errors and zero warnings; inspection reported no problems.
- Moved binary artwork and historical reports retain their original hashes; no unexpected changes were found in retained files.
- The member journey suite was skipped because `jsdom` is not installed. Full browser animation suites were not rerun for this file organization change.

A temporary recovery archive of moved/removed files and original authored text is available at `/tmp/deepsprout-organization-backup.tar.gz`. It is outside the repository and may be removed by system temporary-file cleanup. Tracked originals also remain in Git history. No commit was created.
