# DeepSprout Round 2D — Real Digital Shield extension

**Date:** 17 October 2026. **Result:** implemented and verified for the browser-local Chrome demonstration described below. Exactly two capabilities: **Manual Website Protection** and **Shared Website Usage Reminder**. Round 2E was not started. No commit was created.

## 1. Executive result

A genuine Manifest V3 extension now applies native selected-domain navigation rules, removes them at expiry, observes eligible selected-site activity, and opens its own soft reminder while DeepSprout is closed. The regular Individual pairs through an actual extension popup, receives verified status, and accepts snapshots into the existing canonical Person journal before acknowledging synchronization.

Final verification: **117/117 model/command cases**, including all 104 prior cases and 13 new Shield cases; **22/22 real extension/browser checks**. All required existing personal and partner regressions passed. The separately deferred Product Journey source-regex failure remains unchanged and occurs before its browser launches.

These results establish the scoped technical behavior in Chrome for Testing on macOS. Physical OS lock/idle transitions, other operating systems, mobile apps, incognito, Safari/Firefox execution, Web Store distribution and production authentication were not verified or claimed.

## 2. Findings and authority

| Finding | Result |
| --- | --- |
| SHIELD-01 | Closed for the scoped local Chrome implementation: MV3 source, real pairing, native blocking/expiry, observed aggregate threshold, independent reminder tab and truthful control states. The old page countdown is no longer presented as enforcement. |
| SHIELD-02 | Closed in Shield, Digital Usage in Insights, Recovery evidence and the small Home Shield summary. Those surfaces consume actual accepted browser observations; seed telemetry does not become live extension evidence. Missing observations say **No browser usage data available.** |

References used: `DeepSprout.md` v4.0 §§5.8, 6, 7, 10, 22–26; the comprehensive audit's SHIELD-01/02 and privacy findings; the existing Round 0 identity boundary and Round 2A/2B/2C reports; `AGENTS.md`, `DESIGN.md` and its linked design guidance. Master, audit and previous implementation reports remain unchanged. No CodeGraph directory was present.

Historical seeded usage accessors remain readable for older fixture consumers, and legacy Admin already labels its preview as sample extension data. They are excluded from the new real-evidence projection. This round does not perform the broader historical reconciliation assigned to Round 2E.

## 3. Extension architecture and manifest

Source directory: `Client/extensions/digital-shield/`. Manifest version **3**, extension version **0.1.0**, minimum Chrome **120**. A module service worker owns serialized state changes, rules, expiry, observations and message validation. Static isolated-world scripts provide the local member bridge and supported-site observation heartbeat. Popup and reminder pages contain only bundled local code; no eval, external runtime listener, remote executable code or backend was added.

Permissions are exactly:

- `storage`: local Person-bound configuration, aggregate periods, history and acknowledgements.
- `declarativeNetRequest`: actual selected-domain document blocking.
- `alarms`: expiry reconciliation when the service worker wakes.
- `idle`: Chrome-reported active/idle/locked context, using a 15-second detector.

Host permissions cover only Instagram, YouTube and TikTok and their subdomains. Member content-script matches cover the local member routes. Chrome match patterns cannot restrict ports, so both relay and worker independently enforce the two exact documented origins. There is no broad `tabs`, `history`, `<all_urls>`, scripting or notifications permission. Incognito is explicitly `not_allowed`.

Native API references: [declarativeNetRequest](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest), [service worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle), [idle](https://developer.chrome.com/docs/extensions/reference/api/idle).

## 4. Browsers and installation evidence

| Execution | Version / scope |
| --- | --- |
| Actual installed extension, real service worker, popup, blocking and observations | **Google Chrome for Testing 156.0.8078.4**, macOS ARM64, Playwright persistent disposable profile, Chromium channel/new headless runtime. |
| Existing original browser regressions | **Google Chrome 155.0.8059.80**, isolated Playwright contexts/profiles. |
| Manifest compatibility declaration | Chrome 120+; other versions were not independently executed. |

The test runner discovers the real worker's extension URL. No fixed extension ID is assumed. It creates a local HTTPS fixture with a temporary test certificate and maps selected supported hostnames to loopback only inside that isolated browser. No social-site login, real browsing history or normal user profile is used or cleared. Certificate bypass and host-resolver flags are testing flags only.

The installation guide is `Client/extensions/digital-shield/README.md`, also linked from Shield. Use Chrome's Developer Mode → **Load unpacked** on the directory containing `manifest.json`. A ZIP, if created separately, must be **extracted first**. No ZIP was necessary for this delivery; no Web Store publication or approval is implied.

## 5. Supported domains and matching

The validated allowlist is `instagram.com`, `youtube.com`, `tiktok.com`. Input normalizes case, a trailing dot and a leading `www.`; arbitrary URLs, paths, local addresses and unsupported domains are refused. Native rules use `requestDomains`, matching the selected host and subdomains on HTTP/HTTPS and any port. Lookalike suffixes are not accepted as configuration.

Selection means the whole supported domain, including ordinary YouTube videos and Instagram messages. It does not mean Reels-only or Shorts-only blocking or measurement. DeepSprout's local origin is not a selectable target.

## 6. Actual protection and permitted controls

Chrome's native DNR `block` action applies to `main_frame` and `sub_frame` navigation. A blocked request produces Chrome's native `ERR_BLOCKED_BY_CLIENT` result. No web-page overlay substitutes for enforcement. Existing loaded documents/media are not retroactively closed; reload or subsequent document navigation is required. This limitation is visible before Start Protection.

The Shield form selects sites, chooses **1–120 whole minutes**, discloses whole-site scope, requires explicit acknowledgement, then starts rules. The extension accepts bounded **5–7200 seconds** to permit short controlled tests. It persists the session's original Person, ID, duration, start and absolute expiry; installs rules; reads back native rules; and returns Active only after confirmation. Invalid or failed installation becomes Failed / Rule or Permission Failure, with troubleshooting.

Early stopping requires the explicit **Stop protection early…** confirmation and an attributed reason. Replacement of an active session is refused until explicitly stopped. Continue Anyway never touches protection. Disconnecting the member account pauses observation without silently removing an active manual session. Explicit pairing to a different Person ends the previous Person's active session with attribution and visible disclosure in the popup/guide.

## 7. Expiry, restart and clock handling

Dynamic rules and the absolute expiry survive service-worker/browser restart. An expiry alarm and live-worker timeout reconcile rules, also checked on startup, relevant tab events and status requests. Native readback confirms removal. The real browser test verifies zero rules **before** requesting another web status and confirms navigation becomes accessible.

A live worker also maintains a monotonic deadline. A backward wall-clock movement exceeding two seconds relative to the last observed wall time releases protection conservatively. Forward expiry releases it. A clock change occurring wholly during browser shutdown cannot be perfectly reconstructed. Chrome can defer alarms during suspension; reconciliation resumes on wake. Failure is not displayed as verified Active; removing/disabling the extension remains an available recovery path if Chrome itself cannot apply a rule change.

## 8. Active-time observation algorithm

Policy ID: **active-domain-1**.

1. The supported-site content script requests a sample about once per second only when visible and document-focused. It sends no URL, page content, search term or user-input data.
2. The worker independently reads the actual tab and window, verifies selected supported hostname, active tab, focused non-minimized window, top-level non-incognito context and `chrome.idle.queryState(15) === 'active'`.
3. Only consecutive eligible samples with the same Person, tab, window, domain, configuration revision and local period count. Wall and monotonic elapsed times must be positive, at most 2.5 seconds, and agree within one second. The smaller duration counts.
4. Tab/navigation/window/idle changes interrupt the sample. Background messages cannot erase a different active tab's valid sample. A restarted worker begins a fresh sample and does not fill an offline or suspension gap.
5. Uncertain intervals contribute no time. Per-domain seconds, eligible interval counts, timestamps and coverage-gap reasons are aggregated; full URLs are discarded.

This is deliberately incomplete browser observation, not proof of attention. Chrome's idle detector has a delay; throttling, discarded pages, sleeping browsers and unavailable telemetry undercount. Missing time never establishes zero usage. Physical OS lock/idle transition behavior was not separately driven in acceptance; native idle was queried and returned Active, while idle/locked exclusion was verified in model tests. Actual background/unselected/minimized context exclusion was verified through native browser behavior.

## 9. Shared threshold, period and reminder

The web form offers **1–240 whole minutes** across one selected group. The extension accepts **5–14400 seconds** for controlled short tests. It sums the current selected domains' observed eligible seconds in that local period; it does not create separate default thresholds. Configurations carry a revision, Person and timestamp. Changes retain the day's original domain totals and attributed history; the changed group uses only its selected domains.

Period key: local `YYYY-MM-DD|IANA timezone`. No sample crosses a day/timezone boundary. Each new period starts NotReached. One extension-owned reminder tab opens at threshold, including when DeepSprout is closed. Continue Anyway acknowledges the period without implying use stopped or removing strict protection. Back to DeepSprout acknowledges and opens the bound origin's Recovery Plan, with no reward. Acknowledgement, closing a shown prompt and changing configuration do not cause repeated prompts that period. Display failure is recorded separately.

Day/timezone boundaries and clock discontinuities are model-tested. An actual overnight wait, system timezone change and OS clock modification were not performed; the manual protocol below covers those edges.

## 10. Bridge and security boundary

Allowed origins are exactly `http://127.0.0.1:8897` and `http://localhost:8897`, on `/src/pages/member/` routes. Use one origin consistently because their browser stores differ. Other ports/origins, embedded frames and incognito are unsupported.

A real public hello returns version/capabilities without personal data. A five-minute, one-use random 128-bit popup code pairs an active canonical Individual. Pairing returns a new random Person/origin-bound token. All privileged member messages validate envelope, bounded input, sender extension ID, origin/context, canonical subject and token. Observing websites cannot read personal aggregates or invoke protection through the relay. Popup-only code creation is not exposed to web commands.

This is **local demonstration pairing**, not authenticated server identity or cross-device synchronization. Someone controlling the browser, extension storage or allowed same-origin application code can alter local records. No tamper-resistant or server-verified evidence claim is made. An extension upgrade/reload invalidates the old relay context; the page shows Disconnected and requires reload/reconnection. The tested headless runtime needed browser relaunch after `runtime.reload`; persisted pairing and rules reconciled correctly after relaunch.

## 11. Person, synchronization and privacy

The extension stores owners separately and keeps one explicit active Person/origin binding. Detected account/role changes detach an old binding through repository/storage events, with a one-second identity guard for direct local-store changes. Accepted observations and configuration always identify the canonical Person. B cannot obtain A's periods, history or protection snapshot by using B's identity/token. Explicit new pairing is required. Old local owner records remain retained.

The extension returns an installation ID and monotonic sequence. `shield.sync` validates the source contract, bounded periods/totals, domain allowlist, date/timezone, coverage, configuration/session ownership and attributed history. The existing atomic journal writes first, then the bridge acknowledges. A failed write is **Sync Pending**, retains local evidence and does not falsely advance the journal. Repeat sequences are idempotent; stale sequences are rejected. A failed acknowledgement remains pending and can be retried. Disconnect failures do not preserve a false connected display.

Up to 62 observed periods and 120 history events per Person are retained locally; a profile refuses a 21st owner instead of deleting another Person's records. These are interim demonstration bounds. No full URL/query/unrelated history is retained. No private Shield observations are copied into Institution, Coach, Provider or Supervisor stores. Browser-local journal capacity and eventual export/retention/delta sync remain production concerns.

## 12. Shield, Insights and Home

Shield has exactly two main feature sections. Connection/setup distinguishes unsupported browser, Not Installed, Installed but Not Connected, Connected, local Configured state, Protection Active/Expired, Reminder Active, Disconnected, Sync Pending and Rule or Permission Failure. Cached page timers do not establish enforcement. The popup reports current session, reminder and pending sync status. Installation, permission restoration and reconnect instructions are visible.

The previous evening preferences remain an explicitly inactive historical preview, preserving existing private preferences and the original failed-save regression. They do not schedule protection or notifications. The old simulated focus countdown and unsupported custom-domain enforcement claims were removed.

`browserUsage()` excludes seeded telemetry and uses the real device calendar independently of the personal planning demo clock. Insights shows selected sites, observed totals, per-period/domain values, threshold/configuration context, last sync/observation, partial coverage and gap reasons. Historical accepted observations remain visible when disconnected. Missing data is not a zero bar. Complete comparable periods are not established, so no cross-period reduction, Reels trend, Lab improvement or recovery percentage is invented. The small Home Shield summary uses this same real projection.

## 13. Minimal Recovery and Protected Work integration

Recovery retains its Round 2C scheduler, actions, reviews and cycle ownership. It links to optional Shield and displays verified connection state. Weekly evidence can include date-matched accepted browser periods, labelled partial selected-domain observation. Planner load and difficulty are not inferred from that usage.

Protected Work retains its original Round 2B local timer and self-reported outcome. Its optional availability/link opens Shield separately and never states the attempt was protected automatically. It creates no task-quality verification, Coach approval or extra growth. No practice player was rebuilt.

## 14. Exact files changed or created

Existing files changed relative to the fresh Round 2D baseline (**12**):

- `Client/src/js/data/account.js`
- `Client/src/pages/member/shield/shield.html`, `shield.css`, `shield.js`
- `Client/src/pages/member/insights/insights.html`, `insights.js`
- `Client/src/pages/member/recovery-plan/recovery-plan.html`, `recovery-plan.js`
- `Client/src/pages/member/training/training.html`, `training.js`
- `Client/src/pages/member/weekly-review/weekly-review.js`
- `Client/src/pages/public/home/home.js` (Shield source summary only)

Created (**19** including this report):

- `Client/extensions/digital-shield/manifest.json`, `package.json`, `README.md`
- `Client/extensions/digital-shield/policy.js`, `protection.js`, `observation.js`, `worker.js`
- `Client/extensions/digital-shield/bridge.js`, `observer.js`
- `Client/extensions/digital-shield/popup.html`, `popup.css`, `popup.js`
- `Client/extensions/digital-shield/reminder.html`, `reminder.css`, `reminder.js`
- `Client/src/js/data/shield-bridge.js`
- `Client/tests/round2d-shield.test.mjs`, `round2d-extension.test.cjs`
- `docs/implementation/deepsprout-round2d-digital-shield-report.md`

No existing test assertion was removed, weakened or skipped.

## 15. Model/command verification

**117/117**, zero failures or skips, comprising the original 104 and 13 Shield cases. New cases cover manifest/permissions, origin and input denial, private/atomic/idempotent synchronization, domain/rule scope, expiry/clock behavior, active/idle/focus eligibility, sample continuity, shared threshold bounds, day/timezone periods, seeded/missing-data exclusion and malformed/foreign source rejection.

```sh
node --test Client/tests/round2d-shield.test.mjs Client/tests/round2c-recovery.test.mjs Client/tests/round2a-personal.test.mjs Client/tests/round2b-practices.test.mjs Client/tests/provider-cycle.test.mjs Client/tests/partner-store.test.mjs Client/tests/institution-cycle.test.mjs Client/tests/supervisor-cycle.test.mjs Client/tests/coach-cycle.test.mjs Client/tests/round0-identity.test.mjs Client/tests/round0-lifecycle.test.mjs
node Client/tests/page-wiring.test.cjs
```

Page wiring: **14 pages pass**. Member jsdom journey: **14/14**, including its existing nonfailure navigation diagnostic. All **18 Round 2D JavaScript files** pass syntax checks. `git diff --check` passes.

## 16. Real extension acceptance

Checkpoint 2D-1 was verified in installed Chrome before blocking implementation expanded (five foundation checks). Checkpoint 2D-2 then verified real native blocking/expiry (eight accumulated checks). Final 2D-3 acceptance passes **22/22**, including the final error assertion.

The final suite exercises actual Start Protection/explicit early-stop controls and the shared reminder configuration form. Short 12-second protection and 5-second reminder intervals then use the same real bridge within declared extension bounds. It verifies native selected-host/subdomain refusal, unselected HTTPS access, page reload, browser/worker restart, autonomous expiry without a web status request, zero stale rules, actual two-domain aggregation, excluded background/unselected/minimized intervals, a reminder with DeepSprout closed, Continue retaining strict rules, Back opening Recovery, Person isolation, persisted observations and no arbitrary Garden/schedule change.

The native rule-error case deliberately substitutes an invalid regex in the **test profile's runtime call** to the genuine DNR API. Chrome actually rejects that rule; the product's real error path and UI are exercised. No fault-injection code exists in shipped extension source. Permission denial uses Chrome's genuine **On click** extension site-access setting through its own settings API, confirms `permissions.contains` is false, and verifies failure with zero installed rules. Neither test is represented as an ordinary successful block.

Native observation tests run alone: other Chrome test windows can take eligibility focus, and correct exclusion can leave no eligible samples. Final native signals are recorded in `extension-final.log`. Earlier exploratory failures are separate from the authoritative final report.

```sh
BASE_URL=http://127.0.0.1:8897 SHOTS_DIR=/private/tmp/deepsprout-shield-new-run node Client/tests/round2d-extension.test.cjs
```

## 17. Existing regression results

| Suite | Final result |
| --- | --- |
| Round 2C browser | **17/17**, errors `[]` |
| Round 2B browser | **17/17**, errors `[]` |
| Round 2A browser | **16/16**, completed true, errors `[]` |
| Round 0 browser | Pass; final page-error check reached, failed preferences/save and reload assertions preserved |
| Provider browser | **20/20** |
| Coach browser | **38/38**, final console check reached |
| Institution browser | **25/25 reported checks**, including first-run handoff and final console check |
| Supervisor browser | **18/18 reported checks** |
| Partner browser | **100 routes, 7 walkthroughs, 8 checks**, completed true, errors `[]` |
| Registration | Pass; errors `[]` |
| Both Admin suites | Pass; original assertions and output-only capture redirects |
| Member journey / wiring | **14/14** / **14 pages pass** |
| Product Journey | Known unchanged source-regex failure: `article()` at test line 16, called at line 18, before browser launch. Its final browser console check was **not executed**. |

All used isolated contexts and new scratch outputs. Existing source assertions remained intact. The output-only wrapper redirects hardcoded Admin/Product capture paths without changing assertions. Full commands, exit codes and per-suite logs are retained.

## 18. Evidence, screenshots and errors

Evidence root:

`/var/folders/62/7zh9l_g56zb1gc0hhr3rx7lh0000gn/T/deepsprout-round2d-x_y40bn9/`

Authoritative files include `commands-final.log`, `focused-final.log`, `extension-final.log`, `release-extension/report.json`, `release-extension/extension-errors.json`, `regression-results.json`, `syntax-final.json`, `member-final.log`, `wiring-final.log`, `baseline-hashes.json`, `baseline-status.txt` and `preservation-final.json`.

Real captures include `release-extension/connected.png`, `protection-active.png`, `actual-reminder.png`, `insights-observed.png` and `native-rule-failure.png`. Mobile visual verification uses stable **390 × 844 viewport** captures in `release-mobile/`: `top.png`, `protection-viewport.png`, `reminder-viewport.png` plus `report.json`. Chrome's long full-page capture after restart showed compositor repetition; that diagnostic capture is not the visual acceptance evidence. The hero text fit was corrected and checked against its actual element bounds.

Final extension web/console errors: **`[]`**. Chrome's own extension **runtime errors `[]`, manifest errors `[]`, install warnings `[]`**. The additional mobile run separately verifies error-free actual pairing, two sections, no horizontal/hero clipping, keyboard activation and reduced motion.

## 19. Pass, partial and not-tested boundaries

| Area | Status / practical boundary |
| --- | --- |
| MV3 install/handshake, privacy pairing, real rules/expiry, real eligible aggregation/reminder, integration | **PASS** in tested Chrome for Testing/macOS scope |
| Native failure, permission denial, sync failure, identity isolation, restart and duplicate prevention | **PASS**, with deliberate fault/permission fixtures described above |
| Browser idle/locked gating, time-zone/day boundaries and discontinuities | **PASS model coverage**; native API queried in real execution; actual OS lock, overnight rollover and physical clock/timezone changes **NOT TESTED** |
| Mobile 390px web interface | **PASS** browser viewport/keyboard/reduced-motion checks; native mobile app blocking **unsupported** |
| Unsupported-browser state | **PASS** state path using a non-Chromium user-agent in the Chrome harness; actual Safari/Firefox extension execution **unsupported/not tested** |
| Other OS/browser versions, incognito, closed-browser hardware suspension timing | **NOT TESTED / unsupported as documented** |
| Production authenticated synchronization, Web Store installation, server-verified or tamper-proof evidence | **Not implemented or claimed** |

## 20. Intentional Phase-1 limitations and manual edge protocol

This is browser-profile support. It does not cover Android/iOS apps, other devices/browsers, uninstallation, all page resources already loaded, genuine attention, Reels-only usage or clinical recovery. Local aggregate data is editable by the device owner. Partial coverage cannot establish complete daily usage or comparable reduction. No shared-history/reward migration or Garden policy was added.

For remaining hardware/platform verification, use a separate unpacked-extension test profile: pair an Individual; configure a one-minute reminder; view a selected site, then lock/idle the OS beyond 15 seconds and verify no continued eligible intervals; restore activity and inspect gap coverage. Repeat over local midnight and a timezone change, expecting a new neutral period and no bridged interval. With manual protection active, suspend/restart Chrome past expiry and verify rules clear on wake. Change the OS clock backwards while active and confirm conservative release. These scenarios are manual verification instructions, not recorded passes.

## 21. Remaining owner decisions

The selected demonstration scope uses three domains, two local origins, 30 minutes as an editable reminder input, visible duration bounds, explicit early stop, a 15-second idle detector and bounded local retention. These are disclosed provisional technical defaults, not final clinical/product policy. Owner decisions remain for deployed HTTPS origin and authenticated consent, distribution/Store review, supported OS/browser matrix, production retention/export/deletion, precise measurement defaults and any stronger locked-session policy.

## 22. Round 2E dependencies

Round 2E may consume the existing installation/sequence/period/configuration/source references for broader source-history reconciliation. Preserve original Person journals, practice attempts and reward sources. Production work needs authenticated identity, durable/delta synchronization, retention and corrections policy, and independent platform QA. Browser observations must not be converted into unsupported practice completion, assigned-task approval, neurological progress or Garden rewards.

## 23. Working-tree and validation preservation

A fresh baseline captured hashes for **983 existing files** and the starting Git status before edits. The final comparison identifies **12 existing files changed by this round and 19 added**, with **no starting files removed**. Separate concurrent work changed the root `README.md` and added 14 root-site/README asset, script and test files; those changes were preserved and are excluded from the Round 2D file list. Consequently **970 of 983 starting files are byte-identical** overall. All **421 protected starting master/design/report/validation/Garden files**, original test sources and pre-existing concurrent Journey/Reels/Lines work remain unchanged from the baseline. `preservation-final.json` separates Round 2D and concurrent paths.

The five intentional pre-existing removals remain removed: the cinematic event-horizon reference, cinematic-math.js, event-horizon.js, cinematic.css and cinematic-story.test.mjs. No reset, clean, stash, broad restore, browser-profile clearing, automatic commit, Admin consolidation, Community development or Round 2E work occurred.
