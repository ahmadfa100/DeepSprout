# DeepSprout Round 2B — Meaningful Practices and independent progression

**Implementation and recorded verification:** 16 October 2026. **Report finalized:** 17 October 2026. **Scope:** Round 2B only, browser-local Phase 1. No commit was created. Final verification results are recorded below.

## Result and findings

Four distinct players replace the generic timer completion path. Original content, responses, conditions, validation policy and evidence classification are retained in the canonical Person journal. Each type has its own explicit level decision. Optional starts and repeated reward sources are bounded; scheduled Recovery practice remains accessible.

| Finding | Result within this round |
| --- | --- |
| ACT-01 | Closed for the local demonstration: actual reading/questions, original local audio/recall, concrete artifact-description challenges, and intention/timer/outcome work sessions. A timer alone cannot create measured success. |
| ACT-02 | Closed under provisional defaults: independent levels, distinct content and separate-day eligibility, scored thresholds where applicable, explicit Next/Stay/Down, original levels/history, bounded optional/repeat eligibility. Thresholds are calibration choices. |
| ACT-03 | Closed at current publication/execution seams: deprecated content cannot be newly published as core practice; removed category is no longer offered; old timer routes do not execute. Historical records remain stored; Recovery Weekly Review is unchanged. |
| COACH-02 | Closed for new assignments and newly published Programs: approved stable catalog ID, definition/content version and snapshot, plus original task instructions in submissions. Historical assignments lacking recorded versions are explicitly labelled; no invented retrospective snapshot. |
| GARD-02 | Closed for personal practice sources: original Attempt ID deduplication, version/policy references, repeat eligibility and attributed withdrawal. No Garden scene change. |
| ADMIN-04 | Partial by scope: existing informational-guide publication remains working and now records versions; executable content and Coach references have version contracts. The two Admin implementations are not merged. |
| GARD-03/04/05 and later personal work | Remain outside this round except the new personal-source correction contract. No broader historical migration, operational reward reversal rewrite, visual integration or new Group Garden destination was attempted. |

These are demonstration outcomes, not clinical validation or production security guarantees.

## Reused modules and authority

Reused `DeepSproutAccount` and its existing atomic, stale-write-protected Person journal; Round 0 access/upgrade guards; Round 2A baseline/activation/clock and four introductory Level 1 events; the existing Activities page, native dialog, assigned-task renderer and offline-routine module; the shared Coach assignment/submission/review commands in both contexts; existing Admin guide publication; and existing four-tree Garden selectors/renderers.

Formal Lab assessments, weekly Lab policy, Quick Setup, product guide, Recovery scheduling, Provider commands, Institution membership/attendance and Group Garden rules were preserved. Personal practice never submits or approves a Coach assignment. Assigned work still requires the original shared submission/review engine. A matching personal practice is clearly a separate destination.

## 2B-1 — Content and version contracts

`Client/src/data/practices.json` contains **36 definitions: four families × three levels × three examples**. Definitions have stable IDs, canonical type, Published status, definition and content version, level, goal tags, duration estimate, instructions and actual content, response/validation method, accessibility modes, repeat policy and reward policy version. Listening additionally has local media path, audio version and actual WAV duration.

IDs follow `practice-<type>-l<level>-<a|b|c>`. The text/content version is separate from the definition version. Examples within a type/level are distinct. Higher reading/listening tiers add qualification/inference content and questions; practical tiers add constraints and approach comparison; work tiers extend the session. These are small demonstration tiers, not calibrated cognitive difficulty scales. Related Depth and Listening examples intentionally reuse the three original story topics; they are practice material, not formal reassessment instruments or independent scientific measurements.

Starting an attempt clones its complete definition and current policy. Submission scores against that **original snapshot**, not the latest catalog. Reload, a catalog edit, a later level decision or a later review cannot silently replace its passage, questions, intention or conditions.

`activity-contract.js` supplies a minimal shared adapter for approved Coach catalog references, preserving existing `activity-0` through `activity-3` IDs and display-title compatibility. New assignments resolve and store ID/version/content reference and a definition snapshot. New Program publication pins its activity references; later groups/stages use those references after catalog edits. Revision drafts select their own publication references. Task-specific instructions remain separate and are captured with each submitted version and resubmission history. Legacy versions are labelled unknown rather than reconstructed from today's catalog.

Legacy Admin resources remain **informational guides**, not executable players. Editing retains previous guide details and increments the version; publication stamps a guide content version. Stillness, Intentional Pause, Quiet Break, Just Be, Pause & Notice, Ink Room, standalone reflection/review variants and similar named deprecated items are refused at publication or excluded from current member guide delivery. Original old records remain inspectable in Admin/history. Approved guide publication, member display and archive still pass the original integration suite.

### Audio provenance and validation

Nine WAV files under `Client/assets/practices/` were generated locally from the exact original Listening passages with macOS `say`, Samantha, 165 words/minute, and `afconvert` to mono 22.05 kHz/16-bit PCM. No third-party media was fetched. `PROVENANCE.md` records the origin and outstanding production voice-distribution review.

The first sandboxed synthesis returned empty WAV containers despite a zero exit status. Asset checks caught this; local speech synthesis was rerun with approved execution permissions. Final validation confirms **nine nonempty PCM files**, nonzero waveform RMS and durations approximately **24.01–43.39 seconds**, not silent placeholder assets. Real Chrome playback reaches `ended` and recall submission follows. Physical speaker/headphone output and human narration-quality review were **not tested**.

## 2B-2 — Four players and truthful outcomes

| Player | Actual flow | Evidence and limitation |
| --- | --- | --- |
| Depth Practice | Read an original passage at the current tier, answer all 4/5/6 questions, submit and receive the actual correct fraction. Passage remains available, as stated in instructions. | System-scored comprehension. Low scores are retained truthfully; no timer creates a score or implies recovery. |
| Listening & Recall | Native local audio controls, one original-speed playback, pause allowed, no seeking/replay within a run, then main-idea/detail/relationship questions. An interrupted/reloaded partial playback requires a separate attempt. | System-scored recall plus observed in-app playback. The app cannot verify that the audio was audible or attended to. Transcript mode explicitly changes conditions and is labelled system-scored transcript recall, never verified audio recall. |
| Practical Micro-Challenge | Ordered next steps and first action; categorize a small space and make an item findable; or write/test/revise usable instructions. Capture the requested artifact description and actual outcome. | Explicit self-reported challenge evidence. Text length/required-field checks are completeness checks, not performance verification or Coach approval. |
| Protected Work | Enter a real intention, start the local session, pause/resume, finish the expected 2/3/4-minute tier and record the actual outcome with explicit self-report confirmation. | Observed in-app duration plus self-reported outcome. No website blocking, external usage observation or task-quality verification is claimed. Early submission is Invalid and earns no source. |

All players use native controls, visible focus, persistent labels, inline error feedback, mobile layouts and reduced-motion handling. The dialog supports keyboard dismissal and draft continuation. The 390 px viewport was inspected from a readable viewport screenshot, in addition to browser geometry checks. No new visual direction, Bimo replacement or Garden asset was introduced.

## Attempt lifecycle, failure and history

New runs retain unique Attempt ID, original Person, activity ID/version/content/audio version, original level, full definition snapshot, policy and validation version, scheduled-action reference where applicable, accessibility mode, original intention/responses, timestamps and explicit transitions.

`Started → Paused/resumed` applies to work; Depth/Practical drafts retain answers/evidence; `Interrupted` preserves abandoned runs; submission records `Submitted → Completed | Invalid` atomically. A retry creates a separate Attempt ID. Complete answer sets and required artifacts/outcomes are checked in the model. Missing evidence is refused without false completion. Completed low scored outcomes remain visible rather than being converted to invented improvement. Timer-only calls through the old `attempt.add` command are recorded Invalid and ineligible.

Drafts and results use the existing journal. A failed quota/storage write leaves the original in-memory and persisted run uncompleted; restoring storage allows the same submission to retry. Stale tabs/changed identity fail through the existing authority checks. Refresh and double submission cannot duplicate a completed attempt or eligible effect. New-page crash recovery discards unobserved timer gaps; hidden-page time is paused, and observed ticks are conservatively bounded. Listening records playback progress, refuses seeking and does not combine interrupted runs.

Activities History exposes completed, invalid, interrupted and unfinished attempts; original content, questions, responses, intention, outcome, evidence class and versions remain inspectable after reload. Attributed eligibility corrections are shown without deleting the original result. Coach review history stays in Assigned and is not replaced with personal practice scoring.

## 2B-3 — Independent progression and configurable defaults

| Default | Meaning |
| --- | --- |
| 3 supported levels per type | Bound by currently supplied content; four independent starting Level 1 events remain compatible. Existing historical levels are not rewritten. |
| 3 distinct eligible content IDs | Default advancement threshold; local calibration permits 2–3 while the independent minimum-day rule still applies. A version bump of the same content ID is not distinct content. |
| At least 3 separate days | A two-day streak alone cannot qualify; locally configurable 3–30. |
| At least 75% correct where scored | Configurable 0.75–1. Completed low scores do not advance a level. Subjective work has no fabricated score. |
| 2 optional starts per personal day | Across all four families; configurable 1–8. Interrupted optional starts still consume load. Tests temporarily use six to exercise all four players in one fixture. |
| 7-day content reward cooldown | Configurable 7–90 days. Same content ID cannot earn growth indefinitely through version edits or resaves. |

`configurePractices` is a guarded local demo setting, not a payment or entitlement gate. Each run snapshots the policy and historical content/level. `Try Next Level` requires eligibility and explicit acceptance; it changes only that type. `Stay Here` records the choice without resetting eligibility. `Step Down` is allowed above Level 1, records a reversible decision and keeps all earlier attempts. New difficulty decisions exclude prior attempt IDs from a new advancement period; staying does not impose that reset. No automatic cross-type change or streak-based increase exists.

A real uncompleted Recovery-scheduled practice bypasses optional-start/repeat access restrictions. An already rewarded repeated content ID still gives **no new growth** inside its cooldown, even when core completion remains allowed. This separates essential access from optional reward eligibility. For You and optional suggestions follow the Person goal, current level and eligibility; scheduled work opens the appropriate type. There is no requirement to do all four every day and no payment check.

## Garden source integrity

Only valid, eligible current practice sources contribute once to their corresponding existing tree. Projection deduplicates original Attempt IDs, including legacy repeated IDs, and retains activity/content/policy references and the actual evidence label. Invalid, interrupted, timer-only and cooldown-ineligible runs add no source. Re-saving/reloading/reviewing cannot produce another personal effect.

`practice.correct` records the original Attempt ID, actor, reason, timestamp, policy and withdrawal decision. Projection withdraws eligibility without deleting or altering original evidence. Corrections are surfaced in History. Historical pre-version practice evidence remains explicitly legacy; this round does not fabricate a retrospective current protocol or perform the broader historical migration.

Exactly four tree projections remain. Garden HTML/CSS/JS and assets were not edited. Provider rabbit/birdhouse, eligible routine flowers and Institution/Coach Group Gardens retain their original commands/selectors. No fifth tree, new region or new decoration rule was introduced.

## Verification

Evidence is isolated under `/private/tmp/deepsprout-round2b-wv9lq4_m/`; no tracked historical capture was overwritten. Browser suites use fresh contexts, local preview `http://127.0.0.1:8897`, system Chrome and bounded waits. The Round 2B fixture uses protocol-shaped formal baseline records through the original assessment API, then exercises real practice UI and actual local media. Formal instruments were independently exercised by the existing Round 2A browser regression. New Coach version checks use original commands for assignment creation, catalog edit, submission, approval and upgrade.

Checkpoint verification included the existing 22 assessment/Coach model checks, then the new content/player cases, then the complete 12-case practice suite and required regressions. Early checks caught empty audio and test-fixture navigation/session/cooldown mistakes; these were corrected without weakening original regression assertions or bypassing repeat policy.

### Commands and results

```sh
node --test Client/tests/round2b-practices.test.mjs
# 12/12
node --test Client/tests/round2b-practices.test.mjs Client/tests/round2a-personal.test.mjs Client/tests/provider-cycle.test.mjs Client/tests/partner-store.test.mjs Client/tests/institution-cycle.test.mjs Client/tests/supervisor-cycle.test.mjs Client/tests/coach-cycle.test.mjs Client/tests/round0-identity.test.mjs Client/tests/round0-lifecycle.test.mjs
# 89/89: previous 77 plus 12 new cases
node Client/tests/page-wiring.test.cjs
# 14 pages pass; original assertions unchanged
```

Browser environment:

```sh
export BASE_URL=http://127.0.0.1:8897
export CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
export NODE_PATH=/Users/ahmadbanihamad/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules
SHOTS_DIR=/private/tmp/deepsprout-round2b-wv9lq4_m/final-acceptance node Client/tests/round2b-browser.test.cjs
```

| Suite / invocation | Final result |
| --- | --- |
| New `round2b-browser.test.cjs` | **17/17 grouped checks**, including actual audio playback, interruption/retry, real Coach version/review commands, deprecated publication refusal and final console/page-error assertion. `final-acceptance/report.json`: errors `[]`. |
| `round2a-browser.test.cjs` | 16 grouped checks passed; real formal baseline tasks, weekly Lab, identity/upgrade and final error assertion preserved. |
| `provider-browser.test.cjs` | 20/20 passed. |
| `coach-browser.test.cjs` | 38/38 passed, including both Coach contexts, review/revision/approval, upgrade and final console check. |
| `institution-browser.test.cjs` | 25/25 reported checks passed, including final console assertion. |
| `supervisor-browser.test.cjs` | 18/18 reported checks passed, including final console assertion. |
| `partner-browser.test.cjs` | 100 route records, 7 walkthroughs and 8 checks; completed true, errors `[]`. |
| `register-experience.test.cjs` | Passed; final errors `[]`. |
| `admin-dashboard.test.cjs` | Passed; source-preserving output-path wrapper only. |
| `admin-member-integration.test.cjs` | Passed; approved guide publish/archive still reaches Activities, all original checks, no JS/asset errors. Output-path wrapper only. |
| `round0-browser.test.cjs` | Passed; final page-error check reached. |
| `product-journey.test.cjs` | **Known pre-existing failure**, unchanged: article regex returns null at line 16, called at line 18, before browser launch. Its final browser console assertion was **not executed**. No unrelated Journey fix attempted. |

Each named existing browser suite ran as `node Client/tests/<name>.test.cjs` with its own `SHOTS_DIR`; the two Admin suites and Product Journey used `/private/tmp/deepsprout-round2b-wv9lq4_m/run-test.cjs <name>` solely to redirect hardcoded capture paths. `regression-results.json` contains the actual exit codes. No existing assertion was removed or bypassed.

Actual new captures: `final-acceptance/depth-completed.png`, `garden-preserved.png`, `mobile-practical.png` (390 × 844 viewport), and `mobile-history.png`. `audio-validation.json` records each final WAV duration/sample rate/RMS; `commands-final.log`, `focused-final.log`, `wiring.log` and per-suite logs retain test output. Earlier failed exploratory runs remain separate scratch evidence; final acceptance is the 17-check `final-acceptance` run.

The member jsdom journey also passes **14/14** with the existing external jsdom module directory; its expected diagnostic about navigation to another Document is not a test failure. `node --check` passes all 11 changed/new JavaScript test/runtime files checked; `git diff --check` passes. Original tests were not edited, removed, skipped or weakened for this round.

## Exact files changed or added by this round

Modified:

- `Client/src/js/data/account.js`
- `Client/src/admin/core.js`
- `Client/src/admin/store.js`
- `Client/src/shared/selectors.js`
- `Client/src/workspaces/models.d.ts`
- `Client/src/workspaces/commands/mentorship.js`
- `Client/src/workspaces/commands/platform.js`
- `Client/src/pages/member/training/training.html`
- `Client/src/pages/member/training/training.css`
- `Client/src/pages/member/training/training.js`
- `Client/src/pages/member/training/assigned.js`

Added:

- `Client/src/data/practices.json`
- `Client/src/workspaces/activity-contract.js`
- `Client/tests/round2b-practices.test.mjs`
- `Client/tests/round2b-browser.test.cjs`
- `Client/assets/practices/PROVENANCE.md`
- `Client/assets/practices/practice-listening-l1-a.wav`
- `Client/assets/practices/practice-listening-l1-b.wav`
- `Client/assets/practices/practice-listening-l1-c.wav`
- `Client/assets/practices/practice-listening-l2-a.wav`
- `Client/assets/practices/practice-listening-l2-b.wav`
- `Client/assets/practices/practice-listening-l2-c.wav`
- `Client/assets/practices/practice-listening-l3-a.wav`
- `Client/assets/practices/practice-listening-l3-b.wav`
- `Client/assets/practices/practice-listening-l3-c.wav`
- `docs/implementation/deepsprout-round2b-meaningful-practices-report.md`

## Preservation and remaining limitations

A fresh file-hash and Git-status baseline was captured before Round 2B. Final `preservation-final.json` shows **402 protected existing master/audit/implementation/validation/Garden files byte-for-byte unchanged** and **no starting file removed by this round**. The prior Round 2A report and evidence remain unchanged. The Garden directory's four existing files are unchanged; its browser capture verifies the existing scene still renders.

Eleven existing files were changed by this round, and fifteen files were added, including this report and the nine WAVs. The final comparison separately attributes concurrent changes to unrelated Reels/Lines code, styling and tests, plus new Black Hole tests/media captures and Vortex captures. The exact lists are in `preservation-final.json`; none are included in the Round 2B file list above. Concurrent modified existing files observed at finalization were:

- `Client/README.md`
- `Client/hero-reels-lab.html`
- `Client/tests/reels-pacing.test.cjs`
- `Client/tests/vortex-clarity.test.cjs`
- `Client/tests/way-back.test.cjs`
- `Client/tests/reels-experience.test.cjs`
- `Client/tests/reels-lifecycle.test.cjs`
- `Client/src/js/reels/collapse.js`
- `Client/src/js/reels/experience.js`
- `Client/src/js/reels/vortex.js`
- `Client/src/js/reels/shaders.js`
- `Client/src/js/reels/story-math.js`
- `Client/src/js/lines/field.js`
- `Client/src/js/lines/path.js`
- `Client/src/styles/reels/reels.css`
- `Client/src/styles/lines/path.css`
- `Client/src/styles/lines/lines.css`

Existing Journey/Reels/README changes and the five removals already present at the starting Git status were left in place. In particular, this agent did not restore/delete/replace `Client/assets/cinematic/event-horizon-reference.png`, `Client/src/js/reels/cinematic-math.js`, `Client/src/js/reels/event-horizon.js`, `Client/src/styles/reels/cinematic.css` or `Client/tests/cinematic-story.test.mjs`. New captures from concurrent work are not this round's validation evidence; pre-existing protected evidence remains unchanged at this snapshot.

No reset, clean, stash, restore, branch change or commit was performed. Regressions certify their recorded execution snapshots while concurrent unrelated work remains outside this task.

Practice correctness/scoring is local and inspectable; no authenticated backend or tamper-resistant browser evidence is claimed. Self-report can be incomplete or untruthful and is labelled accordingly. Local timers and playback prove only in-app observation, not attention, task quality, audible output, screen-reader compatibility or blocked websites. Narration pronunciation/voice-distribution review and assistive-device testing remain unverified. The content set is intentionally small; thresholds, repetition/load bounds and difficulty calibration need product validation before production.

Legacy assignment/catalog/attempt versions that were never recorded cannot be recovered reliably. Their original stored instructions/results remain; they are labelled legacy rather than silently upgraded. Broader Admin consolidation and historical Garden migration remain open.

- **Round 2C:** adaptive future-week Recovery scheduling, review-driven adaptations and later cycles. Existing first-week schedule is preserved.
- **Round 2D:** real Digital Shield extension, site blocking and supported-browser telemetry. Protected Work makes no extension claim.
- **Round 2E:** broader Garden historical-source migration and cross-page/visual integration. The existing scene remains unchanged.

**Stop:** Round 2B only. No automatic next round or commit.
