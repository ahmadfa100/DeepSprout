# DeepSprout agent guidance

Read `DESIGN.md` and its linked `DeepSprout-DESIGN.md` before UI work. Treat proposed numeric tokens and fonts as provisional; inspect the existing styles, components, assets, and rendered page before adopting them. Preserve DeepSprout's ivory/sage identity and original Bimo assets. The intended Garden direction is one clean white/ivory scene with one main plant; change the current Garden only in a separately scoped task.

Use project-local `.agents/skills/` instructions when relevant: `image-to-code` for an image-led public page, `design-taste-frontend` for public-facing pages, `high-end-visual-design` for selective craft, `redesign-existing-projects` for a focused redesign, and `web-design-guidelines` for UI review. Product constraints and the established identity take precedence over generic style suggestions. Keep design-only tasks clear of routes, behavior, APIs, database, and backend logic. Check the actual framework before using framework-specific guidance; this checkout currently contains a static client demonstration.

<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->
