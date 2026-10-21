# Institution cycle: implementation report

**Date:** 15–16 October 2026. **Authority:** [`DeepSprout.md` v4.0](../../DeepSprout.md), mainly §§9, 13–19, 21, 23, 25 and 26. **Starting point:** [Phase 0 technical-readiness audit](../audits/deepsprout-phase0-technical-readiness.md), which is kept unchanged as dated evidence.

**Delivery boundary:** Phase 1 is a static HTML/CSS/JavaScript demo that keeps state in browser storage. Authentication, email, payment and QR security are simulated. They are labelled as simulated in the UI and in this report. No backend, Angular code or real payment was added. Nothing was committed.

**Evidence labels used below:**
- **BROWSER**: run in real headless Google Chrome through `playwright-core`, in an isolated context that starts with empty storage.
- **NODE**: command and read-model test in the Node test runner, using in-memory state.
- **JSDOM**: run in jsdom.
- **SOURCE**: code inspected only, not executed.

---

## A. Summary

The Institution Representative cycle now runs end to end in the real Phase-1 app, from Admin verification to completion and archive. It is connected to the **regular Individual pages**, not only to the partner "Participant" view.

| Area | What was done | Reuse or replacement |
|---|---|---|
| Shared foundation | One canonical `Person` across member and partner pages. Scoped Initiative staff grants. An idempotent, non-destructive migration from schema 1 to 2 that writes a backup first. An operational demo clock. A thin repository bridge for member pages. Shared rules and selectors. | Reused the partner store (P1) as the operational partition. Replaced the gating inside `store.js` and the conversion of enrollments into Applications. |
| Publication & admission | Six-stage builder with field-level blockers. Publication goes to the **regular** `explore.html`. One Application record (`admissions`, with a readable `APP-…` code) is seen by the Individual, the Representative and the Supervisor. Admission is a single Rep-or-Supervisor approval. Hard limit of 135 accepted students and 3 active Supervisors per Initiative. Full waiting-list lifecycle. Discipline actions are Representative-only. | Builder rebuilt on the existing builder engine. New admission commands. |
| Staff & groups | Supervisor/Coach email invitations scoped to one Initiative, with simulated delivery (copyable link). States: pending, accepted, expired, cancelled, declined, revoked. Resend and cancel. Wrong-email refusal. New-account path with OTP. Revocation with a reason. Initiative groups with allocation and transfer history, plus Coach handover history. | Replaced the old "team code" flow that granted access to the whole organization. |
| Coach & student | One assignment/review engine for both parents (Initiative group and independent Coach group). Separate fields for student-visible feedback and Supervisor-only notes. Every submission attempt is preserved. **Activities → Assigned** on the regular Individual page. Periodic Coach reports. | Reused `mentor.assignment.create`, `mentor.review` and `student.submit`, extended with grant checks. |
| Sessions & attendance | Sessions per Initiative: create, publish, reschedule (with notices), cancel. Seats by mode. `Needs Supervisor` gate. Session registration is separate from membership. Real rendered QR plus typed code. Online roster verification. Manual exception with a reason. Late, Absent and close-out. Correction history. Repeated check-ins are rejected. | New. The Representative-only attend command was removed. |
| Excuses | Student → Supervisor recommendation (Accept, Reject or More information) → Representative final decision. Factual attendance stays `Absent`; the UI shows "Excused Absence". No attendance reward is given for an accepted excuse. | New. |
| Reports & Gardens | Representative Reports and Supervisor Insights are computed from records, with denominators and provenance. Chain: Coach report → Supervisor summary → Representative, with drill-down to the originals. One Group Garden per Initiative. Personal Garden rebuilt to exactly four practice trees plus bounded flower, rabbit and birdhouse. | Garden 3D engine kept; its data model was replaced. |
| Integrations | Member header shows identity, lets you switch person (demo) and shows real notifications. Register and Login use the same canonical people. Insights has an "Institution initiatives" card. Admin suspension notifies participants. First-run handoff repaired. | Small, targeted edits. |
| Design | `institution.css` provides one shared visual layer (`iw-` components) for the Representative, Supervisor and Coach. Fraunces display type. Purposeful motion that respects reduced-motion settings. Responsive layouts. | New layer on the existing workspace tokens. |

---

## B. Architecture

### Partitions
- **Operational partition:** `localStorage["deepsprout-ecosystem-demo-v1"]` (P1). It is now **schema 2** and holds the canonical people, grants, resources, Applications, groups, assignments and submissions, session registrations, factual attendance, excuses, reports and notices.
- **Private personal journal:** remains the account event log (P2). It now has a third key family, `deepsprout-account-changes-v1:person:<personId>`. The existing `:demo` and `:empty` keys are untouched.
- Lab, Shield and Recovery data never enter P1. Staff selectors cannot read them.

### Identity
- One session subject (`session.personId`) is shared by member and partner pages.
- `Person.individual` marks the full Individual capability. `Person.journal` binds the person to a private journal. The seeded demo story (Ahmad) is bound to `journal:'demo'`.
- Regular Register creates a canonical person (`member.register`). It refuses an email that already exists instead of merging it. Regular Login selects the person by email.
- Partner invitations reuse the person whose email matches. They never merge identities on an unverified email.

### Grants
- A grant is `{personId, role: supervisor|coach, scopeType:'initiative', scopeId, status, history}`.
- Workspace access is derived:
  - Supervisor workspace: a Provider appointment **or** an active Supervisor grant.
  - Coach (`mentor`) workspace: an approved Coach application **or** an active Coach grant.
  - Institution workspace: an approved Institution application **and** membership of that organization.
- Every new command checks its own authority, because new command prefixes such as `initiative.*` and `member.*` are not covered by the old workspace-area gate.

### Shared rules
`Client/src/workspaces/initiative-rules.js` holds the rules that both commands (writes) and screens (reads) use:
- Seat invariant: seats used = Accepted + Suspended + live Offered. The cap is `min(capacity, 135)`.
- At most 3 active Supervisors.
- `needsSupervisor`.
- Registration state, execution phase and session windows.

### Read models
`Client/src/shared/selectors.js` is pure functions only:
- `exploreInitiatives`, `myInitiatives`, `assignedTasks`
- `personalGardenEffects`, `initiativeGarden`
- `sessionRoster`, `staffFor`

They read the original records and **never copy them**. Explore does not write Initiatives to `listings.json`, and Individuals do not keep a second Application log.

### Member bridge
`Client/src/shared/member-bridge.js` is an ES module that exposes `window.DeepSproutRepo` to the classic member scripts:
- `read`, `run`, `me`, `selectors`, `notifications`, `signInAs`
- events: `deepsprout:repo` and cross-tab `storage`

`member-layout.js` injects it on every member page.

### Migration (`Client/src/workspaces/migrate.js`)
- Runs only on schema 1. It first copies the raw graph once to `deepsprout-ecosystem-demo-v1:backup:schema-1`.
- It then adds the new collections and seed records **only if their parents still exist**.
- It converts enrollments into Applications, keeping `legacyEnrollmentId`.
- It sets `anonymous:false` on forms and keeps earlier anonymous answers labelled as legacy.
- It is idempotent: a second run is a no-op (NODE test).
- The seed itself is built through the same `migrate()`.

### Demo clock
- `nowMs(s)` applies `s.clock.offsetMs`, and `now()` uses the same offset (set by `read()`). Record timestamps, eligibility windows, waiting-list and invitation expiry, OTP expiry and Provider offer checks all agree on one operational "today".
- Controls are in the workspace "Development demo" panel: **Set demo date** (absolute, `demo.clock {at}`), +1 hour, +24 hours, +7 days and Reset.
- Tests pin the clock to 15 Oct 2026 09:00 (Asia/Amman). The Node suites still pass with the system clock shifted 30 days ahead.

### Reset scope
`DeepSprout.reset()` (`storage.js`) used to delete **every** `deepsprout-*` key. It now clears only its own personal page keys.

### Configurable demo defaults (not final policy)
| Setting | Default |
|---|---|
| Offer hold | 24 h |
| Invitation expiry | 7 days |
| Check-in window | Not enforced (`settings.enforceCheckInWindow`) |
| Personal tree stages | at 1 / 3 / 7 / 12 sources |
| Flowers | at 3 / 10 / 21 routine days |
| Rabbits | up to 3 |
| Birdhouse | 1 |
| Group Garden milestones | at 1 / 5 / 15 / 35 / 70 |
| Suspension | keeps the seat |

---

## C. Page inventory (modified or added)

| Role | Route / page | State |
|---|---|---|
| Representative | `#/organization/dashboard` | Rebuilt: hero, Initiative scope, 135 and 3-Supervisor meters, action queue with exact links, progress rings, agenda, mini Group Garden, activity feed derived from records. |
| | `initiatives`, `initiatives/:id` (+ `?tab=history`), `initiatives/new`, `initiatives/:id/edit` | Rebuilt list and detail. Lifecycle actions: Publish, versioned Update details, Close/Reopen applications, Complete (per-student criteria), Cancel with reason, Archive, Duplicate. Linked partner resources (aggregate only). Six-stage builder. |
| | `participants` | New Applications & Students queue: status tabs, details modal, reasoned discipline actions. |
| | `team` (`?tab=staff` and `?tab=groups`) | New staff invitations, grants and revocation; groups with allocation and transfer. |
| | `sessions`, `sessions/:id` | Rebuilt list and calendar, Needs Supervisor banner, duty assignment, reschedule/cancel, read-only roster. |
| | `attendance` | New final excuse decisions plus factual attendance counts. |
| | `reports`, `group-garden` | New. |
| | `forms`, `competitions`, `partners`, `settings` | Retained. Forms are now identified (no anonymous option). |
| Supervisor (Initiative mode) | `#/supervisor/dashboard`, `applications`, `students`, `coaches`, `schedule` (+ `/:id`), `attendance`, `excuses`, `reports`, `group-garden` | New Initiative mode. Provider mode is kept behind an "Initiative duty / Provider appointments" switch. The Provider cohort Group Garden is replaced by an explanation, because master §9.1 rules it out. |
| Coach | `#/mentor/dashboard`, `groups`, `groups/:id`, `students`, `assignments`, `reviews/:id`, `reports?scope=initiative`, `group-garden` | Initiative groups added beside independent groups. Supervisor-only note. Periodic Coach report. Initiative Group Garden. |
| Auth | `#/auth/staff-invitation/:token`, `#/auth/institution-invitation` | New acceptance flow (existing or new account, OTP, wrong-email and expired states). |
| Admin (workspace) | `#/admin/initiatives`, `programs` | Suspend/restore now records history and notifies participants. Institution groups are labelled in the group overview. |
| Shell | `workspaces.html`, `app.js`, `navigation.js` | Fonts and `institution.css`, demo clock, links to the Individual app, entrance motion, "Coach" label. |
| Individual | `explore.html` | Live verified Institution Initiatives, application flow with Application ID, **My Initiatives** section. Fixtures are now honestly labelled "Sample listing". |
| | `training.html` | New **Activities → Assigned** section. |
| | `garden.html` | Four-tree Personal Garden, bounded decorations, link to the separate Group Garden. |
| | `insights.html` | "Institution initiatives" card. |
| | member header (`member-layout`) | Identity, demo person switch, staff workspace links, real notices. |
| | `register.html`, `login.html` | Canonical person. |
| | `starting-point.html`, `assessment.js` | First-run handoff repaired. |

---

## D. Functional cycle as implemented

1. **Admin approves the Institution and its Representative.** Existing `admin.application.decide` flow. The workspace is enabled.
2. **The Representative builds the Initiative in six stages:**
   - Basic info: title, topic, objective, summary, description, approved cover image with alt text, dates, time zone, ownership.
   - Audience: eligibility, ages, requirements, consent, country and coverage (kept separate from headquarters), modes, venue, online details, capacity 1–135, application window, Free or Paid with a simulated-payment disclosure, withdrawal text.
   - Components: awareness content, session, workshop, identified survey or quiz, competition link, structured group activity, Coach Program link, Provider link.
   - Staff & groups: invitations, statuses, preliminary groups.
   - Policies: waiting list and offer hours, discipline, attendance, excuse, make-up, completion, privacy, notices, optional identified registration form.
   - Preview: Explore card and detail preview, blockers with "go to stage" links, warnings that are not blockers (no Supervisor yet, no Coach yet, Paid).
3. **Draft and publish.** A draft never appears in Explore. Publish runs `publishBlockers`. A missing Supervisor is **never** a blocker. Session components become session records, published unless opted out. Survey components become identified draft forms.
4. **Staff invitations** use email links with simulated delivery. Acceptance needs a signed-in, verified person whose email matches, an invitation that is still pending and not expired, and a free Supervisor place (maximum 3 active). It creates a grant and adds the workspace. No Admin step is involved.
5. **The Individual applies from regular Explore.** Age and consent are checked; blocked people and duplicate applications are refused. One `APP-…` code is issued. It appears in My Initiatives, the Representative's queue and the Supervisor's queue.
6. **Approval.**
   - The Representative or an active Supervisor approves once.
   - If seats are full, the applicant goes to `Queued` when the waiting list is on.
   - When a seat is released, the next person gets `Offered` with a 24-hour hold. They can accept or decline; if the hold expires, the next person is offered.
   - Only the Representative can Reject, Suspend (seat retained), Restore, Remove or Block, always with a reason and a notice.
   - The student can Withdraw.
7. **Groups.** The Representative or an active Supervisor creates groups, allocates and transfers accepted students (with history), and allocates active Coaches (with handover history). The Coach sees only their allocated group(s).
8. **Tasks.**
   - The Coach assigns an approved practice to the whole group or to one member.
   - The task appears in the regular **Activities → Assigned** and in Invited Student **My Tasks**.
   - Flow: Start → Submit → Needs Revision / Rejected / Approved, with every attempt kept.
   - Feedback is shown to the student. Internal notes are shown to staff only.
9. **Sessions.**
   - Accepted students register per session and per mode.
   - In-person bookings show a rendered QR and a code.
   - The responsible Supervisor is assigned per session. Until then the session shows `Needs Supervisor` and attendance cannot be recorded.
   - The Supervisor checks people in by QR or code, confirms online participants from the roster, records manual exceptions (with a reason) and Late arrivals, closes attendance (everyone left unrecorded becomes Absent and is notified), and corrects records with a before/after history.
10. **Excuses.** Absent student explains → Supervisor recommends → Representative decides → student is notified. Attendance stays Absent.
11. **Reports.** Coach periodic report (counts captured from records automatically) → Supervisor Insights and summary (Coach reports attached automatically) → Representative Reports with drill-down to the original records and a CSV of permitted fields.
12. **Completion.** The Representative marks the Initiative complete per student against the published criteria:
    - completers move to `Completed` and get a separate Completion record;
    - pending applications close;
    - the Group Garden shows "Initiative completed";
    - the Personal Garden gains nothing.
    The Initiative can then be archived.
13. **Admin governance.** Suspend or unpublish removes the Initiative from Explore and blocks new applications, while keeping history, and notifies participants.

---

## E. Cross-workspace integration (original record → readers)

| Original record (writer) | Readers where the change is visible | Evidence |
|---|---|---|
| `initiatives[i]` (Representative builder) | Regular Explore card and detail; Representative pages; Supervisor and Coach scope; Admin governance | BROWSER A2, A4, A9 |
| `staffInvites[k]` → `grants[g]` (Representative → invitee) | Invitation page; Team page; Supervisor/Coach workspace access | BROWSER B2, B3, NEG; NODE B |
| `admissions[a]` (`member.application.submit`) | My Initiatives; Representative Applications; Supervisor Applications (same `APP-` code) | BROWSER C1, C2; NODE C |
| `groups[x]` with `parentType:'initiative'` | Representative and Supervisor groups; Coach groups and students; My Initiatives (group and Coach); Group Garden | BROWSER C3 |
| `assignments` / `submissions` (Coach, student) | Activities → Assigned; Coach reviews; Supervisor Insights; Representative Reports; Personal and Group Gardens | BROWSER D1–D3; NODE D |
| `sessionRegistrations` / `sessionAttendance` | My Initiatives (QR, status); Supervisor desk; Representative session roster and reports; Personal Garden rabbit; Group Garden | BROWSER E1–E3 |
| `excuses[e]` | My Initiatives ("Excused Absence"); Supervisor excuses; Representative decisions; reports | BROWSER E3; NODE E |
| `coachReports`, `supervisorSummaries` | Supervisor Insights; Representative Reports (open original) | BROWSER F1 |
| `completions`, initiative `Completed` | My Initiatives; Insights; Group Garden milestone; Explore (removed from discovery) | BROWSER F2 |
| `notifications` (`recipientId`) | Member header bell; workspace notices | SOURCE + BROWSER rendering |

---

## F. UI/UX

### Design system
`Client/src/workspaces/institution.css` provides:
- ivory and sage tokens, Fraunces display type
- head, hero, stat tiles with animated meters
- attention queue with critical pulse
- banners, pills, tabs, scope switcher
- bars, funnel and progress rings for charts
- history timeline and activity feed
- Initiative cards and detail hero, agenda, calendar
- group cards, attendance desk and roster, excuse chain, report lists
- Group Garden SVG with staged growth
- builder stepper and sections
- Explore-card preview in the builder

Member-side additions in `explore.css`, `training.css`, `garden.css` and `member-layout.css` use the member `style.css` tokens.

### Motion
- Staggered `iw-reveal` page entrance.
- Count-up of real values only.
- Meters, bars, funnel and rings grow into place.
- Builder stage transition.
- Dialog entrance.
- Group Garden stages grow upward.
- Explore keeps its sheet-from-card transition.
- Everything is switched off under `prefers-reduced-motion` (BROWSER RM).

### Accessibility
- Native buttons and selects, `aria-current` on tabs and steps, `role="alert"` errors focused after a failed Continue.
- Labelled QR (`role=img`) with a typed-code fallback.
- Keyboard-focusable Garden objects with text tooltips.
- Live regions for counts.

### Responsive
- Splits collapse to one column under 1100 px; the builder stepper becomes a horizontal strip under 900 px.
- Under 760 px: two-column stat grid and one-column facts.
- No horizontal page scroll at 390 px on the Representative dashboard or Explore My Initiatives (BROWSER MOB). A real overflow of 17 px in My Initiatives was found and fixed.

---

## G. Testing (commands actually run)

The browser runs use `BASE_URL=http://127.0.0.1:8799` against `python3 Client/serve.py --port 8799`.
- The tooling (`playwright-core 1.48.2`, `jsdom 24.1.3`, `pngjs 7.0.0`) was installed in a **scratch folder outside the repository**.
- The browser is the system Google Chrome.
- No package was added to the app.

| Command | Result |
|---|---|
| `node --test Client/tests/partner-store.test.mjs` | **10/10 Pass** after two deliberate assertion changes in test 3 (see H). |
| `node --test Client/tests/institution-cycle.test.mjs` (new) | **10/10 Pass**. Covers: Scenario A–F command paths, 135th accepted and 136th queued, 3rd/4th Supervisor, wrong-email, expired and cancelled invitations, duplicate approval, Supervisor discipline denied, Coach scope, QR replay, manual reason, Absent + accepted excuse with no rabbit, completion with no Garden object, migration idempotence. |
| `node Client/tests/page-wiring.test.cjs` | **14 pages OK**. |
| `NODE_PATH=… node Client/tests/member-journey.test.cjs` | **14/14 Pass (JSDOM)**. First real run: Phase 0 skipped it. The harness now skips `type="module"` scripts, which jsdom cannot evaluate. |
| `node Client/tests/institution-browser.test.cjs` (new) | **25/25 Pass (BROWSER)**: A1–A4, A9, B2, B3, C1–C3, D1–D3, E1–E3, F1–F3 (F3 = archive keeps history, reports and My Initiatives), NEG, FR (first run), MOB ×2, RM, CONSOLE (zero console errors or page exceptions). The clock is pinned to 15 Oct 2026 09:00 Asia/Amman. |
| `node --import <shift +30 days> --test …partner-store… …institution-cycle…` | **20/20 Pass**: the date pin holds when the system clock reads 14 Nov 2026. |
| `node --test Client/tests/partner-browser.test.cjs` | **Pass (BROWSER)**: 100 desktop route states plus the original walkthroughs. Two assertion updates and the old builder sequence updated (see H). It writes to `Client/docs/validation/partner-workspaces/`; those historical files were **restored from Git** after the run and the new outputs were archived outside the repository. |
| `node --test Client/tests/admin-dashboard.test.cjs` | **Pass (BROWSER)**. |
| `node --test Client/tests/admin-member-integration.test.cjs` | **Pass (BROWSER)**. Legacy Admin → member bridges are intact. |
| `node --test Client/tests/product-journey.test.cjs` | **Fail: pre-existing and unrelated.** It compares `hero-reels-lab.html` journey markup with Git HEAD; that markup is absent there. This cycle did not touch it. Its `validation.json` output was restored. |
| Hero, reels, way-back, vortex and other animation suites | **Not Tested** (outside this cycle). |

**Scenario status (master §25 / prompt §16):**

| Scenario | Status | Note |
|---|---|---|
| A | **Pass** (BROWSER) | |
| B | **Pass** (BROWSER) | Revocation and expiry in BROWSER NEG plus NODE. |
| C | **Pass** (BROWSER) | The 135/136 and 3/4 limits are proven in NODE only. |
| D | **Pass** (BROWSER) | |
| E | **Pass** (BROWSER) | |
| F | **Pass** (BROWSER) | Includes completion and archive. |
| Personal first run | **Pass** (BROWSER FR) | The four timed tasks were not played; their exact recorded event was written instead. The final-task button now goes to Starting Point (SOURCE). |

---

## H. Reuse and replacement

**Retained**
- Partner store dispatch and the persistence model.
- All Provider booking, waiting-list, appointment, cohort and attendance commands, untouched apart from the clock helper.
- The independent Coach Program builder, groups, invitations and Student workspace.
- Partner Admin governance and CMS.
- Legacy Admin and its member bridges.
- Forms and competitions engines.
- Explore page design, sheet and motion.
- Garden low-poly engine.
- Builder engine, extended with per-step validation and step jumping.

**Replaced**
| Replaced | Reason |
|---|---|
| Institution dashboard, initiatives, sessions, team and participants renderers | Wrong authority model and no Applications or grants. |
| `auth.institution.invite` | Granted access to the whole organization. |
| Representative-only attendance | Superseded by the D37/D38 Supervisor rule. |
| `participant.enroll` semantics | Now creates an Application. |
| Anonymous forms | D41. |
| Personal Garden data model | D07–D11: no journey tree and no inactivity dimming. |
| Global prefix reset | Data-loss risk. |

**Test changes (deliberate and documented in comments)**
- `partner-store.test.mjs` test 3: the publish payload now includes a summary and consent, which §15.2 requires; responses are asserted as identified (D41).
- `partner-browser.test.cjs`:
  - builder steps follow the §15.2 order;
  - the identified response is asserted (D41);
  - "Anonymous response" is replaced by the respondent's name.
- `member-journey.test.cjs`: skips ES-module scripts under jsdom.

---

## I. Remaining gaps and demo limitations

1. **Security and durability are simulated.**
   - Browser-local, forgeable state; sign-in is a demo shortcut with no password check.
   - One session per origin, so two tabs signed in as different people overwrite each other. Switch identity, then reload.
   - QR codes are unsigned.
   - Concurrency is last-write-wins.
   - Notices are visible inside the app only; no email is sent.
2. **Provider → regular Individual** is still not connected (master Scenario D). Provider experiences in regular Explore are fixtures, and the Provider offer hold is still the old 15-minute setting rather than the 24-hour default. The Initiative waiting list does use 24 hours.
3. **Forms and competitions are not answerable from regular Individual pages.** They still go through partner Participant routes. Forms are now identified, and their counts appear in Representative Reports.
4. **Home Garden preview** now draws the same four practice-type trees from the shared policy. `account.garden()` (old journey model) still exists for compatibility but nothing on Home or Garden reads it any more.
5. **Weekly Lab** official window (D05) is not changed.
6. **Supervisor "Flag/Escalate" on an application** is not implemented. "Request staffing" is.
7. **Initiative detail tabs** for Forms, Competitions and Activities link to the global pages filtered by Initiative rather than embedding them.
8. **Session Supervisor duty** can be assigned only after publication, when session records exist.
9. **Excuse attachments** keep the file name only. **Check-in window** enforcement is off by default.
10. **Camera QR scanning** uses `BarcodeDetector` where the browser supports it. A typed or pasted code is always available.
11. **Legacy and workspace Admin** remain two implementations, as master §19 already records.
12. **Upgrading an Invited Student** sets `individual` and journal binding on the **same** person. The personal four-assessment journey then starts from an empty journal.
13. **Responsive checks** were automated at 390 px for two pages, plus the partner suite's 390 and 768 px screenshots. Other pages were checked only at desktop width.

---

## J. Changed files

All edits are uncommitted and were layered on the pre-existing uncommitted work, without stash or reset.

**New**
- `Client/src/workspaces/migrate.js`
- `Client/src/workspaces/initiative-rules.js`
- `Client/src/workspaces/commands/initiative.js`
- `Client/src/workspaces/data/initiative-ops.js`
- `Client/src/workspaces/institution.css`
- `Client/src/workspaces/pages/institution/{common,initiatives,participants,team,operations,reports,garden,supervisor}.js`
- `Client/src/shared/{selectors,member-bridge}.js`
- `Client/src/pages/member/training/assigned.js`
- `Client/assets/vendor/qrcode/{qrcode.js,README.txt}` (MIT, header retained)
- `Client/tests/institution-cycle.test.mjs`
- `Client/tests/institution-browser.test.cjs`
- this report

**Modified**
- `Client/src/workspaces/{store,domain,app,navigation}.js`
- `Client/src/workspaces/commands/{institution,mentorship,platform}.js`
- `Client/src/workspaces/builders/{engine,initiative,form}.js`
- `Client/src/workspaces/pages/{organization,supervisor,mentor,auth,admin}.js`
- `Client/workspaces.html`
- `Client/src/js/data/account.js`
- `Client/src/js/utils/storage.js`
- `Client/src/layouts/member-layout/member-layout.{js,css}`
- `Client/src/pages/member/explore/explore.{js,html,css}`
- `Client/src/pages/member/training/training.{html,css}`
- `Client/src/pages/member/garden/garden.{js,html,css}`
- `Client/src/pages/member/insights/insights.{js,html}`
- `Client/src/pages/member/onboarding/starting-point.{js,html}`
- `Client/src/pages/public/home/home.js` (four-tree preview)
- `Client/src/workspaces/commands/outdoor.js` (operational clock only)
- `Client/src/pages/member/lab/assessment.js`
- `Client/src/pages/auth/{register,login}/*.{js,html}`
- `Client/tests/{partner-store.test.mjs,partner-browser.test.cjs,member-journey.test.cjs}`
- the status sections of `README.md`, `Client/README.md` and `docs/README.md`

**Migration and compatibility**
- First load of an existing schema-1 graph writes a one-time backup key, then upgrades in place.
- Old enrollments remain and are aliased.
- `:demo` and `:empty` journals are unchanged.
- To return to the seeded state, use the workspace "Reset partner demo data" control. It resets only the operational partition.

**Presenter protocol (one session per origin)**
- Use one browser window.
- Switch person with the member header's **Switch person (demo)** or the workspace **Development demo** panel. This is a local email sign-in that also works off localhost; it is not authentication.
- Reload after switching. Two windows open side by side act as whichever person signed in last.
- Before presenting the seeded story, use **Set demo date** to a day between **14 and 30 October 2026**, which is when *Start Today* is open for applications, for example 16 Oct 2026 10:00. A freshly built initiative works on any date its own windows allow.

**What is ready for the graduation demo**
- Seeded `Start Today` (Horizon Youth Center): Representative Maya, active Supervisor Hala, Coach Karim, accepted students Noor and Rania, pending applicant Omar.
- Or a fresh Initiative built live by any approved Representative.
- Every step in section D can be shown live, across workspaces and after reloads, using the person switch in the member header or the workspace "Development demo" panel and the demo clock.
