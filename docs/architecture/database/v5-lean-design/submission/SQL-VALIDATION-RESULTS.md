# SQL validation results

**Executed for real.** The script was run with `sqlcmd` against Microsoft SQL Server 2025 (RTM 17.0.1000.7) on `localhost`. It created the new database `DeepSprout_V5_Demo`. I dropped and recreated only this disposable database to prove a clean run. No other database was touched (`CourseHubDB`, `DeepSprout_Validation` and the others were not referenced).

Not run: SSMS itself and SQL Server 2019. I used sqlcmd with `-b` (stop on error). The script sets `QUOTED_IDENTIFIER ON` explicitly, because sqlcmd defaults it to OFF and filtered indexes need it ON. SSMS defaults to ON.

## Results

| Check | Outcome |
|---|---|
| Clean run from a non-existent database (`DeepSprout-v5-FULL-Database.sql`) | Exit code 0. The database was created, the schema built, the seed inserted and every query ran. |
| Tables created | **58** in **18** schemas, matching `schema.json` |
| Foreign keys | **147**, matching the model (all added with `ALTER TABLE` after all tables, so the circular root ↔ revision links are safe) |
| Filtered unique indexes | **39**, matching the model |
| CHECK constraints | 143 (105 modelled + `ISJSON` checks on every `*Json` column) |
| Triggers / stored procedures | 0 / 0 |
| Demo data | One transaction. Every one of the 58 tables has at least one row (zero empty tables). 15 people. |
| Demonstration queries | All 15 SELECT statements executed without error. |
| Re-run on the existing database | Exit code 0. It prints "schema already installed", skips schema and seed, and drops nothing. |
| Protected-name scan | The only mention of `CourseHubDB` / `DeepSprout_Validation` is the header comment stating the script never uses them. There is no `DROP DATABASE` or `DROP TABLE` in the script. |

## Negative and behaviour tests (`DeepSprout-v5-NEGATIVE-TESTS.sql`, every test rolled back)

**25 passed, 0 failed, 1 informational.** Each test passes only when SQL Server rejects the statement (or, for a positive control, accepts it).

| Area | Tests |
|---|---|
| Identity and membership | T01 duplicate e-mail. T02 duplicate live application. T03 second Accepted membership in another initiative. |
| Capacity bounds | T04 initiative capacity 136. T05 group capacity 0. T06 cohort capacity −1. |
| Review | T07 duplicate initial decision rejected. T08 superseding correction accepted. |
| Group invitation fix | T09 expired invitation with no person accepted. T10 Active member without a person rejected. |
| Outbox | T11 duplicate (event, recipient key) rejected. T12 same event, new recipient accepted. |
| Experience | T13 cancel an unpublished draft accepted. T14 Published without a revision rejected. |
| JSON and ranges | T15 invalid JSON rejected. T16 negative seconds rejected. T17 replayed Shield batch rejected. |
| Duplicates and FK | T18 duplicate attendance. T19 dangling FK. T20 second live booking. T21 second valid baseline. T22 second open recovery cycle. |
| Insert-only history | T23 `UPDATE` on `AuditEvent` denied. T24 `DELETE` on `ConsentRecord` denied. T25 `INSERT` allowed (run as role member `ds_app_demo`). |
| Known limit | T26: SQL accepts an attendance row whose person differs from the registration's person. This is an application rule (see AUDIT-RESPONSE.md). |

## NOT verified

- **Concurrency.** No parallel seat-race, parallel failed-login or duplicate-submit test was run. These need application-level tests under `SeatService` (50 runs). SQL only supplies the unique indexes and row versions they rely on.
- The demo data is consistent with the constraints, but the C# transition rules, ownership matrix, audit completeness and Garden calculation do not exist yet and were not tested.
- No EF Core migration was generated or compared with this script. The script is a standalone design artifact.
- Password hashes are intentionally `NULL`. No demo account can sign in.
- The ERD image was not produced. The Mermaid ERDs in `../04-erd.md` are regenerated from the corrected model and have not been rendered here.
- SSMS and SQL Server 2019 compatibility were not tested. The script uses only features available in 2016+ (`STRING_AGG` in demo query Q1 needs 2017+).
