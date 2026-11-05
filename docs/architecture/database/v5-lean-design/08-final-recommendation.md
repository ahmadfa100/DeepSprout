# DeepSprout v5 — Final Recommendation (Section G)

## The recommendation

**Adopt one design: 57 tables in 18 schemas, one SQL Server database, one `DbContext`, no triggers and no stored procedures.**

57 sits inside your 56–64 range. I did not push it to 60 or down to 40. Every table in the list has a reason to exist in the current pages (`01-table-inventory.md`), and every v4 table has a recorded fate (`03-v4-to-v5-mapping.md`: 57 KEEP + 26 MERGE + 4 REMOVE = 87; the 9 features deferred earlier stay deferred).

| | v4 | **v5** |
|---|---:|---:|
| Tables | 87 | **57** |
| Columns | 1116 | 752 |
| Foreign keys (composite) | 234 (85) | 146 (0) |
| CHECK constraints | 294 | 102 |
| SQL triggers / stored procedures | 95 documented guards | 0 / 0 |
| Tables needing RowVersion | 87 | 17 |

## Why it is better than v4

1. **It matches what the pages actually do.** The Garden is already computed from source records, form answers are already one map, histories are already timelines, cohort membership is already an array. v4 stored each of these relationally because the database allowed it, not because a screen needed it.
2. **It fixes things v4 missed.** Reading the pages (not the documents) showed group capacity and coach approval, approval-required experiences, cohort capacity and join token, supervisor cohort permission, the applicant "more information" thread, and task practice snapshots. v4 had none of them; v5 does.
3. **It is understandable.** An entity is a row with a status and a parent. Rules live in C# services; the database keeps only the rules that must hold even if code has a bug.
4. **It is cheaper to change.** No trigger scripts to keep in lock-step with C#; no composite keys that make every join and every test fixture heavier.

## What complexity was eliminated

- The reward pipeline (evidence → entry → reversal → frozen policy): 4 tables, 2 unique indexes, 1 job.
- 9 child tables (responses, scores, usage domains, form questions/options/answers, criteria, criterion scores) replaced by 9 JSON columns.
- 6 specialized history/versioning tables with no reader (practice, program, assignment, session, shield, assessment-window).
- 4 typed logs (application decisions, attendance corrections, coach handovers, moderation decisions) replaced by one audit timeline that the UI already expects.
- 85 composite ownership FKs, 36 immutability triggers, 13 owner triggers, 6 capacity triggers and about 36 workflow procedures.
- `UpdatedAtUtc` everywhere and `RowVersion` on 70 tables.

## What protections were simplified, and how they are still covered

| Protection | v4 | v5 |
|---|---|---|
| Ownership (a record cannot point at another owner's parent) | composite FKs and triggers | handler loads the parent through the actor's scope; ownership scenarios OWN-01..07 |
| Immutability of history rows | triggers | no code path edits them; `AuditEvent` is `DENY UPDATE, DELETE` |
| Capacity and supervisor cap | safety-net triggers | one `SeatService` with `UPDLOCK` on the parent row; parallel tests INI-01/05, PRV-01, ATT-08 |
| Status/timestamp coherence | 150+ CHECKs | status lists remain CHECKed; coherence is the service's job |
| Duplicate commands | `IdempotencyRecord` | natural unique keys; DUP-01..10 |
| JSON validity | `ISJSON` CHECKs | typed DTOs and EF `ToJson()` mapping |

## What stays strict (not simplified)

One identity; one Accepted/Suspended membership per person across initiatives; one live application, booking and registration per person; one open recovery cycle; one valid baseline and one valid weekly attempt; one attendance and one completion per subject; unique submission attempts; FKs on every relationship; status lists; initiative capacity 1–135; consent history; private-file authorization through the owning record; reliable outbox; audit history.

## What stays unchanged for users

All 52 journeys in `06-functionality-preservation-matrix.md`: 29 fully preserved, 21 with a simpler implementation, 2 flagged for your review. Reapplication, removal notification, the 120-hour boundary, 135/3 limits, derived Garden, no-AI authorization and the deferred features are all respected.

## Changes that need your explicit approval

| # | Decision | My recommendation |
|---|---|---|
| 1 | Garden is computed with no frozen policy per grant, so editing Garden Rules re-evaluates every garden (the Client already does this) | Approve, and add a rule that live thresholds may be lowered or extended but not raised |
| 2 | Past practice content is not retained (title, version number and outcome are) | Approve unless you need to re-open the original prompt of a past attempt; if so, restore `PracticeVersion` (58 tables) |
| 3 | Lab re-scoring overwrites the stored score set | Approve; comparisons across scoring versions stay blocked |
| 4 | No capacity triggers; one `SeatService` plus a mandatory race test | Approve; if you want belt-and-braces, add 3 safety-net triggers (no table change) |
| 5 | One platform role per person (Admin / Moderator / ContentEditor) | Approve; the pages have one Admin console |
| 6 | `AuditEvent` is the single history source for application decisions, attendance corrections, coach handovers, session and cohort changes, moderation | Approve; this is the main thing the UI will read, so INI-12 and ATT-04 are P0 |
| 7 | Forms and competitions store questions and answers as JSON and compute counts/ranking in C# | Approve; revisit only if a form will collect tens of thousands of responses |
| 8 | Reapplication details: Withdrawn/Removed/Rejected may reapply while enrollment is open; Blocked may not; a person who **Completed** an initiative may not rejoin it | Confirm the Completed rule (your decision covered only withdrawal and removal) |

## Assumptions to verify at implementation time

- Practice `DifficultyTier` is fixed per practice definition (the Practice merge assumes it).
- Group invitations are single-use per email (`limit: 1` in the pages), so an invitation can remain a `GroupMembership` row in status `Invited`.
- The standalone Admin legacy console (`Client/admin.html`) adds no capability that needs another table; the workspace Admin already does.

## What I did not do

No migration, no SQL, no change to v4 files, the 129-table database, `CourseHubDB`, the Client or the Server. Everything is under `docs/architecture/database/v5-lean-design/`, regenerated by `node generator/build.mjs`, which only reads `v4-final-design-review/schema.json`.

## Suggested next step

Approve or amend the eight items above. Implementation then follows the module order in the dependency diagram of `04-erd.md`: iam → org → personal / lab / recovery / activity / shield → institution → coach → task → session → provider → forms → community → platform tables, each module gated by its P0 scenarios.
