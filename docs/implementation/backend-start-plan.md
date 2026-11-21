# Backend implementation plan

**Status:** implementation plan, 21 November 2026. This document describes the current checkout and a recommended order of work. It does not authorize applying migrations to an existing named database or changing the approved 58-table design.

## Where we are

- DeepSprout is one ASP.NET Core MVC application. Razor serves the pages; the main Individual and partner workflows still run in browser JavaScript and `localStorage`. Browser records are device-local and are not SQL Server records.
- The owner-approved target is the **58 application-table V5 lean design** (`v5-lean-2`), with `DeepSproutV5DbContext`, generated V5 entities/configuration, and migrations. The older `DeepSproutDbContext`, M1 entities, migrations, and database validation harness are historical only.
- The current server code goes beyond the dated guides: `AccountController` registers an Identity user and `iam.Person`/`personal.IndividualProfile`, signs in, signs out, and exposes an authenticated session. The host requires a V5 connection string and uses a signed JWT in an HTTP-only cookie. Registration/login are server-backed; the browser's own people/session and personal journal have **not** been connected to that identity.
- A `/api/community` controller has been added to the working tree and a Community API document describes it. The Member and Admin Community pages still use their browser stores. Treat this API as an unintegrated slice until it passes current-tree tests and the pages use it.
- The working tree contains uncommitted changes. Reconcile them before starting a backend branch or judging any dated test report. Some README, product-guide, and persistence-contract statements predate the account and Community code.

## Recommended starting point

Make **one real Individual's six-question Quick Setup** the first end-to-end server-backed workflow. It is central to onboarding, fits the approved `personal.IndividualProfile` columns, has no multi-person capacity race, and proves the most important boundary: the signed-in person can save and reload their own record from SQL Server on another browser session.

First make the account/session boundary dependable; then add one narrow setup read/write path. Do not copy the whole browser journal to the server or introduce a general sync engine. A server-backed page must read its displayed value from the server, and a failed save must remain visibly unsaved. Keep the existing demo store only for explicitly demo-only flows during the transition.

## Delivery sequence

### 0. Establish a safe baseline

1. Review the uncommitted account, Community, and client changes; record which code is intended to remain. Update the current documentation map and persistence contract to reflect actual behavior, without treating an old report as a requirement.
2. Build the solution and run the existing MVC smoke test. Create a **new disposable V5 database** for server integration tests; apply only `DeepSproutV5DbContext` migrations there. Do not migrate `DeepSprout_V5_Demo` or `DeepSprout_Validation`.
3. Verify registration, sign-in, sign-out, expired/revoked session behavior, antiforgery, and a second user's inability to read the first user's data. Add focused HTTP/database tests for gaps. Confirm development secrets and Data Protection keys are outside source control.
4. Make one identity map explicit: `ApplicationUser.PersonId` is the server actor; browser IDs such as `p-ahmad` are never accepted as authority. Expose only the session fields the client needs. Decide whether the existing JWT cookie has a real requirement; for a same-origin MVC application, the standard Identity application cookie is the simpler long-term choice. Do not run two authentication schemes for the same pages.

**Done when:** a new user can register, sign in again, and access only their own protected server data in a fresh disposable database. Startup does not silently migrate a database.

### 1. Ship the Quick Setup vertical slice

1. Add one authenticated read action and one antiforgery-protected save action for the six answers. Use a small request/response model and direct EF Core access. Resolve `PersonId` from the authenticated user, never from request JSON.
2. Validate the six allowed answer sets and write `SetupAnswersJson`, `SetupAnswersVersion = 2`, `GoalCode`, and the appropriate onboarding stage on `IndividualProfile`. If replacing existing answers, write the previous value to `ops.AuditEvent` in the same transaction, as the persistence contract requires.
3. Connect the existing Quick Setup UI to those actions. On load, use the server result; on save, wait for a successful response before advancing. Keep the original Azm, HeroReels, and visual flow intact. Handle validation, network failure, refresh, and retry without duplicate or false progress.
4. Test anonymous access, cross-person isolation, bad answer codes, repeat save, audit of replacement, and reload in a new session. Check the current onboarding browser test for any demo-mode assumptions before updating it.

**Done when:** one signed-in user can save and reload the six answers from V5 SQL Server, another user cannot see or change them, and the page no longer presents a browser-only answer as server-saved.

### 2. Complete the first personal journey

Move one action at a time: preliminary Week 1 preview → explicit plan activation → own plan/Home read model → routine and scheduled actions → weekly review. Use the approved `recovery.*` and `activity.*` tables. Activation writes its linked rows in one transaction, is safe to retry, and never requires Lab results. Keep source labels honest; derive Insights and Garden from persisted source facts later, with no new reward table or fabricated measurement.

### 3. Connect an existing small shared workflow

After the personal slice is stable, connect the existing Community pages to the Community API, including Admin moderation. Remove their production dependence on local sample people and local post stores for that feature. Decide explicitly whether any real browser records should be imported; do not silently merge fixture records. Keep two-person quiz rooms browser-local until their separate schema/transport proposal is approved.

### 4. Add Institution operations in dependency order

Implement Institution Representative registration and verification, then Institution profile, Initiative publication, Individual application/admission, scoped staff invitations, groups, sessions/attendance, and Institution-owned Outdoor Activity booking/completion. For each workflow, expose the smallest useful read plus command pair and connect the relevant page. Check active resource scope on every request. Protect the 135 accepted-student and three active-Supervisor limits inside transactions under concurrent requests. Keep the retired Coach Program and partnership tables read-only; do not reintroduce Outdoor Provider or Supervisor self-request.

### 5. Import and deployment readiness

Only after the server workflows are proven, design an opt-in browser-data import keyed by verified email and `iam.Person.PublicId`, with a dry run, immutable backup, conflict report, and idempotent replay. Import no demo fixture as a real person. Adoption of `DeepSprout_V5_Demo` is a separate owner-approved operation after a verified backup and the documented schema checks. Add production email delivery, operational jobs, monitoring, and retention policy when their workflows require them.

## Keep the code simple

- Stay in the existing MVC solution. Use a thin controller, one small service when a workflow has multiple rules/writes, and `DeepSproutV5DbContext` directly. Avoid a generic repository, unit-of-work wrapper, CQRS framework, event bus, or second API project.
- Keep one authoritative store per migrated feature. Prefer a clear `GET` and command endpoint over a broad generic state-sync endpoint. Return small DTOs rather than EF entities or the browser's whole graph.
- Put authentication and resource authorization on the server. Use Identity for credentials, reset, verification, and lockout; do not add another password/OTP implementation. For multi-row state changes, use one transaction and the existing database constraints. Add an idempotency/concurrency mechanism only where retries or races make it necessary.
- Write focused integration tests for actual boundaries: another person's data, invalid transitions, retry/concurrency, and database constraints. Avoid tests that only restate a method's implementation.
- Change the V5 schema only for an approved need and only through `v5-lean-design/generator/model.mjs`, its generators, a V5 migration, and negative tests on a fresh disposable database. Never hand-edit generated V5 files or extend the historical M1 context.

## Decisions to settle at their point of use

- Before partner onboarding: exact Representative/Institution verification evidence and replacement policy.
- Before standalone Session staffing: the deferred Supervisor appointment model.
- Before attendance imports: import-batch storage and the meaning/storage of “Needs Review.”
- Before cross-device quiz: the pending quiz schema and realtime transport proposal.
- Before production browser-data import or named-database adoption: retention, conflict handling, owner go-ahead, and verified backup.

These decisions do not block the first Quick Setup slice.

## Source documents and code

- Owner target and 8 November addendum: [`p0-target-v4.1.md`](../architecture/p0-target-v4.1.md)
- Approved database and workflow mapping: [`database/README.md`](../architecture/database/README.md), [`persistence-contract.md`](../architecture/database/persistence-contract.md)
- V5 migration/adoption procedure: [`efcore-v5-adoption.md`](../architecture/database/efcore-v5-adoption.md)
- Current server entry points: `src/DeepSprout.Web/Program.cs`, `Controllers/AccountController.cs`, `Controllers/CommunityController.cs`
- Current browser state: `wwwroot/src/js/data/account.js`, `wwwroot/src/js/utils/storage.js`, `wwwroot/src/workspaces/store.js`
