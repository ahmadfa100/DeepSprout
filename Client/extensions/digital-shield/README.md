# DeepSprout Digital Shield — local Chrome demonstration

Two capabilities only: **Manual Website Protection** and **Shared Website Usage Reminder**. This extension is optional. No backend, Web Store publication or mobile-app integration is included.

## Install and pair

1. Start the existing static client: `python3 Client/serve.py --port 8897` from the repository root.
2. Open Chrome 120 or newer, navigate to `chrome://extensions`, enable **Developer mode**, select **Load unpacked**, and choose this `digital-shield` directory containing `manifest.json`. If supplied as ZIP, **extract it first**; Chrome cannot load the ZIP with Load unpacked.
3. Open `http://127.0.0.1:8897/src/pages/member/shield/shield.html` and sign in/register an active Individual. `http://localhost:8897` is also allowed. These are distinct browser storage origins; use one consistently.
4. Open the installed extension's popup using Chrome's extensions menu. Create a five-minute pairing code, copy it into **Connect extension** on Shield. Codes are random, one-use and expire. No fixed extension ID is needed.
5. Review scope and selected domains before starting protection or enabling the reminder.

Only one Person/origin is actively bound in a browser profile. Pair only to your own account. A new pairing explicitly switches ownership; historical local records remain under their original Person. Local pairing is a demonstration consent boundary, **not authenticated production identity**. Code on the same allowed site origin can impersonate its user if that site is compromised. Extension/local storage is not tamper-resistant.

## Permissions and privacy

- `storage`: owner-bound settings, aggregate usage periods, session/history and pending sync. No full page URLs, queries, unrelated history or content is stored.
- `declarativeNetRequest`: actual document-navigation blocking on selected supported domains only.
- `alarms`: expiry and observation reconciliation when the worker wakes.
- `idle`: exclude Chrome-reported idle/locked activity.
- Host access: Instagram, YouTube and TikTok (and their subdomains). The tab API can identify these granted hosts; there is no broad `tabs`, `history`, `<all_urls>`, scripting or remote-code permission.
- A static content script relays messages only on member routes at the two exact local origins above. Manifest match patterns cannot express ports; the content script **and** worker reject other ports/origins. No external runtime message listener is exposed. Incognito is disabled.

Shield cannot distinguish Reels/Shorts from other activity on the domain, detect genuine attention, track apps/other devices/browsers, prevent uninstall or provide clinical evidence. Private telemetry is not written to partner/organization records. It never grants a Garden reward.

## Troubleshooting

After Load unpacked, extension reload or upgrade, reload the DeepSprout page. An old content-script context becomes disconnected; it must never imply that a cached countdown proves live enforcement. If pairing expired, create a new code. If another account/origin replaced the binding, pair again explicitly.

Use **Refresh status** after restoring site access in Chrome extension details. A rule/permission failure is shown without claiming protection active. **Sync Pending** means a journal write or acknowledgement failed; retry after fixing local storage or reloading stale journal tabs. Extension-local evidence remains available until acknowledged and on subsequent status requests. Disconnecting the member page does not erase history.

For automated verification use the installed Playwright **Chrome for Testing**, with a fresh persistent test profile and `--load-extension`; consumer Chrome can restrict that automation flag. The normal user Chrome profile must never be cleared or reused. See the Round 2D implementation report for actual tested versions, coverage and residual limitations.

## Enforcement and time policy (v0.1.0)

Supported root domains are **instagram.com, youtube.com, tiktok.com**. Whole hostnames and their subdomains match, on HTTP/HTTPS and any port; `notyoutube.com` and `youtube.com.evil.test` do not match. The native MV3 `declarativeNetRequest` action is **block**, with `requestDomains` and `main_frame`/`sub_frame` resource types. Chrome displays its native `ERR_BLOCKED_BY_CLIENT` navigation result. Already loaded documents/media are not retroactively closed; reload/navigate for enforcement. DeepSprout's local origin is never a selectable blocking target.

The page offers 1–120 whole minutes. The extension validates 5–7200 seconds so controlled acceptance tests can use short intervals. Start/expiry are absolute device timestamps in extension storage. Dynamic rules persist across worker/browser restart. An expiry alarm plus an in-worker short timeout, startup, tab events and verified status requests reconcile rules against that timestamp. Clock rollback exceeding two seconds compared with the last observed wall clock releases the session conservatively; a monotonic deadline also protects a live worker. Clock changes occurring entirely while the browser is shut down cannot be reconstructed perfectly. Chrome can defer alarms while suspended; reconciliation runs when it resumes. This is user-controlled support: **Stop protection early** is explicit and attributed, disconnecting the member account does not silently remove an active block, and Continue Anyway never changes rules. A new explicit pairing to another Person ends an old Person's active session with attribution.

## Observation and reminder algorithm (`active-domain-1`)

A small static content script on supported sites requests an observation approximately once per second when the document is visible and focused. It sends no URL or content. The worker independently queries the actual tab, its window and `chrome.idle.queryState(15)`. It accepts only the active selected tab in a focused non-minimized window, non-incognito, with Chrome reporting **active**. The granted hostname is normalized in memory; full URLs are discarded.

Only two consecutive eligible samples with the same Person/tab/window/domain/configuration revision/local-day/timezone count. Their elapsed wall and monotonic times must both be positive and at most 2.5 seconds, and agree within one second. Count the smaller elapsed duration. A tab/navigation/window/idle event interrupts the current sample. Background-tab messages cannot clear a different active tab's sample. Worker restart starts a new sample and never fills the suspension/shutdown gap. This intentionally undercounts uncertain intervals. Chrome's idle signal is an approximation (15-second detector), not evidence of attention or instantaneous human inactivity. Content-script throttling can also reduce coverage. No device-wide activity is inferred.

The period key is local `YYYY-MM-DD|IANA timezone`. A local-day/timezone change starts a new neutral period; no interval bridges it. Aggregates, interval count, coverage gap counts/reasons, timestamps and configuration revision references are retained for up to 62 observed periods per Person, with 120 history events. Up to 20 owners are retained; a full demo profile refuses another owner instead of deleting an existing Person's records. These are interim demonstration bounds, not adopted production retention policy.

The web form offers 1–240 whole minutes for one shared selected-site threshold; the extension accepts 5–14400 seconds for bounded testing. The current selected domains' accumulated eligible seconds in the current period are summed. Selection/threshold changes are versioned and do not erase that day's recorded per-domain totals. A changed group uses only its selected domains. Once reached, one extension-owned reminder tab opens even with DeepSprout closed. Continue Anyway acknowledges that period without claiming use stopped. Back to DeepSprout acknowledges and opens the bound origin's Recovery Plan. Closing the prompt or changing configuration does not create repeated prompts that day. The next day/timezone starts neutral.

## Synchronization and identity

The handshake reports actual version/capabilities, and a successful pair issues a random Person/origin-bound token. Every privileged member command validates sender origin, top-level context, Person and token. The popup's internal controls cannot be called through the web relay. Observing websites can only request their own observation and cannot read personal aggregates or invoke blocking. Public hello contains no personal data.

The extension returns an installation ID and monotonic snapshot sequence. DeepSprout validates and appends a snapshot in the existing private Person journal, then acknowledges the sequence. A failed write never reports sync success. Repeat snapshots are idempotent, stale sequences rejected, unacknowledged local evidence retained. A closed member page stops synchronization, **not** authorized local observation. A detected account/role change on an open member page detaches the old binding; an explicit new popup code is required for another account. No old owner's totals are returned to the new one. This is local demonstration authorization, not protection against someone controlling the browser or same-origin application code.

Real observations use the device's calendar, separately from the planner's personal demo clock. Insights excludes historical seeded telemetry, shows partial periods and missing data, and withholds unsupported cross-period change claims. Extension events do not complete a practice, approve assigned work, alter a Recovery schedule, create a Lab result or award Garden growth.

## Reproduce acceptance

From the repository root with Playwright and Chrome for Testing installed:

```sh
BASE_URL=http://127.0.0.1:8897 SHOTS_DIR=/private/tmp/deepsprout-shield-check node Client/tests/round2d-extension.test.cjs
node --test Client/tests/round2d-shield.test.mjs
```

The browser suite creates a disposable persistent profile and a local HTTPS fixture, maps supported hostnames to it **only inside that test browser**, and never requests real social-site content. It creates a temporary self-signed certificate using `openssl`; certificate bypass is only a test-browser flag. Actual native blocking/reminder execution is distinguished from deliberate native API fault injection and model coverage in the report. Do not use these testing flags with a normal personal browser profile.

Run observation acceptance by itself: other test browser windows can take focus and correctly make intervals ineligible. OS idle/lock, real overnight rollover, physical suspension and other operating systems require the manual edge protocol in the implementation report; they are not established by model tests. Long full-page screenshots can show compositor artifacts after headless browser restart, so 390px visual QA also uses ordinary viewport captures.
