# DeepSprout — Phase-1 comprehensive gap verification

**Independent audit date:** 16 October 2026, Asia/Amman. **Authority:** `DeepSprout.md` v4.0, dated 15 October 2026. **Scope:** current working tree, including uncommitted Institution, Supervisor, Coach and registration work. **Deliverable boundary:** this report only; no application, test, specification or historical evidence edits, no commit.

## 1. Executive Verdict

**DeepSprout is not feature-complete for Phase 1. Substantial functional work remains before design polish.** The Institution, both Supervisor contexts, and independent Coach have substantial connected implementations worth preserving. Fresh execution supports their primary journeys. It does not establish completion of every contract, permission negative or personal-product seam.

The most urgent findings are wrong-person first-run state, stale-journal writes following identity changes, insufficient command guards on alternative participation paths, and a revoked Coach's residual mutation authority. Provider publication and booking still do not reach regular Individual Explore. Weekly Lab, adaptive next-week planning, genuine practice execution/progression, the two approved Shield capabilities, Admin convergence and canonical Community identity remain incomplete. Source-qualified Garden rendering is substantially repaired, but its evidence eligibility and historical-source handling are incomplete.

The four baseline assessment interfaces **were exercised in this audit**, without inserted assessment records or shortened task timers: Digital Habits, 24 Sustained Attention signals, 40 Inhibitory Control signals, and all five Depth questions. They produced four valid versioned official records, reached Starting Point, and activated a person-bound plan visible to Home. This is meaningful progress over the earlier injected-result evidence. It does **not** close first-run recovery, tour, subsequent-user isolation or ongoing Recovery/Lab gaps.

| Cycle | Overall status against the complete Phase-1 contract | Practical verdict |
|---|---|---|
| Institution Representative | **PARTIAL** | Twenty operational browser steps pass before FR; caps and core command rules pass. Alternative form/competition entry, entity suspension propagation and former-Coach authority need fixes. |
| Institution Supervisor | **PARTIAL** | Primary scoped operational loop passes afresh. Camera, PDF preview and large-roster browser work remain unproven; shared guard defects affect its data. |
| Provider Supervisor | **PARTIAL** | Appointment, scoped roster, attendance, correction, evaluation, report and revocation pass. Completion still hardcodes all sessions; regular Individual boundary is missing. |
| Independent Coach | **PARTIAL** | 38/38 browser checks and 10 Coach command tests pass. Lifecycle edges, cancellation/history, activity-version references and personal-route capability enforcement remain. |
| Invited Student / upgrade | **PARTIAL** | Same-person upgrade and preserved work pass. Before upgrade, direct personal URLs expose the demo personal journal; sequential first-run state is not person-bound. |
| Outdoor Provider owner | **PARTIAL** | Useful owner operations exist; regular discovery/booking, complete builder policy, revision/notice handling, offer guards and criteria-driven completion are unfinished. |
| Regular Individual | **PARTIAL** | Four-task-to-activation happy path works. Weekly Lab, meaningful practice, adaptive continuation, Shield and several integrations do not meet target. |
| Platform Admin | **PARTIAL** | Both implementations have useful distinct functions. Workspace Admin lacks legacy parity and several live recipient effects. |
| Community | **PARTIAL** | Finite local feed, posts/reactions/saves and legacy moderation work. Identity, persistent comments and shared-goal workflow are incomplete; final social policy is open. |

No percentage-complete estimate is defensible from this evidence.

## 2. Current Version and Evidence Baseline

### 2.1 Repository and protection

Repository: `/Users/ahmadbanihamad/Public/Projects/DeepSprout`. HEAD: `7b87d60f2e79fe8229cd90e5ab3a11a0e6a8351e`. Node: `v24.15.0`. There is no root `.codegraph/`; CodeGraph was therefore not used or initialized. The supplied AGENTS instructions were followed.

Initial `git status --short`: **40 entries: 32 modified tracked paths and eight untracked entries** (directories count as one status entry). These are pre-existing work, not audit edits:

```text
 M Client/README.md
 M Client/src/pages/auth/register/register.html
 M Client/src/pages/auth/register/register.js
 M Client/src/pages/member/garden/garden.js
 M Client/src/pages/member/insights/insights.js
 M Client/src/pages/member/training/assigned.js
 M Client/src/pages/public/home/home.js
 M Client/src/pages/public/pricing/pricing.css
 M Client/src/pages/public/pricing/pricing.html
 M Client/src/shared/selectors.js
 M Client/src/workspaces/app.js
 M Client/src/workspaces/builders/initiative.js
 M Client/src/workspaces/builders/program.js
 M Client/src/workspaces/commands/mentorship.js
 M Client/src/workspaces/commands/platform.js
 M Client/src/workspaces/data/initiative-ops.js
 M Client/src/workspaces/institution.css
 M Client/src/workspaces/migrate.js
 M Client/src/workspaces/navigation.js
 M Client/src/workspaces/pages/auth.js
 M Client/src/workspaces/pages/mentor.js
 M Client/src/workspaces/pages/organization.js
 M Client/src/workspaces/pages/participant.js
 M Client/src/workspaces/pages/student.js
 M Client/src/workspaces/shared.js
 M Client/src/workspaces/store.js
 M Client/tests/institution-cycle.test.mjs
 M Client/tests/partner-browser.test.cjs
 M Client/tests/partner-store.test.mjs
 M Client/workspaces.html
 M README.md
 M docs/README.md
?? Client/docs/experience/living-registration.md
?? Client/src/pages/auth/register/experience/
?? Client/src/workspaces/coach-rules.js
?? Client/src/workspaces/pages/coach/
?? Client/tests/coach-browser.test.cjs
?? Client/tests/coach-cycle.test.mjs
?? Client/tests/register-experience.test.cjs
?? docs/implementation/independent-coach-cycle-implementation-report.md
```

Before testing, SHA-256 hashes of **852 existing nonignored files** were saved outside the repository. The pre-report comparison found **zero changed or removed baseline files**. Final protection verification is recorded in §19. No reset, stash, checkout, clean, restore, source edit or commit was performed. Browser storage changes were confined to fresh temporary Chromium contexts.

### 2.2 Documentation and disagreements

Read the v4.0 contract's relevant requirements and acceptance/decision sections, all three implementation reports, Phase-0 technical-readiness audit, current root/Client/docs READMEs, relevant cycle inventories including permissions, Individual integration, Provider, Admin, gaps and demo scenarios, and the legacy Admin/member IA evidence. Older code observations were checked against current modules rather than adopted as current facts.

| Source | Claim or boundary | Current reconciliation |
|---|---|---|
| Master §29, 15 Oct | Historical identity/publication/Garden defects | Not current proof. Initiative publication, canonical people, Assigned, factual attendance/excuses and the four-tree renderer were subsequently implemented. |
| Institution report | Schema 2; forms/competitions and attachments incomplete; global check-in flag | Superseded by Supervisor and Coach code: schema 4, regular forms/competitions, IndexedDB evidence and per-session windows exist. |
| Supervisor report | 18 browser checks; camp reward after every session | Current suite passes with screenshot/mobile options. The all-session evaluator is accurate as a code description but conflicts with arbitrary published camp criteria. |
| Coach report | 37 commands, 38 browser checks; FR/Partner partial | Reproduced. Do not summarize its complete §15 as “all regression suites pass.” |
| Coach report's D12 wording | Personal effects hidden before upgrade | Only the operational effects are gated. Personal routes and private-journal fallback are still available to a limited Student. |
| Coach report | Three demo policies configurable; pause submission a demo choice | Completion and expiry editable, quorum code-configurable, not all runtime configurable. Pause behavior is documented in report/source but not a published Program policy field. |
| Client README | Four-tree Garden; no real extension; weekly Lab still open; Provider disconnected | Supported, with additional integrity and capability gaps in this audit. |
| Historical `docs/cycles` | Partner-only Institution and identity split | Historical for Institution/Coach. Still materially true for Provider regular discovery/booking and Admin/Community islands. |

### 2.3 Evidence meanings

Every ledger row uses one requested status. **PASS — Independently Verified** applies only to the specified executed case. **IMPLEMENTED / CODE-INSPECTED ONLY** is not a runtime pass. Controlled fixture probes change only their in-memory/isolated browser state; they are valid negative tests, not evidence of a full user-driven setup journey. Full route rendering is not functional acceptance. All custom probe code and raw output are temporary and outside the repository; important results are reproduced here.

## 3. Immediate Regressions

### 3.1 Registration and first-run failures

**REG-01 — Institution FR: FAIL, P1 test regression.** The unchanged suite passes **20 operational steps**, then tries `page.fill('#full-name', ...)` while the redesigned entry chooser is visible. It times out after 30 seconds because the form is hidden. No canonical account is created by FR, no injected baselines/activation are reached, and its final **CONSOLE check is NOT RUN**. This is not evidence that normal registration is broken: the new registration suite and the independent four-assessment walkthrough both create an Individual through the actual chooser.

**REG-02 — original Partner suite: FAIL, P1 test regression.** `visit()` calls `page.locator('h1').waitFor()` on a DOM containing two headings. Playwright strictness fails even though one is hidden. The next assertion still expects obsolete `.auth-choices .choice` markup. The suite stops before its 100-route sweep, walkthroughs or final error assertion. No registration checks were skipped in this audit.

Concrete future assertion changes:

1. Enter `register.html`, wait for the path-choice controls, assert exactly Individual/Partner, choose Individual, Continue, then fill the visible form. Retain canonical-person and activation assertions.
2. Exercise Partner → all three subtype destinations and assert absence of public Admin/Supervisor cards. Use accessible roles/names or scoped visible headings and route-ready state; replace the obsolete CSS hook, not its behavioral coverage.
3. Keep one active accessible page heading. Do **not** delete valid hidden-step headings simply to satisfy an unscoped DOM locator. The standalone DOM has three `h1`s, workspace chooser two; a bounded check found one visible heading in each.
4. Keep the independent actual four-assessment UI path as distinct acceptance. FR's inserted records must remain labeled a handoff test if retained.

**REG-03 — implementation/copy/resume: PARTIAL, P2.** Exactly two top-level choices and three Partner choices route correctly; native controls, required fields, duplicate email rejection, unavailable-service recovery, password toggle, focus at the Individual form, animation cleanup, reduced motion and 320/390/768 widths pass the dedicated suite. No public self-issued Admin or Supervisor was found. However, `entry.js` says “Where would you like to grow?” rather than master §3.2's exact headline. Back retains Partner selection in memory but reloading the choice screen resets it to Individual. Root `register.html` meta-refresh drops `#individual`; the nested form URL honors it. Recommended code work: preserve nonsecret path/resume state and wrapper fragment, and reconcile exact approved copy. Do not persist passwords.

The serious first-run bugs are separate **ONB-01/02**: global legacy setup/activation and unfinished-assessment resume. They are not fixed by updating test selectors.

### 3.2 Flakiness

**REG-04 — PARTIAL, P2.** This audit did not reproduce the reported A2/S2c unstable-element timeout. Both reached and passed their checks in the fresh runs. The harness uses fixed 300/350/400/600 ms sleeps; FR still uses `networkidle`. Explore has reveal/FLIP transforms. These make animation stability a credible hypothesis, not a confirmed cause. Sequential suites used separate contexts, so no demonstrated cross-suite storage interference was observed.

Future work: trace the failing action before changing assertions; wait for exact `main.dataset.route`, repository readiness, intended record/card and completed layout transition. Use bounded `domcontentloaded`/`load`, with a state assertion. Do not use `force:true`, registration skips or blanket longer sleeps to conceal defects. Keep motion behavior tested separately. Test date pins should remain explicit.

### 3.3 Historical product journey

**REG-05 — FAIL, P2.** Output-isolated original assertions still fail at `product-journey.test.cjs:16`, `article(...).match(...)[0]`, while comparing `hero-reels-lab.html` articles with HEAD. The markup match is null. This happens **before Chrome launch**, so its browser/console checks do not run. It is a historical landing/hero test contract failure, independent of Institution/Supervisor/Coach workflows. Identify the retained intended landing target and replace obsolete markup assumptions with equivalent behavioral/preservation checks; do not count this as a passing regression.

## 4. Institution Representative — Verified Status

The current six-stage builder, canonical Initiative IDs, draft hiding, regular Explore publication and reload, scoped staff invitations, regular Application identity, Supervisor single approval, group/Coach allocation, shared task/review engine, session registration and rendered QR/code, excuse chain, report chain, completion and archive were exercised by the Institution browser suite before FR. Its A1 uses commands to create/approve an applicant before UI assertions; it is not a complete browser registration-form test. Supervisor suite adds regular identified forms/competitions and stored attachment behavior.

Command tests independently cover the **135th accepted / 136th queued**, three-active-Supervisor cap, wrong email/expiry/revocation, held offers and expiry/reoffer, Representative-only discipline, online attendance, duplicate effects and migration. These are local command proofs, not browser-scale/performance proofs.

**Do not rebuild this cycle.** Repair shared seams: GOV-01 entity suspension, PRIV-01 alternative participant commands, COACH-01 former-Coach cancellation, TASK-01 lifecycle rules and TASK-02 historical projection. Completion stores an attributed per-person decision and criteria text, but its command defaults all accepted admissions to completed except `notCompletedIds`; automated arbitrary text-policy evaluation is not established. Define which published criteria are machine-enforced and which require an explicit human attestation; see INST-01.

## 5. Institution Supervisor — Verified Status

Fresh Supervisor browser execution covers new email invitation → new account/OTP → accepted grant without central reapproval; context selection, application approval/flagging, group operations, session duty/window, typed booking code/replay denial, close-out/Absent, PNG excuse evidence, recommendation/final decision and reports. Command tests cover additional discipline denials, staffing request, active Coach allocation, online/method windows and evidence readers/revocation.

Source confirms scoped contexts and the proper Representative/Supervisor distinction. The suite's final console check ran and passed. Live camera scanning, PDF rendering, 135-row interaction performance and every dialog focus-return path remain **NOT TESTED**. Fixed London offsets and unimplemented broad subrole policy are not evidence that ordinary Initiative operations must be rewritten.

## 6. Provider Supervisor — Verified Status

Fresh UI checks cover email appointment and new-person acceptance, assigned-resource scope, original Provider booking roster, typed-code/manual Late attendance, duplicate refusal, close-out, correction to Absent and reward withdrawal, evaluations, closing report visible to the owner, revocation and historical attribution. The participant QR is rendered on the **partner Participant booking page**. The owner roster/report correctly counts Late.

The operational appointment/attendance loop is implemented. Its overall status is **PARTIAL** because regular Individual booking/QR/history is disconnected and published completion criteria are not executable rules. `outdoorCommand` evaluates completion with `sessions.every(...)` regardless of the Camp's `completion` text. A fixture declaring “Complete any one of the two sessions” stayed Checked In after one completed evaluation. Provider attendance is not projected to Personal Garden rabbits. These are PROVIDER-01/06/07, not a reason to rebuild appointment acceptance.

The 18-versus-14 historical count is not a regression by itself: screenshot-enabled mobile checks add results under `SHOTS_DIR`. This audit enabled them and reached the final console check.

## 7. Independent Coach — Verified Status

**Primary browser journey: PASS — Independently Verified, 38/38 checks.** C1–C20 and X1–X11 cover application/approval, Program-first groups, private invitation/new OTP Student, assignment/revision/resubmission/approval, per-group collective Garden, report, completion, same-person upgrade, regular Assigned/history, dual Coach context and private Program visibility. Five 390 px pages and reduced motion pass. Ten Coach command tests cover more invitation/lifecycle/report/migration negatives within the 37-command run.

Source retains one assignment engine, Program ownership and Initiative compatibility. The accepted-link privacy fix is present in the Initiative picker and participant Program route; the browser X11 negative passes. No fresh independent Program became a public Explore listing.

Remaining defects are narrow:

- **COACH-01:** a revoked Initiative Coach who retains independent access can cancel an assignment they authored in the former Initiative, because cancellation accepts `a.ownerId === actor` without the current grant. Reproduced by command fixture.
- **TASK-01:** assignment start dates are not enforced; future work can be submitted early. Review does not check assignment/Program cancellation or parent lifecycle. Cancelled work can still be approved and create a Personal tree effect. Explicit cancellation reasoning is optional at command level. Define permitted review of pre-cancellation evidence in published rules before implementing an exception.
- **TASK-02:** regular `assignedTasks()` excludes every cancelled assignment and only uses current groups. Limited Student pages retain cancelled work while regular Individuals lose that task's history; removed members also lose drill-down even though source submissions remain.
- **COACH-02:** `Program.activities` stores titles; materialized tasks store Program/Assignment versions but no immutable activity-definition version/content snapshot. A catalog change is not a demonstrated version-pinned execution contract.
- **UX-03:** completed Program tasks remain in the Coach dashboard's “Upcoming deadlines” because it filters active assignments by due date without a running-parent/outstanding-work filter. Visible in the fresh mobile screenshot.

Interim policies: all-required completion is the editable default; 14-day expiry is editable per Program; 60% quorum is `PROGRAM_GARDEN_POLICY.stageQuorum`, a code constant explicitly labeled configurable demo policy. Paused-program submission/review is documented as a demo choice; there is no per-Program published pause policy. These must not be described as permanent owner-approved numeric requirements. Quorum/expiry/completion thresholds and pause semantics are DEC-01/02 decisions, not automatic defects requiring different invented numbers.

## 8. Invited Student and Individual Upgrade

Matching existing identity, new OTP join, wrong/expired/revoked link refusal, own task/review UI, internal-note hiding in rendered views, Program completion history and same-person upgrade are freshly exercised. Upgrade sets `individual:true`, retains groups/work/reviews/completion, and binds a new personal journal.

**STUDENT-01 — FAIL, P1:** hiding sidebar links and operational Personal Garden effects does not enforce D12 at destinations. A controlled new limited Student with no personal journal opened ordinary `/lab.html`, `/shield.html`, `/recovery-plan.html` and `/garden.html`. All rendered; `DeepSproutAccount.load()` returned **journal `demo`, name Ahmad, plan present**. The workspace shell itself offers “Open my Individual app.” This is a demonstrated capability/identity fallback error, not a claim of production exploitation of another person's server data. Gate personal destinations and writes before load, offer upgrade/return, and never choose another journal as a limited-role fallback.

The Student upgrade browser test proves continuity of operational work; it does not prove a complete subsequent personal first run in a browser that already has another person's global `deepsprout-user-v1` state. ONB-01 must cover that condition.

## 9. Outdoor Provider — Full Remaining Gaps

### 9.1 Owner onboarding and authority

Partner Provider application, simulated verification, Admin decision and workspace activation exist. Approval creates an owned Provider entity and rejection/info states are implemented; approval/decision machinery is shared with the freshly exercised Coach/Institution paths. A complete new Provider owner form journey was **IMPLEMENTED / CODE-INSPECTED ONLY** in this audit, not newly UI-tested. Previously approved Provider suspension removes owner workspace authority, but existing Published resources still accept participant bookings; reproduced in GOV-01. No production vetting or owner-proof upload was claimed.

### 9.2 Builder/lifecycle inventory

`builders/experience.js` has six actual stages, persistent builder draft, preview, title/type/objective, minimum age, eligibility/consent, venue/address/city, start/end, sessions, capacity, booking dates, waitlist, cancellation, safety/contact, free-text completion and potential staff selections. Publishing checks required safety/consent/contact and session count/times. This is useful existing functionality.

**PROVIDER-04 — PARTIAL:** absent or insufficient fields/validation include explicit Free/Paid price/currency disclosure, configurable timezone rather than fixed Asia/Amman copy, session mode/check-in-policy/staff controls, participant form/version, fuller age/accessibility fields and published completion-rule structure. `staffIds` are selected but publication does not issue appointments; assignment remains a separate post-publication action. Booking-window order and completeness are not comprehensively validated by publication. Implement master §16.3 fields based on approved policies, not a generic new portal.

**PROVIDER-05 — PARTIAL:** published resources are read-only; “revision” creates a **new Experience ID** and new session IDs. There is no attributed future-only update to the original published resource with affected-booking notices. Cancel/archive change statuses and offers/bookings but do not retain a sufficient per-record reason/history/notice chain; cancelled cohorts remain Active until other actions. Close requires a submitted report but unresolved queue/offer closure is not a demonstrated invariant. Preserve attendance/completion and explicitly reconcile active offers, appointments/cohorts and notices for every terminal transition.

### 9.3 Regular Individual publication and bookings

**PROVIDER-01 — FAIL, P1:** a newly saved/published unique Camp (`AUDIT Live Provider Camp`) appeared once in partner discovery and zero times in regular Explore. The original operational booking was Confirmed in the same isolated graph; regular My Registrations does not read it. The regular selector projects Initiatives only, while Provider cards and registrations remain `listings.json`/personal journal fixtures. Ordinary new Individuals also have no `participant` workspace, so simply routing them to `participant.book` is not the final member command contract.

Integrate original Experience/Booking/Offer IDs into regular Explore, appropriate filters/detail, My Registrations/QR/cancel/offer/history, Home and Insights. Hide or disable ineligible draft/suspended/ended/cancelled booking actions and retain owned history. Never copy live Provider resources to `listings.json`.

### 9.4 Waiting list and eligibility

Existing partner command tests pass cancellation → hold → decline → reoffer → accept, stale acceptance rejection, expiry-on-read and held-plus-confirmed capacity. There is one booking identity per attempt and deduplication for active participation. This is a sound base, not a missing engine.

Remaining findings:

- **PROVIDER-02 — FAIL:** default hold is still **15 minutes**, from `settings.offerMinutes`. Admin permits only 1–120 minutes, so it cannot configure the approved 24-hour interim default. Live fixture measured exactly 15 minutes. The seeded “offer” scenario also directly uses wall-clock `Date.now()+15m`, unlike offset-aware `offerNext`.
- **PROVIDER-03 — FAIL:** `participant.book` ignores registration dates and approved Provider status; a Camp whose window closed 23 October and ended 25 October accepted a new Waitlisted booking on 10 November. Existing offers can be accepted after the Experience is Suspended; `provider.booking.approve` also lacks a current resource/window check. Acceptance must revalidate eligibility, window, owner/resource state, own offer and capacity. Check age as a real bounded number and snapshot consent/version rather than just storing `eligible:true`.
- **PROVIDER-08 — NOT IMPLEMENTED:** `offerNext` creates no recipient-linked offer notice. The probe found zero new notices to the offered person. Booking confirmation, decline/expiry/reoffer, cancellation and completion require linked local notifications; generic actor audit previews are not recipient delivery. No external email is required for Phase 1.
- Queue displays array insertion order; `offerNext` explicitly sorts creation time. Align display/order and state the interim FIFO policy; owner priority exceptions/cutoffs remain open. A manual “Simulate expiry” exists; real clock expiry is checked on reads, not a guaranteed background job.

### 9.5 Attendance, completion and partnerships

Original Provider booking QR/typed fallback and scoped Supervisor attendance exist and pass in partner views. **PROVIDER-06:** completion needs a published structured criterion/authorized decision snapshot instead of unconditional every-session logic. **PROVIDER-07:** operational Provider attendance and legacy personal attendance sources are not included in current rabbit projection; real Camp completion is included as a birdhouse only when booking status is Completed and Experience type is Camp. Neither booking nor mere check-in awards that birdhouse. Corrections remove dependent reward rows, but compensating reward history is absent; see GARD-03.

**PROVIDER-09 — PARTIAL:** accepted partnership commands preserve original Provider ownership, seat pool and bookings, independently command-tested. Partner Participant Initiative detail can show the linked resource. Regular `initiativeCard`/My Initiatives does not project active `partnerships` into a linked live Experience/detail/booking path. The regular cross-owner acceptance scenario is incomplete. Linking must never confer Supervisor authority or duplicate rewards.

**PROVIDER-10 — PARTIAL:** appointments support copy/accept/decline/revoke/expiry, but no owner resend/replace flow was found. An expired Invited appointment also blocks issuing another active invitation until manually revoked. Provide a clear replace/resend action with history and invalid old token.

No Provider Group Garden was found in the current target views; the explanatory no-Garden page is appropriate.

## 10. Regular Individual — Full Remaining Gaps

### 10.1 Onboarding and baselines

Fresh actual UI evidence establishes Register → Meet Bimo → Before We Begin → eight setup choices → four tasks → four versioned result cards → separate building scene → preview → required offline choice → activation → Home. Scores were 16 for self-report, 100 for each timed task and 5/5 Depth; these are automated interaction fixture outcomes, not a person's clinical results. No task metadata, result storage or timers were replaced during that run.

**ONB-01 — FAIL, P0:** `storage.js` has a single global `deepsprout-user-v1` profile/setup/activation. A second canonical Individual inherits completed setup/activation: a controlled prior-user activation fixture led the next real registration directly to **handoff**, and Starting Point showed **done** while the new person's own journal had **no plan**. This can block that person from activating their own plan. Bind first-run state to Person, migrate explicitly, and derive resume/activation from the correct journal. Login currently uses this same global `onboardingResume()` and needs the same repair.

**ONB-02 — FAIL, P1:** Digital Habits reload returned “0 of 8 answered” after an answer. `surveyAnswers`, quiz state and timed-task state are memory-only; the file explicitly discards partial runs. After a completed Digital Habits official attempt, onboarding handoff still selected Digital Habits through the obsolete `DS.nextAssessment()`. That repeat becomes practice rather than progressing to the unfinished official task. Persist versioned partial state or explicit honest restart policy for timed interruptions; resume finished-task sequencing from the journal. For raw timed tasks, decide restart validity versus recovery without falsely combining interrupted runs.

**ONB-03 — NOT IMPLEMENTED, P1:** activation offers Home/Plan links; no short skippable/replayable contextual tour is wired. `tourSeen` is just a legacy field. Add the approved brief orientation after first activation and a replay entry.

**ONB-04 — PARTIAL, P1:** preview uses hardcoded goal-to-practice mixes and cadence, not actual baseline outcomes or offline interests; a reduce-scrolling-only goal defaults to reading. New plans do not initialize activity level events. `baselinesComplete()` checks presence rather than validity, including the old-store fallback. Enforce valid compatible baselines, make input-to-plan reasoning truthful, respect preferences and initialize per-type starting levels under explicit interim rules.

### 10.2 Weekly Lab

**LAB-01 — FAIL, P1:** `account.checkInWindow()` uses plan end ± `windowDays`, `checkInTasks()` rotates by cycle and forces all four every third cycle; `lab.js` explicitly says “End of each cycle.” Weekly eligibility independent of a 28-day plan is absent. Implement Digital Habits + one rotating task weekly, free, with coverage/history and clear official/practice labeling. Exact window/protocol values are owner-open; cycle-end gating is not an acceptable substitute.

**LAB-02 — FAIL, P1:** `checkIns().comparison` simply pairs valid official first/latest attempts without matching instrument/scoring/difficulty versions. A controlled DH-1.0 / DH-99.0 fixture produced a comparison. Version metadata exists but is not a comparability guard. `checkInWindow`'s done check also counts official target-cycle records without requiring validity. Gate comparisons and completed windows on validated protocol, keep invalid/incomplete attempts visible as such, and allow a legitimate retry. Practice rounds are correctly labeled and not persisted by the runner.

### 10.3 Recovery

**REC-01 — FAIL, P1:** actual activation stored only practice rows from Week 1. It dropped the preview's review/rest rows; `account.reviews().nextDue` was null. Review event saving works but does not write an adaptive next week. A fresh unreviewed fixture accepted “Lighter week ahead,” stored the Week-1 review, and left scheduled actions byte-identical. Weeks 2–4 therefore remain empty for a newly activated plan. `plan.adjust` stores a label/detail only, despite saying it applies next week. Implement versioned schedules/reviews/decisions and future-only revision/reschedule commands.

**REC-02 — NOT IMPLEMENTED, P1:** cycle-end review/next-cycle/maintenance and long-absence resume choices are not an operational state machine. `plan()` clamps at day 28/week 4 and labels prior roadmap weeks complete by elapsed week. There is no demonstrated next-cycle transition, pause/resume or conservative unreviewed continuation. Preserve elapsed-time versus adherence versus recovery distinctions; do not label elapsed weeks as successful recovery.

What does work: 28-day/four-week direction, Week-1 preview, scheduled practice matching by attempt source, source-separated adherence/routine/usage displays, history of recorded adjustments and neutral missing-data copy. Do not replace these useful views wholesale.

### 10.4 Activities and Meaningful Practice

**ACT-01 — FAIL, P1:** four canonical visible families exist, but all run the same timer dialog. Depth has no supplied practice passage/question player; Listening has no original/licensed audio or recall scoring; Micro-Challenge has generic instructions rather than a versioned concrete task/outcome; Protected Work lacks a captured meaningful intention/outcome and supported Shield integration. Timer expiry writes `valid:true`, labeled measured, for each type. Elapsed time cannot substantiate comprehension, recalled audio or work quality.

**ACT-02 — NOT IMPLEMENTED, P1:** per-type level summaries exist, but there is no mutation for accepting a next level/step-down or versioned content progression. Fresh-account levels are null. Eligibility counts valid attempts only, without distinct-content/scored-performance policy, and repeat/daily-load limits are not enforced. Add the practice engine, evidence tier, resumable attempts, difficulty-specific records and explicit opt-in progression; calibrate thresholds rather than treating the seed's six-attempt count as approved.

**ACT-03 — FAIL, P1:** legacy Admin still offers Stillness & Reflection, publishes Intentional Pause/Weekly Reflection guide records, and can publish Evening Stillness into regular Activities. Dormant `?session=stillness/reset` timer routes remain. Four main cards do not prove the removed catalog cannot return. Retire or safely map deprecated public items while preserving historical records; Weekly Review belongs to Recovery. Preserve the working approved-guide publication seam.

Shared Coach assignments are connected to regular Assigned and pass both contexts. Their free-text reviewed evidence is distinct from the missing system-scored personal practice players. TASK-01/02 remain applicable.

### 10.5 Offline Routine

Create/edit/pause, scheduled/biweekly recurrence, Done/Skipped, date-versioned schedule and history preservation pass the member tests and are source-inspected. First activation requires one commitment; the real baseline run wrote it. Label is self-reported. Decoration counts are bounded by distinct days and fixed thresholds, preventing same-day arbitrary-item flower multiplication.

**ROUTINE-01 — PARTIAL, P2:** every user-created routine day's Done is accepted into `practiceGarden().routineDays`; no published eligibility distinction separates meaningful Offline Routine from an arbitrary personal to-do. Define a small consented eligibility classification and maintain bounded repeats; do not add intrusive proof or judge prestige. Current global private preferences and quota errors also affect routine durability.

### 10.6 Shield

**SHIELD-01 — NOT IMPLEMENTED, P1:** no extension manifest, extension source/bundle or message bridge was found. No real blocking or telemetry was tested. The current page honestly discloses a client preview, but displays evening scheduling, selected “apps” and a 25-minute focus timer instead of the approved two-capability flow. It lacks a real connection state machine, manual domain protection duration/rule lifecycle, aggregate active supported-site usage threshold and Continue Anyway/Back prompt. Continue must not defeat an active strict block. The local simulated timer is not website protection.

**SHIELD-02 — PARTIAL, P1:** seed-backed Shield/Insights can say “Measured by the Chrome extension” and “Connected” without an extension existing. Simulation scope is disclosed elsewhere, but labels at the measurement claim need sample provenance and timestamps. Unconnected empty-journal views handle missing data honestly. Restrict product claims to validated browser/sites; actual feasibility, permissions, reminder period/default and Reels-only scope require DEC-03. A backend is not needed to prove local Chrome blocking, so do not defer all Shield functionality under FUTURE BACKEND.

### 10.7 Garden

**GARD-01 — IMPLEMENTED / CODE-INSPECTED ONLY:** the exact visual/ownership structure was verified in current source; Garden routes also rendered in the responsive sweep, but no dedicated pixel/geometry assertion was run. The current Personal renderer defines four fixed practice-type spots and no fifth journey tree; Home preview uses the same four type counts/policy. Garden has keyboard descriptions, bounded flowers/rabbits/birdhouse and `vitality:1`; no inactivity withering is used by these views. Initiative and Program completion add history/collective recognition without a Personal object. The old `account.garden()` vitality code remains unused compatibility code; its mere existence is not evidence the current renderer wilts.

Remaining integrity/integration work:

- **GARD-02 — FAIL, P1:** private journal `attempt.add` and `practiceGarden()` do not deduplicate unique source IDs. Two identical `same-source` attempt events produced two tree sources. Generic timer repeats also lack content/repetition eligibility. Operational approved submission effects do deduplicate, but that does not prove personal attempt idempotency.
- **GARD-03 — PARTIAL, P1:** Provider evaluation/attendance corrections remove `s.rewards` rows with `filter()` and recalculate current state, without an attributed compensating reward entry. Approved cancelled tasks still produce Personal effects while the independent Group Garden filters cancelled assignments, so projections disagree. Keep correction/version/policy provenance and consistent historical/current views.
- **GARD-04 — PARTIAL, P1:** current private `practiceGarden()` returns practices/routine days only. Earlier personal registration attendance and experience completion evidence is not mapped into current decorations; Provider attendance is absent too. Preserve valid historical sources through an idempotent migration/projection, without reviving old generic weekly-review growth or inventing evidence.
- **GARD-05 — PARTIAL, P2:** Personal Garden lists Initiative Group Gardens but not independent Coach-group Gardens. Add separate authorized destinations, without new regions in the Personal scene. Limited Student destination gating is STUDENT-01.

One Garden per Institution Initiative and per independent Coach group is present; Provider views correctly explain no cohort Garden. Dynamic collective quorum milestones are projections, not persisted immutable attainment history; contributor/membership/stage changes need historical milestone semantics under DEC-02.

### 10.8 Insights, Home and Explore

**INS-01 — PARTIAL, P1:** five distinct source domains exist, including coverage-aware browser usage and separate self-report. Real Initiative attendance/completion and Coach Program history were added and verified. Provider bookings/attendance/completion still use old personal fixtures in `account.experiences()`. Assigned work is summarized in Program/Initiative cards rather than integrated into all relevant practice histories. Version comparison and seed telemetry issues are LAB-02/SHIELD-02; no combined neurological recovery percentage was found.

**HOME-01 — PARTIAL, P1:** current-week cards, next-step panel, four-tree preview and closing CTA read personal records. The top Hero remains static “Explore activities / See how it works”; `nextSteps()` does not prioritize a due practice/activation/resumption comprehensively and can recommend connecting a nonexistent extension. There is no dedicated live Initiative section, Provider Experience feed or actual Community post projection. `index.html:135` contains fixed “Real stories” testimonials and claimed improvements; these are not queried from posts or labeled fictional at the cards. Replace with actual applicable records or explicit sample content, and connect the required state-aware Hero/goal/opportunity sections.

**EXPLORE-01 — PARTIAL, P1:** regular live Initiatives and My Initiatives work. Standalone live Institution Sessions/Competitions are not a comparable general discovery projection; components are mainly accessible after Initiative application. Fixture Sessions/Competitions coexist. Search/kind/mode filters exist, but topic/date/age/location/organizer/availability filtering is not the full contract. Separate headquarters/coverage/session venue; do not use preferred city as access control. Provider discovery/registration is PROVIDER-01. My Registrations currently uses fixture account registrations rather than a unified projection of original Provider and Institution Session registrations.

## 11. Platform Admin — Legacy and Workspace Consolidation

**ADMIN-01 — PARTIAL, P1:** one conceptual Admin still has two storage/route implementations. Workspace governance is the intended destination. Do not remove `admin.html`: it still has unique demonstrated member-facing capabilities.

Fresh `admin-dashboard` and `admin-member-integration` tests both pass. They establish legacy dashboard definitions, routes/empty states, responsive navigation, guide publish/archive to Activities, profile preview, shared illustrative Pricing, and member report → legacy moderation → hidden feed. They do not establish Workspace Admin parity, global canonical-person governance, live policy publication or unified CMS.

| Capability | Legacy current implementation | Workspace current implementation | Remaining action / finding |
|---|---|---|---|
| Identity / directory | Ten labeled administration samples plus current account preview; status mutations concern sample users | Canonical operational people and suspend/reactivate; access modal mainly lists workspace names | **ADMIN-02:** preserve preview while deriving canonical directory/grants/status; reconcile PRIV-03; explicit global-ban semantics and notices/audit, without creating public Admin roles. |
| Partner entity/Representative and independent Coach approval | No equivalent operational partner queue | Application, More Info, Approve/Reject/Suspend, entity creation and applicant notice | Preserve. Full professional/entity proof and production appeal policy remain open/future. Fix entity-to-resource propagation GOV-01. |
| Resource governance | No comparable operational partner resources | Program/Initiative/Experience preview and suspend/restore | **ADMIN-03:** complete allowed unpublish/archive/removal transitions and notices for Programs/Experiences, not just Initiatives; prevent invalid restoration and resolve held offers. Preserve original owners/history. |
| Activity catalog | Rich guide create/edit/preview/publish/archive; reaches regular Activities | Existing approved activity metadata edit/version; Coach picks titles | **ADMIN-04:** one versioned definition with explicit guide/practice/assignment targets; create/publication parity and pinned versions. Remove deprecated catalog paths ACT-03. |
| Assessments | Instructions/questions/version library editor, explicitly disconnected from executable tasks | Four metadata records, no scoring editor | **ADMIN-05:** controlled executable instrument publisher/validation/history/comparability. Metadata should remain honestly labeled until delivery exists. |
| Recovery | Templates and deterministic simulator; sample plans; no live-plan rewrite | Policy notes/status metadata | **ADMIN-05:** preserve simulator/templates; publish versioned future policy inputs to personal engine only after validation. Existing plans keep versions. |
| Shield | Category/preset editor and blocked-page design preview | No equivalent rich preset operation; disconnected service notice | **ADMIN-05:** preserve supported two-capability defaults/categories through validated extension contract; retire legacy intervention assumptions. |
| Garden | Structured rule preview/editor table, not the live four-tree policy | Policy notes; no validated live publisher | **ADMIN-05:** preserve preview/rule audit; deliver source-policy versions and correction behavior to the actual personal/group evaluators. Do not allow manual growth. |
| CMS/public content | Four allowlisted `landing.html` regions, draft/preview/publish/restore | One partner-discovery region, token/image allowlist, history/rollback | **ADMIN-06:** preserve both exact recipients; add agreed Home/member targets only through approved region contracts. Neither current editor governs new `index.html` Home. |
| Community moderation | Real member reports/posts, Hide/Approve/Dismiss and local member-feed effect | Separate fictional `s.moderation` rows; explicitly says no real member content changed | **ADMIN-07:** consolidate source IDs/reports/decision/reason/actor/time and actual visibility effects; preserve legacy behavior. Member Remove/appeal policy remains owner-open. |
| Reports / CSV | Dashboard sample metrics and Subscriptions & Revenue; `#/reports` aliases subscriptions | Partner-domain reports/CSV and source-qualified audit | **ADMIN-08:** coherent population/time/source filters and actual exports for both domains. Do not sum sample and canonical people into fabricated totals; keep reports alias explicit during migration. |
| System / notices | Legacy settings/reset scope | Local notice template, offer setting and operational audit | Fix Provider 24-hour configuration, recipient links and attribution; unify policy scope without indiscriminate resets. |
| Subscriptions / entitlements | Shared Individual Pricing config, empty financial records, illustrated previews | Proposed audience tiers, TBD quota/notes | **ADMIN-09:** preserve proposed contracts/preview parity. No live unapproved entitlement enforcement or prices. Real payment remains FUTURE BACKEND + commercial decision. |
| Legacy group operations | Trainer assignment, unique identifiers and member management | Read-only group overview / Program governance | **ADMIN-10:** reconcile and preserve unique operations at a valid destination. Do not silently merge obsolete groups into Initiative/Coach groups or drop them. |
| Audit | Separate local event history under display-name operator | Operational actor IDs, action/resource/reason | **ADMIN-08:** preserve source/actor attribution and histories; browser mutability is intentional, missing attribution is not. |

Current catalog/CMS editors are functional within their declared scopes. Their lack of a live personal-policy publisher is an integration gap; a future ASP.NET service is not a justification for a misleading static-demo publication claim. Subscription/calibration policy must remain undecided where the owner has not approved values.

## 12. Community — Implemented Versus Undecided

| Requirement / capability | Current status | Evidence and limit |
|---|---|---|
| Finite feed, category filters/search, empty state | **IMPLEMENTED / CODE-INSPECTED ONLY** | `community.js` filters finite DOM cards; no endless loader or Garden reward mutation. Seed posts still look like actual people; labels need work. |
| Create short post | **PASS — Independently Verified** | A real compose form added a post to local storage and it survived reload. |
| Reactions / bookmark | **IMPLEMENTED / CODE-INSPECTED ONLY** | `liked`/`saved` persist by post ID. They are origin-wide, not Person-scoped; a saved-only retrieval flow is not established. |
| Comments | **PARTIAL** | Real comment form added “You: Audit comment”; reload removed it (`commentRetained:0`). Toast honestly says “for this visit,” but the retained Community workflow is incomplete. |
| Reporting and legacy moderation effect | **PASS — Independently Verified** | Fresh Admin integration reports a member card, hides it in legacy Admin, and verifies the member card is hidden after reload. |
| Workspace moderation | **PARTIAL** | Separate fictional array, no feed reader/writer; ADMIN-07. |
| Canonical author/time/privacy | **FAIL** | Stored post has `{id, category, title, message}` only; no Person ID/time/source. Every user-created post renders “You / Just now” with Sara's avatar after identity changes/reloads. Reactions/saves also follow the browser, not the person. COMMUNITY-01. |
| Optional achievement sharing | **PARTIAL** | `?share=` opens an opt-in composer prefilled from a query string; no automatic posting/reward. It is not a source-ID/eligible-achievement validation contract. COMMUNITY-03. |
| Challenge / Joint Goal / check-in | **PARTIAL** | “Create challenge” makes a text post containing duration/who. No membership, join/leave, shared goal or dated progress check-in engine. Legacy Admin's two Joint Goal rows are separate sample data. COMMUNITY-04. |
| Final rankings, challenges, moderation tiers, layout | **OWNER DECISION REQUIRED** | Master §12 explicitly postpones final design/social policy. Do not implement a ranking or reward algorithm from screenshots. DEC-04. |

Complete persistent person-bound posts/comments/reactions/saves and honest sample labels before visual refinement. Add rate limits/error states within agreed scope; production anti-abuse services are future backend work. Preserve finite intentional use and zero Garden reward for engagement. Home's fixed testimonials are HOME-01, not evidence of an actual curated feed.

## 13. Cross-Workspace Identity, Permissions and Data Integrity

### 13.1 What is now shared

Canonical operational `people.id`, one browser-origin session subject, scoped Initiative grants, independent approval, Provider appointments, Applications, assignments/submissions/reviews, session registrations/attendance/excuses and Coach completion records are shared. The operational store is schema 4. Person-bound private journals exist; the seeded Ahmad story is explicitly bound to `demo`. Lab/Shield/Recovery are not copied into Institution or Coach reports. Same-identity invitation acceptance and upgrade pass.

Five logical workflow partitions remain: operational ecosystem, private seed-plus-event journal, old global first-run state, legacy Admin, Community. Having several partitions is reasonable; inconsistent identity or recipient contracts across them is not.

### 13.2 Confirmed incorrect behavior

- **PRIV-01 (P0): alternative participation paths bypass guards.** The regular `member.form.respond` and `member.competition.enter` validate admission/Initiative state and competition window. `participant.form.respond` and `.competition.enter` directly call the unguarded lower engines. A participant with **no admission** submitted an identified form and then entered the competition on **1 January 2027**, past its **1 November 2026** deadline. Partner detail pages present these forms for Published records. Move invariant validation into shared command rules; apply it to every entry point.
- **PRIV-02 (P0): stale identity/journal mismatch.** Two clean tabs were used solely to test the documented single-origin model. Tab A loaded Alpha's Profile; Tab B switched the active subject to Beta. Tab A's header changed to Beta, but `DeepSproutAccount.load()` remained cached to Alpha. Saving via Tab A wrote “Wrong journal update” into Alpha's journal while identifying the active person as Beta. This is a sequential stale-view defect, not a transactional simultaneous-write race. Invalidate/block/reload personal views on subject change and recheck subject at mutation time. Do not promise per-tab authentication.
- **PRIV-03 (P1): profile identity divergence.** Editing Profile name/email changes only private account `profile.update`; canonical Person retained `Scope Beta / scope.beta@example.test` while Profile showed `Beta display / beta.edited@example.test`. Login/invitation matching still uses canonical email. Use a canonical person update/reverification simulation or separate display/contact fields with accurate labels.
- **GOV-01 (P0): suspended owners remain publicly actionable.** Suspending the Provider application still allowed a new Waitlisted booking on its Published Camp. Suspending Institution application/entity still allowed a new Pending Initiative Application. Regular `exploreInitiatives()` filters resource status, not owner approval. Apply current owner/entity status at discovery and every admission/booking/offer guard. A resource's older Published state cannot confer authority after owner suspension.
- **DATA-01 (P1): silent persistence loss.** With localStorage reads working and writes throwing QuotaExceededError, `member.register` returned a new Person ID; the next `read()` did not contain that person. `persist`, personal `writeChanges`, and several other save helpers swallow storage errors. Make save failure visible and avoid navigation/success claims; back up old raw data before migration and fail safely if storage cannot preserve it. This is not the allowed absence of cross-device durability.
- **DATA-02 (PARTIAL, P1): migrations are only partially comprehensive.** Command tests and a repeated schema-3→4 fixture preserve people/submissions/bookings and are idempotent. Schema backups are implemented. No migration reconciles old global first-run person ownership, Community authors, legacy activity versions or eligible personal decoration sources. Ambiguous records must be marked unresolved, not assigned to the next login. Test corrupt/unknown-schema and failed-backup recovery before release; no such destructive scenarios were run against user data.
- **DATA-03 (PARTIAL, P1): clocks differ across products.** Operational `nowMs` drives invitations/session/Provider expiry; personal account `today` uses seed `account.asOf` or wall calendar; onboarding uses `new Date()`. In the same isolated run operational records were 15 October while the personal journal dated them 16 October; the `demo` personal story remains 17 January 2026. Clearly separate sample story clocks or use one controlled personal-demo clock, so weekly eligibility and current cross-workspace history can be demonstrated coherently. The offered-seat demo scenario bypasses offset time too.

**PRIV-04 — IMPLEMENTED / CODE-INSPECTED ONLY, P2:** rendered Student/Assigned UI excludes internal notes, verified in Coach C12. However, `selectors.assignedTasks().submission.history` returns raw review history containing `internalNote`. Sanitize recipient-specific read models and add a projection-negative test. This is not evidence that a note is visibly printed or that a browser-local global graph provides server privacy.

### 13.3 Negative checks and reversals

| Negative/invariant family | Strongest fresh evidence | Status |
|---|---|---|
| Institution-only / unapproved Coach cannot independently operate Programs | Coach Node and browser X4/X5 | **PASS — Independently Verified** |
| Foreign Coach cannot read roster/review or mutate groups | Coach Node/browser X6 | **PASS — Independently Verified** |
| Wrong-email, revoked/expired invitation grants nothing; existing Person reused | Institution, Supervisor and Coach cases | **PASS — Independently Verified** |
| Revoked Provider Supervisor cannot check in | Supervisor Node/browser | **PASS — Independently Verified** |
| Supervisor cannot perform Representative discipline or staff revocation | Command negatives | **PASS — Independently Verified** |
| Former Initiative Coach cancellation denied | Custom command fixture succeeds incorrectly | **FAIL** |
| Duplicate review/check-in and held-seat capacity | Existing command/browser negatives | **PASS — Independently Verified** |
| Every alternative form/competition write checks same eligibility/window | Custom participant probes bypass them | **FAIL** |
| Limited Student cannot open personal routes | Four real direct routes open demo journal | **FAIL** |
| Full Individual retains cancelled/removed-membership task history | Source retained, regular projection omits it | **FAIL** |
| Private journals follow active identity after a cross-tab switch | Header Beta / cached Alpha / Alpha write | **FAIL** |
| Repeat migration preserves source records | Existing schema-1 test and custom schema-3→4 test | **PASS — Independently Verified** |
| Secure multi-device privacy, concurrent transactional capacity | No server, intentional browser-local graph | **FUTURE BACKEND** |

## 14. Untested or Weakly Tested Scenarios

### 14.1 Explicit TST inventory

| Requested case | Status | Evidence, limit and exact next check |
|---|---|---|
| TST-01 Camera QR | **NOT TESTED** | Typed code and rendered QR pass; no live camera/device permission/BarcodeDetector scan. Verify supported real camera, denied permission, fallback and duplicate scan. |
| TST-02 PDF excuse preview | **NOT TESTED** | PNG IndexedDB save/open exercised by Supervisor; PDF `<object>` rendering/download not established. Test restricted viewers and missing-file fallback with a real local PDF. |
| TST-03 Four assessments | **PASS — Independently Verified** | Actual eight-item survey, 24 response signals, 40 go/no-go signals and five comprehension questions, original timers; versions/valid records/result handoff/activation observed. This is not scientific scoring validation. |
| TST-04 Large rosters | **PARTIAL** | 135th/136th and third/fourth staff command tests pass. No full 135-row browser keyboard/filter/render/performance benchmark. |
| TST-05 Responsive | **PARTIAL** | Thirty route/width checks at 1360/768/390 pass; registration 320/390/768, Coach/Supervisor 390 and legacy Admin four widths pass. Not every full/invalid/dialog/long-content state was tested. |
| TST-06 Multi-tab | **FAIL** | One origin subject confirmed; operational app rerenders. Personal page header changes without rebinding cached journal and permits stale write. PRIV-02; no independent per-tab session claim. |
| TST-07 Concurrent mutations | **FUTURE BACKEND** | Last-write-wins local graph is not transactional. No cross-device race guarantee claimed or benchmarked. |
| TST-08 Reward corrections | **PARTIAL** | Duplicate review/attendance denial and Provider correction withdrawal pass. Personal duplicate-source, cancellation parity and compensating history remain GARD-02/03. |
| TST-09 Migration | **PARTIAL** | Idempotent schema-1 and schema-3→4 preservation tests pass. Ambiguous old personal data, failed-backup/quota and unknown-schema recovery remain. |
| TST-10 Cross-workspace reload | **PARTIAL** | Institution, Coach upgrade, regular Assigned, Provider owner/Supervisor and legacy moderation reloads pass. Regular Provider resource absent; canonical profile mismatch and personal stale state remain. |
| TST-11 Registration | **PARTIAL** | New suite passes actual entry/form/Partner routing. Original FR/Partner suites fail and stop; path/copy/resume gaps remain. |
| TST-12 Assertion changes | **PARTIAL** | Reviewed current diffs and committed relevant assertions. Main policy updates justified, but old registration assertions and shallow metadata/motion checks still need repair; see below. |
| TST-13 Six master scenarios | **PARTIAL** | Mapping below; no full A–F acceptance pass is warranted. |

### 14.2 Review of changed test assertions

- **Program-first group creation:** correct under §13.1/D19. Tests now create a Program first and pass `programId`; they retain membership/review/reward checks. This is not a weakened admission invariant.
- **Single-plant Garden → collective scene selector:** correct ownership direction; the Partner reduced-motion assertion now checks `.iw-garden.iw-reveal`. It tests animation only, not number/owner/source integrity. New Coach Garden cases add group separation/bounded sources; preserve those and add personal source-correction tests.
- **Attendance window/date pin:** correct under the explicit per-session policy. Institution browser E2 asserts the window before moving time; command tests exercise early/closed/manual exceptions. Moving the demo clock is not skipping the guard.
- **Email Provider appointments / second link dialog:** correct under the canonical invitation contract. Original booking/attendance attribution assertions remain.
- **Schema 3→4 expected value:** correct; repeat migration and preservation assertions remain.
- **Identified forms:** correct under D41. Replacing anonymous assertions is required. Existing tests cover the regular wrapper; add PRIV-01 alternate-command negatives.
- **Registration:** `.auth-choices .choice`, unscoped `h1` and direct hidden-form fill are obsolete. Replace with behavioral assertions for both chooser levels and same-person registration. Do not repeat the earlier scratchpad's skipped registration approach.
- **Member jsdom:** fourteen checks are useful local page/logic checks. ES-module scripts are skipped in jsdom, so these checks do not prove the new shared bridge/grant routes or full actual browser assessment sequence.

### 14.3 Master §25 A–F coverage (not the test files' different A–F labels)

| Master scenario | Browser evidence | Command-only/other evidence | Readiness status |
|---|---|---|---|
| **A Personal Individual** | Custom real four-task-to-activation walkthrough; member/Admin routes | Member jsdom14; comparison/reward fixture negatives | **PARTIAL** — resume, tour, weekly Lab, practices, ongoing plan, Shield fail/missing. |
| **B Institution to Individual** | Twenty Institution operational steps; Supervisor regular forms/session/excuse/reload | 135/3 caps, queue negatives | **PARTIAL** — main chain passes, but owner suspension/alternate participation scope and final FR/console regression remain. |
| **C Coach to collective Garden** | Institution D1–F1; Coach Institution/dual-context regression | Permission/handover/reward cases | **PARTIAL** — positive chain passes; former-Coach cancellation, lifecycle and history edges need fixes. |
| **D Provider queue and Camp** | Supervisor partner Participant/owner path; new publication seam probe shows regular absence | Existing queue/capacity/expiry tests; new completion/guard probes | **FAIL** — regular Individual publication/booking absent; hold/criteria/eligibility/notifications incomplete. |
| **E Independent Coach / upgrade** | Coach 38 checks; same-ID reload and preserved work | Ten Coach Node cases | **PARTIAL** — primary chain passes, limited direct personal routes and later personal first run fail. |
| **F Admin and collaboration** | Legacy live guide/moderation pass; Institution resource suspension path | Partner ownership/link command tests, workspace CMS tests | **PARTIAL** — regular linked Provider presentation and unified Admin recipient/parity incomplete. |

## 15. Design/Responsive/Accessibility Findings

The ivory/sage language and partner `iw-` components are coherent enough to retain. Registration and Coach mobile screenshots were visually inspected; the selected Individual/partner pages did not show horizontal page overflow. No evidence justifies a broad aesthetic redesign.

| Finding | Evidence / status | Recommended action |
|---|---|---|
| UX-01 Assessment focus and radio keyboard behavior | **IMPLEMENTED / CODE-INSPECTED ONLY** — `assessment.js` `showStage()` hides sections and updates progress without moving focus. Radio-like buttons all stay ordinary tab stops and lack arrow-key group behavior. | P2: focus the new stage heading/first useful control, implement keyboard radio conventions and verify with a screen reader; preserve task space-key response behavior. |
| UX-02 Timezone fidelity | **IMPLEMENTED / CODE-INSPECTED ONLY** — `initiative-rules.js` uses fixed `Europe/London:'+01:00'`; Provider builder hardcodes Amman. | P2: use date-aware timezone conversion and explicit selected zone. Test winter/summer boundary and display check-in windows in the declared zone. |
| UX-03 Completed-program deadlines | **PARTIAL** — fresh Coach screenshot shows zero running Programs with completed Program tasks in “Upcoming deadlines”; `independent.js` filters active assignments by due date only. | P2: show outstanding obligations from eligible parents; completed history belongs in history. |
| UX-04 Footer/legal/help | **PARTIAL** — registration screenshot/footer source says ©2025, master requests ©2026. Privacy/Terms/Contact/Help/creator controls open unavailable info dialogs; no actual policy content. | P2 for date/link copy; essential consent/help text should accompany functional rounds. Keep creator identity, supply real owner-approved URL/content, avoid fabricated socials. |
| Mobile tables/context selectors | **PASS — Independently Verified** for selected states | Keep labeled keyboard-scroll regions and mobile drawer behavior. Complete large/long/invalid dialog state matrix in Round 5. |
| Registration headings and reduced motion | **PASS — Independently Verified** for active chooser/form semantics and dedicated motion checks | Scope headings to active step in tests. Hidden headings are not a demonstrated accessibility defect. Exact headline mismatch remains REG-03. |
| Dialog focus/Back/Forward | **PARTIAL** — native dialogs and registration form focus work in tested routes; shared modal sets initial focus | Verify focus restoration after rerender/removing opener, Escape, background inertness, invitation back/resume and soft-keyboard states. Do not claim all dialog paths pass. |
| Chart/Garden alternatives | **IMPLEMENTED / CODE-INSPECTED ONLY** beyond tested rendering | Existing textual counts, labels and Garden hit buttons are useful. Audit all non-color legends/radio controls with assistive technology; preserve neutral missing data. |
| Mascot | **IMPLEMENTED / CODE-INSPECTED ONLY** | Existing original Bimo assets are reused. No confirmed asset inconsistency needing a replacement mascot; no image generation required. |
| Sample/social/telemetry claims | **FAIL** for HOME-01 / SHIELD-02; Community source labels incomplete | Fix factual provenance before visual presentation. |

No full WCAG conformance or exhaustive device/performance certification is asserted.

## 16. Intentional Demo Limitations

| Boundary | Status | What is still required inside the local demo |
|---|---|---|
| Static HTML/CSS/JS; no Angular/ASP.NET/EF/SQL service | **INTENTIONAL PHASE-1 DEMO LIMITATION** | Coherent same-origin records, state transitions, visible effects and honest labels. |
| Simulated login/password, fixed OTP/email delivery, professional/entity verification | **INTENTIONAL PHASE-1 DEMO LIMITATION** | Matching canonical person/invite scope; no unauthorized local route/command transitions; no “email sent” claim. |
| Simulated payments/subscriptions | **INTENTIONAL PHASE-1 DEMO LIMITATION** | Cost/currency/cancellation disclosure and no false charge/refund or entitlement claim. |
| Local notifications | **INTENTIONAL PHASE-1 DEMO LIMITATION** | Recipient, resource ID/link, correct unread/read and history. Missing local offers/notices are defects. |
| IndexedDB attachment in one profile | **INTENTIONAL PHASE-1 DEMO LIMITATION** | Restricted local viewer paths, type/size error feedback, missing-file state; PDF/camera still need explicit verification. |
| Unsigned demo QR / local roles editable in storage | **INTENTIONAL PHASE-1 DEMO LIMITATION** | Correct scoped command behavior, replay/duplicate checks, distinct registration/attendance/completion. |
| One active identity per browser origin | **INTENTIONAL PHASE-1 DEMO LIMITATION** | Clear switch/reload protocol and stale-view write prevention; PRIV-02 is not excused by this model. |
| Cross-device database, real auth/authorization, secure files/QR, transactions, durable audit/delivery | **FUTURE BACKEND** | Not graduation-demo blockers by themselves. Production security must be tested separately. |
| Last-write-wins simultaneous mutations / scheduled expiry service | **FUTURE BACKEND** | Local sequential held-seat/expiry/reoffer invariants still required and testable now. |
| Browser extension absent | **NOT IMPLEMENTED** | Honest prototype labeling exists, but approved local blocking/reminder scope needs a feasibility decision and actual browser proof. No backend is required to demonstrate local extension blocking. |

Do not turn browser-local limitations into a waiver for split identities, missing regular Provider discovery, invalid role scope, lost records or fabricated measured outcomes.

## 17. Prioritized P0/P1/P2 Findings Ledger

Paths in evidence cells are repository-root paths under `/Users/ahmadbanihamad/Public/Projects/DeepSprout`; functions/actions are named to survive line movement. `UI`, `command`, `integration`, `data`, `coverage` and `design` identify the issue type. A status belongs to the specific requirement in its row, not the whole role.

| ID | Area | Requirement | Actual Current State | Evidence (file/function/test) | Status | Priority | Required Action | Dependencies |
|---|---|---|---|---|---|---|---|---|
| ONB-01 | Data/identity; Individuals/upgraded Students | Person-specific setup, activation, resume | Global prior-user setup/activation sends a new person to handoff/done with no own plan | `Client/src/js/utils/storage.js` KEY/onboardingResume; `onboarding.js` entry; `starting-point.js` start; focused browser fixture | FAIL | P0 | **Fix** first-run journal binding and migrate old state without guessing ownership | Canonical Person; DATA-02 |
| PRIV-01 | Authorization; all participants/Institutions | Same admission/state/window guards on every write | Partner form/competition paths bypass regular admission/date checks | `commands/institution.js` participant branches/respondToForm/enterCompetition; `commands/initiative.js` member wrappers; custom command probe | FAIL | P0 | **Fix** shared invariant guards; retain regular and Partner destinations | Existing shared response/entry records |
| PRIV-02 | Data/privacy; all personal users | Active identity must match mutation journal | Header switches to Beta while cached Alpha journal remains writable | `account.js` load/pending/mutate; `member-layout.js` paintIdentity; seams browser two-tab probe | FAIL | P0 | **Fix** identity-change invalidation and subject check before personal writes | ONB-01 identity contract |
| GOV-01 | Authorization/integration; owner/Admin/Individual | Suspended entity cannot continue admissions/booking | Suspended Provider accepts Waitlisted booking; suspended Institution accepts Pending application | `commands/platform.js` admin.application.decide; `initiative-rules.js` registrationState; `outdoor.js` participant.book; command probes | FAIL | P0 | **Fix** entity/resource effective eligibility in reads and commands; notices/history | Shared lifecycle rules |
| COACH-01 | Authorization; Coach/Institution/student | Revoked Coach has no future mutation scope | Independent-approved former author can cancel former Initiative task | `commands/mentorship.js` mentor.assignment.cancel author shortcut; command probe | FAIL | P0 | **Fix** current Initiative grant/allocation guard, preserve authorship | Existing groupAuthority |
| PROVIDER-03 | State/eligibility; Provider/Individual | Every booking/offer transition checks current window/state | Late bookings accepted; suspended Experience offer accepted | `commands/outdoor.js` participant.book/provider.booking.approve/participant.offer.accept; probes | FAIL | P0 | **Fix** current resource/owner/window/eligibility guard at all transitions | GOV-01; retain capacity engine |
| REG-01 | Coverage regression; Individual/Institution | Full Institution suite reaches FR and console | Twenty steps pass, FR fills hidden form and stops; console NOT RUN | `Client/tests/institution-browser.test.cjs` FR | FAIL | P1 | **Fix test assertions** to exercise chooser then form; preserve behavioral checks | Current registration; ONB-01/02 for complete journey |
| REG-02 | Coverage regression; all Partner entrants | Full original Partner suite executes registration and routes | Strict unscoped h1 failure, obsolete `.auth-choices` assertion next | `Client/tests/partner-browser.test.cjs` visit/first registration check | FAIL | P1 | **Fix test assertions** for active headings and both chooser levels; skip nothing | Current entry.js contract |
| DATA-01 | Durability/errors; all roles | Do not acknowledge a failed save | Quota exception swallowed; returned Person disappears on next read | `store.js` persist/backup; `account.js` writeChanges; quota probe | FAIL | P1 | **Fix** visible persistence failure and safe backup/migration ordering | Storage adapter contract |
| DATA-02 | Migration; all roles | Preserve/map existing identity and eligible evidence | Operational schema migration works; old personal/Community/version provenance unresolved | `migrate.js`; schema tests; storage/account/Community source | PARTIAL | P1 | **Complete** versioned alias/ownership mapping and failure recovery fixtures | ONB-01, PRIV-03; no ambiguous auto-merge |
| DATA-03 | Clock/integration; all roles | Coherent demo eligibility and source dates | Operational offset, seed-asOf and wall date differ; offer scenario uses wall time | `domain.js` nowMs; `account.js` today; `starting-point.js`; `store.js` demo.scenario | PARTIAL | P1 | **Integrate** explicit demo time/seed labels; offset-aware operational scenarios | Weekly Lab and Provider expiry tests |
| PROVIDER-01 | Integration; Provider/regular Individual | Original live Camp/booking in Explore/My Registrations | New Camp visible partner=1, regular=0; regular bookings fixture-only | `shared/selectors.js`; `explore.js` liveById/renderMine; seams browser | FAIL | P1 | **Integrate** original Experience/Booking/Offer projection, QR/history/cancel/actions | Round-0 guards, Person |
| PROVIDER-02 | Policy/config; Provider/Admin/Individual | Configurable 24-hour interim hold | 15-minute default; Admin max120; old offer scenario | `domain.js` offerNext; `data/platform.js` settings; `pages/admin.js` system; measured probe | FAIL | P1 | **Fix** unit/schema/config/UI/default and clock fixtures; preserve existing offer deadlines | Owner-approved interim24h |
| PROVIDER-04 | Missing fields/validation; Provider/Individual | Six-stage §16.3 policy/price/session contract | Six stages exist but cost, zone, session policy/staff/form/version incomplete | `builders/experience.js`; `outdoorCommand` save/publish | PARTIAL | P1 | **Complete** builder and command blockers/preview; no real payments | Completion representation, approved disclosure |
| PROVIDER-05 | Lifecycle/integration; Provider/booked people | Original-resource revisions, cancellation/history/notices | Duplicate revision gets new ID; cancellation/closure lacks coherent source-linked notices/reconciliation | `outdoor.js` duplicate/cancel/archive/close; `pages/provider.js` actions | PARTIAL | P1 | **Complete** attributed original-ID future revisions and terminal transition effects | PROVIDER-01/03/04/08 |
| PROVIDER-06 | Completion/reward; Provider/Supervisor/Individual | Apply each published Camp criterion | Evaluator unconditionally requires every session | `outdoor.js` evaluate sessions.every; one-of-two controlled fixture | FAIL | P1 | **Fix** versioned structured criteria + explicit authorized decision/evidence snapshot | PROVIDER-04; DEC-05 where waivers unresolved |
| PROVIDER-07 | Reward/report integration; Supervisor/Individual | Eligible Provider attendance/history affects correct readers | Provider factual attendance omitted from rabbit and regular participation history | `selectors.js` personalGardenEffects; `account.js` experiences; probe | PARTIAL | P1 | **Integrate** original Provider attendance/completion sources with caps/corrections | PROVIDER-01/06; GARD-03/04 |
| PROVIDER-08 | Missing integration; offered/booked people | Linked recipient notices for booking lifecycle | No offered-person notice created by offerNext | `domain.js` offerNext/expireOffers; new-notice probe | NOT IMPLEMENTED | P1 | **Integrate** local recipient notices and original target links for every transition | Original booking projection |
| PROVIDER-09 | Partnership integration; Institution/Provider/Individual | Accepted link presents same Provider resource in regular path | Ownership/capacity preserved locally; regular Initiative link projection absent | `institution.js` partnership actions; `participant.js`; `selectors.js` initiativeCard/myInitiatives | PARTIAL | P1 | **Integrate** accepted-resource projection and permitted aggregates, no copy | PROVIDER-01; accepted partnership |
| TASK-01 | Lifecycle/evidence; both Coach contexts/students | Start/due/cancel/parent policy constrains work and rewards | Future submission allowed; cancelled work review creates reward; suspended Initiative accepts task submission | `mentorship.js` startTask/submitTask/mentor.review/cancel; probes | FAIL | P1 | **Fix** shared temporal/lifecycle guards and explicit historical-review exception policy | COACH-01, GOV-01; DEC-01 |
| TASK-02 | History/integration; full Individual/Student | Keep cancelled/removed-membership own work/history | Regular selector omits cancelled tasks/current-member-only; limited Student differs | `selectors.js` assignedTasks; `student.js` tasksOf; retained-submission probe | FAIL | P1 | **Fix** separate active To-do from authorized historical projection | One shared task engine; privacy rules |
| COACH-02 | Versioning; Coach/students/Admin | Pin approved activity definition/content version | Program activities are titles; task lacks immutable activity definition version | `builders/program.js`; `mentorship.js` materialize/assignment.create | PARTIAL | P1 | **Complete** catalog IDs/version snapshots and preserve submitted versions | ADMIN-04; existing Program version |
| STUDENT-01 | Capability/identity; limited Student | Group-only personal capability before upgrade | Direct Lab/Shield/Recovery/Garden opens demo/Ahmad journal | `account.js` journalOf/readChoice; `app.js` Individual link; four direct-route probe | FAIL | P1 | **Fix** destination/write gate and fallback; offer same-ID upgrade | ONB-01, PRIV-02 |
| ONB-02 | Resume/data; Individuals | Persist partials and resume first unfinished valid task | Survey reload loses answers; completed DH still chosen by legacy handoff | `assessment.js`; `onboarding.js` renderHandoff; personal/focused browser | FAIL | P1 | **Fix** versioned attempt draft/recovery and journal-driven next task | ONB-01; validity protocol |
| ONB-03 | Missing flow; Individuals | Short skip/replay tour after activation | Done page links directly Home/Plan; tourSeen only metadata | `starting-point.js/html`; `storage.js` | NOT IMPLEMENTED | P1 | **Complete** brief contextual tour and replay state | Correct person activation |
| ONB-04 | Validation/personalization; Individuals | Valid baseline and truthful preference/result-derived preview | Presence-only baseline gate, fixed reading mix, null initial levels | `starting-point.js` baselinesComplete/PRACTICE_MIX; fresh activated record | PARTIAL | P1 | **Complete** validity/reasoning/preferences/initial type levels under labeled defaults | ONB-01/02; ACT-02; DEC-02 |
| LAB-01 | Missing required feature; Individuals | Weekly free official eligibility | Cycle-end window; full set every third cycle | `account.js` checkInWindow/checkInTasks; `lab.js` schedule | FAIL | P1 | **Fix** independent weekly eligibility, rotating pair, missed-window states | DEC-02 window/protocol; DATA-03 |
| LAB-02 | Measurement integrity; Individuals | Compare only valid matching versions/protocols | DH-1.0 and DH-99.0 compare; done check ignores validity | `account.js` checkIns/checkInWindow; mismatch fixture | FAIL | P1 | **Fix** comparable protocol/version/validity guards and retry | Versioned instruments; DEC-02 |
| REC-01 | Missing adaptation; Individuals | Review/adjust writes next future week with audit | Initial review dropped; lighter-review saves text but no schedule change | `starting-point.js` activation; `account.js` applyChange; `weekly-review.js`; fresh review probe | FAIL | P1 | **Complete** review schedule, proposals, accept/keep/adjust, future reschedule/revisions | ONB-04; practice definitions; DATA-03 |
| REC-02 | Missing lifecycle; Individuals | Absence/resume, cycle end, next cycle/maintenance | Active plan clamps day/week; no operational continuation state machine | `account.js` plan/applyChange; `recovery-plan.js` | NOT IMPLEMENTED | P1 | **Complete** conservative continuation and outcome review, preserve evidence | REC-01; open calibrated load rules |
| ACT-01 | Missing execution/evidence; Individuals | Four genuine versioned practice players | Generic timer expiry marks all types valid/measured; no passage/audio/challenge validation | `training.js` sessions/completeSession/openSession | FAIL | P1 | **Complete** actual type-specific content/attempt/outcome player; honest Protected Work evidence | Catalog versions; media/content rights |
| ACT-02 | Missing progression; Individuals | Independent levels, opt-in next level, bounded load/retries | No level-accept mutation; null fresh levels; repeated timers count | `account.js` training/applyChange; `training.js` | NOT IMPLEMENTED | P1 | **Complete** per-type eligibility/accept/step-down/history and repeat limits | ACT-01, ONB-04; DEC-02 thresholds |
| ACT-03 | Catalog regression; Individuals/Admin | Deprecated Stillness/interventions not republished as practices | Legacy categories/items and direct timer routes remain deliverable | `admin/store.js` categories/activities; `training.js` guide reader/sessions | FAIL | P1 | **Fix** allowed taxonomy/targets and map old history, preserve approved guides | ADMIN-04; no new fifth practice |
| SHIELD-01 | Missing technical feature; Individuals | Exactly two actual supported-browser capabilities | Settings/timer prototype; no extension/manifest, aggregate reminder or blocking | `shield.js/html`; file inventory | NOT IMPLEMENTED | P1 | **Complete** validated extension + honest connection/failure/reminder/protection UI | DEC-03 feasible sites/permissions |
| SHIELD-02 | Provenance/design; Individuals | Sample data never masquerades as actual browser observation | Seed usage labeled extension-measured despite absent extension | `shield.js` measured section; `account.js` usage; `insights.js` | PARTIAL | P1 | **Fix** inline sample-source/last-seen labels, unavailable real telemetry state | SHIELD-01 and chosen demo dataset |
| GARD-02 | Reward integrity; Individuals | Each eligible unique source effect counts once | Duplicate personal attempt ID produces duplicate tree sources; unlimited timer repeats | `account.js` mutate/attempt.add/practiceGarden; focused fixture | FAIL | P1 | **Fix** source/version/policy idempotency and eligibility/repeat cap | ACT-01/02; preserve old records |
| GARD-03 | Reward correction; Individuals/groups | Attributed compensation and consistent current/history projections | Reward rows deleted; cancelled-task personal/group effects disagree | `outdoor.js` correct/evaluate; selectors; programGroupGarden; probes | PARTIAL | P1 | **Fix** correction ledger and shared eligibility across projections | TASK-01; Provider completion |
| GARD-04 | Migration/reward; existing Individuals | Map valid historical attendance/Camp sources | practiceGarden omits legacy registration/experience decoration evidence | `account.js` practiceGarden; `garden.js` sources; `selectors.js` | PARTIAL | P1 | **Integrate** idempotent provenance mapping; exclude old review/quiet-day effects | DATA-02, PROVIDER-07 |
| INS-01 | Integration; Individuals | Five live domains incl. original Provider/assigned evidence | Five domains exist; Provider remains fixture-based and task counts fragmented | `insights.js` renderBeyond; `account.js` experiences/training | PARTIAL | P1 | **Integrate** original IDs, dates, periods, denominator and source coverage | Provider, Lab, practice/plan fixes |
| HOME-01 | Integration/truthfulness; Individuals | State-aware Hero, goal, live opportunities/community | Static Hero/opportunity links, missing live Initiative feed, fixed “Real stories” | `Client/index.html`; `home.js` renderSpaces/renderWeek/nextSteps | PARTIAL | P1 | **Integrate** relevant records/CTA and remove or label invented testimonials | Provider; personal state; Community source contract |
| EXPLORE-01 | Discovery/registrations integration; Individuals | Live opportunity types and relevant filters/own registrations | Live Initiatives only; other discovery/registrations still largely fixtures | `explore.js`; `selectors.js`; `account.js` listings/allRegistrations | PARTIAL | P1 | **Complete** live scoped projections/filtering and unified own records | Provider bridge; existing Institution sessions |
| ADMIN-01 | Consolidation; Platform Admin | One destination with verified parity | Two stores/UIs still retain distinct capabilities | `src/admin/*`; `workspaces/pages/admin.js`; fresh legacy tests | PARTIAL | P1 | **Refactor** by capability, retain old routes until replacement proof | Round-0 identity; capability map §11 |
| ADMIN-02 | Governance; Admin/all people | Canonical identity/grants/suspend/ban semantics | Sample legacy users vs canonical workspace people; grants/ban/notice UI incomplete | `admin/core.js`; `pages/admin.js` users; platform person.status | PARTIAL | P1 | **Complete** scoped canonical directory and reasoned governance | PRIV-03; approved policy |
| ADMIN-03 | Governance; Admin/owners/participants | Complete lifecycle/notice effects for all governed resources | UI chiefly suspend/restore; notices implemented for Initiatives only | `commands/platform.js` admin.resource.status | PARTIAL | P1 | **Complete** valid transitions/notices/read eligibility without operational takeover | GOV-01; Provider lifecycle; TASK-01 |
| ADMIN-04 | Catalog/integration; Admin/Coach/Individual | Preserve guide and executable/assignment publication/version targets | Separate legacy guide vs title-based operational catalog | `admin/core.js`; `platform.js` admin.catalog.save; `training.js`; program builder | PARTIAL | P1 | **Integrate** governed versioned catalog and target adapters | COACH-02, ACT-01/03 |
| ADMIN-05 | Policy publication; Admin/Individuals | Preserve assessment/plan/Shield/Garden tools and validated live targets | Legacy editors + workspace metadata; no validated personal-policy delivery | `admin/operations.js`; `pages/admin.js` policies/assessments | PARTIAL | P1 | **Complete** controlled publisher; preserve simulator/editors; keep preview labels | LAB/REC/ACT/SHIELD/GARD contracts; owner calibration |
| ADMIN-06 | CMS/integration; Admin/public/member | Preserve both CMS targets, approved version/rollback | Four legacy Landing keys and one partner-discovery target; Home absent | `admin/platform.js`; `published-content.js`; workspace cms | PARTIAL | P1 | **Integrate** target-aware CMS parity and agreed new regions | DEC-04 target allowlist; HOME-01 |
| ADMIN-07 | Moderation/integration; Admin/members | Workspace moderation changes actual member feed | Legacy bridge works; workspace moderation array disconnected | `admin/community.js`; workspace platform admin.moderate; `community.js` | PARTIAL | P1 | **Integrate** original report/post IDs, reason/actor/action effects | COMMUNITY-01/02; DEC-04 moderation policy |
| ADMIN-08 | Reports/audit/notices; Admin | Source-qualified consolidated operations and attribution | Separate sample/partner populations, audit and report routes | `admin/app.js` reports alias; workspace shared renderReports/domain.audit | PARTIAL | P1 | **Integrate** explicit populations/periods/CSV and recipient notices | Canonical records, existing exports |
| ADMIN-10 | Legacy capability preservation; Admin | Do not lose unique trainer/group operations | Legacy management has no equivalent workspace operation | `admin/core.js` group editor; workspace admin group overview | PARTIAL | P1 | **Refactor** with model mapping and explicit preserved operations | D19 one-parent groups; DATA-02 |
| COMMUNITY-01 | Identity/privacy; members | Person-bound authors/time/reaction/save scope | Posts lack Person/time; “You/Just now” follows every identity | `community.js` makePost/compose/persist; seams browser | FAIL | P1 | **Integrate** canonical authors, timestamps and person-private saved/reaction state | PRIV-03; DATA-02 legacy attribution |
| COMMUNITY-02 | Missing persistence; members/moderators | Persistent own comments and complete report workflow | Comments vanish on reload; legacy moderation works but lacks full reason/remove/appeal parity | `community.js` comment-form; `admin/community.js`; UI probe | PARTIAL | P1 | **Complete** stored comments/decisions with agreed scope and errors | COMMUNITY-01; ADMIN-07; DEC-04 |
| REG-03 | Design/resume; registrants | Approved copy and resumable selection/routing | New wording differs; choice reload resets; wrapper drops fragment | `register/experience/entry.js`; register.js; root register.html; focused checks | PARTIAL | P2 | **Fix** nonsecret resume/fragment and reconcile exact copy | Owner approval if changing master wording |
| REG-04 | Coverage/flakiness; QA | Stable bounded readiness/animation assertions | No flake reproduced; fixed sleeps and networkidle remain | Institution/Supervisor browser helpers; Explore animations | PARTIAL | P2 | **Verify/Fix harness** from trace, state/route/animation completion waits | Retain motion coverage; do not force clicks |
| REG-05 | Historical regression; public landing/QA | Current retained landing test contract | Product-journey null article match before browser launch | `product-journey.test.cjs:16`; hero-reels-lab markup | FAIL | P2 | **Fix** correct target/assertions with retained behavior proof | Owner-retained landing target |
| INST-01 | Completion auditability; Representative/student | Decision follows stated criteria and preserves source rationale | Attributed per-person outcomes; default-all-except-list command, no general criteria evaluator | `initiative.js` initiative.complete; Rep completion UI | PARTIAL | P2 | **Verify/Complete** explicit human attestation vs structured enforceable criteria and unmet-case tests | Published Initiative policy; DEC-05 |
| PROVIDER-10 | Invitation usability; Provider/Supervisor | Resend/replace expired appointment safely | Copy/revoke/expiry present; no resend; old invited row blocks reissue | `outdoor.js` provider.appoint/revoke; provider supervisors UI | PARTIAL | P2 | **Complete** replacement token/history and old-link refusal | Existing appointment model |
| ROUTINE-01 | Eligibility; Individuals | Qualifying routine distinct from arbitrary to-do | All routine Done days qualify; bounded distinct-day decorations | `offline-routine.js`; `account.js` practiceGarden | PARTIAL | P2 | **Complete** simple published eligibility/source label; no intrusive evidence | DEC-02 reward policy |
| GARD-05 | Navigation; Individual/Coach | Authorized independent Group Gardens reachable separately | Personal Garden links only Initiative Group Gardens | `garden.js` groupLinks | PARTIAL | P2 | **Integrate** independent authorized Group Garden links | Existing Program/group membership selector |
| PRIV-03 | Identity integration; Individuals/partners | Profile identity matches login/invitation identity | Private profile name/email diverge from canonical Person | `profile.js` save-account; account profile.update; seams probe | FAIL | P1 | **Fix** canonical update/reverification or accurate separate display fields | Shared Person; DATA-02 |
| PRIV-04 | Privacy/read model; students/staff | Student projections omit internal notes | UI hides notes; raw history projection includes internalNote | `selectors.js` assignedTasks; `mentorship.js` mentor.review; Coach C12 | IMPLEMENTED / CODE-INSPECTED ONLY | P2 | **Fix** recipient-specific sanitization and negative projection tests | Preserve staff review history |
| COMMUNITY-03 | Source integrity; members | Optional share derives from real eligible achievement | Composer query string prefill, no source validation | `community.js` share query handler | PARTIAL | P2 | **Complete** source reference/consent projection; share never rewards | Real achievement contract |
| COMMUNITY-04 | Unfinished/policy; members | Agreed Joint Goals/check-ins only | Challenge text post, no membership/check-ins; final policy postponed | `community.js` challenge-form; legacy jointGoals | PARTIAL | P2 | **Owner Decision / Complete** minimum approved workflow separately | DEC-04; canonical Community identity |
| ADMIN-09 | Commercial preview; Admin/all audiences | Preserve plan/entitlement preview without invented enforcement | Separate illustrative Individual prices vs audience TBD metadata | `config/subscriptions.js`; admin subscriptions; workspace entitlements | PARTIAL | P2 | **Integrate** honest proposed-tier preview parity; defer actual enforcement pending policy | DEC-06 commercial approvals |
| UX-01 | Accessibility; assessment users | Focus and radio keyboard semantics across steps | No stage focus move / no radio arrow handling | `assessment.js` showStage/startSurvey/renderQuizQuestion | IMPLEMENTED / CODE-INSPECTED ONLY | P2 | **Fix/Verify** keyboard and assistive-tech behavior | Keep valid timed response input |
| UX-02 | Timezone; owners/Supervisors/participants | Date-aware zones and displayed correct windows | Fixed London offset; Provider zone fixed | `initiative-rules.js` TZ_OFFSET/at; experience builder | IMPLEMENTED / CODE-INSPECTED ONLY | P2 | **Fix/Verify** IANA-zone conversion and DST examples | Declared timezone |
| UX-03 | Dashboard clarity; Coach | Upcoming means actionable remaining work | Completed Program assignments appear as future deadlines | `pages/coach/independent.js` upcoming; fresh mobile screenshot | PARTIAL | P2 | **Fix** eligible-parent/outstanding-task filter | Existing taskState/program status |
| UX-04 | Public/accessibility/copy; all entrants | Correct year, meaningful legal/help/creator links | ©2025 and unavailable-info dialogs | `layouts/auth-footer/auth-footer.js`; register info handlers | PARTIAL | P2 | **Fix/Complete** year and actual approved content/URLs | Owner-provided policy/contact/creator details |
| QA-01 | Coverage; all roles | Camera/PDF/large-roster/full responsive/keyboard proof | Specific gaps in §14; no invented passes | TST-01/02/04/05, §19 evidence | NOT TESTED | P2 | **Verify** targeted remaining routes/devices/states after functional fixes | Stable role/data state |
| DEC-01 | Program policy; Coach/student | Pause/late/cancelled historical-review semantics explicit | Paused submissions allowed by demo code, not a published selectable policy | `mentorship.js` programWorkOpen/mentor.review; Coach report §17 | OWNER DECISION REQUIRED | OWNER DECISION | Decide publishable interim semantics; keep current labeled behavior until resolved | Does not justify unauthorized scope |
| DEC-02 | Measurement/reward/load policy; Individuals/groups | Calibrated weekly/level/Garden thresholds | Weekly interval approved; exact window/protocol/load/stages/quorum open | Master §26.2; policy constants; Coach builder | OWNER DECISION REQUIRED | OWNER DECISION | Decide/version demo calibration without clinical claims; label defaults | LAB/ACT/REC/GARD implementation |
| DEC-03 | Extension technical policy; Individuals | Supported sites/browser/telemetry/reminder limits | No implemented extension proof | Master §§6/26.2; absent manifest/bridge | OWNER DECISION REQUIRED | OWNER DECISION | Select feasible local technical scope and permission/privacy model | SHIELD-01/02 |
| DEC-04 | Community/CMS policy; members/Admin | Final social workflow/moderation and editable targets | Deliberately postponed design; no final ranking/Joint Goal rules | Master §§12/19/26.2 | OWNER DECISION REQUIRED | OWNER DECISION | Approve minimum social/CMS scope; invent no ranking/reward | Round 4 / ADMIN-06/07 |
| DEC-05 | Participation/consent policy; organizers/participants | Published queue/cutoff/waiver/age/safety/appeal rules | 24h hold approved interim; other exceptions not finalized | Master §§16/24/26.2 | OWNER DECISION REQUIRED | OWNER DECISION | Decide needed demo exceptions and production consent/retention separately | Provider completion; INST-01 |
| DEC-06 | Commercial/vendor policy; all audiences | Actual prices/taxes/entitlements/AI decisions | Proposed tiers/prices illustrative; no approved vendor/processor | Master §§20/26.2; config/subscriptions.js | OWNER DECISION REQUIRED | OWNER DECISION | Approve commercial policy before enforcement; no AI or real payment invented | ADMIN-09; FUTURE-01 |
| FUTURE-01 | Production platform; all roles | Secure synchronized server-owned operations | Static browser-local simulation only | `Server/README.md`; store/domain/attachments | FUTURE BACKEND | FUTURE BACKEND | Implement later auth/API/database/transactions/secure files/QR/audit/delivery/payment after approval | Separate production phase, not demo blocker |

The positively verified primary Coach/Supervisor/Institution/Garden cases in §§4–10 are intentionally retained alongside this gap ledger. A FAIL here is scoped to its requirement; it does not negate every successful workflow in that area.

## 18. Exact Recommended Implementation Slices

The proposed Round 0–5 order remains appropriate, with **identity/permission/persistence P0 fixes added to stabilization**. These are future implementation instructions, not changes performed by this audit. Each numbered sub-slice should be its own bounded task and stop at its acceptance gate. Do not send one prompt to rewrite every cycle.

### Round 0 — Stabilization

**Goal:** remove wrong-person/invalid-scope/data-loss paths and restore meaningful regression execution.

**Gap IDs:** ONB-01, PRIV-01/02/03, GOV-01, COACH-01, STUDENT-01, DATA-01; REG-01/02. Include TASK-01/02's state/history guards where they directly affect suspension/cancellation, plus DATA-02's person-binding migration portion. PROVIDER-03's suspended-resource acceptance belongs here before further booking exposure; finish its full window matrix in Round 1.

**0a — Person-bound first run and durable writes.** Files: `Client/src/js/utils/storage.js`, `Client/src/js/data/account.js`, `Client/src/shared/member-bridge.js`, `Client/src/layouts/member-layout/member-layout.js`, regular auth/login/register, Profile, onboarding/Starting Point and `Client/src/workspaces/migrate.js`. Unify subject/journal/resume selection; recheck subject before mutation; explicit canonical profile update; gate limited personal routes; report quota/write failure. Migrate only unambiguous ownership with a retained raw backup.

**0b — Shared effective authority and lifecycle guards.** Files: `store.js`, `initiative-rules.js`, `coach-rules.js`, `commands/{initiative,institution,mentorship,outdoor,platform}.js`, `shared/selectors.js`, Participant/Assigned consumers. Put admission/window/form/competition invariants below every entry point; derive owner/entity/resource effective availability; remove former-author authority shortcut; align active task versus own historical task projections and document review of pre-cancellation evidence.

**0c — Registration assertions and complete regression.** Files: `Client/tests/{institution-browser,partner-browser,register-experience,coach-browser,supervisor-browser}.test.cjs` and relevant command tests. Exercise two top-level choices and all Partner subtypes, then unchanged domain assertions. Replace obsolete readiness/selectors and capture final console results. No skips or weakened identity assertions.

**Upstream dependencies:** current canonical Person/ID model; minimal explicit decision on historical cancelled-work review (DEC-01). Do not wait for production authentication.

**Acceptance:** two new Individuals sequentially complete/resume independent first runs; upgrade on a browser with another user's legacy setup; switch identity in another tab and stale writes are blocked/rebound; limited Student cannot load/write personal journal; wrong-email/expired/revoked and foreign group cases still fail; suspended owner/resource cannot receive application/booking/offer acceptance; participant and member form/competition paths deny identical invalid cases; quota failure keeps old data and prevents success/navigation; updated FR and Partner registration reach end and console; 37 existing commands and Coach/Supervisor/legacy integrations remain green.

**Regression risks:** wrong legacy journal ownership, lost seeded story, privacy-note projection changes, accidental withdrawal of valid historical work, broad Admin takeover. **Exclusions:** new Provider public bridge, new content players, Admin redesign, production auth, arbitrary owner policy values. **Stopping point:** no confirmed P0 remains; each affected original regression reaches its final check; preservation/migration evidence retained. Do not call later Personal/Provider contracts complete merely because stabilization passes.

### Round 1 — Outdoor Provider into the regular Individual product

**Goal:** complete master Scenario D and the Provider portion of F using the existing owner/Supervisor engine.

**Gap IDs:** PROVIDER-01–10, remaining PROVIDER-03 window/consent cases; Provider portions of GARD-03/04, INS-01, HOME-01 and EXPLORE-01; Provider offer/demo-clock part of DATA-03.

**1a — Publish/read/book/cancel.** Files: `Client/src/shared/selectors.js`, `member-bridge.js`, `workspaces/commands/outdoor.js`, `pages/member/explore/*`, `workspaces/pages/provider.js`, Home/Insights readers. Add original Experience projections and member wrappers, My Registrations, own same-ID state/QR/reload. Implement accepted partnership presentation. Stop once one unique Published Camp and Booking travel regular → owner → Supervisor → regular without copying.

**1b — Builder/revision/queue/notifications.** Files: `workspaces/builders/experience.js`, `commands/outdoor.js`, `domain.js`, `data/platform.js`, Provider/Participant pages, Admin system config and original record history. Add required contract fields/blockers; explicit Free/Paid simulated disclosure; 24-hour interim default; date/owner/window/offer guards; linked notices; original-ID future revisions; cancellation/archive/closure reconciliation; safe appointment resend.

**1c — Completion/corrections/reward/history.** Files: same commands plus `shared/selectors.js`, personal Garden/Insights and Provider reports. Implement published structured completion policies, authorized decision evidence, correction compensation, bounded birdhouse and eligible attendance rabbit. Preserve existing attendance attribution and absence semantics. Do not invent absence waivers.

**Upstream dependencies:** Round-0 identity/authorization; DEC-05 only where choosing completion/queue/cancellation exceptions, not to reopen 24 hours. Adopt a minimal explicit policy representation before arbitrary prose criteria are accepted.

**Acceptance:** create unique two-session Camp through all six builder stages; Draft absent; publication uses original ID in regular Explore/Home; regular new Individual books same ID seen by owner/appointed Supervisor; capacity1 plus held offer invariant; cancel/Queued/Offered/Accept/Decline/Expire/reoffer/reload, exact default24h; post-cutoff, suspended owner/resource, duplicate and stale acceptance refused; QR/code/manual attendance/window/correction; Camp with one-of-two criterion and one with all-required behave differently; no booking-only birdhouse; reward correction preserves history; accepted Institution link shares same resource/capacity; pending link has no public effect; all local notices target actual records.

**Regression risks:** overbooking held seats, consent/version loss, duplicate rewards/copies, historical bookings moved to a new revision, leaking Provider roster to Institution. **Exclusions:** transport/accommodation systems, real payment/refunds, Provider Group Garden, cross-device transactions. **Stopping point:** Scenario D and Provider part of F pass through regular Individual with negatives and console, existing Supervisor suite remains green.

### Round 2 — Personal Individual, in five separate slices

**Goal:** complete the continuous personal journey and source-credible personal views.

**Gap IDs:** ONB-02/03/04, LAB-01/02, REC-01/02, ACT-01/02/03, SHIELD-01/02, GARD-02/03/04/05, ROUTINE-01, INS-01, HOME-01, EXPLORE-01; remaining DATA-02/03 personal evidence/time mapping. Minimal activity-ID/version contract from COACH-02/ADMIN-04 is a prerequisite, not a reason to migrate the whole Admin UI now.

**2a — First-run recovery, tour and weekly Lab.** Own-person draft attempts/validity/resume, skip/replay tour, weekly independent eligibility and compatible comparisons. Files: onboarding/Starting Point, `lab/{lab,assessment,assessment-data}.js`, `account.js`, navigation/Help. Stop after new, returning, interrupted, invalid and upgraded user paths plus day7 official eligibility; choose and label interim protocol parameters (DEC-02).

**2b — Four actual practice players and level choices.** Files: `training.js/html`, new type-specific practice/content modules, catalog IDs/versions, `account.js` attempt/level mutations, Assigned references where needed. Provide licensed/original listening content and accessibility modes; genuine reading/questions, concrete challenge evidence, honest Protected Work intention/outcome. Stop after one complete/retry/interruption/version-preserving and progression/Stay Here/step-down path per type with bounded sources. Do not use Lab instruments as daily practice by silently reclassifying them.

**2c — Adaptive Recovery and cycle lifecycle.** Files: `starting-point.js`, `weekly-review.js`, `recovery-plan.js`, shared plan scheduler/account events and source history. Persist Week-1 review/rest/due rows, version future schedules, accept/keep/adjust/reschedule, conservative skip behavior, absence return and cycle review/next cycle/maintenance. Stop after four-week clock-driven lifecycle with immutable past evidence and no unsupported recovery score. Practice content from 2b supplies reliable evidence.

**2d — Shield technical proof.** Files: existing Shield page plus a separately scoped Chrome-compatible extension manifest/background/content/blocked/reminder pages and message adapter if DEC-03 approves that technical scope. Implement and actually test selected-domain blocking, expiry/disconnection/failure and aggregate active-site reminder with Continue/Back and strict-block precedence. Stop at the implemented supported-browser/site boundary, with real browser blocking evidence. If feasibility is not approved/proven, keep an explicitly incomplete prototype claim; do not mark a countdown as completion.

**2e — Personal/Group source projections and action hub.** Files: `account.js`, `selectors.js`, `garden.js`, `home.js`/`Client/index.html`, `insights.js`, `explore.js`, offline routine and migration modules. Deduplicate eligible sources, migrate valid historical attendance/Camp evidence, add compensation history and independent Garden links, source-label data, integrate real opportunities/Community projections and relevant Hero/goal/next action. Complete regular Sessions/Competitions discovery and registration history without changing organizational ownership. Stop after master Scenario A and all corrected Garden/source/absence/comparison negatives pass with real user actions and reload.

**Upstream dependencies:** Round 0; Provider reader/reward contracts from Round 1 for full experiences; DEC-02 calibrated defaults; DEC-03 extension scope; owner-approved media/content. Weekly eligibility itself is already approved and must not wait for a commercial decision.

**Acceptance:** actual four tasks with no inserted results; partial/invalid resume and no extra official duplicates; first commitment mandatory; tour skip/replay; week7/day14 official pair, no all-four weekly demand; no mismatched-version comparison; one real attempt each practice with content/version/outcome and independent level; review changes next future week, past attempts unchanged; conservative skipped review; absence/cycle-end review/next cycle/maintenance; supported extension blocking/reminder tested separately; four fixed trees and bounded eligible decorations, no review/likes/purchase/completion reward, duplicate/correction/migration stable; no-data neutral; Home/Insights/Explore agree on original records.

**Regression risks:** corrupt personal event overlays, invalid scientific comparisons, conflating timer and verified content, deprecated taxonomy resurrected via guides, fabricating telemetry, coupling Institution tasks to private plan. **Exclusions:** medical recovery promises, AI vendor integration, new fifth practice, mobile app blocking, final commercial quotas, wholesale partner rewrite. **Stopping point:** all five slices meet their own acceptance and Scenario A; do not combine them into one sprawling implementation prompt.

### Round 3 — One Platform Admin by capability parity

**Goal:** move unique capabilities into the intended Workspace Admin with demonstrated recipient effects.

**Gap IDs:** ADMIN-01–10, remaining COACH-02 activity-version integration, PRIV-04 recipient projection, Admin portions of DATA-02 and GOV-01.

**Files/modules:** `Client/src/admin/{app,store,core,operations,platform,community,subscriptions}.js`, `Client/src/workspaces/{pages/admin,commands/platform,shared}.js`, `Client/src/js/services/published-content.js`, subscription config and validated personal catalog/policy adapters.

**Slices:** (3a) canonical people/grants/governance/notices/audit; (3b) catalog/instruments/personal policy publication preserving simulator/presets/rules; (3c) target-aware CMS and real moderation; (3d) reports/CSV/entitlement previews/legacy group reconciliation. Each gets a legacy-action → destination → original record/version → recipient → rollback proof before removing an old route.

**Upstream dependencies:** stabilized identity and domain policy/version contracts. DEC-04 CMS/moderation targets, DEC-06 commercial policy only for live entitlement behavior; keep undecided previews honest.

**Acceptance:** every §11 row demonstrated in destination; preserve legacy guide-to-Activities, four Landing regions and partner-discovery region, member preview, templates/simulator, controlled assessment library, Shield categories/presets, Garden rule table, trainer/group operations, Subscriptions & Revenue, partner approvals/oversight/exports/audit; actual moderation changes member feed; suspension/rollback/notices/correct scope/reload negative tests. No invented combined platform totals or automatic paid role grants.

**Regression risks:** retiring unique legacy functions, policy edits rewriting old attempts/plans, CMS arbitrary HTML, mixed sample/canonical directories, broad privacy access. **Exclusions:** real payment/auth/backend, new unapproved CMS regions/social policy. **Stopping point:** capability matrix all verified replacements or explicitly retained routes; no legacy route removal based on page count.

### Round 4 — Community and remaining approved policy work

**Goal:** make the retained finite Community workflow person-bound and persistent, then implement only the owner-approved minimum shared-goal/social scope.

**Gap IDs:** COMMUNITY-01/02/03/04, remaining ADMIN-07/HOME-01 social projections; DEC-04 decisions that affect workflow.

**Files/modules:** `Client/src/pages/member/community/community.js/html`, canonical Community repository/selector, legacy moderation adapter and Workspace moderation, Home post projection, source achievement-share adapter.

**Upstream dependencies:** canonical Person, Admin decision/report contracts, source-qualified achievement events; owner decision on Joint Goals/check-ins, moderation/remove/appeal/ranking and public/privacy scope.

**Acceptance:** posts/comments/reactions/saved collection scoped to original person/post and survive reload; another identity sees actual author/time, not “You/Just now”; report/decision source and actor/reason preserved, hide/remove/dismiss produce approved visibility; source-backed opt-in share only, no Garden effect; finite filtered feed, honest sample/empty/error state; any approved Joint Goal has actual membership and dated check-ins. No ranking algorithm is required unless approved.

**Regression risks:** misattributing old posts, leaking saved state, undoing moderation on stale post save, publicizing private results, engagement reward farming. **Exclusions:** infinite feed, unapproved rankings/challenge reward systems, compulsory accountability partners. **Stopping point:** approved local workflow is demonstrated; undecided policy stays explicitly unresolved rather than filled with invented features.

### Round 5 — Final QA, accessibility and design polish

**Goal:** produce presentation readiness evidence after functional data/state contracts are stable.

**Gap IDs:** REG-03/04/05, INST-01, PROVIDER-10 if not completed in Round 1, ROUTINE-01/GARD-05 if not already closed in Round 2, UX-01–04, QA-01, remaining TST matrix and weak historical-source evidence. Do not defer an active P0/P1 from earlier rounds into this bucket.

**Files/modules:** affected page CSS/HTML/UI components, auth footer/Help content, timezone helper, current focused browser/command suites and new acceptance evidence locations. Use isolated configurable output folders rather than tracked historical validation overwrite.

**Upstream dependencies:** earlier round acceptance, approved policy/copy/content, a coherent resettable multi-role fixture with explicit demo clock and provenance.

**Acceptance:** full master A–F plus negative families reach final console checks; actual camera and PDF cases or explicit supported fallback limitation; browser135-person/fourth-staff rendering and keyboard flow; 390/tablet/desktop full/empty/invalid/revoked/cancelled/offered states, dialogs/back/forward/focus, screen-reader chart/Garden alternatives and reduced motion; DST/timezone check; no dead navigation, fabricated testimonials/telemetry or stale labels; no personal/source migration loss. Repair the historical landing test around its retained behavior. Final report must identify any still-open owner limitation rather than convert it to PASS.

**Regression risks:** polishing stale/incorrect model, animation changes masking timing regressions, screenshot assertions preserving obsolete semantics. **Exclusions:** broad aesthetic redesign and backend delivery. **Stopping point:** approved Phase-1 acceptance evidence complete, residual limitations explicitly owner-accepted, no unresolved critical functional defect.

## 19. Test Commands, Results and Evidence

### 19.1 Isolation and tooling

Local preview used `python3 Client/serve.py --port 8896`. Initial sandbox bind/Chrome attempts were denied by the environment; equivalent local test commands then ran successfully with tool escalation. These were tooling constraints, not product test failures. No package was installed in the repository.

Playwright/pngjs came from bundled dependencies:

`/Users/ahmadbanihamad/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules`

Chrome:

`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`

For member jsdom only, an existing external installation was used:

`/private/tmp/claude-501/-Users-ahmadbanihamad-Public-Projects-DeepSprout/4e99f386-6d8b-4135-a1e0-8042abac9a9f/scratchpad/tools/node_modules`

All fresh raw logs, screenshots, fixtures and output adapters are under **`/private/tmp/deepsprout-phase1-audit/`**. They are diagnostic temporary files, not changes to historical repository evidence or a second report deliverable. No existing `/tmp` Admin/registration screenshots were overwritten.

`partner-browser` and `product-journey` hardcode tracked validation directories. To execute safely, a temporary loader read the original file and changed **only its output directory expression**, then compiled it with the original filename/dirname/module search paths. Admin tests' fixed `/tmp` screenshot paths were similarly redirected into the audit folder. **No assertion, control action, registration step, timeout or test body was removed.** Original tests remain byte-identical. The output redirection pairs are logged in `*-output-redirect.json`; `run-test.cjs` and `run-suite.cjs` record the exact runner.

The seven browser regression jobs were run **sequentially**, in new contexts. The real personal assessment and targeted seam probes used separate clean contexts and no shared profile. They were not used to diagnose a performance benchmark. No normal browser profile or user browser storage was opened.

### 19.2 Original suite execution

Paths below start at the repository root. Browser jobs used `BASE_URL=http://127.0.0.1:8896`, `REELS_URL` at the same origin where applicable, the Chrome path above and bundled `NODE_PATH`. `SHOTS_DIR` was unique per compatible suite; registration used `REGISTER_CAPTURE_DIR=/private/tmp/deepsprout-phase1-audit/registration`.

| Command / exact original suite | Result | Evidence and qualification |
|---|---|---|
| `node --test Client/tests/partner-store.test.mjs Client/tests/institution-cycle.test.mjs Client/tests/supervisor-cycle.test.mjs Client/tests/coach-cycle.test.mjs` | **PASS — Independently Verified** | 37 tests, 37 passed, zero skipped/failed; `commands.log`. |
| `node Client/tests/page-wiring.test.cjs` | **PASS — Independently Verified** | 14 pages OK; `wiring.log`. Wiring only. |
| `node Client/tests/member-journey.test.cjs` with external jsdom | **PASS — Independently Verified** | Fourteen checks passed; one jsdom “navigation to another Document” notice, not a failed assertion. ES modules are skipped; no full UI/cross-workspace claim. `member.log`. |
| `node Client/tests/register-experience.test.cjs` | **PASS — Independently Verified** | Five reported verification groups, actual registration to onboarding, Partner forms, keyboard/error/reduced-motion/mobile cases; `register.log`, registration/report.json. Its error listener covers page exceptions, not a general console-error audit. |
| `node /private/tmp/deepsprout-phase1-audit/run-test.cjs institution-browser` | **FAIL** | Original suite:20 operational steps passed; FR hidden-form timeout; exit1. Mobile/reduced-motion tail and final CONSOLE **NOT RUN**. `institution-browser.log`. |
| `node /private/tmp/deepsprout-phase1-audit/run-test.cjs partner-browser` | **FAIL** | Original assertions, output path only redirected. Strict h1 failure at first registration visit; exit1; later100-route/check/console sections **NOT RUN**. `partner-browser.log`, partner/report.json. |
| `node /private/tmp/deepsprout-phase1-audit/run-test.cjs coach-browser` | **PASS — Independently Verified** | 38/38 including five390px checks, reduced motion and final console. `coach-browser.log`, fresh screenshots. |
| `node /private/tmp/deepsprout-phase1-audit/run-test.cjs supervisor-browser` | **PASS — Independently Verified** | Primary cases plus three390px checks/reduced motion/final console passed, 18 result rows with SHOTS enabled. `supervisor-browser.log`. No actual camera. |
| `node /private/tmp/deepsprout-phase1-audit/run-test.cjs admin-dashboard` | **PASS — Independently Verified** | Exit0; dashboard definitions/routes/dialogs/four-width/empty-state assertions. Fresh screenshot output isolated. `admin-dashboard.log`. |
| `node /private/tmp/deepsprout-phase1-audit/run-test.cjs admin-member-integration` | **PASS — Independently Verified** | Exit0; guides/legacy moderation/pricing/profile/route-width and JS/asset assertions. `admin-member-integration.log`. Does not prove Workspace Admin convergence. |
| `node /private/tmp/deepsprout-phase1-audit/run-test.cjs product-journey` | **FAIL** | Null article match at line16, before launch; browser/final console **NOT RUN**. `product-journey.log`, product/validation.json. |
| `git diff --check` | **PASS — Independently Verified** | No whitespace errors at audit verification. No fix performed. |

The entire cinematic/hero/Reels inventory, general 404 server suite and unrelated tests were not indiscriminately run. A dependency-skipped suite was never counted as a pass. No “skip registration” scratch run was used to claim Partner completion.

### 19.3 Additional targeted execution

These temporary probes are audit fixtures, not modifications to the checked-in suite:

| Probe/script | Strongest observation | Result classification |
|---|---|---|
| `personal-browser.cjs` → `personal.json` | Actual register/setup/survey/timed tasks/depth/results/activation/Home; all four official valid versioned records;2 Week-1 practice rows, zero review rows, null levels | Four-task/activation requirement **PASS — Independently Verified**. Whole scratch script **PARTIAL**: later second-registration attempt used root `register.html#individual`, lost fragment on redirect and timed out filling hidden form. No final scratch-suite pass is claimed. |
| `focused-browser.cjs` → `focused.json` | Bounded heading check: standalone3 DOM h1/one visible; workspace2/one visible. Completed DH still selected on resume. Prior-user global activation fixture → new real registration handoff/done but own journal plan=null | Confirmed ONB-01/02 and REG-03. The prior-user activation was a **controlled fixture**; it was not presented as another all-four UI run. An immediate Partner-heading read was made before hash render settled and is not used as evidence of duplicate visible headings. |
| `seams-browser.cjs` → `seams.json` | Unique Provider Camp:partner1/regular0; original confirmed booking. Limited personal URLs show demo/Ahmad. Cross-tab stale Alpha journal under Beta header. Profile/canonical email divergence. Version mismatch comparison. Posted comment lost on reload | Confirmed integration/identity/comparison/Community findings. The initial registration count was sampled too early and is excluded; bounded focused checks/dedicated suite supply registration evidence. |
| Same seams script, responsive matrix | Provider detail/waitlist, Rep participants, Provider Supervisor desk, Coach Program, Student task, Explore/Activities/Garden/Insights ×1360/768/390 | **PASS — Independently Verified** for 30 chosen states: zero page overflow, visible main heading and no detected unlabeled visible form input by the simple label heuristic. This is not full accessibility or interaction certification. |
| `review-browser.cjs` → `review.json` | Fresh unreviewed person-plan fixture: accepted “Lighter week ahead”; review persisted; schedule unchanged, no next-week rows | Confirms REC-01. Earlier forced-demo review in focused probe hit an existing reviewed week, so it was **not** used as evidence of a newly saved review. |
| `probes.mjs` → `probes.json` | Fifteen controlled command/read-model probes listed below | Tests current command behavior, not a complete browser flow; no persistent user data. |

Command probes and recorded actual outcomes:

1. **Past Provider window:** new Waitlisted booking accepted on10Nov for closed23Oct/ended25Oct Camp.
2. **Offer default/notices:**15-minute hold; zero new offered-recipient notices.
3. **Suspended Experience offer:** acceptance becomes Confirmed despite Suspended resource.
4. **Suspended Provider:** still accepts new Waitlisted booking.
5. **One-of-two Camp rule:** first completed session leaves booking Checked In, because evaluator insists on both.
6. **Provider attendance:** new Present Provider attendance does not add its source to rabbit effects (only prior Institution attendance remains).
7. **Revoked Institution Coach + independent approval:** former authored Initiative assignment can be cancelled, even without reason.
8. **Cancelled task:** subsequent approval succeeds, one reward and Personal tree effect created.
9. **Future task:** start25Oct accepted/submitted15Oct.
10. **Cancelled history:** original submission retained, regular assignedTasks omits it.
11. **Migration3→4:** first change true, repeat false, identical second serialization; people/submissions/bookings preserved.
12. **Quota failure:** member.register returns new ID; immediate read has no new person.
13. **Suspended Institution:** new Pending Application accepted.
14. **Suspended Initiative:** student task submission still succeeds.
15. **Alternate form/competition paths:** no-admission participant responds; competition accepts1Jan2027 after1Nov2026 deadline.

Initial versions of probes1/4 used a regular Individual without a Partner participant workspace and were correctly rejected by the outer workspace gate. They were rerun with an eligible Partner participant and prior booking cancelled to reach the intended date/entity guards. This preserves the distinction between the missing regular Provider bridge and the demonstrated lower-level guard failure. No product test was edited to conceal either result.

### 19.4 Source evidence index

Key files used for the independently established conclusions:

- [Authoritative contract](/Users/ahmadbanihamad/Public/Projects/DeepSprout/DeepSprout.md), particularly §§3–19,21–26. Historical §29 is not used as current proof.
- [Canonical store and migration dispatch](/Users/ahmadbanihamad/Public/Projects/DeepSprout/Client/src/workspaces/store.js), [migration](/Users/ahmadbanihamad/Public/Projects/DeepSprout/Client/src/workspaces/migrate.js), [shared read models](/Users/ahmadbanihamad/Public/Projects/DeepSprout/Client/src/shared/selectors.js), [member bridge](/Users/ahmadbanihamad/Public/Projects/DeepSprout/Client/src/shared/member-bridge.js).
- [Provider commands](/Users/ahmadbanihamad/Public/Projects/DeepSprout/Client/src/workspaces/commands/outdoor.js), [seat/offer/notification rules](/Users/ahmadbanihamad/Public/Projects/DeepSprout/Client/src/workspaces/domain.js), [Experience Builder](/Users/ahmadbanihamad/Public/Projects/DeepSprout/Client/src/workspaces/builders/experience.js).
- [Shared task/invitation engine](/Users/ahmadbanihamad/Public/Projects/DeepSprout/Client/src/workspaces/commands/mentorship.js), [Coach rules](/Users/ahmadbanihamad/Public/Projects/DeepSprout/Client/src/workspaces/coach-rules.js), [Institution commands](/Users/ahmadbanihamad/Public/Projects/DeepSprout/Client/src/workspaces/commands/initiative.js), [alternative form/competition engine](/Users/ahmadbanihamad/Public/Projects/DeepSprout/Client/src/workspaces/commands/institution.js).
- [Private journal](/Users/ahmadbanihamad/Public/Projects/DeepSprout/Client/src/js/data/account.js), [old global first-run store](/Users/ahmadbanihamad/Public/Projects/DeepSprout/Client/src/js/utils/storage.js), [onboarding](/Users/ahmadbanihamad/Public/Projects/DeepSprout/Client/src/pages/member/onboarding/onboarding.js), [Starting Point](/Users/ahmadbanihamad/Public/Projects/DeepSprout/Client/src/pages/member/onboarding/starting-point.js), [assessment runner](/Users/ahmadbanihamad/Public/Projects/DeepSprout/Client/src/pages/member/lab/assessment.js).
- [Practices](/Users/ahmadbanihamad/Public/Projects/DeepSprout/Client/src/pages/member/training/training.js), [weekly review](/Users/ahmadbanihamad/Public/Projects/DeepSprout/Client/src/pages/member/weekly-review/weekly-review.js), [Shield](/Users/ahmadbanihamad/Public/Projects/DeepSprout/Client/src/pages/member/shield/shield.js), [Garden](/Users/ahmadbanihamad/Public/Projects/DeepSprout/Client/src/pages/member/garden/garden.js), [Community](/Users/ahmadbanihamad/Public/Projects/DeepSprout/Client/src/pages/member/community/community.js).
- [Workspace Admin](/Users/ahmadbanihamad/Public/Projects/DeepSprout/Client/src/workspaces/pages/admin.js), [platform commands](/Users/ahmadbanihamad/Public/Projects/DeepSprout/Client/src/workspaces/commands/platform.js), [legacy operations](/Users/ahmadbanihamad/Public/Projects/DeepSprout/Client/src/admin/operations.js), [legacy Community bridge](/Users/ahmadbanihamad/Public/Projects/DeepSprout/Client/src/admin/community.js), [registration experience](/Users/ahmadbanihamad/Public/Projects/DeepSprout/Client/src/pages/auth/register/experience/entry.js).

Source function names and current tests in the ledger are the primary locators; compressed one-line modules make very broad line ranges less useful. No alleged production exploit, clinical validity result, large-roster performance score or camera/PDF pass is inferred from source inspection.

### 19.5 Working-tree preservation verification

SHA-256 comparison covered every one of the 852 baseline files, including tracked/untracked source, existing tests, master specification, all three implementation reports and historical validation files: **zero changed or removed baseline files**. This report is the only repository file created by this audit. Additional concurrent additions appeared under `.claude/` and `node_modules/`, plus root `package.json` and `package-lock.json` (242 newly listed paths at the final check). Their authorship was not established; none was created, edited or removed by the audit. They were left untouched. The test dependencies used by this audit were the external installations listed above. No commit was performed. Temporary audit diagnostics are confined to the audit directory described above.

## 20. Final Readiness Assessment

**Ready to continue narrow implementation rounds; not ready to claim the complete Phase-1 graduation demonstration.** Preserve the current Institution/Supervisor/Coach engines and repair the verified seams. The primary independent Coach and Supervisor browser journeys pass; the Institution's operational chain passes before obsolete FR registration handling stops its suite. Neither registration test failure justifies rebuilding an already functioning cycle.

Before design polish, close wrong-person resume/journal writes, invalid alternative command scope and owner/resource lifecycle guards, persistent-save error handling, the regular Provider booking loop, weekly Lab, actual practice/progression, adaptive Recovery continuation, supported Shield proof, remaining reward/source migration issues and required Admin/Community integration. The four baseline UI journey is now independently exercised, but the entire personal journey is still partial.

The **next three highest-priority rounds** are **Round0 stabilization**, **Round1 Outdoor Provider → regular Individual**, and **Round2 Personal Individual in bounded slices**. Then converge Admin, complete only policy-approved Community scope, and perform final acceptance/accessibility/design QA. Owner decisions DEC-01–06 should specify parameters and disclosure, not reopen approved four-tree/one-parent/135-seat/three-Supervisor/weekly-Lab/24-hour-interim rules. Production server security, durable multi-device state, payments and concurrency are separate future work.

This audit stops with evidence and the proposed roadmap. Application source, existing tests, the master specification, prior reports and historical evidence have not been repaired or rewritten by this task.
