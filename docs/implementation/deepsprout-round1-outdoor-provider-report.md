# DeepSprout Round 1 — Outdoor Provider completion

**Date:** 16 October 2026  
**Result:** PASS for the authorized Round 1 Provider-to-regular-Individual journey, within the browser-local Phase-1 demonstration. Round 2 has not started. No commit was created.

## Executive implementation summary

Newly published Provider Experiences and Camps now appear in ordinary Individual Explore and the Home Outdoor Experiences section. A regular Individual books with their canonical Person, without needing a Partner Participant workspace. My Registrations, the Provider owner, the appointed Supervisor, Insights, reports and Garden all read the original operational records.

Implementation proceeded through the requested three checkpoints: the original-record bridge first, then builder/revisions/waiting-list policy, then criteria-based completion, corrections, personal effects and accepted partnerships. The existing identity, store, command dispatcher, appointment, attendance, QR, report/export and Garden engines were reused. No second booking engine or copy into `listings.json` was introduced.

Final command verification: **65/65**, comprising the preserved 51 baseline cases and 14 Provider cases. New real-browser Provider integration: **20/20** checks, including its final console/page-error assertion. Existing role regressions passed. The previously deferred Product Journey regex failure remains a separate FAIL before browser launch.

## Gap disposition

| Gap | Round 1 status | Implemented and verified |
| --- | --- | --- |
| PROVIDER-01 | PASS | Original published inventory in regular Explore; member commands; original Booking IDs in My Registrations and both operational rosters; Home feed. |
| PROVIDER-02 | PASS | Configurable 24-hour interim default, hours/minutes compatibility, issued-expiry snapshots and demo-clock expiry. |
| PROVIDER-03 | PASS | Reused Round 0 owner/resource guards; current window, consent/version, age, capacity, offer state, identity and duplicate checks at admission/acceptance. Registration dates respect the resource timezone. |
| PROVIDER-04 | PASS | Master-ordered six-stage builder, practical structured completion policy, forms/version, cost, timezone, modes, check-in policy, staff invitation or Needs Supervisor, preview and command publication blockers. |
| PROVIDER-05 | PASS | Attributed original-ID revisions and versioned terms; intentional separate copy; reasoned lifecycle reconciliation with historical facts retained. |
| PROVIDER-06 | PASS | All-specified, minimum-session and explicit-review criteria; original completion evidence with the booked policy/version. |
| PROVIDER-07 | PASS | Source-backed Provider attendance rabbits and verified Camp birdhouse candidates; existing scene caps and four practice trees retained. |
| PROVIDER-08 | PASS | Persisted recipient/resource/booking/offer-linked local notices for booking, queue, offer transitions, cancellation, changes and completion. |
| PROVIDER-09 | PASS | Accepted-only regular Initiative links and aggregate-only Institution reports; original Provider ownership, inventory and staff grants retained. |
| PROVIDER-10 | PASS | Expired/unaccepted appointment replacement with a new token, invalid original token, preserved history and duplicate-active-assignment refusal. |
| EXPLORE-01, HOME-01, INS-01 | PASS for Provider portions; broader gaps remain outside Round 1 | Actual Provider discovery, registrations, Home opportunities and original attendance/completion history. No hero, personal plan or unrelated opportunity redesign. |
| GARD-03, GARD-04 | PASS for original Provider operational evidence; broader legacy/personal work remains outside Round 1 | Attributed correction and reward compensation history; unambiguous old operational completion mapped idempotently. Unattributed personal fixtures are not promoted into verified rewards. |
| DATA-03 | PASS for Provider portions | Demo-clock-aware offers, absolute issued expiry, timezone-aware registration/session windows and clock-controlled tests. |

These statuses close the Provider findings within the authorized scope; they do not close every domain covered by the comprehensive audit.

## Builder, ownership and lifecycle

The existing builder frame and draft persistence are retained. Its stages now follow the master sequence:

1. Experience/Camp basics and Provider ownership.
2. Audience, age, eligibility, consent, location, accessibility, safety and contact.
3. Dates, timezone, registration window, capacity and Free/Paid disclosure.
4. Session schedule, participation mode, check-in policy, Supervisor invitation and structured completion.
5. Participant conditions, cancellation disclosure/cutoff and participant form/consent version.
6. Preview, explicit publication blockers and revision reason when applicable.

Publication validates real calendar dates, ordered registration dates, IANA timezone, age bounds, finite positive Paid price/currency, capacity, distinct session IDs, session times/modes/check-in policy, form questions and structured completion rules. A Camp requires at least two sessions. Missing staff acceptance remains a visible Needs Supervisor state. Selecting a person in the builder issues an appointment on publication; it does not silently grant accepted duty.

Saving a published revision stores a private revision draft. Publishing updates the **original Experience ID**, keeps the existing Session IDs, stores previous published terms and records actor, time, version and reason. Previously booked terms remain frozen. Past/recorded session material fields cannot be silently rewritten. Changes produce notices to affected people. Unresolved bookings can explicitly acknowledge revised consent, forms, price and modes on their original Booking ID; previous terms and acknowledgement data remain in history.

A separate, clearly labelled copy operation intentionally creates new resource/session IDs. Cancellation and archival require reasons. Closing requires a submitted Supervisor report. Terminal transitions cancel unresolved bookings/holds, end staff appointments, archive cohorts and notify participants while preserving original attendance, evaluations, completion records, reports and completed participation.

## Regular Individual integration

`provider-selectors.js` projects public Provider data and each Individual's own bookings from the canonical ecosystem graph. Public inventory is limited to approved Providers and published/active, unexpired resources. Closed windows present unavailable booking states. Shared commands independently enforce the guards; hiding a card is not the authority boundary.

Cards/details expose actual Provider identity, city, venue/address, dates/timezone, type, capacity, mode, price, safety, consent, completion and cancellation disclosures. There is no city-based eligibility restriction. Search and ordinary filters include the original Provider inventory.

Booking validates current eligibility, explicit consent, window, participant form answers, mode and simulated price acknowledgement. The booking holds original terms and form/version evidence. Free and Paid are disclosed separately; Paid is an acknowledgement simulation with no charge or refund transaction.

My Registrations and the detail sheet retain original Booking/Offer IDs and statuses after reload. Eligible confirmed in-person sessions render a real QR encoding the booking credential plus original Session ID; typed booking code is the fallback. A QR from another session is refused. Closed/suspended/expired resources do not present an active attendance credential. Receiving a booking or QR grants no reward.

The Home integration is a small live Outdoor Experiences section using the same selector and original resource link. The hero and cinematic journey were not rebuilt.

## Waiting list and notifications

The existing queue/offer engine remains authoritative. Legacy display statuses are retained for compatibility; explicit queue state/history expresses `Queued → Offered → Accepted / Declined / Expired`, with cancellation also retained. Active holds consume capacity alongside confirmed/checked-in/completed bookings. Acceptance consumes the original hold once and issues the original booking's credential. Decline, expiry and cancellation release the seat and offer the next currently eligible queued booking.

The interim default is **24 hours**. Admin configures the global default in hours; a Provider configures future offers for its own resource. The existing minute-based command input remains unit-correct. The prototype's editable range is one minute to seven days, not a declaration of permanent product policy. Issued offers snapshot duration and absolute expiry; changing defaults does not rewrite existing expiry.

Clock advancement and read/command reconciliation drive deterministic expiry. The Provider demo control advances to an offer's expiry rather than forcing an arbitrary status. Remaining time survives reload. Stale, processed, foreign, suspended, closed-window, invalid-consent and over-capacity acceptance is refused.

Notices are persisted for the original recipient, resource and participation record, with an authorized regular-Individual or Partner destination. Confirmation, queue entry, offer/reoffer, acceptance, decline, expiry, cancellation, significant revision and completion outcomes are covered. These are local notices; no email/SMS delivery is claimed.

## Attendance, completion and personal effects

The existing Provider Supervisor desk and appointment authorization are preserved. Both regular Individuals and Partner Participants enter its same roster. Typed/session-QR check-in, reasoned manual Present/Late, online verification, Absent/Not Recorded, window enforcement, closure, duplicate denial and corrections use the existing shared attendance commands. Online verification requires recorded evidence. Revoked appointments immediately lose mutation authority. Owner and Supervisor see the same Booking ID.

Each qualifying completion session requires **both** a Present/Late attendance fact and an authorized Completed session evaluation. Supported published rules are:

- All specified required Session IDs.
- A configured minimum number of qualifying sessions.
- Explicit authorized review, including declared conditions that cannot safely be inferred from records.

A minimum-one Camp and an all-two Camp produce different results after one qualifying session. Declared conditions remain Needs Review until an authorized decision records actor, date, reason and the exact evidence fingerprint. Free text is never parsed into executable rules; an accepted excuse does not become attendance or an automatic waiver. A Supervisor needs appointment scope over every relevant Camp session for an overall manual decision.

`providerCompletions` holds an original Completion ID, Booking/Experience/Person IDs, booked resource version, structured rule snapshot, policy version, qualifying Session IDs and Attendance/Evaluation IDs. Session re-evaluation retains the Evaluation ID and history. Repeated identical evaluation does not duplicate completion or rewards.

Personal Garden consumes shared selectors without a scene redesign: verified Provider Present/Late facts supply rabbit candidates; verified Camp completion supplies a birdhouse candidate. Existing rendering limits remain **up to three rabbits, one birdhouse and four practice trees**. Provider attendance does not grow a practice tree and there is no Provider Group Garden.

Corrections keep the original Attendance ID and add actor/date/reason/before/after, including policy-labelled Garden eligibility. A correction that invalidates qualifying attendance marks its dependent evaluation for review and recomputes completion. The original reward row is marked Revoked with compensation history rather than deleted. Restoring verified participation and re-evaluating reactivates that same reward. Browser and command evidence verify consistent Garden, Insights and reporting projections.

Regular Insights adds original Provider booking, attendance and completion history, source IDs and the applicable criteria version. My Registrations remains available across revision and reload. Existing personal-journal data and unrelated practice progression were not refactored.

## Reports and partnerships

Provider reports/CSV use the original booking cohort selected by registration date. Confirmed, held and queued counts are distinct. Present, Late, Absent and Not Recorded are separate session counts. The denominator is eligible bookings × scoped sessions. Completion counts come from completion evidence, rather than inferring Camp completion from attendance or counting session evaluations as Camps. Original Completion IDs and Supervisor closing reports are visible. Supervisor reports preserve session/cohort scope. Existing CSV download is retained and browser-tested.

A partnership must be accepted before linking. Requests preserve purpose/proposal metadata and explicitly limit Phase-1 sharing to aggregate attendance/completion. Only the Provider's eligible published resource can be linked. Pending, declined and ended links do not become regular public Initiative opportunities.

Accepted links in regular Initiative detail/My Initiatives open the original Provider resource and booking path. The actual Institution Representative Reports page exposes agreed aggregates for the **entire linked Provider experience**, clearly separate from that Initiative's own student records. It exposes no Provider booking identities or credentials. Linked resources are deduplicated in those aggregate rows and do not contribute a second Initiative Garden reward.

Linking/unlinking does not copy inventory, change Provider ownership, create a booking or confer Provider Supervisor grants. Partnership history records the actor and original linked Experience ID, including replacement/end transitions. Unlinking leaves historical Provider participation unchanged.

## Migration and preservation

The existing operational schema/migrations remain in place. An additive Provider data marker normalizes legacy defaults/rules/forms/check-in settings. Before normalizing a persisted legacy graph, the untouched raw graph is saved once under `deepsprout-ecosystem-demo-v1:backup:provider-v1`. Backup failure blocks migration. Repeat reads are idempotent.

Legacy Completed Provider bookings receive a completion record only when original qualifying attendance and completed evaluations establish an unambiguous all-session outcome. Ambiguous duplicate participation or missing evidence stays unclaimed; no attendance or rule is invented from prose. Existing non-default legacy minute configuration is converted to hours; the former 15-minute default becomes 24 hours with its old value retained in migration metadata and backup.

A starting working-tree status and SHA-256 snapshot were captured before Round 1. The final preservation check confirms no starting file was removed. `DeepSprout.md`, the Round 0 report, comprehensive audit, previous implementation reports and existing `Client/docs/validation/**` evidence retain their starting hashes.

The working tree already contained substantial uncommitted work. In addition, Garden presentation edits occurred elsewhere during this run in `garden.html`, `garden.css` and `garden.js`. Later concurrent changes also appeared in `Client/src/workspaces/navigation.js`, `Client/workspaces.html` and new `Client/src/workspaces/journey/` files. These were preserved and are excluded from this implementation's authored file list. The recorded regressions describe their execution snapshots; the separate concurrent Journey feature is not claimed as independently verified by this Round 1 report. Round 1 integrates through the existing Garden selector; it did not redesign or replace that scene. No reset, cleanup of unrelated work or auto-commit was performed.

## Exact files authored or changed for Round 1

New files:

- `Client/src/shared/provider-selectors.js`
- `Client/src/workspaces/provider-rules.js`
- `Client/src/workspaces/provider-completion.js`
- `Client/tests/provider-cycle.test.mjs`
- `Client/tests/provider-browser.test.cjs`
- `docs/implementation/deepsprout-round1-outdoor-provider-report.md`

Existing files changed relative to the starting working tree:

- `Client/index.html`
- `Client/src/pages/public/home/home.js`
- `Client/src/pages/member/explore/explore.js`
- `Client/src/pages/member/explore/explore.css`
- `Client/src/pages/member/insights/insights.js`
- `Client/src/shared/selectors.js`
- `Client/src/workspaces/builders/experience.js`
- `Client/src/workspaces/commands/outdoor.js`
- `Client/src/workspaces/commands/institution.js`
- `Client/src/workspaces/commands/platform.js`
- `Client/src/workspaces/data/platform.js`
- `Client/src/workspaces/domain.js`
- `Client/src/workspaces/initiative-rules.js`
- `Client/src/workspaces/store.js`
- `Client/src/workspaces/shared.js`
- `Client/src/workspaces/pages/provider.js`
- `Client/src/workspaces/pages/admin.js`
- `Client/src/workspaces/pages/organization.js`
- `Client/src/workspaces/pages/institution/supervisor-context.js`
- `Client/src/workspaces/pages/institution/reports.js`
- `Client/tests/partner-browser.test.cjs`
- `Client/tests/supervisor-browser.test.cjs`

The Partner test's Provider builder actions now follow the approved stage order; the existing route/workflow assertions remain. The Supervisor report assertion now sums the separate Present/Late columns and additionally verifies their partition. Neither suite skips a failed workflow to obtain its final count.

## Tests and evidence

All browser runs used fresh, isolated contexts, the local Python preview at `http://127.0.0.1:8897`, headless installed Chrome and the available Playwright runtime. Demo clock controls were used instead of waiting for offer expiry. Outputs went to `/private/tmp/deepsprout-round1-ecwcf7l9/`, not historical validation paths.

| Check | Result | Evidence / final error check |
| --- | --- | --- |
| Slice 1A bridge checkpoint | PASS | New shared-record command case and 6 browser checks before expanding; `1A-browser.log`. |
| Slice 1B checkpoint | PASS | 58 command cases, 10 browser checks; `1B-commands.log`, `1B-browser.log`. |
| Slice 1C checkpoint | PASS | 64 command cases and 18 browser checks before final additions; `1C-commands.log`, `1C-browser.log`. |
| Final combined commands | PASS, 65/65 | `commands-final.log`; original 51 plus 14 Provider cases, no skipped tests. |
| New Provider browser | PASS, 20/20 | `provider-final.log`, `provider/report.json`; final console/page-error assertion executed with zero errors. |
| Independent Coach browser | PASS, 38/38 | `coach-browser.log`; final console/page-error check executed. |
| Institution browser | PASS, 25 checks | `institution-browser.log`; final console/page-error check executed. |
| Supervisor browser | PASS, 18 checks | `supervisor-browser.log`; final console/page-error check executed after report-column assertion adaptation. |
| Partner browser | PASS, 100 routes / 7 workflows / 8 additional checks | `partner-browser.log`, `partner/report.json`; completed flag true, final error check executed, zero errors. |
| Member journey | PASS, 14 checks | `member-journey.log`; jsdom suite (not a browser-console suite). Its existing jsdom navigation diagnostic does not fail the assertions. |
| Page wiring | PASS, 14 pages | `node Client/tests/page-wiring.test.cjs`. |
| Registration experience | PASS | `register-experience.log`, `registration/report.json`; final page-error assertion executed, zero errors. |
| Admin dashboard | PASS | `admin-dashboard.log`; data definitions, year boundaries, filters, routes, dialogs, persistence, responsive widths and empty states. |
| Admin/member integration | PASS | `admin-member-integration.log`; financial boundaries, shared pricing/content/profile/reporting and desktop/mobile paths; final JS/asset-error checks executed. |
| Round 0 browser | PASS | `round0-browser.log`; canonical identity, stale writes, limited routes/upgrade, saved history and failure handling; final page-error check executed. |
| Product Journey | FAIL — pre-existing, deferred | `product-journey.log`: `product-journey.test.cjs:16`, article regex returns null and `[0]` throws. Stops before browser launch; final console check **did not execute**. No unrelated hero edit was made. |
| Source syntax and whitespace | PASS | Changed JavaScript syntax checks, `git diff --check`. |
| Preservation | PASS with concurrent Garden/Journey edits distinguished above | `preservation.json`; protected historical files/evidence unchanged, no starting files removed. |

Admin/Product tests with fixed output locations were executed through `run-test.cjs`, which recompiles their original source with output path literals redirected. Its redirect records are retained beside the logs; assertions are unchanged. Other suites use `SHOTS_DIR` or `REGISTER_CAPTURE_DIR` where supported.

The combined command invocation is:

```sh
node --test Client/tests/provider-cycle.test.mjs Client/tests/partner-store.test.mjs Client/tests/institution-cycle.test.mjs Client/tests/supervisor-cycle.test.mjs Client/tests/coach-cycle.test.mjs Client/tests/round0-identity.test.mjs Client/tests/round0-lifecycle.test.mjs
```

The new browser invocation uses `BASE_URL=http://127.0.0.1:8897`, the runtime's Playwright module directory in `NODE_PATH`, and `SHOTS_DIR=/private/tmp/deepsprout-round1-ecwcf7l9/provider` with `node Client/tests/provider-browser.test.cjs`.

The Provider browser evidence includes the original unique Camp, both Session IDs, initial and final accepted Booking/Person IDs, Provider owner, Attendance ID, Completion ID and Reward ID in `provider/report.json`. Screenshots and the actual CSV are in the same directory. The journey covers application/approval, draft/private versus published inventory, regular booking/reload, original rosters, capacity-one queue, decline/accept/clock expiry/reoffer, stale/duplicate denial, revision snapshots, expired appointment replacement, typed QR, manual Late/closeout, completion/repeated evaluation, reports/notices, Insights/Garden, correction/restoration, minimum-one online/manual-review Camp, accepted partnership/unlink, suspended-resource/owner denial, revoked staff/foreign booking denial and 390px/reduced-motion/keyboard states. Actual camera hardware scanning was **NOT TESTED**; session QR rendering and typed/pasted payload verification were tested.

## Phase-1 limits and remaining policy choices

- This is browser-local storage and simulated identity/payment/notification delivery. It is not production authentication, payment processing, backend authorization, secure credentials or cross-device concurrency.
- Offer expiration reconciles on read/commands; no server background job or external delivery service exists.
- The 24-hour hold and editable prototype bounds remain interim configuration. Final commercial, refund, hold-duration and waiver policy needs product approval; no automatic waiver was invented.
- Existing terminal-resource evaluation views remain historical/read-only. Authorized factual attendance corrections retain evidence and recompute current eligibility; they do not silently rewrite old evaluation outcomes or invent new approvals.
- Unattributed legacy personal-journal fixtures are retained, not converted into verified Provider operational evidence. Their broader migration belongs to the separate personal-data scope.
- No Provider-specific blocker remains for the demonstrated Round 1 journey. Camera hardware and production infrastructure remain untested/outside this phase, not claimed as passing functionality.

## Prerequisites for Round 2

Retain this verified shared-record contract and preservation baseline. Agree the personal activity/version and valid historical-source contracts, unresolved waiver/refund policies, and the separate weekly Lab/Adaptive Recovery requirements before personal-cycle work. Preserve the Round 0 identity/storage safeguards and keep unrelated design work isolated.

**Stop point:** Round 1 implementation and regression verification only. No Round 2 implementation, production backend or auto-commit.
