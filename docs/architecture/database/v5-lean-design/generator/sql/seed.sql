SET NOCOUNT ON;
SET XACT_ABORT ON;
GO
BEGIN TRY
BEGIN TRANSACTION;

DECLARE @now datetime2(3) = SYSUTCDATETIME();

------------------------------------------------------------------------------------------------------
-- 3.1 People (one identity each; roles come from the rows that reference the person)
------------------------------------------------------------------------------------------------------
INSERT iam.Person (DisplayName, NormalizedEmail, EmailVerifiedAtUtc, IndividualEnabledAtUtc, PlatformRole) VALUES
 (N'Layla Demo (Individual)',        N'layla.demo@example.com',     DATEADD(DAY,-60,@now), DATEADD(DAY,-60,@now), NULL),
 (N'Omar Demo (Student)',            N'omar.student@example.com',   DATEADD(DAY,-35,@now), NULL, NULL),
 (N'Noor Demo (Student)',            N'noor.student@example.com',   DATEADD(DAY,-35,@now), NULL, NULL),
 (N'Kareem Demo (Student)',          N'kareem.student@example.com', DATEADD(DAY,-35,@now), NULL, NULL),
 (N'Faris Demo (Student)',           N'faris.student@example.com',  DATEADD(DAY,-34,@now), NULL, NULL),
 (N'Huda Demo (Student)',            N'huda.student@example.com',   DATEADD(DAY,-34,@now), NULL, NULL),
 (N'Sami Demo (Student)',            N'sami.student@example.com',   DATEADD(DAY,-3,@now),  NULL, NULL),
 (N'Tariq Demo (Student)',           N'tariq.student@example.com',  DATEADD(DAY,-33,@now), NULL, NULL),
 (N'Rania Demo (Coach)',             N'rania.coach@example.com',    DATEADD(DAY,-90,@now), NULL, NULL),
 (N'Salim Demo (Institution rep)',   N'salim.rep@example.com',      DATEADD(DAY,-90,@now), NULL, NULL),
 (N'Mona Demo (Supervisor)',         N'mona.supervisor@example.com',DATEADD(DAY,-80,@now), NULL, NULL),
 (N'Yusuf Demo (Outdoor activity rep)',      N'yusuf.provider@example.com', DATEADD(DAY,-90,@now), NULL, NULL),
 (N'Dana Demo (Outdoor activity supervisor)',N'dana.provider@example.com',  DATEADD(DAY,-70,@now), NULL, NULL),
 (N'Zaid Demo (New Individual)',     N'zaid.new@example.com',       DATEADD(DAY,-1,@now),  DATEADD(DAY,-1,@now), NULL),
 (N'Ada Demo (Platform admin)',      N'admin.demo@example.com',     DATEADD(DAY,-200,@now),NULL, N'Admin'),
 (N'Mira Demo (Moderator)',          N'mira.moderator@example.com', DATEADD(DAY,-200,@now),NULL, N'Moderator');

DECLARE @layla bigint = (SELECT Id FROM iam.Person WHERE NormalizedEmail = N'layla.demo@example.com');
DECLARE @omar  bigint = (SELECT Id FROM iam.Person WHERE NormalizedEmail = N'omar.student@example.com');
DECLARE @noor  bigint = (SELECT Id FROM iam.Person WHERE NormalizedEmail = N'noor.student@example.com');
DECLARE @kareem bigint = (SELECT Id FROM iam.Person WHERE NormalizedEmail = N'kareem.student@example.com');
DECLARE @faris bigint = (SELECT Id FROM iam.Person WHERE NormalizedEmail = N'faris.student@example.com');
DECLARE @huda  bigint = (SELECT Id FROM iam.Person WHERE NormalizedEmail = N'huda.student@example.com');
DECLARE @sami  bigint = (SELECT Id FROM iam.Person WHERE NormalizedEmail = N'sami.student@example.com');
DECLARE @tariq bigint = (SELECT Id FROM iam.Person WHERE NormalizedEmail = N'tariq.student@example.com');
DECLARE @rania bigint = (SELECT Id FROM iam.Person WHERE NormalizedEmail = N'rania.coach@example.com');
DECLARE @salim bigint = (SELECT Id FROM iam.Person WHERE NormalizedEmail = N'salim.rep@example.com');
DECLARE @mona  bigint = (SELECT Id FROM iam.Person WHERE NormalizedEmail = N'mona.supervisor@example.com');
DECLARE @yusuf bigint = (SELECT Id FROM iam.Person WHERE NormalizedEmail = N'yusuf.provider@example.com');
DECLARE @dana  bigint = (SELECT Id FROM iam.Person WHERE NormalizedEmail = N'dana.provider@example.com');
DECLARE @admin bigint = (SELECT Id FROM iam.Person WHERE NormalizedEmail = N'admin.demo@example.com');
DECLARE @mira  bigint = (SELECT Id FROM iam.Person WHERE NormalizedEmail = N'mira.moderator@example.com');
DECLARE @zaid  bigint = (SELECT Id FROM iam.Person WHERE NormalizedEmail = N'zaid.new@example.com');

-- Consent history (insert-only) and an e-mail invitation code for a person who has not registered yet
INSERT iam.ConsentRecord (PersonId, PurposeCode, NoticeVersion, Decision, DecidedAtUtc) VALUES
 (@layla, N'privacy.notice',   N'notice-2027-01', N'Accepted',  DATEADD(DAY,-60,@now)),
 (@layla, N'shield.telemetry', N'notice-2027-01', N'Accepted',  DATEADD(DAY,-40,@now)),
 (@layla, N'community.showcase', N'notice-2027-01', N'Accepted',  DATEADD(DAY,-30,@now)),
 (@layla, N'community.showcase', N'notice-2027-01', N'Withdrawn', DATEADD(DAY,-10,@now)),
 (@omar,  N'privacy.notice',   N'notice-2027-01', N'Accepted',  DATEADD(DAY,-35,@now));
INSERT iam.OtpChallenge (NormalizedEmail, Purpose, CodeHash, ExpiresAtUtc, Status)
VALUES (N'sara.invitee@example.com', N'Invitation', HASHBYTES('SHA2_512', N'demo-only-otp-1'), DATEADD(DAY,2,@now), N'Issued');

------------------------------------------------------------------------------------------------------
-- 3.2 Organizations, representatives, verification, files
------------------------------------------------------------------------------------------------------
INSERT org.Organization (Kind, Name, CountryCode, Status, HeadquartersCity, OfficialContactEmail, ProfileJson, SettingsJson) VALUES
 (N'Institution', N'Example Youth University', N'EG', N'Verified', N'Cairo',  N'contact@example.com', N'{"website":"https://example.com/youth-university","about":"Fictional institution for the demo"}', N'{"defaultCapacity":30}'),
 (N'Institution', N'Example Outdoor Camps',    N'EG', N'Verified', N'Dahab',  N'camps@example.com',   N'{"website":"https://example.com/outdoor-camps"}', NULL);
DECLARE @inst bigint = (SELECT Id FROM org.Organization WHERE Kind = N'Institution' AND Name = N'Example Youth University');
DECLARE @prov bigint = (SELECT Id FROM org.Organization WHERE Kind = N'Institution' AND Name = N'Example Outdoor Camps');

INSERT org.OrganizationMember (OrganizationId, PersonId, GrantedByPersonId, GrantedAtUtc) VALUES
 (@inst, @salim, @admin, DATEADD(DAY,-90,@now)),
 (@prov, @yusuf, @admin, DATEADD(DAY,-90,@now));

INSERT files.SecureFile (OwnerPersonId, Purpose, ObjectKey, MimeType, Bytes, Status) VALUES
 (@salim, N'VerificationEvidence', N'demo/verification/institution-letter.pdf', N'application/pdf', 48210, N'Available'),
 (@noor,  N'ExcuseAttachment',     N'demo/excuses/noor-medical-note.pdf',       N'application/pdf', 20311, N'Available');
DECLARE @fileVerif bigint = (SELECT Id FROM files.SecureFile WHERE ObjectKey = N'demo/verification/institution-letter.pdf');
DECLARE @fileExcuse bigint = (SELECT Id FROM files.SecureFile WHERE ObjectKey = N'demo/excuses/noor-medical-note.pdf');

INSERT org.VerificationCase (Kind, OrganizationId, ApplicantPersonId, ClaimJson, SubmittedAtUtc, Status, EvidenceFileId, DecidedByPersonId, DecidedAtUtc, DecisionReason, MessagesJson) VALUES
 (N'Institution', @inst, @salim, N'{"name":"Example Youth University","role":"Dean of student affairs"}', DATEADD(DAY,-95,@now), N'Approved', @fileVerif, @admin, DATEADD(DAY,-92,@now), N'Documents match the claim.',
   N'[{"actor":"admin","text":"Please attach the registration letter.","atUtc":"2000-01-01T00:00:00Z"},{"actor":"applicant","text":"Attached.","atUtc":"2000-01-02T00:00:00Z"}]'),
 (N'Institution', @prov, @yusuf, N'{"name":"Example Outdoor Camps","licence":"DEMO-0001"}',          DATEADD(DAY,-95,@now), N'Approved', NULL, @admin, DATEADD(DAY,-93,@now), N'Licence verified (demo).', NULL),
 (N'Coach',       NULL,  @rania, -- legacy history: v4.1 removed the Coach application queue
 N'{"credentials":"Certified habit coach (fictional)","years":6}',   DATEADD(DAY,-94,@now), N'Approved', NULL, @admin, DATEADD(DAY,-91,@now), N'Credentials accepted (demo).', NULL);

------------------------------------------------------------------------------------------------------
-- 3.3 Content catalog: practices (with versions), Lab instruments, Garden rules
------------------------------------------------------------------------------------------------------
INSERT activity.PracticeDefinition (Code, PracticeType, Title, Status) VALUES
 (N'depth-focus-01',     N'DepthPractice',   N'Depth Focus Block',     N'Published'),
 (N'listening-recall-01',N'ListeningRecall', N'Listening Recall',      N'Published');
DECLARE @pdDepth bigint = (SELECT Id FROM activity.PracticeDefinition WHERE Code = N'depth-focus-01');
DECLARE @pdListen bigint = (SELECT Id FROM activity.PracticeDefinition WHERE Code = N'listening-recall-01');
INSERT activity.PracticeVersion (DefinitionId, VersionNo, ContentRef, ContentJson, DifficultyTier, EstimatedMinutes, EvidenceTier, ValidationVersion, RulesJson, PublishedAtUtc) VALUES
 (@pdDepth,  1, N'content/depth-focus/v1',  N'{"prompt":"Work on one task for 10 minutes without switching.","minutes":10}', 1, 10, N'BrowserObserved', N'rules-1', N'{"minFocusedSeconds":480}', DATEADD(DAY,-120,@now)),
 (@pdDepth,  2, N'content/depth-focus/v2',  N'{"prompt":"Work on one task for 15 minutes without switching.","minutes":15}', 2, 15, N'BrowserObserved', N'rules-1', N'{"minFocusedSeconds":720}', DATEADD(DAY,-40,@now)),
 (@pdListen, 1, N'content/listening-recall/v1', N'{"prompt":"Listen to a 3 minute clip then answer 5 questions."}',            1, 8,  N'SystemScored',    N'rules-1', N'{"passScore":3}', DATEADD(DAY,-120,@now));
DECLARE @pvDepth1 bigint = (SELECT Id FROM activity.PracticeVersion WHERE DefinitionId = @pdDepth AND VersionNo = 1);
DECLARE @pvDepth2 bigint = (SELECT Id FROM activity.PracticeVersion WHERE DefinitionId = @pdDepth AND VersionNo = 2);
DECLARE @pvListen1 bigint = (SELECT Id FROM activity.PracticeVersion WHERE DefinitionId = @pdListen AND VersionNo = 1);

INSERT lab.InstrumentVersion (InstrumentCode, VersionNo, Title, ContentRef, ContentJson, ProtocolVersion, ScoringVersion, ComparabilityGroup, Status, PublishedAtUtc) VALUES
 (N'DigitalHabits',      1, N'Digital Habits Check',      N'content/lab/digital-habits/v1',     N'{"items":12}',  N'protocol-1', N'scoring-1', N'dh-v1', N'Published', DATEADD(DAY,-150,@now)),
 (N'SustainedAttention', 1, N'Sustained Attention Task',  N'content/lab/sustained/v1',          N'{"trials":120}',N'protocol-1', N'scoring-1', N'sa-v1', N'Published', DATEADD(DAY,-150,@now)),
 (N'InhibitoryControl',  1, N'Inhibitory Control Task',   N'content/lab/inhibitory/v1',         N'{"trials":80}', N'protocol-1', N'scoring-1', N'ic-v1', N'Published', DATEADD(DAY,-150,@now)),
 (N'DepthChallenge',     1, N'Depth Challenge',           N'content/lab/depth/v1',              N'{"minutes":10}',N'protocol-1', N'scoring-1', N'dc-v1', N'Published', DATEADD(DAY,-150,@now));

INSERT governance.ContentRelease (TargetCode, VersionNo, PayloadJson, Status, PublishedByPersonId, PublishedAtUtc) VALUES
 (N'garden.rules', 1, N'{"practice":{"validPerDay":1,"points":3},"routine":{"doneDayPoints":1,"weeklyCap":5},"weeklyReview":{"points":5},"attendance":{"points":4},"thresholds":[0,10,25,50,90]}', N'Published', @admin, DATEADD(DAY,-100,@now));

------------------------------------------------------------------------------------------------------
-- 3.4 Individual user: profile, Lab attempts, recovery cycle and plan, practice, routines, Shield
------------------------------------------------------------------------------------------------------
INSERT personal.IndividualProfile (PersonId, PreferredTimeZone, GoalCode, SetupAnswersJson, SetupAnswersVersion, PreferencesJson, OnboardingStage, JourneyStartedAtUtc, OnboardingCompletedAtUtc, ShieldSettingsJson)
VALUES (@layla, N'Africa/Cairo', N'reduce-doomscrolling', N'{"screenHoursPerDay":6,"mainDistraction":"video"}', 1, N'{"reminders":"evening"}', N'Activated', DATEADD(DAY,-58,@now), DATEADD(DAY,-57,@now), N'{"consentNotice":"notice-2027-01","blockSites":["video","social"]}');

DECLARE @wk nvarchar(40) = N'2027-W03';
INSERT lab.AssessmentAttempt (PersonId, InstrumentVersionId, InstrumentCode, Kind, Status, StartedAtUtc, LastSavedAtUtc, FinishedAtUtc, ValidityCode, ScoringVersion, PrimaryScore, ScoresJson, ResponsesJson)
SELECT @layla, iv.Id, iv.InstrumentCode, N'Baseline', N'Valid', DATEADD(DAY,-58,@now), DATEADD(DAY,-58,@now), DATEADD(DAY,-58,@now), N'Valid', iv.ScoringVersion,
       CASE iv.InstrumentCode WHEN N'DigitalHabits' THEN 61.5 WHEN N'SustainedAttention' THEN 72.0 WHEN N'InhibitoryControl' THEN 68.25 ELSE 55.0 END,
       N'{"primary":"see PrimaryScore","subscores":{"a":0.6,"b":0.7}}', N'{"answered":12,"completed":true}'
FROM lab.InstrumentVersion iv;
INSERT lab.AssessmentAttempt (PersonId, InstrumentVersionId, InstrumentCode, Kind, Status, StartedAtUtc, FinishedAtUtc, ValidityCode, WindowKey, ScoringVersion, PrimaryScore, ScoresJson, ResponsesJson)
SELECT @layla, iv.Id, iv.InstrumentCode, N'Official', N'Valid', DATEADD(DAY,-8,@now), DATEADD(DAY,-8,@now), N'Valid', @wk, iv.ScoringVersion, 66.0, N'{"primary":66.0}', N'{"answered":12,"completed":true}'
FROM lab.InstrumentVersion iv WHERE iv.InstrumentCode = N'DigitalHabits';
UPDATE personal.IndividualProfile SET LastAssessmentAttemptId = (SELECT TOP (1) Id FROM lab.AssessmentAttempt WHERE PersonId = @layla ORDER BY StartedAtUtc DESC, Id DESC) WHERE PersonId = @layla;

INSERT personal.IndividualProfile (PersonId, PreferredTimeZone, GoalCode, SetupAnswersJson, SetupAnswersVersion, OnboardingStage, JourneyStartedAtUtc, OnboardingCompletedAtUtc)
VALUES (@zaid, N'Asia/Amman', N'reduce-scrolling',
 N'{"change":"reduce-scrolling","apps":["instagram","youtube"],"dailyScroll":"120-240","moments":"before-bed","makeTimeFor":["walking-sports","reading-learning"],"dailyMinutes":"10"}', 2,
 N'Home', DATEADD(DAY,-1,@now), DATEADD(DAY,-1,@now));
INSERT recovery.RecoveryCycle (PersonId, CycleNo, PolicyVersion, TimeZoneId, Kind, Status)
VALUES (@zaid, 1, N'policy-1', N'Asia/Amman', N'Standard', N'Preview');
INSERT recovery.PlanRevision (CycleId, RevisionNo, ChangeKind, GoalCode, PolicyVersion, EffectiveFromLocalDate, Reason, PlanJson, Status)
VALUES ((SELECT Id FROM recovery.RecoveryCycle WHERE PersonId = @zaid AND CycleNo = 1), 1, N'Initial', N'reduce-scrolling', N'policy-1', CAST(@now AS date),
 N'Preliminary Week 1 plan from the six setup answers; waiting for the person to activate it.',
 N'{"source":"quick-setup-v2","week":1,"days":3,"minutes":10,"commitment":{"title":"A 10-minute walk or some movement"}}', N'Draft');

INSERT recovery.RecoveryCycle (PersonId, CycleNo, PolicyVersion, TimeZoneId, Kind, Status, StartLocalDate, EndLocalDate, ActivatedAtUtc)
VALUES (@layla, 1, N'policy-1', N'Africa/Cairo', N'Standard', N'Active', CAST(DATEADD(DAY,-56,@now) AS date), CAST(DATEADD(DAY,28,@now) AS date), DATEADD(DAY,-56,@now));
DECLARE @cycle bigint = (SELECT Id FROM recovery.RecoveryCycle WHERE PersonId = @layla AND CycleNo = 1);
INSERT recovery.PlanRevision (CycleId, RevisionNo, ChangeKind, GoalCode, PolicyVersion, EffectiveFromLocalDate, Reason, PlanJson, Status, AcceptedAtUtc) VALUES
 (@cycle, 1, N'Initial',      N'reduce-doomscrolling', N'policy-1', CAST(DATEADD(DAY,-56,@now) AS date), N'Initial plan accepted at activation.', N'{"practicesPerWeek":4,"routinesPerWeek":5,"weeklyReviewDay":"Sunday"}', N'Superseded', DATEADD(DAY,-56,@now)),
 (@cycle, 2, N'WeeklyReview', N'reduce-doomscrolling', N'policy-1', CAST(DATEADD(DAY,-49,@now) AS date), N'Weekly review: load kept, schedule moved to evenings.', N'{"practicesPerWeek":4,"routinesPerWeek":5,"weeklyReviewDay":"Sunday","evening":true}', N'Accepted', DATEADD(DAY,-49,@now));
DECLARE @plan2 bigint = (SELECT Id FROM recovery.PlanRevision WHERE CycleId = @cycle AND RevisionNo = 2);
DECLARE @plan1 bigint = (SELECT Id FROM recovery.PlanRevision WHERE CycleId = @cycle AND RevisionNo = 1);
INSERT recovery.WeeklyReview (CycleId, WeekNo, DecisionCode, ReviewedAtUtc, ResultingRevisionId, ManageabilityCode, FitCode, ReportedPhoneMinutesPerDay)
VALUES (@cycle, 1, N'Adjust', DATEADD(DAY,-49,@now), @plan2, N'manageable', N'good-fit', 320);

INSERT activity.OfflineRoutine (PersonId, Title, Hint, ScheduleRuleJson, IsInitialCommitment) VALUES
 (@layla, N'Evening walk without phone', N'Leave the phone at home for 20 minutes.', N'{"days":["Mon","Wed","Fri","Sun"],"time":"18:30"}', 1);
DECLARE @routine bigint = (SELECT Id FROM activity.OfflineRoutine WHERE PersonId = @layla);
INSERT activity.RoutineCheckIn (RoutineId, PersonId, LocalDate, State, RecordedAtUtc) VALUES
 (@routine, @layla, CAST(DATEADD(DAY,-3,@now) AS date), N'Done',    DATEADD(DAY,-3,@now)),
 (@routine, @layla, CAST(DATEADD(DAY,-2,@now) AS date), N'Skipped', DATEADD(DAY,-2,@now)),
 (@routine, @layla, CAST(DATEADD(DAY,-1,@now) AS date), N'Done',    DATEADD(DAY,-1,@now));

-- A planned practice: action -> attempt -> link back (the two rows point at each other)
INSERT recovery.ScheduledAction (CycleId, PersonId, PlanRevisionId, ActionKind, LocalDate, PracticeVersionId, Status)
VALUES (@cycle, @layla, @plan2, N'Practice', CAST(DATEADD(DAY,-1,@now) AS date), @pvDepth2, N'Due');
DECLARE @act1 bigint = SCOPE_IDENTITY();
INSERT recovery.ScheduledAction (CycleId, PersonId, PlanRevisionId, ActionKind, LocalDate, RoutineId, Status)
VALUES (@cycle, @layla, @plan2, N'Routine', CAST(DATEADD(DAY,1,@now) AS date), @routine, N'Due');
INSERT recovery.ScheduledAction (CycleId, PersonId, PlanRevisionId, ActionKind, LocalDate, Status, IsOptional)
VALUES (@cycle, @layla, @plan2, N'WeeklyReview', CAST(DATEADD(DAY,3,@now) AS date), N'Due', 0);
INSERT activity.PracticeAttempt (PersonId, PracticeVersionId, Source, ScheduledActionId, Status, Valid, OutcomeCode, ScoreValue, StartedAtUtc, EndedAtUtc, Title, ResultingTier, ProgressionOutcome)
VALUES (@layla, @pvDepth2, N'Plan', @act1, N'Completed', 1, N'valid', 88.5, DATEADD(HOUR,-26,@now), DATEADD(HOUR,-26,DATEADD(MINUTE,16,@now)), N'Depth Focus Block', 2, N'Stayed');
DECLARE @att1 bigint = SCOPE_IDENTITY();
UPDATE recovery.ScheduledAction SET Status = N'Completed', CompletedAttemptId = @att1 WHERE Id = @act1;
INSERT activity.PracticeAttempt (PersonId, PracticeVersionId, Source, Status, Valid, OutcomeCode, ScoreValue, StartedAtUtc, EndedAtUtc, Title, ResultingTier, ProgressionOutcome)
VALUES (@layla, @pvListen1, N'OnDemand', N'Completed', 1, N'valid', 4.0, DATEADD(DAY,-4,@now), DATEADD(DAY,-4,DATEADD(MINUTE,8,@now)), N'Listening Recall', 1, N'Advanced');

-- Digital Shield: paired browser extension, a protection session, two daily usage batches
INSERT shield.ExtensionInstallation (PersonId, InstallationPublicId, BrowserCode, ExtensionVersion, SyncKeyHash, PairedAtUtc, LastSeenAtUtc)
VALUES (@layla, NEWID(), N'chromium', N'1.0.0-demo', HASHBYTES('SHA2_512', N'demo-only-sync-key'), DATEADD(DAY,-40,@now), DATEADD(MINUTE,-5,@now));
DECLARE @inst1 bigint = (SELECT Id FROM shield.ExtensionInstallation WHERE PersonId = @layla);
INSERT shield.ProtectionSession (PersonId, InstallationId, DomainCodesJson, StartedAtUtc, EndsAtUtc, Status, LockMode, EndedAtUtc)
VALUES (@layla, @inst1, N'["video","social"]', DATEADD(DAY,-2,@now), DATEADD(DAY,-2,DATEADD(MINUTE,45,@now)), N'Expired', N'Standard', DATEADD(DAY,-2,DATEADD(MINUTE,45,@now)));
INSERT shield.BrowserUsagePeriod (PersonId, InstallationId, LocalDate, TimeZoneId, ObservedSeconds, CoverageSeconds, SequenceNo, ReceivedAtUtc, DomainsJson) VALUES
 (@layla, @inst1, CAST(DATEADD(DAY,-2,@now) AS date), N'Africa/Cairo', 7200, 28800, 1, DATEADD(DAY,-2,@now), N'[{"d":"video","s":3600},{"d":"social","s":2400},{"d":"news","s":1200}]'),
 (@layla, @inst1, CAST(DATEADD(DAY,-1,@now) AS date), N'Africa/Cairo', 5400, 27000, 2, DATEADD(DAY,-1,@now), N'[{"d":"video","s":2400},{"d":"social","s":1800},{"d":"news","s":1200}]');

------------------------------------------------------------------------------------------------------
-- 3.5 Initiative (institution): forms, published terms, staff
------------------------------------------------------------------------------------------------------
INSERT institution.Initiative (InstitutionId, Status) VALUES (@inst, N'Draft');
DECLARE @ini bigint = SCOPE_IDENTITY();

-- registration form (version published first, because the initiative's terms reference it)
INSERT forms.Form (Purpose, Title, InitiativeId, Status) VALUES (N'Registration', N'Focus Camp registration form', @ini, N'Draft');
DECLARE @frmReg bigint = SCOPE_IDENTITY();
INSERT forms.FormVersion (FormId, VersionNo, ConsentNoticeVersion, OpensAtUtc, ClosesAtUtc, AllowMultipleResponses, PublishedByPersonId, PublishedAtUtc, DefinitionJson)
VALUES (@frmReg, 1, N'notice-2027-01', DATEADD(DAY,-45,@now), DATEADD(DAY,10,@now), 0, @salim, DATEADD(DAY,-45,@now),
 N'{"questions":[{"key":"q1","type":"single","prompt":"Why do you want to join?","required":true,"options":[{"code":"a","label":"Focus"},{"code":"b","label":"Habits"},{"code":"c","label":"Curiosity"}]},{"key":"q2","type":"text","prompt":"Anything we should know?","required":false}]}');
DECLARE @frmRegV bigint = SCOPE_IDENTITY();
UPDATE forms.Form SET Status = N'Published', CurrentVersionId = @frmRegV WHERE Id = @frmReg;

DECLARE @iniStart datetime2(3) = DATEADD(DAY,-14,@now);
INSERT institution.InitiativeRevision (InitiativeId, RevisionNo, ChangeKind, Title, Summary, TopicCode, OperatingMode, ParticipationMode, AudienceCode, Capacity, WaitlistEnabled, OfferHoldHours, ApplicationOpensAtUtc, ApplicationClosesAtUtc, TimeZoneId, StartsAtUtc, EndsAtUtc, CostKind, ConsentNoticeVersion, CompletionPolicyRef, RegistrationFormVersionId, PublishedSnapshotJson, PublishedByPersonId, PublishedAtUtc)
VALUES (@ini, 1, N'Publish', N'Focus Camp (Demo)', N'Eight weeks of structured focus practice for university students.', N'focus', N'Structured', N'Hybrid', N'university-students', 4, 1, 24,
        DATEADD(DAY,-45,@now), DATEADD(DAY,10,@now), N'Africa/Cairo', @iniStart, DATEADD(DAY,42,@now), N'Free', N'notice-2027-01', N'completion/attendance-80', @frmRegV,
        N'{"title":"Focus Camp (Demo)","capacity":4,"waitlist":true}', @salim, DATEADD(DAY,-45,@now));
DECLARE @iniRev bigint = SCOPE_IDENTITY();
UPDATE institution.Initiative SET Status = N'Published', CurrentRevisionId = @iniRev, FirstPublishedAtUtc = DATEADD(DAY,-45,@now) WHERE Id = @ini;

-- staff: one coach and one supervisor, both invited by the representative and accepted
INSERT org.StaffAppointment (InitiativeId, Role, Status, NormalizedEmail, TokenHash, ExpiresAtUtc, InvitedByPersonId, InvitedAtUtc, PersonId, AcceptedAtUtc) VALUES
 (@ini, N'Coach',      N'Active', N'rania.coach@example.com',      HASHBYTES('SHA2_512', N'demo-only-staff-token-1'), DATEADD(DAY,-40,@now), @salim, DATEADD(DAY,-44,@now), @rania, DATEADD(DAY,-43,@now)),
 (@ini, N'Supervisor', N'Active', N'mona.supervisor@example.com',  HASHBYTES('SHA2_512', N'demo-only-staff-token-2'), DATEADD(DAY,-40,@now), @salim, DATEADD(DAY,-44,@now), @mona,  DATEADD(DAY,-43,@now));
DECLARE @apptCoach bigint = (SELECT Id FROM org.StaffAppointment WHERE InitiativeId = @ini AND Role = N'Coach');
DECLARE @apptSup   bigint = (SELECT Id FROM org.StaffAppointment WHERE InitiativeId = @ini AND Role = N'Supervisor');

------------------------------------------------------------------------------------------------------
-- 3.6 Applications and memberships (capacity 4: Accepted 2 + Suspended 1 + Offered 1 = 4 seats used)
------------------------------------------------------------------------------------------------------
-- survey + registration responses
INSERT forms.FormResponse (FormVersionId, PersonId, ResponseNo, Status, ConsentAtUtc, SubmittedAtUtc, AnswersJson) VALUES
 (@frmRegV, @omar,  1, N'Submitted', DATEADD(DAY,-35,@now), DATEADD(DAY,-35,@now), N'{"q1":{"choice":["a"]},"q2":{"text":"Excited to start."}}'),
 (@frmRegV, @noor,  1, N'Submitted', DATEADD(DAY,-35,@now), DATEADD(DAY,-35,@now), N'{"q1":{"choice":["b"]}}'),
 (@frmRegV, @huda,  1, N'Submitted', DATEADD(DAY,-4,@now),  DATEADD(DAY,-4,@now),  N'{"q1":{"choice":["c"]}}');
DECLARE @rOmar bigint = (SELECT Id FROM forms.FormResponse WHERE FormVersionId = @frmRegV AND PersonId = @omar);
DECLARE @rNoor bigint = (SELECT Id FROM forms.FormResponse WHERE FormVersionId = @frmRegV AND PersonId = @noor);
DECLARE @rHuda bigint = (SELECT Id FROM forms.FormResponse WHERE FormVersionId = @frmRegV AND PersonId = @huda);

INSERT institution.InitiativeApplication (InitiativeId, PersonId, AttemptNo, TermsRevisionId, RegistrationResponseId, Status, ParticipationMode, SubmittedAtUtc, ConsentAtUtc, QueuedAtUtc, OfferedAtUtc, OfferExpiresAtUtc, AcceptedAtUtc, WithdrawalCutoffAtUtc, EndedAtUtc, EndReason) VALUES
 (@ini, @omar,   1, @iniRev, @rOmar, N'Accepted',  N'InPerson', DATEADD(DAY,-35,@now), DATEADD(DAY,-35,@now), NULL, NULL, NULL, DATEADD(DAY,-33,@now), DATEADD(HOUR,-120,@iniStart), NULL, NULL),
 (@ini, @noor,   1, @iniRev, @rNoor, N'Accepted',  N'Online',   DATEADD(DAY,-35,@now), DATEADD(DAY,-35,@now), NULL, NULL, NULL, DATEADD(DAY,-33,@now), DATEADD(HOUR,-120,@iniStart), NULL, NULL),
 (@ini, @kareem, 1, @iniRev, NULL,   N'Suspended', N'Online',   DATEADD(DAY,-35,@now), DATEADD(DAY,-35,@now), NULL, NULL, NULL, DATEADD(DAY,-33,@now), DATEADD(HOUR,-120,@iniStart), NULL, NULL),
 (@ini, @faris,  1, @iniRev, NULL,   N'Offered',   N'Online',   DATEADD(DAY,-34,@now), DATEADD(DAY,-34,@now), DATEADD(DAY,-34,@now), DATEADD(HOUR,-2,@now), DATEADD(HOUR,22,@now), NULL, NULL, NULL, NULL),
 (@ini, @huda,   1, @iniRev, NULL,   N'Withdrawn', N'Online',   DATEADD(DAY,-34,@now), DATEADD(DAY,-34,@now), NULL, NULL, NULL, NULL, NULL, DATEADD(DAY,-25,@now), N'Withdrawn'),
 (@ini, @huda,   2, @iniRev, @rHuda, N'Queued',    N'Online',   DATEADD(DAY,-4,@now),  DATEADD(DAY,-4,@now),  DATEADD(DAY,-4,@now), NULL, NULL, NULL, NULL, NULL, NULL),
 (@ini, @sami,   1, @iniRev, NULL,   N'Pending',   N'Online',   DATEADD(DAY,-3,@now),  DATEADD(DAY,-3,@now),  NULL, NULL, NULL, NULL, NULL, NULL, NULL),
 (@ini, @tariq,  1, @iniRev, NULL,   N'Rejected',  N'Online',   DATEADD(DAY,-33,@now), DATEADD(DAY,-33,@now), NULL, NULL, NULL, NULL, NULL, DATEADD(DAY,-32,@now), N'Rejected');
DECLARE @appOmar bigint = (SELECT Id FROM institution.InitiativeApplication WHERE InitiativeId = @ini AND PersonId = @omar);
DECLARE @appNoor bigint = (SELECT Id FROM institution.InitiativeApplication WHERE InitiativeId = @ini AND PersonId = @noor);
DECLARE @appKareem bigint = (SELECT Id FROM institution.InitiativeApplication WHERE InitiativeId = @ini AND PersonId = @kareem);
DECLARE @appFaris bigint = (SELECT Id FROM institution.InitiativeApplication WHERE InitiativeId = @ini AND PersonId = @faris);
DECLARE @appHuda1 bigint = (SELECT Id FROM institution.InitiativeApplication WHERE InitiativeId = @ini AND PersonId = @huda AND AttemptNo = 1);
DECLARE @appHuda2 bigint = (SELECT Id FROM institution.InitiativeApplication WHERE InitiativeId = @ini AND PersonId = @huda AND AttemptNo = 2);
DECLARE @appTariq bigint = (SELECT Id FROM institution.InitiativeApplication WHERE InitiativeId = @ini AND PersonId = @tariq);

-- completion record for an accepted participant
INSERT session.Completion (Kind, PersonId, ApplicationId, Status, BasisJson) VALUES (N'Initiative', @omar, @appOmar, N'Pending', N'{"attendedSessions":1,"requiredSessions":8}');

------------------------------------------------------------------------------------------------------
-- 3.7 Coach: operational group, invited / expired / pending / active members, program
------------------------------------------------------------------------------------------------------
INSERT coach.OperationalGroup (InitiativeId, Name, Status, CoachPersonId, CoachStaffAppointmentId, CoachAssignedAtUtc, Purpose, Description, Capacity, RequiresApproval)
VALUES (@ini, N'Alpha Group', N'Open', @rania, @apptCoach, DATEADD(DAY,-30,@now), N'Weekly accountability for the Focus Camp.', N'First group of the Focus Camp (demo).', 25, 0);
DECLARE @grpAlpha bigint = SCOPE_IDENTITY();

INSERT coach.CoachProgram (OwnerPersonId, Status, Title, PublishedJson, PublishedVersionNo, PublishedAtUtc)
VALUES (@rania, N'Published', N'Deep Work Mentoring (Demo)', N'{"weeks":6,"outline":["Plan","Protect","Practice","Review"]}', 1, DATEADD(DAY,-60,@now));
DECLARE @prog bigint = SCOPE_IDENTITY();
INSERT coach.OperationalGroup (ProgramId, Name, Status, CoachPersonId, CoachAssignedAtUtc, Purpose, Capacity, RequiresApproval)
VALUES (@prog, N'Program Group 1', N'Open', @rania, DATEADD(DAY,-60,@now), N'Peer group for the Deep Work program.', 12, 1);
DECLARE @grpProg bigint = SCOPE_IDENTITY();

INSERT coach.GroupMembership (GroupId, ApplicationId, PersonId, Status, StartedAtUtc) VALUES
 (@grpAlpha, @appOmar, @omar, N'Active', DATEADD(DAY,-30,@now)),
 (@grpAlpha, @appNoor, @noor, N'Active', DATEADD(DAY,-30,@now));
INSERT coach.GroupMembership (GroupId, PersonId, Status) VALUES (@grpProg, @layla, N'Pending');   -- waits for coach approval (group RequiresApproval)
INSERT coach.GroupMembership (GroupId, NormalizedEmail, TokenHash, InviteExpiresAtUtc, InvitedByPersonId, Status) VALUES
 (@grpProg, N'sara.invitee@example.com', HASHBYTES('SHA2_512', N'demo-only-group-token-1'), DATEADD(DAY,5,@now), @rania, N'Invited');
-- an invitation to a person who never registered, now expired: PersonId stays NULL (audit finding A1, fixed)
INSERT coach.GroupMembership (GroupId, NormalizedEmail, TokenHash, InviteExpiresAtUtc, InvitedByPersonId, Status, EndedAtUtc, EndReason) VALUES
 (@grpProg, N'old.invitee@example.com', HASHBYTES('SHA2_512', N'demo-only-group-token-2'), DATEADD(DAY,-20,@now), @rania, N'Expired', DATEADD(DAY,-20,@now), N'Expired');

------------------------------------------------------------------------------------------------------
-- 3.8 Tasks, submissions, review decisions, report
------------------------------------------------------------------------------------------------------
INSERT task.Assignment (GroupId, AuthorPersonId, Title, Instructions, ReviewMode, IsRequired, Status, PracticeVersionId, StartsAtUtc, DueAtUtc, HistoryJson)
VALUES (@grpAlpha, @rania, N'Week 1: one depth block', N'Complete one Depth Focus Block and add a short reflection.', N'CoachReview', 1, N'Published', @pvDepth1, DATEADD(DAY,-12,@now), DATEADD(DAY,-5,@now),
        N'[{"revisionNo":1,"title":"Week 1: one depth block","dueAtUtc":"2000-01-01T00:00:00Z","reason":"Created","changedAtUtc":"2000-01-01T00:00:00Z"}]');
DECLARE @asg bigint = SCOPE_IDENTITY();
INSERT task.AssignmentRecipient (AssignmentId, PersonId, AssignedAtUtc, Status, LastAttemptNo) VALUES
 (@asg, @omar, DATEADD(DAY,-12,@now), N'Approved', 1),
 (@asg, @noor, DATEADD(DAY,-12,@now), N'Submitted', 2);
DECLARE @recOmar bigint = (SELECT Id FROM task.AssignmentRecipient WHERE AssignmentId = @asg AND PersonId = @omar);
DECLARE @recNoor bigint = (SELECT Id FROM task.AssignmentRecipient WHERE AssignmentId = @asg AND PersonId = @noor);

INSERT activity.PracticeAttempt (PersonId, PracticeVersionId, Source, Status, Valid, OutcomeCode, ScoreValue, StartedAtUtc, EndedAtUtc, Title, ResultingTier, ProgressionOutcome)
VALUES (@omar, @pvDepth1, N'Assignment', N'Completed', 1, N'valid', 91.0, DATEADD(DAY,-8,@now), DATEADD(DAY,-8,DATEADD(MINUTE,11,@now)), N'Depth Focus Block', 1, N'Stayed');
DECLARE @attOmar bigint = SCOPE_IDENTITY();

INSERT task.SubmissionAttempt (RecipientId, AttemptNo, Body, PracticeAttemptId, SubmittedAtUtc) VALUES
 (@recOmar, 1, N'Finished the block; phone in another room.', @attOmar, DATEADD(DAY,-8,@now)),
 (@recNoor, 1, N'Did it but I was distracted.',                NULL,     DATEADD(DAY,-9,@now)),
 (@recNoor, 2, N'Second try with notifications off.',          NULL,     DATEADD(DAY,-3,@now));
DECLARE @subOmar bigint = (SELECT Id FROM task.SubmissionAttempt WHERE RecipientId = @recOmar AND AttemptNo = 1);
DECLARE @subNoor1 bigint = (SELECT Id FROM task.SubmissionAttempt WHERE RecipientId = @recNoor AND AttemptNo = 1);
INSERT task.ReviewDecision (AttemptId, ReviewerPersonId, Decision, Feedback, PrivateNote, DecidedAtUtc) VALUES
 (@subOmar,  @rania, N'Approved',      N'Great work, keep the same routine.',           N'Coach-only: strong candidate for peer mentor.', DATEADD(DAY,-7,@now)),
 (@subNoor1, @rania, N'NeedsRevision', N'Please retry with notifications turned off.',  NULL,                                              DATEADD(DAY,-8,@now));

INSERT task.OperationalReport (Kind, GroupId, AuthorPersonId, PeriodStartDate, PeriodEndDate, Status, MetricsSnapshotJson, BodyJson, SubmittedAtUtc)
VALUES (N'Coach', @grpAlpha, @rania, CAST(DATEADD(DAY,-14,@now) AS date), CAST(DATEADD(DAY,-7,@now) AS date), N'Submitted',
        N'{"members":2,"tasksAssigned":1,"approved":1}', N'{"observations":"Group engaged","issues":"none"}', DATEADD(DAY,-6,@now));

------------------------------------------------------------------------------------------------------
-- 3.9 Sessions, duties, registrations, attendance, excuse
------------------------------------------------------------------------------------------------------
INSERT session.Session (InitiativeId, Title, Mode, TimeZoneId, StartsAtUtc, EndsAtUtc, AttendanceRequired, CheckInBeforeMinutes, CheckInAfterMinutes, OnlineCapacity, InPersonCapacity, Status, Venue, ProtectedLinkRef, CompletionRuleRef) VALUES
 (@ini, N'Week 1 Focus Workshop', N'Hybrid', N'Africa/Cairo', DATEADD(DAY,-10,@now), DATEADD(HOUR,2,DATEADD(DAY,-10,@now)), 1, 30, 15, 10, 4, N'Completed', N'Lecture hall A (demo)', N'links/demo-week1', N'completion/attendance-80'),
 (@ini, N'Week 2 Focus Workshop', N'Online', N'Africa/Cairo', DATEADD(DAY,5,@now),  DATEADD(HOUR,2,DATEADD(DAY,5,@now)),  1, 30, 15, 10, NULL, N'Published', NULL, N'links/demo-week2', N'completion/attendance-80');
DECLARE @s1 bigint = (SELECT Id FROM session.Session WHERE InitiativeId = @ini AND Title = N'Week 1 Focus Workshop');
DECLARE @s2 bigint = (SELECT Id FROM session.Session WHERE InitiativeId = @ini AND Title = N'Week 2 Focus Workshop');
INSERT session.SessionDuty (SessionId, StaffAppointmentId, AssignedByPersonId, AssignedAtUtc) VALUES (@s1, @apptSup, @salim, DATEADD(DAY,-20,@now)), (@s2, @apptSup, @salim, DATEADD(DAY,-2,@now));
INSERT session.SessionRegistration (SessionId, PersonId, Mode, Status, RegisteredAtUtc, CredentialHash) VALUES
 (@s1, @omar, N'InPerson', N'Confirmed', DATEADD(DAY,-15,@now), HASHBYTES('SHA2_256', N'demo-only-checkin-omar')),
 (@s1, @noor, N'Online',   N'Confirmed', DATEADD(DAY,-15,@now), NULL),
 (@s2, @omar, N'Online',   N'Confirmed', DATEADD(DAY,-2,@now),  NULL),
 (@s2, @noor, N'Online',   N'Confirmed', DATEADD(DAY,-2,@now),  NULL);
DECLARE @regOmar1 bigint = (SELECT Id FROM session.SessionRegistration WHERE SessionId = @s1 AND PersonId = @omar);
DECLARE @regNoor1 bigint = (SELECT Id FROM session.SessionRegistration WHERE SessionId = @s1 AND PersonId = @noor);
INSERT session.Attendance (SessionId, PersonId, RegistrationId, Status, Method, RecordedByPersonId, RecordedAtUtc) VALUES
 (@s1, @omar, @regOmar1, N'Present', N'QrCode', @mona, DATEADD(DAY,-10,@now)),
 (@s1, @noor, @regNoor1, N'Absent',  NULL,      @mona, DATEADD(DAY,-10,DATEADD(HOUR,3,@now)));
DECLARE @attNoor bigint = (SELECT Id FROM session.Attendance WHERE SessionId = @s1 AND PersonId = @noor);
INSERT session.AbsenceExcuse (AttendanceId, PersonId, Reason, FileId, Status) VALUES (@attNoor, @noor, N'Medical appointment that day (demo).', @fileExcuse, N'Submitted');

------------------------------------------------------------------------------------------------------
-- 3.10 Institution outdoor activity (camp): forms, terms, staff, cohort, bookings, session, incident
------------------------------------------------------------------------------------------------------
INSERT provider.Experience (OrganizationId, Kind, Status) VALUES (@prov, N'Camp', N'Draft');
DECLARE @exp bigint = SCOPE_IDENTITY();
INSERT forms.Form (Purpose, Title, ExperienceId, Status) VALUES (N'Feedback', N'Camp feedback survey', @exp, N'Draft');
DECLARE @frmFb bigint = SCOPE_IDENTITY();
INSERT forms.FormVersion (FormId, VersionNo, ConsentNoticeVersion, OpensAtUtc, ClosesAtUtc, PublishedByPersonId, PublishedAtUtc, DefinitionJson)
VALUES (@frmFb, 1, N'notice-2027-01', DATEADD(DAY,-3,@now), DATEADD(DAY,30,@now), @yusuf, DATEADD(DAY,-3,@now),
 N'{"questions":[{"key":"q1","type":"single","prompt":"How was day 1?","required":true,"options":[{"code":"good","label":"Good"},{"code":"ok","label":"OK"}]},{"key":"q2","type":"text","prompt":"Comments","required":false}]}');
DECLARE @frmFbV bigint = SCOPE_IDENTITY();
UPDATE forms.Form SET Status = N'Published', CurrentVersionId = @frmFbV WHERE Id = @frmFb;

INSERT provider.ExperienceRevision (ExperienceId, RevisionNo, Title, City, Venue, TimeZoneId, StartsAtUtc, EndsAtUtc, Capacity, WaitlistEnabled, BookingOpensAtUtc, BookingClosesAtUtc, OfferHoldHours, AudienceCode, MinAge, MaxAge, ConsentNoticeVersion, SafetyRef, CancellationPolicyRef, CostKind, Price, Currency, CompletionRuleRef, RequiresApproval, ParticipantFormVersionId, PublishedSnapshotJson, PublishedByPersonId, PublishedAtUtc)
VALUES (@exp, 1, N'Weekend Wilderness Reset (Demo)', N'Dahab', N'Demo campsite', N'Africa/Cairo', DATEADD(DAY,-2,@now), DATEADD(DAY,5,@now), 20, 1, DATEADD(DAY,-40,@now), DATEADD(DAY,-3,@now), 24, N'adults', 18, 40, N'notice-2027-01', N'safety/demo-camp-v1', N'cancel/demo-camp-v1', N'Paid', 120.0000, N'USD', N'completion/camp-attendance', 0, @frmFbV, N'{"title":"Weekend Wilderness Reset (Demo)","capacity":20}', @yusuf, DATEADD(DAY,-40,@now));
DECLARE @expRev bigint = SCOPE_IDENTITY();
UPDATE provider.Experience SET Status = N'Published', CurrentRevisionId = @expRev WHERE Id = @exp;

INSERT org.StaffAppointment (ExperienceId, Role, Status, NormalizedEmail, TokenHash, ExpiresAtUtc, InvitedByPersonId, InvitedAtUtc, PersonId, AcceptedAtUtc, CanManageCohorts)
VALUES (@exp, N'Supervisor', N'Active', N'dana.provider@example.com', HASHBYTES('SHA2_512', N'demo-only-staff-token-3'), DATEADD(DAY,-35,@now), @yusuf, DATEADD(DAY,-39,@now), @dana, DATEADD(DAY,-38,@now), 1);
DECLARE @apptDana bigint = (SELECT Id FROM org.StaffAppointment WHERE ExperienceId = @exp AND Role = N'Supervisor');
INSERT provider.ProviderCohort (ExperienceId, SupervisorAppointmentId, Name, Description, Capacity, JoinTokenHash)
VALUES (@exp, @apptDana, N'Cohort A', N'Morning group (demo)', 10, HASHBYTES('SHA2_512', N'demo-only-cohort-token-1'));
DECLARE @cohort bigint = SCOPE_IDENTITY();

INSERT provider.ExperienceBooking (ExperienceId, PersonId, RevisionId, Status, Mode, ConsentAtUtc, BookedAtUtc, ConfirmedAtUtc, CohortId, CredentialHash) VALUES
 (@exp, @layla, @expRev, N'Confirmed', N'InPerson', DATEADD(DAY,-20,@now), DATEADD(DAY,-20,@now), DATEADD(DAY,-20,@now), @cohort, HASHBYTES('SHA2_256', N'demo-only-checkin-layla')),
 (@exp, @tariq, @expRev, N'Confirmed', N'InPerson', DATEADD(DAY,-19,@now), DATEADD(DAY,-19,@now), DATEADD(DAY,-19,@now), @cohort, HASHBYTES('SHA2_256', N'demo-only-checkin-tariq'));
INSERT provider.ExperienceBooking (ExperienceId, PersonId, RevisionId, Status, Mode, ConsentAtUtc, BookedAtUtc, CancelledAtUtc, CancelReason)
VALUES (@exp, @huda, @expRev, N'Cancelled', N'InPerson', DATEADD(DAY,-18,@now), DATEADD(DAY,-18,@now), DATEADD(DAY,-15,@now), N'Schedule conflict (demo).');
DECLARE @bkLayla bigint = (SELECT Id FROM provider.ExperienceBooking WHERE ExperienceId = @exp AND PersonId = @layla);
DECLARE @bkTariq bigint = (SELECT Id FROM provider.ExperienceBooking WHERE ExperienceId = @exp AND PersonId = @tariq);

INSERT session.Session (ExperienceId, Title, Mode, TimeZoneId, StartsAtUtc, EndsAtUtc, AttendanceRequired, CheckInBeforeMinutes, CheckInAfterMinutes, InPersonCapacity, Status, Venue, CompletionRuleRef)
VALUES (@exp, N'Camp day 1', N'InPerson', N'Africa/Cairo', DATEADD(DAY,-2,@now), DATEADD(HOUR,8,DATEADD(DAY,-2,@now)), 1, 60, 30, 20, N'Completed', N'Demo campsite', N'completion/camp-attendance');
DECLARE @sCamp bigint = SCOPE_IDENTITY();
INSERT session.SessionDuty (SessionId, StaffAppointmentId, AssignedByPersonId, AssignedAtUtc) VALUES (@sCamp, @apptDana, @yusuf, DATEADD(DAY,-10,@now));
INSERT session.Attendance (SessionId, PersonId, BookingId, Status, Method, RecordedByPersonId, RecordedAtUtc) VALUES
 (@sCamp, @layla, @bkLayla, N'Present', N'QrCode', @dana, DATEADD(DAY,-2,@now)),
 (@sCamp, @tariq, @bkTariq, N'Late',    N'Typed',  @dana, DATEADD(DAY,-2,DATEADD(MINUTE,20,@now)));
INSERT session.Completion (Kind, PersonId, BookingId, Status, EvaluatorPersonId, EvaluatedAtUtc, BasisJson) VALUES (N'Camp', @layla, @bkLayla, N'Pending', NULL, NULL, N'{"attendedDays":1,"requiredDays":3}');
INSERT provider.ProviderIncident (ExperienceId, SessionId, ReportedByPersonId, Summary, OccurredAtUtc, Status)
VALUES (@exp, @sCamp, @dana, N'Minor blister on the trail; first aid given; no further action (demo).', DATEADD(DAY,-2,@now), N'Open');

-- survey response and a competition entry with a judge's scores
INSERT forms.FormResponse (FormVersionId, PersonId, ResponseNo, Status, ConsentAtUtc, SubmittedAtUtc, AnswersJson)
VALUES (@frmFbV, @layla, 1, N'Submitted', DATEADD(DAY,-1,@now), DATEADD(DAY,-1,@now), N'{"q1":{"choice":["good"]},"q2":{"text":"Beautiful place, clear instructions."}}');
INSERT forms.Form (Purpose, Title, InitiativeId, Status) VALUES (N'Competition', N'Focus Challenge entries', @ini, N'Draft');
DECLARE @frmComp bigint = SCOPE_IDENTITY();
INSERT forms.FormVersion (FormId, VersionNo, ConsentNoticeVersion, OpensAtUtc, ClosesAtUtc, PublishedByPersonId, PublishedAtUtc, DefinitionJson, EntryPolicyJson)
VALUES (@frmComp, 1, N'notice-2027-01', DATEADD(DAY,-10,@now), DATEADD(DAY,10,@now), @salim, DATEADD(DAY,-10,@now),
 N'{"questions":[{"key":"q1","type":"text","prompt":"Describe your best focus routine","required":true}],"criteria":[{"code":"c1","label":"Clarity","max":10,"weight":1},{"code":"c2","label":"Originality","max":10,"weight":1}]}', N'{"maxEntriesPerPerson":1}');
DECLARE @frmCompV bigint = SCOPE_IDENTITY();
UPDATE forms.Form SET Status = N'Published', CurrentVersionId = @frmCompV WHERE Id = @frmComp;
INSERT forms.FormResponse (FormVersionId, PersonId, ResponseNo, Status, ConsentAtUtc, SubmittedAtUtc, AnswersJson)
VALUES (@frmCompV, @omar, 1, N'Submitted', DATEADD(DAY,-5,@now), DATEADD(DAY,-5,@now), N'{"q1":{"text":"Phone in a drawer, one 25 minute block, then a walk."}}');
DECLARE @rComp bigint = (SELECT Id FROM forms.FormResponse WHERE FormVersionId = @frmCompV AND PersonId = @omar);
INSERT forms.CompetitionJudgment (ResponseId, JudgePersonId, Decision, DecidedAtUtc, ScoresJson, Feedback)
VALUES (@rComp, @rania, N'Scored', DATEADD(DAY,-4,@now), N'[{"criterion":"c1","score":8.5},{"criterion":"c2","score":7.0}]', N'Clear and practical.');

------------------------------------------------------------------------------------------------------
-- 3.11 Partnership, community and moderation
------------------------------------------------------------------------------------------------------
INSERT partnership.PartnershipLink (InitiativeId, ProgramId, RequestedByPersonId, Purpose, DataSharingScopeJson, StartsOnLocalDate, Status, RespondedByPersonId, RespondedAtUtc)
VALUES (@ini, @prog, @salim, N'Coach program supports the Focus Camp groups (demo).', N'{"share":["attendanceSummary"],"exclude":["privateNotes"]}', CAST(DATEADD(DAY,-30,@now) AS date), N'Accepted', @rania, DATEADD(DAY,-29,@now));

INSERT community.Post (AuthorPersonId, Body, TopicCode, Status, PublishedAtUtc, SharedAchievementJson)
VALUES (@layla, N'أسبوعي الأول بدون تمرير لا نهائي — ما أفضل نصائحكم؟ (First week without endless scrolling. Tips welcome!)', N'habits', N'Published', DATEADD(DAY,-6,@now), N'{"kind":"routine","title":"Evening walk","date":"2027-01-10"}');
DECLARE @post bigint = SCOPE_IDENTITY();
INSERT community.Comment (PostId, AuthorPersonId, Body) VALUES (@post, @omar, N'Keeping the phone in another room helped me a lot.');
DECLARE @comment bigint = SCOPE_IDENTITY();
INSERT community.PostInteraction (PostId, PersonId, Kind, ReactionCode) VALUES (@post, @omar, N'Reaction', N'support'), (@post, @noor, N'Bookmark', NULL);
INSERT community.ContentReport (ReporterPersonId, CommentId, ReasonCode, Details, Status)
VALUES (@noor, @comment, N'off-topic', N'Demo report: not relevant to the post.', N'Submitted');

------------------------------------------------------------------------------------------------------
-- 3.12 Audit history, notifications and outbox (written in the same transaction as the state change)
------------------------------------------------------------------------------------------------------
INSERT ops.AuditEvent (ResourceKind, ResourceId, Action, ActorPersonId, ActorCapacity, BeforeStatus, AfterStatus, Reason, AtUtc, DetailJson) VALUES
 (N'InitiativeApplication', @appOmar,   N'Accept',   @salim, N'Representative', N'Pending',  N'Accepted',  NULL,                                  DATEADD(DAY,-33,@now), N'{"seatsUsedAfter":1}'),
 (N'InitiativeApplication', @appNoor,   N'Accept',   @salim, N'Representative', N'Pending',  N'Accepted',  NULL,                                  DATEADD(DAY,-33,@now), N'{"seatsUsedAfter":2}'),
 (N'InitiativeApplication', @appKareem, N'Suspend',  @salim, N'Representative', N'Accepted', N'Suspended', N'Attendance policy review (demo).',   DATEADD(DAY,-12,@now), NULL),
 (N'InitiativeApplication', @appFaris,  N'Offer',    @salim, N'Representative', N'Queued',   N'Offered',   NULL,                                  DATEADD(HOUR,-2,@now), N'{"holdHours":24}'),
 (N'InitiativeApplication', @appHuda1,  N'Withdraw', @huda,  N'Participant',    N'Pending',  N'Withdrawn', N'Schedule conflict (demo).',          DATEADD(DAY,-25,@now), N'{"beforeCutoff":true}'),
 (N'InitiativeApplication', @appHuda2,  N'Reapply',  @huda,  N'Participant',    NULL,        N'Queued',    NULL,                                  DATEADD(DAY,-4,@now),  N'{"attemptNo":2}'),
 (N'InitiativeApplication', @appTariq,  N'Reject',   @salim, N'Representative', N'Pending',  N'Rejected',  N'Does not meet audience rule (demo).',DATEADD(DAY,-32,@now), NULL),
 (N'Attendance',            @attNoor,   N'Record',   @mona,  N'Supervisor',     NULL,        N'Absent',    NULL,                                  DATEADD(DAY,-10,@now), NULL),
 (N'ContentRelease',        1,          N'Publish',  @admin, N'Admin',          N'Draft',    N'Published', N'Garden rules v1',                    DATEADD(DAY,-100,@now),NULL);

DECLARE @evAccept uniqueidentifier = NEWID();
DECLARE @evResched uniqueidentifier = NEWID();
INSERT ops.OutboxMessage (EventPublicId, DedupKey, EventType, Channel, PayloadJson, OccurredAtUtc, Status, DeliveredAtUtc) VALUES
 (@evAccept,  CONCAT(@omar, N':initiative.application.accepted'), N'initiative.application.accepted', N'Email', N'{"to":"omar.student@example.com","template":"initiative.application.accepted"}', DATEADD(DAY,-33,@now), N'Delivered', DATEADD(DAY,-33,@now)),
 -- one event, two recipients: same EventPublicId, different DedupKey (audit finding A5)
 (@evResched, CONCAT(@omar, N':session.rescheduled'), N'session.rescheduled', N'Email', N'{"to":"omar.student@example.com","template":"session.rescheduled"}', DATEADD(DAY,-2,@now), N'Pending', NULL),
 (@evResched, CONCAT(@noor, N':session.rescheduled'), N'session.rescheduled', N'Email', N'{"to":"noor.student@example.com","template":"session.rescheduled"}', DATEADD(DAY,-2,@now), N'Pending', NULL);
DECLARE @obAccept bigint = (SELECT Id FROM ops.OutboxMessage WHERE EventPublicId = @evAccept);
INSERT ops.Notification (RecipientPersonId, EventPublicId, TemplateCode, ResourceKind, ResourceId, Status, EmailOutboxMessageId, ParamsJson) VALUES
 (@omar, @evAccept,  N'initiative.application.accepted', N'InitiativeApplication', @appOmar, N'Read',  @obAccept, N'{"initiativeTitle":"Focus Camp (Demo)"}'),
 (@omar, @evResched, N'session.rescheduled',             N'Session',               @s2,       N'Ready', NULL,      N'{"sessionTitle":"Week 2 Focus Workshop"}'),
 (@noor, @evResched, N'session.rescheduled',             N'Session',               @s2,       N'Ready', NULL,      N'{"sessionTitle":"Week 2 Focus Workshop"}');
UPDATE ops.Notification SET ReadAtUtc = DATEADD(DAY,-33,@now) WHERE RecipientPersonId = @omar AND TemplateCode = N'initiative.application.accepted';

COMMIT TRANSACTION;
PRINT N'DEMO ONLY seed data inserted.';
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    PRINT N'Seed failed and was rolled back: ' + ERROR_MESSAGE() + N' (line ' + CAST(ERROR_LINE() AS nvarchar(12)) + N')';
    THROW;
END CATCH;
GO
