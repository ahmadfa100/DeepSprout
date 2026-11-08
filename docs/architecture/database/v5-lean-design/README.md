# DeepSprout v5 lean design: the approved 58-table database

**Status: approved by the product owner; current revision v5-lean-2 (8 November 2026).** 58 application tables, 18 schemas, 146 foreign keys, no triggers, no stored procedures. This folder is the single source of the target schema. The index of all database documents is [`../README.md`](../README.md).

## Revisions

| Revision | Date | Change |
|---|---|---|
| v5-lean-1 | 5 November 2026 | 58 tables (the 57-table draft plus `activity.PracticeVersion`). Built by hand into `DeepSprout_V5_Demo` |
| v5-lean-2 | 8 November 2026 | Onboarding 2.0 and the 4 November v4.1 decisions, inside the same 58 tables: `IndividualProfile.JourneyLevel` (default 1, ≥ 1), versioned setup answers stored as one JSON object, stages `QuickSetup`/`Story`/`Home`, accepted plans must carry their acceptance time, Institution-only organizations with Institution-owned outdoor activities (`provider.Experience.OrganizationId`), invitation-only staff appointments (no `Requested`), and read-only retired tables `coach.CoachProgram` and `partnership.PartnershipLink`. Demo data gains a new Individual at Home with an unactivated Week 1 plan; the Provider demo organization is now an Institution |

The rationale documents 05–08 and `submission/AUDIT-RESPONSE.md` were written for the 57-table draft before v4.1. Their reasoning about merged tables, JSON columns and service-level rules still applies; their table count, independent Coach/Provider ownership and Supervisor self-request statements are superseded by this README and the [persistence contract](../persistence-contract.md).

## Files

| File | Content | Kind |
|---|---|---|
| [01-table-inventory.md](01-table-inventory.md) | All 58 tables: purpose, feature, keys, main columns | generated |
| [02-data-dictionary.md](02-data-dictionary.md) | Every column, type, nullability, default, JSON shape, status values, constraints | generated |
| [03-v4-to-v5-mapping.md](03-v4-to-v5-mapping.md) · [csv](v4-to-v5-mapping.csv) | How each table of the earlier 87-table set maps into the 58 | generated |
| [04-erd.md](04-erd.md) | Mermaid ERDs per schema | generated |
| [appendix-table-width.md](appendix-table-width.md), [legacy-checks-disposition.csv](legacy-checks-disposition.csv), [schema.json](schema.json), [validation-report.txt](validation-report.txt) | Widths, legacy check dispositions, machine-readable model, generator report | generated |
| [05](05-simplification-decisions.md)–[08](08-final-recommendation.md) | Design rationale (57-table draft) | hand-written, historical rationale |
| [submission/](submission/README-SUBMISSION.md) | Executable script, negative tests, adoption script, upgrade script, validation results | generated + hand-written |

## Regenerating

`generator/model.mjs` is the source of truth. It derives each table from the frozen earlier table set in `generator/base/v4-schema.json` (read-only input) plus explicit changes. From `generator/`:

```sh
node build.mjs        # schema.json and documents 01-04, CSVs, appendix, validation report
node emit-sql.mjs     # submission/DeepSprout-v5-FULL-Database.sql (schema + DEMO data + queries)
node emit-efcore.mjs  # EF Core entities and configuration under src/
```

The build fails if a base table has no disposition or a foreign key points nowhere. Do not hand-edit generated files. After a schema change, add a migration for `DeepSproutV5DbContext` (see [EF Core adoption](../efcore-v5-adoption.md)) and run the negative tests on a fresh database.

## Reading the ERDs

Mermaid renders in GitHub, VS Code (Markdown preview with a Mermaid extension) and most documentation tools. Each schema diagram shows keys, foreign keys and status columns; full columns are in the data dictionary.
