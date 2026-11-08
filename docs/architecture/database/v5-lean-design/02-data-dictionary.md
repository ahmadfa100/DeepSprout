# DeepSprout v5 — Data Dictionary

> Generated. Every table, every column. English technical text with short Arabic explanations. All FKs are single-column, NO ACTION on delete (nothing cascades; deletes are soft status changes). `bigint IDENTITY` primary keys. Times are UTC `datetime2(3)`.

## Schema `iam`

### `iam.Person`

One identity for every person, in every workspace. Also holds the password hash and the platform-staff role.

*هوية واحدة لكل شخص في كل المساحات؛ تحمل أيضًا كلمة المرور ودور الإدارة العامة.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| PublicId | uniqueidentifier |  | NEWSEQUENTIALID() |  |
| DisplayName | nvarchar(160) |  |  |  |
| NormalizedEmail | nvarchar(320) | Y |  |  |
| EmailVerifiedAtUtc | datetime2(3) | Y |  |  |
| Status | nvarchar(24) |  | 'Active' | Values: Active, Suspended, Closed |
| IndividualEnabledAtUtc | datetime2(3) | Y |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |
| PasswordHash | nvarchar(400) | Y |  | Output of ASP.NET Core PasswordHasher. NULL for an invited student who has not set a password yet. |
| FailedLoginCount | smallint |  | 0 | Consecutive failed sign-ins; reset on success. |
| LockedUntilUtc | datetime2(3) | Y |  | Sign-in is refused until this time. |
| PlatformRole | nvarchar(16) | Y |  | NULL for normal people. Admin / Moderator / ContentEditor for platform staff. |

**Unique:** `(PublicId)` · `(NormalizedEmail)` WHERE NormalizedEmail IS NOT NULL

**CHECK:** `CK_Person_PlatformRole`: PlatformRole IS NULL OR PlatformRole IN ('Admin','Moderator','ContentEditor')

**Used by:** Register, sign in, Workspace Switcher, every owner/actor reference.

---

### `iam.OtpChallenge`

Short-lived one-time codes for email verification, email change and password reset.

*رموز تحقق مؤقتة للبريد وتغييره واستعادة كلمة المرور.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| PersonId | bigint | Y |  | FK → iam.Person |
| NormalizedEmail | nvarchar(320) |  |  |  |
| Purpose | nvarchar(24) |  |  | Values: SignUp, SignIn, Invitation, EmailChange, Recovery |
| CodeHash | varbinary(64) |  |  |  |
| AttemptCount | smallint |  | 0 |  |
| ExpiresAtUtc | datetime2(3) |  |  |  |
| ConsumedAtUtc | datetime2(3) | Y |  |  |
| Status | nvarchar(24) |  | 'Issued' | Values: Issued, Consumed, Expired, Locked |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |

**Indexes:** (NormalizedEmail, Purpose) WHERE Status = 'Issued'

**Used by:** Email verification, change email, join by invitation.

---

### `iam.ConsentRecord`

What a person agreed to (privacy notice, Digital Shield telemetry), which text version, and when.

*سجل موافقات الشخص ونسخة النص وتاريخ القرار.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| PersonId | bigint |  |  | FK → iam.Person |
| PurposeCode | nvarchar(80) |  |  |  |
| NoticeVersion | nvarchar(64) |  |  |  |
| Decision | nvarchar(16) |  |  | Values: Accepted, Withdrawn |
| DecidedAtUtc | datetime2(3) |  |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |

**Unique:** `(PersonId, PurposeCode, DecidedAtUtc)`

**Indexes:** (PersonId, PurposeCode, DecidedAtUtc)

**Used by:** Registration privacy consent, Shield pairing consent, withdrawal.

---

## Schema `org`

### `org.Organization`

An Institution: name, status, profile and settings. Owns initiatives and outdoor activities (v4.1: Kind is Institution only).

*مؤسسة أو مزوّد (حسب Kind) بحالته وملفه وإعداداته.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| PublicId | uniqueidentifier |  | NEWSEQUENTIALID() |  |
| Kind | nvarchar(16) |  |  | Values: Institution |
| Name | nvarchar(200) |  |  |  |
| Status | nvarchar(24) |  | 'Applied' | Values: Applied, Verified, Suspended, Closed |
| CountryCode | char(2) |  |  |  |
| HeadquartersCity | nvarchar(120) | Y |  |  |
| OfficialContactEmail | nvarchar(320) | Y |  |  |
| ProfileJson | nvarchar(max) | Y |  | JSON: Public profile: description, website, logo reference. |
| SettingsJson | nvarchar(max) | Y |  | JSON: Organization settings (defaults for new initiatives, contact preferences). |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |

**Unique:** `(PublicId)`

**Used by:** Institution Representative registration, Institution profile/settings, Admin verification.

---

### `org.OrganizationMember`

Which people may act for an Institution (its human Representatives).

*من يحق له التصرف باسم المنظمة.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| OrganizationId | bigint |  |  | FK → org.Organization |
| PersonId | bigint |  |  | FK → iam.Person |
| Status | nvarchar(16) |  | 'Active' | Values: Active, Revoked |
| GrantedByPersonId | bigint |  |  | FK → iam.Person |
| GrantedAtUtc | datetime2(3) |  |  |  |
| RevokedAtUtc | datetime2(3) | Y |  |  |
| RevokeReason | nvarchar(800) | Y |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |

**Unique:** `(OrganizationId, PersonId)` WHERE Status = 'Active'

**Used by:** Organization team, representative authority, Workspace Switcher.

---

### `org.VerificationCase`

Admin verification of an Institution and its Representative, including "more information" rounds. Kind Coach is legacy history only (v4.1 removed the Coach application queue).

*طلب توثيق مدرب أو مؤسسة أو مزوّد وقرار الإدارة.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| PublicId | uniqueidentifier |  | NEWSEQUENTIALID() |  |
| Kind | nvarchar(16) |  |  | Values: Institution, Coach |
| OrganizationId | bigint | Y |  | FK → org.Organization |
| ApplicantPersonId | bigint |  |  | FK → iam.Person |
| Status | nvarchar(24) |  | 'Submitted' | Values: Submitted, MoreInfo, Approved, Rejected, Suspended |
| ClaimJson | nvarchar(max) |  |  | JSON: The applicant's claim: organization details or coach credentials, as submitted. |
| EvidenceFileId | bigint | Y |  | FK → files.SecureFile |
| SubmittedAtUtc | datetime2(3) |  |  |  |
| DecidedByPersonId | bigint | Y |  | FK → iam.Person |
| DecidedAtUtc | datetime2(3) | Y |  |  |
| DecisionReason | nvarchar(1000) | Y |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |
| RowVersion | rowversion |  |  |  |
| MessagesJson | nvarchar(max) | Y |  | The more-information thread between Admin and applicant (Client: Application.messages). · JSON: [{actor,text,atUtc}] thread. |

**Unique:** `(PublicId)` · `(OrganizationId)` WHERE OrganizationId IS NOT NULL AND Status IN ('Submitted','MoreInfo') · `(ApplicantPersonId)` WHERE Kind = 'Coach' AND Status IN ('Submitted','MoreInfo','Approved','Suspended')

**CHECK:** `CK_VerificationCase_Subject`: (Kind = 'Coach' AND OrganizationId IS NULL) OR (Kind = 'Institution' AND OrganizationId IS NOT NULL)

**Used by:** Join as Partner → Institution Representative, application status, Admin → Institutions.

---

### `org.StaffAppointment`

Email invitation, acceptance and removal of Coaches and Supervisors for one initiative, or Supervisors for one outdoor activity. Invitation-only: no self-request.

*دعوة وتعيين وسحب المشرفين والمدربين لمبادرة أو تجربة.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| PublicId | uniqueidentifier |  | NEWSEQUENTIALID() |  |
| InitiativeId | bigint | Y |  | FK → institution.Initiative |
| ExperienceId | bigint | Y |  | FK → provider.Experience |
| Role | nvarchar(16) |  |  |  |
| Status | nvarchar(16) |  |  | Values: Pending, Active, Declined, Expired, Cancelled, Revoked |
| NormalizedEmail | nvarchar(320) | Y |  |  |
| TokenHash | varbinary(64) | Y |  |  |
| ExpiresAtUtc | datetime2(3) | Y |  |  |
| InvitedByPersonId | bigint | Y |  | FK → iam.Person |
| InvitedAtUtc | datetime2(3) | Y |  |  |
| PersonId | bigint | Y |  | FK → iam.Person |
| AcceptedAtUtc | datetime2(3) | Y |  |  |
| EndedAtUtc | datetime2(3) | Y |  |  |
| EndReason | nvarchar(800) | Y |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |
| RowVersion | rowversion |  |  |  |
| CanManageCohorts | bit |  | 0 | Outdoor activity supervisors only: may create and manage cohorts (Client: cohortPermission). |

**Unique:** `(PublicId)` · `(InitiativeId, NormalizedEmail, Role)` WHERE InitiativeId IS NOT NULL AND Status = 'Pending' · `(ExperienceId, NormalizedEmail)` WHERE ExperienceId IS NOT NULL AND Status = 'Pending' · `(InitiativeId, PersonId, Role)` WHERE InitiativeId IS NOT NULL AND Status = 'Active' · `(ExperienceId, PersonId)` WHERE ExperienceId IS NOT NULL AND Status = 'Active' · `(TokenHash)` WHERE TokenHash IS NOT NULL

**CHECK:** `CK_StaffAppointment_Scope`: (InitiativeId IS NOT NULL AND ExperienceId IS NULL) OR (InitiativeId IS NULL AND ExperienceId IS NOT NULL) · `CK_StaffAppointment_Invited`: NormalizedEmail IS NOT NULL AND TokenHash IS NOT NULL AND ExpiresAtUtc IS NOT NULL AND InvitedByPersonId IS NOT NULL AND InvitedAtUtc IS NOT NULL

**Indexes:** (InitiativeId, Role) WHERE Status = 'Active'

**Used by:** Initiative Staff tab, Coach/Supervisor invitations, outdoor activity staff.

---

## Schema `personal`

### `personal.IndividualProfile`

The personal (Individual) workspace and journey: onboarding stage, Journey Level, goal, versioned setup answers, preferences, Shield settings.

*المساحة الشخصية: مرحلة الإعداد والهدف والتفضيلات وإعدادات Shield.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| PersonId | bigint |  |  | FK → iam.Person |
| OnboardingStage | nvarchar(24) |  | 'Started' | Values: Started, QuickSetup, Story, Home, Activated, TourDone, Introduced, Setup, Baselines, Results, Preview |
| GoalCode | nvarchar(64) | Y |  |  |
| SetupAnswersJson | nvarchar(max) | Y |  | JSON: Quick Setup answers as one JSON object, always paired with SetupAnswersVersion. Version 2 (Onboarding 2.0): {"change":"reduce-scrolling\|intentional-phone\|offline-time\|focus-objective","apps":["instagram","tiktok","youtube","facebook","other"],"dailyScroll":"under-60\|60-120\|120-240\|over-240\|unsure","moments":"before-bed\|morning\|study-work\|bored\|unsure","makeTimeFor":["walking-sports","reading-learning","drawing-creativity","friends-family","hobbies","other"],"dailyMinutes":"5\|10\|15\|20"}. Version 1 is the legacy eight-answer browser setup, kept readable. |
| SetupAnswersVersion | int | Y |  |  |
| PreferencesJson | nvarchar(max) | Y |  | JSON: Reminder and display preferences. |
| PreferredTimeZone | nvarchar(80) |  |  |  |
| LastAssessmentAttemptId | bigint | Y |  | FK → lab.AssessmentAttempt |
| JourneyStartedAtUtc | datetime2(3) | Y |  |  |
| OnboardingCompletedAtUtc | datetime2(3) | Y |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |
| ShieldSettingsJson | nvarchar(max) | Y |  | Digital Shield reminder settings (replaces the v4 ShieldConfiguration + ShieldSelectedDomain tables). · JSON: {"reminderEnabled":true,"thresholdMinutes":90,"domains":["social","video"],"consentVersion":"2026-10"} |
| JourneyLevel | int |  | 1 | Journey starting point. Every new journey starts at Level 1; it is not a score, severity or recovery percentage. A legacy browser Level 0 is imported as 1; higher levels are preserved. |

**Unique:** `(PersonId)`

**CHECK:** `CK_IndividualProfile_JourneyLevel`: JourneyLevel >= 1 · `CK_IndividualProfile_SetupAnswers`: (SetupAnswersJson IS NULL AND SetupAnswersVersion IS NULL) OR (SetupAnswersJson IS NOT NULL AND SetupAnswersVersion IS NOT NULL AND SetupAnswersVersion >= 1 AND LEFT(LTRIM(SetupAnswersJson), 1) = N'{')

**Used by:** Onboarding 2.0 (Register → Meet Bimo → six questions → HeroReels story → Home), Profile, Shield → Usage Reminder.

---

## Schema `lab`

### `lab.InstrumentVersion`

The four optional Lab assessments (Digital Habits, Sustained Attention, Inhibitory Control, Depth Challenge) with their scoring version.

*الاختبارات الأربعة بنسخة تصحيح ثابتة تضمن قابلية المقارنة.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| InstrumentCode | nvarchar(32) |  |  | Values: DigitalHabits, SustainedAttention, InhibitoryControl, DepthChallenge |
| VersionNo | int |  |  |  |
| Title | nvarchar(160) |  |  |  |
| ContentRef | nvarchar(300) |  |  |  |
| ContentJson | nvarchar(max) | Y |  | JSON: Items, instructions and timing of the assessment. |
| ProtocolVersion | nvarchar(64) |  |  |  |
| ScoringVersion | nvarchar(64) |  |  |  |
| ComparabilityGroup | nvarchar(64) | Y |  |  |
| Status | nvarchar(16) |  | 'Draft' | Values: Draft, Published, Retired |
| PublishedAtUtc | datetime2(3) | Y |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |

**Unique:** `(InstrumentCode, VersionNo)`

**Used by:** Optional Lab, Admin → Assessments editor, Starting Point results (when taken).

---

### `lab.AssessmentAttempt`

One optional Lab attempt: kind (Baseline = first official attempt, Official = historical weekly-window attempt, Practice), progress, responses and score. Never required for plan activation; a missing result is unknown, not zero.

*محاولة اختبار واحدة بحالتها وإجاباتها ونتيجتها.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| PublicId | uniqueidentifier |  | NEWSEQUENTIALID() |  |
| PersonId | bigint |  |  | FK → iam.Person |
| InstrumentVersionId | bigint |  |  | FK → lab.InstrumentVersion |
| InstrumentCode | nvarchar(32) |  |  |  |
| Kind | nvarchar(16) |  |  | Values: Baseline, Official, Practice |
| Status | nvarchar(16) |  | 'Started' | Values: Started, Paused, Submitted, Valid, Invalid, Abandoned |
| StartedAtUtc | datetime2(3) |  |  |  |
| LastSavedAtUtc | datetime2(3) | Y |  |  |
| FinishedAtUtc | datetime2(3) | Y |  |  |
| ValidityCode | nvarchar(40) | Y |  |  |
| AccessibilityMode | nvarchar(40) | Y |  |  |
| IsLate | bit |  | 0 |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |
| RowVersion | rowversion |  |  |  |
| WindowKey | nvarchar(40) | Y |  | ISO week key (for example 2026-W45). Set only for Official attempts; the weekly window itself is derived from it. |
| ScoringVersion | nvarchar(64) | Y |  | Scoring version used for the stored result. |
| PrimaryScore | decimal(12,4) | Y |  | Headline score for lists and comparisons. |
| ScoresJson | nvarchar(max) | Y |  | All metrics with a Comparable flag. · JSON: [{"metric":"omissions","value":3.0,"comparable":true}, …] |
| ResponsesJson | nvarchar(max) | Y |  | Item/trial responses, saved incrementally for pause and resume. · JSON: [{"item":"S1","trial":1,"value":"x","latencyMs":412}, …] |

**Unique:** `(PersonId, InstrumentCode)` WHERE Kind = 'Baseline' AND Status = 'Valid' · `(PersonId, InstrumentCode, WindowKey)` WHERE Kind = 'Official' AND Status = 'Valid' · `(PublicId)`

**CHECK:** `CK_AssessmentAttempt_Window`: (Kind = 'Official' AND WindowKey IS NOT NULL) OR (Kind <> 'Official' AND WindowKey IS NULL)

**Used by:** Optional Lab, Lab history, Insights → Assessments. Weekly reassessment is retired pending a separate decision; existing Official rows stay as history.

---

## Schema `recovery`

### `recovery.RecoveryCycle`

A recovery cycle (about 28 days): Preview → Active → Review → Ended. Activation needs no Lab result.

*دورة التعافي (نحو 28 يومًا) وحالتها.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| PublicId | uniqueidentifier |  | NEWSEQUENTIALID() |  |
| PersonId | bigint |  |  | FK → iam.Person |
| CycleNo | int |  |  |  |
| Kind | nvarchar(16) |  | 'Standard' | Values: Standard, Maintenance |
| Status | nvarchar(16) |  | 'Draft' | Values: Draft, Preview, Active, ReviewDue, Paused, Ended, Reviewed, Cancelled |
| PolicyVersion | nvarchar(64) |  |  |  |
| TimeZoneId | nvarchar(80) |  |  |  |
| StartLocalDate | date | Y |  |  |
| EndLocalDate | date | Y |  |  |
| ActivatedAtUtc | datetime2(3) | Y |  |  |
| EndedAtUtc | datetime2(3) | Y |  |  |
| ReviewedAtUtc | datetime2(3) | Y |  |  |
| NextStepCode | nvarchar(24) | Y |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |
| RowVersion | rowversion |  |  |  |

**Unique:** `(PublicId)` · `(PersonId, CycleNo)` · `(PersonId)` WHERE Status IN ('Draft','Preview','Active','ReviewDue','Paused')

**Used by:** Recovery Plan, Weekly Review, cycle end.

---

### `recovery.PlanRevision`

The plan and each adjustment of it (Draft → Accepted → Superseded). The preliminary Week 1 plan is a Draft; only the person's explicit activation accepts it.

*الخطة المقبولة وكل تعديل عليها.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| CycleId | bigint |  |  | FK → recovery.RecoveryCycle |
| RevisionNo | int |  |  |  |
| ChangeKind | nvarchar(24) |  |  | Values: Initial, Preference, Schedule, Load, Goal, WeeklyReview, Return |
| GoalCode | nvarchar(64) |  |  |  |
| PolicyVersion | nvarchar(64) |  |  |  |
| EffectiveFromLocalDate | date |  |  |  |
| Reason | nvarchar(500) |  |  |  |
| PlanJson | nvarchar(max) |  |  | JSON: The plan as shown: goals, weekly load, selected practices and routines. |
| Status | nvarchar(16) |  | 'Draft' | Values: Draft, Accepted, Superseded |
| AcceptedAtUtc | datetime2(3) | Y |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |

**Unique:** `(CycleId, RevisionNo)` · `(CycleId)` WHERE Status = 'Accepted' · `(CycleId)` WHERE Status = 'Draft'

**CHECK:** `CK_PlanRevision_Accepted`: (Status = 'Draft' AND AcceptedAtUtc IS NULL) OR (Status IN ('Accepted','Superseded') AND AcceptedAtUtc IS NOT NULL)

**Used by:** Recovery Plan → Adjust, History ("Plan adjusted").

---

### `recovery.ScheduledAction`

A dated, measurable action of the plan (a practice or an offline routine) and whether it was done.

*إجراء يومي محدد في الخطة وحالة إنجازه.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| CycleId | bigint |  |  | FK → recovery.RecoveryCycle |
| PersonId | bigint |  |  | FK → iam.Person |
| PlanRevisionId | bigint |  |  | FK → recovery.PlanRevision |
| ActionKind | nvarchar(16) |  |  | Values: Practice, Routine, WeeklyReview, Protection |
| PracticeVersionId | bigint | Y |  | FK → activity.PracticeVersion |
| RoutineId | bigint | Y |  | FK → activity.OfflineRoutine |
| LocalDate | date |  |  |  |
| IsOptional | bit |  | 0 |  |
| Status | nvarchar(16) |  | 'Due' | Values: Due, Completed, Missed, Rescheduled, Cancelled, Excluded |
| CompletedAttemptId | bigint | Y |  | FK → activity.PracticeAttempt |
| RescheduledToActionId | bigint | Y |  | FK → recovery.ScheduledAction |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |

**Unique:** `(CompletedAttemptId)` WHERE CompletedAttemptId IS NOT NULL

**Indexes:** (PersonId, LocalDate)

**Used by:** This Week, Home "next action", History heatmap, Insights → Plan & Practice.

---

### `recovery.WeeklyReview`

The weekly review decision (and the self-reported phone minutes).

*قرار المراجعة الأسبوعية.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| CycleId | bigint |  |  | FK → recovery.RecoveryCycle |
| WeekNo | tinyint |  |  |  |
| ResultingRevisionId | bigint | Y |  | FK → recovery.PlanRevision |
| ManageabilityCode | nvarchar(40) | Y |  |  |
| FitCode | nvarchar(40) | Y |  |  |
| ReportedPhoneMinutesPerDay | smallint | Y |  |  |
| DecisionCode | nvarchar(24) |  |  | Values: AcceptNext, KeepPace, Adjust, AutoContinued |
| ReviewedAtUtc | datetime2(3) |  |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |

**Unique:** `(CycleId, WeekNo)`

**Used by:** Weekly Review page.

---

## Schema `activity`

### `activity.PracticeDefinition`

The catalog of practices (code, type, title, status). Content lives in PracticeVersion.

*كتالوج الممارسات بمحتواها وقواعد صلاحيتها.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| Code | nvarchar(64) |  |  |  |
| PracticeType | nvarchar(32) |  |  | Values: DepthPractice, ListeningRecall, PracticalMicroChallenge, ProtectedWork |
| Title | nvarchar(160) |  |  |  |
| Status | nvarchar(16) |  | 'Draft' | Values: Draft, Published, Deprecated, Retired |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |

**Unique:** `(Code)`

**Used by:** Browse Practices, For You, Admin → Activity catalog.

---

### `activity.PracticeVersion`

Immutable content of one version of a practice. Plans, attempts and assignments point at the version they used, so the original content can always be re-opened (audit B1; provisional owner assumption restored in the submission).

*محتوى نسخة ثابتة من الممارسة؛ يمكن إعادة فتح المحتوى الأصلي لأي محاولة.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| DefinitionId | bigint |  |  | FK → activity.PracticeDefinition |
| VersionNo | int |  |  |  |
| ContentRef | nvarchar(300) |  |  |  |
| ContentJson | nvarchar(max) | Y |  | JSON: Prompt, materials and timing of this version. |
| DifficultyTier | smallint |  |  |  |
| EstimatedMinutes | smallint | Y |  |  |
| EvidenceTier | nvarchar(24) |  |  | Values: SystemScored, BrowserObserved, SelfReported, Reviewed |
| ValidationVersion | nvarchar(64) |  |  |  |
| RulesJson | nvarchar(max) | Y |  | JSON: Validation rules (what counts as a completed, valid attempt). |
| PublishedAtUtc | datetime2(3) |  |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |

**Unique:** `(DefinitionId, VersionNo)`

**Used by:** Practice players, History re-open, assigned tasks.

---

### `activity.PracticeAttempt`

One run of a practice, with its outcome, score and the resulting tier change.

*تشغيل واحد لممارسة ونتيجته وأثره على المستوى.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| PublicId | uniqueidentifier |  | NEWSEQUENTIALID() |  |
| PersonId | bigint |  |  | FK → iam.Person |
| PracticeVersionId | bigint |  |  | FK → activity.PracticeVersion |
| Source | nvarchar(16) |  |  | Values: Plan, OnDemand, Assignment |
| ScheduledActionId | bigint | Y |  | FK → recovery.ScheduledAction |
| Status | nvarchar(16) |  | 'Started' | Values: Started, Paused, Submitted, Completed, Invalid, Cancelled |
| Valid | bit | Y |  |  |
| OutcomeCode | nvarchar(40) | Y |  |  |
| ScoreValue | decimal(9,4) | Y |  |  |
| StartedAtUtc | datetime2(3) |  |  |  |
| EndedAtUtc | datetime2(3) | Y |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |
| Title | nvarchar(160) | Y |  | Practice title at the time, so History keeps showing what was done after a catalog edit. |
| ResultingTier | smallint | Y |  | The person's tier for this practice type after this attempt (set when the attempt completes). |
| ProgressionOutcome | nvarchar(12) | Y |  | Advanced / Stayed / Regressed. Level-up and level-down history is read from these two columns. |

**Unique:** `(PublicId)`

**CHECK:** `CK_PracticeAttempt_Progression`: ProgressionOutcome IS NULL OR ProgressionOutcome IN ('Advanced','Stayed','Regressed')

**Indexes:** (PersonId, StartedAtUtc)

**Used by:** Practice players, Training → History, Garden growth, Insights.

---

### `activity.OfflineRoutine`

A routine the person wants to keep away from the screen.

*روتين غير متصل بالشاشة.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| PersonId | bigint |  |  | FK → iam.Person |
| Title | nvarchar(160) |  |  |  |
| Hint | nvarchar(300) | Y |  |  |
| ScheduleRuleJson | nvarchar(400) | Y |  | JSON: Days/times of the routine. |
| IsInitialCommitment | bit |  | 0 |  |
| Status | nvarchar(16) |  | 'Active' | Values: Active, Paused, Archived |
| ArchivedAtUtc | datetime2(3) | Y |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |

**Used by:** My Offline Routine, initial commitment, offline to-do.

---

### `activity.RoutineCheckIn`

Done / Skipped for a routine on one local date.

*تسجيل إنجاز أو تخطي الروتين ليوم محدد.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| RoutineId | bigint |  |  | FK → activity.OfflineRoutine |
| PersonId | bigint |  |  | FK → iam.Person |
| LocalDate | date |  |  |  |
| State | nvarchar(16) |  |  | Values: Done, Skipped |
| RecordedAtUtc | datetime2(3) |  |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |

**Unique:** `(RoutineId, LocalDate)`

**Used by:** Offline routine, Offline Life in Insights, flower in the Garden.

---

## Schema `shield`

### `shield.ExtensionInstallation`

A browser extension explicitly paired to a person.

*امتداد متصفح مقترن بالشخص.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| PersonId | bigint |  |  | FK → iam.Person |
| InstallationPublicId | uniqueidentifier |  |  |  |
| BrowserCode | nvarchar(40) |  |  |  |
| ExtensionVersion | nvarchar(40) |  |  |  |
| SyncKeyHash | varbinary(64) |  |  |  |
| Status | nvarchar(16) |  | 'Connected' | Values: Connected, Disconnected, Revoked |
| PairedAtUtc | datetime2(3) |  |  |  |
| LastSeenAtUtc | datetime2(3) | Y |  |  |
| RevokedAtUtc | datetime2(3) | Y |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |

**Unique:** `(InstallationPublicId)`

**Used by:** Shield → Connected / Disconnected / Sync Pending.

---

### `shield.ProtectionSession`

A timed website-protection session.

*جلسة حماية مؤقتة من المواقع.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| PublicId | uniqueidentifier |  | NEWSEQUENTIALID() |  |
| PersonId | bigint |  |  | FK → iam.Person |
| InstallationId | bigint |  |  | FK → shield.ExtensionInstallation |
| DomainCodesJson | nvarchar(1000) |  |  | JSON: The site families requested to be blocked for this session. |
| LockMode | nvarchar(16) |  | 'Standard' | Values: Standard, Locked |
| StartedAtUtc | datetime2(3) |  |  |  |
| EndsAtUtc | datetime2(3) |  |  |  |
| Status | nvarchar(16) |  | 'Requested' | Values: Requested, Active, Expired, Failed, Disconnected, Cancelled |
| FailureCode | nvarchar(40) | Y |  |  |
| EndedAtUtc | datetime2(3) | Y |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |

**Unique:** `(PublicId)` · `(InstallationId)` WHERE Status IN ('Requested','Active')

**Used by:** Shield → Start Protection.

---

### `shield.BrowserUsagePeriod`

One batch of browser-usage facts from the extension for one local day, with per-site-family seconds.

*دفعة قياس استخدام المتصفح مع الثواني لكل عائلة مواقع.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| PersonId | bigint |  |  | FK → iam.Person |
| InstallationId | bigint |  |  | FK → shield.ExtensionInstallation |
| LocalDate | date |  |  |  |
| TimeZoneId | nvarchar(80) |  |  |  |
| ObservedSeconds | int |  |  |  |
| CoverageSeconds | int |  |  |  |
| SequenceNo | bigint |  |  |  |
| ReceivedAtUtc | datetime2(3) |  |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |
| DomainsJson | nvarchar(max) | Y |  | Seconds per supported site family for this batch (replaces the v4 BrowserUsageDomain table). · JSON: [{"d":"video","s":1260},{"d":"social","s":840}] |

**Unique:** `(InstallationId, SequenceNo)`

**CHECK:** `CK_BrowserUsagePeriod_Seconds`: ObservedSeconds >= 0 AND CoverageSeconds >= 0 AND ObservedSeconds <= 86400 AND CoverageSeconds <= 86400

**Indexes:** (PersonId, LocalDate)

**Used by:** Insights → Digital Habits ("By website"), coverage notes.

---

## Schema `institution`

### `institution.Initiative`

The initiative itself: owner organization, lifecycle status, current revision pointer, Builder draft and cancellation.

*المبادرة نفسها: المالك والحالة والنسخة الحالية والمسودة والإلغاء.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| PublicId | uniqueidentifier |  | NEWSEQUENTIALID() |  |
| InstitutionId | bigint |  |  | FK → org.Organization |
| Status | nvarchar(24) |  | 'Draft' | Values: Draft, Published, RegistrationClosed, Suspended, Completed, Cancelled, Archived |
| CurrentRevisionId | bigint | Y |  | FK → institution.InitiativeRevision |
| DraftJson | nvarchar(max) | Y |  | JSON: Builder draft (one editor at a time, guarded by RowVersion). |
| DraftLastSavedStage | tinyint | Y |  |  |
| DraftUpdatedAtUtc | datetime2(3) | Y |  |  |
| FirstPublishedAtUtc | datetime2(3) | Y |  |  |
| CompletedAtUtc | datetime2(3) | Y |  |  |
| CancelledAtUtc | datetime2(3) | Y |  |  |
| CancellationReason | nvarchar(800) | Y |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |
| RowVersion | rowversion |  |  |  |

**Unique:** `(PublicId)`

**Used by:** Initiative Builder, Explore, Organization → Initiatives, cancel/complete/archive.

---

### `institution.InitiativeRevision`

Immutable published terms of an initiative (capacity, dates, cost, audience, form). An edit with a reason creates a new row; applications point at the revision they applied on.

*شروط المبادرة المنشورة الثابتة؛ كل تعديل بسبب ينشئ نسخة جديدة.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| InitiativeId | bigint |  |  | FK → institution.Initiative |
| RevisionNo | int |  |  |  |
| ChangeKind | nvarchar(16) |  |  | Values: Publish, Reschedule, TermsUpdate |
| ChangeReason | nvarchar(800) | Y |  |  |
| Title | nvarchar(200) |  |  |  |
| Summary | nvarchar(1200) |  |  |  |
| TopicCode | nvarchar(64) |  |  |  |
| OperatingMode | nvarchar(16) |  |  | Values: Awareness, Structured |
| ParticipationMode | nvarchar(16) |  |  | Values: Online, InPerson, Hybrid |
| AudienceCode | nvarchar(80) |  |  |  |
| CoverageCode | nvarchar(120) | Y |  |  |
| Capacity | smallint |  |  |  |
| WaitlistEnabled | bit |  |  |  |
| OfferHoldHours | smallint | Y |  |  |
| ApplicationOpensAtUtc | datetime2(3) | Y |  |  |
| ApplicationClosesAtUtc | datetime2(3) | Y |  |  |
| TimeZoneId | nvarchar(80) |  |  |  |
| StartsAtUtc | datetime2(3) |  |  |  |
| EndsAtUtc | datetime2(3) |  |  |  |
| CostKind | nvarchar(8) |  |  |  |
| Price | decimal(19,4) | Y |  |  |
| Currency | char(3) | Y |  |  |
| ConsentNoticeVersion | nvarchar(64) |  |  |  |
| CompletionPolicyRef | nvarchar(120) |  |  |  |
| RegistrationFormVersionId | bigint | Y |  | FK → forms.FormVersion |
| PublishedSnapshotJson | nvarchar(max) |  |  | JSON: Published rich content: components, order, FAQ. |
| PublishedByPersonId | bigint |  |  | FK → iam.Person |
| PublishedAtUtc | datetime2(3) |  |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |

**Unique:** `(InitiativeId, RevisionNo)`

**CHECK:** `CK_InitiativeRevision_Capacity`: Capacity BETWEEN 1 AND 135

**Used by:** Explore details, Update with reason / Reschedule, "Version & decision history" tab, applicant sees the terms they applied on.

---

### `institution.InitiativeApplication`

A person's application to an initiative, its waiting-list offer and its membership, in one row with a status.

*طلب الانضمام وعرض المقعد والعضوية في صف واحد.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| PublicId | uniqueidentifier |  | NEWSEQUENTIALID() |  |
| InitiativeId | bigint |  |  | FK → institution.Initiative |
| PersonId | bigint |  |  | FK → iam.Person |
| AttemptNo | int |  |  |  |
| TermsRevisionId | bigint |  |  | FK → institution.InitiativeRevision |
| RegistrationResponseId | bigint | Y |  | FK → forms.FormResponse |
| ParticipationMode | nvarchar(16) | Y |  |  |
| Status | nvarchar(16) |  | 'Pending' | Values: Pending, Queued, Offered, Accepted, Suspended, Rejected, Withdrawn, OfferDeclined, OfferExpired, Removed, Completed, Cancelled, Blocked, BlockLifted |
| SubmittedAtUtc | datetime2(3) |  |  |  |
| ConsentAtUtc | datetime2(3) |  |  |  |
| QueuedAtUtc | datetime2(3) | Y |  |  |
| OfferedAtUtc | datetime2(3) | Y |  |  |
| OfferExpiresAtUtc | datetime2(3) | Y |  |  |
| OfferRespondedAtUtc | datetime2(3) | Y |  |  |
| AcceptedAtUtc | datetime2(3) | Y |  |  |
| WithdrawalCutoffAtUtc | datetime2(3) | Y |  |  |
| EndedAtUtc | datetime2(3) | Y |  |  |
| EndReason | nvarchar(32) | Y |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |
| RowVersion | rowversion |  |  |  |

**Unique:** `(PublicId)` · `(InitiativeId, PersonId, AttemptNo)` · `(InitiativeId, PersonId)` WHERE Status IN ('Pending','Queued','Offered','Accepted','Suspended','Blocked') · `(PersonId)` WHERE Status IN ('Accepted','Suspended')

**Indexes:** (InitiativeId) WHERE Status IN ('Offered','Accepted','Suspended') · (InitiativeId, QueuedAtUtc) WHERE Status = 'Queued'

**Used by:** Apply, Approve/Reject/Suspend/Remove/Block, Waitlist offers, Withdraw, My Initiatives, Participants page.

---

## Schema `coach`

### `coach.CoachProgram`

RETIRED (v4.1): historical independent coach programs. Read-only; no new programs. Kept so earlier groups, memberships and completions stay attributable.

*برنامج المدرب المستقل: المالك والحالة والمسودة والمحتوى المنشور الحالي.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| PublicId | uniqueidentifier |  | NEWSEQUENTIALID() |  |
| OwnerPersonId | bigint |  |  | FK → iam.Person |
| Status | nvarchar(16) |  | 'Draft' | Values: Draft, Published, Paused, Suspended, Completed, Archived |
| DraftJson | nvarchar(max) | Y |  | JSON: Program Builder draft. |
| DraftUpdatedAtUtc | datetime2(3) | Y |  |  |
| SuspendedAtUtc | datetime2(3) | Y |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |
| RowVersion | rowversion |  |  |  |
| Title | nvarchar(200) | Y |  | from v4 ProgramRevision |
| PublishedJson | nvarchar(max) | Y |  | The published program: objective, eligibility, dates, stages, due policy, completion rule, consent notice. · JSON: {"objective":"…","eligibility":"…","startsOn":"2026-12-01","endsOn":"2027-02-01","stages":[…],"duePolicy":"…","completionRule":"…","consentNotice":"2026-10"} |
| PublishedVersionNo | int | Y |  | Incremented on each publish. |
| PublishedAtUtc | datetime2(3) | Y |  | Last publish time. |

**Unique:** `(PublicId)`

**Used by:** History only. Coaches work inside Institution Initiatives.

---

### `coach.OperationalGroup`

A group under one initiative, with its current coach. ProgramId is legacy history for retired independent programs; new groups need InitiativeId.

*مجموعة تشغيلية تابعة لمبادرة أو برنامج ومدربها الحالي.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| PublicId | uniqueidentifier |  | NEWSEQUENTIALID() |  |
| InitiativeId | bigint | Y |  | FK → institution.Initiative |
| ProgramId | bigint | Y |  | FK → coach.CoachProgram |
| Name | nvarchar(160) |  |  |  |
| Status | nvarchar(16) |  | 'Open' | Values: Open, Closed, Archived |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |
| RowVersion | rowversion |  |  |  |
| CoachPersonId | bigint | Y |  | Current coach of the group. · FK → iam.Person |
| CoachStaffAppointmentId | bigint | Y |  | For initiative groups: the coach's active appointment. · FK → org.StaffAppointment |
| CoachAssignedAtUtc | datetime2(3) | Y |  | When the current coach took over. |
| Purpose | nvarchar(300) | Y |  | Why the group exists (required by the Program group form). |
| Description | nvarchar(1000) | Y |  |  |
| Capacity | smallint | Y |  | Maximum active members (checked in C# when someone joins or is placed). |
| RequiresApproval | bit |  | 0 | Program groups: a student who accepts an invitation waits for the coach to approve (membership status Pending). |

**Unique:** `(PublicId)`

**CHECK:** `CK_OperationalGroup_Parent`: (InitiativeId IS NOT NULL AND ProgramId IS NULL) OR (InitiativeId IS NULL AND ProgramId IS NOT NULL) · `CK_OperationalGroup_Capacity`: Capacity IS NULL OR (Capacity > 0 AND Capacity <= 500)

**Used by:** Students & Groups, Allocate Coaches, mentor groups.

---

### `coach.GroupMembership`

Placement in and membership of an initiative group by application. Invited rows are legacy program invitations kept as history.

*دعوة وعضوية وتسكين الطالب في مجموعة.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| GroupId | bigint |  |  | FK → coach.OperationalGroup |
| ApplicationId | bigint | Y |  | FK → institution.InitiativeApplication |
| PersonId | bigint | Y |  | FK → iam.Person |
| Status | nvarchar(16) |  |  | Values: Invited, Pending, Active, Ended, Declined, Expired, Revoked |
| NormalizedEmail | nvarchar(320) | Y |  |  |
| TokenHash | varbinary(64) | Y |  |  |
| InviteExpiresAtUtc | datetime2(3) | Y |  |  |
| InvitedByPersonId | bigint | Y |  | FK → iam.Person |
| StartedAtUtc | datetime2(3) | Y |  |  |
| EndedAtUtc | datetime2(3) | Y |  |  |
| EndReason | nvarchar(24) | Y |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |
| RowVersion | rowversion |  |  |  |

**Unique:** `(GroupId, PersonId)` WHERE Status IN ('Pending','Active') · `(ApplicationId)` WHERE ApplicationId IS NOT NULL AND Status = 'Active' · `(GroupId, NormalizedEmail)` WHERE Status = 'Invited' · `(TokenHash)` WHERE TokenHash IS NOT NULL

**CHECK:** `CK_GroupMembership_Identity`: (Status = 'Invited' AND PersonId IS NULL AND NormalizedEmail IS NOT NULL AND TokenHash IS NOT NULL) OR (Status IN ('Declined','Expired','Revoked') AND (PersonId IS NOT NULL OR (NormalizedEmail IS NOT NULL AND TokenHash IS NOT NULL))) OR (Status IN ('Pending','Active','Ended') AND PersonId IS NOT NULL)

**Indexes:** (PersonId) WHERE Status = 'Active'

**Used by:** Join by invitation, Student group, transfer between groups.

---

## Schema `task`

### `task.Assignment`

A task a coach gives to a group, with its current text and due date.

*مهمة يعطيها المدرب لمجموعة بنصها وموعدها الحالي.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| PublicId | uniqueidentifier |  | NEWSEQUENTIALID() |  |
| GroupId | bigint |  |  | FK → coach.OperationalGroup |
| AuthorPersonId | bigint |  |  | FK → iam.Person |
| Status | nvarchar(16) |  | 'Draft' | Values: Draft, Published, Cancelled, Closed |
| CancelledAtUtc | datetime2(3) | Y |  |  |
| CancelReason | nvarchar(800) | Y |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |
| RowVersion | rowversion |  |  |  |
| Title | nvarchar(200) |  |  | from v4 AssignmentRevision |
| PracticeVersionId | bigint | Y |  | from v4 AssignmentRevision · FK → activity.PracticeVersion |
| Instructions | nvarchar(max) |  |  | from v4 AssignmentRevision |
| ReviewMode | nvarchar(16) |  |  | from v4 AssignmentRevision · Values: SystemRule, CoachReview |
| IsRequired | bit |  |  | from v4 AssignmentRevision |
| StartsAtUtc | datetime2(3) | Y |  | from v4 AssignmentRevision |
| DueAtUtc | datetime2(3) | Y |  | from v4 AssignmentRevision |
| AllowLate | bit |  | 0 | from v4 AssignmentRevision |
| RevisionNo | int |  | 1 | Incremented when the coach edits or reschedules. |
| HistoryJson | nvarchar(max) | Y |  | Earlier versions: title, instructions, due date, reason, time. Recipients keep the version they were assigned. · JSON: [{"revisionNo":1,"title":"…","instructions":"…","dueAtUtc":"…","reason":"…","changedAtUtc":"…"}] |

**Unique:** `(PublicId)`

**Used by:** Mentor → Assignments, Student → Tasks, Activities → Assigned.

---

### `task.AssignmentRecipient`

One student's copy of an assignment and its progress state.

*نسخة الطالب من المهمة وحالتها.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| AssignmentId | bigint |  |  | FK → task.Assignment |
| PersonId | bigint |  |  | FK → iam.Person |
| Status | nvarchar(16) |  | 'Assigned' | Values: Assigned, InProgress, Submitted, NeedsRevision, Approved, Rejected, Cancelled, Expired |
| LastAttemptNo | int |  | 0 |  |
| AssignedAtUtc | datetime2(3) |  |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |
| AssignedRevisionNo | int |  | 1 | Assignment.RevisionNo this student was given. |

**Unique:** `(AssignmentId, PersonId)`

**Indexes:** (PersonId, Status)

**Used by:** Student task list, mentor progress column.

---

### `task.SubmissionAttempt`

Each submission and resubmission by a student (text, file or linked practice).

*كل تسليم أو إعادة تسليم من الطالب.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| RecipientId | bigint |  |  | FK → task.AssignmentRecipient |
| AttemptNo | int |  |  |  |
| Body | nvarchar(max) | Y |  |  |
| FileId | bigint | Y |  | FK → files.SecureFile |
| PracticeAttemptId | bigint | Y |  | FK → activity.PracticeAttempt |
| SubmittedAtUtc | datetime2(3) |  |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |

**Unique:** `(RecipientId, AttemptNo)` · `(PracticeAttemptId)` WHERE PracticeAttemptId IS NOT NULL

**Used by:** Student submit/resubmit, mentor review queue.

---

### `task.ReviewDecision`

A coach's decision on a submission (Approved / NeedsRevision / Rejected) with feedback and an internal note. A correction is a new row that supersedes the old one.

*قرار المدرب على التسليم مع الملاحظة الداخلية.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| AttemptId | bigint |  |  | FK → task.SubmissionAttempt |
| SupersedesId | bigint | Y |  | FK → task.ReviewDecision |
| ReviewerPersonId | bigint |  |  | FK → iam.Person |
| Decision | nvarchar(16) |  |  | Values: Approved, NeedsRevision, Rejected |
| Feedback | nvarchar(2000) | Y |  |  |
| DecidedAtUtc | datetime2(3) |  |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |
| PrivateNote | nvarchar(max) | Y |  | from v4 ReviewPrivateNote |

**Unique:** `(SupersedesId)` WHERE SupersedesId IS NOT NULL · `(AttemptId)` WHERE SupersedesId IS NULL

**Used by:** Mentor → Review queue, student feedback.

---

### `task.OperationalReport`

Coach, initiative-supervisor and provider-supervisor reports; coach reports are reviewed and included in a supervisor report.

*تقارير المدرب والمشرف والمزوّد ومراجعتها.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| PublicId | uniqueidentifier |  | NEWSEQUENTIALID() |  |
| Kind | nvarchar(24) |  |  | Values: Coach, InitiativeSupervisor, ProviderSupervisor |
| GroupId | bigint | Y |  | FK → coach.OperationalGroup |
| InitiativeId | bigint | Y |  | FK → institution.Initiative |
| ExperienceId | bigint | Y |  | FK → provider.Experience |
| AuthorPersonId | bigint |  |  | FK → iam.Person |
| PeriodStartDate | date |  |  |  |
| PeriodEndDate | date |  |  |  |
| Status | nvarchar(16) |  | 'Draft' | Values: Draft, Submitted |
| MetricsSnapshotJson | nvarchar(max) | Y |  | JSON: Numbers frozen at submission. |
| SubmittedAtUtc | datetime2(3) | Y |  |  |
| IncludedInReportId | bigint | Y |  | FK → task.OperationalReport |
| ReviewedByPersonId | bigint | Y |  | FK → iam.Person |
| ReviewedAtUtc | datetime2(3) | Y |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |
| RowVersion | rowversion |  |  |  |
| BodyJson | nvarchar(max) | Y |  | Narrative sections of the report. · JSON: {"observations":"…","issues":"…","recommendations":"…"} |
| ReviewJson | nvarchar(max) | Y |  | Reviewer note and correction. · JSON: {"note":"…","correction":"…"} |

**Unique:** `(PublicId)`

**CHECK:** `CK_OperationalReport_Scope`: (Kind = 'Coach' AND GroupId IS NOT NULL AND ExperienceId IS NULL) OR (Kind = 'InitiativeSupervisor' AND InitiativeId IS NOT NULL AND GroupId IS NULL AND ExperienceId IS NULL) OR (Kind = 'ProviderSupervisor' AND ExperienceId IS NOT NULL AND GroupId IS NULL AND InitiativeId IS NULL)

**Indexes:** (InitiativeId, Kind, PeriodEndDate) · (ExperienceId, PeriodEndDate) WHERE ExperienceId IS NOT NULL

**Used by:** Organization → Report inbox, coach report, supervisor report.

---

## Schema `session`

### `session.Session`

A session (or meeting) of an initiative or an experience, with time, mode, capacity per mode, venue and check-in window.

*جلسة أو اجتماع تابع لمبادرة أو تجربة.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| PublicId | uniqueidentifier |  | NEWSEQUENTIALID() |  |
| InitiativeId | bigint | Y |  | FK → institution.Initiative |
| ExperienceId | bigint | Y |  | FK → provider.Experience |
| Purpose | nvarchar(16) |  | 'Session' | Values: Session, Meeting |
| Title | nvarchar(200) |  |  |  |
| Mode | nvarchar(16) |  |  | Values: Online, InPerson, Hybrid |
| Status | nvarchar(16) |  | 'Draft' | Values: Draft, Published, Cancelled, Completed |
| TimeZoneId | nvarchar(80) |  |  |  |
| StartsAtUtc | datetime2(3) |  |  |  |
| EndsAtUtc | datetime2(3) |  |  |  |
| AttendanceRequired | bit |  |  |  |
| OnlineCapacity | int | Y |  |  |
| InPersonCapacity | int | Y |  |  |
| MeetingAudience | nvarchar(16) | Y |  |  |
| MeetingAudiencePersonId | bigint | Y |  | FK → iam.Person |
| CancelledAtUtc | datetime2(3) | Y |  |  |
| CancelReason | nvarchar(800) | Y |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |
| RowVersion | rowversion |  |  |  |
| Venue | nvarchar(300) | Y |  | from v4 SessionRevision |
| ProtectedLinkRef | nvarchar(300) | Y |  | from v4 SessionRevision |
| CheckInBeforeMinutes | smallint |  |  | from v4 SessionRevision |
| CheckInAfterMinutes | smallint |  |  | from v4 SessionRevision |
| CompletionRuleRef | nvarchar(120) | Y |  | from v4 SessionRevision |

**Unique:** `(PublicId)`

**CHECK:** `CK_Session_Owner`: (InitiativeId IS NOT NULL AND ExperienceId IS NULL) OR (InitiativeId IS NULL AND ExperienceId IS NOT NULL) · `CK_Session_Capacity`: (OnlineCapacity IS NULL OR OnlineCapacity > 0) AND (InPersonCapacity IS NULL OR InPersonCapacity > 0)

**Indexes:** (InitiativeId, StartsAtUtc) WHERE InitiativeId IS NOT NULL · (ExperienceId, StartsAtUtc) WHERE ExperienceId IS NOT NULL

**Used by:** Organization → Sessions, Provider calendar, Explore → Sessions.

---

### `session.SessionDuty`

Which supervisors are responsible for a session.

*المشرفون المسؤولون عن الجلسة.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| SessionId | bigint |  |  | FK → session.Session |
| StaffAppointmentId | bigint |  |  | FK → org.StaffAppointment |
| Status | nvarchar(16) |  | 'Active' | Values: Active, Revoked |
| AssignedByPersonId | bigint |  |  | FK → iam.Person |
| AssignedAtUtc | datetime2(3) |  |  |  |
| RevokedAtUtc | datetime2(3) | Y |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |

**Unique:** `(SessionId, StaffAppointmentId)` WHERE Status = 'Active'

**Used by:** "Needs Supervisor" badge, supervisor schedule and attendance.

---

### `session.SessionRegistration`

A member's registration to a session and the mode (online or on-site).

*تسجيل العضو في جلسة ونمط الحضور.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| PublicId | uniqueidentifier |  | NEWSEQUENTIALID() |  |
| SessionId | bigint |  |  | FK → session.Session |
| PersonId | bigint |  |  | FK → iam.Person |
| Mode | nvarchar(16) |  |  | Values: Online, InPerson |
| Status | nvarchar(16) |  | 'Pending' | Values: Pending, Confirmed, Cancelled |
| RegistrationResponseId | bigint | Y |  | FK → forms.FormResponse |
| CredentialHash | varbinary(32) | Y |  |  |
| RegisteredAtUtc | datetime2(3) |  |  |  |
| CancelledAtUtc | datetime2(3) | Y |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |

**Unique:** `(PublicId)` · `(SessionId, PersonId)` WHERE Status IN ('Pending','Confirmed') · `(CredentialHash)` WHERE CredentialHash IS NOT NULL

**Indexes:** (SessionId, Mode) WHERE Status IN ('Pending','Confirmed')

**Used by:** Register for a session, QR/typed code credential.

---

### `session.Attendance`

What actually happened: Present / Late / Absent / NotRecorded, how it was recorded, and the outcome.

*الحضور الفعلي وطريقة تسجيله ونتيجته.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| SessionId | bigint |  |  | FK → session.Session |
| PersonId | bigint |  |  | FK → iam.Person |
| RegistrationId | bigint | Y |  | FK → session.SessionRegistration |
| BookingId | bigint | Y |  | FK → provider.ExperienceBooking |
| Status | nvarchar(16) |  |  | Values: Present, Late, Absent, NotRecorded |
| Method | nvarchar(24) | Y |  |  |
| MethodReason | nvarchar(800) | Y |  |  |
| RecordedByPersonId | bigint |  |  | FK → iam.Person |
| RecordedAtUtc | datetime2(3) |  |  |  |
| OutcomeCode | nvarchar(16) | Y |  |  |
| OutcomeNotes | nvarchar(2000) | Y |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |
| RowVersion | rowversion |  |  |  |

**Unique:** `(SessionId, PersonId)`

**CHECK:** `CK_Attendance_Source`: (RegistrationId IS NOT NULL AND BookingId IS NULL) OR (RegistrationId IS NULL AND BookingId IS NOT NULL)

**Used by:** Check-in, attendance sheet, supervisor/provider evaluations, rabbit in the Garden.

---

### `session.AbsenceExcuse`

A student's excuse for an absence, the supervisor's recommendation and the representative's decision.

*عذر الغياب وتوصية المشرف وقرار الممثل.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| PublicId | uniqueidentifier |  | NEWSEQUENTIALID() |  |
| AttendanceId | bigint |  |  | FK → session.Attendance |
| PersonId | bigint |  |  | FK → iam.Person |
| Reason | nvarchar(1000) |  |  |  |
| FileId | bigint | Y |  | FK → files.SecureFile |
| Status | nvarchar(16) |  | 'Submitted' | Values: Submitted, MoreInfo, Recommended, Accepted, Rejected, Withdrawn |
| Recommendation | nvarchar(8) | Y |  |  |
| RecommendationNote | nvarchar(1000) | Y |  |  |
| RecommendedByPersonId | bigint | Y |  | FK → iam.Person |
| RecommendedAtUtc | datetime2(3) | Y |  |  |
| DecidedByPersonId | bigint | Y |  | FK → iam.Person |
| DecisionReason | nvarchar(1000) | Y |  |  |
| DecidedAtUtc | datetime2(3) | Y |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |
| RowVersion | rowversion |  |  |  |

**Unique:** `(PublicId)` · `(AttendanceId)`

**Used by:** Student → excuse, Supervisor → Excuses, representative decision.

---

### `session.Completion`

Completion of an initiative, a coach program or a provider camp.

*إكمال مبادرة أو برنامج أو مخيم.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| PublicId | uniqueidentifier |  | NEWSEQUENTIALID() |  |
| Kind | nvarchar(16) |  |  | Values: Initiative, Program, Camp |
| PersonId | bigint |  |  | FK → iam.Person |
| ApplicationId | bigint | Y |  | FK → institution.InitiativeApplication |
| ProgramId | bigint | Y |  | FK → coach.CoachProgram |
| BookingId | bigint | Y |  | FK → provider.ExperienceBooking |
| Status | nvarchar(16) |  | 'Pending' | Values: Pending, Completed, NotMet |
| EvaluatorPersonId | bigint | Y |  | FK → iam.Person |
| EvaluatedAtUtc | datetime2(3) | Y |  |  |
| BasisJson | nvarchar(max) | Y |  | JSON: The criteria and counts the decision was based on, frozen at decision time. |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |

**Unique:** `(PublicId)` · `(ApplicationId)` WHERE ApplicationId IS NOT NULL · `(ProgramId, PersonId)` WHERE ProgramId IS NOT NULL · `(BookingId)` WHERE BookingId IS NOT NULL

**CHECK:** `CK_Completion_Subject`: (Kind = 'Initiative' AND ApplicationId IS NOT NULL AND ProgramId IS NULL AND BookingId IS NULL) OR (Kind = 'Program' AND ProgramId IS NOT NULL AND ApplicationId IS NULL AND BookingId IS NULL) OR (Kind = 'Camp' AND BookingId IS NOT NULL AND ApplicationId IS NULL AND ProgramId IS NULL)

**Indexes:** (PersonId, Kind)

**Used by:** Complete initiative, Program completion, camp evaluations, student progress.

---

## Schema `provider`

### `provider.Experience`

An Institution-owned outdoor activity, trip or camp: owning Institution, kind, lifecycle status, current revision pointer, Builder draft and cancellation.

*تجربة أو مخيم المزوّد: المالك والحالة والنسخة الحالية والمسودة.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| PublicId | uniqueidentifier |  | NEWSEQUENTIALID() |  |
| OrganizationId | bigint |  |  | was ProviderId in v4 · FK → org.Organization |
| Kind | nvarchar(16) |  |  | Values: Experience, Camp |
| Status | nvarchar(16) |  | 'Draft' | Values: Draft, Published, Suspended, Completed, Cancelled, Archived |
| CurrentRevisionId | bigint | Y |  | FK → provider.ExperienceRevision |
| DraftJson | nvarchar(max) | Y |  | JSON: Outdoor Activity Builder draft. |
| DraftLastSavedStage | tinyint | Y |  |  |
| DraftUpdatedAtUtc | datetime2(3) | Y |  |  |
| CancelledAtUtc | datetime2(3) | Y |  |  |
| CancellationReason | nvarchar(800) | Y |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |
| RowVersion | rowversion |  |  |  |

**Unique:** `(PublicId)`

**Used by:** Institution → New Outdoor Activity, Explore → Outdoor activities, bookings.

---

### `provider.ExperienceRevision`

Immutable published terms of an experience (place, time, price, capacity, eligibility, forms). An edit creates a new row; a booking records the revision it was made on.

*شروط التجربة المنشورة الثابتة؛ كل تعديل ينشئ نسخة جديدة والحجز يسجّل النسخة.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| ExperienceId | bigint |  |  | FK → provider.Experience |
| RevisionNo | int |  |  |  |
| Title | nvarchar(200) |  |  |  |
| Venue | nvarchar(300) |  |  |  |
| City | nvarchar(120) | Y |  |  |
| TimeZoneId | nvarchar(80) |  |  |  |
| StartsAtUtc | datetime2(3) |  |  |  |
| EndsAtUtc | datetime2(3) |  |  |  |
| BookingOpensAtUtc | datetime2(3) | Y |  |  |
| BookingClosesAtUtc | datetime2(3) | Y |  |  |
| Capacity | int |  |  |  |
| WaitlistEnabled | bit |  |  |  |
| OfferHoldHours | smallint | Y |  |  |
| AudienceCode | nvarchar(80) |  |  |  |
| MinAge | tinyint | Y |  |  |
| MaxAge | tinyint | Y |  |  |
| ConsentNoticeVersion | nvarchar(64) |  |  |  |
| SafetyRef | nvarchar(300) |  |  |  |
| CancellationPolicyRef | nvarchar(300) |  |  |  |
| CostKind | nvarchar(8) |  |  |  |
| Price | decimal(19,4) | Y |  |  |
| Currency | char(3) | Y |  |  |
| CompletionRuleRef | nvarchar(120) |  |  |  |
| ParticipantFormVersionId | bigint | Y |  | FK → forms.FormVersion |
| ChangeReason | nvarchar(800) | Y |  |  |
| PublishedSnapshotJson | nvarchar(max) |  |  | JSON: Published rich content. |
| PublishedByPersonId | bigint |  |  | FK → iam.Person |
| PublishedAtUtc | datetime2(3) |  |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |
| RequiresApproval | bit |  | 0 | A booking waits for provider approval (status Pending) and takes no seat until approved (Client: experience.approval). |

**Unique:** `(ExperienceId, RevisionNo)`

**CHECK:** `CK_ExperienceRevision_Capacity`: Capacity > 0

**Used by:** Change notification to bookers, booking shows terms booked on.

---

### `provider.ExperienceBooking`

A person's booking, waiting-list offer and confirmation for an experience, in one row with a status.

*الحجز وعرض المقعد وتأكيده في صف واحد.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| PublicId | uniqueidentifier |  | NEWSEQUENTIALID() |  |
| ExperienceId | bigint |  |  | FK → provider.Experience |
| PersonId | bigint |  |  | FK → iam.Person |
| RevisionId | bigint |  |  | FK → provider.ExperienceRevision |
| Status | nvarchar(16) |  |  | Values: Pending, Queued, Offered, Confirmed, Cancelled, OfferDeclined, OfferExpired, Rejected |
| Mode | nvarchar(16) | Y |  |  |
| ConsentAtUtc | datetime2(3) |  |  |  |
| ParticipantResponseId | bigint | Y |  | FK → forms.FormResponse |
| QueuedAtUtc | datetime2(3) | Y |  |  |
| OfferedAtUtc | datetime2(3) | Y |  |  |
| OfferExpiresAtUtc | datetime2(3) | Y |  |  |
| OfferRespondedAtUtc | datetime2(3) | Y |  |  |
| ConfirmedAtUtc | datetime2(3) | Y |  |  |
| CancelledAtUtc | datetime2(3) | Y |  |  |
| CancelReason | nvarchar(800) | Y |  |  |
| CredentialHash | varbinary(32) | Y |  |  |
| BookedAtUtc | datetime2(3) |  |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |
| RowVersion | rowversion |  |  |  |
| CohortId | bigint | Y |  | Current cohort of a confirmed booking (replaces the v4 ProviderCohortMember table). · FK → provider.ProviderCohort |

**Unique:** `(PublicId)` · `(ExperienceId, PersonId)` WHERE Status IN ('Pending','Queued','Offered','Confirmed') · `(CredentialHash)` WHERE CredentialHash IS NOT NULL

**Indexes:** (ExperienceId) WHERE Status IN ('Offered','Confirmed') · (ExperienceId, QueuedAtUtc) WHERE Status = 'Queued'

**Used by:** Book / Join waitlist, cancel, offer accept, My Registrations, cohorts.

---

### `provider.ProviderCohort`

A cohort (group) of confirmed bookings under one supervisor.

*فوج من المحجوزين تحت مشرف واحد.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| ExperienceId | bigint |  |  | FK → provider.Experience |
| SupervisorAppointmentId | bigint |  |  | FK → org.StaffAppointment |
| Name | nvarchar(160) |  |  |  |
| Status | nvarchar(16) |  | 'Active' | Values: Active, Closed |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |
| RowVersion | rowversion |  |  |  |
| Description | nvarchar(500) | Y |  |  |
| Capacity | smallint | Y |  | Maximum members (checked in C# when a participant joins). |
| JoinTokenHash | varbinary(64) | Y |  | Participants join a cohort with a token (Client: participant.cohort.join). |

**Unique:** `(JoinTokenHash)` WHERE JoinTokenHash IS NOT NULL

**CHECK:** `CK_ProviderCohort_Capacity`: Capacity IS NULL OR (Capacity > 0 AND Capacity <= 500)

**Used by:** Provider → Cohorts, supervisor visibility limited to own cohort.

---

### `provider.ProviderIncident`

A safety incident reported by provider staff and its resolution.

*حادثة سلامة وحلها.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| PublicId | uniqueidentifier |  | NEWSEQUENTIALID() |  |
| ExperienceId | bigint |  |  | FK → provider.Experience |
| SessionId | bigint | Y |  | FK → session.Session |
| BookingId | bigint | Y |  | FK → provider.ExperienceBooking |
| ReportedByPersonId | bigint |  |  | FK → iam.Person |
| Summary | nvarchar(2000) |  |  |  |
| FileId | bigint | Y |  | FK → files.SecureFile |
| Status | nvarchar(16) |  | 'Open' | Values: Open, Reviewed, Closed |
| OccurredAtUtc | datetime2(3) |  |  |  |
| ResolutionNote | nvarchar(2000) | Y |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |

**Unique:** `(PublicId)`

**Used by:** Provider safety workflow, safe aggregate reports.

---

## Schema `forms`

### `forms.Form`

A registration form, survey or competition owned by an initiative or an experience.

*نموذج تسجيل أو استبيان أو مسابقة.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| PublicId | uniqueidentifier |  | NEWSEQUENTIALID() |  |
| InitiativeId | bigint | Y |  | FK → institution.Initiative |
| ExperienceId | bigint | Y |  | FK → provider.Experience |
| Purpose | nvarchar(16) |  |  | Values: Registration, Survey, Quiz, Feedback, Competition |
| Title | nvarchar(200) |  |  |  |
| Status | nvarchar(24) |  | 'Draft' | Values: Draft, Published, Closed, ResultsPublished, Archived |
| CurrentVersionId | bigint | Y |  | FK → forms.FormVersion |
| DraftJson | nvarchar(max) | Y |  | JSON: Form Builder draft. |
| ResultsPublishedAtUtc | datetime2(3) | Y |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |
| RowVersion | rowversion |  |  |  |

**Unique:** `(PublicId)`

**CHECK:** `CK_Form_Owner`: (InitiativeId IS NOT NULL AND ExperienceId IS NULL) OR (InitiativeId IS NULL AND ExperienceId IS NOT NULL)

**Used by:** Organization → Forms / Competitions, Provider participant form, Explore → Competitions.

---

### `forms.FormVersion`

A published, immutable version of a form. Responses point at the version they answered.

*نسخة منشورة ثابتة من النموذج.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| FormId | bigint |  |  | FK → forms.Form |
| VersionNo | int |  |  |  |
| ConsentNoticeVersion | nvarchar(64) |  |  |  |
| OpensAtUtc | datetime2(3) |  |  |  |
| ClosesAtUtc | datetime2(3) |  |  |  |
| AllowMultipleResponses | bit |  | 0 |  |
| RulesText | nvarchar(max) | Y |  |  |
| EntryPolicyJson | nvarchar(max) | Y |  | JSON: Competition entry rules. |
| PublishedByPersonId | bigint |  |  | FK → iam.Person |
| PublishedAtUtc | datetime2(3) |  |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |
| DefinitionJson | nvarchar(max) |  |  | Questions, options, validation and competition criteria of this version. · JSON: {"questions":[{"key":"q1","type":"single","prompt":"…","required":true,"options":[{"code":"a","label":"…"}]}],"criteria":[{"code":"c1","label":"…","max":10,"weight":1}]} |

**Unique:** `(FormId, VersionNo)`

**Used by:** Form publish, responses stay tied to the questions they saw.

---

### `forms.FormResponse`

One person's response (or competition entry) to a form version, with all answers.

*رد شخص على نسخة نموذج بكل إجاباته.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| PublicId | uniqueidentifier |  | NEWSEQUENTIALID() |  |
| FormVersionId | bigint |  |  | FK → forms.FormVersion |
| PersonId | bigint |  |  | FK → iam.Person |
| ResponseNo | int |  |  |  |
| Status | nvarchar(16) |  | 'Draft' | Values: Draft, Submitted, Withdrawn |
| ConsentAtUtc | datetime2(3) | Y |  |  |
| SubmittedAtUtc | datetime2(3) | Y |  |  |
| WithdrawnAtUtc | datetime2(3) | Y |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |
| RowVersion | rowversion |  |  |  |
| AnswersJson | nvarchar(max) | Y |  | Answers keyed by question key (replaces the v4 FormAnswer table). · JSON: {"q1":{"choice":["a"]},"q2":{"text":"…"},"q3":{"fileId":42}} |

**Unique:** `(PublicId)` · `(FormVersionId, PersonId, ResponseNo)`

**Indexes:** (FormVersionId) WHERE Status = 'Submitted'

**Used by:** Registration form answers, surveys, competition entries, /responses page.

---

### `forms.CompetitionJudgment`

A judge's decision and criterion scores for one competition entry.

*حكم المحكّم ودرجاته على مشاركة.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| ResponseId | bigint |  |  | FK → forms.FormResponse |
| JudgePersonId | bigint |  |  | FK → iam.Person |
| Decision | nvarchar(16) |  |  | Values: Scored, Disqualified, Abstained |
| Feedback | nvarchar(2000) | Y |  |  |
| DecidedAtUtc | datetime2(3) |  |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |
| ScoresJson | nvarchar(max) |  |  | Score per criterion for this judge and entry (replaces the v4 CompetitionCriterionScore table). · JSON: [{"criterion":"c1","score":8.5}, …] |

**Unique:** `(ResponseId, JudgePersonId)`

**Used by:** Competition judging and ranking (ranking is computed).

---

## Schema `community`

### `community.Post`

A community post.

*منشور في المجتمع.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| PublicId | uniqueidentifier |  | NEWSEQUENTIALID() |  |
| AuthorPersonId | bigint |  |  | FK → iam.Person |
| TopicCode | nvarchar(40) | Y |  |  |
| Body | nvarchar(max) |  |  |  |
| ImageFileId | bigint | Y |  | FK → files.SecureFile |
| Status | nvarchar(16) |  | 'Draft' | Values: Draft, Published, Hidden, Removed |
| PublishedAtUtc | datetime2(3) | Y |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |
| SharedAchievementJson | nvarchar(1000) | Y |  | Optional "Share Achievement" card (a text snapshot, no reward). · JSON: {"kind":"practice\|routine\|session","title":"…","date":"…"} |

**Unique:** `(PublicId)`

**Indexes:** (PublishedAtUtc) WHERE Status = 'Published'

**Used by:** Community feed, New Post, Share Achievement, Home preview.

---

### `community.Comment`

A comment under a post.

*تعليق على منشور.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| PostId | bigint |  |  | FK → community.Post |
| AuthorPersonId | bigint |  |  | FK → iam.Person |
| Body | nvarchar(2000) |  |  |  |
| Status | nvarchar(16) |  | 'Published' | Values: Published, Hidden, Removed |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |

**Indexes:** (PostId, CreatedAtUtc)

**Used by:** Community comments.

---

### `community.PostInteraction`

A reaction or a bookmark of one person on one post.

*تفاعل أو حفظ لمنشور.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| PostId | bigint |  |  | FK → community.Post |
| PersonId | bigint |  |  | FK → iam.Person |
| ReactionCode | nvarchar(24) | Y |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |
| Kind | nvarchar(12) |  | 'Reaction' | Reaction or Bookmark. · Values: Reaction, Bookmark |

**Unique:** `(PostId, PersonId, Kind, ReactionCode)`

**CHECK:** `CK_PostInteraction_Code`: (Kind = 'Reaction' AND ReactionCode IS NOT NULL) OR (Kind = 'Bookmark' AND ReactionCode IS NULL)

**Used by:** React, Bookmark.

---

### `community.ContentReport`

A report of a post or comment, and the moderator's resolution. Hide/restore actions without a report are recorded in AuditEvent.

*بلاغ على منشور أو تعليق وقرار المشرف.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| PostId | bigint | Y |  | FK → community.Post |
| CommentId | bigint | Y |  | FK → community.Comment |
| ReporterPersonId | bigint |  |  | FK → iam.Person |
| ReasonCode | nvarchar(40) |  |  |  |
| Details | nvarchar(1000) | Y |  |  |
| Status | nvarchar(16) |  | 'Submitted' | Values: Submitted, Reviewing, Resolved |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |
| RowVersion | rowversion |  |  |  |
| ResolvedByPersonId | bigint | Y |  | from v4 ModerationDecision · FK → iam.Person |
| Resolution | nvarchar(16) | Y |  | from v4 ModerationDecision · Values: Hide, Remove, Restore, Dismiss |
| ResolutionReason | nvarchar(1000) | Y |  | from v4 ModerationDecision |
| ResolvedAtUtc | datetime2(3) | Y |  | from v4 ModerationDecision |

**Unique:** `(PostId, ReporterPersonId)` WHERE PostId IS NOT NULL AND Status <> 'Resolved' · `(CommentId, ReporterPersonId)` WHERE CommentId IS NOT NULL AND Status <> 'Resolved'

**CHECK:** `CK_ContentReport_Target`: (PostId IS NOT NULL AND CommentId IS NULL) OR (PostId IS NULL AND CommentId IS NOT NULL)

**Used by:** Report content, Admin → Moderation.

---

## Schema `partnership`

### `partnership.PartnershipLink`

A link between an initiative and a coach program or provider experience, without moving ownership.

*ربط مبادرة ببرنامج أو تجربة دون نقل الملكية.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| PublicId | uniqueidentifier |  | NEWSEQUENTIALID() |  |
| InitiativeId | bigint |  |  | FK → institution.Initiative |
| ProgramId | bigint | Y |  | FK → coach.CoachProgram |
| ExperienceId | bigint | Y |  | FK → provider.Experience |
| Purpose | nvarchar(800) | Y |  |  |
| DataSharingScopeJson | nvarchar(max) | Y |  | JSON: What the initiative may see from the linked program or experience. |
| StartsOnLocalDate | date | Y |  |  |
| EndsOnLocalDate | date | Y |  |  |
| Status | nvarchar(16) |  | 'Requested' | Values: Requested, Accepted, Declined, Ended |
| RequestedByPersonId | bigint |  |  | FK → iam.Person |
| RespondedByPersonId | bigint | Y |  | FK → iam.Person |
| RespondedAtUtc | datetime2(3) | Y |  |  |
| EndedAtUtc | datetime2(3) | Y |  |  |
| EndedByPersonId | bigint | Y |  | FK → iam.Person |
| EndReason | nvarchar(800) | Y |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |

**Unique:** `(PublicId)` · `(InitiativeId, ProgramId)` WHERE ProgramId IS NOT NULL AND Status IN ('Requested','Accepted') · `(InitiativeId, ExperienceId)` WHERE ExperienceId IS NOT NULL AND Status IN ('Requested','Accepted')

**CHECK:** `CK_PartnershipLink_Target`: (ProgramId IS NOT NULL AND ExperienceId IS NULL) OR (ProgramId IS NULL AND ExperienceId IS NOT NULL) · `CK_PartnershipLink_Scope`: DataSharingScopeJson IS NULL OR ISJSON(DataSharingScopeJson) = 1

**Used by:** Partnerships (provider and organization), linked component in initiative details.

---

## Schema `governance`

### `governance.ContentRelease`

Admin-edited content with draft and published versions. Also stores the Garden Rules.

*محتوى تحرره الإدارة بمسودة ونشر؛ ويحمل قواعد الحديقة.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| TargetCode | nvarchar(120) |  |  |  |
| VersionNo | int |  |  |  |
| Status | nvarchar(16) |  | 'Draft' | Values: Draft, Published, Superseded |
| PayloadJson | nvarchar(max) |  |  | JSON: The content: Bimo texts, Garden Rules (target garden.rules), site copy. |
| PublishedByPersonId | bigint | Y |  | FK → iam.Person |
| PublishedAtUtc | datetime2(3) | Y |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |
| RowVersion | rowversion |  |  |  |

**Unique:** `(TargetCode, VersionNo)` · `(TargetCode)` WHERE Status = 'Draft'

**Used by:** Admin → Content Studio, Garden Rules.

---

## Schema `ops`

### `ops.AuditEvent`

The one history log: who did what to which row, with before/after status, reason and details. Timelines in the UI are read from it.

*سجل التاريخ الموحد: من فعل ماذا ولأي سجل.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| ActorPersonId | bigint | Y |  | FK → iam.Person |
| ActorCapacity | nvarchar(24) | Y |  |  |
| ResourceKind | nvarchar(64) |  |  |  |
| Action | nvarchar(64) |  |  |  |
| BeforeStatus | nvarchar(40) | Y |  |  |
| AfterStatus | nvarchar(40) | Y |  |  |
| Reason | nvarchar(1000) | Y |  |  |
| DetailJson | nvarchar(max) | Y |  | JSON: {"before":{…},"after":{…}} |
| AtUtc | datetime2(3) |  |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |
| ResourceId | bigint |  |  | Id of the row the event is about. |

**Indexes:** (ActorPersonId, AtUtc) · (ResourceKind, ResourceId, AtUtc)

**Used by:** Application history, attendance correction history, coach handover, session/cohort changes, moderation, governance, Admin → Audit.

---

### `ops.Notification`

An in-app notification to one person (for example "you were removed from the initiative").

*إشعار داخل التطبيق لشخص.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| PublicId | uniqueidentifier |  | NEWSEQUENTIALID() |  |
| RecipientPersonId | bigint |  |  | FK → iam.Person |
| EventPublicId | uniqueidentifier |  |  |  |
| TemplateCode | nvarchar(80) |  |  |  |
| ResourceKind | nvarchar(64) |  |  |  |
| Status | nvarchar(16) |  | 'Ready' | Values: Pending, Ready, Read, Withdrawn |
| ReadAtUtc | datetime2(3) | Y |  |  |
| EmailOutboxMessageId | bigint | Y |  | FK → ops.OutboxMessage |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |
| ResourceId | bigint | Y |  | Row the notification is about. |
| ParamsJson | nvarchar(2000) | Y |  | Template parameters (for example the removal reason). · JSON: {"reason":"…","initiativeTitle":"…"} used to fill the template. |

**Unique:** `(PublicId)` · `(RecipientPersonId, EventPublicId, TemplateCode)`

**Indexes:** (RecipientPersonId, CreatedAtUtc) WHERE Status IN ('Ready','Read')

**Used by:** Notifications in every workspace; removal, cancellation, reschedule and offer notices.

---

### `ops.OutboxMessage`

Emails waiting to be sent reliably (OTP, invitations, removal notices).

*رسائل بريد بانتظار الإرسال الموثوق.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| EventPublicId | uniqueidentifier |  |  |  |
| EventType | nvarchar(120) |  |  |  |
| Channel | nvarchar(16) |  | 'Internal' | Values: Internal, Email |
| PayloadJson | nvarchar(max) |  |  | JSON: Recipient, template code and parameters of the email. |
| OccurredAtUtc | datetime2(3) |  |  |  |
| Status | nvarchar(16) |  | 'Pending' | Values: Pending, Delivered, DeadLetter |
| Attempts | int |  | 0 |  |
| NextAttemptAtUtc | datetime2(3) | Y |  |  |
| LastError | nvarchar(1000) | Y |  |  |
| DeliveredAtUtc | datetime2(3) | Y |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |
| DedupKey | nvarchar(160) |  |  | Per-recipient delivery key (for example "<recipientPersonId>:<templateCode>"). One event may fan out to many recipients; (EventPublicId, DedupKey) is unique. |

**Unique:** `(EventPublicId, DedupKey)`

**Indexes:** (NextAttemptAtUtc) WHERE Status = 'Pending'

**Used by:** Email OTP, staff and coach invitations, notification emails.

---

## Schema `files`

### `files.SecureFile`

Every uploaded private file (verification proofs, excuses, incident files, submissions, post images).

*كل الملفات المرفوعة الخاصة.*

| Column | Type | Null | Default | Note |
|---|---|:-:|---|---|
| Id (PK) | bigint |  | IDENTITY(1,1) |  |
| PublicId | uniqueidentifier |  | NEWSEQUENTIALID() |  |
| OwnerPersonId | bigint | Y |  | FK → iam.Person |
| Purpose | nvarchar(32) |  |  | Values: VerificationEvidence, ExcuseAttachment, SubmissionAttachment, FormAnswer, IncidentAttachment, PostImage |
| ObjectKey | nvarchar(300) |  |  |  |
| MimeType | nvarchar(120) |  |  |  |
| Bytes | bigint |  |  |  |
| Status | nvarchar(16) |  | 'Pending' | Values: Pending, Available, Quarantined, Deleted |
| DeletedAtUtc | datetime2(3) | Y |  |  |
| CreatedAtUtc | datetime2(3) |  | SYSUTCDATETIME() |  |

**Unique:** `(PublicId)` · `(ObjectKey)`

**Used by:** All attachments; download is authorized through the owning record.

---

