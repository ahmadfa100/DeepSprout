# DeepSprout — Final Comprehensive Database Architecture Review & Redesign

You are acting as a Principal Software Architect, Database Architect, Domain-Driven Design Specialist, SQL Server Engineer, and ASP.NET Core / EF Core Architect.

We are preparing the **next official DeepSprout delivery milestone: the database architecture and database implementation**.

The static HTML/CSS/JavaScript demo phase is finished. Do not treat the absence of a backend in the current repository as a decision to remain static.

Your mission is to revisit your original database architecture with complete technical independence, critically evaluate the attached Claude review, incorporate all newly approved product-owner decisions, and produce the most accurate, coherent, justified and implementation-ready database architecture for DeepSprout.

**Do not defend your original 136-table proposal merely because you created it. Do not automatically accept Claude's suggested 115-table alternative either. The design must determine the table count, not the other way around.**

---

## PHASE 1 — Deep repository and requirements investigation

Before proposing changes, carefully review:

1. The complete `DeepSprout.md` specification, including its approved decision register D01–D48 and all domain rules.
2. `AGENTS.md`, `DESIGN.md`, and `DeepSprout-DESIGN.md`.
3. All 27 documents and diagrams in `docs/architecture/database/`.
4. Your original 136-table database dictionary, entity catalog, relationships, invariants, transaction architecture, ADRs, validation scenarios and implementation roadmap.
5. The **attached independent Claude review** of your database architecture. Read the entire document; do not rely on its summary alone.
6. The current frontend implementation, domain models, state stores, business rules, and relevant tests.
7. Any additional repository documentation needed to establish the actual state of the project.

Follow repository AGENTS instructions, including CodeGraph guidance when applicable.

For every important architectural finding, distinguish:

- Approved product requirements.
- Newly approved product-owner decisions.
- Existing implementation behavior.
- Your original architectural assumptions.
- Claude's recommendations.
- Your newly evaluated engineering conclusions.
- Unresolved product decisions.

Cite exact file paths and relevant sections or line references.

Do not treat any earlier AI-generated document as more authoritative than the product owner's explicit decisions.

## PHASE 2 — Incorporate the final owner decisions

The following decisions are approved and take precedence over conflicting older descriptions.

### 2.1 The demo phase is over

The next priority is the **database**.

We intend to progress toward a real system based on:

- ASP.NET Core / C#
- Entity Framework Core
- Microsoft SQL Server
- Modular Monolith architecture
- One relational database with appropriately separated domain modules

The immediate deliverable is comprehensive database design, SQL constraints, ERDs, implementation-ready artifacts, and actual SQL Server validation where possible.

Do not divert this task into redesigning the frontend or implementing the entire backend API.

### 2.2 Exactly one Initiative membership at a time

**A student may belong to only ONE Institution Initiative at any given time. Period.**

Do not interpret this as permission for parallel Initiative participation.

The database must enforce the rule, not merely document it.

A student's historical participation in past Initiatives must be retained.

Switching from Initiative A to Initiative B is not concurrent participation. It requires properly ending the previous effective membership and following the valid application/admission process for the new Initiative.

Do not assume additional behavior for multiple pending applications unless the specification explicitly establishes it. If necessary, identify that as a separate narrow policy question.

If you test simultaneous attempts to accept a person into different Initiatives, that is a **negative integrity test**: the database must prevent two effective memberships. It is not a supported product scenario.

Review effective membership statuses carefully and explain the SQL uniqueness/transaction strategy.

### 2.3 Student application and withdrawal

The user sees an Initiative in Explore and applies to join.

The application appears in the authorized Supervisor/Representative application queue.

Approval follows existing authority rules:

- Active Initiative Supervisor OR Institution Representative may approve an eligible application.
- Representative-only powers such as Reject, Remove, Suspend, Restore, and Block remain unchanged.
- Approval creates a valid membership only after checking authorization, eligibility, capacity and the single-Initiative rule.

A student with a `Pending` application may withdraw that application.

For an accepted membership:

- Ordinary voluntary withdrawal or switching is allowed only while **more than five days remain before the Initiative begins**.
- At five days or less before the start, the student cannot voluntarily withdraw or switch through the normal flow.
- Preserve authorized administrative actions and immutable historical records.

Do not silently assume whether "five days" means 120 exact hours or five local calendar dates. Present the exact semantics as a narrowly scoped product decision with a recommendation.

Likewise, evaluate the implications of rescheduling an Initiative, ended/completed/removed membership, pending applications, reapplication after rejection, and valid exceptions.

Do not invent new product behavior to make the schema easier.

### 2.4 Capacity is numeric, not individually numbered seats

An Initiative, Session or Experience has capacity; it does not assign numbered physical seats.

Therefore, do not retain these numbered seat tables in the recommended design unless you can demonstrate an indispensable requirement:

- `InitiativeSeat`
- `SessionSeat`
- `ExperienceSeat`

Compare:

**A.** Authoritative membership/booking/offer counts under correctly serialized SQL Server locking.

**B.** Atomic allocated/held counters with appropriate CHECK constraints, protected updates and reconciliation.

Choose the simplest correct approach.

Explain:

- How capacity is enforced under concurrency.
- How confirmed participants and active held offers consume capacity.
- How withdrawal, cancellation, offer expiration, suspension and authorized removal affect availability.
- How counters, if used, are kept consistent with authoritative records.
- How retries, idempotency and race conditions are handled.

Never claim that a CHECK constraint alone proves a stored counter matches the underlying membership/booking records.

Preserve the approved maximum of 135 accepted students per Initiative and three active Initiative Supervisors.

### 2.5 Garden

The Personal Garden has **four main trees**, each representing one of the four approved Meaningful Practice types.

The trees have **different visual forms**.

No single-main-plant interpretation should override this decision.

Do not create one SQL table per decorative tree. Preserve the source-backed Evidence/Reward model, while keeping the visual rendering independent.

Preserve the approved collective Garden ownership rules for Initiatives and independent Coach Groups.

### 2.6 Recovery and AI

Recovery Plans are determined by the application's approved, deterministic or explicitly rule-governed Recovery Engine, not by a generative AI model.

AI may support:

- Insights summarization.
- Authorized Supervisor operational summaries.
- Quick contextual assistance.
- Explanations of real results and observations.
- Other non-authoritative assistance within approved permissions.

AI must not become the authority for:

- Recovery Plan creation or alteration.
- Lab scoring.
- Attendance verification.
- Initiative application approval.
- Reward eligibility or reward issuance.
- Granting operational permissions.

Original domain records, SQL-backed facts and approved C# business rules remain authoritative.

A third-party AI provider may be used for appropriate authorized summaries, but personal-data sharing, purpose limitation, security, consent and retention require explicit contracts.

AI must not receive unrestricted database access or private Lab/Recovery/Shield data through Supervisor reports.

Do not invent a large AI data model or chatbot history tables unless a concrete requirement justifies them.

## PHASE 3 — Independent critique of the Codex and Claude proposals

Read Claude's entire attached analysis and evaluate **every substantive claim**.

At minimum, investigate:

1. Removal of numbered seat tables.
2. Synchronous versus asynchronous Evidence/Reward processing.
3. AuditEvent versus dedicated business history/correction tables.
4. `OnboardingProgress` and `RecoveryJourney` versus `IndividualProfile`.
5. `AssignmentRecipient` versus `Submission`.
6. `ProgramStage` as relational records versus JSON.
7. `SessionRevision` and historical session terms.
8. `AssessmentResponse` versus JSON-based assessment payloads.
9. `PracticeProgressionDecision`.
10. `ShieldSelectedDomain` and `BrowserUsageDomain`.
11. `CoachReport` and `SupervisorReport`.
12. Shared versus specialized verification records.
13. Shared versus specialized invitation records.
14. Rebuildable projections versus querying authoritative records directly.
15. The six circular `CurrentRevisionId` relationships.
16. The missing or insufficiently modeled `InitiativeApplicationDecision` history.
17. Ownership and placement of `SecureFile`.
18. `ProgramGroupInvitation` use-count fields.
19. The `RecoveryJourney.PersonId` uniqueness concern.
20. Composite Foreign Keys, cross-owner integrity, parent-child consistency, and resource-scoped authorization.

For every issue, provide:

- Original design.
- Claude's criticism.
- Evidence from specifications and actual schema.
- Your independent analysis.
- Alternative designs, where meaningful.
- Tradeoffs and possible failure modes.
- Final recommendation.
- Impact on table count, integrity, query complexity, and maintainability.

Classify Claude's findings as:

- Confirmed defect.
- Valid simplification opportunity.
- Context-dependent tradeoff.
- Unsupported or overstated criticism.
- Requires product-owner decision.

Be willing to disagree with both your earlier proposal and Claude, but substantiate the disagreement.

## PHASE 4 — Justify every database table

Take the entire original 136-table inventory as the starting point.

For every table, supply:

1. Exact original table name.
2. Business/domain responsibility.
3. Requirement or invariant that justifies it.
4. The authoritative source reference.
5. Key relationships and ownership.
6. Whether it stores original data, a relationship, business history, a published version, a derived projection, or technical infrastructure.
7. Whether it is strictly necessary, mergeable, removable, deferrable, or conditional on an unresolved policy.
8. Consequences of removing or merging it.
9. Recommended final destination: KEEP, MERGE, REMOVE, DEFER, or REDESIGN.
10. The implementation milestone in which it is needed.

Also account explicitly for newly introduced tables.

Do not omit any of the original 136 tables from this review, even those you recommend removing.

Do not confuse deferred implementation with deletion of an approved capability.

Do not design merely for the smallest number of tables.

The objective is the **minimum sufficient relational complexity that correctly supports the complete approved DeepSprout domain**.

## PHASE 5 — Produce a complete, defensible logical domain model

Design all approved bounded contexts and their relationships.

Pay particular attention to:

- One Person and scoped grants.
- Individual, Lab, Recovery, Activity and Digital Shield.
- Institution, Initiative, applications and memberships.
- One effective Initiative membership per student.
- Institution staff and Representative/Supervisor permissions.
- Independent Coach Programs.
- OperationalGroup Initiative XOR CoachProgram ownership.
- Shared Assignments, Submission Attempts and Review Decisions.
- Session registration, attendance, excuses and completion.
- Provider experiences, bookings, waitlist and offers.
- Forms, competitions, partnerships and secure files.
- Evidence, rewards and Garden.
- Community and Admin governance.
- Commercial entitlement models, where policy permits.
- Notifications, audit, idempotency and external integrations.
- Authorized AI Insights contracts without unnecessary persistence.

For every aggregate and important relationship, explain why that ownership boundary is correct.

Preserve original authorship, published versions and historical participation across transfers, revocations and corrections.

Avoid inappropriate generic polymorphic tables that sacrifice relational integrity.

## PHASE 6 — SQL Server physical architecture

Produce an implementation-ready SQL Server design including:

- Final table and column names.
- SQL schemas and module ownership.
- Primary and Foreign Keys.
- Composite Foreign Keys.
- Alternate Keys.
- Unique and filtered unique indexes.
- CHECK constraints.
- Required versus nullable columns.
- Column data types and length decisions.
- Index access patterns.
- RowVersion/optimistic concurrency where appropriate.
- Strong transaction boundaries and lock ordering.
- Referential deletion and retention strategy.
- Immutable published versions and append-only business history.
- UTC timestamps and relevant local date/timezone contracts.
- Security classifications, file references and sensitive-data controls.
- Idempotency and outbox where genuinely required.
- Migration ordering and potential circular dependencies.

Explicitly distinguish constraints enforceable directly in SQL Server from domain rules that require transactional application logic.

Do not rely on frontend validation as a security or integrity boundary.

## PHASE 7 — Required visual artifacts

Create readable Mermaid diagrams for:

1. Overall platform domain/context map.
2. Core identity and resource-scoped authorization.
3. Institution/Initiative/admission/membership.
4. Coach/Groups/Assignments.
5. Sessions/Attendance/Excuses.
6. Provider/Bookings/Capacity/Waitlist.
7. Individual/Lab/Recovery/Activities/Shield.
8. Evidence/Rewards/Garden.
9. Security, Audit and Outbox relationships where relevant.

Also create **one simplified master ERD** that a product owner or technical reviewer can understand without reading the entire database dictionary.

Detailed diagrams must be consistent with the final schema, not merely conceptual illustrations that contradict the actual Foreign Keys.

## PHASE 8 — Database acceptance criteria and validation

Prepare executable SQL Server tests or isolated proof-of-concept scripts for critical invariants.

Include:

- Initiative capacity enforcement.
- Offer-hold capacity accounting.
- Approved withdrawal and cutoff handling.
- Prevention of more than one effective Initiative membership per person.
- Application decision history.
- Three active Initiative Supervisors maximum.
- Group XOR parent enforcement.
- Cross-Initiative/Program ownership constraints.
- Submission/review integrity.
- Attendance separate from excuse and completion.
- Provider booking and offer-expiry races.
- Evidence/Reward duplication prevention.
- Historical preservation after correction or transfer.
- Grant revocation and unauthorized access cases.

For the one-Initiative rule, any attempt to create conflicting effective memberships must fail. Such a test does NOT represent an allowed multiple-Initiative workflow.

If SQL Server execution is available, run the tests in a disposable environment and report actual outcomes.

If execution is unavailable, provide reproducible SQL scripts and label those tests NOT EXECUTED. Do not invent success results.

## PHASE 9 — Deliver a final justified architecture package

Create a new versioned architecture package without destroying the original 27 documents or the Claude report.

Provide:

- Executive review in Arabic.
- Updated owner-decision and requirements conflict register.
- Complete comparison: Original Codex vs Claude vs Final recommendation.
- Table-by-table justification matrix.
- Final entity catalog.
- Final SQL Server data dictionary.
- Relationship and integrity constraint catalog.
- ERDs and workflow/state diagrams.
- Database security and ownership design.
- Concurrency and transaction strategy.
- Evidence/Rewards and AI integration boundaries.
- EF Core model/configuration strategy.
- Implementation and migration dependency plan.
- Executable validation tests or proof-of-concept scripts.
- Final architectural ADRs.
- Outstanding policy decisions with precise consequences.
- A clear database sign-off checklist.

Provide three separate table counts:

1. Original proposed architecture.
2. Revised complete target architecture.
3. First database implementation milestone.

If useful, provide an additional staged operational-core count, clearly labeled.

Every count must reconcile against an explicit list of table names. No invented totals.

## PHASE 10 — Final engineering verdict

At the end, answer these questions clearly in Arabic:

1. Was the original 136-table design overengineered? In which specific areas?
2. Which criticisms from Claude are correct, partially correct or incorrect?
3. How many tables do we truly recommend, and why?
4. Why does each retained table deserve to exist?
5. Which alternatives did we reject and why?
6. Does the schema preserve every approved product behavior?
7. Does it correctly implement the new one-Initiative rule and five-day withdrawal policy?
8. Can the SQL Server database be created and validated without fundamental redesign?
9. Which requirements remain blocked by unresolved product decisions?
10. What is your final GO / CONDITIONAL GO / NO-GO recommendation for implementing the database?

**Do not begin a broad backend or frontend implementation. This task is the final architectural redesign, justification, and database validation gate.**

Preserve original source material, maintain traceability, and do not silently resolve product-policy ambiguities.

The final result must be technically rigorous, readable, executable where applicable, and genuinely simpler wherever simplification does not compromise correctness.

**The goal is not an impressive number of documents or tables. The goal is a correct, maintainable, complete and defensible database architecture for DeepSprout.**