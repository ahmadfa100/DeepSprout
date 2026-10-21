# Independent Coach cycle: implementation report

**Date:** 16 October 2026.

**Builds on:** the [Institution cycle report](institution-cycle-implementation-report.md) and the [Supervisor cycle report](supervisor-cycle-implementation-report.md). Both reports are unchanged and remain the record of that earlier work.

**Authority:** [`DeepSprout.md` v4.0](../../DeepSprout.md): §2.3, §9 (Group Garden), §13 (Coach, Program, shared engine), §14 (Invited Student and Individual continuity), and decision D12.

**Boundary:** this is the Phase-1 static browser demo.
- Login, OTP, email delivery and identity verification are simulated, and the UI says so.
- No backend was added and nothing was committed.

**Evidence labels:**
- **BROWSER:** real headless Google Chrome, driven by `playwright-core`, in an isolated context that starts with empty storage. The clock is pinned to 15 Oct 2026 09:00 (Asia/Amman).
- **NODE:** command and read-model tests.
- **SOURCE:** the code was inspected only.

---

## 1. Implementation summary

The cycle now runs end to end through the real UI. Every step uses the original shared records:

> Join as Partner → Coach application → Platform Admin approval → Coach workspace → Program → Groups → private invitation → Student verifies and accepts → assignment → submission → revision → approval → progress and Group Garden → Coach report → Program completion → Student sees completion → same-identity upgrade → regular Individual pages.

**Two Coach contexts, kept separate.**

| Context | Granted by | What it allows |
|---|---|---|
| Independent Coach | An **Approved** `mentor` application (`coach-rules.js › isIndependentCoach`) | Owning Programs, Groups and invitations |
| Institution-invited Coach | An active Initiative grant (unchanged) | Teaching the Initiative groups the Institution allocates. Grants nothing independent. |

- One person can hold both contexts. A scope selector (`iw-contexts`) lets them switch, and each page uses the authority for the selected scope.
- The Institution-only Coach `p-karim` can open the Coach workspace through his grant, but every independent command refuses him with an explanation.
- Verified with a real dual-context person: Lina is an approved independent Coach **and** accepts an Institution Coach invitation for *Start Today*, then is allocated *Circle B · Steady pace*. One Person ID; the scope chips switch dashboard and groups between the two contexts. Private invitations into, or re-parenting of, the Institution group are refused (NODE; BROWSER X10).

**Each Group has exactly one parent: an Initiative or a Program.**
- Independent groups are created under a Program, with `parentType:'program'` and `programId`.
- Initiative groups keep `initiativeId`.
- Legacy parentless groups are not given an invented Program. They are flagged, and invites and tasks are blocked until the Coach attaches one.

---

## 2. Actual Independent Coach lifecycle

| Stage | What happens (and where) |
|---|---|
| Register / apply | `#/auth/register/partner` → Coach/Mentor → account (canonical person, reused by email) → simulated OTP `246810` → professional application (title, specialization, years, focus, biography, experience, topics, phone, optional document names) → review → submit. The status page shows Submitted / Pending Verification / Needs More Info / Rejected / Suspended. |
| Approval | Admin `admin/mentor-applications/:id` → Approve, Needs More Info (the applicant responds), Reject or Suspend, each with a reason. **New:** every decision sends the applicant a notice. The application's message history is kept. |
| Workspace | Opens only after approval, or through an Initiative grant (Institution scope only). A first-time dashboard leads with "Build your first Program". Pending, info-request, rejected and suspended states appear as an approval banner. |
| Program | Draft → Published ⇄ Paused → Completed or Cancelled (with a reason) → Archived. History is recorded at every step. |
| Groups | Created in the builder (step 2) or from My Groups or the Program page. Each must belong to one of the Coach's own Programs. |
| Invitations | Email-scoped, one use, expiry from the Program policy. Shown as a copyable link (no email is sent). Can be resent (a new token replaces the old), revoked or declined. |
| Students | A new Invited Student (OTP) or an existing account (signed in, matching email, Accept / Decline). The canonical identity is reused. |
| Work | One shared engine: Assigned → In Progress → Submitted → Approved / Needs Revision / Rejected. Resubmission keeps every attempt. |
| Reports | Program / group / period selection. Metrics are computed from records. Observations are saved as a draft or finalized. History and CSV export are available. **No Supervisor step.** |
| Completion | Eligibility per student under the declared rule → finalize → `programCompletions` records, groups close, a collective milestone is added. **No Personal Garden object.** |
| Upgrade | Student → full Individual with the same Person ID. All history is kept, and an empty personal journal begins. |

---

## 3. Existing functions reused

- **Assignment/submission/review engine** in `commands/mentorship.js`:
  - `groupAuthority`, `startTask`, `submitTask` and `mentor.review` are the same functions the Institution Coach uses.
  - Institution test D2 still sees exactly three history entries.
  - New fields were added to history entries; no extra entries were added.
- **`reward()`**: source-keyed deduplication is unchanged; there is one reward per approved submission.
- **Regular Individual pages:**
  - `selectors.assignedTasks` drives Activities → Assigned.
  - `member.task.start/submit` is the same engine.
  - `personalGardenEffects` gives one tree per approved practice.
- **UI building blocks:** the shared builder engine (`builders/engine.js`), the Institution `iw-` UI vocabulary (`head`, `stats`, `card`, `attention`, `bars`, `ring`, `feed`, `pill`), and `collectiveScene` from the Initiative Group Garden.
- **Unchanged flows:** the Admin application decision flow, the simulated OTP and the partner account entry.

---

## 4. New or modified features

**New modules**
- `coach-rules.js` contains pure rules:
  - independent authority;
  - Program ⇄ Group parentage and mirror sync;
  - invitation status;
  - task state, including derived Overdue and Cancelled;
  - completion eligibility;
  - the bounded per-group Group Garden;
  - source metrics (Overdue is judged at the earlier of the period end and today);
  - Program history for a person.
- `pages/coach/independent.js` contains the independent pages:
  - dashboard;
  - Groups and group detail;
  - Students and student detail;
  - Programs and Program detail (overview, tasks, completion, Institution link, history);
  - Group Garden;
  - Reports.

**Rewritten modules**
- `pages/mentor.js` is a scope-aware router. The Institution-invited Coach pages (Initiative dashboard, group detail, roster, Coach report) are kept.
- `pages/student.js` gained:
  - a dashboard with a Program/group summary, the next task, notices and recent feedback;
  - Overdue and Cancelled states;
  - attempt history;
  - a Group Garden for the student's group;
  - a completion badge;
  - Program history.

---

## 5. Registration and Admin approval

| Check | Result |
|---|---|
| Partner pathway, canonical account, simulated OTP, application fields | **PASS** (BROWSER C1) |
| Submitted, then Admin Needs More Info, applicant response, Approved | **PASS** (NODE) |
| Admin approval from the UI | **PASS** (BROWSER C2) |
| A notice for every decision | **PASS** (NODE, BROWSER C2) |
| Application message history preserved | **PASS** (NODE) |
| Workspace closed until approval; an unapproved applicant cannot save or publish | **PASS** (BROWSER C1, X4; NODE) |
| Suspended: independent operation refused, Programs preserved | **PASS** (NODE) |
| Institution-only Coach: Coach workspace for Initiative groups only; Program builder shows "Independent Programs need approval"; commands refused | **PASS** (BROWSER X5; NODE) |

Identity verification is labelled simulated throughout.

---

## 6. Program Builder and lifecycle

The builder keeps its five steps on the shared engine. The six-stage Initiative Builder is not used for Programs.

| Step | Contents |
|---|---|
| 1 Basics | Title, description, objective, focus, duration, audience, eligibility |
| 2 Groups & schedule | Start and end dates; existing groups; new groups (name, purpose, capacity) |
| 3 Stages | Stage title, objective and date |
| 4 Activities & policies | Approved catalog activities, required flag, Coach review, completion rule (all required, or a percentage — labelled a configurable demo policy), invitation expiry in days, student consent text |
| 5 Review & publish | Preview |

**Publishing**
- Publishing creates one task per stage × activity × group, keyed by `sourceKey`, so it happens once.
- It runs again for a group created later or attached later; existing tasks are never duplicated.
- Publishing never admits anyone, and Programs never appear in Explore.

**Edit future details** (Published or Paused)
- Editable: description, objective, audience, eligibility, consent and end date (later only).
- You can also add future stages; these add tasks.
- Each edit is a new version of the **same Program ID**. Existing tasks and submitted work are never rewritten (NODE checks this byte for byte).

**Lifecycle actions**

| Action | Rules |
|---|---|
| Pause | Reason required. Blocks new tasks, invitations and joins. Current work can still be submitted and reviewed. |
| Resume | Returns the Program to Published. |
| Cancel | Reason required. Cancels active tasks, revokes invitations and closes groups. History is kept. |
| Archive | Only from Draft, Completed or Cancelled. |
| Create new revision | A new draft. It never takes over the existing groups. |

---

## 7. Groups and invitation states

**Groups**
- A group can be created and edited.
- It can move to another of the Coach's Programs only before any work has been submitted under it.
- Archiving revokes open links.
- Removing a member, and approving or declining a membership request, are each recorded on a membership record with history and a notice.
- No fixed size limit: capacity is the Coach's own input (1–500).

**Invitation states**
- Active, Accepted, Declined, Revoked, Replaced, Expired, Exhausted.
- The page can also show Closed (Program not running, or Coach not approved), Already joined, Pending approval and Group full.
- Wrong email: a signed-in account with a different email sees "This invitation is for another email". The OTP path refuses the wrong email and creates no person.
- Duplicate acceptance is refused.
- When a Program completes or is cancelled, its open invitations are revoked.

All of the above: **PASS** (BROWSER C6–C7, X1–X3, X7; NODE).

---

## 8. Invited Student and Individual integration

**Invited Student workspace**

| Page | Contents |
|---|---|
| Dashboard | Program/group summary, next task, notices, recent feedback, completion badge |
| My Tasks | Due dates, instructions, start, submit/resubmit, every attempt and decision; Overdue and Cancelled shown with the reason |
| My Group | Coach, Program schedule, member count only, group milestones |
| Group Garden | The garden of the student's own group only |
| My Progress | Own history and Program completion status |
| Notifications | Own notices (assignment, review, membership, Program changes); nothing is emailed |
| Account & upgrade | Membership table |

- The four Lab assessments are never required.
- The sidebar has no Personal Garden, Lab, Shield or Recovery entry (BROWSER C8).

**D12 (Group Garden only until upgrade)**
- `selectors.hasPersonalGarden` hides Personal Garden effects on the regular Garden and Home pages for a non-upgraded Student.
- The selector's raw source effects are unchanged, because an earlier Supervisor test depends on them.

**Existing full Individual**
- A signed-in Individual with the matching email accepts with the **same** person (no new identity).
- Group tasks appear in **Activities → Assigned** from the same Assignment records (BROWSER X1).
- If a Program has ended, Assigned shows that new submissions are paused.

**Upgrade** (`account.upgrade`)
- Same Person ID, `individual: true`, and the journal `person:<id>`, which starts an empty personal journal.
- An upgrade history entry is recorded.
- Membership, every attempt, review decisions, completion and Group Garden access are preserved (BROWSER C19–C20, after reload).
- Insights → "Beyond the screen" shows a new **Coach programs** card from `programHistoryFor`.

---

## 9. Assignment, submission and review workflow

**Creating a task**
- Pick an approved activity (Depth Practice, Listening & Recall, Practical Micro-Challenge or Protected Work).
- Choose the whole group or one member, required/optional, start and due dates, instructions and evidence.
- Allowed only while the Program is Published.

**Changing a task**
- Reschedule needs a reason: `version++`, the earlier due date is kept in history, and students are notified.
- Cancel needs a reason; existing submissions are kept.

**Submissions**
- Each submission records `attempt` and `assignmentVersion`.
- The review decision history records the attempt and version.
- Student-visible feedback and the internal note are separate fields.
- The Student never sees the internal note (BROWSER C12).

**Review authority**
- Program groups: the owning Coach, with independent approval.
- Initiative groups: the current Coach, with an active grant.
- A foreign approved Coach is refused for review, invitations and assignments, and cannot open the group, roster or submission pages (BROWSER X6; NODE).

**Duplicates**
- A repeated review is refused, and the decision buttons disappear.
- There is one reward per submission (BROWSER C15, X7).

**Notification links**
- Limited Students are sent to `#/student/tasks/:id`.
- Full Individuals are sent to Activities → Assigned.

---

## 10. Coach reporting

`mentor/reports` (independent scope) offers:
- Program, group and period selectors.
- Counts: students, tasks assigned, submitted, approved, needs revision, rejected, overdue, eligible.
- Review-outcome bars.
- Approvals by week (trend).
- Completion rings.
- Observations, concerns and next steps, saved as a draft or **Finalize report** (read-only afterwards).
- Report history.
- Per-student CSV export.

Reports are stored in `coachReports` with `parentType:'program'` and `programId`. The Institution pages filter by `initiativeId`, so these reports never appear there. **No Supervisor step** is involved (BROWSER C16; NODE).

---

## 11. Independent Group Garden

There is **one collective garden per independent Coach group**. Three groups give three gardens (BROWSER C15 checks that Circle B's garden is separate).

The garden grows only through bounded milestones:
- First root
- Every member contributed
- Each Program stage reaching quorum. The quorum is 60%, a labelled configurable demo policy.
- Program completed

Rules:
- Each approved submission counts once.
- Extra tasks or approvals cannot add milestones (NODE: six extra approvals leave milestones unchanged).
- There is no manual growth.
- The scene reuses `collectiveScene`, with milestone animation disabled under reduced motion.

The Institution rule is unchanged: one garden per Initiative. There is still no Provider Group Garden.

---

## 12. Program completion

The completion tab shows the declared rule, each student's required-approved / needed count, eligibility with the reason, and the recorded outcome.

**Finalizing**
- Refused while any submission still awaits review.
- Writes one `programCompletions` record per member: Completed or Not completed, with counts, the rule, the Program version, the decider and the time.
- Closes the groups, revokes open links and notifies every student.
- Adds the collective "Program completed" milestone.

**What completion does not do**
- Personal Garden effects are unchanged (NODE).
- Lab and Recovery are untouched.

Students then see Completed in Progress, on the dashboard badge, in the "has ended" task note and in Individual Insights (BROWSER C17–C20).

---

## 13. Institution compatibility and the optional Initiative link

**Institution compatibility**
- The Institution-invited Coach flow is unchanged and verified: Initiative group members, roster scope, task to Activities → Assigned, revision/approval with three history entries, and the Coach report to Supervisors (Institution browser C–F; BROWSER X9).
- The Institution and Supervisor suites pass (see §15).

**Optional Initiative link**
- `mentor.program.link.propose` → `organization.program.link.decide` (Accept, Decline or End).
- The Representative's **Partners** page lists linked Coach Programs with **aggregate counts only** (students, tasks, approved, completed), and only after acceptance.
- Ownership, Program and Group IDs, memberships, tasks, reviews and rewards are untouched; nothing is copied (NODE).
- The old Partners text that listed every published Program title was removed, because those Programs are private.
- **Privacy fix:** the Initiative builder's “Mentor Program” component picker listed every published Program, and `participant/programs/:id` displayed any published Program. Both now show only Programs with an **accepted** link to that Institution. BROWSER X11 checks that a fresh independent Program is absent from regular Explore, partner discovery, the participant program route and the Representative's Partners page.

---

## 14. Exact changed files

Several files below already had uncommitted Institution and Supervisor work; that work was preserved.

**New**
- `Client/src/workspaces/coach-rules.js`
- `Client/src/workspaces/pages/coach/independent.js`
- `Client/tests/coach-cycle.test.mjs`
- `Client/tests/coach-browser.test.cjs`
- this report

**Modified: Coach workspace and engine**

| File | Change |
|---|---|
| `Client/src/workspaces/commands/mentorship.js` | Rewritten: authority, lifecycle, invitations, reschedule/cancel, reports, link |
| `Client/src/workspaces/pages/mentor.js` | Rewritten as a scope-aware router |
| `Client/src/workspaces/pages/student.js` | Rewritten |
| `Client/src/workspaces/builders/program.js` | Program-first builder |
| `Client/src/workspaces/store.js` | `inviteState`, `auth.join` through the shared accept, `auth.invite.accept/decline`, schema-3 backup and schema-4 branch |
| `Client/src/workspaces/migrate.js` | Schema 4 (`upgradeTo4`) |
| `Client/src/workspaces/data/initiative-ops.js` | `SCHEMA = 4` |
| `Client/src/workspaces/commands/platform.js` | Application decision notices; upgrade record |
| `Client/src/workspaces/pages/auth.js` | Invitation page: preview, signed-in accept/decline, wrong email, state copy. **Note:** this file also contains the `registrationMarkup` import from the concurrent registration rework; that change is not part of this session. |
| `Client/src/workspaces/builders/initiative.js` | “Mentor Program” component picker lists only Programs linked to this Institution |
| `Client/src/workspaces/pages/participant.js` | `participant/programs/:id` shows only Programs with an accepted link |
| `Client/src/workspaces/pages/organization.js` | Linked Coach Programs (aggregates only) |
| `Client/src/workspaces/shared.js` | Account membership table, upgrade dialog, notification links |
| `Client/src/workspaces/navigation.js` | Student "Group Garden" and Notifications |
| `Client/src/workspaces/institution.css` | Coach additions |

**Modified: regular Individual pages**

| File | Change |
|---|---|
| `Client/src/shared/selectors.js` | `hasPersonalGarden`, Program lock, `programHistoryFor` export |
| `Client/src/pages/member/garden/garden.js` | D12 gate |
| `Client/src/pages/public/home/home.js` | D12 gate |
| `Client/src/pages/member/training/assigned.js` | Ended-Program note |
| `Client/src/pages/member/insights/insights.js` | Coach programs card |

**Modified: tests (each change has a comment in the file)**

| File | Change |
|---|---|
| `Client/tests/partner-store.test.mjs` | Program-first |
| `Client/tests/institution-cycle.test.mjs` | Schema 4 |
| `Client/tests/partner-browser.test.cjs` | Builder groups step, Program-first dashboard, link dialog, collective garden in the reduced-motion check |

**Modified: documentation**
- `README.md`, `docs/README.md`, `Client/README.md` (status and test references only).

---

## 15. Automated test results (final run, this working tree)

| Command | Result |
|---|---|
| `node --test tests/partner-store.test.mjs tests/institution-cycle.test.mjs tests/supervisor-cycle.test.mjs tests/coach-cycle.test.mjs` | **37/37 PASS**, including **10 new Coach tests** |
| `node tests/page-wiring.test.cjs` | **PASS** (14 pages) |
| `node tests/member-journey.test.cjs` (jsdom) | **14/14 PASS** |
| `node tests/coach-browser.test.cjs` (new) | **38/38 PASS**: C1–C20, X1–X11, 5 × 390 px, reduced motion, console clean |
| `node tests/supervisor-browser.test.cjs` | **PASS**, 0 failures. In one back-to-back run of every suite, S2c failed once with “element not stable” in regular Explore; run on its own it passed again (transient timing, no file had changed). |
| `node tests/institution-browser.test.cjs` | **PARTIAL.** All Institution cycle steps pass, A1–A9 and B–F, including the Coach steps (A2 once showed the same transient “not stable” timeout in the back-to-back run and passed alone). **FR fails** (see below). Because the suite stops at FR, its final **CONSOLE check is NOT TESTED**. |
| `node tests/partner-browser.test.cjs` | **PARTIAL.** It stops at its first check on `#/auth/register`, because that page has two `h1` elements after the same concurrent change. A scratchpad copy that skips only the two registration-entry checks **completes**: 100 route states, 7 walkthroughs and 7 checks, 0 errors. That run includes all Coach and Student routes. |
| `node --test tests/admin-dashboard.test.cjs tests/admin-member-integration.test.cjs` | **2/2 PASS** |

**Why FR fails.** FR is the regular Individual first-run registration. The registration page (`src/pages/auth/register/register.{html,js}` and the new `register/experience/`) was reworked by separate work in this working tree during this session (files changed 12:00–12:11 today). The page now opens with a "Where would you like to grow?" choice step before the form. FR passed in this session's baseline before that change. Those files were not touched here.

**Node suite note.** The new Coach Node suite has 10 tests; the tenth covers the dual-context person.

**Baseline before any edit** (same tree, before the concurrent change): Node 27/27; wiring OK; member journey 14/14; Institution and Supervisor browser suites with 0 failures; Partner completed.

**Other notes**
- `Client/docs/validation/` was restored with `git checkout` after every Partner run. Partner outputs were archived in the session scratchpad.
- Not run here: `product-journey`, the hero/reels/animation suites and `register-experience` (unrelated, or belonging to the concurrent work).

---

## 16. Real-browser verification with evidence

`coach-browser.test.cjs` drives the real UI; the only shortcuts are the demo identity switch and the clock pin. It checks:

| Area | What is checked |
|---|---|
| Registration | Every Partner form and the Admin decision button |
| Dual context | Staff-invitation acceptance by an approved Coach, scope chips switching dashboard and groups (X10) |
| Privacy | Program absent from Explore, discovery, participant route and Partners page (X11) |
| Builder | All five steps |
| Groups | The group modal |
| Invitations | Invitation and link dialogs; the join page (new OTP and signed-in accept) |
| Student | Task start/submit and Student pages |
| Review | Review dialogs |
| Reports | Report form |
| Completion | Completion confirmation |
| Upgrade | Upgrade dialog, then onboarding |
| Regular Individual pages | `training.html#assigned` (All filter) and `insights.html` after reload |

- Mobile: no horizontal scroll at 390 px for the Coach dashboard, Program detail, Group Garden, Student dashboard and join page.
- Reduced motion: entrance and milestone animations are `none`.

Screenshots were taken with `SHOTS_DIR` set (dashboard, completion tab, reports, garden, Student progress, 390 px views). They were reviewed during this session and kept in the session scratchpad, not in the repository.

**Bugs these runs found and fixed:**
- The private-link dialog was closed immediately by the invitation dialog that opened it. It now opens after that dialog closes.
- The CSV button's action name had changed. The historical `report-export` name was restored.
- A Group Garden milestone that had not been reached was styled as the final, reached one.
- After completion, groups still showed a pending invitation. Completion now revokes open links.
- Six-tile stat rows wrapped awkwardly.
- Legacy "Mentor review" labels. They are now normalized to "Coach review".

---

## 17. Remaining gaps and demo limitations

- **Simulated:** email delivery (copyable link only), OTP, identity and professional verification, attachments (file name only for Coach tasks), and authorization. All of these are browser-local.
- **Configurable demo policies, not final:**
  - the completion rule (default: all required tasks);
  - the Group Garden stage quorum (60%);
  - the invitation expiry default (14 days).
- **Program pause semantics:** current work can still be submitted and reviewed while paused. This is a documented demo choice; the owner decision is open.
- **Program link scope:** aggregate counts only. There is no Institution-side drill-down, and no joint report export.
- **Guardian/age consent** is not modelled; the consent is the Program's text plus a checkbox.
- **Unchanged and out of scope:** `models.d.ts` type notes (the new fields are documented here); the Admin "Groups & programs" page (Admin can still suspend a Program, which closes its work).
- **Test status:** the regular registration first-run test (FR) and the start of the Partner suite need updating to the reworked registration page by the owner of that work. See §15.

## 18. What is ready for graduation demonstration

| # | Demonstration | Persona / where |
|---|---|---|
| 1 | Register as a Coach, have the Admin approve the application, and see the first-time workspace. | New applicant → Leen (Admin) |
| 2 | Build a Program with groups, publish it, and invite a student privately. Show the link page, wrong email and revocation. | Approved Coach (or Maya) |
| 3 | A new Invited Student joins and submits; the Coach requests a revision; the student resubmits; the Coach approves. Show the one bounded Group Garden per group. | New Invited Student; Ahmad as an existing Individual |
| 4 | Show a Coach report, the completion eligibility table and finalizing completion. Show the Student's completion and the same-identity upgrade into Activities → Assigned and Insights. | Coach; Invited Student |
| 5 | One person with two contexts: switch between independent Programs and the allocated Initiative group with the scope chips; contrast with an Institution-only Coach who is refused independent Programs. | Lina (dual context, as in BROWSER X10); Karim (Institution only) |
| 6 | Optional Initiative link, showing aggregates only. | Coach proposes; Maya accepts on the Representative Partners page |
