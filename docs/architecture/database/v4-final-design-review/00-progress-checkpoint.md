# v4 Final Design Review — Progress Checkpoint

> Update this file after every meaningful section. A new session should read it first and continue from **Exact next task**.

Last updated: 2026-11-03 (session 2, after recovery)

## Session history

| Session | Transcript | Outcome |
|---|---|---|
| 1 | `~/.claude/projects/C--Users-user-Desktop-DeepSprout/d63e4d53-…jsonl` (ended 09:08 when laptop shut down) | Explored repo, live schema, Client UI, regression suite; built the structured model and generator; generated B, C, D, E-traceability. Stopped just before writing the workflow map. |
| 2 | `bd766cea-…jsonl` | Recovered session 1 output (nothing lost); wrote A, E, F, README. Generator re-run: 0 errors, generated files unchanged. |

## Recovered files (session 1, all intact, generator validates with 0 errors)

| File | Deliverable | State |
|---|---|---|
| `model/t1..t5-*.mjs` | Source of truth: 87 tables with columns, FK, UQ, CK, purpose, lifecycle, privacy, example, source | Complete |
| `model/migration.mjs` | 129 → v4 mapping | Complete |
| `model/tests.mjs` | 330 regression checks → v4 | Complete |
| `generate.mjs` | Validates model, writes generated files | Complete (`node generate.mjs`) |
| `02-data-dictionary-ar.md` | **B** Data dictionary | Complete (generated) |
| `03-erd-ar.md` | **C** ERDs (overview + per module) | Complete (generated) |
| `04-migration-matrix-ar.md`, `migration-matrix.csv` | **D** Old-to-new mapping (87 KEEP + 33 MERGE + 0 REMOVE + 9 DEFER = 129) | Complete (generated) |
| `05a-test-traceability-ar.md`, `test-traceability.csv` | **E (part)** 330 checks mapped | Complete (generated) |
| `schema.json`, `final-tables.csv`, `validation-report.txt` | Machine-readable outputs | Complete |

## Decisions reached (session 1)

- Recommended final count: **87 tables** (KEEP rows), 1116 columns, 234 FK (85 composite), 172 UQ (53 filtered), 294 CHECK, 33 append-only tables.
- Community Challenge / Joint Goals excluded (DEFER) per owner instruction.
- Garden: four trees + flower/rabbit/birdhouse confirmed in current UI (owner decision #12); schema kept visual-agnostic.
- Gap found in Codex DB: no state for declined/expired seat offer → modeled as booking/application states `OfferDeclined`/`OfferExpired`.
- Enumerations get explicit CHECK sets (live schema had mostly free text).
- JSON used only for: published Initiative snapshot, Coach program stages (StagesJson), schedule rules, settings — with C# publish-time validation replacing the lost CHECKs (see 05a STRUCTURAL rows).

## Remaining deliverables

- [x] **A** `01-product-workflow-map-ar.md` — complete (sections 0–21), constraints verified against schema.json
- [x] **E** `05-validation-plan-ar.md` — complete (layers L0–L9, races, withdrawal/cancellation, staff, rewards, migration, HTTP, gate); 05a = full 330 traceability
- [x] **F** `06-final-decision-report-ar.md` — complete: 87 tables, 33 merges kept, 15 v3 merges dropped (Codex right), 8 Codex rejections overridden with reasons, 9 deferred
- [x] `README.md` index for the folder

## Exact next task

**All deliverables A–F are complete.** Waiting on the owner:

1. Approve the 87-table design (06 §1, §9).
2. Decide open question #1 — rejoining the same Initiative after an ended membership (owner decision #10). Default if not decided: forbidden (`UQ(InitiativeId, PersonId) WHERE AcceptedAtUtc IS NOT NULL`). UI currently allows reapply after Withdrawn/Removed.
3. (Design only, no DB impact) Garden: four trees vs one main plant.

After approval: create branch `db/v4`, new migration chain `V4_Initial` in a new database `DeepSprout_V4_Validation`, build module by module (06 §7), run validation layers L0–L8 (05). Do not touch `DeepSprout_Validation` or the existing 23 migrations.
