# 15 — Requirements conflict, open decisions and architecture risks

## Requirements Conflict Register

| ID | Conflicting sources and actual wording/meaning | Architecture impact and recommended resolution |
|---|---|---|
| RC-01 Garden | `DeepSprout.md` §9.1 and D07–D13 approve **exactly four practice-type trees** in one fixed Personal scene, no central fifth; `DeepSprout-DESIGN.md` Garden guidance and root `AGENTS.md` favor **one main plant**. Current active `Client/src/pages/member/garden/garden.js:1–10,505–629` implements four trees. | Use authoritative product spec for reward/schema: four typed tree states, bounded decorations, one scene. Flag visual guidance for owner/design reconciliation before future UI change. A one-plant redesign needs explicit new product decision; do not silently remap data or remove type provenance. |
| RC-02 Dated current-state audit | `DeepSprout.md` §29 and Phase-0 audit say regular Explore/Garden/weekly Lab have older disconnected or conflicting behavior; later implementation reports and current `member-bridge.js`, `provider-selectors.js`, `garden.js`, `account.js:774–806` show updates. | Treat §29/Phase-0 as dated observations, not target requirements or current truth. Assessment in [01](01-repository-assessment.md) uses current source and later reports; SQL design remains target. |
| RC-03 Framework guidance | `DeepSprout-DESIGN.md` speaks of an existing Angular/ASP.NET application; root `README.md:131–138`, `Server/README.md`, current tree show static JS and no service. | Future-stack guidance applies to proposed implementation only; no EF/Angular code presumed. |

No other source disagreement was found that changes an approved database invariant. Older cycle reports may discuss superseded caps, anonymous surveys or Provider Gardens; master §26.1 explicitly retires them.

## Open decision register

| Class | Decision and safe design posture |
|---|---|
| **Blocking before production of affected feature** | Legal jurisdiction, age/guardian consent, retention/export/erasure and restricted-file handling; define before collecting minors' sensitive data. Lab instrument scoring/comparability protocol before presenting longitudinal claims. Completion/accepted-excuse effects before an Initiative publishes criteria. Decide exact invitation/appointment authority for a stand-alone Institution Session before enabling its attendance; the proposed session-scoped appointment is a recommendation, not an approved staffing workflow. Actual billing/price/tax/refund contract before activating charges. |
| **Configurable interim default** | First Recovery cycle 28-day direction, practice load/levels, Lab weekly window length/rotation, Garden thresholds/decor caps, 24-hour Provider offer expiry, suspension seat retention (the last two explicitly interim in master §26). Store policy version and snapshot accepted terms; never present as immutable or clinical. |
| **Nonblocking implementation detail** | Exact tree species/visual placement, route names, report cache materialization, GUID generation library, UI tab wording, notification transport. These do not change core ownership. |
| **Product decision before optional expansion** | Waitlist priority exceptions/cutoff; whether a Completed/Removed Initiative membership releases its seat while admissions remain open; Community moderation/ranking/Joint Goals details, competition rubric/appeal, form response multiplicity, Coach verification evidence, extension scope/consent and optional AI vendor/input set. Until seat recycling is approved, do not automatically reoffer a completed member's slot. Schema supports versioned rules but does not invent policy values. |

## Architecture Risk & Tradeoff Register

| Severity | Risk / evidence | Mitigation and review gate |
|---|---|---|
| **Critical** | Cross-tenant/private data exposure from broad Person/Group joins or revoked cached grants. | Resource-scoped API policies for every read/write, narrow DTOs, negative authorization tests and sensitive read audit; review direct-ID access. |
| **Critical** | Capacity write skew/overbooking under concurrent approvals, offers or mode registration. | Owner/slot locks + unique indexes + idempotency; real SQL Server race tests and deadlock retry policy before release. |
| **High** | Browser demo IDs and local accounts are not trusted identity or provenance; migration could merge wrong people. | Explicit verified identity mapping, aliases, dry run/backup/quarantine; do not auto-merge unverified email or Admin fixtures. |
| **High** | Incorrect Garden duplication or reward after correction/partnership link. | Unique grant key independent of policy version, source event IDs, compensating ledger, replay/reversal tests and projection rebuild. |
| **High** | Lab comparisons or browser usage mislabeled as recovery/phone/Reels score. | Instrument/version comparability gate, coverage fields, source-specific Insights and privacy review. |
| **High** | Minor consent, safety and retention policy unresolved. | Block affected production collection/booking until legal/product approval; purpose-bound file metadata and deletion workflow. |
| **Medium** | Slot model and many immutable versions increase schema/query complexity. | Keep aggregate APIs narrow, index real queues/history, benchmark; slot count small for Initiative and can be batch-created. |
| **Medium** | One DbContext may blur modules; two current Admin stores complicate migration. | Module ownership tests, separate configurations and capability-by-capability Admin data reconciliation. |
| **Medium** | Outbox lag yields temporarily stale Garden/notices/reports. | Publish watermark/source time, retries/dead-letter alert, idempotent rebuild and user-visible Pending state. |
| **Medium** | Premium entitlements mistakenly used as authorization or approved prices invented. | Separate policy services; no production billing schema activation until commercial decisions signed. |

**Principal review outcome:** no duplicate role identity, generic mega-table, universal score, or unbounded XP counter is required. The most complex boundaries are initiative/provider capacity, same-person multi-workspace authorization, source correction/rewards, and restricted personal data. The model is implementable in EF Core, provided capacity commands use explicit SQL locking rather than only optimistic entity updates.
