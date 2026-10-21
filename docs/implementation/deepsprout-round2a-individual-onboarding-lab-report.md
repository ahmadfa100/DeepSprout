# DeepSprout Round 2A — Individual onboarding and weekly Lab

**Date:** 16 October 2026  
**Result:** PASS for the authorized Round 2A browser-local implementation. No Round 2B/2C/2D/2E implementation was started. This agent created no commit.

## Implementation summary

The four existing assessment interfaces remain the measurement engine. Their surrounding journal contract now preserves questionnaire drafts, identifies separate timed runs, refuses interrupted measurements, validates completed results and retains original attempt history. Starting Point requires four current, valid, Person-owned official baselines. Its preview reflects the selected goal, available days, chosen minutes and offline interests, requires a personal offline commitment and activates one original Person-bound plan.

A short five-step contextual product guide follows first activation. It supports Skip, Escape, keyboard focus, mobile and Help replay. Its completion is stored in the original Person's journal and does not restart at each login.

Official Lab reassessment now opens **weekly**, independently of Recovery Cycle end: **Digital Habits plus one rotating task**. A configurable three-calendar-day window is the explicitly labelled Phase-1 default. Incomplete/invalid attempts do not complete a window; valid retries are allowed within it; missed windows wait for the next pair under the provisional rule. Comparisons require compatible valid measurements; incompatible history remains inspectable without an improvement line or normalization onto the current instrument scale.

Final combined command/model verification: **77/77**, comprising the existing 65 cases and 12 new personal-model cases. New real-browser Round 2A suite: **16 grouped checks**, including its final console/page-error assertion. Required existing role, registration, member, wiring and Admin regressions passed. The unrelated Product Journey source-regex failure remains deferred.

## Findings closed and remaining

| Finding | Round 2A result | Evidence and boundary |
| --- | --- | --- |
| ONB-02 | Closed within Phase 1 | Original questionnaire draft/answers survive reload; first unfinished valid baseline resumes; completed official tasks do not silently restart as practice. Timed reload, stop or hidden-page interruption requires a separate attempt. Invalid results retain an official retry. |
| ONB-03 | Closed | Five short contextual guide screens covering all required product areas; Skip, Escape, completion, Help replay and per-Person persistence. Actual mobile/focus/reduced-motion behavior exercised. |
| ONB-04 | Closed for initial onboarding/activation | Four correct current contracts and canonical ownership; honest preference-derived preview; explicit commitment; one original plan; four versioned introductory starting levels. No scientific calibration or adaptive scheduler claim. |
| LAB-01 | Closed within the interim weekly policy | Weekly anchor and window IDs; exactly Digital Habits plus one rotating task; no third-cycle full set; free official access; upcoming/open/done/missed states, retry and reload continuity. |
| LAB-02 | Closed within current demo protocols | Instrument, protocol/scoring version, variant, difficulty, conditions, validity and date/completion checks. Both historical results retained when comparison is unavailable. Unknown/incompatible protocols are not plotted on the current measurement scale. |
| DATA-03 | Personal portion closed | Per-Person demo clock controls eligibility, attempt/activation timestamps and personal-day display while preserving original historical dates and seed provenance. Operational clocks/store unchanged. |
| Round 2B/2C/2D/2E dependencies | Not implemented | Practice players/progression, adaptive future-week Recovery scheduling, real Shield extension/telemetry and Garden work remain separate scopes. |

These statuses address this slice, not all personal-product findings from the comprehensive audit.

## Reused components and protected boundaries

Reused:

- The existing Digital Habits questions, Sustained Attention targets, Inhibitory Control go/no-go mechanic, and Depth Challenge passage/questions.
- `DeepSproutAccount` and its atomic append-only personal journal mutations. No second assessment or persistence engine was created.
- Round 0 canonical subject selection, person-bound journals, stale cross-tab/identity protection, limited Student denial and same-ID upgrade.
- Existing Bimo assets, Quick Setup, distinct Results/Building/Preview/Done scenes, Home, Recovery Plan and Insights layouts.
- Existing shared member header, adding only Lab and Help/guide account-menu entries and an accurate personal-clock label.

No Provider, Coach, Institution or Supervisor command engine, shared operational clock/store, booking engine, Garden scene or reward source was rewritten. The original 65 command cases and required role journeys remain operational.

## Checkpoint 2A-1 — Assessment integrity

### Attempt records and valid completion

New official attempts retain:

- Original Attempt ID and canonical Person ID.
- Assessment identity and instrument version.
- Protocol version, scoring version, task/content variant, difficulty and measurement-condition identifier.
- Baseline/weekly classification and original window ID where applicable.
- Start/completion timestamps, personal day and validity status/reason/policy version.
- Original task metrics, questionnaire answers and result summaries.

Runs are distinct from completed results. In-progress, Interrupted and Invalid attempts cannot satisfy a baseline or official weekly pair. Completed result IDs are unique; a repeated save or refreshed page cannot produce another valid official result in the same slot.

The current contracts retain DH-1.0, SA-1.0, IC-1.0 and DC-1.0-a instrument identities. Timed protocols explicitly identify uninterrupted-run behavior; Digital Habits identifies its eight-item sum and Depth identifies its passage/tier and five-question protocol. These are labelled demo measurement contracts, not validated clinical instruments.

Validity requires all eight bounded questionnaire answers, the complete timed protocol with usable responses and bounded early responses, or all five comprehension answers in one uninterrupted attempt. Missing/partial/non-finite or out-of-scale results are Invalid. A high error score alone is not converted into a diagnosis. Inhibitory Control also requires an actual no-go observation. No score is created from a partly completed task.

### Save/resume and interruption

Each Digital Habits answer is saved atomically on the original run. Reload restores selected answers, including a zero-valued answer. Explicit practice uses a separate volatile run and does not consume an official result slot or destroy its saved questionnaire draft.

Timed measurements do not resume from a later trial after a pause. Reload, page hiding or Stop records an interruption and requires an explicit restart with a new Attempt ID, reset counters and fresh timing. Separate interrupted runs are never combined into a score. The earlier run stays in history.

A completed official baseline is not offered again automatically as practice. Practice requires its explicit Lab link. First-run handoff reads valid baseline records rather than merely the presence of a completion flag.

Storage failure leaves committed state unchanged. Failed answers do not change the selected/saved answer count. A failed final result remains unfinished and offers **Retry saving this result**, using the same original Attempt ID. Success clears the prior error notice. Reload/identity changes retain the Round 0 protection against stale writes.

### Historical records

Old journal events and seeded story dates are preserved. Unknown legacy protocol/ownership/completion metadata is not invented to make an old result satisfy a new baseline or comparison. Those records remain in Lab attempt history with their original information and an explanation of missing metadata. Previously active plans remain available; they are not duplicated or given fabricated historical starter-level provenance.

The initial four valid baseline records remain originals throughout weekly checks. Invalid attempts are retained alongside later valid retries.

## Checkpoint 2A-2 — Starting Point, activation and orientation

### Honest preview

Starting Point's build control requires all four valid current official baselines owned by the selected Person. A legacy first-run `planActivated` mirror is insufficient to display an active plan; the original journal plan is authoritative.

Preview rule **v1** uses real inputs:

- Selected goal determines the initial practice mix and four-week direction.
- Available days produce two to five spread-out practices in week one, keeping the review/rest structure.
- A selectable five-, ten- or fifteen-minute preference updates the preview and persisted initial practice durations.
- Offline interests prioritize relevant commitments and influence suitable alternatives. A scrolling-reduction goal with walking interests is not automatically assigned reading. Reading can appear when the person actually selects a relevant preference.

The explanation names these input categories. Self-reported habits, cognitive-task results and personal preferences stay separate. Four valid baselines establish the starting measurement record; they do not create a common brain score or clinically calibrated level recommendation.

Draft goal/day/minute/commitment changes persist per Person and are restored after reload. A failed draft save restores the previous committed preview inputs. The original plan-building scene remains, with reduced-motion support.

### Activation and minimum initial-level compatibility

Activation requires the four valid baselines, a chosen valid goal and one personally chosen offline commitment. One atomic journal event creates the original Plan ID, Person binding, activation date/time, policy version, source Baseline IDs, initial schedule and commitment. Repeating activation cannot create another plan or duplicate its commitment.

New plans initialize each existing practice type at **introductory Level 1**, with policy version and source Plan ID. This is a conservative demo starting rule, not a claim that an assessment calibrated a cognitive improvement or established a particular ability. No new player or level-progression mechanic was implemented.

Home and Recovery Plan read the same original active plan. Only the first week is detailed; future adaptation is not claimed as connected.

### Short contextual tour

Five optional guide screens cover:

1. Home's next action and Recovery Plan.
2. Activities and the four separate practices.
3. Digital Shield's actual prototype/extension-unavailable state.
4. Garden, Lab and Insights, with distinct roles and limits.
5. Explore and original registrations.

The guide uses native modal focus handling, explicit Skip, Back/Next/Finish and Escape dismissal. It restores focus and respects reduced motion without mandatory animation. Completion/skip is an attributed Person-bound journal event. Help & product guide in the account menu and the activation completion page replay it. A dismissed/completed guide stays dismissed on returning Home and reload/login. Seeded legacy plans are not forced through a new automatic tour.

## Checkpoint 2A-3 — Weekly official Lab

### Interim defaults and owner-open decisions

| Setting | Implemented Phase-1 default |
| --- | --- |
| Cadence | Every seven calendar days, independent of the 28-day Recovery Cycle. |
| Anchor | The last completion day among the four valid current official baselines for the original Person. |
| First official opening | Seven days after that anchor. |
| Window duration | Three consecutive calendar days, inclusive of opening day; locally configurable from one to seven. |
| Required set | Digital Habits plus one rotating task. |
| Rotation | Sustained Attention → Inhibitory Control → Depth Challenge → repeat. |
| Missed window | Retain partial/invalid history, do not backfill it as a late official result; wait for the next weekly pair. |
| Invalid result | Explicit retry within the same still-open official window. |
| Valid completion limit | One valid official result per instrument/window; an entire pair requires both valid results. |
| Cost | Official checks and core history/comparisons remain free in this demonstration. |
| Starting practice levels | All four types start at introductory Level 1 under rule v1. |
| Timing estimates | Existing instrument estimates aligned across the catalogs: 4/4/3/6 minutes, including instructions and untimed answers. Actual duration varies; these are not protocol validation results. |

Window duration, missed-window treatment, variants, calibration and final scoring/validity thresholds remain owner-open. The chosen defaults are disclosed in the Lab and this report; they are not represented as permanent product-policy approval.

The old catalog's cycle policy is retained as historical data but no longer controls active eligibility. There is no every-third-Recovery-Cycle full assessment requirement.

### Window identity and continuity

A weekly window ID includes policy identity, canonical Person, baseline anchor and week number. The original run captures its official slot. Completing an old run after that window closes/changes is refused; a later window starts a distinct attempt. Both confirmed completion and current eligibility are rechecked at mutation time.

The Lab shows baseline-needed, upcoming, open, done and missed states, next dates and the exact pair. History exposes original completed/invalid/interrupted/in-progress records and their metadata after reload. Rehearsal remains explicit, unrecorded and excluded from comparisons.

Moving a demo clock backwards cannot mint duplicate official baselines or activate a plan before its recorded valid baseline timestamps. Moving it forward affects eligibility without rewriting historical dates.

### Comparison rules

A comparison requires valid completed official results with matching:

- Instrument identity/version.
- Scoring and measurement protocol versions.
- Material task/content variant.
- Difficulty and equivalent recorded measurement conditions, including timed response method and narrow/wide presentation.
- Appropriate chronological date/completion status.

Current result projection excludes future-dated measurements under the selected clock. Unknown legacy metadata is not silently filled. An incompatible Digital Habits DH-99.0 result remains visible in history, while comparison is unavailable with an explicit reason. No improvement line, percentage or position on the current measurement scale is drawn for an unknown/incompatible protocol. Compatible current results compare side by side with practice-effect limitations; no global recovery percentage is introduced.

### Personal clock

The personal clock is saved in the original Person's private journal. New accounts use device time with an explicit Asia/Amman calendar default; seeded stories retain their original as-of provenance. Local Lab demo controls can pin a personal date or configure window length. The source/date is visible in the Lab and existing demo display.

Attempt start/completion and plan activation use that personal time; response timing still uses the existing task's performance clock. Original history timestamps do not change when a clock shifts. Provider/Institution operational offset and stored operational graph remain unchanged. Tests separately verify clocks/history for Person A, Person B, an upgraded Student and the original seeded story.

## Files authored or modified for Round 2A

New:

- `Client/src/js/data/product-tour.js`
- `Client/src/js/data/product-tour.css`
- `Client/tests/helpers/personal-fixture.mjs`
- `Client/tests/round2a-personal.test.mjs`
- `Client/tests/round2a-browser.test.cjs`
- `docs/implementation/deepsprout-round2a-individual-onboarding-lab-report.md`

Existing source files changed relative to the starting snapshot:

- `Client/src/js/data/account.js`
- `Client/src/js/data/personal-access.js` — clear a prior save-error notice after an actual successful persistence; existing subject/access/save guards retained.
- `Client/src/js/utils/storage.js`
- `Client/src/data/demo-account.json` — estimate metadata only, not story dates/results/provenance.
- `Client/src/data/empty-account.json` — matching estimate metadata.
- `Client/src/layouts/member-layout/member-layout.js`
- `Client/src/pages/member/onboarding/onboarding.js`
- `Client/src/pages/member/onboarding/starting-point.js`
- `Client/src/pages/member/onboarding/starting-point.html`
- `Client/src/pages/member/lab/assessment.js`
- `Client/src/pages/member/lab/assessment.html`
- `Client/src/pages/member/lab/assessment.css`
- `Client/src/pages/member/lab/lab.js`
- `Client/src/pages/member/lab/lab.html`
- `Client/src/pages/member/lab/lab.css`
- `Client/src/pages/member/insights/insights.js` — comparison/date/window projection only, not a layout redesign.

Existing test adaptations:

- `Client/tests/round0-identity.test.mjs`: its identity/plan fixtures now establish valid current baselines and commitments before activation; original isolation/persistence assertions retained.
- `Client/tests/institution-browser.test.cjs`: FR fixture now uses actual current contracts, complete protocol-shaped raw evidence and setup instead of `version:'v1', raw:{}`. It still checks all four results, canonical identity, activation and returning Home. This existing suite remains a fixture handoff test; the new suite actually runs all four interfaces.
- `Client/tests/member-journey.test.cjs`: explicit practice URL, valid activation fixture, and weekly/missed-window expectations replace the superseded cycle-end policy. Fourteen assertions/workflows remain; none are skipped to hide failure.

The concurrent Journey/reels changes described below are not part of this authored list.

## Test execution and evidence

All browser runs used fresh isolated contexts and the local preview at `http://127.0.0.1:8897`, installed headless Chrome and the available Playwright runtime. The new suite uses the browser virtual clock for the real timed mechanics and the personal demo clock for weekly eligibility; it does not replace them with fabricated completed results. Test data is synthetic and not a scientific measurement study.

All new logs/captures are under:

`/private/tmp/deepsprout-round2a-2kuhetwd/`

| Test | Result | Evidence and final check |
| --- | --- | --- |
| 2A-1 checkpoint | PASS | Four new focused model cases; five grouped real-browser checks; `2A-1-commands.log`, `2A-1-browser.log`. Member 14-check suite also passed before expansion. |
| 2A-2 checkpoint | PASS | Six new model cases then present; nine grouped browser checks; `2A-2-commands.log`, `2A-2-browser.log`. Full assessment flow precedes activation/tour tests. |
| Final combined command/model suites | PASS, **77/77** | `commands-final.log`: existing 65 plus 12 new personal integrity/activation/weekly/clock cases, zero skipped. |
| New Round 2A browser | PASS, **16 grouped checks** | `round2a-final.log`, `browser/report.json`; final console/page-error assertion executed, zero errors. |
| Provider browser | PASS, **20/20** | `provider-browser.log`, `provider/report.json`; final error assertion executed. |
| Coach browser | PASS, **38/38** | `coach-browser.log`; final CONSOLE executed. |
| Institution browser | PASS, **25 checks** | `institution-browser.log`; FR, mobile/reduced motion and final CONSOLE executed. |
| Supervisor browser | PASS, **18 checks** | `supervisor-browser.log`; final CONSOLE executed. |
| Partner browser | PASS, **100 routes / 7 workflows / 8 additional checks** | `partner-browser.log`, `partner/report.json`; completed true, zero final errors. |
| Registration experience | PASS | `register-experience.log`, `registration/report.json`; final page-error assertion executed. |
| Member journey | PASS, **14/14** | `member-final.log`; jsdom suite, not a browser-console suite. Its existing navigation-to-another-document diagnostic is retained and does not fail the assertions. |
| Page wiring | PASS, **14 pages** | Original unweakened static checker. The new Lab control forms are real markup, not ignored dynamic-ID exceptions. |
| Source syntax / whitespace | PASS | Changed/new JavaScript syntax checks and `git diff --check`. |
| Admin dashboard | PASS | `admin-dashboard.log`; original data/date/route/dialog/responsive checks. |
| Admin/member integration | PASS | `admin-member-integration.log`; original financial/content/profile/reporting and desktop/mobile checks; final JS/asset-error checks executed. |
| Round 0 browser | PASS | `round0-browser.log`; rechecked after save-error recovery refinement; original identity/stale-write/access/history/storage checks and final page-error assertion reached. |
| Product Journey | FAIL — pre-existing/deferred | `product-journey.log`: `article()` in `product-journey.test.cjs:16` indexes `[0]` on a null source-regex match. Stops before browser launch; its final console check did **not** execute. No unrelated rewrite was made to fix it. |
| Scientific/clinical protocol calibration | NOT TESTED | Demo validity/compatibility rules are not scientific validation or a diagnosis. |
| Production auth/backend/storage concurrency | NOT IMPLEMENTED / NOT TESTED | Preserved browser-local Phase-1 boundary. |

The new browser evidence covers a brand-new canonical Individual, original Bimo/Quick Setup, partially saved questionnaire, actual storage failure/retry, completed-baseline refusal, interrupted timed restart, invalid Inhibitory Control retry, all four real baseline UIs, Starting Point, input-derived preview, commitment, atomic activation, tour skip/replay/returning Home, weekly pair before cycle end, original weekly history/reload/duplicates, week 2 and later rotation/missed states, incompatible historical version, a separate Person B, rejection of a stale activation mirror, and the upgraded Student's complete four-assessment/activation journey with unchanged Coach records. It also checks 390px guide/Lab/history, reduced motion, keyboard/Escape and the final empty error list.

Screenshots include `browser/fourth-baseline.png`, `browser/tour-390.png`, `browser/weekly-done.png` and `browser/lab-history-390.png`. `browser/report.json` retains the original Person/Attempt/Plan IDs and weekly result metadata from that isolated run.

Exact combined invocation:

```sh
node --test Client/tests/round2a-personal.test.mjs Client/tests/provider-cycle.test.mjs Client/tests/partner-store.test.mjs Client/tests/institution-cycle.test.mjs Client/tests/supervisor-cycle.test.mjs Client/tests/coach-cycle.test.mjs Client/tests/round0-identity.test.mjs Client/tests/round0-lifecycle.test.mjs
```

Browser invocation family:

```sh
BASE_URL=http://127.0.0.1:8897 SHOTS_DIR=/private/tmp/deepsprout-round2a-2kuhetwd/browser node Client/tests/round2a-browser.test.cjs
node Client/tests/provider-browser.test.cjs
node Client/tests/coach-browser.test.cjs
node Client/tests/institution-browser.test.cjs
node Client/tests/supervisor-browser.test.cjs
node Client/tests/partner-browser.test.cjs
node Client/tests/register-experience.test.cjs
node Client/tests/round0-browser.test.cjs
node Client/tests/member-journey.test.cjs
node Client/tests/page-wiring.test.cjs
```

Each browser suite used its own `SHOTS_DIR` or `REGISTER_CAPTURE_DIR` plus `BASE_URL`. Playwright `NODE_PATH` was `/Users/ahmadbanihamad/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules`; jsdom used the already available external test module path. Admin/Product suites with fixed output names used the source-preserving `run-test.cjs` output-path wrapper. It changes destinations, not assertions. Redirect metadata and batch exit codes are retained in the evidence directory.

Initial failures were investigated, not counted as passes: run objects initially shared journal-event references and tripped the stale-write guard; they now retain independent immutable event history. Timed reload needed to recognize an interruption already saved by pagehide. The invalid-task browser fixture was moved past the actual countdown before injecting early responses. Shared button styles needed to respect hidden integrity controls. jsdom needed the optional reduced-motion API fallback. The old cycle-end/practice/invalid-FR fixtures were updated to the newly required contracts without dropping checks. An incompatible-history fixture was corrected to use a relevant historical date. All affected final checks passed.

## Preservation and concurrent work

Before edits, a status and SHA-256 snapshot of **1,163** tracked/nonignored starting files was saved in `baseline-status.txt` and `baseline-hashes.json`. `preservation.json` records the final source delta separately from HEAD, which also includes prior and concurrent work.

Verified unchanged against that snapshot:

- **397** protected historical files: `DeepSprout.md`, prior audit/implementation reports and pre-existing `Client/docs/validation/**` evidence.
- All **four** files under the current personal Garden directory.
- Existing operational workspace files outside the concurrently edited Journey directory, including Provider/Coach/Institution/Supervisor commands, operational clock/store and their Round 0/1 safeguards.

Other work actively changed Journey chapters/modules, reels presentation, `Client/README.md` and `Client/hero-reels-lab.html`, and removed five starting files: `Client/assets/cinematic/event-horizon-reference.png`, `Client/src/js/reels/cinematic-math.js`, `Client/src/js/reels/event-horizon.js`, `Client/src/styles/reels/cinematic.css`, and `Client/tests/cinematic-story.test.mjs`. This agent did not edit/delete/restore those files. Their current state was left intact to avoid overwriting concurrent work. The detailed snapshot lists these external changes; they are not attributed to Round 2A or independently certified as a completed Journey/reels feature by this report.

No historical validation capture was overwritten, no actual user browser profile was cleared, and no reset/clean/stash/restore or commit was performed by this agent. Recorded regressions attest their execution snapshots while the separate concurrent work continued.

## Remaining decisions and explicit dependencies

No known blocker remains for the demonstrated Round 2A journey. Remaining decisions are the declared owner-open weekly duration/missed-window policy, task variants, formal scoring/validity calibration and the treatment of legacy measurements lacking sufficient metadata. Such history is retained but does not silently gain comparability or current-baseline validity.

- **Round 2B:** real Meaningful Practice players, independent progression and exercise/version contracts beyond the minimal Level 1 initialization.
- **Round 2C:** adaptive future-week Recovery scheduling, actual review-driven rescheduling/load changes and later-cycle behavior. The current first week and four-week direction do not claim that engine exists.
- **Round 2D:** the real Chrome extension, telemetry, protection and usage reminders. The guide/preview explicitly describe the current prototype.
- **Round 2E/separate design:** broader personal Garden source migration/reward policy and visual work. This task changes no Garden scene or rewards.

**Stop:** Round 2A only. No automatic next round or commit.
