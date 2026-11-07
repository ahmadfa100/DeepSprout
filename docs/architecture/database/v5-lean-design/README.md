# DeepSprout v5 — Lean Database Design (proposal, not implemented)

> **Historical proposal:** The [4 November v4.1 P0 decisions](../../../architecture/p0-target-v4.1.md) supersede the independent Coach/Provider ownership and Supervisor self-request assumptions here. The 57-table figure below is a proposal count, not an approved post-v4.1 target. Reassess Identity duplication, typed fields and actual migration data before implementation.

**Recommendation: 57 tables, 18 schemas, no triggers, no stored procedures.** Status: awaiting owner approval. v4 (`../v4-final-design-review/`) and the 129-table database are untouched.

Start with [08-final-recommendation.md](08-final-recommendation.md).

| File | Section | Content |
|---|---|---|
| [08-final-recommendation.md](08-final-recommendation.md) | G | One recommendation, what changed, eight approval items |
| [01-table-inventory.md](01-table-inventory.md) | A | All 57 tables: purpose, feature, why independent, keys, main columns |
| [02-data-dictionary.md](02-data-dictionary.md) | E | Every column, type, nullability, default, JSON shape, status values, constraints |
| [03-v4-to-v5-mapping.md](03-v4-to-v5-mapping.md) · [csv](v4-to-v5-mapping.csv) | B | 87 → 57: 57 KEEP + 26 MERGE + 4 REMOVE; 9 DEFER carried |
| [04-erd.md](04-erd.md) | E | Mermaid: schema dependencies and one ERD per schema |
| [05-simplification-decisions.md](05-simplification-decisions.md) | C | What was removed and why; what the live pages showed |
| [06-functionality-preservation-matrix.md](06-functionality-preservation-matrix.md) | D | 52 journeys, labeled; owner decisions; review items |
| [07-validation-strategy.md](07-validation-strategy.md) | F | About 70 focused scenarios; disposition of the 330 legacy checks |
| [appendix-table-width.md](appendix-table-width.md) | | Column counts, v4 vs v5 |
| [legacy-checks-disposition.csv](legacy-checks-disposition.csv) | F | Each of the 330 legacy checks: RETIRE / RETAIN-AS-SCENARIO / DEFER |
| [schema.json](schema.json) · [validation-report.txt](validation-report.txt) | | Machine-readable model and generator report |

## Regenerating

`generator/model.mjs` is the source of truth. It derives each v5 table from one v4 table (read-only) plus explicit changes. From `generator/`:

```
node build.mjs
```

The build fails if a v4 table has no disposition, a foreign key points nowhere, or 87 does not reconcile. Files 01–04, `schema.json`, the CSVs and the appendix are generated; 05–08 and this README are hand-written. Do not hand-edit generated files.

## Reading the ERDs

Mermaid renders in GitHub, VS Code (Markdown preview with a Mermaid extension) and most documentation tools. Each schema diagram shows keys, foreign keys and status columns; full columns are in the data dictionary.
