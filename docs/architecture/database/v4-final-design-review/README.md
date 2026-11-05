# DeepSprout v4 — Final Database Design Review

**Recommendation: 87 tables** (19 schemas, one SQL Server database, one DbContext). Status: proposed, awaiting owner approval. The 129-table `DeepSprout_Validation` database remains the preserved baseline until v4 passes the validation gate.

Start with the decision report, then drill down.

| # | File | Deliverable | Kind |
|---|---|---|---|
| F | [06-final-decision-report-ar.md](06-final-decision-report-ar.md) | One final decision, inventory, merges kept/rejected, deferred features, open questions, strategy, risks | hand-written |
| A | [01-product-workflow-map-ar.md](01-product-workflow-map-ar.md) | Page-by-page and journey-by-journey map of the current UI to tables | hand-written |
| B | [02-data-dictionary-ar.md](02-data-dictionary-ar.md) | Every table: columns, types, keys, constraints, lifecycle, privacy, example, source | generated |
| C | [03-erd-ar.md](03-erd-ar.md) | Overview + per-module Mermaid ERDs | generated |
| D | [04-migration-matrix-ar.md](04-migration-matrix-ar.md) · [migration-matrix.csv](migration-matrix.csv) | 129 → 87: 87 KEEP + 33 MERGE + 0 REMOVE + 9 DEFER | generated |
| E | [05-validation-plan-ar.md](05-validation-plan-ar.md) | SQL Server / EF Core validation layers and gate | hand-written |
| E | [05a-test-traceability-ar.md](05a-test-traceability-ar.md) · [test-traceability.csv](test-traceability.csv) | All 330 previous checks mapped to v4 | generated |
| — | [00-progress-checkpoint.md](00-progress-checkpoint.md) | Session recovery checkpoint | hand-written |

## Regenerating

The source of truth for B, C, D and 05a is `model/*.mjs`. Edit the model, then:

```
node generate.mjs
```

This validates the model (FK targets, composite-FK uniqueness, one KEEP source per table, 129-row reconciliation, every old test dispositioned) and rewrites the generated files plus `schema.json`, `final-tables.csv` and `validation-report.txt`. Do not hand-edit generated files.
