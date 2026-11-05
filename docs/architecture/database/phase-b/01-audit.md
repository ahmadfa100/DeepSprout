# Phase B — v2.1 dictionary pre-implementation audit

This is a static audit of the preserved canonical dictionary. It is not evidence of migrated tables or executed SQL constraints. The CSV lists fields named by explicit keys, indexes, or CHECK expressions but absent from each row’s declared column list.

| Module | Target tables | Rows with undeclared referenced columns | Rows with predecessor-only columns | Invalid FK target columns |
|---|---:|---:|---:|---:|
| iam | 6 | 3 | 5 | 0 |
| personal | 1 | 0 | 0 | 0 |
| lab | 6 | 3 | 5 | 0 |
| recovery | 5 | 0 | 3 | 0 |
| activity | 6 | 2 | 3 | 0 |
| shield | 6 | 1 | 3 | 0 |
| institution | 13 | 7 | 9 | 0 |
| coach | 10 | 2 | 7 | 0 |
| task | 8 | 2 | 4 | 0 |
| session | 10 | 3 | 8 | 0 |
| provider | 17 | 8 | 13 | 0 |
| forms | 12 | 0 | 5 | 0 |
| files | 1 | 0 | 1 | 0 |
| partnership | 2 | 0 | 0 | 0 |
| community | 9 | 2 | 2 | 0 |
| governance | 2 | 2 | 2 | 0 |
| commercial | 5 | 1 | 4 | 0 |
| evidence | 5 | 3 | 4 | 0 |
| ops | 5 | 4 | 5 | 0 |

Total target tables: **129**; implemented M1 tables: **19**; remaining target: **110**.

Before each module migration, resolve every CSV finding against product requirements and prior architecture, then verify ownership tuples, status transitions, and negative cases. No inferred column type or owner policy is approved by this static report.
