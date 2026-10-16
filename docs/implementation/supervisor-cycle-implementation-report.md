# Supervisor cycle and Institution priority fixes: implementation report

**Date:** 16 October 2026.

**Builds on:** [Institution cycle report](institution-cycle-implementation-report.md). That report is unchanged and remains the record of the earlier work.

**Authority:** [`DeepSprout.md` v4.0](../../DeepSprout.md), §§15–17, 23 and 25–26.

**Boundary:** Phase-1 static browser demo.
- Authentication, email delivery, QR signing and attachment security are simulated or browser-local, and the UI says so.
- No backend, payment or real email was added.
- Nothing was committed.

**Evidence labels:**
- **BROWSER** means real headless Google Chrome, driven by `playwright-core` in an isolated context that starts with empty storage. The operational clock is pinned to 15 Oct 2026 09:00 (Asia/Amman).
- **NODE** means command and read-model tests.
- **SOURCE** means the code was inspected only.

---

## 1. What was implemented

### Part A: Institution priority gaps

| Gap | Implemented | Evidence |
|---|---|---|
| **A1 Forms & Competitions → regular Individual** | My Initiatives in regular `explore.html` now lists the initiative's forms and competitions, read from the same records the Institution uses. | NODE + BROWSER S1a/S1b |
| | **Forms:** answered inline. Supported question types are short/long text, single and multiple choice, rating, number and date. | |
| | Answers are validated by the **same engine** used by the partner Participant page (`respondToForm`). Responses are identified and pinned to the form version. | |
| | Only accepted participants can answer. Pending applicants can answer only forms whose purpose is "Registration". | |
| | Each person can respond once per version. The person's own answers are shown back to them after reload. | |
| | **Competitions:** entered inline through the same engine (`enterCompetition`). | |
| | The submission window, a single entry per person and accepted status are all checked. | |
| | The entrant sees their own status. Scores and feedback appear only after the Representative publishes results. | |
| | Entries never grow the Personal Garden. | |
| | The Representative sees the original responses (with the respondent's name) and the original entries, using the existing judging and results pages. | |
| | No second store and no anonymous mode. | |
| **A2 Excuse attachments** | Real files are stored in **IndexedDB** (`deepsprout-attachments`). The operational graph holds only `{id, name, type, size}`. | NODE + BROWSER S2d |
| | Allowed types are PDF, JPG and PNG, up to 2 MB, checked both in the UI and in the command. Invalid files get clear error states. An orphaned file is removed if the excuse cannot be saved. | |
| | **Who can open a file:** the `initiative.excuse.evidence` command allows only the student, the initiative's **active** Supervisors and its Representative. Every opening is logged on the excuse. | |
| | Coaches, other students, Provider staff and revoked Supervisors are refused. | |
| | Viewer: image preview or embedded PDF, with a download link. A missing file shows "not available in this browser". | |
| | The UI states that this is browser storage, not encrypted or production-grade. | |
| **A3 Check-in window** | One explicit per-session policy, `checkInPolicy {mode:'window', before, after}`. The default opens check-in 30 minutes before the start and closes it 30 minutes after the end. `mode:'anytime'` is an explicit per-session exception. | NODE + BROWSER S2c/S3c; existing suites updated |
| | It applies to **Institution and Provider** sessions alike. | |
| | Early check-in, and QR/code/online check-in after the window closes, are refused with readable messages. | |
| | Reasoned manual exceptions remain allowed after the window closes; corrections are allowed at any time. | |
| | Close-out is allowed only after the session starts. | |
| | Policy fields are on the session form. The window is shown on the session detail and as a banner on both attendance desks. The old global `enforceCheckInWindow` flag is no longer used. | |
| **A4 Usability** | **Supervisor Flag / Escalate** on Pending or Queued applications: a note, a notice to the Representative, a "Flagged by Supervisor" tab, and Resolve (automatic on approve or reject). | NODE + BROWSER S2b |
| | **Session duty during setup:** builder stage 4 lets the Representative choose an active Supervisor per session component. It is stored on the draft and copied once onto the session record at publication, keeping only Supervisors who are still active. No duplicate session is created. | NODE A4 |
| | **Consistent feedback:** status messages in My Initiatives for forms, competitions, excuses, bookings and offers; Supervisor and Representative actions keep the existing confirmation messages. | BROWSER |

### Part B: Supervisor cycle

**Two contexts, never merged.**
- `pages/institution/supervisor-context.js` builds the list of contexts from:
  - active Initiative grants (issued by an Institution Representative);
  - accepted Provider appointments (issued by an Outdoor Provider).
- A context selector appears on every Supervisor page. The context also follows explicit `?initiative=`, `?mode=provider&resource=`, and session links: a notification link opens the right assignment.
- Pages that belong to the other kind show an explanation and a "Switch to …" button instead of borrowing permissions:
  - Applications, Students & Groups, Coaches and Excuses are Initiative-only.
  - Experiences, Cohorts, Participants and Evaluations are Provider-only.
- Commands keep their own authority checks: Initiative grant checks versus Provider `assigned()` and appointment checks.

**Journey implemented and verified**

| Step | Initiative Supervisor | Provider Supervisor |
|---|---|---|
| Invitation / appointment | Representative invites by email with a scoped token and 7-day expiry. Delivery is simulated with a copyable link. | **New:** Provider appoints by **email**, for an existing or new person, with a token, 7-day expiry and copyable link. Selecting an existing person still works. |
| Login / register / verify / accept | `#/auth/staff-invitation/:token`: existing-account or new-account path, simulated OTP, wrong-email and expired states. | **New** `#/auth/appointment/:token`: same paths. The canonical person is reused. Wrong-person, expired and revoked links grant nothing. No Admin approval. |
| Dashboard | **New unified dashboard** covering both contexts: pending invitations and appointments with Accept/Decline, records-derived stats, an attention list tagged by context, a merged duty agenda, assignment scope cards, recent notices, and ended appointments. | (same dashboard) |
| | The stats are: assignments, upcoming duty, attendance to act on, excuse recommendations, evaluations due, and Coach reports. | |
| Roster / groups | Approve eligible applications (no reject or discipline); Flag; create and rename groups; allocate and transfer students; allocate active Coaches; request staffing. | Assigned experience, sessions and cohorts only. Roster filtered to their cohorts when cohorts exist. No Institution authority. |
| Schedule | Sessions with mode, venue or online note, seats, duty, the check-in window and `Needs Supervisor`. Duty assignment only, never publication or price. | Assigned sessions only. |
| Attendance | Desk: window banner, QR camera (`BarcodeDetector` where supported) plus typed or pasted code, online roster, manual exception with reason, Late, Absent, close-out, corrections with before/after history, replay refused. | **New Provider desk** in the same visual language. It calls the Provider commands, so Provider bookings and records are unchanged. Window, camera or typed booking code (case-insensitive), manual exception with reason, Late, Absent, close-out (`supervisor.attendance.closeout`), status corrections with history. A correction to Absent sets the dependent completion back to review and withdraws its reward. |
| Excuses / evaluations | Excuse chain unchanged. The Supervisor reviews attendance and restricted evidence and recommends Accept, Reject or More information; only the Representative decides. Absent + accepted excuse still shows as **Excused Absence**, attendance stays Absent, and no rabbit is given. | Evaluations against the declared session criteria. Late now qualifies as attended. Booking completion is recorded with a `completedAt` timestamp. A **birdhouse** appears only after every session is completed (verified). No Institution excuse authority is transferred. |
| Reports | Insights (computed from records), Coach reports, summary submitted to the Representative, who can drill down to the original. | Closing report, visible to the Provider owner in Provider Reports (verified). |
| Completion | Supervisors cannot complete an Initiative; the Representative alone does. | Evaluations and closing report only. The Provider still owns experience closure. |
| Revocation | Representative revokes with a reason. Access stops immediately, authored records stay attributed, and the evidence attachment is refused. | **New:** reasoned revocation with history and a notice to the Supervisor. Commands are refused; the dashboard shows "Ended appointments"; attendance stays attributed. |
| Group Garden | The one Initiative-wide Group Garden. | Explanation page: no Provider cohort Group Garden in Phase 1. |
| Account | **New** "Assignments & access" table: every grant and appointment with scope, issuer, status and dates. | (same table) |
| Provider-owner views | — | **Updated** so the owner's own pages read the new factual statuses: Late counts as attended in the owner roster, Provider Reports, the Supervisor's Provider reports and participants, and the participant session timeline. Absent is shown as its own status. The owner can correct a record to a specific status, with history (verified in BROWSER S3d). |

**Participant QR.** The partner Participant booking page now shows a real rendered QR code for confirmed Provider bookings. Regular Individual Explore still shows fixture Provider listings (see §7).

---

## 2. Data and compatibility

- **Schema 3.** It adds a link from the seeded competition to *Start Today*, plus empty `history` and `flags` arrays.
  - It is additive and idempotent. A one-time backup of the earlier graph is written to `deepsprout-ecosystem-demo-v1:backup:schema-2` before upgrading.
  - Schema-1 graphs still upgrade through 2 to 3.
- **Provider records** keep their shape. New optional fields: `appointments.{email, token, expires, history, revokedAt, reason, acceptedAt}`, `attendance.history`, `bookings.completedAt`, `experienceSessions.closedBy`.
- The existing Provider owner attendance page still works. Supervisors now use the new desk.
- **Attachments** live outside the graph in IndexedDB. If a file is cleared, its reference remains and the viewer says the file is unavailable.

---

## 3. Cross-workspace data flows (verified)

| Original record (writer) | Readers |
|---|---|
| `responses` (`member.form.respond`, from regular Explore) | Same Individual card (own answers); Representative form responses page and reports (identified) |
| `entries` (`member.competition.enter`) | Representative judging and results page; Individual card (status, then published scores and feedback) |
| `excuses.attachment`, IndexedDB file | Supervisor and Representative evidence viewer (access logged); student; refused to Coaches, other students and revoked staff |
| `admissions.flags` (Supervisor) | Representative "Flagged" tab, notice, Resolve |
| `appointments` (Provider, email) | Appointment link page; Supervisor dashboard and context; Provider Supervisors table (status, expiry, revocation) |
| `attendance` (Provider desk) / `evaluations` / `closingReports` | Provider roster and reports; birdhouse after verified completion |
| `sessionAttendance` (Institution desk) | Unchanged chain from the Institution report, now window-checked |

---

## 4. Tests: commands actually run

The browser runs use `BASE_URL=http://127.0.0.1:8799`. Tooling is installed outside the repository.

| Command | Result |
|---|---|
| `node --test Client/tests/partner-store.test.mjs Client/tests/institution-cycle.test.mjs Client/tests/supervisor-cycle.test.mjs` | **27/27 Pass** |
| The same three suites with the system clock shifted +30 days | **27/27 Pass** (the date pin holds) |
| `node Client/tests/page-wiring.test.cjs` | **14 pages OK** |
| `node Client/tests/member-journey.test.cjs` (jsdom) | **14/14 Pass** |
| `node Client/tests/supervisor-browser.test.cjs` (new) | **18/18 Pass**: S1a–S4, mobile ×3 at 390 px, reduced motion, console clean. S3d also checks the Provider owner's roster and reports; S3b checks that a Provider-only Supervisor's sidebar hides Initiative-only items. |
| `node Client/tests/institution-browser.test.cjs` | **25/25 Pass** |
| `node --test Client/tests/partner-browser.test.cjs` | **Pass**: 100 route states. Tracked outputs in `Client/docs/validation/` were restored from Git after each run. |
| `node --test Client/tests/admin-dashboard.test.cjs` | **Pass** |
| `node --test Client/tests/admin-member-integration.test.cjs` | **Pass** |
| `product-journey`, hero/reels/animation suites | **Not Tested.** They are unrelated; `product-journey` was already failing on landing markup. |

**What the new Node suite covers (`supervisor-cycle.test.mjs`)**
- Form validation, identity, duplicates and eligibility.
- Competition entry: window, duplicate, eligibility, hidden then published results, no Garden effect.
- Check-in window: early, open, closed; manual Late after close; corrections; the "anytime" policy.
- Attachments: type and size rules, the six-reader permission matrix, access log, revoked Supervisor refused.
- Flag and resolve; builder duty landing on the one session record.
- Full Provider Supervisor lifecycle: email appointment, wrong person, unverified, expired, accept, out-of-scope session, window, case-insensitive code, replay, Late without and with a reason, close-out, correction to Absent, evaluation needs Present/Late, closing report seen by the Provider, birdhouse only after all sessions are completed, revocation.

- Supervisor extras: the More-information loop (Supervisor asks, student responds, back to Submitted, then decided), a Supervisor allocating an authorized Coach (an unauthorized one is refused), a staffing request reaching the Representative, a Supervisor refused when inviting staff, and a Provider Supervisor refused outside their own cohort.

**Not Tested (explicitly)**

| Condition | Why / what was tested instead |
|---|---|
| Camera QR scanning (`BarcodeDetector`) | Headless Chrome has no camera. The typed/pasted code path was tested, and the scan button only submits the same form. |
| PDF attachment preview | Only a PNG was stored and previewed. PDFs pass the same type check; the `<object>` viewer was not exercised. |
| Attachments read from another browser or device | Not possible by design (browser-local storage); the "not available in this browser" message is shown instead. |
| Hybrid-mode online roster confirmation inside the browser suite | Covered by NODE (Institution cycle E) and the earlier Institution browser run, not in this suite. |
| Very large rosters, multi-tab concurrency | Not exercised; the demo has last-write-wins storage. |

**Deliberate changes to existing tests (each commented in the file)**
- `partner-store.test.mjs` test 6: moves the demo clock into each session window before recording attendance (the v4 window policy).
- `institution-cycle.test.mjs` E: asserts the early-window error, then moves the clock. The migration test expects schema 3.
- `institution-browser.test.cjs` E2: asserts the window banner, then moves the clock.
- `partner-browser.test.cjs`: email-based Provider appointment with link dialog; new Provider desk; demo clock inside the window.

**Bugs found by these runs and fixed**
- A stray parenthesis in `provider.js` broke the Provider module. `node --check` treats the file as CommonJS and missed it; an ESM import of every module now catches this class of error.
- A session link without `?initiative=` opened the wrong assignment. The context is now inferred from the session.
- Dashboard alerts said "Attendance open" after the window had closed.
- The "not in this assignment" pages had no heading.
- The Provider owner's views counted only `Present` as attended, so a Late or Absent record showed as "not arrived". Late now counts as attended, Absent is shown as its own status, and the owner can correct to a specific status.

---

## 5. Responsive and accessibility checks

- **390 px, no horizontal scroll:** Supervisor dashboard, Provider desk and excuses (BROWSER). The context selector scrolls horizontally inside its own row.
- **Reduced motion:** entrance animation and context-chip transitions are off (BROWSER).
- **Keyboard and semantics:**
  - Context chips are buttons with `aria-current`. Window banners use `role="status"`.
  - Rating inputs keep native radio semantics with visible focus.
  - Evidence images have alt text; the PDF has an `aria-label`.
  - Out-of-context pages have an `h1`.
- Desktop: one `h1` and no overflow on every Supervisor route in both contexts (BROWSER sweep).

---

## 6. Changed files

**New**
- `Client/src/shared/attachments.js`
- `Client/src/workspaces/pages/institution/supervisor-context.js`
- `Client/tests/supervisor-cycle.test.mjs`
- `Client/tests/supervisor-browser.test.cjs`
- this report

**Modified**
- `Client/src/workspaces/initiative-rules.js`: window policy, resource links, evidence rule.
- `Client/src/workspaces/migrate.js`, `data/initiative-ops.js`: schema 3.
- `Client/src/workspaces/store.js`: schema-2 backup and migrate.
- `Client/src/workspaces/commands/initiative.js`: member form/competition, flag, evidence, window, session policy.
- `commands/institution.js`: shared form and competition engines; builder duty.
- `commands/outdoor.js`: email appointments, token acceptance, reasoned revoke, window, Late/Absent/close-out, status corrections, evaluations accept Late, `completedAt`.
- `Client/src/workspaces/shared.js`: Late counts as attended in evaluations; Supervisor access table.
- `Client/src/shared/selectors.js`: forms and competitions in My Initiatives, excuse attachment and info note.
- `Client/src/shared/member-bridge.js`: attachments and `openEvidence`.
- `Client/src/pages/member/explore/explore.{js,css}`
- `Client/src/workspaces/pages/institution/{operations,participants}.js`
- `Client/src/workspaces/builders/initiative.js`
- `Client/src/workspaces/pages/{supervisor,provider,auth,participant}.js`
- `Client/src/workspaces/app.js`: Supervisor sidebar filtered by the kinds of assignment held.
- `Client/workspaces.html`: QR script.
- `Client/src/workspaces/institution.css`
- Tests listed in §4.

---

## 7. Remaining limitations

1. **Provider → regular Individual is still disconnected.** Regular `explore.html` shows fixture Provider listings and its own fixture registrations. Real Provider bookings, offers, QR codes and completion are visible on the partner Participant pages. The Provider Supervisor journey runs on the **real Provider records**, but a regular Individual cannot yet book a Provider experience. This is the separate Outdoor Provider cycle. The Provider waiting-list hold is still the older 15-minute setting.
2. **Attachments are stored in one browser profile on one device**, unencrypted. A Supervisor on another device would see "not available in this browser". Production needs server storage with access control and retention.
3. **No Provider absence or excuse policy exists** in the master for Provider sessions, so none was invented. Absences are recorded factually, and corrections are available.
4. **Sidebar:** items are hidden only for assignment kinds the person holds none of. A person with both kinds sees all items, and the out-of-context pages explain themselves and offer a switch.
5. **Camera scanning** requires `BarcodeDetector`, which is available in Chromium-based browsers on supported platforms. The typed or pasted code works everywhere.
6. **Sessions without a stated time zone** use Asia/Amman offsets. Europe/London uses a fixed +01:00 (no daylight-saving logic).
7. **Security is simulated.** Demo sign-in, browser-local state that can be tampered with, one session per origin, and last-write-wins concurrency, as described in the Institution report.

## 8. What remains for the separate cycles

- **Outdoor Provider:** publish Provider experiences into regular Explore; regular booking, waiting list and offers with the 24-hour default and demo clock; booking QR on regular My Registrations; Provider camp completion in Individual history and Insights.
- **Independent Coach:** a Coach-group Group Garden built on the new projection, retiring the older plant view; same-identity Student upgrade into the personal four-assessment journey with history carried over (partly done); independent Program linkage reporting.

**Demo note:** use **Set demo date** (workspace "Development demo" panel) to move into a session's check-in window before demonstrating attendance:
- *Start Today* workshop: 25 Oct 2026, 15:30–18:30.
- Provider walk: 24 Oct 2026, 08:30–11:30.
