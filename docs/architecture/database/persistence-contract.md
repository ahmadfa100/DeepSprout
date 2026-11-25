# Persistence contract: current UI → approved 58-table design

**Status:** current storage and integration boundary. Target schema: [v5-lean-2](README.md).

## 1. What runs today

V5 SQL Server is authoritative for Individual identity and credentials, Quick Setup, Recovery preview and activation, weekly and final reviews, subsequent cycles, the four personal practice families, Offline Routine, and Community posts, interactions and moderation. Insights and Personal Garden/Home read SQL projections. The host requires `ConnectionStrings:DeepSprout` and uses `DeepSproutV5DbContext`. Lab, Shield, regular Explore participation, partner operations and related legacy Admin controls retain browser-local sources. Browser records and seeds are not imported automatically.

| Browser store | Holds | Code |
|---|---|---|
| `deepsprout-ecosystem-demo-v1` | Demo people and local session, plus partner-workspace records (institutions, initiatives, applications, groups, staff, sessions, attendance, forms, outdoor activities, bookings, reports, notifications, audit) | `wwwroot/src/workspaces/store.js` |
| `deepsprout-account-changes-v1:person:<id>` | The Individual's event journal (setup, preview, activation, practice, routine, Lab, weekly review, Shield, registrations). Replayed over a JSON seed for demo workflows and features still stored locally | `wwwroot/src/js/data/account.js` |
| `deepsprout-user-v1:person:<id>` | First-run mirror: onboarding flags, Quick Setup draft, Journey Level. Re-derives `setupDone`, activation and tour from the journal on read | `wwwroot/src/js/utils/storage.js` |
| `deepsprout-admin-demo-v1` | Legacy Admin console data (`admin.html?legacy`); its published content is still read by Training and published-content | `wwwroot/src/admin/store.js` |
| `deepsprout-community-demo-v1`, `deepsprout-community-quiz-rooms-v2` | Demo posts and moderation; two-person scheduled quiz rooms, answers and local results | `pages/member/community/` |
| `…:person:<id>` preference keys | Display and reminder preferences, plan notices, routine "doing" marks | member pages |
| JSON seeds | `src/data/demo-account.json`, `empty-account.json`, `listings.json`, `practices.json` | read-only |

Server actions resolve `ApplicationUser.PersonId` from the authenticated session. Browser person keys such as `p-ahmad` and `person-<uuid>` carry no SQL authority. A future authorized import of real user records requires a verified one-person mapping to `iam.Person.PublicId`. Demo fixtures remain separate.

## 2. Workflow → table mapping

A listed table is the approved mapping. “Fits” identifies a browser-local workflow whose planned data fits the model. The session row distinguishes the unexposed QR foundation from the browser workflow.

| Workflow (UI) | Browser source today | Approved tables | Fit |
|---|---|---|---|
| Register, sign in, workspace switch | Local workspace selection | `iam.Person` and ASP.NET Core Identity framework tables, `iam.ConsentRecord` | Individual registration and session use SQL. Partner workspace switching is local. |
| Six-question Quick Setup | journal `setup.save`, mirror draft | `personal.IndividualProfile.SetupAnswersJson` + `SetupAnswersVersion`, `GoalCode` | SQL-backed (§3) |
| Onboarding stage, Journey Level 1 | mirror `onboarding.*` | `IndividualProfile.OnboardingStage`, `JourneyLevel` | SQL-backed (§3) |
| Preliminary Week 1 plan | journal `onboarding.preview` | `recovery.RecoveryCycle` (Status `Preview`) + `recovery.PlanRevision` (Status `Draft`, ChangeKind `Initial`, `PlanJson`) | SQL-backed (§3) |
| Explicit activation | journal `plan.activate` | PlanRevision → `Accepted` with `AcceptedAtUtc`; cycle → `Active` with `ActivatedAtUtc`; `activity.OfflineRoutine` for the commitment; `recovery.ScheduledAction` rows. No Lab row is read | SQL-backed, atomic, and retryable. New cycles span 28 calendar days. Activation writes Week 1 only. |
| Weekly Review | Browser journal for demo | `recovery.WeeklyReview`, `PlanRevision`, `ScheduledAction`, `ops.AuditEvent` | A read-only preview uses linked scored attempts, self-reported routine check-ins and available supported-browser records. Confirmation schedules only one eligible week. An overdue review can save a conservative continuation for remaining dates while keeping the review questions open. Week 4 never schedules a fifth week. |
| Cycle completion, final review, and continuation | Browser journal for demo | `recovery.RecoveryCycle`, `PlanRevision`, `ops.AuditEvent` | On access the cycle ends at the stored time zone's boundary after day 28. The final review saves the reflection and evidence snapshot. Next Cycle and one-practice-day Maintenance create inactive previews. Explicit activation starts a new 28-day cycle with Week 1 only and retains prior attempts, difficulty, and history. |
| Meaningful Practice and difficulty | Browser journal for demo accounts and historical browser attempts | `activity.PracticeDefinition`, `PracticeVersion`, `PracticeAttempt`, `ops.AuditEvent` | Scheduled and optional attempts use pinned content and server scoring. Scheduled completions link to the original action. Answers and explicit difficulty choices are recorded in `AuditEvent.DetailJson`. The two replacement practices use unique catalog codes and content snapshots inside the existing V5 type constraints. |
| Offline routine | Browser journal for demo accounts | `activity.OfflineRoutine`, `activity.RoutineCheckIn`, `recovery.ScheduledAction`, `ops.AuditEvent` | SQL stores routines, date-effective edits, and self-reported check-ins. A check-in updates the related routine action without creating a scored practice attempt. |
| Optional Lab | journal `assessment.*` | `lab.InstrumentVersion`, `lab.AssessmentAttempt` (Kind `Baseline` = first official attempt, `Practice`; historical `Official` weekly rows kept) | Fits |
| Individual Insights | SQL-backed plan, practice, review, cycle and routine metrics for signed-in Individuals | No table: derived from Recovery, Activity and audit records | The adherence denominator is eligible required practices due through the cycle-local date. A completion requires the original linked, valid scored attempt. Routine counts use distinct dates and are self-reported. Cycle comparisons require two complete, comparable periods. Browser usage and Lab keep their own sources. |
| Personal Garden and Home preview | SQL-backed for signed-in Individuals | No reward table. Reads scored practice, eligible Coach review, routine check-in, verified attendance and Institution camp completion rows. | The existing four-tree stage thresholds and decoration caps are retained. Weekly reviews and the legacy points-based `garden.rules` payload grant no effects. Browser-only partner records do not qualify for the signed-in SQL Garden. |
| Digital Shield | journal `browserShield` from the extension bridge | `shield.ExtensionInstallation`, `shield.BrowserUsagePeriod`, `shield.ProtectionSession`; reminder settings in `IndividualProfile.ShieldSettingsJson` | Fits |
| Preferences | per-person keys | `IndividualProfile.PreferencesJson` | Fits |
| Explore registrations | Live Initiative applications and Initiative Session registrations in SQL. Outdoor Activity bookings use the demo journal. | `institution.InitiativeApplication`, `session.SessionRegistration`, `provider.ExperienceBooking` | Initiative admission and Session registration have independent records and history. |
| Institution profile, Representatives, verification | Live Partner form/status and Admin requests; separate browser demo | `org.Organization`, `org.OrganizationMember`, `org.VerificationCase`, `ops.AuditEvent` | SQL saves claims and declarations under the existing Person, with Admin requests for information, resubmission and rejection. Profile reads require confirmed Identity email, a verified Institution and active membership. Approval, secure document handling and new membership grants await an approved process. |
| Initiatives, applications, admission, waiting list | SQL Initiative builder, revision history, regular Explore, My Initiatives and the live Institution Applications queue | `institution.Initiative`, `InitiativeRevision`, `InitiativeApplication`, `ops.AuditEvent`, `ops.Notification` | Applications pin the published terms and consent time. The V5 submission event holds fixed-form answers, including self-reported age and eligibility. Current confirmed, active Representative membership authorizes attributable decisions. Pending and queued applications leave seats available. Accepted and suspended applications share the Initiative capacity, capped at 135. V5 also allows one accepted or suspended Initiative per person. The Initiative transaction serializes capacity changes. |
| Initiative Coach and Supervisor invitations | Live Institution Team, invitation links and staff workspaces use SQL | `org.StaffAppointment`, `ops.AuditEvent` | The invitation stores a token hash, expiry and normalized recipient email. Acceptance binds the existing confirmed Identity to the appointment. The Initiative lock limits concurrent activations to three Supervisors. Coach group reads also require the group's current Coach and appointment assignment. |
| Groups and memberships | Live Institution and Supervisor Groups, Coach rosters and Student My Group use SQL | `coach.OperationalGroup`, `coach.GroupMembership`, `institution.InitiativeApplication`, `ops.AuditEvent` | A placement references the accepted application and its Person. The Initiative lock serializes allocation with admission changes. Transfers end the old row and create a new row. Coach handovers and placement changes retain attributed history. Suspension pauses access while preserving the placement. |
| Student to Individual | The Student Account page enables Individual access on the current SQL Person | `iam.Person`, `iam.ConsentRecord`, `personal.IndividualProfile` | Current admission, confirmed Identity email and consent are required for upgrade. A missing profile starts at ordinary onboarding. Existing participation and profile data stay on the same Person. |
| Independent Coach Programs | graph `programs`, `invitations` (still active in the UI) | `coach.CoachProgram` (retired, read-only) | **Conflict**: the UI still creates programs; v4.1 retired them (§4) |
| Assignments, submissions and reviews | Live Coach Assignments and Reviews, Student My Tasks, and Individual Activities → Assigned | `task.Assignment`, `AssignmentRecipient`, `SubmissionAttempt`, `ReviewDecision`, `ops.AuditEvent` | Publication records the current eligible recipients. Changes to unstarted work retain assignment versions. Starting records progress and submission creates an immutable written attempt. Decisions keep Student feedback and restricted notes separate. Transfer keeps the Student's own history and ends work access in the old group. |
| Initiative reports | Live Coach reports, Supervisor Insights and the Institution report inbox | `task.OperationalReport` and the source task tables | Reports count recipients assigned in the selected UTC date range, using SQL status at the time of calculation. Submission freezes the counts and source assignment IDs. A Supervisor can review a Coach original and include it in one summary. |
| Initiative Group Garden | Live Student, Coach, Supervisor and Institution workspaces. The Personal Garden links to authorized Initiatives. | Derived per `institution.Initiative` from group placements, Coach allocations and appointments, assignment recipients, linked scored attempts and review history | The unique practice-to-submission link counts at most once across Initiative groups. Eligibility uses the pinned practice result and the placement and Coach allocation at review time. Superseded approvals remain in history and leave the active count. There is no collective stage until thresholds are approved. New assignment-scored practice intake remains pending. |
| Initiative Sessions and participant registration | Live Institution Sessions, Supervisor Schedule, Student Session Schedule and Individual Explore / My Registrations | `session.Session`, `session.SessionRegistration`, `ops.AuditEvent`, `ops.Notification` | Current Initiative admission and explicit versioned participation acknowledgement authorize a separate registration. The Initiative transaction protects separate mode capacities and preserves cancelled attempts. Registration opens on publication and closes at the scheduled start. V5 has no editable Session registration dates or independent early-close state. Session reschedules and cancellations keep audit history. |
| Initiative Session attendance and excuses | Live Supervisor Attendance and Excuses, Institution oversight and Reports, Student attendance and Individual My Registrations | `session.SessionDuty`, `session.SessionRegistration`, `session.Attendance`, `session.AbsenceExcuse`, `ops.AuditEvent` | An assigned Supervisor verifies the confirmed registration in its selected mode. An in-person QR or typed code expires within 15 minutes and is consumed by the same transaction that records attendance. Correction snapshots preserve the earlier method, actor and timestamp. The Supervisor recommends and the Representative decides. Accepted excuses display as Excused Absence only for factual Absent. Attachments, meeting-report imports and completion are separate work. |
| Outdoor activities, bookings, cohorts, incidents | graph `experiences`, `experienceSessions`, `bookings`, `offers`, `cohorts` (owner = Institution) | `provider.Experience` (`OrganizationId` = Institution), `ExperienceRevision`, `ExperienceBooking`, `ProviderCohort`, `ProviderIncident`, `session.Session` | Fits |
| Forms, surveys, competitions | graph `forms`, `responses`, `competitions`, `entries` | `forms.Form`, `FormVersion`, `FormResponse`, `CompetitionJudgment` | Fits |
| Community | Live Member and Platform Admin pages use `/api/community` | `community.Post`, `Comment`, `PostInteraction`, `ContentReport`, `ops.AuditEvent` | Live posts, comments, reactions, bookmarks and moderation use SQL. Demo content stays local. Quiz rooms have no approved database table or cross-device transport ([proposal](../community-quiz-backend-proposal.md)). |
| Notifications, audit | graph `notifications`, `audit` | `ops.Notification`, `ops.OutboxMessage`, `ops.AuditEvent` | Fits |
| Admin content, Garden rules | graph `cms`; legacy admin store | `governance.ContentRelease` | Browser-local publishing. The legacy points-based rules do not drive the SQL Garden. |
| Subscriptions, payments, entitlements | legacy admin store, graph `entitlements` (demo only) | none: commercial tables were deferred by the owner | Not persisted by design |
| Personal demo clock, demo scenarios | journal `personal.clock`, `deepsprout-demo-scenarios-v1` | none (local development controls) | Not persisted by design |

## 3. Onboarding 2.0 contract

**Flow:** Register → Meet Azm → six Quick Setup questions → HeroReels story (watch or skip) → Home at Journey Level 1 with a preliminary Week 1 plan → the person reviews it and chooses **Activate my plan**. No Lab assessment is required at any step.

**Setup answers (`SetupAnswersVersion = 2`).** One JSON object, stored with its version; the database rejects answers without a version, a version without answers, and anything that is not a JSON object.

```json
{
  "change": "reduce-scrolling | intentional-phone | offline-time | focus-objective",
  "apps": ["instagram", "tiktok", "youtube", "facebook", "other"],
  "dailyScroll": "under-60 | 60-120 | 120-240 | over-240 | unsure",
  "moments": "before-bed | morning | study-work | bored | unsure",
  "makeTimeFor": ["walking-sports", "reading-learning", "drawing-creativity", "friends-family", "hobbies", "other"],
  "dailyMinutes": "5 | 10 | 15 | 20"
}
```

- `change` is also stored as `GoalCode`. `dailyScroll` is a **self-reported estimate**, never an observed usage figure.
- Version 1 is the legacy setup. Replacing saved answers preserves the original version. Any approved future import must also preserve it.
- When a person edits answers, the previous answer object is written to `ops.AuditEvent.DetailJson` before the profile is updated (the browser keeps it as `setup.previousAnswers`). No extra table.

**Journey Level.** `IndividualProfile.JourneyLevel`, default 1, check `>= 1`. Level 1 is a starting point, not a score, severity or recovery percentage. Import rule: `max(1, browser value)`, so a legacy 0 becomes 1 and any higher level is kept. No progression threshold exists yet; one needs a product decision.

**Browser state → `OnboardingStage`.**

| Browser state (mirror + journal) | Stage |
|---|---|
| Registered, Meet Azm not finished | `Started` |
| Meet Azm seen or a Quick Setup draft exists, setup not saved | `QuickSetup` |
| Setup saved, story in progress (server-side flows only; the browser does not record it) | `Story` |
| Setup saved, no plan activated | `Home` |
| `plan.activate` recorded | `Activated` |
| `tour.record` recorded | `TourDone` |
| Legacy values `Introduced`, `Setup`, `Baselines`, `Results`, `Preview` | Read-only history; never written for new people |

**Lab.** Optional. A missing result is unknown, never zero. Activation does not read `lab.AssessmentAttempt`. The retired weekly reassessment is not generated; existing `Official` rows remain history, and a future reassessment policy needs its own decision.

The four current types are Depth Practice, Listening & Recall, Visual Observation & Analysis, and Reasoning & Digital Judgment. The last two reuse the V5 type slots for historical Practical Micro-Challenge and Protected Work. New definition codes and immutable content versions distinguish the replacement activities. Legacy attempts and rewards retain their original identities.

All four SQL practices validate answers against the pinned version and store the score and reward outcome. The same example can earn growth once per seven calendar days. Interactive Visual Observation and Reasoning attempts below 75% can retain a valid result without earning growth. Progression considers eligible scores of at least 75%, three distinct examples and three practice dates before offering a level increase. The Individual chooses whether to change level. Transcript recall has a separate evidence label; playback is not independent proof of listening.

**Saved evidence.** New cycles use Asia/Amman. Day 28 is active and the cycle ends on access after that day. Weekly Review opens on the last two days of each detailed week. Week 4 creates no fifth week. The final reflection is separate. Current SQL supports preview edits, review decisions and routine edits. General post-activation rescheduling awaits a server command.

**Current Garden defaults.** Tree stages begin at 1, 3, 7 and 12 eligible records. Flowers use 3, 10 and 21 distinct self-reported routine days. Qualifying records provide up to three rabbits and one birdhouse. These are descriptive implementation values. Production thresholds and caps remain undecided. Inactivity and weekly reviews do not change Garden growth.

**Separate sources.** SQL Weekly Review can read qualifying persisted browser-usage periods. The extension bridge saves locally, and the Lab player uses a browser journal. SQL Insights excludes incompatible comparisons. Regular Explore reads live Initiatives from SQL alongside labelled samples and Outdoor Activity previews. Browser participation history does not create V5 records.

## 4. Known conflicts with the approved design

| Conflict | Detail | Proposed handling |
|---|---|---|
| Independent Coach Programs | v4.1 retires them and the 58-table design now freezes `coach.CoachProgram`, but the Coach workspace still offers Program builder, publish, invitations and Program groups (`workspaces/commands/mentorship.js`, `coach-rules.js`, `pages/mentor.js`) | A dedicated, owner-approved change that removes the Program UI and keeps existing program records as read-only history. Not done in this cleanup because it removes a working workspace feature |
| ASP.NET Core Identity | v4.1 chose Identity for credentials. `iam.Person` still has `PasswordHash`, `FailedLoginCount`, `LockedUntilUtc`, and `iam.OtpChallenge` exists | Identity tables are framework tables, outside the 58. Identity is active. Decide whether these columns and `OtpChallenge` are kept or retired; retiring `OtpChallenge` would change the approved count and needs owner approval |
| One Platform Admin | `iam.Person.PlatformRole` allows Admin, Moderator, ContentEditor (the demo has a Moderator) | Owner to confirm whether Moderator/ContentEditor remain |
| Standalone-session Supervisors | v4.1 allows an explicit Session scope; the design deferred `StandaloneSessionSupervisorAppointment` | Initiative- and outdoor-activity-scoped appointments fit today; a standalone session scope needs an owner decision |
| Legacy Coach verification | `org.VerificationCase` keeps Kind `Coach` for one historical row | No new Coach cases (service rule); the Admin queue is Institution-only |
| Community quiz rooms | A two-person scheduled quiz replaces the old Joint Goals/check-in board in the browser demo | Owner to decide the persistence and realtime transport before cross-device play or notifications |
