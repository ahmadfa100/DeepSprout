# Persistence contract: current UI → approved 58-table design

**Status:** current, 8 November 2026. Target schema: [v5-lean-2](README.md).

## 1. What runs today

No page reads or writes SQL Server. The ASP.NET Core MVC app (`src/DeepSprout.Web`) serves Razor views and static assets through one GET-only controller. Every workflow keeps its records in the browser origin (`localStorage`) and starts from static JSON seeds. A database connection is opt-in (`ConnectionStrings:DeepSprout`), registers `DeepSproutV5DbContext`, and is used by nothing yet. Data therefore lives on one device, in one browser, on one host and port; clearing site data erases it.

| Browser store | Holds | Code |
|---|---|---|
| `deepsprout-ecosystem-demo-v1` | Canonical people and the signed-in session, plus every partner-workspace record (institutions, initiatives, applications, groups, staff, sessions, attendance, forms, outdoor activities, bookings, reports, notifications, audit) | `wwwroot/src/workspaces/store.js` |
| `deepsprout-account-changes-v1:person:<id>` | The Individual's event journal (setup, preview, activation, practice, routine, Lab, weekly review, Shield, registrations). Replayed over a JSON seed; the source of truth for the Individual | `wwwroot/src/js/data/account.js` |
| `deepsprout-user-v1:person:<id>` | First-run mirror: onboarding flags, Quick Setup draft, Journey Level. Re-derives `setupDone`, activation and tour from the journal on read | `wwwroot/src/js/utils/storage.js` |
| `deepsprout-admin-demo-v1` | Legacy Admin console data (`admin.html?legacy`); its published content is still read by Training and published-content | `wwwroot/src/admin/store.js` |
| `deepsprout-community-demo-v1`, `deepsprout-community-quiz-rooms-v2` | Community posts and moderation; two-person scheduled quiz rooms, answers and local results | `pages/member/community/` |
| `…:person:<id>` preference keys | Display and reminder preferences, plan notices, routine "doing" marks | member pages |
| JSON seeds | `src/data/demo-account.json`, `empty-account.json`, `listings.json`, `practices.json` | read-only |

The string person IDs in the browser (`p-ahmad`, `person-<uuid>`) are not SQL IDs. An import must map each one to `iam.Person.PublicId` once, keyed by verified email, without creating a second person.

## 2. Workflow → table mapping

"Fits" means the approved tables can hold the workflow's records without a new table. None of these rows is connected yet.

| Workflow (UI) | Browser source today | Approved tables | Fit |
|---|---|---|---|
| Register, sign in, workspace switch | graph `people`, `session` | `iam.Person` (+ ASP.NET Core Identity, framework tables, when adopted), `iam.ConsentRecord` | Fits; Identity mapping open (§4) |
| Six-question Quick Setup | journal `setup.save`, mirror draft | `personal.IndividualProfile.SetupAnswersJson` + `SetupAnswersVersion`, `GoalCode` | Fits (§3) |
| Onboarding stage, Journey Level 1 | mirror `onboarding.*` | `IndividualProfile.OnboardingStage`, `JourneyLevel` | Fits (§3) |
| Preliminary Week 1 plan | journal `onboarding.preview` | `recovery.RecoveryCycle` (Status `Preview`) + `recovery.PlanRevision` (Status `Draft`, ChangeKind `Initial`, `PlanJson`) | Fits |
| Explicit activation | journal `plan.activate` | PlanRevision → `Accepted` with `AcceptedAtUtc`; cycle → `Active` with `ActivatedAtUtc`; `activity.OfflineRoutine` for the commitment; `recovery.ScheduledAction` rows. No Lab row is read | Fits; both timestamps enforced by CHECKs |
| Weekly review and adjustments | journal `recovery.*`, `review.add`, `plan.adjust` | `recovery.WeeklyReview`, PlanRevision (`WeeklyReview`, `Schedule`, `Load`, …) | Fits |
| Meaningful Practice, levels | journal practice attempts and level events | `activity.PracticeDefinition`, `PracticeVersion`, `PracticeAttempt` (incl. progression outcome) | Fits |
| Offline routine | journal routine, check-ins | `activity.OfflineRoutine`, `activity.RoutineCheckIn` | Fits |
| Optional Lab | journal `assessment.*` | `lab.InstrumentVersion`, `lab.AssessmentAttempt` (Kind `Baseline` = first official attempt, `Practice`; historical `Official` weekly rows kept) | Fits |
| Insights | derived in the browser | No table: derived from the rows above, each with its source label | Fits |
| Personal Garden | derived from journal | No table: derived from practice, routine, review, attendance and completion rows; rules in `governance.ContentRelease` (`garden.rules`) | Fits |
| Digital Shield | journal `browserShield` from the extension bridge | `shield.ExtensionInstallation`, `shield.BrowserUsagePeriod`, `shield.ProtectionSession`; reminder settings in `IndividualProfile.ShieldSettingsJson` | Fits |
| Preferences | per-person keys | `IndividualProfile.PreferencesJson` | Fits |
| Explore registrations | journal `registration.*` | `institution.InitiativeApplication`, `session.SessionRegistration`, `provider.ExperienceBooking` | Fits |
| Institution profile, Representatives, verification | graph `organizations`, `applications` | `org.Organization` (Institution only), `org.OrganizationMember`, `org.VerificationCase` | Fits |
| Initiatives, applications, admission, waiting list | graph `initiatives`, `admissions` | `institution.Initiative`, `InitiativeRevision`, `InitiativeApplication` (capacity 1–135 enforced) | Fits |
| Coach and Supervisor invitations | graph `staffInvites`, `grants`, `appointments` | `org.StaffAppointment` (invitation-only; no `Requested`) | Fits; 3-Supervisor cap is a service rule |
| Groups and memberships | graph `groups`, `memberships` | `coach.OperationalGroup` (Initiative-owned), `coach.GroupMembership` | Fits for Initiative groups |
| Independent Coach Programs | graph `programs`, `invitations` (still active in the UI) | `coach.CoachProgram` (retired, read-only) | **Conflict**: the UI still creates programs; v4.1 retired them (§4) |
| Assignments, submissions, reviews, reports | graph `assignments`, `submissions`, `coachReports`, `supervisorSummaries` | `task.Assignment`, `AssignmentRecipient`, `SubmissionAttempt`, `ReviewDecision`, `OperationalReport` | Fits |
| Sessions, attendance, excuses, completion | graph `sessions`, `sessionRegistrations`, `sessionAttendance`, `excuses`, `completions`; Attendance Center adds `attendanceImports`, `attendanceReviews`, `attendanceLog` and `experienceSessions[].rosterAdditions` | `session.*`; import batches → `ops.AuditEvent` + `files.SecureFile` unless a `session.AttendanceImport` table is approved | Fits for attendance facts; **two open decisions**: import-batch storage and how "Needs Review" is stored (see [attendance record](../../implementation/attendance-management-center.md#open-owner-decisions)) |
| Outdoor activities, bookings, cohorts, incidents | graph `experiences`, `experienceSessions`, `bookings`, `offers`, `cohorts` (owner = Institution) | `provider.Experience` (`OrganizationId` = Institution), `ExperienceRevision`, `ExperienceBooking`, `ProviderCohort`, `ProviderIncident`, `session.Session` | Fits |
| Forms, surveys, competitions | graph `forms`, `responses`, `competitions`, `entries` | `forms.Form`, `FormVersion`, `FormResponse`, `CompetitionJudgment` | Fits |
| Community | community keys | `community.Post`, `Comment`, `PostInteraction`, `ContentReport` | Feed fits; quiz rooms are browser-local and have no approved database table or cross-device transport |
| Notifications, audit | graph `notifications`, `audit` | `ops.Notification`, `ops.OutboxMessage`, `ops.AuditEvent` | Fits |
| Admin content, Garden rules | graph `cms`; legacy admin store | `governance.ContentRelease` | Fits; two browser stores must become one source |
| Subscriptions, payments, entitlements | legacy admin store, graph `entitlements` (demo only) | none: commercial tables were deferred by the owner | Not persisted by design |
| Personal demo clock, demo scenarios | journal `personal.clock`, `deepsprout-demo-scenarios-v1` | none (local development controls) | Not persisted by design |

## 3. Onboarding 2.0 contract

**Flow:** Register → Meet Bimo → six Quick Setup questions → HeroReels story (watch or skip) → Home at Journey Level 1 with a preliminary Week 1 plan → the person reviews it and chooses **Activate my plan**. No Lab assessment is required at any step.

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
- Version 1 is the legacy eight-answer browser setup. It stays readable and is imported unchanged with `SetupAnswersVersion = 1`.
- When a person edits answers, the previous answer object is written to `ops.AuditEvent.DetailJson` before the profile is updated (the browser keeps it as `setup.previousAnswers`). No extra table.

**Journey Level.** `IndividualProfile.JourneyLevel`, default 1, check `>= 1`. Level 1 is a starting point, not a score, severity or recovery percentage. Import rule: `max(1, browser value)`, so a legacy 0 becomes 1 and any higher level is kept. No progression threshold exists yet; one needs a product decision.

**Browser state → `OnboardingStage`.**

| Browser state (mirror + journal) | Stage |
|---|---|
| Registered, Meet Bimo not finished | `Started` |
| Meet Bimo seen or a Quick Setup draft exists, setup not saved | `QuickSetup` |
| Setup saved, story in progress (server-side flows only; the browser does not record it) | `Story` |
| Setup saved, no plan activated | `Home` |
| `plan.activate` recorded | `Activated` |
| `tour.record` recorded | `TourDone` |
| Legacy values `Introduced`, `Setup`, `Baselines`, `Results`, `Preview` | Read-only history; never written for new people |

**Lab.** Optional. A missing result is unknown, never zero. Activation does not read `lab.AssessmentAttempt`. The retired weekly reassessment is not generated; existing `Official` rows remain history, and a future reassessment policy needs its own decision.

## 4. Known conflicts with the approved design

| Conflict | Detail | Proposed handling |
|---|---|---|
| Independent Coach Programs | v4.1 retires them and the 58-table design now freezes `coach.CoachProgram`, but the Coach workspace still offers Program builder, publish, invitations and Program groups (`workspaces/commands/mentorship.js`, `coach-rules.js`, `pages/mentor.js`) | A dedicated, owner-approved change that removes the Program UI and keeps existing program records as read-only history. Not done in this cleanup because it removes a working workspace feature |
| ASP.NET Core Identity | v4.1 chose Identity for credentials. `iam.Person` still has `PasswordHash`, `FailedLoginCount`, `LockedUntilUtc`, and `iam.OtpChallenge` exists | Identity tables are framework tables, outside the 58. When Identity is adopted, decide whether these columns and `OtpChallenge` are kept or retired; retiring `OtpChallenge` would change the approved count and needs owner approval |
| One Platform Admin | `iam.Person.PlatformRole` allows Admin, Moderator, ContentEditor (the demo has a Moderator) | Owner to confirm whether Moderator/ContentEditor remain |
| Standalone-session Supervisors | v4.1 allows an explicit Session scope; the design deferred `StandaloneSessionSupervisorAppointment` | Initiative- and outdoor-activity-scoped appointments fit today; a standalone session scope needs an owner decision |
| Legacy Coach verification | `org.VerificationCase` keeps Kind `Coach` for one historical row | No new Coach cases (service rule); the Admin queue is Institution-only |
| Community quiz rooms | A two-person scheduled quiz replaces the old Joint Goals/check-in board in the browser demo | Owner to decide the persistence and realtime transport before cross-device play or notifications |
