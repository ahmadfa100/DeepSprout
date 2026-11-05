# DeepSprout — Independent Architecture Feasibility Assessment

Status: analysis only. No schema, ERD, table inventory, migration or code was produced or changed. Nothing under `v4-final-design-review/`, `Server/`, `Client/` or the 129-table database was touched. `CourseHubDB` was not touched.

## 0. What this is based on, and what it is not

**Read in full or in the parts that matter:** `v4-final-design-review/06-final-decision-report-ar.md`, `final-tables.csv`, `01-product-workflow-map-ar.md` (all 21 sections, which map the `Client/` screens to tables), `README.md`, `00-progress-checkpoint.md`, `validation-report.txt`; per-table statistics computed from `schema.json` (columns, nullable columns, checks, documented guards); the RoadNa `database.zip` (`database-data.js` is the single source for its ER diagram, tables, SQL and "rules" tab; I read it completely).

**Not read line by line, and the conclusions below do not depend on them:** the 391 KB data dictionary (I used `schema.json` statistics instead), the 210-page atlas PDF (it is generated from the same model as `schema.json`), `DeepSprout.md` (181 KB, known to be partly outdated), and `DESIGN.md` / `DeepSprout-DESIGN.md` (visual design only, no database content). I did not re-audit each `Client/` file; I relied on the v4 workflow map, which was itself checked against `Client/src`. If the map is wrong about a screen, a count below could move by one or two tables, not by ten.

**Owner decisions applied:** reapplication after withdrawal or removal is allowed; removal notifications are required; Community Challenge / Joint Goals is excluded. None of these changes the table count. Reapplication changes one filtered unique index (v4 assumed the conservative "one acceptance per person per initiative", and `InitiativeApplication.AttemptNo` already exists). Removal notifications are rows in `ops.Notification` plus `ops.OutboxMessage` for email. The three Joint Goals tables are already DEFER.

---

## 1. Is DeepSprout overengineered?

**Yes, moderately. About 15 of the 87 tables are not earned, and about 18 more are defensible but cost more than they return. The other 54 are genuinely required.**

I classified every v4 table by what it actually does, not by how I justified it before.

- **A — earned independence (54).** Each has at least one of: unbounded row growth, its own lifecycle and authority, an identity that other tables point at, a privacy boundary that matters, or a history a user or regulator actually sees. Examples: `Person`, `Organization`, `OrganizationMember`, `StaffAppointment`, `RecoveryCycle`, `PlanRevision`, `ScheduledAction`, `PracticeAttempt`, `Initiative`, `InitiativeRevision`, `InitiativeApplication`, `Assignment`, `AssignmentRecipient`, `SubmissionAttempt`, `ReviewDecision`, `Session`, `SessionRegistration`, `Attendance`, `AbsenceExcuse`, `Completion`, `Experience`, `ExperienceBooking`, `ProviderIncident`, `FormResponse`, `Post`, `AuditEvent`, `Notification`, `OutboxMessage`, `SecureFile`, `ConsentRecord`.
- **B — defensible, but foldable with small loss (18).** `GlobalGrant`, `AssessmentWindow`, `AssessmentResponse`, `AssessmentScore`, `PracticeProgressionDecision`, `BrowserUsagePeriod`, `BrowserUsageDomain`, `InitiativeApplicationDecision`, `ProgramRevision`, `GroupCoachAssignment`, `SessionDuty`, `AttendanceCorrection`, `ProviderCohort`, `FormQuestion`, `CompetitionJudgment`, `Reaction`, `Bookmark`, `ModerationDecision`.
- **C — exist mainly for strictness, history or defense (15).** `PasswordCredential`, `ShieldConfiguration`, `ShieldSelectedDomain`, `EvidenceEvent`, `RewardPolicyVersion`, `PersonalRewardEntry`, `GroupRewardEntry`, `AssignmentRevision`, `ReviewPrivateNote`, `SessionRevision`, `ProviderCohortMember`, `FormQuestionOption`, `CompetitionCriterion`, `CompetitionCriterionScore`, `IdempotencyRecord`.

The 15 C tables and the biggest B groups, with concrete reasons:

1. **The reward pipeline (4 tables: `EvidenceEvent`, `RewardPolicyVersion`, `PersonalRewardEntry`, `GroupRewardEntry`).** This is the clearest case. It is a bank-style ledger — `UQ(EvidenceEventId, EffectCode) WHERE EntryKind='Grant'`, reversal rows, `UQ(ReversesEntryId)`, a frozen policy per grant — to drive plant growth in a garden that has no money value, no punitive decay (D06) and no user input (D11). Every input already exists as a row: completed `PracticeAttempt`, `RoutineCheckIn` Done, `Attendance` Present/Late, `Completion`, approved `ReviewDecision`. Growth can be computed from current truth, and a correction (for example an attendance correction) then fixes the garden automatically instead of needing a hand-written reversal. What is lost: growth no longer stays frozen when thresholds change. For a cosmetic garden that is arguably better behavior, not a loss.
2. **Tables that exist to be the target of a composite FK.** `ShieldSelectedDomain` ("هدف FK مركب من استخدام الموقع"), `FormQuestionOption`, `CompetitionCriterion`, `CompetitionCriterionScore`. The reasoning in the v4 report is "the answer must point at an option that exists". But forms are sealed (`SealedAtUtc`) and immutable; an answer cannot be orphaned after sealing. I rejected the JSON alternative in v3→v4 because FK integrity was available, which turned strictness into a default instead of a decision.
3. **Revision tables that nobody reads.** `SessionRevision`, `AssignmentRevision`, `ShieldConfiguration`. Contrast `InitiativeRevision` (31 columns; applicants applied on specific terms, `TermsRevisionId`, withdrawal cutoff extension), `PracticeVersion`/`InstrumentVersion` (scoring comparability is a scientific honesty requirement) and `ExperienceRevision` (price and place changes): those are earned. A rescheduled session needs a notification and an audit row, not a versioned entity that registrations point to. A reminder limit in the browser extension does not need version history.
4. **Isolation splits that only matter with separate SQL principals.** `PasswordCredential` (1:0..1, "isolate by table permission"), `ReviewPrivateNote` (5 columns, "isolated from the student DTO"), `ProviderCohortMember`. Both the API and EF use one SQL login, so table-level GRANT separation protects nothing. The real control is "never project this column into a student DTO", which is the same control the separate table relies on anyway. ASP.NET Identity itself keeps the hash on the user row.
5. **Speculative structures for undecided policy.** `AssessmentWindow` is justified by a "Missed" lifecycle, but the window length and missed-window handling are still open (§26.2 #1 in `DeepSprout.md`). A week key plus attempts derives Open/Used/Missed. `PracticeProgressionDecision` exists so "current tier = last decision"; tier could be derived from attempts.
6. **`IdempotencyRecord` (mine).** `RowVersion`, state-machine checks and the unique indexes already stop the double-approve, double-submit, double-check-in cases listed in §21.1 of the workflow map. A request-hash table earns its place for payments, and DeepSprout has none (commercial is deferred).
7. **Append-only by ceremony.** 33 of 87 tables are append-only. For many (`AssessmentScore`, `PracticeProgressionDecision`, `WeeklyReview`, `ShieldSelectedDomain`) immutability is enforced by triggers or permissions that guard against a bug in code we own. 95 documented guards (triggers, procedures, logic outside EF) sit on 67 tables. They are the most expensive part of v4 to maintain: invisible to EF, tested separately, edited via raw SQL migrations.

**A different kind of overengineering, which my v4 merge list hid.** The 33 merges reduced table count by moving complexity into row shape. The merged tables are now wide and mostly nullable: `org.StaffAppointment` 14 of 21 columns nullable (8 unique constraints, 7 checks, 3 guards); `coach.GroupMembership` 12/18; `task.OperationalReport` 13/23; `session.Completion` 12/20 with 9 FKs; `partnership.PartnershipLink` 11/20; `provider.ExperienceBooking` 11/22; `institution.InitiativeApplication` 10/22 with 14 states and 5 guards. I defended each merge by the guarantee it did not weaken, and never by the readability it cost. That decision rule only ratchets one way.

**Where I will not back down from v4:** the 85 composite ownership FKs are free in table count and protect real boundaries (an Organization of kind Provider cannot own an Initiative; a task cannot point at another person's membership). The `InitiativeApplication` merge is correct: it removed a real hole (no rejected/expired offer state in the 129-table database). Splitting registration, attendance and completion (D39) is correct. The 129→87 reduction was right in direction; the error was stopping where I could no longer find a *guarantee* to defend, rather than where the cost of the remaining tables stopped paying for itself.

---

## 2. Is 40 tables realistically achievable?

**Technically yes, as a number. Not for the currently approved functionality without serious degradation.**

Arithmetic first. 87 − 33 (all B and C) = 54. Removing every B and C table is itself not free (below), and it still leaves 54. Reaching 40 means removing 14 more tables from the A set, and every A table is a distinct lifecycle, authority or privacy boundary. Each such removal is a merge into a wider table or a deleted capability.

### What each class of simplification costs

| Class | Examples | What exactly changes | Fixable without adding a table? |
|---|---|---|---|
| **1. No meaningful loss** | `PasswordCredential`→`Person`; `ReviewPrivateNote`→column on `ReviewDecision`; `ProviderCohortMember`→cohort column on booking; `Reaction`+`Bookmark`→one interaction table; `IdempotencyRecord` removed; `ShieldConfiguration` folded into the installation row | Nothing the user sees. A column must never be projected into the wrong DTO | Yes, with a DTO-only API (already the v4 rule) and a unit test per sensitive column |
| **2. Integrity moves from SQL Server to C#** | `FormQuestion`/`FormQuestionOption`/`CompetitionCriterion` into `FormVersion` JSON; `AssessmentResponse` into the attempt; the `BrowserUsagePeriod`+`BrowserUsageDomain` sum-equals-total invariant disappears if they become one row per domain | Orphan-answer prevention and per-option counting FKs become submit-time validation against the sealed version. Safe because sealed versions cannot change | Yes. The risk is bounded because the JSON is immutable after seal. Not safe for any *mutable* JSON |
| **3. Optional history or analytics reduced** | Reward ledger → computed; `AssessmentScore` rows → latest score columns plus audit; `PracticeProgressionDecision` → derived; `AttendanceCorrection`/`InitiativeApplicationDecision`/`SessionRevision` → `AuditEvent` with before/after JSON | History survives as audit rows (queryable but not FK-typed). "Frozen policy at grant time" and per-version re-score history are gone | Yes for reads. If a product screen later needs a typed history, you re-add a table |
| **4. Meaningful user functionality changes** | To reach ≤40: drop competition judging and form analytics (5–6 tables), drop per-site Shield usage ("By website" in Insights), drop cohort transfers and incident records, drop moderation reversal, drop `AssessmentWindow` Missed handling | Screens in `Client/` lose behavior: competition ranking, per-domain usage, safety incidents, hide→restore moderation | No. These are lost capabilities, not modeling choices |
| **5. Unacceptable security, privacy, financial, concurrency or integrity risk** | See below | See below | No |

### Class 5 in detail: what breaks, why, and whether a table-free fix exists

- **Authority tables merged into one "role" table** (`OrganizationMember` + `StaffAppointment` + `GlobalGrant` + `GroupMembership`). Authorization is derived from these rows ("Workspace Switcher is computed entirely from active rows"). One table with `Kind` and 15+ nullable columns means a wrong `Kind` predicate silently grants access. Fix without a table: per-kind CHECKs plus filtered indexes, but the join predicate in every authorization query now carries the burden. High risk, small saving.
- **Attendance, registration, excuse and completion collapsed** (the D39 split). Attendance is the source of the completion decision and, in v4, the reward. Making it an updatable column pair on registration means silent edits, no correction trail and no per-owner XOR. Fix: audit table (already exists) can carry before/after, but the typed `AttendanceCorrection` is what the supervisor report needs. This is a real step down in accountability for a record that determines whether someone completed a program.
- **`ConsentRecord` folded into `Person` or `AuditEvent`.** Consent is a history per purpose and text version. Shield telemetry and the privacy consent must be demonstrable. A single latest-consent column cannot prove what the person agreed to at the time. This is a privacy and legal exposure, not a style choice.
- **`OutboxMessage` removed.** OTP, invitations and removal notifications are emails. Without a durable outbox, a crash between commit and send loses them, or sends them for rolled-back transactions. Fix without a table: a hosted-queue library, but its tables (Hangfire, MassTransit) still sit in your database, so the "40 application tables" cap would be met by relabeling, not by simplification.
- **`SecureFile` replaced by URL columns** (RoadNa's approach). Verification proofs, excuses, incident photos and task submissions are private. A URL column cannot enforce "download is authorized through the owning record, not `OwnerPersonId`". One table; it stays.
- **Capacity and waitlist state inside JSON.** Seat counting relies on locking the `Initiative`/`Experience`/`Session` row and counting rows; a JSON array of registrants loses per-person uniqueness (`UQ(PersonId) WHERE Status IN ('Accepted','Suspended')`) and creates lost updates under concurrent writes. No table-free fix.
- **`AuditEvent` removed or merged into `Notification`.** Admin governance (suspend, unpublish, remove) loses its INSERT-only record. Not acceptable.

### The cap can also be met by relabeling

If ASP.NET Identity is used, it adds about seven tables (`AspNetUsers`, roles, claims, logins, tokens). Hangfire adds about ten. EF migrations history is one more. v4 deliberately avoids Identity by modeling `iam` itself. "Application tables" must be defined before any cap is meaningful; otherwise it is a number you can hit by moving things outside the count.

---

## 3. Could fewer tables make DeepSprout harder to maintain?

**Yes, and v4 already shows it. Below roughly 55 tables the complexity moves into the rows and the C# faster than it leaves the schema.**

**What a smaller count produces, concretely.**

- *Wide polymorphic tables.* The five v4 merges listed in section 1 are at 55–65% nullable. Each additional merge adds a `Kind` and a CHECK matrix: for each kind, which columns must be non-null and which must be null. A table with three kinds needs a CHECK with three branches over 10+ columns, and a new kind edits every branch. EF Core TPH mapping or discriminated owned types hide some of it, but migrations, filtered indexes (`UQ ... WHERE Status IN (6 values)`) and queries all grow.
- *State machines with many states in one column.* `InitiativeApplication` already carries 14 states (Pending, Queued, Offered, Accepted, Suspended, Removed, Withdrawn, Rejected, OfferDeclined, OfferExpired, Blocked, Completed, Cancelled, and so on) with a transition trigger. Merging further lifecycles into it (excuses, completions) would make the transition table undecidable by inspection.
- *Test matrix growth.* v4 maps 330 earlier checks: 140 carried, 101 to rewrite, 61 regenerated. Each guard needs a test, each CHECK branch a valid and invalid row. Fewer tables with more branches does not shrink the test matrix; it concentrates it.

**JSON, evaluated honestly.** The target is `net10.0` (visible in the `Server` publish path), so EF Core can map JSON to owned or complex types and translate common queries; SQL Server supports `OPENJSON`, `JSON_VALUE` and indexes on computed columns.

- Good for: sealed, single-owner snapshots read as a whole (`PublishedSnapshotJson`, `PlanJson`, a sealed form's question list, `StagesJson`, settings). v4 already has 28 JSON columns, all with `ISJSON() = 1`, and the policy "no JSON for anything needing a FK, identity, uniqueness or multi-user update" is sound.
- Bad for: anything edited after creation by more than one actor, anything counted or filtered in SQL, anything referenced by another row. Correcting a wrong value needs `JSON_MODIFY` or load-modify-save of the whole document (a lost-update risk without `RowVersion`), reporting needs computed columns, and there is no FK to catch a typo'd key. A bug here is a silent wrong total, not an exception.

**Specialized history tables whose maintenance cost exceeds their benefit.** `SessionRevision`, `AssignmentRevision`, `ShieldConfiguration`, `ShieldSelectedDomain`, `AssessmentScore` as a separate append-only table, `PracticeProgressionDecision`, `RewardPolicyVersion`, and the reward entries. Each needs entity, configuration, migration, immutability guard, tests and an ERD entry, to serve a screen that does not exist or can read the same fact from a source row.

**Whole-stack view (SQL Server and ASP.NET Core together).** Scoring each design by total moving parts, not table count:

| Design point | SQL objects | C# objects/logic | Verdict |
|---|---|---|---|
| 87 tables, 95 guards, 294 CHECKs | Very high (many raw-SQL triggers) | Low-moderate (many small entities) | Heavy on the SQL side, which is the hardest side to refactor and review |
| ~60 tables, fewer triggers, a few more C# validators | Moderate | Moderate | Lowest total |
| ~40 tables | Lower table count, but denser CHECKs, wider rows | High (per-kind validators, JSON schema validation, derived views) | Total complexity not lower; harder to diagnose |
| ~28 tables | Low | Very high, or functionality removed | Only works for a smaller product |

---

## 4. Independent audit of RoadNa JO

**Facts from the model:** 28 tables, 197 columns, 62 relationships, 13 enum CHECKs, six extra statements (one filtered unique index, four plain indexes, one CHECK). No `RowVersion` or concurrency column anywhere. Grouped into six areas (people and teams, reports, field work, community votes, donations, messages) — about 4.7 tables per area. DeepSprout v4 is 87 tables in 19 schemas, about 4.6 per schema. **The density per area is essentially the same. RoadNa is smaller because it has fewer areas, not because it models each area more economically.**

### Genuine strengths

- A clean, readable core. The report → work order → check → escalation chain is understandable in one screen.
- Good use of keys as constraints: `report_vote` and `proposal_vote` are keyed `(item, user)`, so one vote per account is structural; `rating.report_id` unique (one rating per report); `team_member.user_id` unique (one team per person); `proposal_decision.proposal_id` is its own key.
- A filtered unique index (`UX_work_order_one_open`) enforces "one open work order per report" in the database. It is the same technique v4 uses, and it is the single most valuable constraint in the model.
- `CK_donation_move` and a unique `payment_ref` show attention where money moves.
- Resident-facing status is derived from a staff stage in code (the "Rules" tab states it), which avoids duplicating two lifecycles in storage. This is a good lesson for DeepSprout.
- No versioning, no policy tables, no append-only ceremony: it does not model what it does not need.

### Weaknesses — concrete, not stylistic

1. **A vote can pick another proposal's option.** `proposal_vote` has FKs to `proposal(id)` and `proposal_option(id)` separately, with no `(proposal_id, option_id)` composite. Nothing stops `option_id` from belonging to a different proposal. v4's composite ownership FKs exist to prevent exactly this class of bug.
2. **Tenant isolation is a claim, not a constraint.** The Rules tab says "everything belongs to a municipality … without seeing each other", but only `report`, `app_user`, `proposal`, `department`, `area` carry `municipality_id`. `work_order`, `donation`, `team`, `category` reach it through joins, and `report.category_id`/`area_id`, `team.leader_id`, `app_user.department_id` are plain FKs with no check that both sides are the same municipality. A wrong id crosses tenants without a database error.
3. **Money is a counter plus one status column.** `funding_campaign.raised` is a stored sum; `donation.status` (held, used, choose, refunded, moved) is the whole refund lifecycle. There is no payment-transaction or refund record, no idempotency beyond a unique `payment_ref`, no check that `raised` equals the sum of held donations or does not exceed `target`, and `moved_to_id` assumes the whole amount moves to one campaign. `raised` can drift under concurrent donations because there is no `RowVersion` and no ledger to recompute from. `campaign.report_id` is unique, so a declined or failed campaign can never be re-requested for the same report.
4. **History is thin and untyped.** `report_event.event_type` is free text (`NVARCHAR(30)`, no CHECK); no from/to stage; no event table for work orders, donations, proposals or role changes. `notification.kind` is also free text.
5. **Duplicated derived state.** `report.is_funded` and stage `funding`; `work_order.rework_count` and the count of `sent_back` rows in `work_check`. Nothing keeps them in sync.
6. **Missing obvious checks.** No CHECK on `rating.stars` (1–5), `donation.amount > 0`, latitude/longitude range, or "2–4 options per proposal"; `closes_at` is not tied to `status`; `report.duplicate_of_id` has no self-reference check; `report.source = 'proposal'` has no FK to the proposal that created it.
7. **Authorization-relevant relationships are unconstrained.** `app_user.role` is a single value with the seven roles listed; `team.leader_id`/`supervisor_id` can reference any user regardless of role; `work_check.supervisor_id` need not supervise that team; the leader need not be a member of the team; `rating.resident_id` need not equal the report's resident; `campaign_expense.work_order_id` may belong to a different report. All of these are "enforced by C#".
8. **Photos are URLs.** `report_photo.url`, `work_photo.url`, `campaign_expense.receipt_url`: no owner, hash, size, content type or access rule. Fine for public municipal photos, unsafe for anything private.
9. **No identity or operational infrastructure.** No OTP, verification, lockout, refresh token, consent, audit or outbox table. A real deployment adds roughly seven to ten tables (or a library's tables). The honest comparable count is mid-30s, not 28.

### Why the count is lower

| Reason | Explanation | Fair or a shortcut? |
|---|---|---|
| Simpler product | One role per person, no versioned definitions (a report is not published in revisions), no scoring policy, no capacity and waitlist, no attendance, no forms engine | Fair. It is a smaller business |
| One lifecycle per object with timestamps | `work_order` has eight states and eight timestamp columns | Fair for its size, but state transitions live in C# |
| Rules deferred to application code | tenancy, roles, money consistency, derived counters | A shortcut. These are the places DeepSprout's extra tables and FKs actually earn their cost |
| Infrastructure not modeled | auth, audit, files, outbox | Incomplete rather than simpler |

**What DeepSprout should learn from RoadNa:** derive the user-facing status in code; do not version what has no reader; use keys as constraints; use the filtered unique index for "only one open X". **What DeepSprout should not copy:** counters without ledger, free-text event types, URL columns for private files, tenancy by convention. RoadNa is well designed for what it is, and it is not evidence that DeepSprout can be 28 tables.

---

## 5. Realistic table-count ranges (feasibility scenarios, not designs)

| Range | What it requires | Sacrifices | SQL complexity | C# complexity | Maintenance burden | Verdict |
|---|---|---|---|---|---|---|
| **25–30** | Delete whole modules or run on generic key-value/JSON structures. Roughly: no forms/competitions engine, no provider cohorts/incidents, no Shield per-site usage, no community moderation depth, no CMS releases, no staffing history, JSON for sessions and rewards | A different, smaller product (about RoadNa's scope). Capacity, attendance and authority rules move to C# | Low | Very high; weak safety net | Poor; defects appear as wrong data | **Not feasible for approved scope** |
| **31–40** | All B and C removed (→54) plus ~14 real merges: person profile into `Person`, definition into version, post into comment, notification into outbox, excuse and completion into attendance/application, review into submission, plus deleted features (competition judging, per-site usage, cohorts, incidents, moderation reversal) | Class 4 and some Class 5 losses; audit-grade history for attendance and consent weakened; five or six tables of 20–25 columns each with per-kind CHECK matrices | Medium: denser CHECKs, fewer triggers but harder ones | High | High; one table change touches several features | **Feasible only by removing approved features. Not recommended** |
| **41–55** | All C and most B removed, plus a few A merges (`IndividualProfile`→`Person`, `PracticeDefinition`+`PracticeVersion`, `Post`+`Comment`, `Notification`+`Outbox` channel state) | Optional history only (Class 1–3), wider rows, more validators in C#. Core guarantees intact | Medium | Moderate-high | Acceptable but diminishing returns below ~52 | **Feasible without serious degradation at 50–55; each table below that costs more than it saves** |
| **56–70** | All C removed, selected B folded (`GlobalGrant`, `AssessmentWindow`, `AssessmentScore`, usage period/domain, `Reaction`+`Bookmark`, `FormQuestion` into the sealed version), every A table kept | Reward ledger replaced by derivation; session/assignment revision history lives in audit; per-version re-score history lost | Moderate; roughly half the current guards | Moderate | **Lowest total cost of ownership** | **Recommended band** |
| **87 (v4)** | Everything in this assessment | None functionally; most cost | Highest (95 guards, 294 CHECKs, 85 composite FKs) | Low per table | High: 33 append-only tables, 330 checks to carry or rewrite | Correct but over-fortified |

Rough arithmetic behind 56–70: 87 − 15 (all C) = 72; folding another 8–12 of the B set lands between 60 and 64. Pushing every B fold and the four A merges listed under 41–55 gives about 52–55, which is the practical floor for the approved scope.

---

## 6. Conclusions

**1. Is 87 tables excessive?** Yes, by about 20 to 28 tables. Roughly 15 are unjustified (list C) and 8–12 more are better folded (list B). It is not "wildly" excessive: 54 tables carry real independent lifecycles and nothing here supports the idea that the model should be near RoadNa's size. The 87 is over-fortified, not misconceived.

**2. Is 40 genuinely feasible without serious degradation?** No. After removing every table that is not defensible, 54 remain, and the remaining 14 would have to come from merging distinct lifecycles or removing approved features. At 40, competition judging, per-site Shield usage, cohort transfers, incident records and some history become unavailable, and authority, attendance and consent records get weaker. **40 tables would seriously damage DeepSprout's approved scope.**

**3. The biggest causes of unnecessary complexity (ranked):**
1. The four-table reward ledger and frozen policy for a cosmetic garden.
2. Tables that exist as FK targets (`ShieldSelectedDomain`, `FormQuestionOption`, `CompetitionCriterion`, `CompetitionCriterionScore`) rather than as entities.
3. Versioning everything: `SessionRevision`, `AssignmentRevision`, `ShieldConfiguration` have no reader.
4. "Strict relational by default" for sealed, immutable content that JSON handles safely.
5. 33 append-only tables with 95 documented guards, enforced outside EF.
6. Wide polymorphic merge tables (`StaffAppointment`, `OperationalReport`, `Completion`, `GroupMembership`, `PartnershipLink`) that cut the count by moving complexity into rows, which v4's merge rule never charged for.
7. Tables for undecided policy (`AssessmentWindow`, `PracticeProgressionDecision`).
8. Isolation splits that assume separate SQL principals (`PasswordCredential`, `ReviewPrivateNote`).
9. `IdempotencyRecord`, which my earlier analysis added for a risk the unique indexes and `RowVersion` already cover.
10. The verification apparatus itself: 294 CHECKs, 85 composite FKs, 330 tests mapped (101 to rewrite). It is a cost center that grows with every table.

**4. Most endangered by a 40-table cap:**
- Attendance → completion → certificate accountability (`AttendanceCorrection`, `Completion`, `AbsenceExcuse`).
- Consent history for Shield telemetry and privacy (`ConsentRecord`).
- Capacity and waitlist correctness under concurrency (`InitiativeApplication`, `ExperienceBooking`, `SessionRegistration`, and the row-lock design).
- Authorization derived from separate authority tables.
- Reliable email delivery (`OutboxMessage`) and admin audit (`AuditEvent`).
- Private file authorization (`SecureFile`).
- Competition judging and per-site Shield usage, as features.

**5. Could better modeling significantly reduce the count while improving maintainability?** Yes. Removing all 15 C tables and folding the eight best B candidates reaches 62–64, deletes more than half of the guards, and shrinks the test matrix. That is a real improvement. Below about 52 the gain stops: each further merge makes a table wider and more nullable than the ones it replaced.

**6. Recommended range without a numerical limit:** **56–64 tables, aiming at about 60.** This keeps every approved capability and every A-class guarantee, drops the history and ledgers nobody reads, and puts SQL and C# complexity in balance.

**7. Strict 40-table maximum?** No. I would not adopt it. It is a number I could meet only by deleting approved features or by relabeling tables out of the count, and the cost would show up as wide tables, validator code and silent-wrong-data bugs, not as a simpler system. If a cap is wanted, make it a rule about *justification* ("each table must be needed for an independent identity, unbounded growth, separate authority, a privacy boundary, or a history a user sees") rather than a count. That rule gets you to roughly 60 on its own.

### Where the two conclusions are both true

87 is unjustifiably complicated in about a quarter of its tables, and 40 would damage the product. These do not conflict: the right answer sits between them, closer to 60.

### What this does not decide

- Whether to amend v4 (apply the C removals and chosen B folds to the existing model and regenerate) or start a separate v5. Amending is cheaper because `generate.mjs` already validates the 129 → target reconciliation; I have not touched or changed it.
- Which of the eight B folds to actually take. That is a per-table decision for the next phase, with the product owner for the two that change Insights ("By website", tier history).
- The reapplication rule for **Completed** memberships: the owner decision as stated covers withdrawal and removal only.
