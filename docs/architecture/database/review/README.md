# DeepSprout database architecture review (3 November 2026)

This package is a **read-only study and recommendation**. No database table, row, migration, EF model, or Backend API was changed.

## Deliverables

- `DeepSprout-Database-Study-Guide-AR-EN.pdf`: printable bilingual guide for all 129 product tables and both administrative tables.
- `DeepSprout-Database-Study-Guide-AR-EN.html`: searchable source of the guide, generated from the live SQL catalog.
- `decision-report-ar.md`: Arabic recommendation and before/after accounting.
- `table-decision-matrix.csv`: all 129 current product tables, Claude C action, review verdict, compensation or rejection reason, and recommendation.
- `live-schema-reconciliation.md`: actual SQL vs EF snapshot/migrations/v2.1 dictionary/Claude source, including every detected key and FK difference.
- `diagrams/all-tables.mmd`: full table ERD with all 261 actual FK paths.
- `diagrams/<schema>.mmd` and `diagrams/<schema>.svg`: 19 module diagrams with all incoming/outgoing references and composite column pairs.
- `diagrams/module-overview.svg`: cross-module overview.

## Provenance

`extract-live-schema.ps1` connects with Windows Integrated Security to exactly `DESKTOP-A4AL2KR / DeepSprout_Validation` and reads `sys.*` plus `__EFMigrationsHistory`. The JSON contains schema metadata and trigger definitions, **no user records or credentials**. `compare_snapshot.py` compares tables, columns, types, nullability, defaults, keys, FKs, CHECK names, and index signatures against the current EF ModelSnapshot. `build_review.py` reads that JSON and the now-present Claude C matrix, then generates the guide, matrix, diagrams, and reconciliation. `print_pdf.cjs` prints the HTML to PDF using the local Edge/Playwright runtime.

The archived `phase-b/final-regression/summary.csv` totals 330 PASS, 0 FAIL across 17 suites. Those write-capable suites were not rerun. The PDF presentation reference named in the request was not present in the supplied attachment folder.

## Rebuild

Run only the catalog extractor under an identity with **read-only permission** to the validation database. Its SQL commands are SELECT statements against metadata. Then run the local generators:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File docs/architecture/database/review/extract-live-schema.ps1
python docs/architecture/database/review/compare_snapshot.py
python docs/architecture/database/review/build_review.py
node docs/architecture/database/review/print_pdf.cjs
```

Use the available Python runtime if `python` is not on PATH. Do not run migrations or regression suites as part of this review.
