# DeepSprout — Round 0 stabilization report

Date: 16 October 2026. Scope: the three authorized Round 0 slices, executed in order. No commit was made. Outdoor Provider Round 1 and Individual Round 2 were not started.

## Result

The confirmed P0 defects in this Round 0 scope are fixed. Canonical Individuals have separate first-run and journal partitions; cached journals reject a changed subject; limited Students cannot load personal journals; shared participation, owner, booking and assignment guards protect both UI entry paths. Failed saves return errors before success/navigation, and migrations require a saved original backup.

The original Coach, Institution, Supervisor, Partner, member, registration, wiring and both Admin suites passed. Institution genuinely reached FR and its final console check. Partner completed all 100 routes, seven workflows, mobile/reduced-motion checks and its final error assertion. Product Journey remains **Fail**, reproducing its pre-existing source-extraction error before browser launch.

## Gap disposition

“Closed” below means the authorized Round 0 defect, not completion of the corresponding entire Phase-1 cycle.

| ID | Round 0 result | Implementation and evidence |
| --- | --- | --- |
| ONB-01 | Closed | Person-scoped first-run keys; person-bound official assessment resume; journal activation authority; independent A/B plans and reload tests. |
| PRIV-02 | Closed | Captured canonical subject checked on journal reads, every mutation and reset; storage/repository identity events display a reload screen. Stale journal snapshots cannot be exported or saved. |
| STUDENT-01 | Closed | Active verified Individual capability required before private data access. Direct Lab, Shield, Recovery and Garden routes show upgrade/return destinations. Same-ID upgrade preserves Coach records. |
| PRIV-03 | Closed | Profile updates canonical Person display name through the shared repository. Canonical verified email is read-only with accurate verification wording. Login/invitation email is unchanged. |
| DATA-01 | Closed | Operational saves commit memory only after storage succeeds. Journal events validate/stage before persistence and update the model only after success. Setup/activation do not show false completion. Shield/Recovery preferences save atomically in their journal event. Browser quota failures retain the registration form and canonical Profile record. |
| DATA-02 | Required person/journal portion closed; broader finding partial | Exact known legacy ownership, preserved original/backup, idempotent person binding, operational schema-1/schema-3 compatibility. Unrelated Admin/Community/evidence migration remains deferred. |
| PRIV-01 | Closed | One Form/Competition participation guard serves member and participant commands: verified actor, resource scope, effective owner, parent/admission, publication, dates, version and consent. Existing duplicate guards remain. Competition originality/eligibility consent is explicit in both paths. |
| GOV-01 | Closed for targeted shared resources | Effective approval checks include approved owning entity and an active approved representative/operator. Suspended owners cannot accept new applications/bookings/offers. Discovery excludes unavailable resources; restoration rechecks current windows. Original history remains. |
| COACH-01 | Closed | Initiative task cancellation uses current Coach grant and group allocation; authorship is preserved but grants no permanent authority. Reason, active parent and audit are required. Independent Program rights remain separate. |
| PROVIDER-03 | Critical Round 0 transitions closed; broader cycle partial | Book, accept offer and approve booking recheck effective Provider/resource/window/eligibility. Accept also requires the matching original active hold, person, expiry, capacity and unprocessed status. New booking eligibility captures age, consent and resource version. Full Round 1 policy/integration remains deferred. |
| TASK-01 | Closed under conservative demo rules | Shared membership/Coach/owner/parent/window checks. Future tasks cannot start/submit. Expired deadlines require rescheduling unless a record explicitly permits late submission. Cancelled assignments cannot receive ordinary reviews or new rewards. Cancellation requires a reason. |
| TASK-02 | Closed | Current actionable work is separate from Own history. Cancelled work and former-member entitlements/own submissions survive. Removal captures existing assignment recipients; later unrelated work is excluded. Reload and both Student/Individual views checked. |
| PRIV-04 | Closed | Student submission histories use an explicit field allowlist; staff-only notes stay in original staff records. Student task detail uses the sanitized projection too. |
| REG-01 | Closed | Institution FR selects Individual in the visible chooser, reaches the form, retains canonical identity/baseline/activation assertions and final console check. |
| REG-02 | Closed | Partner uses visible scoped headings and current path selectors, exercises Individual plus all three Partner account routes, excludes Admin/Supervisor signup, retains 100 routes and original workflows. |
| REG-04 | Targeted harness portion closed; broader finding partial | Route/record/form readiness replaces the obsolete blocked steps. Member setup test awaits its actual async save. No skipped registration, force clicks or blanket retries. Product Journey stays deferred. |

## Root causes and changed boundaries

- `storage.js` treated `deepsprout-user-v1` as a global authority. It now uses `deepsprout-user-v1:person:<canonical-id>` and binds explicitly after successful authentication. Returning setup reads official journal events rather than restarting the first instrument. Registration no longer needs a second first-run write to declare a Person created.
- `account.js` cached a journal after the header/session changed, honored preview choice ahead of canonical identity, and swallowed journal write failures. Canonical identity now wins over URL/session preview flags; only the known seeded Ahmad Person can use the seeded `demo` alias. Every model method checks the captured subject. Mutation also detects an already changed event list and requires reload rather than clobbering it.
- A shared classic-script `personal-access.js` runs before first-run/account/page initialization. It denies limited/suspended/unverified subjects, exposes recoverable save errors, and displays upgrade or reload destinations. The old page is hidden/inert while the notice is visible so deferred callbacks do not target removed DOM nodes. Private route initialization exits before journal/preferences access for denied identities.
- Operational `persist()` previously changed memory before a swallowed `setItem` error. It now throws a clear error and leaves the last committed memory/storage graph intact. Backup failure stops migration. Malformed/unsupported stored graphs are preserved and rejected instead of overwritten with a fresh seed.
- Profile name/email updates were private journal events unrelated to canonical Person. Canonical display-name changes now use `member.profile.update`; material verified-email edits are unavailable in this demo. Unbound `demo`/`empty` test previews remain supported when no canonical subject is signed in.
- Participation invariants existed only in the member wrappers. They now live in the original shared response/entry engines. Linked resources require the appropriate Initiative admission; an explicitly independent published Institution resource retains its existing active-verified-participant eligibility and approved owner requirement. Invalid linked parents cannot become an anonymous/public bypass. Responses/entries retain their original IDs and record current version/consent metadata. Rendered forms carry their version so a stale form is rejected.
- Publication alone previously overrode owner suspension. Effective owner helpers are used by registration/discovery and operational transitions. A suspended owner cannot gain actionability from a resource still marked Published.
- Assignment cancellation accepted original authors without a current grant. It now uses the same scoped authority as other mutations. Student task start/submit, focus writes and reviews check current membership/parent authority. Program pause retains the existing rule: current work may continue; creating new Program work remains blocked while paused.
- Student-facing assigned-task history copied raw review history. Both regular and limited Student projections now strip internal notes while staff reads retain originals.

The source tree now has a small `Client/src/package.json` declaring ES modules. The concurrently added root package uses CommonJS, which otherwise prevented the existing `.mjs` command tests from importing browser source. The root package/dependencies were preserved.

## Data preservation and migration

1. Before edits, the working tree and hashes of tracked/nonignored untracked files were captured in `/private/tmp/deepsprout-round0-yteet00y/baseline-status.txt` and `baseline-hashes.json`. Existing Claude implementations, new registration experience, root package/dependencies and unrelated additions were retained.
2. Legacy first-run ownership is accepted only for an exact Person ID or matching verified canonical email. A saved untouched `deepsprout-user-v1:backup:before-person-binding` must exist before copying known-owner state into a person key. The original global record is retained. Ambiguous state remains unclaimed and never supplies another person's completed setup/plan.
3. Migration is idempotent. Reset writes an explicit blank owned state so a legacy global record is not silently imported again after reset. Official journal events remain the authority for completed assessments and activated plans.
4. Operational schema-1/schema-3 raw backups are saved under their existing versioned backup keys before migration. Tests verify original Person, Group, submission, invitation and attendance IDs survive and repeat reads do not rewrite the migrated graph or backup. Existing schema-4 histories remain in place.
5. New journal events stage changes, save one event list, then apply to the live model. Activation includes its commitment in the same journal event. First-run mirrors can be reconstructed from the committed journal after a later mirror failure. Shield/Recovery settings are bundled with their journal event; a failed save cannot commit half of those preferences.
6. New booking records keep eligibility/consent/version evidence. Existing legacy `eligible:true` bookings retain that original evidence; no age or consent history is invented for them.
7. Membership removal records current assignment entitlements before removing membership. Historical records predating these snapshots are exposed conservatively through existing own submissions/explicit recipient evidence; unknown historical membership is not guessed. Future assignments do not inherit a removed recipient.

The comprehensive audit, `DeepSprout.md`, previous implementation reports and every pre-existing file under `Client/docs/validation/` were hash-checked against the pre-edit baseline and remain unchanged (401 protected files checked, none changed or missing). No actual user browser profile was opened or cleared. Browser tests used fresh isolated contexts. No reset/clean/stash/restore or commit was used.

## Conservative assignment decisions

Date-only starts/deadlines use the shared Amman operational day; explicit timestamps use the shared clock. A deadline is inclusive through its date. Default late submission is blocked with a reschedule message; an existing explicit `allowLate:true` record is honored. This is a conservative demo rule, not a new production lateness policy/configuration UI.

Cancelled submitted work remains inspectable but receives no new ordinary approval or reward. Reviews/rewards validly completed before cancellation stay attributed and intact. Parent suspension/cancellation, revoked current Coach grant and removed membership block inappropriate new actions. No unrestricted historical approval exception was added.

## Tests actually run

Runtime: Node 24.15.0; headless installed Google Chrome; local preview `http://127.0.0.1:8896`. Browser operational clocks were pinned by the relevant suites. All new captures/reports were redirected to `/private/tmp/deepsprout-round0-yteet00y/`, outside historical validation folders.

| Suite | Final outcome | Evidence/details |
| --- | --- | --- |
| Original four command suites | **Pass — 37/37** | Partner store, Institution, Supervisor, Coach. |
| New identity and lifecycle tests | **Pass — 14/14** | Seven identity/persistence/migration cases plus seven authorization/lifecycle cases. Combined command invocation: **51/51**, zero skipped. |
| New `round0-browser.test.cjs` | **Pass** | Actual Profile canonical save/reload; cross-tab stale write/export boundary; four denied private URLs; same-ID upgrade; cancelled/former-membership history/reload; registration/Profile quota errors without false success; seeded login; Shield/Recovery atomic save failure, retry and reload. Final page-error assertion reached. |
| Coach browser | **Pass — 38/38** | Original scenarios, mobile, reduced motion and final CONSOLE. |
| Institution browser | **Pass — 25/25** | Includes all 20 operational checks, FR, two mobile checks, reduced motion and final CONSOLE. FR uses its existing journal-event fixture for the four official baselines; it does not rerun all timed instruments. |
| Supervisor browser | **Pass — 18/18** | Includes explicit competition consent, attachment workflow, Provider scope, mobile, reduced motion and final CONSOLE. |
| Partner browser | **Pass — 100 routes / 7 workflows** | Current two-level registration paths, all original route/workflow coverage, responsive checks, reduced motion and final empty error list. `report.completed === true`. |
| Member journey | **Pass — 14/14** | jsdom installed through the existing external test dependency path; not skipped. jsdom reports its navigation-to-another-document limitation, while assertions complete. |
| Registration experience | **Pass** | Actual chooser/form/validation/local registration, keyboard, three Partner routes, reduced motion and 320/390/768 layouts; final errors empty. |
| Page wiring | **Pass — 14 pages** | Linked scripts/assets/DOM references. |
| Admin dashboard | **Pass** | Original financial/date/filter/13-route/dialog/responsive/empty-state suite. Rechecked after helper placement in the HTML head. |
| Admin-member integration | **Pass** | Original financial boundaries, pricing, Profile visibility, guides, moderation and member/Admin responsive checks; no JS/asset errors. |
| Product Journey | **Fail — pre-existing, deferred** | `article()` at `Client/tests/product-journey.test.cjs:16` indexes `[0]` on a null source regex match before browser launch. No browser checks ran for this suite. Source was not modified. |
| Full timed assessment UX repeated in Round 0 | **Not Tested** | Existing instrument/scoring checks and Institution fixture handoff were run. The prior audit's actual timed-task evidence remains historical, unchanged. |
| Production authentication / concurrent storage transactions | **Not Tested / not implemented** | Browser-local demo scope only. |

Exact command family used:

```sh
python3 Client/serve.py --port 8896
node --test Client/tests/round0-identity.test.mjs Client/tests/round0-lifecycle.test.mjs Client/tests/partner-store.test.mjs Client/tests/institution-cycle.test.mjs Client/tests/supervisor-cycle.test.mjs Client/tests/coach-cycle.test.mjs
node Client/tests/member-journey.test.cjs
node Client/tests/page-wiring.test.cjs
node Client/tests/round0-browser.test.cjs
node Client/tests/coach-browser.test.cjs
node Client/tests/institution-browser.test.cjs
node Client/tests/supervisor-browser.test.cjs
node Client/tests/partner-browser.test.cjs
node Client/tests/register-experience.test.cjs
```

Browser commands used `BASE_URL`, `CHROME_PATH`, and `NODE_PATH`; Coach/Institution/Supervisor/Partner used `SHOTS_DIR`, registration used `REGISTER_CAPTURE_DIR`. Playwright modules: `/Users/ahmadbanihamad/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules`. jsdom: `/private/tmp/claude-501/-Users-ahmadbanihamad-Public-Projects-DeepSprout/4e99f386-6d8b-4135-a1e0-8042abac9a9f/scratchpad/tools/node_modules`.

Both Admin suites and Product Journey were executed through `/private/tmp/deepsprout-round0-yteet00y/run-test.cjs`, which compiles the original suite at its original filename/dirname and changes only screenshot/report destination literals. It does not remove or replace assertions. Partner now supports `SHOTS_DIR` directly. Logs include `commands-final.log`, `member-final.log`, `wiring-final.log`, `coach.log`, `institution-final.log`, `supervisor-final.log`, `partner-final.log`, `round0-browser.log`, `register.log`, `admin-final.log`, `admin-member.log` and `product-journey.log`.

### Failures investigated during implementation

Initial runs were not counted as passes. The root CommonJS setting prevented module imports; the source module boundary fixed it. An async setup test inspected state before the journal save; it now awaits the actual account settle. A former cancelled-task test queried all history as if it were a To-Do list; it now asserts the task is not actionable and new history tests assert retention. A survey fixture needed accepted admission; its approval step is explicit. Partner's survey walkthrough uses the existing Initiative linkage selector. Supervisor's limited Student explicitly upgrades before entering regular Individual pages; ID and records remain the same. A deferred callback on a replaced access-denied DOM caused a console exception; the safe screen now hides/inerts the old view. A styled Recovery radio input's icon intercepted a direct input click; the focused browser test clicks its visible native label text, with no force/retry workaround. All affected checks were rerun after correction.

## Relevant files changed

Core boundaries: `Client/src/js/data/personal-access.js` (new), `Client/src/js/data/account.js`, `Client/src/js/utils/storage.js`, `Client/src/package.json` (new), shared selectors, operational store/domain/rules and targeted commands. Integration changes load the helper before account/storage scripts, add safe initialization guards, connect Profile/auth/setup/activation/preferences, and separate actionable/history views. The registration animation/chooser implementation modules were preserved.

The following is the Round 0 delta against the captured working-tree baseline, rather than against HEAD (which also contains substantial pre-existing Claude work):

- `Client/admin.html`
- `Client/index.html`
- `Client/src/js/data/account.js`
- `Client/src/js/data/personal-access.js`
- `Client/src/js/utils/storage.js`
- `Client/src/package.json`
- `Client/src/pages/auth/login/login.html`
- `Client/src/pages/auth/login/login.js`
- `Client/src/pages/auth/register/register.html`
- `Client/src/pages/auth/register/register.js`
- `Client/src/pages/member/community/community.html`
- `Client/src/pages/member/explore/explore.html`
- `Client/src/pages/member/explore/explore.js`
- `Client/src/pages/member/garden/garden.html`
- `Client/src/pages/member/garden/garden.js`
- `Client/src/pages/member/insights/insights.html`
- `Client/src/pages/member/insights/insights.js`
- `Client/src/pages/member/lab/assessment.html`
- `Client/src/pages/member/lab/assessment.js`
- `Client/src/pages/member/lab/lab.html`
- `Client/src/pages/member/lab/lab.js`
- `Client/src/pages/member/onboarding/onboarding.html`
- `Client/src/pages/member/onboarding/onboarding.js`
- `Client/src/pages/member/onboarding/starting-point.html`
- `Client/src/pages/member/onboarding/starting-point.js`
- `Client/src/pages/member/profile/profile.html`
- `Client/src/pages/member/profile/profile.js`
- `Client/src/pages/member/recovery-plan/recovery-plan.html`
- `Client/src/pages/member/recovery-plan/recovery-plan.js`
- `Client/src/pages/member/shield/shield.html`
- `Client/src/pages/member/shield/shield.js`
- `Client/src/pages/member/training/assigned.js`
- `Client/src/pages/member/training/offline-routine.js`
- `Client/src/pages/member/training/training.html`
- `Client/src/pages/member/training/training.js`
- `Client/src/pages/member/weekly-review/weekly-review.html`
- `Client/src/pages/member/weekly-review/weekly-review.js`
- `Client/src/pages/public/pricing/pricing.html`
- `Client/src/shared/selectors.js`
- `Client/src/workspaces/app.js`
- `Client/src/workspaces/commands/initiative.js`
- `Client/src/workspaces/commands/institution.js`
- `Client/src/workspaces/commands/mentorship.js`
- `Client/src/workspaces/commands/outdoor.js`
- `Client/src/workspaces/commands/platform.js`
- `Client/src/workspaces/domain.js`
- `Client/src/workspaces/initiative-rules.js`
- `Client/src/workspaces/pages/participant.js`
- `Client/src/workspaces/pages/student.js`
- `Client/src/workspaces/store.js`
- `Client/tests/coach-cycle.test.mjs`
- `Client/tests/institution-browser.test.cjs`
- `Client/tests/member-journey.test.cjs`
- `Client/tests/partner-browser.test.cjs`
- `Client/tests/partner-store.test.mjs`
- `Client/tests/round0-browser.test.cjs`
- `Client/tests/round0-identity.test.mjs`
- `Client/tests/round0-lifecycle.test.mjs`
- `Client/tests/supervisor-browser.test.cjs`
- `Client/tests/supervisor-cycle.test.mjs`

New deliverable: `docs/implementation/deepsprout-round0-stabilization-report.md`.

## Deferred work, limitations and next-round risks

- **Round 1:** full Outdoor Provider waiting-list lifecycle/configuration, adopted 24-hour offer policy, regular Individual Provider bridge, public booking projections, remaining Provider completion/cancellation policy. The existing `offerMinutes` setting and 15-minute demo default were not changed. Critical owner/resource/window/hold safety checks are in place before that integration.
- **Round 2:** complete personal onboarding/assessment validity/version policy, plan review-row generation and progression, Shield enforcement/extension, richer Garden/evidence migration, personal analytics and remaining Individual-cycle gaps. No Home/Garden/Shield redesign was performed.
- Broader DATA-02 Admin/Community attribution and legacy personal-evidence migration, other Community privacy work and the unrelated Product Journey extraction failure remain deferred. No ambiguous authors/owners were invented.
- This remains a local demonstration with simulated email verification, one session per origin, trusted seed eligibility evidence and no backend authentication. Direct localStorage access is not a production security boundary. Journal stale-list checks do not provide an atomic compare-and-swap or resolve simultaneous cross-tab writes; operational storage remains a single local graph. IndexedDB attachment storage is not transactionally coupled to that graph.
- Read-only verified email avoids divergent identities but does not implement email-change verification. Historical unsnapshotted membership is intentionally handled conservatively.
- Before exposing Provider integration, keep using shared effective-eligibility helpers for every new public/read/write path, adopt an explicit offer/booking-cutoff policy, verify legacy eligibility consent provenance, and add durable backend authorization/transactions before making production security or concurrency claims.

Round 0 stops here for review. No Round 1 work was initiated automatically.
