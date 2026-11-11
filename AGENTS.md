# DeepSprout agent guidance

Read `DESIGN.md` and its linked `DeepSprout-DESIGN.md` before UI work. Treat proposed numeric tokens and fonts as provisional; inspect the existing styles, components, assets, and rendered page before adopting them. Preserve DeepSprout's ivory/sage identity and original Azm assets. The intended Garden direction is one clean white/ivory scene with one main plant; change the current Garden only in a separately scoped task.

Use project-local `.agents/skills/` instructions when relevant: `image-to-code` for an image-led public page, `design-taste-frontend` for public-facing pages, `high-end-visual-design` for selective craft, `redesign-existing-projects` for a focused redesign, and `web-design-guidelines` for UI review. Product constraints and the established identity take precedence over generic style suggestions. Keep design-only tasks clear of routes, behavior, APIs, database, and backend logic. Check the actual framework before using framework-specific guidance; this checkout is a single ASP.NET Core MVC solution (`DeepSprout.sln`): Razor views in `src/DeepSprout.Web/Views`, runtime assets in `src/DeepSprout.Web/wwwroot`.

## Architecture and data rules

- Authority: owner decisions (`docs/architecture/p0-target-v4.1.md` and its 8 November addendum), then the approved database (`docs/architecture/database/README.md`), then `DeepSprout.md` v4.1, then implemented workflows. Dated reports and screenshots are evidence, not requirements. `docs/README.md` maps each question to its one current document.
- The approved database has **58 application tables** (v5 lean design, revision v5-lean-2). Do not add a business table without explicit owner approval, and never return to the 129-table M1 model. Change the schema only in `docs/architecture/database/v5-lean-design/generator/model.mjs`, then run `build.mjs`, `emit-sql.mjs` and `emit-efcore.mjs`, add a migration for `DeepSproutV5DbContext`, and run the negative tests on a fresh disposable database.
- Never hand-edit generated files: `*.g.cs` under `src/*/V5/`, `schema.json`, documents 01–04 and the full SQL script in `v5-lean-design/`.
- `DeepSproutDbContext`, `src/DeepSprout.Infrastructure/Migrations`, the M1 domain entities and `tests/DeepSprout.DatabaseValidation` belong to the historical `DeepSprout_Validation` database. Do not extend them, do not delete applied migrations, and do not run the validation harness against any other database.
- No page reads or writes SQL Server yet; all workflows are browser-local (`docs/architecture/database/persistence-contract.md`). Never describe browser data as stored in the database.
- Retired by v4.1: the Outdoor Provider workspace, independent Coach Programs, Supervisor self-request and cross-owner partnerships. Retired by Onboarding 2.0: mandatory baseline assessments, Journey Level 0, assessment-gated plan activation and automatic weekly Lab windows. Do not reintroduce them. Keep their historical records readable.
- Do not apply migrations to `DeepSprout_V5_Demo` or `DeepSprout_Validation` without the owner's go-ahead and a verified backup. Test on databases you create and drop yourself.
- HeroReels, Azm and the onboarding, Home and Garden visuals are protected; data or cleanup tasks must not change them.

<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->
