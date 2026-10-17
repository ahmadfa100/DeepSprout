# DeepSprout Round 2C — Adaptive Recovery and continuous journey

**Date:** 17 October 2026. **Scope:** Round 2C only, static/browser-local Phase 1. No commit was created. Recorded verification and limitations follow below.

## 1. Implementation summary and finding status

The original Person-bound Plan now sits within one continuous Recovery Journey with versioned cycles, detailed weeks, future-only schedule revisions, source-backed weekly reviews and explicit continuation decisions. Activation creates a genuine Week 1 containing practices, optional routine references, rest/no-obligation days and a Weekly Review. Later weeks are generated from review decisions or a conservative skipped-review continuation. An ended calendar interval becomes review due; it does not become recovery success.

| Finding | Round 2C result |
| --- | --- |
| REC-01 | Closed within the local implementation: persisted review/rest structure, exact scheduled-attempt matching, factual weekly summaries, real Accept/Keep/Adjust schedule generation, saved previews, future-only adjustments and attributed rescheduling. |
| REC-02 | Closed within provisional policy: missed/unknown distinctions, absence Resume/Adjust, conservative skipped-review continuation, cycle-end review, previewed Next Cycle/Maintenance, pause/resume/cancel/archive and preserved history. |
| Related Individual integration | Existing Lab eligibility/protocols, actual four practice players, independent levels, optional-load limits, source-backed Garden effects and partner authority remain in their original modules. No claim that every broader Home/Insights/Admin finding is closed. |

No medical recovery score, neurological coefficient or claim of recovery in 28 days was introduced. Default duration, load, absence and maintenance rules are explicit calibration choices.

## 2. Modules reused and integration boundaries

Reused:

- `DeepSproutAccount`, its canonical subject/access checks, original private journal, staged writes, stale-tab detection and personal demo clock.
- Round 2A four baselines, original Plan ID and activation, goal/setup/preview, original offline commitment and four Level 1 events.
- Round 2B versioned content, actual players, attempts, evidence classes, independent level decisions, repeat policy and Garden source selectors.
- Existing Recovery Plan tabs, calendar/day detail, Bimo artwork, Weekly Review stages and Activities destinations.
- Existing offline-routine records and self-report workflow. Future commitment labels are projected by effective date; new check-ins retain their actual title snapshot.
- Existing legacy first-run utilities, now delegating current day/week/goal to the authoritative account when available, rather than displaying Cycle 1 forever after continuation.

No Lab instrument/protocol or weekly three-day eligibility policy was changed. No Coach, Institution, Supervisor, Provider, booking, attendance, queue, Program or operational-clock module was edited. Personal scheduling cannot edit their records. No Garden HTML/CSS/JS, species, decoration policy, scene or Group Garden was changed. No Home redesign, extension, backend, database, payments, Community rebuild or Admin consolidation was added.

## 3. State, storage and versions

All changes remain events in the **existing Person journal**. A Recovery command computes an internal transaction; callers cannot supply a replacement state payload. Validation and application are staged on a clone, the original journal is checked for concurrent changes, one event is persisted, and only then is in-memory state updated.

The Recovery state contains:

- Canonical Person and continuous Journey reference.
- One current Cycle reference and retained earlier cycles.
- Cycle IDs, original Plan reference, dates, mode, initial revision, creator/timestamp, baseline references and effective preference versions.
- Detailed week IDs, Person/Journey/Cycle/Plan references, source, original action IDs, revision/policy version, effective date and prior week versions.
- Attributed schedule revisions with actor, timestamp, prior/new preferences, original/replacement action IDs, applicable decision/evidence and reason.
- Weekly Review IDs, chosen decision/preferences, answers, original source evidence and revision reference.
- Saved, unconfirmed adjustment drafts; visit/return choices; cycle review and continuation references.

Current state is projected as `Active` / `Maintenance`, `Paused`, `Cycle Review Due`, `Reviewed`, `Cancelled` or `Archived`. Calendar expiry is derived from the personal clock. Explicit decisions retain prior snapshots; cancellation/archival never deletes history. A continuation links the old cycle to one new original Cycle ID under the same Journey and Plan; a repeated command cannot create another active cycle.

Old journal events remain readable. Legacy adoption retains original action IDs, instructions, attempts and dates and identifies missing metadata honestly. A legacy Cycle container reference is labelled legacy; it is not claimed to be a historically recorded original ID. Unrecorded past days/weeks remain unknown. Adoption does not invent past review/rest actions or successful completions.

## 4. Scheduled actions and practice matching

New scheduled rows identify Person, Journey, Plan, Cycle, week, original action ID, revision, date/start/due window, kind, required/optional status and policy. Practice rows also record canonical type, intended level and the `approved-current-level-content-v1` selection rule. The player chooses approved content at the user's independently selected current level; Recovery does not implement another player or raise a level.

The common legacy `minutes` field remains the user's planning budget, with an explicit `timeBudgetMinutes` field. This preserves older consumers that expect the chosen budget on each schedule row. It is **not a timed duration for rest, review or routine**; `estimatedMinutes` remains unknown until relevant content is selected, and those row kinds are rendered without a fictitious practice duration. Rest/routine rows are not required in-app practices.

A qualifying source must match the original scheduled action, correct canonical Person/type, a valid Completed Round 2B attempt, current evidence contract and the action's date window. Future results are not treated as already completed when the demo clock is moved backwards. Invalid, wrong-Person, wrong-type, unrelated older, withdrawn or out-of-window attempts cannot satisfy an obligation. One original attempt has one scheduled reference. An eligible completed source is linked to the action atomically with submission; the original attempt/content/level is retained.

Due core work bypasses the optional practice-start limit through the original Round 2B gate. Content cooldown and Garden eligibility remain separate: essential work may remain accessible while a repeated content source earns no additional growth. Required work links to the correct existing Activities player.

Daily views distinguish Upcoming, Due, In Progress, Completed, Partial, Missed, Rescheduled, Cancelled/Paused, Rest and Unknown/No Reliable Data. Completed counts have an explicit due denominator. A historical week is labelled **Past week, with actual counts**. The legacy `is-done` CSS hook is retained only for legacy elapsed-period consumers; factual `data-period` / `data-outcome`, a neutral clock treatment and visible counts do not label an incomplete week successful.

## 5. Weekly Review and adaptation

The review opens the day before the weekly boundary and remains available as a late review. It shows scheduled versus due practices, valid original linked attempts with their evidence classifications and actual question score where present, invalid/missing attempts, self-reported routine coverage, current independent levels/time preference, independent Lab status and missing live Shield evidence.

Two short answers cover manageability and activity fit. Versioned local rules propose:

- A smaller load when the user reports excessive workload, or recorded misses combine with reported strain.
- The existing approved cadence otherwise, with no automatic increase or level change.
- Alternative approved types when the user reports poor fit.
- A practical suggestion to keep pace or preview a smaller load after several misses, without inferring scrolling behavior or deterioration.

The initial mix comes from the approved Week-1 practice rows where available; it is not silently replaced with a generic mix during Keep Current Pace. Goal-based defaults are used when no prior mix exists. Offline commitment/preferences and actual evidence are retained with the proposal.

**Accept Next Week** saves the proposed future actions. **Keep Current Pace** saves the previous cadence without increasing difficulty. **Adjust** previews explicit days/minutes/type choices, then saves them as a real future week. Reviews and new weeks are created once, with original evidence and decision references. Incomplete evidence does not block an honest review.

A final weekly review records continuation preferences without inventing Week 5. A very late review cannot materialize an already elapsed next week; it records the real review and explains that eligible future changes belong in Adjust. Neither case falsely says a past schedule was changed.

## 6. Skipped review and interim rules

| Rule | Provisional implementation |
| --- | --- |
| Cycle duration | Default 28 days / four weeks; guarded local configuration supports 14, 21 or 28 days for subsequent cycles. Duration is planning, not a medical deadline. |
| Load | One core practice on each selected practice day; 1–5 practice days/week, with time budgets of 5/10/15 minutes and explicit available weekdays. No all-four-daily requirement. |
| Initial week | Only Week 1 is detailed; the four-week direction remains visible. Supplied activation practice rows are retained and completed with review/rest/routine structure. |
| Excessive workload | Default proposal roughly halves the prior day count, rounded up, minimum one. It requires acceptance; Keep or Adjust remain available. |
| Skipped review | On return to Recovery, Weekly Review or Activities, materialize only the current eligible week/today-forward, same or lower cadence. Do not create a past backlog or mark the skipped review Completed. |
| Partial-week change | Work already begun or historically scheduled is preserved. Remaining allocation respects the requested weekly budget; skipped past slots are not reassigned as forced makeup. |
| Absence | Default seven personal calendar days between recorded visits; guarded configuration 7–30. Summary and Resume/Adjust decision persist across reload. |
| Maintenance | Default one practice day/week, configurable one or two; explicit user continuation under the same Journey. No claim of being cured. |
| Lab | Original weekly Digital Habits + rotating task and three-day interim window; never dependent on review/cycle completion. |

Rules are local Phase-1 defaults, not final owner-approved numerical calibration. A saved review, login, date change, plan adjustment or elapsed cycle grants no Garden source.

## 7. Future-only adjustments and rescheduling

Adjust supports actual weekdays/day count, time budget, suitable practice mix, offline commitment, main goal and an explicit lower-difficulty request. A lower request appends the existing Round 2B decision shape, preserves original level events/attempts, and changes no other type.

Preview choices are saved as an **unconfirmed journal draft**, survive reload, and do not change the schedule. This also preserves the existing failure/retry and focus-selection consumer contract. Confirmation validates the current schedule revision, creates attributed future replacements, and clears the draft. UI wording distinguishes `Saved preview` from `Future revision saved`.

Only future unstarted personal obligations can move. A move gets a new Action ID linked to the original, reason, date and revision. Already attempted work, past missed obligations, completed results, other people's work, Coach tasks, Provider bookings and Institution attendance cannot be rewritten. Original superseded/cancelled rows remain inspectable. Goal/commitment changes have effective dates; earlier goals and new self-report title snapshots retain their own history.

Atomic failed draft, review, adjustment and continuation writes were tested. Failure leaves the prior authoritative state intact; retry does not report false success or duplicate a week/cycle. Stale identity and shared-journal checks still apply.

## 8. Absence, ending and continuation

A missed day is a missed/partial obligation where evidence exists, never a relapse score or forced makeup. Unscheduled or unobserved days are unknown. Several misses get a gentle adjustment path. A week-long return summary reports actual completed/missed scheduled work and unknown periods, with persisted Resume or Adjust; it does not replay onboarding or reset earned growth.

After the cycle interval, the UI offers Cycle Review Due with **all-week source-backed counts**, routine self-report coverage and explicit missing-data distinctions. A reflection can be saved even when incomplete. The resulting Reviewed state exposes a real proposed Week 1 for both continuation choices **before** the user presses Start Next Cycle or Enter Maintenance.

Next Cycle uses the same Journey/Plan/Person and retained baselines, goals/preferences and independent levels; only the Cycle ID is new. Maintenance uses a lighter user-controlled schedule and retains Activities, routine, Lab, Garden and history. Pause/resume preserves the calendar interval; if it ends while paused, resumption leads to review rather than hidden makeup. Reasoned cancellation closes eligible remaining work; archived cycles are read-only. No duplicate active cycle or automatic next cycle is created.

## 9. UI changes

The existing four sections remain **Overview, This Week, Adjust, History**. Existing palette, layout and original Bimo artwork were reused.

- Overview retains the useful current action and four-week direction, adding return/cycle state, source-based cycle review and visible continuation previews.
- This Week uses the same calendar/day detail, accurate statuses, routine references, actual player links, additional review obligations and preview/confirm rescheduling.
- Adjust provides real inputs, a persisted unconfirmed preview and explicit schedule confirmation, with recoverable errors.
- History includes cycles, actual review decisions, goals, source counts/attempt references and expandable attributed revisions with original/replacement action rows.
- Native controls, keyboard tab movement, focus indicators, reduced motion and 390 px geometry are retained. No large calendar framework or public-page redesign was introduced.

## 10. Exact files changed or added

Modified:

1. `Client/src/js/data/account.js`
2. `Client/src/js/utils/storage.js`
3. `Client/src/pages/member/onboarding/starting-point.js`
4. `Client/src/pages/member/training/training.js`
5. `Client/src/pages/member/recovery-plan/recovery-plan.html`
6. `Client/src/pages/member/recovery-plan/recovery-plan.css`
7. `Client/src/pages/member/recovery-plan/recovery-plan.js`
8. `Client/src/pages/member/weekly-review/weekly-review.html`
9. `Client/src/pages/member/weekly-review/weekly-review.css`
10. `Client/src/pages/member/weekly-review/weekly-review.js`

Added:

- `Client/tests/round2c-recovery.test.mjs`
- `Client/tests/round2c-browser.test.cjs`
- `docs/implementation/deepsprout-round2c-adaptive-recovery-report.md`

No existing test assertions were edited, removed, weakened or skipped for this round.

## 11. Model and command verification

Checkpoint 2C-1 passed its three schedule/source/future-adjustment cases before UI/review integration advanced. Checkpoint 2C-2 passed six accumulated cases; checkpoint 2C-3 passed ten, then the final focused suite expanded to **15/15**. The previous 24 Round 2A/2B model cases passed early integration checks.

Final combined model/command result: **104/104**, comprising the previous 89 plus 15 new cases, with no failures or skips:

```sh
node --test Client/tests/round2c-recovery.test.mjs Client/tests/round2a-personal.test.mjs Client/tests/round2b-practices.test.mjs Client/tests/provider-cycle.test.mjs Client/tests/partner-store.test.mjs Client/tests/institution-cycle.test.mjs Client/tests/supervisor-cycle.test.mjs Client/tests/coach-cycle.test.mjs Client/tests/round0-identity.test.mjs Client/tests/round0-lifecycle.test.mjs
node Client/tests/page-wiring.test.cjs
```

Page wiring passes all **14** original pages. Changed/new JavaScript syntax checks and `git diff --check` pass. `member-journey.test.cjs` passes **14/14** with the existing external jsdom runtime; its expected `navigation to another Document` diagnostic is not a failure.

## 12. Browser evidence and regressions

Evidence root: `/private/tmp/deepsprout-round2c-egg5mkfb/`. Preview: `http://127.0.0.1:8897`. All suites use fresh isolated contexts and scratch output directories. No tracked historical capture was overwritten.

```sh
export BASE_URL=http://127.0.0.1:8897
export CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
export NODE_PATH=/Users/ahmadbanihamad/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules
SHOTS_DIR=/private/tmp/deepsprout-round2c-egg5mkfb/release-browser node Client/tests/round2c-browser.test.cjs
```

| Suite | Final recorded outcome |
| --- | --- |
| New Round 2C browser | **17/17 grouped checks**; final console/page-error assertion reached, errors `[]`. Includes explicit failed-save feedback and unchanged schedule, actual player/obligation link, four-week decisions, persisted absence handling, cycle review/Next Cycle/Maintenance, identity, external-record preservation and mobile keyboard checks. |
| Round 2B browser | 17/17 original grouped checks, including actual local audio and final errors. Final rerun: `final-round2b.log`. |
| Round 2A browser | 16/16 original grouped checks, including all four real baseline tasks and final errors. Final rerun: `final-round2a.log`. |
| Coach browser | 38/38 reported checks passed, including final console assertion. |
| Institution browser | 25/25 reported checks passed, including final console assertion. |
| Supervisor browser | 18/18 reported checks passed, including final console assertion. |
| Provider browser | 20/20 passed. |
| Partner browser | 100 route records, 7 walkthroughs, 8 checks; completed true, errors `[]`. |
| Registration experience | Passed; errors `[]`. |
| Round 0 browser | Passed; final page-error assertion reached. Final successful rerun: `round0-verified.log`. |
| Member journey | 14/14 original assertions passed; `member-final.log`. |
| Both Admin suites | Passed; original dashboard/member integration assertions, no JS/asset errors. Existing guide publish/archive still reaches Activities. |
| Page wiring / syntax / diff check | All 14 pages pass; changed/new JavaScript parses; `git diff --check` passes. |
| Product Journey | **Known pre-existing failure remains deferred:** article regex returns null at `product-journey.test.cjs:16`, called at line 18, before browser launch. Its browser/console assertions were **not executed** and are not counted as passing. |

`final-test-results.json` consolidates final successful reruns separately from the first batch's repairable failures. `commands-final.log` records 104/104, `focused-final.log` the focused cases, and per-suite logs retain original output.

New acceptance uses protocol-shaped formal baseline fixtures through the original API, then real Chrome controls for practices, review, adjustment, rescheduling, return, cycle review and continuation. The existing Round 2A regression independently executes the real four baseline tasks. The new suite does not claim to rerun formal measurement validation through fabricated practice outcomes.

Actual screenshots in the final acceptance directory include `initial-overview.png`, `week2-accepted.png`, `continuation-preview.png`, `continuous-history.png` and `mobile-history.png` (390 px wide). Source classification, full-cycle summary, continuation preview and mobile History were visually inspected, in addition to geometry/focus assertions. Final page and console errors are recorded explicitly.

Original browser suites ran as `node Client/tests/<name>.test.cjs` with separate `SHOTS_DIR`/`REGISTER_CAPTURE_DIR`. Admin/Product suites used the source-preserving `run-test.cjs <name>` wrapper only to redirect hardcoded screenshot paths. Actual batch exits, later repair/rerun logs and final consolidated outcomes are retained separately; failed exploratory runs were not relabelled as passes.

Compatibility checks caught three older consumer assumptions: practices-only time-budget rows, independent routine rename precedence/original roadmap wording, and direct saved focus/preview persistence. The fixes preserved the original assertions while giving the new schedule explicit kinds, truthful period outcomes and an unconfirmed draft before actual scheduling confirmation. No obsolete text-only plan adjustment is passed off as a real revision.

## 13. Acceptance coverage

| Required family | Evidence |
| --- | --- |
| Activation, four-week overview, Week-1-only detail, review/rest/routine | Focused 2C-1; browser group 1; real onboarding regression. |
| Actual player, exact source matching, invalid/wrong-person/type, optional/core split | Focused source tests and original 2B tests; browser group 2. |
| Proposal, Accept/Keep/Adjust, actual schedule and idempotency | Focused 2C-2; browser groups 5–7 and reload checks. |
| Future changes, rescheduling, failed writes, historical preservation | Focused adjustment/reschedule/preview cases; browser groups 3–4; original Round 0 failure/retry. |
| Skipped review, unknown days, absence, late review | Focused skipped/late cases; browser groups 9 and 13. |
| Ending, Next Cycle/Maintenance, pause/cancel/archive, no review reward | Focused 2C-3; browser groups 10–12 and source-count comparisons. |
| Lab independence, external authority, identity/upgrade continuity | Focused scope tests; browser groups 8, 14 and 16; role regressions. |
| Reload, mobile/keyboard/reduced motion and final errors | Browser transitions, groups 15 and 17; original member/role suites. |

## 14. Preservation

A fresh Git-status and SHA-256 baseline was captured before editing; `baseline-status.txt`, `baseline-hashes.json`, selected starting-source copies, `final-status.txt` and `preservation-final.json` retain the evidence. Final comparison finds exactly **10 modified existing files and 3 new files attributable to Round 2C**.

All **418 protected starting specification/design/audit/implementation/validation/Garden files remain byte-for-byte unchanged**. This includes prior Round 0/1/2A/2B reports and existing validation captures. The Garden directory's four files and original artwork remain unchanged. No starting file was removed. No additional concurrent change appeared relative to this round's captured baseline at final comparison.

All pre-existing modified/untracked Journey/Reels/Lines work and intentional removals were left intact. In particular, this agent did not restore or replace the already removed `Client/assets/cinematic/event-horizon-reference.png`, `Client/src/js/reels/cinematic-math.js`, `Client/src/js/reels/event-horizon.js`, `Client/src/styles/reels/cinematic.css` or `Client/tests/cinematic-story.test.mjs`. Uncommitted prior personal/partner implementation remains in place; ownership is measured against the starting snapshot, not attributed wholesale from HEAD.

The new browser also compares original external assignments, submissions, bookings and attendance before/after personal changes, plus the operational clock; those records remain identical. Person A/B and same-ID Student upgrade retain their separate authority and records. Garden source IDs are unchanged by weekly review, cycle review, Next Cycle and Maintenance.

No reset, clean, stash, restore, branch change, auto-commit or historical-capture overwrite was performed.

## 15. Open calibration and limitations

The default duration, review opening day, conservative load reduction, 1–5 day bound, time budget, absence threshold, maintenance cadence, type fit rules and content-selection policy need owner/product calibration before production. They are versioned local demonstration choices. No coefficient interprets practice adherence or missing data as neurological/mental-health improvement or deterioration.

This is browser-local persistence and inspectable local evidence, not authenticated server scheduling, tamper-proof telemetry, secure multi-device synchronization or transactional backend concurrency. Long-term storage capacity/durability, production migration and server-enforced policies remain future architecture work. Quota failure, stale writes, retry and reload behavior are demonstrated within this implementation.

Legacy data cannot reveal metadata that was never captured; unknown history remains unknown. Accessibility checks cover keyboard, native controls, reduced motion and browser geometry, not a full screen-reader/assistive-device audit. Round 2B media was preserved; physical audio output validation remains outside this round. The known Product Journey regex failure is separately deferred.

## 16. Remaining dependencies and stop boundary

- **Round 2D:** real Digital Shield extension, supported-browser blocking, observations and usage reminders. This implementation claims none of those capabilities from the prototype.
- **Round 2E:** broader Garden historical-source migration, final cross-page visual/source integration and separately scoped visual work. Existing four-tree scenes, Provider decorations and Group Garden behavior remain unchanged here.
- Admin consolidation, Community work, production backend/authentication and real payments remain their separate scopes.

**Stop:** Round 2C only. No automatic Round 2D work or commit.
