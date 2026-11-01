# DeepSprout database architecture v2 — 30 October 2026

**Status:** proposed architecture and SQL Server proof package. The original 27 files in `../` remain historical source material. Copies of the [owner request](sources/owner-request-2026-10-30.md) and [independent Claude review](sources/claude-review-2026-10-27.md) preserve the review inputs. The Claude review is a critique, not a product decision. No backend or database exists in this checkout; SQL execution is **NOT EXECUTED**.

## Decision and scope

The owner's 30 October request supersedes the old static-only delivery boundary (`DeepSprout.md` §22.1 and D48) for the **next database milestone**. Target: ASP.NET Core, EF Core, one SQL Server database and a modular monolith. This package does not implement an API or alter the demo. The owner's new rules also supersede the root `AGENTS.md` Garden design note for database purposes: four differently rendered practice trees, with no tree-specific SQL table. The Garden UI remains a separate task.

## Read this package

1. [Architecture and critique](01-architecture-and-review.md): requirements, twenty substantive Claude claims, bounded contexts, security, concurrency, ADRs, policy decisions, verdict.
2. [Disposition of all 136 original tables](02-table-disposition.md): exact original name, purpose, source, ownership, class, removal consequence, destination, stage; includes the new application-decision table and reconciled counts.
3. [Target physical dictionary](03-target-dictionary.md): 128 proposed target tables with original columns/keys plus explicit v2 overrides. All old design clauses contradicted by the overrides are void.
4. [Diagrams](04-diagrams.md): simplified master ERD, eight domain ERDs/context views and workflow states.
5. [First-slice DDL](sql/001-first-slice.sql) and [validation script](sql/002-first-slice-validation.sql): an isolated 18-table database slice and negative checks. Both are **NOT EXECUTED** here.
6. [Implementation and sign-off](05-implementation-and-signoff.md): EF Core, migrations, validation coverage and gates.

## Reconciled counts

| Inventory | Count | Reconciliation |
|---|---:|---|
| Original proposed | **136** | Exact 136 names in `../07-database-schema.md` and disposition matrix. |
| Revised complete target | **128** | 136 − 9 removed/merged originals + 1 new `institution.InitiativeApplicationDecision`. The 128 explicit target names appear in the target dictionary. |
| First database slice | **18** | Explicit list and DDL in `sql/001-first-slice.sql`; no waitlist/provider/session functionality in this first slice. |

These are design inventories, not a claim that 128 tables should be created in the first migration. Deferred tables remain part of approved future capabilities. Conditional features may be physically created only after their policy gate.
