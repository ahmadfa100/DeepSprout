# DeepSprout v4 — قاموس البيانات للتصميم النهائي

> **ملف مُولَّد** من `model/*.mjs` بواسطة `node generate.mjs`. لا تحرره يدويًا؛ عدّل النموذج ثم أعد التوليد.

**العدد:** 87 جدولًا في 19 مخططًا (schema). كل جدول يظهر في مخطط وحدته في [03-erd-ar.md](03-erd-ar.md) وفي صف واحد KEEP في [04-migration-matrix-ar.md](04-migration-matrix-ar.md).

## اصطلاحات مشتركة

- **المفتاح الأساسي:** كل جدول له `Id bigint IDENTITY(1,1)` PK مجمّع (clustered). المعرّف الخارجي في الـAPI والروابط `PublicId uniqueidentifier DEFAULT NEWSEQUENTIALID()` فريد، ولا يُكشف `Id` الداخلي.
- **الوقت:** كل الأوقات `datetime2(3)` بتوقيت UTC وتنتهي بـ`AtUtc`؛ التواريخ المحلية (يوم الخطة، يوم الروتين) `date` مع `TimeZoneId` حيث يلزم.
- **صف قابل للتعديل (m):** `CreatedAtUtc`، `UpdatedAtUtc`، `RowVersion rowversion` للتزامن المتفائل في EF Core.
- **صف إلحاقي (a):** `CreatedAtUtc` فقط. دور قاعدة البيانات `deepsprout_runtime` يملك INSERT/SELECT فقط (DENY UPDATE, DELETE)، ومشغّل `TR_<Table>_Immutable` شبكة أمان. أي تعديل مسموح استثناءً مذكور في "الحراس".
- **الحالة:** `nvarchar` مع CHECK بقائمة مغلقة؛ في C# تُمثَّل كـenum مُحوَّل إلى نص (`HasConversion<string>()`).
- **المفاتيح المركبة:** `(ChildId, OwnerId) → Parent(Id, OwnerId)` تفرض أن الابن والأب يخصان المالك نفسه (الشخص، المبادرة، التجربة، النسخة). الأهداف قيود UNIQUE غير مفلترة على الأب.
- **JSON:** يُستعمل فقط للقطات منشورة ثابتة، أو إعدادات ذاتية الاحتواء، أو مجموعات صغيرة بلا دورة حياة ولا مرجع؛ دائمًا مع `CHECK (ISJSON(...) = 1)`، وكل موضع مبرر في جدوله.
- **الحذف:** لا DELETE على سجلات الأعمال؛ الإنهاء حالة. كل المفاتيح الأجنبية `ON DELETE NO ACTION`.
- **الحراس (guards):** ما لا يعبَّر عنه بـFK/UNIQUE/CHECK يُفرض بإجراء مخزن أو أمر تطبيق داخل معاملة واحدة مع قفل صف الأب، ومشغّل SQL كشبكة أمان عندما يكون الخطأ مكلفًا (السعة، الثبات). المسارات المهمة في [05-validation-plan-ar.md](05-validation-plan-ar.md).

## الفهرس

- **iam** — الهوية والمصادقة (5): [Person](#iam-person)، [PasswordCredential](#iam-passwordcredential)، [OtpChallenge](#iam-otpchallenge)، [ConsentRecord](#iam-consentrecord)، [GlobalGrant](#iam-globalgrant)
- **org** — المنظمات والتحقق والطاقم (4): [Organization](#org-organization)، [OrganizationMember](#org-organizationmember)، [VerificationCase](#org-verificationcase)، [StaffAppointment](#org-staffappointment)
- **personal** — الملف الشخصي والرحلة (1): [IndividualProfile](#personal-individualprofile)
- **lab** — Lab: الاختبارات (5): [InstrumentVersion](#lab-instrumentversion)، [AssessmentWindow](#lab-assessmentwindow)، [AssessmentAttempt](#lab-assessmentattempt)، [AssessmentResponse](#lab-assessmentresponse)، [AssessmentScore](#lab-assessmentscore)
- **recovery** — Recovery Plan (4): [RecoveryCycle](#recovery-recoverycycle)، [PlanRevision](#recovery-planrevision)، [ScheduledAction](#recovery-scheduledaction)، [WeeklyReview](#recovery-weeklyreview)
- **activity** — Activities والروتين (6): [PracticeDefinition](#activity-practicedefinition)، [PracticeVersion](#activity-practiceversion)، [PracticeAttempt](#activity-practiceattempt)، [PracticeProgressionDecision](#activity-practiceprogressiondecision)، [OfflineRoutine](#activity-offlineroutine)، [RoutineCheckIn](#activity-routinecheckin)
- **shield** — Digital Shield (6): [ExtensionInstallation](#shield-extensioninstallation)، [ShieldConfiguration](#shield-shieldconfiguration)، [ShieldSelectedDomain](#shield-shieldselecteddomain)، [ProtectionSession](#shield-protectionsession)، [BrowserUsagePeriod](#shield-browserusageperiod)، [BrowserUsageDomain](#shield-browserusagedomain)
- **evidence** — الأدلة والحدائق (4): [EvidenceEvent](#evidence-evidenceevent)، [RewardPolicyVersion](#evidence-rewardpolicyversion)، [PersonalRewardEntry](#evidence-personalrewardentry)، [GroupRewardEntry](#evidence-grouprewardentry)
- **institution** — مبادرات المؤسسة (4): [Initiative](#institution-initiative)، [InitiativeRevision](#institution-initiativerevision)، [InitiativeApplication](#institution-initiativeapplication)، [InitiativeApplicationDecision](#institution-initiativeapplicationdecision)
- **coach** — برامج المدربين والمجموعات (5): [CoachProgram](#coach-coachprogram)، [ProgramRevision](#coach-programrevision)، [OperationalGroup](#coach-operationalgroup)، [GroupMembership](#coach-groupmembership)، [GroupCoachAssignment](#coach-groupcoachassignment)
- **task** — محرك المهام والتقارير (7): [Assignment](#task-assignment)، [AssignmentRevision](#task-assignmentrevision)، [AssignmentRecipient](#task-assignmentrecipient)، [SubmissionAttempt](#task-submissionattempt)، [ReviewDecision](#task-reviewdecision)، [ReviewPrivateNote](#task-reviewprivatenote)، [OperationalReport](#task-operationalreport)
- **session** — الجلسات والحضور والإكمال (8): [Session](#session-session)، [SessionRevision](#session-sessionrevision)، [SessionDuty](#session-sessionduty)، [SessionRegistration](#session-sessionregistration)، [Attendance](#session-attendance)، [AttendanceCorrection](#session-attendancecorrection)، [AbsenceExcuse](#session-absenceexcuse)، [Completion](#session-completion)
- **provider** — تجارب المزوّد (6): [Experience](#provider-experience)، [ExperienceRevision](#provider-experiencerevision)، [ExperienceBooking](#provider-experiencebooking)، [ProviderCohort](#provider-providercohort)، [ProviderCohortMember](#provider-providercohortmember)، [ProviderIncident](#provider-providerincident)
- **forms** — النماذج والمسابقات (9): [Form](#forms-form)، [FormVersion](#forms-formversion)، [FormQuestion](#forms-formquestion)، [FormQuestionOption](#forms-formquestionoption)، [FormResponse](#forms-formresponse)، [FormAnswer](#forms-formanswer)، [CompetitionCriterion](#forms-competitioncriterion)، [CompetitionJudgment](#forms-competitionjudgment)، [CompetitionCriterionScore](#forms-competitioncriterionscore)
- **community** — المجتمع (6): [Post](#community-post)، [Comment](#community-comment)، [Reaction](#community-reaction)، [Bookmark](#community-bookmark)، [ContentReport](#community-contentreport)، [ModerationDecision](#community-moderationdecision)
- **partnership** — الشراكات (1): [PartnershipLink](#partnership-partnershiplink)
- **governance** — المحتوى المحكوم (CMS) (1): [ContentRelease](#governance-contentrelease)
- **ops** — التشغيل: تدقيق، إشعارات، Outbox، Idempotency (4): [AuditEvent](#ops-auditevent)، [Notification](#ops-notification)، [OutboxMessage](#ops-outboxmessage)، [IdempotencyRecord](#ops-idempotencyrecord)
- **files** — الملفات الآمنة (1): [SecureFile](#files-securefile)

---

## iam — الهوية والمصادقة

### iam.Person

<a id="iam-person"></a>

| | |
|---|---|
| **الغرض** | الهوية الواحدة للإنسان في كل مساحات العمل: فرد، مدرب، ممثل مؤسسة، مزوّد، مشرف، طالب مدعو، وAdmin. |
| **الميزة وسير العمل** | التسجيل، الدخول الموحد، Workspace Switcher، ترقية الطالب المدعو إلى Individual بالهوية نفسها. |
| **لماذا جدول مستقل** | كل سجل في النظام يُنسب إلى شخص واحد (D45، المبدأ 1.3/1). البريد الموثّق عمود هنا لأن المنتج لا يطلب أكثر من بريد موثّق واحد لكل شخص، والفهرس الفريد المفلتر يمنع هويتين بالبريد نفسه. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `iam.Person` + يستوعب `iam.PersonEmail` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `PublicId` | uniqueidentifier | لا | `NEWSEQUENTIALID()` | UQ — المعرّف الخارجي في الـAPI والروابط |
| `DisplayName` | nvarchar(160) | لا |  |  |
| `NormalizedEmail` | nvarchar(320) | نعم |  |  |
| `EmailVerifiedAtUtc` | datetime2(3) | نعم |  |  |
| `Status` | nvarchar(24) | لا | `N'Active'` |  |
| `IndividualEnabledAtUtc` | datetime2(3) | نعم |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_Person (Id)`
- UNIQUE: `(PublicId)`
- UNIQUE: `(NormalizedEmail) WHERE NormalizedEmail IS NOT NULL` (فهرس فريد مفلتر)
- CHECK `CK_Person_Status`: `Status IN ('Active','Suspended','Closed')`
- CHECK `CK_Person_Email`: `(NormalizedEmail IS NULL AND EmailVerifiedAtUtc IS NULL) OR (NormalizedEmail IS NOT NULL AND EmailVerifiedAtUtc IS NOT NULL)`
- حارس: تغيير البريد يتم فقط بعد OtpChallenge(Purpose=EmailChange) ناجح، ويُسجَّل القديم والجديد في ops.AuditEvent.

**العلاقات**

- صادرة: لا شيء.
- واردة: `iam.PasswordCredential` (PersonId)، `iam.OtpChallenge` (PersonId)، `iam.ConsentRecord` (PersonId)، `iam.GlobalGrant` (PersonId | GrantedByPersonId | RevokedByPersonId)، `org.OrganizationMember` (PersonId | GrantedByPersonId | RevokedByPersonId)، `org.VerificationCase` (ApplicantPersonId | DecidedByPersonId)، `org.StaffAppointment` (PersonId | RequestedByPersonId | InvitedByPersonId | EndedByPersonId)، `personal.IndividualProfile` (PersonId)، `lab.AssessmentWindow` (PersonId)، `lab.AssessmentAttempt` (PersonId)، `recovery.RecoveryCycle` (PersonId)، `activity.PracticeAttempt` (PersonId)، `activity.PracticeProgressionDecision` (PersonId)، `activity.OfflineRoutine` (PersonId)، `shield.ExtensionInstallation` (PersonId)، `shield.ShieldConfiguration` (PersonId)، `evidence.EvidenceEvent` (SubjectPersonId | RecordedByPersonId)، `evidence.RewardPolicyVersion` (PublishedByPersonId)، `institution.Initiative` (DraftUpdatedByPersonId | CancelledByPersonId)، `institution.InitiativeRevision` (PublishedByPersonId)، `institution.InitiativeApplication` (PersonId)، `institution.InitiativeApplicationDecision` (ActorPersonId)، `coach.CoachProgram` (OwnerPersonId)، `coach.GroupMembership` (PersonId | InvitedByPersonId | ChangedByPersonId)، `coach.GroupCoachAssignment` (CoachPersonId | AssignedByPersonId)، `task.Assignment` (AuthorPersonId)، `task.AssignmentRecipient` (PersonId)، `task.ReviewDecision` (ReviewerPersonId)، `task.ReviewPrivateNote` (AuthorPersonId)، `task.OperationalReport` (AuthorPersonId | ReviewedByPersonId)، `session.Session` (MeetingAudiencePersonId)، `session.SessionRevision` (PublishedByPersonId)، `session.SessionDuty` (AssignedByPersonId)، `session.SessionRegistration` (PersonId)، `session.Attendance` (PersonId | RecordedByPersonId)، `session.AttendanceCorrection` (CorrectedByPersonId)، `session.AbsenceExcuse` (RecommendedByPersonId | DecidedByPersonId)، `session.Completion` (PersonId | EvaluatorPersonId)، `provider.Experience` (CancelledByPersonId)، `provider.ExperienceRevision` (PublishedByPersonId)، `provider.ExperienceBooking` (PersonId | CancelledByPersonId)، `provider.ProviderCohortMember` (MovedByPersonId)، `provider.ProviderIncident` (ReportedByPersonId)، `forms.FormVersion` (PublishedByPersonId)، `forms.FormResponse` (PersonId)، `forms.CompetitionJudgment` (JudgePersonId)، `community.Post` (AuthorPersonId)، `community.Comment` (AuthorPersonId)، `community.Reaction` (PersonId)، `community.Bookmark` (PersonId)، `community.ContentReport` (ReporterPersonId)، `community.ModerationDecision` (ModeratorPersonId)، `partnership.PartnershipLink` (RequestedByPersonId | RespondedByPersonId | EndedByPersonId)، `governance.ContentRelease` (PublishedByPersonId)، `ops.AuditEvent` (ActorPersonId)، `ops.Notification` (RecipientPersonId)، `ops.IdempotencyRecord` (ActorPersonId)، `files.SecureFile` (OwnerPersonId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | Active ↔ Suspended (حظر منصة من Admin فقط) → Closed. IndividualEnabledAtUtc يُضبط مرة واحدة عند تفعيل المساحة الشخصية (تسجيل فردي أو ترقية طالب). |
| **الخصوصية والملكية والتفويض** | البريد يُقرأ للشخص نفسه، ولـAdmin، ولمطابقة الدعوات داخل الخادم فقط؛ لا يُكشف لطاقم المؤسسة إلا عند ضرورة تشغيلية مثل قائمة الحضور. |
| **التاريخ والنسخ والاحتفاظ** | تغييرات الحالة والبريد تذهب إلى ops.AuditEvent. لا يُحذف الشخص فعليًا لأن مئات السجلات التاريخية تشير إليه؛ الإغلاق حالة. |
| **مثال ملموس** | طالب مدعو يتحقق ببريده عبر OTP فيُنشأ صف Person بحالة Active، وبعد شهر يضغط Upgrade فيُضبط IndividualEnabledAtUtc وتُنشأ personal.IndividualProfile. |
| **ماذا ينكسر لو حُذف أو دُمج** | بدونه تتكرر الهوية لكل دور، وتنكسر استمرارية الطالب المدعو، ويتعذر منع بريد واحد لشخصين. |
| **المصدر** | §1.3، §2.2، §14، D45؛ قرار المالك #3؛ Client/workspaces.html#/auth/*، register.html، login.html |

### iam.PasswordCredential

<a id="iam-passwordcredential"></a>

| | |
|---|---|
| **الغرض** | المادة السرية لكلمة المرور (hash ومعاملاته) منفصلة عن الهوية. |
| **الميزة وسير العمل** | Unified Login بالبريد وكلمة المرور، الاسترجاع، تدوير كلمة المرور، القفل بعد المحاولات. |
| **لماذا جدول مستقل** | العلاقة 1:0..1: الطالب المدعو قد يعمل بـOTP بلا كلمة مرور. الفصل الفيزيائي يسمح بمنح دور قاعدة البيانات الخاص بالمصادقة وحده SELECT على هذا الجدول، فلا تصل التقارير أو استعلامات Person العامة إلى الـhash بالخطأ. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `iam.PasswordCredential` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `PersonId` | bigint | لا |  | FK → iam.Person |
| `Hash` | varbinary(512) | لا |  |  |
| `Algorithm` | nvarchar(40) | لا |  |  |
| `Parameters` | nvarchar(300) | لا |  |  |
| `Status` | nvarchar(24) | لا | `N'Active'` |  |
| `FailedAttemptCount` | smallint | لا | `0` |  |
| `LockedUntilUtc` | datetime2(3) | نعم |  |  |
| `RotatedAtUtc` | datetime2(3) | نعم |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_PasswordCredential (Id)`
- FK: `(PersonId) → iam.Person(Id)`
- UNIQUE: `(PersonId)`
- CHECK `CK_PasswordCredential_Status`: `Status IN ('Active','Revoked')`
- CHECK `CK_PasswordCredential_Attempts`: `FailedAttemptCount >= 0`

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `PersonId`؛ وكل صف هناك يقابله صفر أو واحد هنا.
- واردة: لا شيء.

| | |
|---|---|
| **دورة الحياة والانتقالات** | Active → (تدوير: تحديث في المكان مع RotatedAtUtc) → Revoked عند إغلاق الحساب أو الإجبار على إعادة التعيين. |
| **الخصوصية والملكية والتفويض** | لا يقرؤه إلا مكوّن المصادقة. لا يُعرض لأي واجهة ولا يُصدَّر. |
| **التاريخ والنسخ والاحتفاظ** | لا تُحفظ hashes قديمة؛ حدث التدوير يُسجَّل في AuditEvent دون القيم. |
| **مثال ملموس** | مستخدم يغيّر كلمة مروره من Profile: يُستبدل Hash وParameters ويُضبط RotatedAtUtc ويُصفَّر FailedAttemptCount. |
| **ماذا ينكسر لو حُذف أو دُمج** | دمجه في Person يعيد المادة السرية إلى كل تحميل لكيان Person ويُلغي إمكانية عزل الصلاحيات على مستوى الجدول؛ الوفر جدول واحد فقط. |
| **المصدر** | §2.2، §24.6 (Secure password storage) |

### iam.OtpChallenge

<a id="iam-otpchallenge"></a>

| | |
|---|---|
| **الغرض** | رمز تحقق لمرة واحدة يُرسل إلى بريد لإثبات ملكيته. |
| **الميزة وسير العمل** | انضمام الطالب المدعو بلا كلمة مرور، توثيق البريد عند التسجيل، تغيير البريد، الاسترجاع. |
| **لماذا جدول مستقل** | تحدٍ مستقل بعمر قصير وعدّاد محاولات؛ قد يوجد قبل وجود Person (PersonId NULL عند التسجيل الأول). لا يمكن أن يكون عمودًا في Person لأن شخصًا واحدًا قد يملك عدة تحديات بأغراض مختلفة. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `iam.OtpChallenge` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `PersonId` | bigint | نعم |  | FK → iam.Person |
| `NormalizedEmail` | nvarchar(320) | لا |  |  |
| `Purpose` | nvarchar(24) | لا |  |  |
| `CodeHash` | varbinary(64) | لا |  |  |
| `AttemptCount` | smallint | لا | `0` |  |
| `ExpiresAtUtc` | datetime2(3) | لا |  |  |
| `ConsumedAtUtc` | datetime2(3) | نعم |  |  |
| `Status` | nvarchar(24) | لا | `N'Issued'` |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_OtpChallenge (Id)`
- FK: `(PersonId) → iam.Person(Id)`
- INDEX: `(NormalizedEmail, Purpose) WHERE Status = 'Issued'`
- CHECK `CK_OtpChallenge_Purpose`: `Purpose IN ('SignUp','SignIn','Invitation','EmailChange','Recovery')`
- CHECK `CK_OtpChallenge_Status`: `Status IN ('Issued','Consumed','Expired','Locked')`
- CHECK `CK_OtpChallenge_Consumed`: `(Status = 'Consumed' AND ConsumedAtUtc IS NOT NULL) OR (Status <> 'Consumed' AND ConsumedAtUtc IS NULL)`
- CHECK `CK_OtpChallenge_Attempts`: `AttemptCount >= 0`

**العلاقات**

- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `iam.Person` عبر `PersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: لا شيء.

| | |
|---|---|
| **دورة الحياة والانتقالات** | Issued → Consumed \| Expired \| Locked (تجاوز المحاولات). |
| **الخصوصية والملكية والتفويض** | CodeHash فقط؛ الرمز الأصلي لا يُخزَّن. |
| **التاريخ والنسخ والاحتفاظ** | يمكن حذف التحديات المنتهية بعد مدة احتفاظ تشغيلية (لم تُحدَّد قيمة؛ قرار تشغيلي). |
| **مثال ملموس** | طالب يفتح join.html?token=… ويدخل بريده؛ يُنشأ OtpChallenge(Purpose=Invitation)؛ إدخال الرمز الصحيح يجعله Consumed ثم يُنشأ Person. |
| **ماذا ينكسر لو حُذف أو دُمج** | بدونه لا يوجد مسار OTP للطالب المدعو (§2.2) ولا تحقق من البريد. |
| **المصدر** | §2.2، §14، §24.6؛ Client/join.html، #/auth/* |

### iam.ConsentRecord

<a id="iam-consentrecord"></a>

| | |
|---|---|
| **الغرض** | سجل إلحاقي لموافقات الشخص وسحبها لكل غرض ونسخة إشعار. |
| **الميزة وسير العمل** | الخصوصية الافتراضية، موافقة Shield على القياس، موافقة الترقية، موافقات استخدام البيانات العامة. |
| **لماذا جدول مستقل** | سحب الموافقة يجب أن يبقى قابلًا للإثبات تاريخيًا (§24.1)؛ عمود "آخر موافقة" يفقد السحب. موافقات النماذج والطلبات تُثبَّت أيضًا كنسخة على السجل نفسه لأنها جزء من لقطة الإجراء. |
| **نوع الصف** | إلحاقي (a) |
| **الأصل في المخطط الحالي** | `iam.ConsentRecord` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `PersonId` | bigint | لا |  | FK → iam.Person |
| `PurposeCode` | nvarchar(80) | لا |  |  |
| `NoticeVersion` | nvarchar(64) | لا |  |  |
| `Decision` | nvarchar(16) | لا |  |  |
| `EvidenceRef` | nvarchar(300) | نعم |  |  |
| `DecidedAtUtc` | datetime2(3) | لا |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |

**المفاتيح والقيود والفهارس**

- PK: `PK_ConsentRecord (Id)`
- FK: `(PersonId) → iam.Person(Id)`
- INDEX: `(PersonId, PurposeCode, DecidedAtUtc)`
- CHECK `CK_ConsentRecord_Decision`: `Decision IN ('Accepted','Withdrawn')`
- صلاحيات: INSERT/SELECT فقط لدور التشغيل؛ `TR_ConsentRecord_Immutable` يمنع UPDATE/DELETE.
- حارس: TR_ConsentRecord_Immutable: يمنع UPDATE/DELETE.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `PersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: لا شيء.

| | |
|---|---|
| **دورة الحياة والانتقالات** | إلحاقي فقط: Accepted ثم ربما Withdrawn ثم Accepted لنسخة أحدث. |
| **الخصوصية والملكية والتفويض** | الشخص نفسه وAdmin للامتثال. |
| **التاريخ والنسخ والاحتفاظ** | الجدول هو التاريخ نفسه. مدة الاحتفاظ تحتاج مراجعة قانونية (§24.1) ولم تُحدَّد. |
| **مثال ملموس** | عند تفعيل Shield يُضاف صف PurposeCode=BrowserObservation وNoticeVersion=shield-notice-2. |
| **ماذا ينكسر لو حُذف أو دُمج** | يضيع إثبات سحب الموافقة، وهو متطلب خصوصية للفئة 16–17. |
| **المصدر** | §24.1، §6.4، D41 |

### iam.GlobalGrant

<a id="iam-globalgrant"></a>

| | |
|---|---|
| **الغرض** | قدرات منصة عامة تُمنح بشكل خاص ومُدقَّق (Admin وفروعه). |
| **الميزة وسير العمل** | مساحة Platform Admin: التحقق، الإشراف على المجتمع، CMS، الكتالوج. |
| **لماذا جدول مستقل** | Admin ليس دورًا عامًا يختاره المستخدم (§2.2)، والقدرة تُمنح وتُسحب بتاريخ وفاعل. قائمة القدرات تقنية أولية قابلة للتوسعة، وليست سياسة منتج. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `iam.GlobalGrant` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `PersonId` | bigint | لا |  | FK → iam.Person |
| `Capability` | nvarchar(40) | لا |  |  |
| `GrantedByPersonId` | bigint | لا |  | FK → iam.Person |
| `GrantedAtUtc` | datetime2(3) | لا |  |  |
| `RevokedAtUtc` | datetime2(3) | نعم |  |  |
| `RevokedByPersonId` | bigint | نعم |  | FK → iam.Person |
| `RevokeReason` | nvarchar(800) | نعم |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_GlobalGrant (Id)`
- FK: `(PersonId) → iam.Person(Id)`
- FK: `(GrantedByPersonId) → iam.Person(Id)`
- FK: `(RevokedByPersonId) → iam.Person(Id)`
- UNIQUE: `(PersonId, Capability) WHERE RevokedAtUtc IS NULL` (فهرس فريد مفلتر)
- CHECK `CK_GlobalGrant_Capability`: `Capability IN ('PlatformAdmin','Verifier','Moderator','ContentPublisher','CatalogPublisher')`
- CHECK `CK_GlobalGrant_Revoked`: `(RevokedAtUtc IS NULL AND RevokedByPersonId IS NULL) OR (RevokedAtUtc IS NOT NULL AND RevokedByPersonId IS NOT NULL)`

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `PersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `GrantedByPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `iam.Person` عبر `RevokedByPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: لا شيء.

| | |
|---|---|
| **دورة الحياة والانتقالات** | نشط حتى يُضبط RevokedAtUtc. منح جديد بعد السحب صف جديد. |
| **الخصوصية والملكية والتفويض** | Admin فقط. |
| **التاريخ والنسخ والاحتفاظ** | الصفوف المسحوبة تبقى سجلًا لمن امتلك القدرة ومتى. |
| **مثال ملموس** | مالك المنصة يمنح موظفًا Moderator؛ يظهر له قسم Community moderation فقط. |
| **ماذا ينكسر لو حُذف أو دُمج** | تعود الصلاحية إلى علم bit على Person بلا تاريخ ولا فصل قدرات. |
| **المصدر** | §19، §23.1، D14–D16 |

---

## org — المنظمات والتحقق والطاقم

### org.Organization

<a id="org-organization"></a>

| | |
|---|---|
| **الغرض** | الكيان المؤسسي المحكوم: مؤسسة (Institution) تملك المبادرات، أو مزوّد خارجي (Outdoor Provider) يملك التجارب. |
| **الميزة وسير العمل** | Join as Partner → Institution Representative / Outdoor Provider، صفحة Admin Requests، الشارة الموثّقة، ملف المؤسسة. |
| **لماذا جدول مستقل** | المؤسسة والمزوّد لهما الهوية نفسها (اسم، دولة، مقر، حالة تحقق) ودورة الحياة نفسها والتحقق نفسه من Admin، والواجهة تعرض طلباتهما في قائمة واحدة. ما يختلف هو ما يملكانه؛ لذلك يُثبَّت النوع بمفتاح أجنبي مركب: Initiative يشير إلى (OrganizationId, Kind=Institution) وExperience إلى (OrganizationId, Kind=Provider)، فلا يمكن لمزوّد أن يملك مبادرة على مستوى SQL. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `institution.Institution` + يستوعب `provider.Provider` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `PublicId` | uniqueidentifier | لا | `NEWSEQUENTIALID()` | UQ — المعرّف الخارجي في الـAPI والروابط |
| `Kind` | nvarchar(16) | لا |  |  |
| `Name` | nvarchar(200) | لا |  |  |
| `Status` | nvarchar(24) | لا | `N'Applied'` |  |
| `CountryCode` | char(2) | لا |  |  |
| `HeadquartersCity` | nvarchar(120) | نعم |  |  |
| `OfficialContactEmail` | nvarchar(320) | نعم |  |  |
| `ProfileJson` | nvarchar(max) | نعم |  |  |
| `SettingsJson` | nvarchar(max) | نعم |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_Organization (Id)`
- UNIQUE: `(PublicId)`
- UNIQUE: `(Id, Kind)`
- CHECK `CK_Organization_Kind`: `Kind IN ('Institution','Provider')`
- CHECK `CK_Organization_Status`: `Status IN ('Applied','Verified','Suspended','Closed')`
- CHECK `CK_Organization_ProfileJson`: `ProfileJson IS NULL OR ISJSON(ProfileJson) = 1`
- CHECK `CK_Organization_SettingsJson`: `SettingsJson IS NULL OR ISJSON(SettingsJson) = 1`
- حارس: TR_Organization_KindImmutable: Kind لا يتغير بعد الإنشاء.

**العلاقات**

- صادرة: لا شيء.
- واردة: `org.OrganizationMember` (OrganizationId)، `org.VerificationCase` (OrganizationId, Kind)، `institution.Initiative` (InstitutionId, InstitutionKind)، `provider.Experience` (ProviderId, ProviderKind)

| | |
|---|---|
| **دورة الحياة والانتقالات** | Applied → Verified (بقرار VerificationCase) → Suspended ↔ Verified → Closed. الإيقاف يمنع النشر والقبول الجديد ويحفظ التاريخ. |
| **الخصوصية والملكية والتفويض** | الاسم والمدينة والشارة عامة عند النشر؛ OfficialContactEmail وProfileJson للممثلين وAdmin. |
| **التاريخ والنسخ والاحتفاظ** | تغييرات الهوية الجوهرية تتطلب إعادة تحقق (§15.1 Settings) وتُسجَّل في AuditEvent. |
| **مثال ملموس** | ممثلة جمعية شبابية تقدّم من partners.html؛ يُنشأ Organization(Kind=Institution, Status=Applied) وVerificationCase مرتبط. |
| **ماذا ينكسر لو حُذف أو دُمج** | بلا كيان محكوم لا يوجد مالك قابل للتحقق للمبادرات والتجارب (D17، D18، D40). |
| **المصدر** | §15، §16، §19، §21.4 A، D17، D18، D40، D47؛ Client/workspaces.html#/auth/register، #/admin/organizations |

### org.OrganizationMember

<a id="org-organizationmember"></a>

| | |
|---|---|
| **الغرض** | سلطة الممثل: أن هذا الشخص يتصرف باسم هذه المؤسسة أو هذا المزوّد. |
| **الميزة وسير العمل** | مساحتا Institution وOutdoor Provider، النشر، القبول النهائي، إلغاء المبادرة، دعوة الطاقم. |
| **لماذا جدول مستقل** | علاقة N:M بين Person وOrganization ذات دورة حياة (منح، سحب) ومانح. كل أوامر الممثل تتحقق من صف Active هنا تحت المعاملة. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `institution.RepresentativeMembership` + يستوعب `provider.ProviderMembership` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `OrganizationId` | bigint | لا |  | FK → org.Organization |
| `PersonId` | bigint | لا |  | FK → iam.Person |
| `Status` | nvarchar(16) | لا | `N'Active'` |  |
| `GrantedByPersonId` | bigint | لا |  | FK → iam.Person |
| `GrantedAtUtc` | datetime2(3) | لا |  |  |
| `RevokedAtUtc` | datetime2(3) | نعم |  |  |
| `RevokedByPersonId` | bigint | نعم |  | FK → iam.Person |
| `RevokeReason` | nvarchar(800) | نعم |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_OrganizationMember (Id)`
- FK: `(OrganizationId) → org.Organization(Id)`
- FK: `(PersonId) → iam.Person(Id)`
- FK: `(GrantedByPersonId) → iam.Person(Id)`
- FK: `(RevokedByPersonId) → iam.Person(Id)`
- UNIQUE: `(OrganizationId, PersonId) WHERE Status = 'Active'` (فهرس فريد مفلتر)
- CHECK `CK_OrganizationMember_Status`: `Status IN ('Active','Revoked')`
- CHECK `CK_OrganizationMember_Revoked`: `(Status = 'Active' AND RevokedAtUtc IS NULL) OR (Status = 'Revoked' AND RevokedAtUtc IS NOT NULL AND RevokedByPersonId IS NOT NULL)`

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `org.Organization` عبر `OrganizationId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `PersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `GrantedByPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `iam.Person` عبر `RevokedByPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: لا شيء.

| | |
|---|---|
| **دورة الحياة والانتقالات** | Active → Revoked. إعادة المنح صف جديد. |
| **الخصوصية والملكية والتفويض** | أعضاء المنظمة نفسها وAdmin. |
| **التاريخ والنسخ والاحتفاظ** | الصفوف المسحوبة تُثبت من كان مخولًا وقت أي قرار تاريخي. |
| **مثال ملموس** | Admin يوافق على VerificationCase لمؤسسة؛ في المعاملة نفسها يُنشأ OrganizationMember للمتقدّم. |
| **ماذا ينكسر لو حُذف أو دُمج** | لا يمكن التحقق من سلطة الممثل؛ أي حساب قد يدّعي تمثيل مؤسسة. |
| **المصدر** | §15، §16، D17، D26، D30 |

### org.VerificationCase

<a id="org-verificationcase"></a>

| | |
|---|---|
| **الغرض** | طلب تحقق يراجعه Admin: مؤسسة وممثلها، أو مزوّد وممثله، أو مدرب مستقل كقدرة مهنية. |
| **الميزة وسير العمل** | صفحة Admin Requests (#/admin/organizations) التي تعرض طلبات Coach وInstitution وProvider معًا، وحالة الطلب لدى المتقدم. |
| **لماذا جدول مستقل** | الأنواع الثلاثة لها الأعمدة نفسها والقارئ نفسه (Admin) وآلة الحالة نفسها، والواجهة الحالية تخزنها في مجموعة applications واحدة بحقل type. الموضوع مكتوب بمفتاح حقيقي: Organization بمفتاح مركب مع النوع، أو المتقدم نفسه للمدرب؛ لا TargetType/TargetId. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `institution.InstitutionVerificationCase` + يستوعب `coach.CoachApproval`، `provider.ProviderVerificationCase` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `PublicId` | uniqueidentifier | لا | `NEWSEQUENTIALID()` | UQ — المعرّف الخارجي في الـAPI والروابط |
| `Kind` | nvarchar(16) | لا |  | FK → org.Organization (مركب: OrganizationId, Kind) |
| `OrganizationId` | bigint | نعم |  | FK → org.Organization (مركب: OrganizationId, Kind) |
| `ApplicantPersonId` | bigint | لا |  | FK → iam.Person |
| `Status` | nvarchar(24) | لا | `N'Submitted'` |  |
| `ClaimJson` | nvarchar(max) | لا |  |  |
| `EvidenceFileId` | bigint | نعم |  | FK → files.SecureFile |
| `SubmittedAtUtc` | datetime2(3) | لا |  |  |
| `DecidedByPersonId` | bigint | نعم |  | FK → iam.Person |
| `DecidedAtUtc` | datetime2(3) | نعم |  |  |
| `DecisionReason` | nvarchar(1000) | نعم |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_VerificationCase (Id)`
- FK: `(OrganizationId, Kind) → org.Organization(Id, Kind)`
- FK: `(ApplicantPersonId) → iam.Person(Id)`
- FK: `(DecidedByPersonId) → iam.Person(Id)`
- FK: `(EvidenceFileId) → files.SecureFile(Id)`
- UNIQUE: `(PublicId)`
- UNIQUE: `(OrganizationId) WHERE OrganizationId IS NOT NULL AND Status IN ('Submitted','MoreInfo')` (فهرس فريد مفلتر)
- UNIQUE: `(ApplicantPersonId) WHERE Kind = 'Coach' AND Status IN ('Submitted','MoreInfo','Approved','Suspended')` (فهرس فريد مفلتر)
- CHECK `CK_VerificationCase_Kind`: `Kind IN ('Institution','Provider','Coach')`
- CHECK `CK_VerificationCase_Status`: `Status IN ('Submitted','MoreInfo','Approved','Rejected','Suspended')`
- CHECK `CK_VerificationCase_Subject`: `(Kind = 'Coach' AND OrganizationId IS NULL) OR (Kind IN ('Institution','Provider') AND OrganizationId IS NOT NULL)`
- CHECK `CK_VerificationCase_Decided`: `Status NOT IN ('Approved','Rejected','Suspended') OR (DecidedByPersonId IS NOT NULL AND DecidedAtUtc IS NOT NULL)`
- CHECK `CK_VerificationCase_ClaimJson`: `ISJSON(ClaimJson) = 1`

**العلاقات**

- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `org.Organization` عبر `OrganizationId, Kind`؛ وكل صف هناك يقابله صفر أو واحد ضمن (OrganizationId IS NOT NULL AND Status IN ('Submitted','MoreInfo'))، وكثير خارجه هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `ApplicantPersonId`؛ وكل صف هناك يقابله صفر أو واحد ضمن (Kind = 'Coach' AND Status IN ('Submitted','MoreInfo','Approved','Suspended'))، وكثير خارجه هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `iam.Person` عبر `DecidedByPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `files.SecureFile` عبر `EvidenceFileId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: لا شيء.

| | |
|---|---|
| **دورة الحياة والانتقالات** | Submitted → MoreInfo ↔ Submitted → Approved \| Rejected؛ Approved → Suspended (للمدرب، حوكمة لاحقة). |
| **الخصوصية والملكية والتفويض** | المتقدم وAdmin. ملف الإثبات عبر files.SecureFile بقارئ محدد. |
| **التاريخ والنسخ والاحتفاظ** | كل انتقال يُسجَّل في AuditEvent مع السبب؛ لم يُطلب عرض تاريخ قرارات منفصل للمتقدم. |
| **مثال ملموس** | مدرب مستقل يقدّم؛ يُنشأ VerificationCase(Kind=Coach, OrganizationId=NULL)؛ Admin يطلب MoreInfo ثم يوافق؛ تصبح Programs متاحة له. |
| **ماذا ينكسر لو حُذف أو دُمج** | تضيع البوابة التي تمنع النشر قبل التحقق (D17، D47) ونرجع إلى ثلاثة جداول بالأعمدة نفسها. |
| **المصدر** | §2.2، §13، §15، §16، §19 Applications، D17، D22، D47؛ Client/src/workspaces/pages/admin/console.js |

### org.StaffAppointment

<a id="org-staffappointment"></a>

| | |
|---|---|
| **الغرض** | دورة حياة مقعد طاقم واحد في نطاق مورد واحد: طلب من المشرف ← دعوة بالبريد ← قبول بهوية موثّقة ← تعيين نشط ← سحب. |
| **الميزة وسير العمل** | Team & Groups للمؤسسة (دعوة Coach/Supervisor)، Supervisors & Staff للمزوّد، قبول الدعوة في #/auth، Request staff من المشرف، Workspace Switcher. |
| **لماذا جدول مستقل** | الدعوة والتعيين كانا جدولين بعلاقة 1:1 إلزامية (UQ InvitationId) ويصفان الحقيقة نفسها في مرحلتين؛ الآن صف واحد وآلة حالة واحدة كما في الـClient. النطاق مكتوب بمفتاحين حقيقيين XOR (مبادرة أو تجربة). المفتاحان الفريدان (Id, InitiativeId) و(Id, ExperienceId) هما هدف المفاتيح المركبة من SessionDuty وGroupCoachAssignment وProviderCohort، فلا يمكن إسناد تعيين مبادرة إلى جلسة تجربة. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `institution.InitiativeStaffAppointment` + يستوعب `institution.InitiativeStaffInvitation`، `provider.ProviderStaffAppointment`، `provider.ProviderStaffInvitation` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `PublicId` | uniqueidentifier | لا | `NEWSEQUENTIALID()` | UQ — المعرّف الخارجي في الـAPI والروابط |
| `InitiativeId` | bigint | نعم |  | FK → institution.Initiative |
| `ExperienceId` | bigint | نعم |  | FK → provider.Experience |
| `Role` | nvarchar(16) | لا |  |  |
| `Status` | nvarchar(16) | لا |  |  |
| `RequestedByPersonId` | bigint | نعم |  | FK → iam.Person |
| `RequestNote` | nvarchar(800) | نعم |  |  |
| `NormalizedEmail` | nvarchar(320) | نعم |  |  |
| `TokenHash` | varbinary(64) | نعم |  |  |
| `ExpiresAtUtc` | datetime2(3) | نعم |  |  |
| `InvitedByPersonId` | bigint | نعم |  | FK → iam.Person |
| `InvitedAtUtc` | datetime2(3) | نعم |  |  |
| `PersonId` | bigint | نعم |  | FK → iam.Person |
| `AcceptedAtUtc` | datetime2(3) | نعم |  |  |
| `EndedAtUtc` | datetime2(3) | نعم |  |  |
| `EndedByPersonId` | bigint | نعم |  | FK → iam.Person |
| `EndReason` | nvarchar(800) | نعم |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_StaffAppointment (Id)`
- FK: `(InitiativeId) → institution.Initiative(Id)`
- FK: `(ExperienceId) → provider.Experience(Id)`
- FK: `(PersonId) → iam.Person(Id)`
- FK: `(RequestedByPersonId) → iam.Person(Id)`
- FK: `(InvitedByPersonId) → iam.Person(Id)`
- FK: `(EndedByPersonId) → iam.Person(Id)`
- UNIQUE: `(PublicId)`
- UNIQUE: `(Id, InitiativeId)`
- UNIQUE: `(Id, ExperienceId)`
- UNIQUE: `(InitiativeId, NormalizedEmail, Role) WHERE InitiativeId IS NOT NULL AND Status = 'Pending'` (فهرس فريد مفلتر)
- UNIQUE: `(ExperienceId, NormalizedEmail) WHERE ExperienceId IS NOT NULL AND Status = 'Pending'` (فهرس فريد مفلتر)
- UNIQUE: `(InitiativeId, PersonId, Role) WHERE InitiativeId IS NOT NULL AND Status = 'Active'` (فهرس فريد مفلتر)
- UNIQUE: `(ExperienceId, PersonId) WHERE ExperienceId IS NOT NULL AND Status = 'Active'` (فهرس فريد مفلتر)
- UNIQUE: `(TokenHash) WHERE TokenHash IS NOT NULL` (فهرس فريد مفلتر)
- INDEX: `(InitiativeId, Role) WHERE Status = 'Active'`
- CHECK `CK_StaffAppointment_Scope`: `(InitiativeId IS NOT NULL AND ExperienceId IS NULL) OR (InitiativeId IS NULL AND ExperienceId IS NOT NULL)`
- CHECK `CK_StaffAppointment_Role`: `Role IN ('Supervisor','Coach') AND (ExperienceId IS NULL OR Role = 'Supervisor')`
- CHECK `CK_StaffAppointment_Status`: `Status IN ('Requested','Pending','Active','Declined','Expired','Cancelled','Revoked')`
- CHECK `CK_StaffAppointment_Requested`: `Status <> 'Requested' OR (InitiativeId IS NOT NULL AND RequestedByPersonId IS NOT NULL AND NormalizedEmail IS NULL AND PersonId IS NULL)`
- CHECK `CK_StaffAppointment_Invited`: `Status IN ('Requested','Cancelled') OR (NormalizedEmail IS NOT NULL AND TokenHash IS NOT NULL AND ExpiresAtUtc IS NOT NULL AND InvitedByPersonId IS NOT NULL AND InvitedAtUtc IS NOT NULL)`
- CHECK `CK_StaffAppointment_Accepted`: `(Status IN ('Active','Revoked') AND PersonId IS NOT NULL AND AcceptedAtUtc IS NOT NULL) OR (Status NOT IN ('Active','Revoked') AND PersonId IS NULL AND AcceptedAtUtc IS NULL)`
- CHECK `CK_StaffAppointment_Ended`: `Status <> 'Revoked' OR (EndedAtUtc IS NOT NULL AND EndedByPersonId IS NOT NULL)`
- حارس: proc org.AcceptStaffAppointment: يطابق NormalizedEmail مع البريد الموثّق للمستدعي، يرفض Expired، ويقفل صف Initiative بـUPDLOCK,HOLDLOCK ثم يعدّ المشرفين النشطين (≤ 3) في المعاملة نفسها.
- حارس: TR_StaffAppointment_SupervisorCap: شبكة أمان ترفض أي حالة تجعل عدد (Role=Supervisor, Status=Active) لمبادرة واحدة > 3.
- حارس: TR_StaffAppointment_ScopeImmutable: InitiativeId/ExperienceId/Role لا تتغير بعد الإنشاء.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `institution.Initiative` عبر `InitiativeId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `provider.Experience` عبر `ExperienceId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `iam.Person` عبر `PersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `iam.Person` عبر `RequestedByPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `iam.Person` عبر `InvitedByPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `iam.Person` عبر `EndedByPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `coach.GroupCoachAssignment` (StaffAppointmentId, InitiativeId)، `session.SessionDuty` (StaffAppointmentId | StaffAppointmentId, InitiativeId | StaffAppointmentId, ExperienceId)، `provider.ProviderCohort` (SupervisorAppointmentId, ExperienceId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | Requested (طلب المشرف) → Pending (دعوة) → Active (قبول) → Revoked؛ Pending → Declined \| Expired \| Cancelled؛ Requested → Cancelled. إعادة الإرسال تُدوّر TokenHash وExpiresAtUtc على الصف نفسه. |
| **الخصوصية والملكية والتفويض** | الممثل أو المزوّد مالك النطاق، والمدعو نفسه. لا يمنح الصف أي اطلاع على بيانات شخصية خاصة (Lab/Shield/Recovery). |
| **التاريخ والنسخ والاحتفاظ** | الصفوف المسحوبة تبقى لتثبت أن المشرف كان مخولًا وقت تسجيل الحضور أو الموافقة؛ لا يُحذف تعيين أبدًا. |
| **مثال ملموس** | الممثل يدعو supervisor@x.org إلى مبادرة؛ صف Pending. المدعوة تسجّل دخولًا ببريد مطابق وتقبل؛ يصبح Active مع PersonId. قبول مشرف رابع يُرفض بالخطأ "Three active supervisors already assigned". |
| **ماذا ينكسر لو حُذف أو دُمج** | بدونه لا يوجد حد الثلاثة مشرفين، ولا بوابة "Needs Supervisor" للحضور، ولا قبول آمن لدعوة بالبريد (D21–D23، D28، D38). |
| **المصدر** | §13، §15.1 Team، §16 Supervisors، §17، D21–D23، D28، D30، D38، D40؛ Client/src/workspaces/commands/initiative.js (initiative.staff.*، staffRequests)، commands/outdoor.js (provider.appointment.*) |

---

## personal — الملف الشخصي والرحلة

### personal.IndividualProfile

<a id="personal-individualprofile"></a>

| | |
|---|---|
| **الغرض** | امتداد المساحة الشخصية: مرحلة الـonboarding، إجابات الإعداد السريع، التفضيلات، وبداية رحلة التعافي المستمرة. |
| **الميزة وسير العمل** | Meet Bimo → Before We Begin → Quick Personal Setup → استئناف المرحلة الدقيقة، Profile (تفضيلات التذكير)، Home. |
| **لماذا جدول مستقل** | ليس كل Person فردًا (طالب مدعو، ممثل). إجابات الإعداد (الهدف، المواقع المشتتة، وقت الذروة، الأجهزة، الاهتمامات غير المتصلة، الأيام المتاحة، شدة الحماية) إعدادات ذاتية الاحتواء تُقرأ معًا ولا تُستعلم عبر الأشخاص ولا يشير إليها مفتاح؛ لذلك JSON مقبول هنا. JourneyStartedAtUtc يحل محل جدول RecoveryJourney الذي لم يحمل إلا الحالة. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `personal.IndividualProfile` + يستوعب `recovery.RecoveryJourney` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `PersonId` | bigint | لا |  | FK → iam.Person؛ FK → lab.AssessmentAttempt (مركب: LastAssessmentAttemptId, PersonId) |
| `OnboardingStage` | nvarchar(24) | لا | `N'Started'` |  |
| `GoalCode` | nvarchar(64) | نعم |  |  |
| `SetupAnswersJson` | nvarchar(max) | نعم |  |  |
| `SetupAnswersVersion` | int | نعم |  |  |
| `PreferencesJson` | nvarchar(max) | نعم |  |  |
| `PreferredTimeZone` | nvarchar(80) | لا |  |  |
| `LastAssessmentAttemptId` | bigint | نعم |  | FK → lab.AssessmentAttempt (مركب: LastAssessmentAttemptId, PersonId) |
| `JourneyStartedAtUtc` | datetime2(3) | نعم |  |  |
| `OnboardingCompletedAtUtc` | datetime2(3) | نعم |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_IndividualProfile (Id)`
- FK: `(PersonId) → iam.Person(Id)`
- FK: `(LastAssessmentAttemptId, PersonId) → lab.AssessmentAttempt(Id, PersonId)`
- UNIQUE: `(PersonId)`
- CHECK `CK_IndividualProfile_Stage`: `OnboardingStage IN ('Started','Introduced','Setup','Baselines','Results','Preview','Activated','TourDone')`
- CHECK `CK_IndividualProfile_SetupJson`: `SetupAnswersJson IS NULL OR ISJSON(SetupAnswersJson) = 1`
- CHECK `CK_IndividualProfile_PrefsJson`: `PreferencesJson IS NULL OR ISJSON(PreferencesJson) = 1`
- CHECK `CK_IndividualProfile_Journey`: `OnboardingStage NOT IN ('Activated','TourDone') OR JourneyStartedAtUtc IS NOT NULL`

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `PersonId`؛ وكل صف هناك يقابله صفر أو واحد هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `lab.AssessmentAttempt` عبر `LastAssessmentAttemptId, PersonId`؛ وكل صف هناك يقابله صفر أو واحد هنا.
- واردة: لا شيء.

| | |
|---|---|
| **دورة الحياة والانتقالات** | OnboardingStage يتقدم ولا يتراجع: Started → Introduced → Setup → Baselines → Results → Preview → Activated → TourDone. JourneyStartedAtUtc يُضبط مرة واحدة عند أول تفعيل خطة. |
| **الخصوصية والملكية والتفويض** | خاص بالشخص تمامًا (§24.1)؛ لا يقرؤه مدرب ولا مؤسسة. |
| **التاريخ والنسخ والاحتفاظ** | SetupAnswersVersion يزيد مع كل تعديل؛ الخطة المتأثرة تُسجّل PlanRevision. القيم السابقة للإعداد غير مطلوبة كتاريخ. |
| **مثال ملموس** | بعد إغلاق المتصفح في منتصف الاختبار الثاني، تعيد الواجهة الشخص إلى Baselines وتفتح LastAssessmentAttemptId المحفوظ. |
| **ماذا ينكسر لو حُذف أو دُمج** | تفقد الواجهة الاستئناف الدقيق (§4.5 Returning users) وتختلط إجابات التخصيص بنتائج الأداء. |
| **المصدر** | §4.1–§4.5، §5.7، D04؛ Client/src/pages/member/onboarding/*، profile/*؛ src/data/demo-account.json (user.setup) |

---

## lab — Lab: الاختبارات

### lab.InstrumentVersion

<a id="lab-instrumentversion"></a>

| | |
|---|---|
| **الغرض** | نسخة منشورة من أحد الاختبارات الأربعة: المحتوى والبروتوكول ونسخة التصحيح ومجموعة القابلية للمقارنة. |
| **الميزة وسير العمل** | Lab والمشغّل assessment.html، محرر Assessments في Admin، مقارنات Insights. |
| **لماذا جدول مستقل** | كل محاولة يجب أن تُثبَّت على نسخة المحتوى والتصحيح التي أُجريت بها (§4.4)، والنسخ يحررها Admin. مجموعة الاختبارات مغلقة بقرار المالك (أربعة)، لذلك يكفي InstrumentCode بقيد CHECK بدل جدول أدوات من أربعة صفوف ثابتة. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `lab.InstrumentVersion` + يستوعب `lab.AssessmentInstrument` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `InstrumentCode` | nvarchar(32) | لا |  |  |
| `VersionNo` | int | لا |  |  |
| `Title` | nvarchar(160) | لا |  |  |
| `ContentRef` | nvarchar(300) | لا |  |  |
| `ContentJson` | nvarchar(max) | نعم |  |  |
| `ProtocolVersion` | nvarchar(64) | لا |  |  |
| `ScoringVersion` | nvarchar(64) | لا |  |  |
| `ComparabilityGroup` | nvarchar(64) | نعم |  |  |
| `Status` | nvarchar(16) | لا | `N'Draft'` |  |
| `PublishedAtUtc` | datetime2(3) | نعم |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_InstrumentVersion (Id)`
- UNIQUE: `(Id, InstrumentCode)`
- UNIQUE: `(InstrumentCode, VersionNo)`
- CHECK `CK_InstrumentVersion_Instrument`: `InstrumentCode IN ('DigitalHabits','SustainedAttention','InhibitoryControl','DepthChallenge')`
- CHECK `CK_InstrumentVersion_VersionNo`: `VersionNo > 0`
- CHECK `CK_InstrumentVersion_Status`: `Status IN ('Draft','Published','Retired')`
- CHECK `CK_InstrumentVersion_Published`: `Status = 'Draft' OR PublishedAtUtc IS NOT NULL`
- CHECK `CK_InstrumentVersion_ContentJson`: `ContentJson IS NULL OR ISJSON(ContentJson) = 1`
- حارس: TR_InstrumentVersion_Immutable: بعد Published لا يتغير أي عمود إلا Status → Retired.

**العلاقات**

- صادرة: لا شيء.
- واردة: `lab.AssessmentAttempt` (InstrumentVersionId, InstrumentCode)

| | |
|---|---|
| **دورة الحياة والانتقالات** | Draft → Published → Retired. نسخة منشورة لا تُعدَّل؛ التغيير نسخة جديدة. |
| **الخصوصية والملكية والتفويض** | محتوى عام للمستخدمين المؤهلين؛ التحرير لـAdmin بقدرة CatalogPublisher. |
| **التاريخ والنسخ والاحتفاظ** | كل النسخ تبقى لأن المحاولات القديمة تشير إليها. |
| **مثال ملموس** | Admin ينشر DepthChallenge v2 بنص قراءة جديد؛ المحاولات السابقة تبقى على v1 وتُعلَّم غير قابلة للمقارنة إن اختلفت ComparabilityGroup. |
| **ماذا ينكسر لو حُذف أو دُمج** | تضيع إمكانية إعادة إنتاج النتيجة وشرط المقارنة الصحيحة (§10.3، D43). |
| **المصدر** | §4.4، §5.8، §10.3، §19، D43؛ Client/src/pages/member/lab/*، js/data/account.js (ASSESSMENT_CONTRACTS) |

### lab.AssessmentWindow

<a id="lab-assessmentwindow"></a>

| | |
|---|---|
| **الغرض** | نافذة أهلية رسمية أسبوعية لإعادة القياس لشخص محدد، مع الاختبارات المعروضة فيها. |
| **الميزة وسير العمل** | Lab: "Digital Habits + اختبار متناوب كل سبعة أيام"، شارة المحاولة المتأخرة، حالة "Reassessment unavailable" في Insights. |
| **لماذا جدول مستقل** | الأهلية منحة يصدرها الخادم بموجب سياسة لم تُحسم تفاصيلها بعد (§26.2 #1). حفظ النافذة يفصل التاريخ عن تغيّر السياسة لاحقًا ويمنع محاولتين رسميتين صالحتين للاختبار نفسه في نافذة واحدة. قائمة الاختبارات المعروضة مجموعة صغيرة ثابتة، ولذلك JSON مقبول هنا. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `lab.AssessmentWindow` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `PersonId` | bigint | لا |  | FK → iam.Person |
| `WindowKey` | nvarchar(120) | لا |  |  |
| `PolicyVersion` | nvarchar(64) | لا |  |  |
| `OfferedInstrumentsJson` | nvarchar(400) | لا |  |  |
| `OpensAtUtc` | datetime2(3) | لا |  |  |
| `ClosesAtUtc` | datetime2(3) | لا |  |  |
| `Status` | nvarchar(16) | لا | `N'Open'` |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_AssessmentWindow (Id)`
- FK: `(PersonId) → iam.Person(Id)`
- UNIQUE: `(Id, PersonId)`
- UNIQUE: `(PersonId, WindowKey)`
- CHECK `CK_AssessmentWindow_Interval`: `ClosesAtUtc > OpensAtUtc`
- CHECK `CK_AssessmentWindow_Status`: `Status IN ('Open','Used','Closed','Missed')`
- CHECK `CK_AssessmentWindow_Offered`: `ISJSON(OfferedInstrumentsJson) = 1`

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `PersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `lab.AssessmentAttempt` (WindowId, PersonId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | Open → Used (تمت المحاولات الرسمية) \| Closed \| Missed. |
| **الخصوصية والملكية والتفويض** | خاص بالشخص. |
| **التاريخ والنسخ والاحتفاظ** | النوافذ الفائتة تبقى (Missed) لتفسير غياب المقارنة دون اعتباره صفرًا. |
| **مثال ملموس** | بعد سبعة أيام من آخر baseline تُنشأ نافذة WindowKey=2026-W46 تعرض DigitalHabits وSustainedAttention. |
| **ماذا ينكسر لو حُذف أو دُمج** | لا يمكن التمييز بين محاولة رسمية ومحاولة تدريب، ولا إثبات أن المقارنة جاءت من نافذة صالحة (D05، D43). |
| **المصدر** | §4.4، §5.8، D05، D43؛ Client/src/pages/member/lab/lab.js، demo-account.json (checkInPolicy) |

### lab.AssessmentAttempt

<a id="lab-assessmentattempt"></a>

| | |
|---|---|
| **الغرض** | محاولة واحدة لاختبار Lab: baseline أو رسمية أو تدريبية، مع حالة الحفظ الجزئي والصلاحية. |
| **الميزة وسير العمل** | الاختبارات الأربعة في الـonboarding، Pause/Resume، Your Starting Point، تاريخ Lab، مقارنات Insights. |
| **لماذا جدول مستقل** | لكل محاولة دورة حياة (إيقاف، استئناف، إنهاء، إبطال) وأبناء (إجابات ودرجات). الفهرسان المفلتران يضمنان baseline صالحًا واحدًا لكل اختبار ومحاولة رسمية صالحة واحدة لكل اختبار في النافذة. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `lab.AssessmentAttempt` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `PublicId` | uniqueidentifier | لا | `NEWSEQUENTIALID()` | UQ — المعرّف الخارجي في الـAPI والروابط |
| `PersonId` | bigint | لا |  | FK → iam.Person؛ FK → lab.AssessmentWindow (مركب: WindowId, PersonId) |
| `InstrumentVersionId` | bigint | لا |  | FK → lab.InstrumentVersion (مركب: InstrumentVersionId, InstrumentCode) |
| `InstrumentCode` | nvarchar(32) | لا |  | FK → lab.InstrumentVersion (مركب: InstrumentVersionId, InstrumentCode) |
| `Kind` | nvarchar(16) | لا |  |  |
| `WindowId` | bigint | نعم |  | FK → lab.AssessmentWindow (مركب: WindowId, PersonId) |
| `Status` | nvarchar(16) | لا | `N'Started'` |  |
| `StartedAtUtc` | datetime2(3) | لا |  |  |
| `LastSavedAtUtc` | datetime2(3) | نعم |  |  |
| `FinishedAtUtc` | datetime2(3) | نعم |  |  |
| `ValidityCode` | nvarchar(40) | نعم |  |  |
| `AccessibilityMode` | nvarchar(40) | نعم |  |  |
| `IsLate` | bit | لا | `0` |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_AssessmentAttempt (Id)`
- FK: `(PersonId) → iam.Person(Id)`
- FK: `(InstrumentVersionId, InstrumentCode) → lab.InstrumentVersion(Id, InstrumentCode)`
- FK: `(WindowId, PersonId) → lab.AssessmentWindow(Id, PersonId)`
- UNIQUE: `(PublicId)`
- UNIQUE: `(Id, PersonId)`
- UNIQUE: `(PersonId, InstrumentCode) WHERE Kind = 'Baseline' AND Status = 'Valid'` (فهرس فريد مفلتر)
- UNIQUE: `(WindowId, InstrumentCode) WHERE Kind = 'Official' AND Status = 'Valid'` (فهرس فريد مفلتر)
- CHECK `CK_AssessmentAttempt_Kind`: `Kind IN ('Baseline','Official','Practice')`
- CHECK `CK_AssessmentAttempt_Status`: `Status IN ('Started','Paused','Submitted','Valid','Invalid','Abandoned')`
- CHECK `CK_AssessmentAttempt_Window`: `(Kind = 'Official' AND WindowId IS NOT NULL) OR (Kind <> 'Official' AND WindowId IS NULL)`
- CHECK `CK_AssessmentAttempt_Finished`: `(Status IN ('Started','Paused') AND FinishedAtUtc IS NULL) OR (Status IN ('Submitted','Valid','Invalid','Abandoned') AND FinishedAtUtc IS NOT NULL AND FinishedAtUtc >= StartedAtUtc)`
- حارس: TR_AssessmentAttempt_Transition: يسمح فقط بـStarted↔Paused→Submitted→Valid\|Invalid، وStarted\|Paused→Abandoned.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `PersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `lab.InstrumentVersion` عبر `InstrumentVersionId, InstrumentCode`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `lab.AssessmentWindow` عبر `WindowId, PersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `personal.IndividualProfile` (LastAssessmentAttemptId, PersonId)، `lab.AssessmentResponse` (AttemptId)، `lab.AssessmentScore` (AttemptId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | Started ↔ Paused → Submitted → Valid \| Invalid؛ Started\|Paused → Abandoned. |
| **الخصوصية والملكية والتفويض** | خاص بالشخص افتراضيًا (§24.1، §23.1). لا مدرب ولا مؤسسة يقرأ. |
| **التاريخ والنسخ والاحتفاظ** | لا تُحذف المحاولات غير الصالحة؛ تبقى مع ValidityCode لتفسير السجل. |
| **مثال ملموس** | محاولة SustainedAttention تُغلق المتصفح عند التجربة 12؛ تبقى Paused مع 12 صفًا في AssessmentResponse، ثم تُستأنف. |
| **ماذا ينكسر لو حُذف أو دُمج** | لا baseline قابل للإثبات ولا تفعيل خطة (D04) ولا مقارنة صالحة. |
| **المصدر** | §4.4، §4.5، §5.8، D04، D05، D43؛ Client/src/pages/member/lab/assessment.js |

### lab.AssessmentResponse

<a id="lab-assessmentresponse"></a>

| | |
|---|---|
| **الغرض** | استجابة بند أو تجربة واحدة داخل محاولة اختبار (إجابة سؤال، ضغطة، زمن رد). |
| **الميزة وسير العمل** | الحفظ الجزئي والاستئناف، إعادة التصحيح بنسخة scoring جديدة، تفاصيل النتيجة. |
| **لماذا جدول مستقل** | التجارب كثيرة لكل محاولة (مثل 40 تجربة Go/No-Go) وتُكتب تدريجيًا أثناء الأداء وتُستأنف بعد الانقطاع؛ هذا تحديث جزئي متكرر لا يناسب JSON واحدًا، وإعادة التصحيح تحتاج قراءة البنود كصفوف. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `lab.AssessmentResponse` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `AttemptId` | bigint | لا |  | FK → lab.AssessmentAttempt |
| `ItemKey` | nvarchar(80) | لا |  |  |
| `TrialNo` | int | لا |  |  |
| `ResponseText` | nvarchar(max) | نعم |  |  |
| `ResponseNumber` | decimal(12,4) | نعم |  |  |
| `LatencyMs` | int | نعم |  |  |
| `RecordedAtUtc` | datetime2(3) | لا |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_AssessmentResponse (Id)`
- FK: `(AttemptId) → lab.AssessmentAttempt(Id)`
- UNIQUE: `(AttemptId, ItemKey, TrialNo)`
- CHECK `CK_AssessmentResponse_Trial`: `TrialNo > 0`
- CHECK `CK_AssessmentResponse_Latency`: `LatencyMs IS NULL OR LatencyMs >= 0`
- حارس: TR_AssessmentResponse_OpenAttempt: إدراج/تعديل فقط ما دامت المحاولة Started أو Paused؛ بعدها مختومة.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `lab.AssessmentAttempt` عبر `AttemptId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: لا شيء.

| | |
|---|---|
| **دورة الحياة والانتقالات** | تُكتب أثناء المحاولة المفتوحة ثم تُختم. |
| **الخصوصية والملكية والتفويض** | خاص بالشخص؛ أي استخدام بحثي يحتاج موافقة منفصلة لم تُعتمد. |
| **التاريخ والنسخ والاحتفاظ** | لا تتغير بعد الختم. |
| **مثال ملموس** | في InhibitoryControl يُضاف صف لكل تجربة: ItemKey=nogo-17، TrialNo=1، LatencyMs=null (امتناع صحيح). |
| **ماذا ينكسر لو حُذف أو دُمج** | يفقد الاستئناف بعد الانقطاع (§4.4 required states) وإعادة التصحيح. |
| **المصدر** | §4.4، §24.5؛ Client/src/pages/member/lab/assessment-data.js |

### lab.AssessmentScore

<a id="lab-assessmentscore"></a>

| | |
|---|---|
| **الغرض** | مقياس محسوب واحد لمحاولة بنسخة تصحيح محددة (دقة، أخطاء حذف/إضافة، زمن رد…). |
| **الميزة وسير العمل** | Your Starting Point، تاريخ Lab، بطاقة Assessments في Insights. |
| **لماذا جدول مستقل** | المحاولة الواحدة تنتج عدة مقاييس، وقد تُعاد بنسخة تصحيح لاحقة دون محو الأولى؛ لا "درجة دماغ" واحدة (§4.4). |
| **نوع الصف** | إلحاقي (a) |
| **الأصل في المخطط الحالي** | `lab.AssessmentScore` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `AttemptId` | bigint | لا |  | FK → lab.AssessmentAttempt |
| `ScoringVersion` | nvarchar(64) | لا |  |  |
| `MetricCode` | nvarchar(64) | لا |  |  |
| `Value` | decimal(12,4) | لا |  |  |
| `Comparable` | bit | لا |  |  |
| `ComputedAtUtc` | datetime2(3) | لا |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |

**المفاتيح والقيود والفهارس**

- PK: `PK_AssessmentScore (Id)`
- FK: `(AttemptId) → lab.AssessmentAttempt(Id)`
- UNIQUE: `(AttemptId, ScoringVersion, MetricCode)`
- صلاحيات: INSERT/SELECT فقط لدور التشغيل؛ `TR_AssessmentScore_Immutable` يمنع UPDATE/DELETE.
- حارس: TR_AssessmentScore_Immutable: إلحاقي.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `lab.AssessmentAttempt` عبر `AttemptId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: لا شيء.

| | |
|---|---|
| **دورة الحياة والانتقالات** | إلحاقي فقط. |
| **الخصوصية والملكية والتفويض** | خاص بالشخص. |
| **التاريخ والنسخ والاحتفاظ** | نسخ التصحيح المتعددة تتعايش؛ الواجهة تختار نسخة المقارنة. |
| **مثال ملموس** | SustainedAttention: صفوف Accuracy=0.92، Omissions=2، MeanRtMs=412 بنسخة SA-hits-1. |
| **ماذا ينكسر لو حُذف أو دُمج** | تضيع النتائج متعددة المقاييس وقابلية المقارنة بين النسخ. |
| **المصدر** | §4.4، §10.3، §24.5 |

---

## recovery — Recovery Plan

### recovery.RecoveryCycle

<a id="recovery-recoverycycle"></a>

| | |
|---|---|
| **الغرض** | دورة تخطيط محددة (افتراضيًا 28 يومًا قابلة للضبط) داخل رحلة الشخص المستمرة. |
| **الميزة وسير العمل** | Recovery Plan (Overview/This Week/Adjust/History)، نهاية الدورة ومراجعتها، وضع الصيانة. |
| **لماذا جدول مستقل** | للدورة آلة حالة خاصة (§5.7) وأبناء (مراجعات خطة، إجراءات مجدولة، مراجعات أسبوعية). الفهرس المفلتر يضمن دورة حالية واحدة لكل شخص؛ جدول "الرحلة" السابق لم يحمل إلا هذا القيد فدُمج في IndividualProfile.JourneyStartedAtUtc. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `recovery.RecoveryCycle` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `PublicId` | uniqueidentifier | لا | `NEWSEQUENTIALID()` | UQ — المعرّف الخارجي في الـAPI والروابط |
| `PersonId` | bigint | لا |  | FK → iam.Person |
| `CycleNo` | int | لا |  |  |
| `Kind` | nvarchar(16) | لا | `N'Standard'` |  |
| `Status` | nvarchar(16) | لا | `N'Draft'` |  |
| `PolicyVersion` | nvarchar(64) | لا |  |  |
| `TimeZoneId` | nvarchar(80) | لا |  |  |
| `StartLocalDate` | date | نعم |  |  |
| `EndLocalDate` | date | نعم |  |  |
| `ActivatedAtUtc` | datetime2(3) | نعم |  |  |
| `EndedAtUtc` | datetime2(3) | نعم |  |  |
| `ReviewedAtUtc` | datetime2(3) | نعم |  |  |
| `NextStepCode` | nvarchar(24) | نعم |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_RecoveryCycle (Id)`
- FK: `(PersonId) → iam.Person(Id)`
- UNIQUE: `(PublicId)`
- UNIQUE: `(Id, PersonId)`
- UNIQUE: `(PersonId, CycleNo)`
- UNIQUE: `(PersonId) WHERE Status IN ('Draft','Preview','Active','ReviewDue','Paused')` (فهرس فريد مفلتر)
- CHECK `CK_RecoveryCycle_CycleNo`: `CycleNo > 0`
- CHECK `CK_RecoveryCycle_Kind`: `Kind IN ('Standard','Maintenance')`
- CHECK `CK_RecoveryCycle_Status`: `Status IN ('Draft','Preview','Active','ReviewDue','Paused','Ended','Reviewed','Cancelled')`
- CHECK `CK_RecoveryCycle_Dates`: `EndLocalDate IS NULL OR (StartLocalDate IS NOT NULL AND EndLocalDate >= StartLocalDate)`
- CHECK `CK_RecoveryCycle_Activated`: `Status IN ('Draft','Preview','Cancelled') OR ActivatedAtUtc IS NOT NULL`
- CHECK `CK_RecoveryCycle_NextStep`: `NextStepCode IS NULL OR NextStepCode IN ('NextCycle','Adjusted','Maintenance')`

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `PersonId`؛ وكل صف هناك يقابله صفر أو واحد ضمن (Status IN ('Draft','Preview','Active','ReviewDue','Paused'))، وكثير خارجه هنا.
- واردة: `recovery.PlanRevision` (CycleId)، `recovery.ScheduledAction` (CycleId, PersonId)، `recovery.WeeklyReview` (CycleId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | Draft → Preview → Active ↔ ReviewDue → Ended → Reviewed؛ Paused وCancelled حيث تسمح القواعد. NextStepCode عند المراجعة: دورة تالية، نهج معدل، أو صيانة. |
| **الخصوصية والملكية والتفويض** | خاص بالشخص. |
| **التاريخ والنسخ والاحتفاظ** | الدورات المنتهية تبقى في History؛ لا تُعاد ضبط الحديقة بانتهاء الدورة. |
| **مثال ملموس** | يفعّل المستخدم الخطة من Starting Point: الدورة 1 تصبح Active بتاريخ بداية محلي وتُنشأ PlanRevision 1 وإجراءات الأسبوع الأول فقط. |
| **ماذا ينكسر لو حُذف أو دُمج** | لا حدود للدورة، ولا مراجعة نهاية دورة، ولا تمييز بين الدورات في History وInsights. |
| **المصدر** | §5.1، §5.6، §5.7، D04؛ Client/src/pages/member/recovery-plan/* |

### recovery.PlanRevision

<a id="recovery-planrevision"></a>

| | |
|---|---|
| **الغرض** | نسخة من شروط الخطة المستقبلية: الهدف، اتجاه الأسابيع الأربعة، تفاصيل الأسبوع، الحمل، سبب التغيير. |
| **الميزة وسير العمل** | Plan Preview وActivate، تبويب Adjust (تغيير مستقبلي فقط)، قرار Weekly Review، History "Plan adjusted". |
| **لماذا جدول مستقل** | §5.2C و§5.5 يطلبان حفظ نسخة/مراجعة مع السبب والتواريخ، وتغيير المستقبل فقط دون محو ما سُجّل. محتوى الخطة لقطة ثابتة تُقرأ كوحدة، لذلك PlanJson مقبول؛ ما يُستعلم ويُربط (الإجراءات المجدولة) صفوف في ScheduledAction. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `recovery.PlanRevision` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `CycleId` | bigint | لا |  | FK → recovery.RecoveryCycle |
| `RevisionNo` | int | لا |  |  |
| `ChangeKind` | nvarchar(24) | لا |  |  |
| `GoalCode` | nvarchar(64) | لا |  |  |
| `PolicyVersion` | nvarchar(64) | لا |  |  |
| `EffectiveFromLocalDate` | date | لا |  |  |
| `Reason` | nvarchar(500) | لا |  |  |
| `PlanJson` | nvarchar(max) | لا |  |  |
| `Status` | nvarchar(16) | لا | `N'Draft'` |  |
| `AcceptedAtUtc` | datetime2(3) | نعم |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_PlanRevision (Id)`
- FK: `(CycleId) → recovery.RecoveryCycle(Id)`
- UNIQUE: `(Id, CycleId)`
- UNIQUE: `(CycleId, RevisionNo)`
- UNIQUE: `(CycleId) WHERE Status = 'Accepted'` (فهرس فريد مفلتر)
- UNIQUE: `(CycleId) WHERE Status = 'Draft'` (فهرس فريد مفلتر)
- CHECK `CK_PlanRevision_RevisionNo`: `RevisionNo > 0`
- CHECK `CK_PlanRevision_ChangeKind`: `ChangeKind IN ('Initial','Preference','Schedule','Load','Goal','WeeklyReview','Return')`
- CHECK `CK_PlanRevision_Status`: `Status IN ('Draft','Accepted','Superseded')`
- CHECK `CK_PlanRevision_Accepted`: `(Status = 'Draft' AND AcceptedAtUtc IS NULL) OR (Status IN ('Accepted','Superseded') AND AcceptedAtUtc IS NOT NULL)`
- CHECK `CK_PlanRevision_PlanJson`: `ISJSON(PlanJson) = 1`
- حارس: TR_PlanRevision_AcceptedImmutable: بعد Accepted لا يتغير إلا Status → Superseded.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `recovery.RecoveryCycle` عبر `CycleId`؛ وكل صف هناك يقابله صفر أو واحد ضمن (Status = 'Accepted')، وكثير خارجه هنا.
- واردة: `recovery.ScheduledAction` (PlanRevisionId, CycleId)، `recovery.WeeklyReview` (PlanRevisionId, CycleId | ResultingRevisionId, CycleId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | Draft (معاينة) → Accepted → Superseded عند قبول نسخة أحدث. نسخة مقبولة واحدة ومسودة واحدة لكل دورة. |
| **الخصوصية والملكية والتفويض** | خاص بالشخص. |
| **التاريخ والنسخ والاحتفاظ** | كل النسخ تبقى؛ الإجراءات المجدولة تشير إلى النسخة التي أنشأتها. |
| **مثال ملموس** | في Weekly Review يختار المستخدم "Lighter load"؛ تُنشأ PlanRevision 2 بـChangeKind=WeeklyReview وEffectiveFrom=بداية الأسبوع 2. |
| **ماذا ينكسر لو حُذف أو دُمج** | يصبح تعديل الخطة إعادة كتابة للتاريخ، وهو ما يمنعه §5.2C صراحة. |
| **المصدر** | §5.2، §5.3، §5.5، §5.7 |

### recovery.ScheduledAction

<a id="recovery-scheduledaction"></a>

| | |
|---|---|
| **الغرض** | التزام مجدول ليوم محدد: ممارسة، روتين غير متصل، مراجعة أسبوعية، أو جلسة حماية. |
| **الميزة وسير العمل** | This Week، Overview "Start Next Activity"، History heatmap، معدل إكمال الممارسات المجدولة في Insights. |
| **لماذا جدول مستقل** | هو مقام نسبة الالتزام (§10.3): "المستحق" يجب أن يكون صفًا قابلًا للعد مع حالته. إعادة الجدولة تنشئ صفًا جديدًا مرتبطًا ذاتيًا بدل الكتابة فوق الماضي. المفاتيح المركبة تمنع ربط إجراء شخص بمحاولة أو روتين شخص آخر. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `recovery.ScheduledAction` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `CycleId` | bigint | لا |  | FK → recovery.RecoveryCycle (مركب: CycleId, PersonId)؛ FK → recovery.PlanRevision (مركب: PlanRevisionId, CycleId) |
| `PersonId` | bigint | لا |  | FK → recovery.RecoveryCycle (مركب: CycleId, PersonId)؛ FK → activity.OfflineRoutine (مركب: RoutineId, PersonId)؛ FK → activity.PracticeAttempt (مركب: CompletedAttemptId, PersonId)؛ FK → recovery.ScheduledAction (مركب: RescheduledToActionId, PersonId) |
| `PlanRevisionId` | bigint | لا |  | FK → recovery.PlanRevision (مركب: PlanRevisionId, CycleId) |
| `ActionKind` | nvarchar(16) | لا |  |  |
| `PracticeVersionId` | bigint | نعم |  | FK → activity.PracticeVersion |
| `RoutineId` | bigint | نعم |  | FK → activity.OfflineRoutine (مركب: RoutineId, PersonId) |
| `LocalDate` | date | لا |  |  |
| `IsOptional` | bit | لا | `0` |  |
| `Status` | nvarchar(16) | لا | `N'Due'` |  |
| `CompletedAttemptId` | bigint | نعم |  | FK → activity.PracticeAttempt (مركب: CompletedAttemptId, PersonId) |
| `RescheduledToActionId` | bigint | نعم |  | FK → recovery.ScheduledAction (مركب: RescheduledToActionId, PersonId) |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_ScheduledAction (Id)`
- FK: `(CycleId, PersonId) → recovery.RecoveryCycle(Id, PersonId)`
- FK: `(PlanRevisionId, CycleId) → recovery.PlanRevision(Id, CycleId)`
- FK: `(PracticeVersionId) → activity.PracticeVersion(Id)`
- FK: `(RoutineId, PersonId) → activity.OfflineRoutine(Id, PersonId)`
- FK: `(CompletedAttemptId, PersonId) → activity.PracticeAttempt(Id, PersonId)`
- FK: `(RescheduledToActionId, PersonId) → recovery.ScheduledAction(Id, PersonId)`
- UNIQUE: `(Id, PersonId)`
- UNIQUE: `(CompletedAttemptId) WHERE CompletedAttemptId IS NOT NULL` (فهرس فريد مفلتر)
- INDEX: `(PersonId, LocalDate)`
- CHECK `CK_ScheduledAction_Kind`: `ActionKind IN ('Practice','Routine','WeeklyReview','Protection')`
- CHECK `CK_ScheduledAction_Status`: `Status IN ('Due','Completed','Missed','Rescheduled','Cancelled','Excluded')`
- CHECK `CK_ScheduledAction_Practice`: `ActionKind <> 'Practice' OR PracticeVersionId IS NOT NULL`
- CHECK `CK_ScheduledAction_Routine`: `ActionKind <> 'Routine' OR RoutineId IS NOT NULL`
- CHECK `CK_ScheduledAction_Rescheduled`: `(Status = 'Rescheduled' AND RescheduledToActionId IS NOT NULL) OR (Status <> 'Rescheduled' AND RescheduledToActionId IS NULL)`
- CHECK `CK_ScheduledAction_Completed`: `Status <> 'Completed' OR ActionKind <> 'Practice' OR CompletedAttemptId IS NOT NULL`
- حارس: TR_ScheduledAction_CompletionLink: المحاولة المرتبطة يجب أن تكون Completed وصالحة ولنسخة الممارسة نفسها.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `recovery.RecoveryCycle` عبر `CycleId, PersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `recovery.PlanRevision` عبر `PlanRevisionId, CycleId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `activity.PracticeVersion` عبر `PracticeVersionId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `activity.OfflineRoutine` عبر `RoutineId, PersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `activity.PracticeAttempt` عبر `CompletedAttemptId, PersonId`؛ وكل صف هناك يقابله صفر أو واحد ضمن (CompletedAttemptId IS NOT NULL)، وكثير خارجه هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `recovery.ScheduledAction` عبر `RescheduledToActionId, PersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `recovery.ScheduledAction` (RescheduledToActionId, PersonId)، `activity.PracticeAttempt` (ScheduledActionId, PersonId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | Due → Completed \| Missed \| Rescheduled (→ صف جديد) \| Cancelled \| Excluded (عذر مخطط، يوم راحة). |
| **الخصوصية والملكية والتفويض** | خاص بالشخص. |
| **التاريخ والنسخ والاحتفاظ** | لا يُعدّل الماضي؛ "Missed" لا يُحوَّل إلى Completed بتعديل الجدول (§5.2C). |
| **مثال ملموس** | المستخدم يؤجل قراءة الغد: الصف الأصلي Rescheduled ويشير إلى صف جديد بتاريخ بعد الغد. |
| **ماذا ينكسر لو حُذف أو دُمج** | لا يمكن حساب الالتزام بمقام صادق، ولا التمييز بين "لا شيء مجدول" و"فائت". |
| **المصدر** | §5.2B، §5.2D، §5.4، §5.6، §10.3 |

### recovery.WeeklyReview

<a id="recovery-weeklyreview"></a>

| | |
|---|---|
| **الغرض** | قرار المراجعة الأسبوعية: إجابات قصيرة، وقت الهاتف المُبلَّغ ذاتيًا اختياريًا، والقرار الناتج. |
| **الميزة وسير العمل** | صفحة Weekly Review، بانر Review Due، تاريخ المراجعات، ملخص "Reported phone time" الموسوم ذاتيًا في Insights. |
| **لماذا جدول مستقل** | قرار مستقل مؤرخ لكل أسبوع يربط النسخة المراجَعة بالنسخة الناتجة؛ §5.5 يطلب حفظه والتمييز بين الموثّق والمُبلَّغ. وقت الهاتف المُبلَّغ في الواجهة الحالية يُدخل في المراجعة، فهو عمود موسوم ذاتيًا هنا لا يختلط بقياس الإضافة. |
| **نوع الصف** | إلحاقي (a) |
| **الأصل في المخطط الحالي** | `recovery.WeeklyReview` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `CycleId` | bigint | لا |  | FK → recovery.RecoveryCycle؛ FK → recovery.PlanRevision (مركب: PlanRevisionId, CycleId)؛ FK → recovery.PlanRevision (مركب: ResultingRevisionId, CycleId) |
| `WeekNo` | tinyint | لا |  |  |
| `PlanRevisionId` | bigint | لا |  | FK → recovery.PlanRevision (مركب: PlanRevisionId, CycleId) |
| `ResultingRevisionId` | bigint | نعم |  | FK → recovery.PlanRevision (مركب: ResultingRevisionId, CycleId) |
| `ManageabilityCode` | nvarchar(40) | نعم |  |  |
| `FitCode` | nvarchar(40) | نعم |  |  |
| `ReportedPhoneMinutesPerDay` | smallint | نعم |  |  |
| `DecisionCode` | nvarchar(24) | لا |  |  |
| `ReviewedAtUtc` | datetime2(3) | لا |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |

**المفاتيح والقيود والفهارس**

- PK: `PK_WeeklyReview (Id)`
- FK: `(CycleId) → recovery.RecoveryCycle(Id)`
- FK: `(PlanRevisionId, CycleId) → recovery.PlanRevision(Id, CycleId)`
- FK: `(ResultingRevisionId, CycleId) → recovery.PlanRevision(Id, CycleId)`
- UNIQUE: `(CycleId, WeekNo)`
- CHECK `CK_WeeklyReview_WeekNo`: `WeekNo > 0`
- CHECK `CK_WeeklyReview_Decision`: `DecisionCode IN ('AcceptNext','KeepPace','Adjust','AutoContinued')`
- CHECK `CK_WeeklyReview_Phone`: `ReportedPhoneMinutesPerDay IS NULL OR ReportedPhoneMinutesPerDay BETWEEN 0 AND 1440`
- صلاحيات: INSERT/SELECT فقط لدور التشغيل؛ `TR_WeeklyReview_Immutable` يمنع UPDATE/DELETE.
- حارس: TR_WeeklyReview_Immutable: إلحاقي.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `recovery.RecoveryCycle` عبر `CycleId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `recovery.PlanRevision` عبر `PlanRevisionId, CycleId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `recovery.PlanRevision` عبر `ResultingRevisionId, CycleId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: لا شيء.

| | |
|---|---|
| **دورة الحياة والانتقالات** | إلحاقي؛ المراجعة الفائتة تُسجَّل AutoContinued عند الاستمرار المحافظ. |
| **الخصوصية والملكية والتفويض** | خاص بالشخص. |
| **التاريخ والنسخ والاحتفاظ** | كل المراجعات تبقى. |
| **مثال ملموس** | الأسبوع 1: Manageability=TooMuch، ReportedPhoneMinutesPerDay=190، Decision=Adjust، ResultingRevisionId=نسخة الحمل الأخف. |
| **ماذا ينكسر لو حُذف أو دُمج** | تضيع نقطة القرار الأسبوعية ومصدر التكيف (§5.3). |
| **المصدر** | §5.5، §5.6، §10.2؛ Client/src/pages/member/weekly-review/*؛ demo-account.json (weeklyReviews، selfReports) |

---

## activity — Activities والروتين

### activity.PracticeDefinition

<a id="activity-practicedefinition"></a>

| | |
|---|---|
| **الغرض** | هوية ممارسة معتمدة في الكتالوج ونوعها من الأنواع الأربعة. |
| **الميزة وسير العمل** | Activities → Browse Practices، كتالوج Admin، اختيار نشاط في مهمة المدرب وبناء البرنامج. |
| **لماذا جدول مستقل** | الكتالوج مفتوح (ممارسات كثيرة لكل نوع) ويُنشر من Admin، وله دورة حياة (إيقاف، تقاعد) مستقلة عن نسخه. النوع هنا يحدد أي فئة تكافأ في الحديقة. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `activity.PracticeDefinition` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `Code` | nvarchar(64) | لا |  |  |
| `PracticeType` | nvarchar(32) | لا |  |  |
| `Title` | nvarchar(160) | لا |  |  |
| `Status` | nvarchar(16) | لا | `N'Draft'` |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_PracticeDefinition (Id)`
- UNIQUE: `(Code)`
- CHECK `CK_PracticeDefinition_Type`: `PracticeType IN ('DepthPractice','ListeningRecall','PracticalMicroChallenge','ProtectedWork')`
- CHECK `CK_PracticeDefinition_Status`: `Status IN ('Draft','Published','Deprecated','Retired')`

**العلاقات**

- صادرة: لا شيء.
- واردة: `activity.PracticeVersion` (DefinitionId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | Draft → Published → Deprecated → Retired. |
| **الخصوصية والملكية والتفويض** | الكتالوج عام للقراءة؛ الإنشاء والإيقاف لـAdmin بقدرة CatalogPublisher فقط. |
| **التاريخ والنسخ والاحتفاظ** | لا تُحذف؛ النسخ والمحاولات تشير إليها. |
| **مثال ملموس** | Admin ينشئ "short-essay-reading" بنوع DepthPractice. |
| **ماذا ينكسر لو حُذف أو دُمج** | يعود الكتالوج إلى الكود، وتفقد المهام المسندة مرجعًا ثابتًا. |
| **المصدر** | §7.2، §7.8، §19 Activity/catalog؛ Client/src/workspaces/activity-contract.js، data/practices.json |

### activity.PracticeVersion

<a id="activity-practiceversion"></a>

| | |
|---|---|
| **الغرض** | نسخة منشورة من الممارسة: المحتوى، المستوى، الزمن التقديري، طبقة الدليل، قواعد التحقق والتكرار. |
| **الميزة وسير العمل** | مشغّل الممارسة، الإجراءات المجدولة، مهام المدرب، التدرج حسب المستوى. |
| **لماذا جدول مستقل** | §7.8 يطلب أن تكون كل ممارسة مُصدَّرة بنسخة، وأن تُثبَّت المحاولة على نسخة المحتوى والمستوى. قواعد التكرار والتحقق جزء ثابت من النسخة ولا تُستعلم عبر الأشخاص، لذلك JSON. |
| **نوع الصف** | إلحاقي (a) |
| **الأصل في المخطط الحالي** | `activity.PracticeVersion` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `DefinitionId` | bigint | لا |  | FK → activity.PracticeDefinition |
| `VersionNo` | int | لا |  |  |
| `ContentRef` | nvarchar(300) | لا |  |  |
| `ContentJson` | nvarchar(max) | نعم |  |  |
| `DifficultyTier` | smallint | لا |  |  |
| `EstimatedMinutes` | smallint | نعم |  |  |
| `EvidenceTier` | nvarchar(24) | لا |  |  |
| `ValidationVersion` | nvarchar(64) | لا |  |  |
| `RulesJson` | nvarchar(max) | نعم |  |  |
| `PublishedAtUtc` | datetime2(3) | لا |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |

**المفاتيح والقيود والفهارس**

- PK: `PK_PracticeVersion (Id)`
- FK: `(DefinitionId) → activity.PracticeDefinition(Id)`
- UNIQUE: `(DefinitionId, VersionNo)`
- CHECK `CK_PracticeVersion_VersionNo`: `VersionNo > 0`
- CHECK `CK_PracticeVersion_Tier`: `DifficultyTier > 0 AND (EstimatedMinutes IS NULL OR EstimatedMinutes > 0)`
- CHECK `CK_PracticeVersion_Evidence`: `EvidenceTier IN ('SystemScored','BrowserObserved','SelfReported','Reviewed')`
- CHECK `CK_PracticeVersion_RulesJson`: `RulesJson IS NULL OR ISJSON(RulesJson) = 1`
- صلاحيات: INSERT/SELECT فقط لدور التشغيل؛ `TR_PracticeVersion_Immutable` يمنع UPDATE/DELETE.
- حارس: TR_PracticeVersion_Immutable: إلحاقي.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `activity.PracticeDefinition` عبر `DefinitionId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `recovery.ScheduledAction` (PracticeVersionId)، `activity.PracticeAttempt` (PracticeVersionId)، `task.AssignmentRevision` (PracticeVersionId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | إلحاقي: تُنشأ عند النشر ولا تتغير؛ تعديل المحتوى أو المستوى نسخة جديدة بـVersionNo أعلى. |
| **الخصوصية والملكية والتفويض** | المحتوى عام للمستخدمين المؤهلين؛ قواعد التحقق الداخلية في RulesJson لا تُرسل للعميل إذا كانت تكشف الإجابات. |
| **التاريخ والنسخ والاحتفاظ** | كل النسخ تبقى. |
| **مثال ملموس** | Depth Practice v3 بمستوى 2 و5 دقائق وEvidenceTier=SystemScored. |
| **ماذا ينكسر لو حُذف أو دُمج** | تتغير شروط المحاولات التاريخية بأثر رجعي. |
| **المصدر** | §7.3، §7.8 |

### activity.PracticeAttempt

<a id="activity-practiceattempt"></a>

| | |
|---|---|
| **الغرض** | تنفيذ واحد لممارسة معتمدة بنتيجته وصلاحيته، سواء من الخطة أو عند الطلب أو لمهمة مدرب. |
| **الميزة وسير العمل** | Activities (For You، Browse، History)، إكمال الإجراء المجدول، نمو فئة الممارسة في الحديقة، Insights → Meaningful Practice. |
| **لماذا جدول مستقل** | لكل محاولة حالة ونتيجة ودليل خاص (§7.8)، ولا يُشتق الإكمال من boolean من العميل. EvidenceEventId يربط المحاولة بحدث الدليل الوحيد الذي تستهلكه المكافأة. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `activity.PracticeAttempt` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `PublicId` | uniqueidentifier | لا | `NEWSEQUENTIALID()` | UQ — المعرّف الخارجي في الـAPI والروابط |
| `PersonId` | bigint | لا |  | FK → iam.Person؛ FK → recovery.ScheduledAction (مركب: ScheduledActionId, PersonId)؛ FK → evidence.EvidenceEvent (مركب: EvidenceEventId, PersonId) |
| `PracticeVersionId` | bigint | لا |  | FK → activity.PracticeVersion |
| `Source` | nvarchar(16) | لا |  |  |
| `ScheduledActionId` | bigint | نعم |  | FK → recovery.ScheduledAction (مركب: ScheduledActionId, PersonId) |
| `Status` | nvarchar(16) | لا | `N'Started'` |  |
| `Valid` | bit | نعم |  |  |
| `OutcomeCode` | nvarchar(40) | نعم |  |  |
| `ScoreValue` | decimal(9,4) | نعم |  |  |
| `StartedAtUtc` | datetime2(3) | لا |  |  |
| `EndedAtUtc` | datetime2(3) | نعم |  |  |
| `EvidenceEventId` | bigint | نعم |  | FK → evidence.EvidenceEvent (مركب: EvidenceEventId, PersonId) |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_PracticeAttempt (Id)`
- FK: `(PersonId) → iam.Person(Id)`
- FK: `(PracticeVersionId) → activity.PracticeVersion(Id)`
- FK: `(ScheduledActionId, PersonId) → recovery.ScheduledAction(Id, PersonId)`
- FK: `(EvidenceEventId, PersonId) → evidence.EvidenceEvent(Id, SubjectPersonId)`
- UNIQUE: `(PublicId)`
- UNIQUE: `(Id, PersonId)`
- UNIQUE: `(EvidenceEventId) WHERE EvidenceEventId IS NOT NULL` (فهرس فريد مفلتر)
- INDEX: `(PersonId, StartedAtUtc)`
- CHECK `CK_PracticeAttempt_Source`: `Source IN ('Plan','OnDemand','Assignment')`
- CHECK `CK_PracticeAttempt_Status`: `Status IN ('Started','Paused','Submitted','Completed','Invalid','Cancelled')`
- CHECK `CK_PracticeAttempt_Validity`: `(Status IN ('Started','Paused','Submitted','Cancelled') AND Valid IS NULL) OR (Status = 'Completed' AND Valid = 1 AND EndedAtUtc IS NOT NULL) OR (Status = 'Invalid' AND Valid = 0 AND EndedAtUtc IS NOT NULL)`
- CHECK `CK_PracticeAttempt_Scheduled`: `Source <> 'Plan' OR ScheduledActionId IS NOT NULL`
- حارس: TR_PracticeAttempt_Schedule: الإجراء المجدول المرتبط من نوع Practice وللنسخة نفسها.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `PersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `activity.PracticeVersion` عبر `PracticeVersionId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `recovery.ScheduledAction` عبر `ScheduledActionId, PersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `evidence.EvidenceEvent` عبر `EvidenceEventId, PersonId`؛ وكل صف هناك يقابله صفر أو واحد ضمن (EvidenceEventId IS NOT NULL)، وكثير خارجه هنا.
- واردة: `recovery.ScheduledAction` (CompletedAttemptId, PersonId)، `activity.PracticeProgressionDecision` (BasisAttemptId, PersonId)، `task.SubmissionAttempt` (PracticeAttemptId, PersonId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | Started ↔ Paused → Submitted → Completed \| Invalid؛ Cancelled. |
| **الخصوصية والملكية والتفويض** | خاص بالشخص؛ مهمة المدرب ترى نتيجة الإرسال عبر SubmissionAttempt فقط. |
| **التاريخ والنسخ والاحتفاظ** | لا تُحذف؛ التصحيح يتم بإبطال حدث الدليل لا بتعديل المحاولة. |
| **مثال ملموس** | Listening & Recall مستوى 2 تكتمل بـ4/5 إجابات؛ Status=Completed، Valid=1، ويُنشأ EvidenceEvent. |
| **ماذا ينكسر لو حُذف أو دُمج** | لا مصدر موثوق لنمو الحديقة ولا تقدم المستوى (D08، D11). |
| **المصدر** | §7.2، §7.3، §7.8، §9.2، D08، D11؛ Client/src/pages/member/training/* |

### activity.PracticeProgressionDecision

<a id="activity-practiceprogressiondecision"></a>

| | |
|---|---|
| **الغرض** | قرار المستخدم عند عرض "Ready to try a longer one?": التقدم، البقاء، أو النزول، لكل نوع ممارسة على حدة. |
| **الميزة وسير العمل** | تدرج الصعوبة المستقل لكل نوع، تاريخ المستويات في Activities وInsights. |
| **لماذا جدول مستقل** | المستوى لكل نوع مستقل (§7.3) والنزول الآمن يجب ألا يمحو التاريخ؛ المستوى الحالي يُشتق من آخر قرار. هو بيانات عمل يقرؤها المحرك والواجهة، لا مجرد تدقيق. |
| **نوع الصف** | إلحاقي (a) |
| **الأصل في المخطط الحالي** | `activity.PracticeProgressionDecision` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `PersonId` | bigint | لا |  | FK → iam.Person؛ FK → activity.PracticeAttempt (مركب: BasisAttemptId, PersonId) |
| `PracticeType` | nvarchar(32) | لا |  |  |
| `FromTier` | smallint | لا |  |  |
| `ToTier` | smallint | لا |  |  |
| `PolicyVersion` | nvarchar(64) | لا |  |  |
| `DecisionCode` | nvarchar(16) | لا |  |  |
| `BasisAttemptId` | bigint | نعم |  | FK → activity.PracticeAttempt (مركب: BasisAttemptId, PersonId) |
| `DecidedAtUtc` | datetime2(3) | لا |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |

**المفاتيح والقيود والفهارس**

- PK: `PK_PracticeProgressionDecision (Id)`
- FK: `(PersonId) → iam.Person(Id)`
- FK: `(BasisAttemptId, PersonId) → activity.PracticeAttempt(Id, PersonId)`
- INDEX: `(PersonId, PracticeType, DecidedAtUtc)`
- CHECK `CK_PracticeProgressionDecision_Type`: `PracticeType IN ('DepthPractice','ListeningRecall','PracticalMicroChallenge','ProtectedWork')`
- CHECK `CK_PracticeProgressionDecision_Tiers`: `FromTier > 0 AND ToTier > 0`
- CHECK `CK_PracticeProgressionDecision_Decision`: `DecisionCode IN ('Advanced','Stayed','SteppedDown')`
- CHECK `CK_PracticeProgressionDecision_Direction`: `(DecisionCode = 'Advanced' AND ToTier > FromTier) OR (DecisionCode = 'Stayed' AND ToTier = FromTier) OR (DecisionCode = 'SteppedDown' AND ToTier < FromTier)`
- صلاحيات: INSERT/SELECT فقط لدور التشغيل؛ `TR_PracticeProgressionDecision_Immutable` يمنع UPDATE/DELETE.
- حارس: TR_PracticeProgressionDecision_Immutable: إلحاقي.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `PersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `activity.PracticeAttempt` عبر `BasisAttemptId, PersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: لا شيء.

| | |
|---|---|
| **دورة الحياة والانتقالات** | إلحاقي: صف لكل قرار عند عرض الترقية أو النزول؛ المستوى الحالي = ToTier لآخر قرار لهذا النوع. |
| **الخصوصية والملكية والتفويض** | خاص بالشخص. |
| **التاريخ والنسخ والاحتفاظ** | الجدول هو التاريخ. |
| **مثال ملموس** | بعد ثلاث محاولات Depth صالحة يختار "Try Next Level": FromTier=1، ToTier=2، Advanced. |
| **ماذا ينكسر لو حُذف أو دُمج** | يصبح المستوى رقمًا قابلًا للكتابة بلا سبب ولا تاريخ، ويُفقد "Stay Here". |
| **المصدر** | §7.3، §10.2؛ demo-account.json (levelEvents) |

### activity.OfflineRoutine

<a id="activity-offlineroutine"></a>

| | |
|---|---|
| **الغرض** | روتين شخصي صغير بعيد عن الشاشة يختاره المستخدم (مشي، رسم، قراءة كتاب ورقي…). |
| **الميزة وسير العمل** | My Offline Routine داخل Activities، الالتزام الأول قبل التفعيل، زهرة الحديقة. |
| **لماذا جدول مستقل** | له دورة حياة (إيقاف، أرشفة) وأبناء (تسجيلات يومية). قاعدة الأيام والتكرار إعداد ذاتي صغير لا يُستعلم عبر الأشخاص، لذلك JSON. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `activity.OfflineRoutine` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `PersonId` | bigint | لا |  | FK → iam.Person |
| `Title` | nvarchar(160) | لا |  |  |
| `Hint` | nvarchar(300) | نعم |  |  |
| `ScheduleRuleJson` | nvarchar(400) | نعم |  |  |
| `IsInitialCommitment` | bit | لا | `0` |  |
| `Status` | nvarchar(16) | لا | `N'Active'` |  |
| `ArchivedAtUtc` | datetime2(3) | نعم |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_OfflineRoutine (Id)`
- FK: `(PersonId) → iam.Person(Id)`
- UNIQUE: `(Id, PersonId)`
- CHECK `CK_OfflineRoutine_Status`: `Status IN ('Active','Paused','Archived')`
- CHECK `CK_OfflineRoutine_Archived`: `(Status = 'Archived' AND ArchivedAtUtc IS NOT NULL) OR (Status <> 'Archived' AND ArchivedAtUtc IS NULL)`
- CHECK `CK_OfflineRoutine_Rule`: `ScheduleRuleJson IS NULL OR ISJSON(ScheduleRuleJson) = 1`

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `PersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `recovery.ScheduledAction` (RoutineId, PersonId)، `activity.RoutineCheckIn` (RoutineId, PersonId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | Active ↔ Paused → Archived. |
| **الخصوصية والملكية والتفويض** | خاص بالشخص. |
| **التاريخ والنسخ والاحتفاظ** | العنوان قابل للتعديل؛ التغيير يظهر كتعديل خطة عبر PlanRevision عندما يمس الجدول. |
| **مثال ملموس** | عند التفعيل: "Walk 5 minutes", IsInitialCommitment=1، أيام الأحد-الخميس. |
| **ماذا ينكسر لو حُذف أو دُمج** | يضيع متطلب الالتزام الأول (§4.3، §7.4) ومصدر الزهرة. |
| **المصدر** | §4.3، §7.4، §9.1؛ Client/src/pages/member/training/offline-routine.js |

### activity.RoutineCheckIn

<a id="activity-routinecheckin"></a>

| | |
|---|---|
| **الغرض** | تسجيل ذاتي ليوم واحد لروتين: تم أو تُخطّي. |
| **الميزة وسير العمل** | Done/Skipped في My Offline Routine، Insights → Offline & Experiences، الزهرة المحدودة. |
| **لماذا جدول مستقل** | تسجيل واحد لكل روتين ويوم، يُعد ويُقيَّد بسقف مكافأة؛ الفهرس الفريد يمنع التسجيل المزدوج في السباق. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `activity.RoutineCheckIn` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `RoutineId` | bigint | لا |  | FK → activity.OfflineRoutine (مركب: RoutineId, PersonId) |
| `PersonId` | bigint | لا |  | FK → activity.OfflineRoutine (مركب: RoutineId, PersonId)؛ FK → evidence.EvidenceEvent (مركب: EvidenceEventId, PersonId) |
| `LocalDate` | date | لا |  |  |
| `State` | nvarchar(16) | لا |  |  |
| `RecordedAtUtc` | datetime2(3) | لا |  |  |
| `EvidenceEventId` | bigint | نعم |  | FK → evidence.EvidenceEvent (مركب: EvidenceEventId, PersonId) |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_RoutineCheckIn (Id)`
- FK: `(RoutineId, PersonId) → activity.OfflineRoutine(Id, PersonId)`
- FK: `(EvidenceEventId, PersonId) → evidence.EvidenceEvent(Id, SubjectPersonId)`
- UNIQUE: `(RoutineId, LocalDate)`
- UNIQUE: `(EvidenceEventId) WHERE EvidenceEventId IS NOT NULL` (فهرس فريد مفلتر)
- CHECK `CK_RoutineCheckIn_State`: `State IN ('Done','Skipped')`

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `activity.OfflineRoutine` عبر `RoutineId, PersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `evidence.EvidenceEvent` عبر `EvidenceEventId, PersonId`؛ وكل صف هناك يقابله صفر أو واحد ضمن (EvidenceEventId IS NOT NULL)، وكثير خارجه هنا.
- واردة: لا شيء.

| | |
|---|---|
| **دورة الحياة والانتقالات** | يمكن تبديل Done↔Skipped لليوم نفسه قبل استهلاك الدليل؛ بعده التصحيح يمر عبر إبطال الدليل. |
| **الخصوصية والملكية والتفويض** | خاص بالشخص؛ موسوم Self-reported دائمًا. |
| **التاريخ والنسخ والاحتفاظ** | الصف يبقى؛ إن أُبطل دليله تبقى قيمته الذاتية ويُعكس أثر الزهرة فقط. |
| **مثال ملموس** | الثلاثاء: Done → EvidenceEvent(Provenance=SelfReported) وقد تمنح سياسة الحديقة زهرة إذا اكتمل العدد. |
| **ماذا ينكسر لو حُذف أو دُمج** | لا مصدر للزهرة ولا لعدّ أيام الروتين. |
| **المصدر** | §7.4، §9.2، §10.2 |

---

## shield — Digital Shield

### shield.ExtensionInstallation

<a id="shield-extensioninstallation"></a>

| | |
|---|---|
| **الغرض** | تثبيت مقترن لإضافة Chrome يخص شخصًا، مع مفتاح مزامنة مصادَق. |
| **الميزة وسير العمل** | حالات Shield: Not Installed، Connected، Disconnected، Sync Pending؛ الاقتران الصريح. |
| **لماذا جدول مستقل** | شخص واحد قد يقرن أكثر من متصفح، ولكل اقتران سحب ومزامنة وتسلسل دفعات مستقل (§6.4 authenticate sync). |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `shield.ExtensionInstallation` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `PersonId` | bigint | لا |  | FK → iam.Person |
| `InstallationPublicId` | uniqueidentifier | لا |  |  |
| `BrowserCode` | nvarchar(40) | لا |  |  |
| `ExtensionVersion` | nvarchar(40) | لا |  |  |
| `SyncKeyHash` | varbinary(64) | لا |  |  |
| `Status` | nvarchar(16) | لا | `N'Connected'` |  |
| `PairedAtUtc` | datetime2(3) | لا |  |  |
| `LastSeenAtUtc` | datetime2(3) | نعم |  |  |
| `RevokedAtUtc` | datetime2(3) | نعم |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_ExtensionInstallation (Id)`
- FK: `(PersonId) → iam.Person(Id)`
- UNIQUE: `(Id, PersonId)`
- UNIQUE: `(InstallationPublicId)`
- CHECK `CK_ExtensionInstallation_Status`: `Status IN ('Connected','Disconnected','Revoked')`
- CHECK `CK_ExtensionInstallation_Revoked`: `(Status = 'Revoked' AND RevokedAtUtc IS NOT NULL) OR (Status <> 'Revoked' AND RevokedAtUtc IS NULL)`

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `PersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `shield.ProtectionSession` (InstallationId, PersonId)، `shield.BrowserUsagePeriod` (InstallationId, PersonId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | Connected ↔ Disconnected → Revoked. |
| **الخصوصية والملكية والتفويض** | خاص بالشخص؛ SyncKeyHash لا يُكشف. |
| **التاريخ والنسخ والاحتفاظ** | التثبيتات المسحوبة تبقى لأن الفترات المستقبلة تشير إليها. |
| **مثال ملموس** | المستخدم يقرن الإضافة من shield.html؛ يُنشأ تثبيت Connected. |
| **ماذا ينكسر لو حُذف أو دُمج** | لا يمكن مصادقة بيانات الإضافة ولا رفض دفعات جهاز مسحوب. |
| **المصدر** | §6.4، §24.6؛ Client/extensions/digital-shield/* |

### shield.ShieldConfiguration

<a id="shield-shieldconfiguration"></a>

| | |
|---|---|
| **الغرض** | نسخة إعداد Shared Website Usage Reminder: الحد المشترك وتفعيله ونسخة الموافقة. |
| **الميزة وسير العمل** | Shield → Usage Reminder، مقام "Tracked Browser Usage" في Insights. |
| **لماذا جدول مستقل** | تغيير مجموعة المواقع أو الحد يغيّر مقام المقارنة (§10.5)، فيجب تثبيت كل فترة استخدام على نسخة الإعداد التي جُمعت بموجبها. |
| **نوع الصف** | إلحاقي (a) |
| **الأصل في المخطط الحالي** | `shield.ShieldConfiguration` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `PersonId` | bigint | لا |  | FK → iam.Person |
| `VersionNo` | int | لا |  |  |
| `ReminderEnabled` | bit | لا |  |  |
| `ReminderThresholdMinutes` | smallint | نعم |  |  |
| `ConsentVersion` | nvarchar(40) | لا |  |  |
| `EffectiveAtUtc` | datetime2(3) | لا |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |

**المفاتيح والقيود والفهارس**

- PK: `PK_ShieldConfiguration (Id)`
- FK: `(PersonId) → iam.Person(Id)`
- UNIQUE: `(Id, PersonId)`
- UNIQUE: `(PersonId, VersionNo)`
- CHECK `CK_ShieldConfiguration_VersionNo`: `VersionNo > 0`
- CHECK `CK_ShieldConfiguration_Threshold`: `ReminderThresholdMinutes IS NULL OR ReminderThresholdMinutes > 0`
- CHECK `CK_ShieldConfiguration_Enabled`: `ReminderEnabled = 0 OR ReminderThresholdMinutes IS NOT NULL`
- صلاحيات: INSERT/SELECT فقط لدور التشغيل؛ `TR_ShieldConfiguration_Immutable` يمنع UPDATE/DELETE.
- حارس: TR_ShieldConfiguration_Immutable: إلحاقي؛ التعديل نسخة جديدة.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `PersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `shield.ShieldSelectedDomain` (ConfigurationId)، `shield.BrowserUsagePeriod` (ConfigurationId, PersonId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | إلحاقي: كل تغيير للحد أو للمواقع نسخة VersionNo جديدة؛ النسخة الفعالة هي الأحدث EffectiveAtUtc. |
| **الخصوصية والملكية والتفويض** | خاص بالشخص. |
| **التاريخ والنسخ والاحتفاظ** | كل النسخ تبقى. |
| **مثال ملموس** | المستخدم يرفع الحد من 60 إلى 90 دقيقة: VersionNo=3. |
| **ماذا ينكسر لو حُذف أو دُمج** | تُقارن فترات مجموعات مواقع مختلفة كأنها متماثلة. |
| **المصدر** | §6.2، §10.3، §10.5 |

### shield.ShieldSelectedDomain

<a id="shield-shieldselecteddomain"></a>

| | |
|---|---|
| **الغرض** | موقع مدعوم واحد اختاره الشخص ضمن مجموعة التذكير في نسخة إعداد. |
| **الميزة وسير العمل** | اختيار مواقع التذكير، رسم "By website" في Insights. |
| **لماذا جدول مستقل** | هو هدف المفتاح المركب من BrowserUsageDomain: قاعدة البيانات نفسها ترفض تخزين وقت لموقع لم يختره الشخص. هذا ضمان خصوصية لا يمنحه JSON. |
| **نوع الصف** | إلحاقي (a) |
| **الأصل في المخطط الحالي** | `shield.ShieldSelectedDomain` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `ConfigurationId` | bigint | لا |  | FK → shield.ShieldConfiguration |
| `DomainCode` | nvarchar(120) | لا |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |

**المفاتيح والقيود والفهارس**

- PK: `PK_ShieldSelectedDomain (Id)`
- FK: `(ConfigurationId) → shield.ShieldConfiguration(Id)`
- UNIQUE: `(ConfigurationId, DomainCode)`
- صلاحيات: INSERT/SELECT فقط لدور التشغيل؛ `TR_ShieldSelectedDomain_Immutable` يمنع UPDATE/DELETE.
- حارس: TR_ShieldSelectedDomain_Sealed: لا إضافة أو حذف بعد أن تشير فترة استخدام إلى الإعداد.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `shield.ShieldConfiguration` عبر `ConfigurationId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `shield.BrowserUsageDomain` (ConfigurationId, DomainCode)

| | |
|---|---|
| **دورة الحياة والانتقالات** | إلحاقي ومختوم بعد الاستخدام. |
| **الخصوصية والملكية والتفويض** | خاص بالشخص. |
| **التاريخ والنسخ والاحتفاظ** | يتبع النسخة. |
| **مثال ملموس** | النسخة 3: instagram.com، tiktok.com، youtube.com. |
| **ماذا ينكسر لو حُذف أو دُمج** | يمكن قبول بيانات استخدام لمواقع لم يوافق عليها الشخص. |
| **المصدر** | §6.2، §6.4 (avoid collecting full browsing histories) |

### shield.ProtectionSession

<a id="shield-protectionsession"></a>

| | |
|---|---|
| **الغرض** | جلسة Manual Website Protection واحدة: المواقع المحجوبة والمدة والحالة كما أبلغت الإضافة. |
| **الميزة وسير العمل** | Shield → Start Protection، العد التنازلي، Protection Active/Failed/Expired/Disconnected، دعم Protected Work. |
| **لماذا جدول مستقل** | لكل جلسة دورة حياة وفشل محتمل وارتباط بتثبيت محدد. اختيار مواقع الحماية مستقل عن مواقع التذكير في الواجهة الحالية، لذلك قائمة الجلسة الصغيرة الثابتة تُحفظ JSON داخلها بدل ربطها خطأً بإعداد التذكير كما في المخطط السابق. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `shield.ProtectionSession` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `PublicId` | uniqueidentifier | لا | `NEWSEQUENTIALID()` | UQ — المعرّف الخارجي في الـAPI والروابط |
| `PersonId` | bigint | لا |  | FK → shield.ExtensionInstallation (مركب: InstallationId, PersonId) |
| `InstallationId` | bigint | لا |  | FK → shield.ExtensionInstallation (مركب: InstallationId, PersonId) |
| `DomainCodesJson` | nvarchar(1000) | لا |  |  |
| `LockMode` | nvarchar(16) | لا | `N'Standard'` |  |
| `StartedAtUtc` | datetime2(3) | لا |  |  |
| `EndsAtUtc` | datetime2(3) | لا |  |  |
| `Status` | nvarchar(16) | لا | `N'Requested'` |  |
| `FailureCode` | nvarchar(40) | نعم |  |  |
| `EndedAtUtc` | datetime2(3) | نعم |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_ProtectionSession (Id)`
- FK: `(InstallationId, PersonId) → shield.ExtensionInstallation(Id, PersonId)`
- UNIQUE: `(PublicId)`
- UNIQUE: `(InstallationId) WHERE Status IN ('Requested','Active')` (فهرس فريد مفلتر)
- CHECK `CK_ProtectionSession_Times`: `EndsAtUtc > StartedAtUtc`
- CHECK `CK_ProtectionSession_Status`: `Status IN ('Requested','Active','Expired','Failed','Disconnected','Cancelled')`
- CHECK `CK_ProtectionSession_LockMode`: `LockMode IN ('Standard','Locked')`
- CHECK `CK_ProtectionSession_Domains`: `ISJSON(DomainCodesJson) = 1`

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `shield.ExtensionInstallation` عبر `InstallationId, PersonId`؛ وكل صف هناك يقابله صفر أو واحد ضمن (Status IN ('Requested','Active'))، وكثير خارجه هنا.
- واردة: لا شيء.

| | |
|---|---|
| **دورة الحياة والانتقالات** | Requested → Active → Expired؛ Requested\|Active → Failed \| Disconnected \| Cancelled. |
| **الخصوصية والملكية والتفويض** | خاص بالشخص. |
| **التاريخ والنسخ والاحتفاظ** | تبقى؛ الإعداد وحده لا يمنح مكافأة. |
| **مثال ملموس** | حجب instagram.com وtiktok.com لمدة 45 دقيقة؛ الإضافة تؤكد القواعد فتصبح Active. |
| **ماذا ينكسر لو حُذف أو دُمج** | لا يمكن عرض حالات الحماية الصادقة ولا ربط Protected Work بجلسة دعم. |
| **المصدر** | §6.1، §7.2 Protected Work؛ Client/src/pages/member/shield/shield.js (protection-form) |

### shield.BrowserUsagePeriod

<a id="shield-browserusageperiod"></a>

| | |
|---|---|
| **الغرض** | ملخص يومي مستلم من الإضافة: الثواني المرصودة على المواقع المختارة، التغطية، الفجوات. |
| **الميزة وسير العمل** | Insights → Digital Usage (7/14/28 يومًا)، "No browser usage data available"، مقارنة الحد. |
| **لماذا جدول مستقل** | كل دفعة تحمل تسلسلًا فريدًا لكل تثبيت (منع الإعادة)، وتُثبَّت على نسخة الإعداد. التغطية والفجوات تجعل غياب البيانات "مجهولًا" لا صفرًا (§10.5). |
| **نوع الصف** | إلحاقي (a) |
| **الأصل في المخطط الحالي** | `shield.BrowserUsagePeriod` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `PersonId` | bigint | لا |  | FK → shield.ExtensionInstallation (مركب: InstallationId, PersonId)؛ FK → shield.ShieldConfiguration (مركب: ConfigurationId, PersonId) |
| `InstallationId` | bigint | لا |  | FK → shield.ExtensionInstallation (مركب: InstallationId, PersonId) |
| `ConfigurationId` | bigint | لا |  | FK → shield.ShieldConfiguration (مركب: ConfigurationId, PersonId) |
| `LocalDate` | date | لا |  |  |
| `TimeZoneId` | nvarchar(80) | لا |  |  |
| `ObservedSeconds` | int | لا |  |  |
| `CoverageSeconds` | int | لا |  |  |
| `GapCount` | int | لا |  |  |
| `SequenceNo` | bigint | لا |  |  |
| `SourceHash` | binary(32) | لا |  |  |
| `ReceivedAtUtc` | datetime2(3) | لا |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |

**المفاتيح والقيود والفهارس**

- PK: `PK_BrowserUsagePeriod (Id)`
- FK: `(InstallationId, PersonId) → shield.ExtensionInstallation(Id, PersonId)`
- FK: `(ConfigurationId, PersonId) → shield.ShieldConfiguration(Id, PersonId)`
- UNIQUE: `(Id, ConfigurationId)`
- UNIQUE: `(InstallationId, SequenceNo)`
- INDEX: `(PersonId, LocalDate)`
- CHECK `CK_BrowserUsagePeriod_Counts`: `ObservedSeconds >= 0 AND CoverageSeconds >= 0 AND GapCount >= 0 AND ObservedSeconds <= CoverageSeconds`
- صلاحيات: INSERT/SELECT فقط لدور التشغيل؛ `TR_BrowserUsagePeriod_Immutable` يمنع UPDATE/DELETE.
- حارس: proc shield.IngestUsagePeriod: يدرج الفترة وصفوف المواقع في معاملة واحدة ويرفض إن لم يساوِ مجموعها ObservedSeconds.
- حارس: TR_BrowserUsagePeriod_Immutable: إلحاقي.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `shield.ExtensionInstallation` عبر `InstallationId, PersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `shield.ShieldConfiguration` عبر `ConfigurationId, PersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `shield.BrowserUsageDomain` (UsagePeriodId, ConfigurationId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | إلحاقي: دفعة واحدة لكل SequenceNo؛ الإعادة تُرفض بالفهرس الفريد؛ التصحيح دفعة جديدة لا تعديل. |
| **الخصوصية والملكية والتفويض** | خاص بالشخص؛ لا URL ولا محتوى. |
| **التاريخ والنسخ والاحتفاظ** | مدة الاحتفاظ لم تُحدَّد (§24.1). |
| **مثال ملموس** | تثبيت يرسل SequenceNo=42 ليوم 2026-11-02: ObservedSeconds=5040، CoverageSeconds=6200. |
| **ماذا ينكسر لو حُذف أو دُمج** | لا قياس صادق للاستخدام ولا منع للإعادة. |
| **المصدر** | §6.2، §6.4، §10.2، §10.3، §10.5 |

### shield.BrowserUsageDomain

<a id="shield-browserusagedomain"></a>

| | |
|---|---|
| **الغرض** | تفصيل الفترة اليومية لكل موقع مختار. |
| **الميزة وسير العمل** | قائمة "By website" في Insights. |
| **لماذا جدول مستقل** | الواجهة الحالية تجمع الوقت لكل موقع عبر الفترات؛ هذا تجميع عبر صفوف. المفتاح المركب إلى ShieldSelectedDomain يضمن أن الموقع كان مختارًا في نسخة الإعداد نفسها. |
| **نوع الصف** | إلحاقي (a) |
| **الأصل في المخطط الحالي** | `shield.BrowserUsageDomain` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `UsagePeriodId` | bigint | لا |  | FK → shield.BrowserUsagePeriod (مركب: UsagePeriodId, ConfigurationId) |
| `ConfigurationId` | bigint | لا |  | FK → shield.BrowserUsagePeriod (مركب: UsagePeriodId, ConfigurationId)؛ FK → shield.ShieldSelectedDomain (مركب: ConfigurationId, DomainCode) |
| `DomainCode` | nvarchar(120) | لا |  | FK → shield.ShieldSelectedDomain (مركب: ConfigurationId, DomainCode) |
| `ObservedSeconds` | int | لا |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |

**المفاتيح والقيود والفهارس**

- PK: `PK_BrowserUsageDomain (Id)`
- FK: `(UsagePeriodId, ConfigurationId) → shield.BrowserUsagePeriod(Id, ConfigurationId)`
- FK: `(ConfigurationId, DomainCode) → shield.ShieldSelectedDomain(ConfigurationId, DomainCode)`
- UNIQUE: `(UsagePeriodId, DomainCode)`
- CHECK `CK_BrowserUsageDomain_Seconds`: `ObservedSeconds >= 0`
- صلاحيات: INSERT/SELECT فقط لدور التشغيل؛ `TR_BrowserUsageDomain_Immutable` يمنع UPDATE/DELETE.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `shield.BrowserUsagePeriod` عبر `UsagePeriodId, ConfigurationId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `shield.ShieldSelectedDomain` عبر `ConfigurationId, DomainCode`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: لا شيء.

| | |
|---|---|
| **دورة الحياة والانتقالات** | إلحاقي مع فترته. |
| **الخصوصية والملكية والتفويض** | خاص بالشخص. |
| **التاريخ والنسخ والاحتفاظ** | يتبع الفترة. |
| **مثال ملموس** | الفترة 42: instagram.com 3100 ثانية، youtube.com 1940 ثانية. |
| **ماذا ينكسر لو حُذف أو دُمج** | يضيع التفصيل لكل موقع وضمان "المواقع المختارة فقط". |
| **المصدر** | §6.2، §10.4؛ Client/src/pages/member/insights/insights.js (perSite) |

---

## evidence — الأدلة والحدائق

### evidence.EvidenceEvent

<a id="evidence-evidenceevent"></a>

| | |
|---|---|
| **الغرض** | حدث دليل موحد بمصدر فريد ونوع موثوقية، يستهلكه محرك المكافآت والتقارير. |
| **الميزة وسير العمل** | نمو الحديقة الشخصية والجماعية، "recent qualifying sources"، شارات المصدر في Insights، مشاركة إنجاز في المجتمع. |
| **لماذا جدول مستقل** | §9.2 يطلب أن تستهلك المكافأة "معرّف حدث مصدر فريدًا ونسخته" وأن يُنتج الحدث كل أثر مرة واحدة. الفهرس (SourceContext, SourceKey, SourceVersion) يمنع منح الحدث نفسه من مساحتي عمل مرتبطتين. الإبطال حدث جديد يشير إلى الأصل، فلا يُحذف الدليل. |
| **نوع الصف** | إلحاقي (a) |
| **الأصل في المخطط الحالي** | `evidence.EvidenceEvent` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `EventPublicId` | uniqueidentifier | لا |  |  |
| `SourceContext` | nvarchar(32) | لا |  |  |
| `SourceKey` | nvarchar(160) | لا |  |  |
| `SourceVersion` | nvarchar(64) | لا |  |  |
| `SubjectPersonId` | bigint | لا |  | FK → iam.Person؛ FK → evidence.EvidenceEvent (مركب: InvalidatesEventId, SubjectPersonId) |
| `Kind` | nvarchar(40) | لا |  |  |
| `Provenance` | nvarchar(24) | لا |  |  |
| `OccurredAtUtc` | datetime2(3) | لا |  |  |
| `Validity` | nvarchar(16) | لا | `N'Accepted'` |  |
| `InvalidatesEventId` | bigint | نعم |  | FK → evidence.EvidenceEvent (مركب: InvalidatesEventId, SubjectPersonId) |
| `Reason` | nvarchar(800) | نعم |  |  |
| `RecordedByPersonId` | bigint | نعم |  | FK → iam.Person |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |

**المفاتيح والقيود والفهارس**

- PK: `PK_EvidenceEvent (Id)`
- FK: `(SubjectPersonId) → iam.Person(Id)`
- FK: `(RecordedByPersonId) → iam.Person(Id)`
- FK: `(InvalidatesEventId, SubjectPersonId) → evidence.EvidenceEvent(Id, SubjectPersonId)`
- UNIQUE: `(Id, SubjectPersonId)`
- UNIQUE: `(EventPublicId)`
- UNIQUE: `(SourceContext, SourceKey, SourceVersion)`
- UNIQUE: `(InvalidatesEventId) WHERE InvalidatesEventId IS NOT NULL` (فهرس فريد مفلتر)
- CHECK `CK_EvidenceEvent_Context`: `SourceContext IN ('PracticeAttempt','RoutineCheckIn','ReviewDecision','Attendance','Completion')`
- CHECK `CK_EvidenceEvent_Provenance`: `Provenance IN ('SystemScored','SelfReported','CoachReviewed','SupervisorConfirmed','ProviderEvaluated','RepresentativeDecided')`
- CHECK `CK_EvidenceEvent_Validity`: `(Validity = 'Accepted' AND InvalidatesEventId IS NULL) OR (Validity = 'Invalidates' AND InvalidatesEventId IS NOT NULL AND Reason IS NOT NULL)`
- صلاحيات: INSERT/SELECT فقط لدور التشغيل؛ `TR_EvidenceEvent_Immutable` يمنع UPDATE/DELETE.
- حارس: TR_EvidenceEvent_Immutable: إلحاقي.
- حارس: TR_EvidenceEvent_Invalidation: لا يُبطَل إلا حدث Accepted، ومرة واحدة.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `SubjectPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `iam.Person` عبر `RecordedByPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `evidence.EvidenceEvent` عبر `InvalidatesEventId, SubjectPersonId`؛ وكل صف هناك يقابله صفر أو واحد ضمن (InvalidatesEventId IS NOT NULL)، وكثير خارجه هنا.
- واردة: `activity.PracticeAttempt` (EvidenceEventId, PersonId)، `activity.RoutineCheckIn` (EvidenceEventId, PersonId)، `evidence.EvidenceEvent` (InvalidatesEventId, SubjectPersonId)، `evidence.PersonalRewardEntry` (EvidenceEventId, PersonId)، `evidence.GroupRewardEntry` (EvidenceEventId, ContributorPersonId)، `task.ReviewDecision` (EvidenceEventId)، `session.Attendance` (EvidenceEventId, PersonId)، `session.Completion` (EvidenceEventId, PersonId)، `community.Post` (SharedEvidenceEventId, AuthorPersonId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | إلحاقي: Accepted، ثم ربما حدث Invalidates واحد يشير إليه. |
| **الخصوصية والملكية والتفويض** | للشخص صاحب الدليل؛ المشغّل المخول يرى أحداث مورده فقط. |
| **التاريخ والنسخ والاحتفاظ** | الجدول هو سجل الأدلة. |
| **مثال ملموس** | مشرف يسجل Present لحضور جلسة؛ يُنشأ EvidenceEvent(SourceContext=Attendance, SourceKey=<Attendance.Id>, Provenance=SupervisorConfirmed). تصحيحه لاحقًا إلى Absent ينشئ حدث Invalidates. |
| **ماذا ينكسر لو حُذف أو دُمج** | يصبح منع التكرار والتراجع الشفاف مسؤولية كل وحدة منفردة، وهو ما يمنعه D11 و§23.2. |
| **المصدر** | §1.3/3، §7.8، §9.2، §21.3، §23.2، D11 |

### evidence.RewardPolicyVersion

<a id="evidence-rewardpolicyversion"></a>

| | |
|---|---|
| **الغرض** | نسخة منشورة من قواعد الحديقة: العتبات، سقوف الزينة، المعالم الجماعية. |
| **الميزة وسير العمل** | Garden، صفحة Garden Rules في Admin، "next eligible milestone". |
| **لماذا جدول مستقل** | العتبات والسقوف قيم مفتوحة (§26.2 #2) ويحررها Admin اليوم. حفظ السياسة نفسها بنسخة ثابتة يسمح بتفسير أي مكافأة تاريخية حتى بعد تغيير القواعد؛ رقم نسخة نصي وحده لا يحفظ محتواها. |
| **نوع الصف** | إلحاقي (a) |
| **الأصل في المخطط الحالي** | `evidence.RewardPolicyVersion` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `PolicyCode` | nvarchar(32) | لا |  |  |
| `VersionNo` | int | لا |  |  |
| `RulesJson` | nvarchar(max) | لا |  |  |
| `PublishedByPersonId` | bigint | نعم |  | FK → iam.Person |
| `PublishedAtUtc` | datetime2(3) | لا |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |

**المفاتيح والقيود والفهارس**

- PK: `PK_RewardPolicyVersion (Id)`
- FK: `(PublishedByPersonId) → iam.Person(Id)`
- UNIQUE: `(PolicyCode, VersionNo)`
- CHECK `CK_RewardPolicyVersion_Code`: `PolicyCode IN ('PersonalGarden','GroupGarden')`
- CHECK `CK_RewardPolicyVersion_VersionNo`: `VersionNo > 0`
- CHECK `CK_RewardPolicyVersion_Rules`: `ISJSON(RulesJson) = 1`
- صلاحيات: INSERT/SELECT فقط لدور التشغيل؛ `TR_RewardPolicyVersion_Immutable` يمنع UPDATE/DELETE.
- حارس: TR_RewardPolicyVersion_Immutable: إلحاقي.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `iam.Person` عبر `PublishedByPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `evidence.PersonalRewardEntry` (PolicyVersionId)، `evidence.GroupRewardEntry` (PolicyVersionId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | إلحاقي: Admin ينشر نسخة جديدة؛ المكافآت الجديدة تستخدم الأحدث والقديمة تبقى مشيرة إلى نسختها. |
| **الخصوصية والملكية والتفويض** | عام للعرض. |
| **التاريخ والنسخ والاحتفاظ** | كل النسخ تبقى. |
| **مثال ملموس** | PersonalGarden v2: {"routineFlowerAt":[3,10,21],"maxRabbits":3,…}. |
| **ماذا ينكسر لو حُذف أو دُمج** | تصبح المكافآت السابقة غير قابلة للتفسير أو تتغير بأثر رجعي. |
| **المصدر** | §9.2، §19 Garden rules، §26.2 #2 |

### evidence.PersonalRewardEntry

<a id="evidence-personalrewardentry"></a>

| | |
|---|---|
| **الغرض** | دفتر المكافآت الشخصية: منح أو عكس أثر واحد من حدث دليل واحد بموجب سياسة محددة. |
| **الميزة وسير العمل** | Personal Garden (نمو كل فئة ممارسة، زهرة، أرنب، بيت طائر)، معاينة الحديقة في Home. |
| **لماذا جدول مستقل** | المكافأة يجب أن تأتي من إنجاز موثّق لا من عدّاد في الواجهة. الأثر دلالي (PracticeGrowth لفئة، RoutineDecoration…) وليس "شجرة"؛ الرسم (أربع أشجار حاليًا أو نبتة رئيسية واحدة إن اعتُمدت لاحقًا) إسقاط على هذه الصفوف، فلا يحتاج تغيير التصميم البصري إلى ترحيل بيانات. منفصل عن دفتر المجموعة لأن تصنيف الخصوصية مختلف. |
| **نوع الصف** | إلحاقي (a) |
| **الأصل في المخطط الحالي** | `evidence.PersonalRewardEntry` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `EvidenceEventId` | bigint | لا |  | FK → evidence.EvidenceEvent (مركب: EvidenceEventId, PersonId) |
| `PersonId` | bigint | لا |  | FK → evidence.EvidenceEvent (مركب: EvidenceEventId, PersonId)؛ FK → evidence.PersonalRewardEntry (مركب: ReversesEntryId, PersonId) |
| `PolicyVersionId` | bigint | لا |  | FK → evidence.RewardPolicyVersion |
| `EffectCode` | nvarchar(32) | لا |  |  |
| `PracticeType` | nvarchar(32) | نعم |  |  |
| `EntryKind` | nvarchar(16) | لا |  |  |
| `Units` | smallint | لا |  |  |
| `ReversesEntryId` | bigint | نعم |  | FK → evidence.PersonalRewardEntry (مركب: ReversesEntryId, PersonId) |
| `DecidedAtUtc` | datetime2(3) | لا |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |

**المفاتيح والقيود والفهارس**

- PK: `PK_PersonalRewardEntry (Id)`
- FK: `(EvidenceEventId, PersonId) → evidence.EvidenceEvent(Id, SubjectPersonId)`
- FK: `(PolicyVersionId) → evidence.RewardPolicyVersion(Id)`
- FK: `(ReversesEntryId, PersonId) → evidence.PersonalRewardEntry(Id, PersonId)`
- UNIQUE: `(Id, PersonId)`
- UNIQUE: `(EvidenceEventId, EffectCode) WHERE EntryKind = 'Grant'` (فهرس فريد مفلتر)
- UNIQUE: `(ReversesEntryId) WHERE ReversesEntryId IS NOT NULL` (فهرس فريد مفلتر)
- CHECK `CK_PersonalRewardEntry_Effect`: `EffectCode IN ('PracticeGrowth','RoutineDecoration','AttendanceDecoration','CampDecoration')`
- CHECK `CK_PersonalRewardEntry_PracticeType`: `(EffectCode = 'PracticeGrowth' AND PracticeType IN ('DepthPractice','ListeningRecall','PracticalMicroChallenge','ProtectedWork')) OR (EffectCode <> 'PracticeGrowth' AND PracticeType IS NULL)`
- CHECK `CK_PersonalRewardEntry_Kind`: `(EntryKind = 'Grant' AND ReversesEntryId IS NULL) OR (EntryKind = 'Reversal' AND ReversesEntryId IS NOT NULL)`
- CHECK `CK_PersonalRewardEntry_Units`: `Units > 0`
- صلاحيات: INSERT/SELECT فقط لدور التشغيل؛ `TR_PersonalRewardEntry_Immutable` يمنع UPDATE/DELETE.
- حارس: TR_PersonalRewardEntry_Immutable: إلحاقي.
- حارس: TR_PersonalRewardEntry_Reversal: العكس يشير إلى Grant للشخص نفسه.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `evidence.EvidenceEvent` عبر `EvidenceEventId, PersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `evidence.RewardPolicyVersion` عبر `PolicyVersionId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `evidence.PersonalRewardEntry` عبر `ReversesEntryId, PersonId`؛ وكل صف هناك يقابله صفر أو واحد ضمن (ReversesEntryId IS NOT NULL)، وكثير خارجه هنا.
- واردة: `evidence.PersonalRewardEntry` (ReversesEntryId, PersonId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | إلحاقي: Grant، ثم ربما Reversal واحد عند إبطال الدليل. |
| **الخصوصية والملكية والتفويض** | خاص بالشخص. |
| **التاريخ والنسخ والاحتفاظ** | لا حذف؛ الحالة الحالية = المنح ناقص العكوس. |
| **مثال ملموس** | حدث محاولة Depth صالحة ينتج Grant(PracticeGrowth, PracticeType=DepthPractice, Units=1). التكرار المتزامن للحدث نفسه يُرفض بالفهرس الفريد. |
| **ماذا ينكسر لو حُذف أو دُمج** | تعود المكافآت إلى عدادات قابلة للتلاعب ويُفقد العكس الشفاف (D09، D11). |
| **المصدر** | §9.1، §9.2، D06–D11؛ قرار المالك #12؛ Client/src/pages/member/garden/garden.js |

### evidence.GroupRewardEntry

<a id="evidence-grouprewardentry"></a>

| | |
|---|---|
| **الغرض** | دفتر مساهمات الحديقة الجماعية: لمبادرة مؤسسة كاملة، أو لمجموعة مدرب مستقل. |
| **الميزة وسير العمل** | Group Garden للمؤسسة والمدرب والطالب المدعو، معالم جماعية بمصادر. |
| **لماذا جدول مستقل** | D13: حديقة واحدة لكل مبادرة (عبر مجموعاتها الداخلية) وواحدة لكل مجموعة مستقلة، ولا حديقة للمزوّد. المالك مكتوب بمفتاحين حقيقيين XOR؛ المفتاح المركب (GroupId, ProgramId) يرفض مجموعة داخلية لمبادرة. الفهرس (EvidenceEventId, EffectCode) يمنع منح الحدث نفسه لحديقتين مرتبطتين (§13.1، §23.2). جدول GroupGarden السابق لم يحمل إلا المالك والحالة، فصار المالك عمودًا هنا. |
| **نوع الصف** | إلحاقي (a) |
| **الأصل في المخطط الحالي** | `evidence.GroupRewardEntry` + يستوعب `evidence.GroupGarden` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `EvidenceEventId` | bigint | لا |  | FK → evidence.EvidenceEvent (مركب: EvidenceEventId, ContributorPersonId) |
| `ContributorPersonId` | bigint | لا |  | FK → evidence.EvidenceEvent (مركب: EvidenceEventId, ContributorPersonId) |
| `InitiativeId` | bigint | نعم |  | FK → institution.Initiative؛ FK → evidence.GroupRewardEntry (مركب: ReversesEntryId, InitiativeId) |
| `GroupId` | bigint | نعم |  | FK → coach.OperationalGroup (مركب: GroupId, ProgramId)؛ FK → evidence.GroupRewardEntry (مركب: ReversesEntryId, GroupId) |
| `ProgramId` | bigint | نعم |  | FK → coach.OperationalGroup (مركب: GroupId, ProgramId) |
| `PolicyVersionId` | bigint | لا |  | FK → evidence.RewardPolicyVersion |
| `EffectCode` | nvarchar(32) | لا |  |  |
| `EntryKind` | nvarchar(16) | لا |  |  |
| `Units` | smallint | لا |  |  |
| `ReversesEntryId` | bigint | نعم |  | FK → evidence.GroupRewardEntry (مركب: ReversesEntryId, InitiativeId)؛ FK → evidence.GroupRewardEntry (مركب: ReversesEntryId, GroupId) |
| `DecidedAtUtc` | datetime2(3) | لا |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |

**المفاتيح والقيود والفهارس**

- PK: `PK_GroupRewardEntry (Id)`
- FK: `(EvidenceEventId, ContributorPersonId) → evidence.EvidenceEvent(Id, SubjectPersonId)`
- FK: `(InitiativeId) → institution.Initiative(Id)`
- FK: `(GroupId, ProgramId) → coach.OperationalGroup(Id, ProgramId)`
- FK: `(PolicyVersionId) → evidence.RewardPolicyVersion(Id)`
- FK: `(ReversesEntryId, InitiativeId) → evidence.GroupRewardEntry(Id, InitiativeId)`
- FK: `(ReversesEntryId, GroupId) → evidence.GroupRewardEntry(Id, GroupId)`
- UNIQUE: `(Id, InitiativeId)`
- UNIQUE: `(Id, GroupId)`
- UNIQUE: `(EvidenceEventId, EffectCode) WHERE EntryKind = 'Grant'` (فهرس فريد مفلتر)
- UNIQUE: `(ReversesEntryId) WHERE ReversesEntryId IS NOT NULL` (فهرس فريد مفلتر)
- INDEX: `(InitiativeId, DecidedAtUtc) WHERE InitiativeId IS NOT NULL`
- INDEX: `(GroupId, DecidedAtUtc) WHERE GroupId IS NOT NULL`
- CHECK `CK_GroupRewardEntry_Owner`: `(InitiativeId IS NOT NULL AND GroupId IS NULL AND ProgramId IS NULL) OR (InitiativeId IS NULL AND GroupId IS NOT NULL AND ProgramId IS NOT NULL)`
- CHECK `CK_GroupRewardEntry_Effect`: `EffectCode IN ('Contribution','CompletionMilestone')`
- CHECK `CK_GroupRewardEntry_Kind`: `(EntryKind = 'Grant' AND ReversesEntryId IS NULL) OR (EntryKind = 'Reversal' AND ReversesEntryId IS NOT NULL)`
- CHECK `CK_GroupRewardEntry_Units`: `Units > 0`
- صلاحيات: INSERT/SELECT فقط لدور التشغيل؛ `TR_GroupRewardEntry_Immutable` يمنع UPDATE/DELETE.
- حارس: TR_GroupRewardEntry_Immutable: إلحاقي.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `evidence.EvidenceEvent` عبر `EvidenceEventId, ContributorPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `institution.Initiative` عبر `InitiativeId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `coach.OperationalGroup` عبر `GroupId, ProgramId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `evidence.RewardPolicyVersion` عبر `PolicyVersionId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `evidence.GroupRewardEntry` عبر `ReversesEntryId, InitiativeId`؛ وكل صف هناك يقابله صفر أو واحد ضمن (ReversesEntryId IS NOT NULL)، وكثير خارجه هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `evidence.GroupRewardEntry` عبر `ReversesEntryId, GroupId`؛ وكل صف هناك يقابله صفر أو واحد ضمن (ReversesEntryId IS NOT NULL)، وكثير خارجه هنا.
- واردة: `evidence.GroupRewardEntry` (ReversesEntryId, InitiativeId | ReversesEntryId, GroupId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | إلحاقي: Grant ثم ربما Reversal بالمالك نفسه. |
| **الخصوصية والملكية والتفويض** | مستوى المجموعة: أعضاء المجموعة/المبادرة المخولون والطاقم؛ يعرض ملخص المساهمين لا السجلات الشخصية. |
| **التاريخ والنسخ والاحتفاظ** | لا حذف؛ المعالم الجماعية تُشتق من مجموع المنح ناقص العكوس حسب سياسة المالك. |
| **مثال ملموس** | مراجعة مدرب Approved لمهمة طالب في مبادرة تنتج Grant(Contribution) على InitiativeId، مرة واحدة حتى لو كان برنامج المدرب مرتبطًا بالمبادرة. |
| **ماذا ينكسر لو حُذف أو دُمج** | تتكرر المكافأة عبر مساحتين مرتبطتين أو تظهر حدائق لمجموعات داخلية أو للمزوّد خلافًا لـD13. |
| **المصدر** | §9.1، §9.2، §13.1، D12، D13 |

---

## institution — مبادرات المؤسسة

### institution.Initiative

<a id="institution-initiative"></a>

| | |
|---|---|
| **الغرض** | الجذر الثابت لمبادرة تملكها مؤسسة: الهوية العامة، الحالة التشغيلية، مؤشر النسخة المنشورة الحالية، ومسودة المنشئ. |
| **الميزة وسير العمل** | Initiatives وBuilder ذو المراحل الست (Save Draft/Preview/Publish)، Explore العادي، Dashboard المؤسسة، الإغلاق، الإلغاء، الحوكمة. |
| **لماذا جدول مستقل** | المبادرة لها هوية ثابتة يشير إليها كل شيء (طلبات، جلسات، مجموعات، نماذج)، بينما شروطها المنشورة نسخ. المسودة عمود JSON هنا لأنها نسخة عمل واحدة في كل وقت بلا تاريخ مطلوب ولا مفتاح يشير إليها؛ جدول InitiativeDraft السابق كان 1:1 فعليًا. العنوان والسعة والتواريخ لا تُكرَّر هنا؛ تُقرأ من النسخة الحالية، فلا يوجد مصدران قد يختلفان. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `institution.Initiative` + يستوعب `institution.InitiativeDraft` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK؛ FK → institution.InitiativeRevision (مركب: CurrentRevisionId, Id)؛ FK → institution.InitiativeRevision (مركب: DraftBaseRevisionId, Id) |
| `PublicId` | uniqueidentifier | لا | `NEWSEQUENTIALID()` | UQ — المعرّف الخارجي في الـAPI والروابط |
| `InstitutionId` | bigint | لا |  | FK → org.Organization (مركب: InstitutionId, InstitutionKind) |
| `InstitutionKind` | nvarchar(16) | لا | `N'Institution'` | FK → org.Organization (مركب: InstitutionId, InstitutionKind) |
| `Status` | nvarchar(24) | لا | `N'Draft'` |  |
| `CurrentRevisionId` | bigint | نعم |  | FK → institution.InitiativeRevision (مركب: CurrentRevisionId, Id) |
| `DraftJson` | nvarchar(max) | نعم |  |  |
| `DraftLastSavedStage` | tinyint | نعم |  |  |
| `DraftBaseRevisionId` | bigint | نعم |  | FK → institution.InitiativeRevision (مركب: DraftBaseRevisionId, Id) |
| `DraftUpdatedByPersonId` | bigint | نعم |  | FK → iam.Person |
| `DraftUpdatedAtUtc` | datetime2(3) | نعم |  |  |
| `FirstPublishedAtUtc` | datetime2(3) | نعم |  |  |
| `CompletedAtUtc` | datetime2(3) | نعم |  |  |
| `CancelledAtUtc` | datetime2(3) | نعم |  |  |
| `CancelledByPersonId` | bigint | نعم |  | FK → iam.Person |
| `CancellationReason` | nvarchar(800) | نعم |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_Initiative (Id)`
- FK: `(InstitutionId, InstitutionKind) → org.Organization(Id, Kind)`
- FK: `(CurrentRevisionId, Id) → institution.InitiativeRevision(Id, InitiativeId)`
- FK: `(DraftBaseRevisionId, Id) → institution.InitiativeRevision(Id, InitiativeId)`
- FK: `(DraftUpdatedByPersonId) → iam.Person(Id)`
- FK: `(CancelledByPersonId) → iam.Person(Id)`
- UNIQUE: `(PublicId)`
- CHECK `CK_Initiative_Kind`: `InstitutionKind = 'Institution'`
- CHECK `CK_Initiative_Status`: `Status IN ('Draft','Published','RegistrationClosed','Suspended','Completed','Cancelled','Archived')`
- CHECK `CK_Initiative_Published`: `Status IN ('Draft','Cancelled','Archived') OR CurrentRevisionId IS NOT NULL`
- CHECK `CK_Initiative_DraftJson`: `DraftJson IS NULL OR ISJSON(DraftJson) = 1`
- CHECK `CK_Initiative_DraftStage`: `DraftLastSavedStage IS NULL OR DraftLastSavedStage BETWEEN 1 AND 6`
- CHECK `CK_Initiative_Cancellation`: `(Status = 'Cancelled' AND CancelledAtUtc IS NOT NULL AND CancelledByPersonId IS NOT NULL AND LEN(TRIM(CancellationReason)) > 0) OR (Status <> 'Cancelled' AND CancelledAtUtc IS NULL AND CancelledByPersonId IS NULL AND CancellationReason IS NULL)`
- حارس: proc institution.SaveDraftStage / PublishDraft: حفظ المرحلة يتحقق من RowVersion؛ النشر ينشئ InitiativeRevision ويضبط CurrentRevisionId ويُفرغ المسودة في معاملة واحدة.
- حارس: proc institution.CancelInitiative: نهائي؛ يقفل الصف، ينهي كل الطلبات المفتوحة والعضويات (Cancelled، EndReason=InitiativeCancelled) ويحرر السعة ويسجل القرارات والتدقيق ذريًا.
- حارس: هذا الصف هو نقطة القفل (UPDLOCK,HOLDLOCK) لكل أمر سعة: القبول، العرض، الاستعادة، قبول المشرف.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `org.Organization` عبر `InstitutionId, InstitutionKind`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `institution.InitiativeRevision` عبر `CurrentRevisionId, Id`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `institution.InitiativeRevision` عبر `DraftBaseRevisionId, Id`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `iam.Person` عبر `DraftUpdatedByPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `iam.Person` عبر `CancelledByPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `org.StaffAppointment` (InitiativeId)، `evidence.GroupRewardEntry` (InitiativeId)، `institution.InitiativeRevision` (InitiativeId)، `institution.InitiativeApplication` (InitiativeId)، `coach.OperationalGroup` (InitiativeId)، `task.OperationalReport` (InitiativeId)، `session.Session` (InitiativeId)، `forms.Form` (InitiativeId)، `partnership.PartnershipLink` (InitiativeId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | Draft → Published ↔ RegistrationClosed → Completed → Archived؛ Published\|RegistrationClosed ↔ Suspended (Admin)؛ أي حالة غير نهائية → Cancelled (نهائي). |
| **الخصوصية والملكية والتفويض** | عام عند النشر (المعلومات المنشورة فقط). المسودة للممثلين. |
| **التاريخ والنسخ والاحتفاظ** | كل نشر أو إعادة جدولة نسخة في InitiativeRevision؛ الإلغاء بفاعله وسببه هنا وفي AuditEvent. |
| **مثال ملموس** | الممثل يحفظ المرحلة 3 (DraftLastSavedStage=3)، ثم ينشر؛ تُنشأ النسخة 1، ويصبح Status=Published وتظهر في explore.html. |
| **ماذا ينكسر لو حُذف أو دُمج** | لا هوية ثابتة للمبادرة عبر النسخ، ولا مكان لقفل السعة، ولا حالة حوكمة. |
| **المصدر** | §15، §15.1، §15.2، §21.4 B، D17، D20؛ قرارات المالك #4–#11؛ Client/src/workspaces/builders/initiative.js، commands/initiative.js |

### institution.InitiativeRevision

<a id="institution-initiativerevision"></a>

| | |
|---|---|
| **الغرض** | نسخة ثابتة من الشروط المنشورة: الشروط القابلة للفرض كأعمدة، والمحتوى الكامل للمنشئ (بما فيه محتوى التوعية) كلقطة JSON. |
| **الميزة وسير العمل** | Publish/Update with reason، صفحة التفاصيل في Explore، "Terms you applied under"، إعادة الجدولة والإشعار. |
| **لماذا جدول مستقل** | قرار المالك #8: تُحفظ نسخ الشروط التاريخية ولا تسلب إعادة الجدولة حقًا قائمًا. الطلب يثبَّت على النسخة التي قُدِّم بموجبها. الأعمدة هي ما تفرضه SQL وC# (السعة ≤ 135، موعد الانسحاب = البداية − 120 ساعة تمامًا، التكلفة)، واللقطة JSON تحفظ العرض الكامل الثابت. محتوى التوعية المرتب جزء من اللقطة لأنه بلا دورة حياة ولا مرجع مستقل (كان InitiativeContent). |
| **نوع الصف** | إلحاقي (a) |
| **الأصل في المخطط الحالي** | `institution.InitiativeRevision` + يستوعب `institution.InitiativeContent` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `InitiativeId` | bigint | لا |  | FK → institution.Initiative |
| `RevisionNo` | int | لا |  |  |
| `ChangeKind` | nvarchar(16) | لا |  |  |
| `ChangeReason` | nvarchar(800) | نعم |  |  |
| `Title` | nvarchar(200) | لا |  |  |
| `Summary` | nvarchar(1200) | لا |  |  |
| `TopicCode` | nvarchar(64) | لا |  |  |
| `OperatingMode` | nvarchar(16) | لا |  |  |
| `ParticipationMode` | nvarchar(16) | لا |  |  |
| `AudienceCode` | nvarchar(80) | لا |  |  |
| `CoverageCode` | nvarchar(120) | نعم |  |  |
| `Capacity` | smallint | لا |  |  |
| `WaitlistEnabled` | bit | لا |  |  |
| `OfferHoldHours` | smallint | نعم |  |  |
| `ApplicationOpensAtUtc` | datetime2(3) | نعم |  |  |
| `ApplicationClosesAtUtc` | datetime2(3) | نعم |  |  |
| `TimeZoneId` | nvarchar(80) | لا |  |  |
| `StartsAtUtc` | datetime2(3) | لا |  |  |
| `EndsAtUtc` | datetime2(3) | لا |  |  |
| `WithdrawalCutoffAtUtc` | datetime2(3) | لا |  |  |
| `CostKind` | nvarchar(8) | لا |  |  |
| `Price` | decimal(19,4) | نعم |  |  |
| `Currency` | char(3) | نعم |  |  |
| `ConsentNoticeVersion` | nvarchar(64) | لا |  |  |
| `CompletionPolicyRef` | nvarchar(120) | لا |  |  |
| `RegistrationFormVersionId` | bigint | نعم |  | FK → forms.FormVersion |
| `PublishedSnapshotJson` | nvarchar(max) | لا |  |  |
| `PublishedByPersonId` | bigint | لا |  | FK → iam.Person |
| `PublishedAtUtc` | datetime2(3) | لا |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |

**المفاتيح والقيود والفهارس**

- PK: `PK_InitiativeRevision (Id)`
- FK: `(InitiativeId) → institution.Initiative(Id)`
- FK: `(RegistrationFormVersionId) → forms.FormVersion(Id)`
- FK: `(PublishedByPersonId) → iam.Person(Id)`
- UNIQUE: `(Id, InitiativeId)`
- UNIQUE: `(InitiativeId, RevisionNo)`
- CHECK `CK_InitiativeRevision_RevisionNo`: `RevisionNo > 0`
- CHECK `CK_InitiativeRevision_ChangeKind`: `ChangeKind IN ('Publish','Reschedule','TermsUpdate')`
- CHECK `CK_InitiativeRevision_OperatingMode`: `OperatingMode IN ('Awareness','Structured')`
- CHECK `CK_InitiativeRevision_ParticipationMode`: `ParticipationMode IN ('Online','InPerson','Hybrid')`
- CHECK `CK_InitiativeRevision_Capacity`: `Capacity BETWEEN 1 AND 135`
- CHECK `CK_InitiativeRevision_Times`: `EndsAtUtc > StartsAtUtc`
- CHECK `CK_InitiativeRevision_Cutoff`: `WithdrawalCutoffAtUtc = DATEADD(hour, -120, StartsAtUtc)`
- CHECK `CK_InitiativeRevision_Application`: `ApplicationClosesAtUtc IS NULL OR ApplicationOpensAtUtc IS NULL OR ApplicationClosesAtUtc > ApplicationOpensAtUtc`
- CHECK `CK_InitiativeRevision_Cost`: `(CostKind = 'Free' AND Price IS NULL AND Currency IS NULL) OR (CostKind = 'Paid' AND Price > 0 AND Currency IS NOT NULL)`
- CHECK `CK_InitiativeRevision_OfferHold`: `OfferHoldHours IS NULL OR OfferHoldHours > 0`
- CHECK `CK_InitiativeRevision_Snapshot`: `ISJSON(PublishedSnapshotJson) = 1`
- صلاحيات: INSERT/SELECT فقط لدور التشغيل؛ `TR_InitiativeRevision_Immutable` يمنع UPDATE/DELETE.
- حارس: TR_InitiativeRevision_Immutable: إلحاقي.
- حارس: proc institution.RescheduleInitiative: ينشئ نسخة Reschedule ويمدد WithdrawalCutoffAtUtc للعضويات النشطة فقط إذا تأخر (لا يقصّره أبدًا).

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `institution.Initiative` عبر `InitiativeId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `forms.FormVersion` عبر `RegistrationFormVersionId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `PublishedByPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `institution.Initiative` (CurrentRevisionId, Id | DraftBaseRevisionId, Id)، `institution.InitiativeApplication` (TermsRevisionId, InitiativeId)، `institution.InitiativeApplicationDecision` (TermsRevisionId, InitiativeId)، `session.Completion` (InitiativeRevisionId, InitiativeId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | إلحاقي. النسخة الحالية يحددها Initiative.CurrentRevisionId. |
| **الخصوصية والملكية والتفويض** | عام بعد النشر. |
| **التاريخ والنسخ والاحتفاظ** | هذا الجدول هو تاريخ الشروط. |
| **مثال ملموس** | تأجيل البداية من 10 إلى 17 ديسمبر ينشئ النسخة 3 (Reschedule) بموعد انسحاب جديد؛ الأعضاء الذين كان موعدهم أقدم يُمدَّد لهم، ومن قُدّمت لهم البداية لا يُقصَّر موعدهم. |
| **ماذا ينكسر لو حُذف أو دُمج** | تُعاد كتابة شروط قُبل عليها الناس، ويستحيل إثبات حق الانسحاب أو السعر أو الأهلية وقت التقديم. |
| **المصدر** | §15.2، §15.3، D20، D28؛ قرارات المالك #5، #7، #8 |

### institution.InitiativeApplication

<a id="institution-initiativeapplication"></a>

| | |
|---|---|
| **الغرض** | سجل المشاركة الواحد لشخص في مبادرة لكل محاولة: الطلب والطابور وعرض المقعد والعضوية المقبولة ونهايتها. |
| **الميزة وسير العمل** | Apply من Explore، My Initiatives، Applications للممثل والمشرف (الطابور المشترك نفسه)، Waiting list/Offered، Withdraw، Suspend/Restore/Remove/Block، الإكمال. |
| **لماذا جدول مستقل** | الطلب والعضوية وعرض المقعد كانت ثلاثة جداول بعلاقات 1:1 إلزامية وقيم حالة مكررة (Offered في اثنين، Accepted في ثلاثة)، ومفتاح ثلاثي فقط ليبقيها متسقة. آلة الحالة في §15.3 سلسلة واحدة على سجل واحد، والـClient يخزنها كسجل admissions واحد. كل محاولة جديدة صف جديد (AttemptNo)، فيبقى تاريخ الرفض السابق. القواعد الحرجة صارت فهارس فريدة مباشرة: عضوية فعالة واحدة لكل شخص عبر كل المبادرات (قرار #4)، سجل مفتوح أو حظر نشط واحد لكل شخص ومبادرة (قرار #9)، ومنع العودة بعد عضوية سابقة ما دام المالك لم يعتمدها (قرار #10). وتُصلح ثغرة سابقة: لم يكن للطلب حالة لعرض مرفوض أو منتهٍ. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `institution.InitiativeApplication` + يستوعب `institution.InitiativeMembership`، `institution.InitiativeSeatOffer` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `PublicId` | uniqueidentifier | لا | `NEWSEQUENTIALID()` | UQ — المعرّف الخارجي في الـAPI والروابط |
| `InitiativeId` | bigint | لا |  | FK → institution.Initiative؛ FK → institution.InitiativeRevision (مركب: TermsRevisionId, InitiativeId) |
| `PersonId` | bigint | لا |  | FK → iam.Person؛ FK → forms.FormResponse (مركب: RegistrationResponseId, PersonId) |
| `AttemptNo` | int | لا |  |  |
| `TermsRevisionId` | bigint | لا |  | FK → institution.InitiativeRevision (مركب: TermsRevisionId, InitiativeId) |
| `RegistrationResponseId` | bigint | نعم |  | FK → forms.FormResponse (مركب: RegistrationResponseId, PersonId) |
| `ParticipationMode` | nvarchar(16) | نعم |  |  |
| `Status` | nvarchar(16) | لا | `N'Pending'` |  |
| `SubmittedAtUtc` | datetime2(3) | لا |  |  |
| `ConsentAtUtc` | datetime2(3) | لا |  |  |
| `QueuedAtUtc` | datetime2(3) | نعم |  |  |
| `OfferedAtUtc` | datetime2(3) | نعم |  |  |
| `OfferExpiresAtUtc` | datetime2(3) | نعم |  |  |
| `OfferRespondedAtUtc` | datetime2(3) | نعم |  |  |
| `AcceptedAtUtc` | datetime2(3) | نعم |  |  |
| `WithdrawalCutoffAtUtc` | datetime2(3) | نعم |  |  |
| `EndedAtUtc` | datetime2(3) | نعم |  |  |
| `EndReason` | nvarchar(32) | نعم |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_InitiativeApplication (Id)`
- FK: `(InitiativeId) → institution.Initiative(Id)`
- FK: `(PersonId) → iam.Person(Id)`
- FK: `(TermsRevisionId, InitiativeId) → institution.InitiativeRevision(Id, InitiativeId)`
- FK: `(RegistrationResponseId, PersonId) → forms.FormResponse(Id, PersonId)`
- UNIQUE: `(PublicId)`
- UNIQUE: `(Id, InitiativeId)`
- UNIQUE: `(Id, InitiativeId, PersonId)`
- UNIQUE: `(InitiativeId, PersonId, AttemptNo)`
- UNIQUE: `(InitiativeId, PersonId) WHERE Status IN ('Pending','Queued','Offered','Accepted','Suspended','Blocked')` (فهرس فريد مفلتر)
- UNIQUE: `(PersonId) WHERE Status IN ('Accepted','Suspended')` (فهرس فريد مفلتر)
- UNIQUE: `(InitiativeId, PersonId) WHERE AcceptedAtUtc IS NOT NULL` (فهرس فريد مفلتر)
- INDEX: `(InitiativeId) INCLUDE (Status) WHERE Status IN ('Offered','Accepted','Suspended')`
- INDEX: `(InitiativeId, QueuedAtUtc) WHERE Status = 'Queued'`
- CHECK `CK_InitiativeApplication_AttemptNo`: `AttemptNo > 0`
- CHECK `CK_InitiativeApplication_Status`: `Status IN ('Pending','Queued','Offered','Accepted','Suspended','Rejected','Withdrawn','OfferDeclined','OfferExpired','Removed','Completed','Cancelled','Blocked','BlockLifted')`
- CHECK `CK_InitiativeApplication_ParticipationMode`: `ParticipationMode IS NULL OR ParticipationMode IN ('Online','InPerson')`
- CHECK `CK_InitiativeApplication_Queued`: `Status <> 'Queued' OR QueuedAtUtc IS NOT NULL`
- CHECK `CK_InitiativeApplication_Offer`: `(Status <> 'Offered' OR (OfferedAtUtc IS NOT NULL AND OfferExpiresAtUtc > OfferedAtUtc AND OfferRespondedAtUtc IS NULL)) AND (Status NOT IN ('OfferDeclined','OfferExpired') OR (OfferedAtUtc IS NOT NULL AND OfferRespondedAtUtc IS NOT NULL))`
- CHECK `CK_InitiativeApplication_Membership`: `Status NOT IN ('Accepted','Suspended','Removed','Completed') OR (AcceptedAtUtc IS NOT NULL AND WithdrawalCutoffAtUtc IS NOT NULL)`
- CHECK `CK_InitiativeApplication_Open`: `(Status IN ('Pending','Queued','Offered','Accepted','Suspended') AND EndedAtUtc IS NULL AND EndReason IS NULL) OR (Status NOT IN ('Pending','Queued','Offered','Accepted','Suspended') AND EndedAtUtc IS NOT NULL)`
- CHECK `CK_InitiativeApplication_Cancelled`: `Status <> 'Cancelled' OR EndReason = 'InitiativeCancelled'`
- حارس: كل أوامر السعة تقفل institution.Initiative بـUPDLOCK,HOLDLOCK ثم تعدّ Status IN (Offered, Accepted, Suspended) وتقارن بسعة النسخة الحالية.
- حارس: TR_InitiativeApplication_Capacity: شبكة أمان بعد INSERT/UPDATE ترفض أي حالة يتجاوز فيها العدد السعة.
- حارس: TR_InitiativeApplication_Transition: يسمح فقط بانتقالات §15.3 ويمنع تغيير InitiativeId/PersonId/AttemptNo/TermsRevisionId.
- حارس: proc institution.WithdrawApplication: Pending\|Queued دائمًا؛ Offered = رفض العرض؛ Accepted فقط إذا SYSUTCDATETIME() < WithdrawalCutoffAtUtc (أكثر من 120 ساعة كاملة؛ اللحظة الحدّية مرفوضة).
- حارس: وظيفة مجدولة: Offered مع OfferExpiresAtUtc ≤ الآن → OfferExpired ثم عرض المقعد على التالي في الطابور، في معاملة واحدة.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `institution.Initiative` عبر `InitiativeId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `PersonId`؛ وكل صف هناك يقابله صفر أو واحد ضمن (Status IN ('Accepted','Suspended'))، وكثير خارجه هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `institution.InitiativeRevision` عبر `TermsRevisionId, InitiativeId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `forms.FormResponse` عبر `RegistrationResponseId, PersonId`؛ وكل صف هناك يقابله صفر أو واحد ضمن (Status IN ('Accepted','Suspended'))، وكثير خارجه هنا.
- واردة: `institution.InitiativeApplicationDecision` (ApplicationId, InitiativeId)، `coach.GroupMembership` (ApplicationId, InitiativeId, PersonId)، `session.Completion` (ApplicationId, InitiativeId, PersonId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | Pending → Accepted \| Queued \| Rejected \| Withdrawn؛ Queued → Offered → Accepted \| OfferDeclined \| OfferExpired؛ Queued → Rejected \| Withdrawn؛ Accepted → Suspended \| Removed \| Withdrawn (قبل الموعد) \| Completed؛ Suspended → Accepted (Restore) \| Removed؛ أي حالة → Blocked (قرار الممثل) → BlockLifted؛ المفتوحة → Cancelled عند الإلغاء الدائم. Accepted وSuspended وOffered تحجز مقعدًا؛ كل ما عداها لا يحجز. |
| **الخصوصية والملكية والتفويض** | الشخص، وممثلو المؤسسة، والمشرفون النشطون للمبادرة. المدرب يرى عضوية طلاب مجموعته فقط. |
| **التاريخ والنسخ والاحتفاظ** | كل انتقال يُسجَّل في InitiativeApplicationDecision. لا تُحذف الصفوف؛ إعادة التقديم بعد Rejected محاولة جديدة. |
| **مثال ملموس** | الطالب 136 يتقدم والمقاعد ممتلئة؛ يوافق المشرف فيصبح Queued. ينسحب عضو قبل الموعد فيتحرر مقعد؛ يُعرض على أقدم Queued (Offered، 24 ساعة افتراضيًا)؛ قبوله يجعله Accepted ويثبّت WithdrawalCutoffAtUtc من النسخة الحالية. |
| **ماذا ينكسر لو حُذف أو دُمج** | يضيع حد 135 وقاعدة العضوية الواحدة ومسار الانتظار والانسحاب؛ وهو قلب M1. |
| **المصدر** | §11.2، §15.1 Applications، §15.3، §21.4 D، D25–D28؛ قرارات المالك #4–#11؛ Client/src/workspaces/commands/initiative.js (member.application.*، initiative.application.*، initiative.participant.*) |

### institution.InitiativeApplicationDecision

<a id="institution-initiativeapplicationdecision"></a>

| | |
|---|---|
| **الغرض** | سجل القرارات الإلحاقي لكل طلب: من فعل ماذا، بأي صفة، ولماذا، وتحت أي نسخة شروط. |
| **الميزة وسير العمل** | Decision log في تفاصيل المتقدم، Flag/Escalate من المشرف إلى الممثل، إشعارات القرار، تقارير القبول. |
| **لماذا جدول مستقل** | قرار المالك #9 يطلب حفظ القرارات الجديدة دون محو القديمة، و§15.1 يعرض decision log. الواجهة الحالية تضيف "تنبيه المشرف للممثل" (flags) بحالة حل؛ هو قرار في هذا السجل (Flagged/FlagResolved) لا جدول جديد. ActorCapacity يثبت الصفة المختارة لشخص يحمل عدة أدوار (§23.1). |
| **نوع الصف** | إلحاقي (a) |
| **الأصل في المخطط الحالي** | `institution.InitiativeApplicationDecision` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `ApplicationId` | bigint | لا |  | FK → institution.InitiativeApplication (مركب: ApplicationId, InitiativeId) |
| `InitiativeId` | bigint | لا |  | FK → institution.InitiativeApplication (مركب: ApplicationId, InitiativeId)؛ FK → institution.InitiativeRevision (مركب: TermsRevisionId, InitiativeId) |
| `DecisionNo` | int | لا |  |  |
| `Action` | nvarchar(24) | لا |  |  |
| `FromStatus` | nvarchar(16) | نعم |  |  |
| `ToStatus` | nvarchar(16) | نعم |  |  |
| `ActorPersonId` | bigint | نعم |  | FK → iam.Person |
| `ActorCapacity` | nvarchar(24) | لا |  |  |
| `Reason` | nvarchar(800) | نعم |  |  |
| `TermsRevisionId` | bigint | لا |  | FK → institution.InitiativeRevision (مركب: TermsRevisionId, InitiativeId) |
| `AtUtc` | datetime2(3) | لا |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |

**المفاتيح والقيود والفهارس**

- PK: `PK_InitiativeApplicationDecision (Id)`
- FK: `(ApplicationId, InitiativeId) → institution.InitiativeApplication(Id, InitiativeId)`
- FK: `(TermsRevisionId, InitiativeId) → institution.InitiativeRevision(Id, InitiativeId)`
- FK: `(ActorPersonId) → iam.Person(Id)`
- UNIQUE: `(ApplicationId, DecisionNo)`
- CHECK `CK_InitiativeApplicationDecision_DecisionNo`: `DecisionNo > 0`
- CHECK `CK_InitiativeApplicationDecision_Action`: `Action IN ('Submitted','Approved','Queued','Offered','OfferAccepted','OfferDeclined','OfferExpired','Rejected','Withdrawn','Suspended','Restored','Removed','Completed','Blocked','BlockLifted','Cancelled','Flagged','FlagResolved','CutoffExtended')`
- CHECK `CK_InitiativeApplicationDecision_Capacity`: `ActorCapacity IN ('Applicant','Representative','Supervisor','PlatformAdmin','System')`
- CHECK `CK_InitiativeApplicationDecision_System`: `(ActorCapacity = 'System' AND ActorPersonId IS NULL) OR (ActorCapacity <> 'System' AND ActorPersonId IS NOT NULL)`
- CHECK `CK_InitiativeApplicationDecision_Reason`: `Action NOT IN ('Rejected','Suspended','Restored','Removed','Blocked','BlockLifted','Cancelled','Flagged') OR LEN(TRIM(Reason)) > 0`
- صلاحيات: INSERT/SELECT فقط لدور التشغيل؛ `TR_InitiativeApplicationDecision_Immutable` يمنع UPDATE/DELETE.
- حارس: TR_InitiativeApplicationDecision_Immutable: إلحاقي.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `institution.InitiativeApplication` عبر `ApplicationId, InitiativeId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `institution.InitiativeRevision` عبر `TermsRevisionId, InitiativeId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `iam.Person` عبر `ActorPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: لا شيء.

| | |
|---|---|
| **دورة الحياة والانتقالات** | إلحاقي: صف لكل انتقال أو تنبيه بترقيم DecisionNo متسلسل لكل طلب؛ يُكتب في معاملة الأمر نفسها. |
| **الخصوصية والملكية والتفويض** | المتقدم يرى قراراته وأسبابه؛ الممثل والمشرف يرون كامل السجل. |
| **التاريخ والنسخ والاحتفاظ** | هو التاريخ. |
| **مثال ملموس** | المشرف يضغط Flag: "Age proof unclear"؛ صف Flagged. الممثل يرفض لاحقًا بسبب؛ صف Rejected يغلق التنبيه ضمنيًا. |
| **ماذا ينكسر لو حُذف أو دُمج** | تضيع أسباب الرفض والإيقاف والحظر، ولا يمكن إثبات من وافق في السباق. |
| **المصدر** | §15.1، §15.3، §17 Applications، D25، D26؛ قرار المالك #9؛ Client/src/workspaces/commands/initiative.js (initiative.application.flag) |

---

## coach — برامج المدربين والمجموعات

### coach.CoachProgram

<a id="coach-coachprogram"></a>

| | |
|---|---|
| **الغرض** | برنامج مدرب مستقل بالدعوة فقط، يملكه المدرب. |
| **الميزة وسير العمل** | Programs وBuilder في مساحة Coach، المجموعات المستقلة، Group Garden للمجموعة، الربط الاختياري بمبادرة. |
| **لماذا جدول مستقل** | D19/D24: البرنامج كيان مختلف عن المبادرة بمالك مختلف وقواعد مشاركة مختلفة (دعوة لا تقديم عام). المسودة JSON هنا كما في المبادرة؛ المخطط السابق لم يكن له مكان لمسودة البرنامج. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `coach.CoachProgram` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK؛ FK → coach.ProgramRevision (مركب: CurrentRevisionId, Id) |
| `PublicId` | uniqueidentifier | لا | `NEWSEQUENTIALID()` | UQ — المعرّف الخارجي في الـAPI والروابط |
| `OwnerPersonId` | bigint | لا |  | FK → iam.Person |
| `Status` | nvarchar(16) | لا | `N'Draft'` |  |
| `CurrentRevisionId` | bigint | نعم |  | FK → coach.ProgramRevision (مركب: CurrentRevisionId, Id) |
| `DraftJson` | nvarchar(max) | نعم |  |  |
| `DraftUpdatedAtUtc` | datetime2(3) | نعم |  |  |
| `SuspendedAtUtc` | datetime2(3) | نعم |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_CoachProgram (Id)`
- FK: `(OwnerPersonId) → iam.Person(Id)`
- FK: `(CurrentRevisionId, Id) → coach.ProgramRevision(Id, ProgramId)`
- UNIQUE: `(PublicId)`
- CHECK `CK_CoachProgram_Status`: `Status IN ('Draft','Published','Paused','Suspended','Completed','Archived')`
- CHECK `CK_CoachProgram_Published`: `Status IN ('Draft','Archived') OR CurrentRevisionId IS NOT NULL`
- CHECK `CK_CoachProgram_DraftJson`: `DraftJson IS NULL OR ISJSON(DraftJson) = 1`
- حارس: TR_CoachProgram_OwnerImmutable: المالك لا يتغير.
- حارس: النشر يتطلب VerificationCase(Kind=Coach, Status=Approved) للمالك.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `OwnerPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `coach.ProgramRevision` عبر `CurrentRevisionId, Id`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `coach.ProgramRevision` (ProgramId)، `coach.OperationalGroup` (ProgramId)، `session.Completion` (ProgramId)، `partnership.PartnershipLink` (ProgramId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | Draft → Published ↔ Paused → Completed → Archived؛ Suspended بحوكمة Admin. |
| **الخصوصية والملكية والتفويض** | غير مدرج في Explore العام. يراه المدرب وأعضاؤه وAdmin، والمبادرة المرتبطة بالقدر المتفق عليه. |
| **التاريخ والنسخ والاحتفاظ** | النسخ في ProgramRevision. |
| **مثال ملموس** | مدرب معتمد ينشئ "Reels-free evenings" ثم ينشره؛ لا يظهر في explore.html. |
| **ماذا ينكسر لو حُذف أو دُمج** | يختلط برنامج المدرب بالمبادرة ويضيع مالكه المستقل (D19). |
| **المصدر** | §13، §13.1، §13.2 Programs، D19، D24؛ Client/src/workspaces/builders/program.js |

### coach.ProgramRevision

<a id="coach-programrevision"></a>

| | |
|---|---|
| **الغرض** | نسخة منشورة ثابتة من شروط البرنامج ومراحله. |
| **الميزة وسير العمل** | Publish، صفحة البرنامج للمدعو، قاعدة الإكمال المثبتة. |
| **لماذا جدول مستقل** | §13.2: تغيير البرنامج بعد العمل المرسَل ينشئ نسخة جديدة ولا يعيد كتابة القديمة. المراحل محتوى مرتب داخل نسخة ثابتة ولا يشير إليها أي مفتاح أجنبي، فهي JSON داخل النسخة (كان جدول ProgramStage). تفقد قيود SQL على ترقيم المراحل وتواريخها، ويعوّضها تحقق النشر لأن النسخة لا تتغير بعده. |
| **نوع الصف** | إلحاقي (a) |
| **الأصل في المخطط الحالي** | `coach.ProgramRevision` + يستوعب `coach.ProgramStage` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `ProgramId` | bigint | لا |  | FK → coach.CoachProgram |
| `RevisionNo` | int | لا |  |  |
| `Title` | nvarchar(200) | لا |  |  |
| `Objective` | nvarchar(1200) | لا |  |  |
| `EligibilityText` | nvarchar(800) | نعم |  |  |
| `StartsOnLocalDate` | date | نعم |  |  |
| `EndsOnLocalDate` | date | نعم |  |  |
| `StagesJson` | nvarchar(max) | لا |  |  |
| `DuePolicyRef` | nvarchar(120) | نعم |  |  |
| `CompletionRuleRef` | nvarchar(120) | لا |  |  |
| `ConsentNoticeVersion` | nvarchar(64) | لا |  |  |
| `ChangeReason` | nvarchar(800) | نعم |  |  |
| `PublishedAtUtc` | datetime2(3) | لا |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |

**المفاتيح والقيود والفهارس**

- PK: `PK_ProgramRevision (Id)`
- FK: `(ProgramId) → coach.CoachProgram(Id)`
- UNIQUE: `(Id, ProgramId)`
- UNIQUE: `(ProgramId, RevisionNo)`
- CHECK `CK_ProgramRevision_RevisionNo`: `RevisionNo > 0`
- CHECK `CK_ProgramRevision_Dates`: `EndsOnLocalDate IS NULL OR (StartsOnLocalDate IS NOT NULL AND EndsOnLocalDate >= StartsOnLocalDate)`
- CHECK `CK_ProgramRevision_Stages`: `ISJSON(StagesJson) = 1`
- صلاحيات: INSERT/SELECT فقط لدور التشغيل؛ `TR_ProgramRevision_Immutable` يمنع UPDATE/DELETE.
- حارس: TR_ProgramRevision_Immutable: إلحاقي. بنية StagesJson (ترتيب، عناوين، تواريخ، نسخ الأنشطة) يتحقق منها C# عند النشر.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `coach.CoachProgram` عبر `ProgramId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `coach.CoachProgram` (CurrentRevisionId, Id)، `session.Completion` (ProgramRevisionId, ProgramId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | إلحاقي: تُنشأ عند كل نشر؛ CoachProgram.CurrentRevisionId يشير إلى السارية. |
| **الخصوصية والملكية والتفويض** | للمدرب والأعضاء. |
| **التاريخ والنسخ والاحتفاظ** | كل النسخ تبقى؛ Completion يشير إلى النسخة التي حُكم بها. |
| **مثال ملموس** | النسخة 2 تضيف مرحلة رابعة؛ إكمالات النسخة 1 تبقى مرتبطة بها. |
| **ماذا ينكسر لو حُذف أو دُمج** | تُعاد كتابة قاعدة الإكمال بأثر رجعي. |
| **المصدر** | §13.2، §13.3، D32 |

### coach.OperationalGroup

<a id="coach-operationalgroup"></a>

| | |
|---|---|
| **الغرض** | مجموعة تشغيلية لها أب واحد فقط: مبادرة مؤسسة أو برنامج مدرب مستقل. |
| **الميزة وسير العمل** | Team & Groups، My Groups للمدرب، Students & Groups للمشرف، My Group للطالب. |
| **لماذا جدول مستقل** | D19 و§2.1: لكل مجموعة أب واحد، ولا يُنشأ برنامج مكرر للمجموعة الداخلية. المفتاحان (Id, InitiativeId) و(Id, ProgramId) هدفان لمفاتيح مركبة تمنع خلط العضويات والمهام والمكافآت بين الأبوين. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `coach.OperationalGroup` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `PublicId` | uniqueidentifier | لا | `NEWSEQUENTIALID()` | UQ — المعرّف الخارجي في الـAPI والروابط |
| `InitiativeId` | bigint | نعم |  | FK → institution.Initiative |
| `ProgramId` | bigint | نعم |  | FK → coach.CoachProgram |
| `Name` | nvarchar(160) | لا |  |  |
| `Status` | nvarchar(16) | لا | `N'Open'` |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_OperationalGroup (Id)`
- FK: `(InitiativeId) → institution.Initiative(Id)`
- FK: `(ProgramId) → coach.CoachProgram(Id)`
- UNIQUE: `(PublicId)`
- UNIQUE: `(Id, InitiativeId)`
- UNIQUE: `(Id, ProgramId)`
- CHECK `CK_OperationalGroup_Parent`: `(InitiativeId IS NOT NULL AND ProgramId IS NULL) OR (InitiativeId IS NULL AND ProgramId IS NOT NULL)`
- CHECK `CK_OperationalGroup_Status`: `Status IN ('Open','Closed','Archived')`
- حارس: TR_OperationalGroup_ParentImmutable: الأب لا يتغير.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `institution.Initiative` عبر `InitiativeId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `coach.CoachProgram` عبر `ProgramId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `evidence.GroupRewardEntry` (GroupId, ProgramId)، `coach.GroupMembership` (GroupId | GroupId, InitiativeId | GroupId, ProgramId)، `coach.GroupCoachAssignment` (GroupId | GroupId, InitiativeId)، `task.Assignment` (GroupId)، `task.OperationalReport` (GroupId | GroupId, InitiativeId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | Open → Closed → Archived. |
| **الخصوصية والملكية والتفويض** | الطاقم المخول؛ الطالب يرى مجموعته فقط. |
| **التاريخ والنسخ والاحتفاظ** | لا تُحذف؛ العضويات والمهام تشير إليها. |
| **مثال ملموس** | المشرف ينشئ "Circle B" في المبادرة وينقل إليها 12 طالبًا مقبولًا. |
| **ماذا ينكسر لو حُذف أو دُمج** | لا أساس لمحرك المهام المشترك ولا لتوزيع الطلاب والمدربين (D29). |
| **المصدر** | §2.1، §13.1، §15.1 Team، §17، D19، D29 |

### coach.GroupMembership

<a id="coach-groupmembership"></a>

| | |
|---|---|
| **الغرض** | فترة انتماء شخص إلى مجموعة تشغيلية: تسكين طالب مقبول في مجموعة مبادرة، أو دعوة ثم عضوية في مجموعة مدرب مستقل. |
| **الميزة وسير العمل** | التسكين والنقل بين المجموعات، Invitations tab للمدرب (البريد، الانتهاء، إعادة الإرسال، السحب)، My Group للطالب، مستلمو المهام، أعضاء الحديقة الجماعية. |
| **لماذا جدول مستقل** | ثلاثة جداول سابقة (تسكين المبادرة، عضوية البرنامج، دعوة البرنامج) تصف حقيقة واحدة: "هذا الشخص في هذه المجموعة في هذه الفترة". محرك المهام المشترك (D19) يقرأ الآن جدولًا واحدًا لمعرفة الأعضاء. الأب مكتوب بمفاتيح مركبة حقيقية، وتسكين المبادرة مربوط بالطلب المقبول نفسه (ApplicationId, InitiativeId, PersonId). تُحفظ كل فترة كصف، فيبقى تاريخ النقل (§17). وتُصلح قيدًا سابقًا كان يمنع الشخص من العودة إلى مجموعة غادرها. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `coach.ProgramGroupMembership` + يستوعب `coach.InitiativeGroupPlacement`، `coach.ProgramGroupInvitation` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `GroupId` | bigint | لا |  | FK → coach.OperationalGroup؛ FK → coach.OperationalGroup (مركب: GroupId, InitiativeId)؛ FK → coach.OperationalGroup (مركب: GroupId, ProgramId) |
| `InitiativeId` | bigint | نعم |  | FK → coach.OperationalGroup (مركب: GroupId, InitiativeId)؛ FK → institution.InitiativeApplication (مركب: ApplicationId, InitiativeId, PersonId) |
| `ProgramId` | bigint | نعم |  | FK → coach.OperationalGroup (مركب: GroupId, ProgramId) |
| `ApplicationId` | bigint | نعم |  | FK → institution.InitiativeApplication (مركب: ApplicationId, InitiativeId, PersonId) |
| `PersonId` | bigint | نعم |  | FK → institution.InitiativeApplication (مركب: ApplicationId, InitiativeId, PersonId)؛ FK → iam.Person |
| `Status` | nvarchar(16) | لا |  |  |
| `NormalizedEmail` | nvarchar(320) | نعم |  |  |
| `TokenHash` | varbinary(64) | نعم |  |  |
| `InviteExpiresAtUtc` | datetime2(3) | نعم |  |  |
| `InvitedByPersonId` | bigint | نعم |  | FK → iam.Person |
| `StartedAtUtc` | datetime2(3) | نعم |  |  |
| `EndedAtUtc` | datetime2(3) | نعم |  |  |
| `EndReason` | nvarchar(24) | نعم |  |  |
| `ChangedByPersonId` | bigint | نعم |  | FK → iam.Person |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_GroupMembership (Id)`
- FK: `(GroupId) → coach.OperationalGroup(Id)`
- FK: `(GroupId, InitiativeId) → coach.OperationalGroup(Id, InitiativeId)`
- FK: `(GroupId, ProgramId) → coach.OperationalGroup(Id, ProgramId)`
- FK: `(ApplicationId, InitiativeId, PersonId) → institution.InitiativeApplication(Id, InitiativeId, PersonId)`
- FK: `(PersonId) → iam.Person(Id)`
- FK: `(InvitedByPersonId) → iam.Person(Id)`
- FK: `(ChangedByPersonId) → iam.Person(Id)`
- UNIQUE: `(ApplicationId) WHERE ApplicationId IS NOT NULL AND Status = 'Active'` (فهرس فريد مفلتر)
- UNIQUE: `(GroupId, PersonId) WHERE Status = 'Active'` (فهرس فريد مفلتر)
- UNIQUE: `(GroupId, NormalizedEmail) WHERE Status = 'Invited'` (فهرس فريد مفلتر)
- UNIQUE: `(TokenHash) WHERE TokenHash IS NOT NULL` (فهرس فريد مفلتر)
- INDEX: `(PersonId) WHERE Status = 'Active'`
- CHECK `CK_GroupMembership_Parent`: `(InitiativeId IS NOT NULL AND ProgramId IS NULL AND ApplicationId IS NOT NULL AND PersonId IS NOT NULL AND NormalizedEmail IS NULL) OR (InitiativeId IS NULL AND ProgramId IS NOT NULL AND ApplicationId IS NULL)`
- CHECK `CK_GroupMembership_Status`: `Status IN ('Invited','Active','Ended','Declined','Expired','Revoked')`
- CHECK `CK_GroupMembership_Invited`: `Status <> 'Invited' OR (ProgramId IS NOT NULL AND PersonId IS NULL AND NormalizedEmail IS NOT NULL AND TokenHash IS NOT NULL AND InviteExpiresAtUtc IS NOT NULL AND InvitedByPersonId IS NOT NULL)`
- CHECK `CK_GroupMembership_Active`: `Status <> 'Active' OR (PersonId IS NOT NULL AND StartedAtUtc IS NOT NULL AND EndedAtUtc IS NULL)`
- CHECK `CK_GroupMembership_Ended`: `Status <> 'Ended' OR (EndedAtUtc IS NOT NULL AND EndReason IS NOT NULL AND EndedAtUtc >= StartedAtUtc)`
- CHECK `CK_GroupMembership_EndReason`: `EndReason IS NULL OR EndReason IN ('Transferred','Removed','Left','Completed','Withdrawn','Suspended','InitiativeEnded','ProgramEnded')`
- حارس: TR_GroupMembership_InitiativeSeat: صف مبادرة Active يتطلب أن يكون طلبه Accepted.
- حارس: proc coach.TransferMember: ينهي الصف الحالي (Transferred) وينشئ صفًا جديدًا في المجموعة الأخرى في معاملة واحدة؛ المقعد لا يتغير.
- حارس: proc coach.AcceptGroupInvitation: يطابق البريد الموثّق، يرفض المنتهي، ويحوّل Invited → Active على الصف نفسه.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `coach.OperationalGroup` عبر `GroupId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `coach.OperationalGroup` عبر `GroupId, InitiativeId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `coach.OperationalGroup` عبر `GroupId, ProgramId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `institution.InitiativeApplication` عبر `ApplicationId, InitiativeId, PersonId`؛ وكل صف هناك يقابله صفر أو واحد ضمن (ApplicationId IS NOT NULL AND Status = 'Active')، وكثير خارجه هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `iam.Person` عبر `PersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `iam.Person` عبر `InvitedByPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `iam.Person` عبر `ChangedByPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: لا شيء.

| | |
|---|---|
| **دورة الحياة والانتقالات** | برنامج: Invited → Active \| Declined \| Expired \| Revoked؛ Active → Ended. مبادرة: Active → Ended (Transferred/Removed/Withdrawn/Completed/InitiativeEnded). |
| **الخصوصية والملكية والتفويض** | العضو يرى مجموعته؛ المدرب المعيَّن والمشرف والممثل يرون أعضاء نطاقهم؛ لا يُكشف أعضاء آخرون في معاينة الدعوة. |
| **التاريخ والنسخ والاحتفاظ** | الصفوف المنتهية تبقى؛ التقارير والمراجعات القديمة تبقى منسوبة. |
| **مثال ملموس** | نقل طالب من Circle A إلى Circle B: الصف القديم Ended (Transferred) وصف جديد Active؛ المقعد واحد ومراجعات المدرب القديم باقية. |
| **ماذا ينكسر لو حُذف أو دُمج** | لا يعرف محرك المهام من يستحق المهمة، ويضيع تاريخ النقل ومسار دعوة الطالب المدعو. |
| **المصدر** | §13.1، §13.2 (Invitations tab)، §14، §17، D19، D23، D29؛ Client/src/workspaces/commands/mentorship.js، initiative.js (initiative.group.allocate) |

### coach.GroupCoachAssignment

<a id="coach-groupcoachassignment"></a>

| | |
|---|---|
| **الغرض** | فترة مسؤولية مدرب عن مجموعة. |
| **الميزة وسير العمل** | Allocate active Coaches، My Groups وMy Students للمدرب، التسليم عند الاستبدال. |
| **لماذا جدول مستقل** | المدرب يرى فقط مجموعاته المعيّنة (D31)، والاستبدال يغيّر المسؤولية المستقبلية مع حفظ التأليف السابق والتسليم (§13.1). المفتاح المركب يمنع إسناد تعيين مبادرة أخرى. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `coach.GroupCoachAssignment` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `GroupId` | bigint | لا |  | FK → coach.OperationalGroup؛ FK → coach.OperationalGroup (مركب: GroupId, InitiativeId) |
| `InitiativeId` | bigint | نعم |  | FK → coach.OperationalGroup (مركب: GroupId, InitiativeId)؛ FK → org.StaffAppointment (مركب: StaffAppointmentId, InitiativeId) |
| `CoachPersonId` | bigint | لا |  | FK → iam.Person |
| `StaffAppointmentId` | bigint | نعم |  | FK → org.StaffAppointment (مركب: StaffAppointmentId, InitiativeId) |
| `AssignedByPersonId` | bigint | لا |  | FK → iam.Person |
| `FromUtc` | datetime2(3) | لا |  |  |
| `ToUtc` | datetime2(3) | نعم |  |  |
| `HandoverNote` | nvarchar(1000) | نعم |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_GroupCoachAssignment (Id)`
- FK: `(GroupId) → coach.OperationalGroup(Id)`
- FK: `(GroupId, InitiativeId) → coach.OperationalGroup(Id, InitiativeId)`
- FK: `(StaffAppointmentId, InitiativeId) → org.StaffAppointment(Id, InitiativeId)`
- FK: `(CoachPersonId) → iam.Person(Id)`
- FK: `(AssignedByPersonId) → iam.Person(Id)`
- UNIQUE: `(GroupId, CoachPersonId) WHERE ToUtc IS NULL` (فهرس فريد مفلتر)
- CHECK `CK_GroupCoachAssignment_Scope`: `(InitiativeId IS NOT NULL AND StaffAppointmentId IS NOT NULL) OR (InitiativeId IS NULL AND StaffAppointmentId IS NULL)`
- CHECK `CK_GroupCoachAssignment_Times`: `ToUtc IS NULL OR ToUtc >= FromUtc`
- حارس: TR_GroupCoachAssignment_Owner: في المبادرة التعيين يجب أن يكون Coach نشطًا للشخص نفسه؛ في البرنامج المدرب = مالك البرنامج.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `coach.OperationalGroup` عبر `GroupId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `coach.OperationalGroup` عبر `GroupId, InitiativeId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `org.StaffAppointment` عبر `StaffAppointmentId, InitiativeId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `CoachPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `AssignedByPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: لا شيء.

| | |
|---|---|
| **دورة الحياة والانتقالات** | نشطة حتى ToUtc. |
| **الخصوصية والملكية والتفويض** | الطاقم المخول والمدرب. |
| **التاريخ والنسخ والاحتفاظ** | الفترات المنتهية تبقى لتفسير من راجع ماذا. |
| **مثال ملموس** | المشرف يستبدل المدرب أ بالمدرب ب: يُغلق صف أ بـToUtc وHandoverNote، ويُفتح صف ب. |
| **ماذا ينكسر لو حُذف أو دُمج** | لا حدود لصلاحية المدرب على الطلاب ولا تاريخ للتسليم. |
| **المصدر** | §13.1، §15.1، §17 Coaches، D29، D31، D33 |

---

## task — محرك المهام والتقارير

### task.Assignment

<a id="task-assignment"></a>

| | |
|---|---|
| **الغرض** | مهمة مدرب لمجموعة (أو طلاب مختارين منها) في المحرك المشترك بين المبادرة والبرنامج. |
| **الميزة وسير العمل** | Tasks للمدرب، My Tasks للطالب المدعو، Activities → Assigned للفرد الكامل. |
| **لماذا جدول مستقل** | محرك واحد بسياقين (D19): الهوية الثابتة للمهمة يشير إليها المستلمون والنسخ. التعديل بعد النشر نسخة جديدة. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `task.Assignment` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK؛ FK → task.AssignmentRevision (مركب: CurrentRevisionId, Id) |
| `PublicId` | uniqueidentifier | لا | `NEWSEQUENTIALID()` | UQ — المعرّف الخارجي في الـAPI والروابط |
| `GroupId` | bigint | لا |  | FK → coach.OperationalGroup |
| `AuthorPersonId` | bigint | لا |  | FK → iam.Person |
| `Status` | nvarchar(16) | لا | `N'Draft'` |  |
| `CurrentRevisionId` | bigint | نعم |  | FK → task.AssignmentRevision (مركب: CurrentRevisionId, Id) |
| `CancelledAtUtc` | datetime2(3) | نعم |  |  |
| `CancelReason` | nvarchar(800) | نعم |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_Assignment (Id)`
- FK: `(GroupId) → coach.OperationalGroup(Id)`
- FK: `(AuthorPersonId) → iam.Person(Id)`
- FK: `(CurrentRevisionId, Id) → task.AssignmentRevision(Id, AssignmentId)`
- UNIQUE: `(PublicId)`
- CHECK `CK_Assignment_Status`: `Status IN ('Draft','Published','Cancelled','Closed')`
- CHECK `CK_Assignment_Published`: `Status = 'Draft' OR CurrentRevisionId IS NOT NULL`
- CHECK `CK_Assignment_Cancelled`: `(Status = 'Cancelled' AND CancelledAtUtc IS NOT NULL AND LEN(TRIM(CancelReason)) > 0) OR (Status <> 'Cancelled' AND CancelledAtUtc IS NULL)`
- حارس: المؤلف يجب أن يكون مدربًا نشطًا للمجموعة لحظة النشر (GroupCoachAssignment مفتوح).

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `coach.OperationalGroup` عبر `GroupId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `AuthorPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `task.AssignmentRevision` عبر `CurrentRevisionId, Id`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `task.AssignmentRevision` (AssignmentId)، `task.AssignmentRecipient` (AssignmentId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | Draft → Published → Closed؛ Published → Cancelled بسبب. |
| **الخصوصية والملكية والتفويض** | المدرب والطاقم المخول والمستلمون. |
| **التاريخ والنسخ والاحتفاظ** | لا تُحذف؛ الإلغاء يحفظ العمل السابق. |
| **مثال ملموس** | المدرب يكلّف المجموعة بـ"Depth Practice level 1" مع موعد الخميس. |
| **ماذا ينكسر لو حُذف أو دُمج** | لا يوجد محرك مهام مشترك. |
| **المصدر** | §13.2 Assignments، §13.3، D19، D31، D32 |

### task.AssignmentRevision

<a id="task-assignmentrevision"></a>

| | |
|---|---|
| **الغرض** | نسخة منشورة من تعليمات المهمة ونشاطها ونافذتها وطريقة مراجعتها. |
| **الميزة وسير العمل** | Reschedule/تعديل مستقبلي مع إشعار، عرض النسخة التي أُرسل عليها العمل. |
| **لماذا جدول مستقل** | §13.2: التغيير بعد إرسال عمل يُنشئ نسخة جديدة ولا يعيد كتابة النسخة المرسَلة؛ كل إرسال يُثبَّت على نسخته. |
| **نوع الصف** | إلحاقي (a) |
| **الأصل في المخطط الحالي** | `task.AssignmentRevision` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `AssignmentId` | bigint | لا |  | FK → task.Assignment |
| `RevisionNo` | int | لا |  |  |
| `Title` | nvarchar(200) | لا |  |  |
| `PracticeVersionId` | bigint | نعم |  | FK → activity.PracticeVersion |
| `Instructions` | nvarchar(max) | لا |  |  |
| `ReviewMode` | nvarchar(16) | لا |  |  |
| `IsRequired` | bit | لا |  |  |
| `StartsAtUtc` | datetime2(3) | نعم |  |  |
| `DueAtUtc` | datetime2(3) | نعم |  |  |
| `AllowLate` | bit | لا | `0` |  |
| `ChangeReason` | nvarchar(800) | نعم |  |  |
| `PublishedAtUtc` | datetime2(3) | لا |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |

**المفاتيح والقيود والفهارس**

- PK: `PK_AssignmentRevision (Id)`
- FK: `(AssignmentId) → task.Assignment(Id)`
- FK: `(PracticeVersionId) → activity.PracticeVersion(Id)`
- UNIQUE: `(Id, AssignmentId)`
- UNIQUE: `(AssignmentId, RevisionNo)`
- CHECK `CK_AssignmentRevision_RevisionNo`: `RevisionNo > 0`
- CHECK `CK_AssignmentRevision_ReviewMode`: `ReviewMode IN ('SystemRule','CoachReview')`
- CHECK `CK_AssignmentRevision_Window`: `DueAtUtc IS NULL OR StartsAtUtc IS NULL OR DueAtUtc > StartsAtUtc`
- صلاحيات: INSERT/SELECT فقط لدور التشغيل؛ `TR_AssignmentRevision_Immutable` يمنع UPDATE/DELETE.
- حارس: TR_AssignmentRevision_Immutable: إلحاقي.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `task.Assignment` عبر `AssignmentId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `activity.PracticeVersion` عبر `PracticeVersionId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `task.Assignment` (CurrentRevisionId, Id)، `task.AssignmentRecipient` (AssignedRevisionId, AssignmentId)، `task.SubmissionAttempt` (AssignmentRevisionId, AssignmentId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | إلحاقي: تُنشأ عند النشر وعند كل تعديل أو إعادة جدولة؛ Assignment.CurrentRevisionId يشير إلى السارية والمستلم يحتفظ بنسخة إسناده. |
| **الخصوصية والملكية والتفويض** | كالمهمة: المدرب والطاقم المخول والمستلمون فقط. |
| **التاريخ والنسخ والاحتفاظ** | كل النسخ تبقى. |
| **مثال ملموس** | تمديد الموعد يوم واحد: النسخة 2 بـChangeReason؛ الإرسالات السابقة تبقى على النسخة 1. |
| **ماذا ينكسر لو حُذف أو دُمج** | تتغير تعليمات عمل سبق إرساله. |
| **المصدر** | §13.2، §13.3، D32 |

### task.AssignmentRecipient

<a id="task-assignmentrecipient"></a>

| | |
|---|---|
| **الغرض** | حالة المهمة لشخص واحد. |
| **الميزة وسير العمل** | My Tasks، Activities → Assigned، طابور المراجعة، Overdue المشتق، تقارير المدرب. |
| **لماذا جدول مستقل** | الحالة شخصية لكل مستلم (Needs Revision لواحد، Approved لآخر)، والإرسالات تتبع المستلم. Overdue مشتق من الموعد والحالة ولا يُخزَّن. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `task.AssignmentRecipient` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `AssignmentId` | bigint | لا |  | FK → task.Assignment؛ FK → task.AssignmentRevision (مركب: AssignedRevisionId, AssignmentId) |
| `PersonId` | bigint | لا |  | FK → iam.Person |
| `AssignedRevisionId` | bigint | لا |  | FK → task.AssignmentRevision (مركب: AssignedRevisionId, AssignmentId) |
| `Status` | nvarchar(16) | لا | `N'Assigned'` |  |
| `LastAttemptNo` | int | لا | `0` |  |
| `AssignedAtUtc` | datetime2(3) | لا |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_AssignmentRecipient (Id)`
- FK: `(AssignmentId) → task.Assignment(Id)`
- FK: `(PersonId) → iam.Person(Id)`
- FK: `(AssignedRevisionId, AssignmentId) → task.AssignmentRevision(Id, AssignmentId)`
- UNIQUE: `(Id, AssignmentId, PersonId)`
- UNIQUE: `(AssignmentId, PersonId)`
- INDEX: `(PersonId, Status)`
- CHECK `CK_AssignmentRecipient_Status`: `Status IN ('Assigned','InProgress','Submitted','NeedsRevision','Approved','Rejected','Cancelled','Expired')`
- CHECK `CK_AssignmentRecipient_Attempts`: `LastAttemptNo >= 0`
- حارس: TR_AssignmentRecipient_Member: المستلم عضو Active في المجموعة لحظة الإسناد (coach.GroupMembership).

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `task.Assignment` عبر `AssignmentId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `PersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `task.AssignmentRevision` عبر `AssignedRevisionId, AssignmentId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `task.SubmissionAttempt` (RecipientId, AssignmentId, PersonId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | Assigned → InProgress → Submitted → Approved \| NeedsRevision (→ Submitted) \| Rejected؛ Cancelled؛ Expired. |
| **الخصوصية والملكية والتفويض** | الطالب نفسه، المدرب المعيّن، المشرف/الممثل كملخص. |
| **التاريخ والنسخ والاحتفاظ** | الانتقالات تُستنتج من SubmissionAttempt وReviewDecision. |
| **مثال ملموس** | طالب يرسل ثم يُطلب منه تعديل؛ Status=NeedsRevision وLastAttemptNo=1. |
| **ماذا ينكسر لو حُذف أو دُمج** | لا حالة لكل طالب ولا طابور مراجعة. |
| **المصدر** | §13.3، §14 My Tasks، D32 |

### task.SubmissionAttempt

<a id="task-submissionattempt"></a>

| | |
|---|---|
| **الغرض** | إرسال واحد ثابت لعمل مهمة، مع نصه أو ملفه أو محاولة الممارسة التي تثبته. |
| **الميزة وسير العمل** | Submit/Resubmit، Review history، "previous attempts". |
| **لماذا جدول مستقل** | D32: تاريخ إرسال غير قابل للتغيير بما فيه التعديل والرفض. الربط بـPracticeAttempt يسمح لممارسة مسجلة نظاميًا أن تكون دليل المهمة دون تكرار. |
| **نوع الصف** | إلحاقي (a) |
| **الأصل في المخطط الحالي** | `task.SubmissionAttempt` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `RecipientId` | bigint | لا |  | FK → task.AssignmentRecipient (مركب: RecipientId, AssignmentId, PersonId) |
| `AssignmentId` | bigint | لا |  | FK → task.AssignmentRecipient (مركب: RecipientId, AssignmentId, PersonId)؛ FK → task.AssignmentRevision (مركب: AssignmentRevisionId, AssignmentId) |
| `PersonId` | bigint | لا |  | FK → task.AssignmentRecipient (مركب: RecipientId, AssignmentId, PersonId)؛ FK → activity.PracticeAttempt (مركب: PracticeAttemptId, PersonId) |
| `AttemptNo` | int | لا |  |  |
| `AssignmentRevisionId` | bigint | لا |  | FK → task.AssignmentRevision (مركب: AssignmentRevisionId, AssignmentId) |
| `Body` | nvarchar(max) | نعم |  |  |
| `FileId` | bigint | نعم |  | FK → files.SecureFile |
| `PracticeAttemptId` | bigint | نعم |  | FK → activity.PracticeAttempt (مركب: PracticeAttemptId, PersonId) |
| `SubmittedAtUtc` | datetime2(3) | لا |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |

**المفاتيح والقيود والفهارس**

- PK: `PK_SubmissionAttempt (Id)`
- FK: `(RecipientId, AssignmentId, PersonId) → task.AssignmentRecipient(Id, AssignmentId, PersonId)`
- FK: `(AssignmentRevisionId, AssignmentId) → task.AssignmentRevision(Id, AssignmentId)`
- FK: `(PracticeAttemptId, PersonId) → activity.PracticeAttempt(Id, PersonId)`
- FK: `(FileId) → files.SecureFile(Id)`
- UNIQUE: `(RecipientId, AttemptNo)`
- UNIQUE: `(PracticeAttemptId) WHERE PracticeAttemptId IS NOT NULL` (فهرس فريد مفلتر)
- CHECK `CK_SubmissionAttempt_AttemptNo`: `AttemptNo > 0`
- CHECK `CK_SubmissionAttempt_Content`: `Body IS NOT NULL OR FileId IS NOT NULL OR PracticeAttemptId IS NOT NULL`
- صلاحيات: INSERT/SELECT فقط لدور التشغيل؛ `TR_SubmissionAttempt_Immutable` يمنع UPDATE/DELETE.
- حارس: TR_SubmissionAttempt_Guard: المستلم مؤهل (ليس Approved/Rejected/Cancelled)، والملف يملكه المرسل، والإدراج يحدّث LastAttemptNo في المعاملة نفسها.
- حارس: TR_SubmissionAttempt_Immutable: إلحاقي.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `task.AssignmentRecipient` عبر `RecipientId, AssignmentId, PersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `task.AssignmentRevision` عبر `AssignmentRevisionId, AssignmentId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `activity.PracticeAttempt` عبر `PracticeAttemptId, PersonId`؛ وكل صف هناك يقابله صفر أو واحد ضمن (PracticeAttemptId IS NOT NULL)، وكثير خارجه هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `files.SecureFile` عبر `FileId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `task.ReviewDecision` (AttemptId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | إلحاقي: AttemptNo متسلسل لكل مستلم؛ إعادة الإرسال بعد NeedsRevision صف جديد. |
| **الخصوصية والملكية والتفويض** | الطالب والمدرب المعيّن؛ الملف عبر SecureFile بقارئ محدد. |
| **التاريخ والنسخ والاحتفاظ** | كل المحاولات تبقى. |
| **مثال ملموس** | المحاولة 2 بعد Needs Revision تحمل نصًا معدلًا وتبقى المحاولة 1 كما هي. |
| **ماذا ينكسر لو حُذف أو دُمج** | يُفقد تاريخ التعديلات وتصبح المراجعة غير قابلة للتدقيق. |
| **المصدر** | §13.3، D32 |

### task.ReviewDecision

<a id="task-reviewdecision"></a>

| | |
|---|---|
| **الغرض** | قرار مراجعة واحد على إرسال: موافقة، طلب تعديل، أو رفض، مع ملاحظة مرئية للطالب. |
| **الميزة وسير العمل** | Reviews للمدرب، Review history للطالب، نمو فئة الممارسة ومساهمة الحديقة الجماعية بعد الموافقة. |
| **لماذا جدول مستقل** | D32/D33: القرار سجل مستقل مُسند، والتصحيح قرار جديد يحل محل السابق بدل تعديله. الموافقة تنتج حدث دليل واحدًا. |
| **نوع الصف** | إلحاقي (a) |
| **الأصل في المخطط الحالي** | `task.ReviewDecision` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `AttemptId` | bigint | لا |  | FK → task.SubmissionAttempt؛ FK → task.ReviewDecision (مركب: SupersedesId, AttemptId) |
| `DecisionNo` | int | لا |  |  |
| `SupersedesId` | bigint | نعم |  | FK → task.ReviewDecision (مركب: SupersedesId, AttemptId) |
| `ReviewerPersonId` | bigint | نعم |  | FK → iam.Person |
| `RuleVersion` | nvarchar(64) | نعم |  |  |
| `Decision` | nvarchar(16) | لا |  |  |
| `Feedback` | nvarchar(2000) | نعم |  |  |
| `EvidenceEventId` | bigint | نعم |  | FK → evidence.EvidenceEvent |
| `DecidedAtUtc` | datetime2(3) | لا |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |

**المفاتيح والقيود والفهارس**

- PK: `PK_ReviewDecision (Id)`
- FK: `(AttemptId) → task.SubmissionAttempt(Id)`
- FK: `(SupersedesId, AttemptId) → task.ReviewDecision(Id, AttemptId)`
- FK: `(ReviewerPersonId) → iam.Person(Id)`
- FK: `(EvidenceEventId) → evidence.EvidenceEvent(Id)`
- UNIQUE: `(Id, AttemptId)`
- UNIQUE: `(AttemptId, DecisionNo)`
- UNIQUE: `(SupersedesId) WHERE SupersedesId IS NOT NULL` (فهرس فريد مفلتر)
- UNIQUE: `(EvidenceEventId) WHERE EvidenceEventId IS NOT NULL` (فهرس فريد مفلتر)
- CHECK `CK_ReviewDecision_DecisionNo`: `DecisionNo > 0`
- CHECK `CK_ReviewDecision_Decision`: `Decision IN ('Approved','NeedsRevision','Rejected')`
- CHECK `CK_ReviewDecision_Reviewer`: `ReviewerPersonId IS NOT NULL OR RuleVersion IS NOT NULL`
- CHECK `CK_ReviewDecision_Evidence`: `EvidenceEventId IS NULL OR Decision = 'Approved'`
- صلاحيات: INSERT/SELECT فقط لدور التشغيل؛ `TR_ReviewDecision_Immutable` يمنع UPDATE/DELETE.
- حارس: TR_ReviewDecision_Guard: المراجع مدرب معيّن للمجموعة وقت القرار؛ دليل الموافقة يخص مستلم الإرسال.
- حارس: TR_ReviewDecision_Immutable: إلحاقي.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `task.SubmissionAttempt` عبر `AttemptId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `task.ReviewDecision` عبر `SupersedesId, AttemptId`؛ وكل صف هناك يقابله صفر أو واحد ضمن (SupersedesId IS NOT NULL)، وكثير خارجه هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `iam.Person` عبر `ReviewerPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `evidence.EvidenceEvent` عبر `EvidenceEventId`؛ وكل صف هناك يقابله صفر أو واحد ضمن (EvidenceEventId IS NOT NULL)، وكثير خارجه هنا.
- واردة: `task.ReviewDecision` (SupersedesId, AttemptId)، `task.ReviewPrivateNote` (DecisionId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | إلحاقي؛ SupersedesId لتصحيح قرار سابق. |
| **الخصوصية والملكية والتفويض** | Feedback للطالب والطاقم؛ الملاحظة الداخلية في ReviewPrivateNote. |
| **التاريخ والنسخ والاحتفاظ** | كل القرارات تبقى. |
| **مثال ملموس** | المدرب يوافق على المحاولة 2؛ يُنشأ EvidenceEvent(SourceContext=ReviewDecision) ثم مكافأة شخصية ومساهمة جماعية مرة واحدة. |
| **ماذا ينكسر لو حُذف أو دُمج** | لا تاريخ مراجعة ولا مصدر مكافأة للمهام. |
| **المصدر** | §13.3، §9.2، D32، D33 |

### task.ReviewPrivateNote

<a id="task-reviewprivatenote"></a>

| | |
|---|---|
| **الغرض** | ملاحظة داخلية مرتبطة بقرار مراجعة لا يقرؤها الطالب. |
| **الميزة وسير العمل** | حقل "Supervisor-only note" في Reviews. |
| **لماذا جدول مستقل** | D33 و§13.3: الملاحظة للطالب والملاحظة الداخلية حقلان بقراء مختلفين. الفصل الفيزيائي يجعل استعلام قرارات الطالب لا يحمل الملاحظة الداخلية أبدًا، ويسمح بصلاحية جدول مختلفة. |
| **نوع الصف** | إلحاقي (a) |
| **الأصل في المخطط الحالي** | `task.ReviewPrivateNote` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `DecisionId` | bigint | لا |  | FK → task.ReviewDecision |
| `AuthorPersonId` | bigint | لا |  | FK → iam.Person |
| `Note` | nvarchar(max) | لا |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |

**المفاتيح والقيود والفهارس**

- PK: `PK_ReviewPrivateNote (Id)`
- FK: `(DecisionId) → task.ReviewDecision(Id)`
- FK: `(AuthorPersonId) → iam.Person(Id)`
- صلاحيات: INSERT/SELECT فقط لدور التشغيل؛ `TR_ReviewPrivateNote_Immutable` يمنع UPDATE/DELETE.
- حارس: TR_ReviewPrivateNote_Immutable: إلحاقي. لا يُعرض في أي DTO للطالب.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `task.ReviewDecision` عبر `DecisionId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `AuthorPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: لا شيء.

| | |
|---|---|
| **دورة الحياة والانتقالات** | إلحاقي: ملاحظة أو أكثر لكل قرار؛ لا تعديل ولا حذف. |
| **الخصوصية والملكية والتفويض** | المدرب المؤلف والمشرف والممثل في النطاق؛ ليس الطالب. |
| **التاريخ والنسخ والاحتفاظ** | تبقى مع قرارها؛ نقل المدرب لا يمحو ملاحظاته. |
| **مثال ملموس** | المدرب يكتب: "Possible copied text, discuss in next session". |
| **ماذا ينكسر لو حُذف أو دُمج** | تتسرب ملاحظات داخلية إلى الطالب عند أي تحميل عام لقرار المراجعة. |
| **المصدر** | §13.3، D33 |

### task.OperationalReport

<a id="task-operationalreport"></a>

| | |
|---|---|
| **الغرض** | تقرير تشغيلي دوري مؤلف بشريًا مع لقطة مقاييس محسوبة من السجلات: تقرير مدرب، ملخص مشرف مبادرة، أو تقرير إغلاق مشرف المزوّد. |
| **الميزة وسير العمل** | Reports للمدرب، Supervisor Reports/Insights (مراجعة تقرير المدرب واختيار ما يُضمَّن)، Report inbox للممثل (Issues، المرفقات، التصدير)، تقارير المزوّد. |
| **لماذا جدول مستقل** | تقرير المدرب وملخص المشرف وتقرير الإغلاق لها الأعمدة نفسها ودورة الحياة نفسها (مسودة ثم إرسال ثابت) وسلسلة القراء نفسها (§15.4: Coach Reports → Supervisor Summary → Representative). علاقة "ضُمّن في الملخص" صارت مفتاحًا ذاتيًا مركبًا يضمن المبادرة نفسها، ومراجعة المشرف للتقرير (ملاحظة/تصحيح بجانب كلمات المدرب) موجودة في الواجهة الحالية ولم يكن لها مكان في المخطط السابق، ولا لتقرير إغلاق مزوّد. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `task.CoachReport` + يستوعب `task.SupervisorReport` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `PublicId` | uniqueidentifier | لا | `NEWSEQUENTIALID()` | UQ — المعرّف الخارجي في الـAPI والروابط |
| `Kind` | nvarchar(24) | لا |  |  |
| `GroupId` | bigint | نعم |  | FK → coach.OperationalGroup؛ FK → coach.OperationalGroup (مركب: GroupId, InitiativeId) |
| `InitiativeId` | bigint | نعم |  | FK → coach.OperationalGroup (مركب: GroupId, InitiativeId)؛ FK → institution.Initiative؛ FK → task.OperationalReport (مركب: IncludedInReportId, InitiativeId) |
| `ExperienceId` | bigint | نعم |  | FK → provider.Experience |
| `AuthorPersonId` | bigint | لا |  | FK → iam.Person |
| `PeriodStartDate` | date | لا |  |  |
| `PeriodEndDate` | date | لا |  |  |
| `Status` | nvarchar(16) | لا | `N'Draft'` |  |
| `MetricsSnapshotJson` | nvarchar(max) | نعم |  |  |
| `Observations` | nvarchar(max) | نعم |  |  |
| `Issues` | nvarchar(max) | نعم |  |  |
| `Recommendations` | nvarchar(max) | نعم |  |  |
| `SubmittedAtUtc` | datetime2(3) | نعم |  |  |
| `IncludedInReportId` | bigint | نعم |  | FK → task.OperationalReport (مركب: IncludedInReportId, InitiativeId) |
| `ReviewedByPersonId` | bigint | نعم |  | FK → iam.Person |
| `ReviewNote` | nvarchar(2000) | نعم |  |  |
| `ReviewCorrection` | nvarchar(2000) | نعم |  |  |
| `ReviewedAtUtc` | datetime2(3) | نعم |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_OperationalReport (Id)`
- FK: `(GroupId) → coach.OperationalGroup(Id)`
- FK: `(GroupId, InitiativeId) → coach.OperationalGroup(Id, InitiativeId)`
- FK: `(InitiativeId) → institution.Initiative(Id)`
- FK: `(ExperienceId) → provider.Experience(Id)`
- FK: `(IncludedInReportId, InitiativeId) → task.OperationalReport(Id, InitiativeId)`
- FK: `(AuthorPersonId) → iam.Person(Id)`
- FK: `(ReviewedByPersonId) → iam.Person(Id)`
- UNIQUE: `(PublicId)`
- UNIQUE: `(Id, InitiativeId)`
- INDEX: `(InitiativeId, Kind, PeriodEndDate)`
- INDEX: `(ExperienceId, PeriodEndDate) WHERE ExperienceId IS NOT NULL`
- CHECK `CK_OperationalReport_Kind`: `Kind IN ('Coach','InitiativeSupervisor','ProviderSupervisor')`
- CHECK `CK_OperationalReport_Scope`: `(Kind = 'Coach' AND GroupId IS NOT NULL AND ExperienceId IS NULL) OR (Kind = 'InitiativeSupervisor' AND InitiativeId IS NOT NULL AND GroupId IS NULL AND ExperienceId IS NULL) OR (Kind = 'ProviderSupervisor' AND ExperienceId IS NOT NULL AND GroupId IS NULL AND InitiativeId IS NULL)`
- CHECK `CK_OperationalReport_Dates`: `PeriodEndDate >= PeriodStartDate`
- CHECK `CK_OperationalReport_Status`: `Status IN ('Draft','Submitted')`
- CHECK `CK_OperationalReport_Submitted`: `(Status = 'Submitted' AND SubmittedAtUtc IS NOT NULL AND MetricsSnapshotJson IS NOT NULL) OR (Status = 'Draft' AND SubmittedAtUtc IS NULL)`
- CHECK `CK_OperationalReport_CoachOnly`: `Kind = 'Coach' OR (IncludedInReportId IS NULL AND ReviewedByPersonId IS NULL)`
- CHECK `CK_OperationalReport_Metrics`: `MetricsSnapshotJson IS NULL OR ISJSON(MetricsSnapshotJson) = 1`
- حارس: TR_OperationalReport_Sealed: بعد Submitted لا تتغير كلمات المؤلف ولا لقطة المقاييس؛ يُسمح فقط بأعمدة المراجعة والتضمين.
- حارس: TR_OperationalReport_Include: IncludedInReportId يشير إلى تقرير InitiativeSupervisor مُرسل للمبادرة نفسها.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `coach.OperationalGroup` عبر `GroupId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `coach.OperationalGroup` عبر `GroupId, InitiativeId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `institution.Initiative` عبر `InitiativeId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `provider.Experience` عبر `ExperienceId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `task.OperationalReport` عبر `IncludedInReportId, InitiativeId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `AuthorPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `iam.Person` عبر `ReviewedByPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `task.OperationalReport` (IncludedInReportId, InitiativeId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | Draft → Submitted (ثابت). تقرير المدرب قد يُراجَع ويُضمَّن في ملخص مشرف واحد. |
| **الخصوصية والملكية والتفويض** | تقرير المدرب: المشرف والممثل. الملخص: الممثل. تقرير المزوّد: المزوّد. لا يحتوي بيانات Lab/Shield/Recovery الخاصة. |
| **التاريخ والنسخ والاحتفاظ** | التقارير المرسلة ثابتة؛ لقطة المقاييس تحفظ ما رآه المؤلف وقت الإرسال. |
| **مثال ملموس** | المشرفة ترسل ملخص 14–25 أكتوبر وتختار تقريرَي مدربين؛ يُضبط IncludedInReportId فيهما ويظهر الملخص في صندوق الممثل مع Issues. |
| **ماذا ينكسر لو حُذف أو دُمج** | تنقطع سلسلة التقارير المعتمدة (D34) ويضيع ما أرسله المشرف للممثل. |
| **المصدر** | §13.2 Reports، §15.1 Reports، §15.4، §16 Reports، §17 Reports، D33، D34؛ Client/src/workspaces/commands/initiative.js (initiative.coach.report، supervisor.summary، coach.report.review)، pages/institution/report-inbox.js، commands/outdoor.js (supervisor.report.submit) |

---

## session — الجلسات والحضور والإكمال

### session.Session

<a id="session-session"></a>

| | |
|---|---|
| **الغرض** | موعد مجدول واحد يملكه مالك واحد: جلسة/ورشة في مبادرة، جلسة ضمن تجربة أو مخيم مزوّد، أو اجتماع طاقم يجدوله مشرف المبادرة. |
| **الميزة وسير العمل** | Sessions & workshops، Calendar للمزوّد، Schedule وAttendance للمشرف، My Sessions/My Registrations، Explore (Sessions)، "Sessions & meetings" للمشرف. |
| **لماذا جدول مستقل** | جلسة المبادرة وجلسة التجربة لهما الأعمدة نفسها وبروتوكول الحضور نفسه (D36، D37) وشاشة حضور المشرف نفسها؛ المالك مكتوب بمفتاحين حقيقيين XOR ويبقى المزوّد مالك جلساته (D40). سعة كل نمط عمودان هنا بدل جدول SessionCapacityPool الذي لم يحمل أكثر من صفين بلا دورة حياة؛ يفقد التسجيل مفتاحه الأجنبي إلى "المسبح"، ويعوّضه CHECK على النمط ومشغّل يمنع تسجيل نمط لا تعرضه الجلسة. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `session.Session` + يستوعب `provider.ExperienceSession`، `session.SessionCapacityPool` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK؛ FK → session.SessionRevision (مركب: CurrentRevisionId, Id) |
| `PublicId` | uniqueidentifier | لا | `NEWSEQUENTIALID()` | UQ — المعرّف الخارجي في الـAPI والروابط |
| `InitiativeId` | bigint | نعم |  | FK → institution.Initiative |
| `ExperienceId` | bigint | نعم |  | FK → provider.Experience |
| `Purpose` | nvarchar(16) | لا | `N'Session'` |  |
| `Title` | nvarchar(200) | لا |  |  |
| `Mode` | nvarchar(16) | لا |  |  |
| `Status` | nvarchar(16) | لا | `N'Draft'` |  |
| `TimeZoneId` | nvarchar(80) | لا |  |  |
| `StartsAtUtc` | datetime2(3) | لا |  |  |
| `EndsAtUtc` | datetime2(3) | لا |  |  |
| `AttendanceRequired` | bit | لا |  |  |
| `OnlineCapacity` | int | نعم |  |  |
| `InPersonCapacity` | int | نعم |  |  |
| `CurrentRevisionId` | bigint | نعم |  | FK → session.SessionRevision (مركب: CurrentRevisionId, Id) |
| `MeetingAudience` | nvarchar(16) | نعم |  |  |
| `MeetingAudiencePersonId` | bigint | نعم |  | FK → iam.Person |
| `CancelledAtUtc` | datetime2(3) | نعم |  |  |
| `CancelReason` | nvarchar(800) | نعم |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_Session (Id)`
- FK: `(InitiativeId) → institution.Initiative(Id)`
- FK: `(ExperienceId) → provider.Experience(Id)`
- FK: `(CurrentRevisionId, Id) → session.SessionRevision(Id, SessionId)`
- FK: `(MeetingAudiencePersonId) → iam.Person(Id)`
- UNIQUE: `(PublicId)`
- UNIQUE: `(Id, InitiativeId)`
- UNIQUE: `(Id, ExperienceId)`
- INDEX: `(InitiativeId, StartsAtUtc) WHERE InitiativeId IS NOT NULL`
- INDEX: `(ExperienceId, StartsAtUtc) WHERE ExperienceId IS NOT NULL`
- CHECK `CK_Session_Owner`: `(InitiativeId IS NOT NULL AND ExperienceId IS NULL) OR (InitiativeId IS NULL AND ExperienceId IS NOT NULL)`
- CHECK `CK_Session_Purpose`: `Purpose IN ('Session','Meeting')`
- CHECK `CK_Session_Mode`: `Mode IN ('Online','InPerson','Hybrid')`
- CHECK `CK_Session_Status`: `Status IN ('Draft','Published','Cancelled','Completed')`
- CHECK `CK_Session_Times`: `EndsAtUtc > StartsAtUtc`
- CHECK `CK_Session_Capacity`: `(Purpose = 'Meeting' OR ExperienceId IS NOT NULL) AND OnlineCapacity IS NULL AND InPersonCapacity IS NULL OR (Purpose = 'Session' AND InitiativeId IS NOT NULL AND ((Mode = 'Online' AND OnlineCapacity > 0 AND InPersonCapacity IS NULL) OR (Mode = 'InPerson' AND InPersonCapacity > 0 AND OnlineCapacity IS NULL) OR (Mode = 'Hybrid' AND OnlineCapacity > 0 AND InPersonCapacity > 0)))`
- CHECK `CK_Session_Meeting`: `(Purpose = 'Meeting' AND InitiativeId IS NOT NULL AND AttendanceRequired = 0 AND MeetingAudience IN ('Everyone','Coaches','Coach') AND (MeetingAudience <> 'Coach' OR MeetingAudiencePersonId IS NOT NULL)) OR (Purpose = 'Session' AND MeetingAudience IS NULL AND MeetingAudiencePersonId IS NULL)`
- CHECK `CK_Session_Published`: `Status = 'Draft' OR CurrentRevisionId IS NOT NULL`
- CHECK `CK_Session_Cancelled`: `(Status = 'Cancelled' AND CancelledAtUtc IS NOT NULL) OR (Status <> 'Cancelled' AND CancelledAtUtc IS NULL)`
- حارس: TR_Session_CapacityShrink: لا تنخفض سعة نمط تحت عدد التسجيلات Pending+Confirmed في ذلك النمط.
- حارس: TR_Session_OwnerImmutable: المالك والغرض لا يتغيران.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `institution.Initiative` عبر `InitiativeId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `provider.Experience` عبر `ExperienceId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `session.SessionRevision` عبر `CurrentRevisionId, Id`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `iam.Person` عبر `MeetingAudiencePersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `session.SessionRevision` (SessionId)، `session.SessionDuty` (SessionId | SessionId, InitiativeId | SessionId, ExperienceId)، `session.SessionRegistration` (SessionId, InitiativeId)، `session.Attendance` (SessionId | SessionId, ExperienceId)، `provider.ProviderIncident` (SessionId, ExperienceId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | Draft → Published → Completed؛ Draft\|Published → Cancelled بسبب وإشعار. تغيير الوقت/المكان/الرابط/السعة بعد النشر نسخة SessionRevision جديدة. |
| **الخصوصية والملكية والتفويض** | تفاصيل الجلسة عامة عند نشر المبادرة/التجربة؛ الرابط المحمي يُكشف للمسجلين المؤكدين في الوقت المسموح. |
| **التاريخ والنسخ والاحتفاظ** | النسخ في SessionRevision؛ الإلغاء بسببه. |
| **مثال ملموس** | ورشة Hybrid بسعة 40 حضوري و100 عن بعد؛ تسجيل الفرد يختار InPerson ويُقارن بـInPersonCapacity تحت القفل. |
| **ماذا ينكسر لو حُذف أو دُمج** | لا مواعيد للحضور ولا للتسجيل ولا لمهام المشرف في الطرفين. |
| **المصدر** | §11.2، §15.1 Sessions، §15.2 المرحلة 3، §16 Calendar، §17، D36–D40؛ Client/src/workspaces/commands/initiative.js (initiative.session.*، supervisor.meeting)، outdoor.js |

### session.SessionRevision

<a id="session-sessionrevision"></a>

| | |
|---|---|
| **الغرض** | نسخة منشورة ثابتة من تفاصيل الجلسة القابلة للتغيير: الوقت، المكان، الرابط، السعة، نافذة الدخول، قاعدة الإكمال. |
| **الميزة وسير العمل** | Reschedule مع إشعار المسجلين، "history/version retained" في Calendar، نافذة QR check-in. |
| **لماذا جدول مستقل** | §15.1 و§16 يطلبان حفظ نسخة وتاريخ للتغييرات بعد النشر؛ التسجيل يثبَّت على النسخة التي سُجل عليها. AuditEvent يحفظ الحالة لا القيم، فلا يكفي. |
| **نوع الصف** | إلحاقي (a) |
| **الأصل في المخطط الحالي** | `session.SessionRevision` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `SessionId` | bigint | لا |  | FK → session.Session |
| `RevisionNo` | int | لا |  |  |
| `StartsAtUtc` | datetime2(3) | لا |  |  |
| `EndsAtUtc` | datetime2(3) | لا |  |  |
| `Venue` | nvarchar(300) | نعم |  |  |
| `ProtectedLinkRef` | nvarchar(300) | نعم |  |  |
| `OnlineCapacity` | int | نعم |  |  |
| `InPersonCapacity` | int | نعم |  |  |
| `CheckInBeforeMinutes` | smallint | لا |  |  |
| `CheckInAfterMinutes` | smallint | لا |  |  |
| `CompletionRuleRef` | nvarchar(120) | نعم |  |  |
| `ChangeReason` | nvarchar(800) | نعم |  |  |
| `PublishedByPersonId` | bigint | لا |  | FK → iam.Person |
| `PublishedAtUtc` | datetime2(3) | لا |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |

**المفاتيح والقيود والفهارس**

- PK: `PK_SessionRevision (Id)`
- FK: `(SessionId) → session.Session(Id)`
- FK: `(PublishedByPersonId) → iam.Person(Id)`
- UNIQUE: `(Id, SessionId)`
- UNIQUE: `(SessionId, RevisionNo)`
- CHECK `CK_SessionRevision_RevisionNo`: `RevisionNo > 0`
- CHECK `CK_SessionRevision_Times`: `EndsAtUtc > StartsAtUtc`
- CHECK `CK_SessionRevision_Window`: `CheckInBeforeMinutes >= 0 AND CheckInAfterMinutes >= 0`
- صلاحيات: INSERT/SELECT فقط لدور التشغيل؛ `TR_SessionRevision_Immutable` يمنع UPDATE/DELETE.
- حارس: TR_SessionRevision_Immutable: إلحاقي.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `session.Session` عبر `SessionId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `PublishedByPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `session.Session` (CurrentRevisionId, Id)، `session.SessionRegistration` (SessionRevisionId, SessionId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | إلحاقي: النسخة 1 عند النشر، ثم نسخة لكل تغيير بعده؛ Session.CurrentRevisionId يشير إلى السارية. |
| **الخصوصية والملكية والتفويض** | المكان والوقت عامان عند النشر؛ ProtectedLinkRef مرجع لرابط يُكشف للمسجلين المؤكدين في نافذة مسموحة فقط. |
| **التاريخ والنسخ والاحتفاظ** | هو التاريخ. |
| **مثال ملموس** | نقل الورشة إلى قاعة أخرى: النسخة 2 بـVenue جديد وسبب؛ يُشعر المسجلون. |
| **ماذا ينكسر لو حُذف أو دُمج** | يُعاد كتابة ما سجّل عليه الناس دون أثر. |
| **المصدر** | §15.1 Sessions، §16 Calendar، §16.3، §17.1 |

### session.SessionDuty

<a id="session-sessionduty"></a>

| | |
|---|---|
| **الغرض** | إسناد مشرف معيّن إلى جلسة محددة. |
| **الميزة وسير العمل** | "responsible session appointment" في المنشئ، "Needs Supervisor" على الجلسة ولوحة الممثل، Schedule للمشرف. |
| **لماذا جدول مستقل** | D38: الحضور يتطلب مشرفًا نشطًا مخولًا للجلسة. المفاتيح المركبة تضمن أن التعيين والجلسة من المالك نفسه (مبادرة مع مبادرة، تجربة مع تجربة). كان جدولين متطابقين لكل مالك. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `session.InitiativeSessionDuty` + يستوعب `provider.ProviderAppointmentSession` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `SessionId` | bigint | لا |  | FK → session.Session؛ FK → session.Session (مركب: SessionId, InitiativeId)؛ FK → session.Session (مركب: SessionId, ExperienceId) |
| `StaffAppointmentId` | bigint | لا |  | FK → org.StaffAppointment؛ FK → org.StaffAppointment (مركب: StaffAppointmentId, InitiativeId)؛ FK → org.StaffAppointment (مركب: StaffAppointmentId, ExperienceId) |
| `InitiativeId` | bigint | نعم |  | FK → session.Session (مركب: SessionId, InitiativeId)؛ FK → org.StaffAppointment (مركب: StaffAppointmentId, InitiativeId) |
| `ExperienceId` | bigint | نعم |  | FK → session.Session (مركب: SessionId, ExperienceId)؛ FK → org.StaffAppointment (مركب: StaffAppointmentId, ExperienceId) |
| `Status` | nvarchar(16) | لا | `N'Active'` |  |
| `AssignedByPersonId` | bigint | لا |  | FK → iam.Person |
| `AssignedAtUtc` | datetime2(3) | لا |  |  |
| `RevokedAtUtc` | datetime2(3) | نعم |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_SessionDuty (Id)`
- FK: `(SessionId) → session.Session(Id)`
- FK: `(StaffAppointmentId) → org.StaffAppointment(Id)`
- FK: `(SessionId, InitiativeId) → session.Session(Id, InitiativeId)`
- FK: `(StaffAppointmentId, InitiativeId) → org.StaffAppointment(Id, InitiativeId)`
- FK: `(SessionId, ExperienceId) → session.Session(Id, ExperienceId)`
- FK: `(StaffAppointmentId, ExperienceId) → org.StaffAppointment(Id, ExperienceId)`
- FK: `(AssignedByPersonId) → iam.Person(Id)`
- UNIQUE: `(SessionId, StaffAppointmentId) WHERE Status = 'Active'` (فهرس فريد مفلتر)
- CHECK `CK_SessionDuty_Scope`: `(InitiativeId IS NOT NULL AND ExperienceId IS NULL) OR (InitiativeId IS NULL AND ExperienceId IS NOT NULL)`
- CHECK `CK_SessionDuty_Status`: `Status IN ('Active','Revoked')`
- CHECK `CK_SessionDuty_Revoked`: `(Status = 'Active' AND RevokedAtUtc IS NULL) OR (Status = 'Revoked' AND RevokedAtUtc IS NOT NULL)`
- حارس: TR_SessionDuty_Active: التعيين Active وRole=Supervisor عند الإسناد.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `session.Session` عبر `SessionId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `org.StaffAppointment` عبر `StaffAppointmentId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `session.Session` عبر `SessionId, InitiativeId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `org.StaffAppointment` عبر `StaffAppointmentId, InitiativeId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `session.Session` عبر `SessionId, ExperienceId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `org.StaffAppointment` عبر `StaffAppointmentId, ExperienceId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `AssignedByPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: لا شيء.

| | |
|---|---|
| **دورة الحياة والانتقالات** | Active → Revoked. |
| **الخصوصية والملكية والتفويض** | الطاقم المالك والمشرف المسند؛ الواجب لا يمنح قراءة بيانات خاصة للمشاركين خارج روستر الجلسة. |
| **التاريخ والنسخ والاحتفاظ** | الصفوف المسحوبة تفسر من كان مخولًا وقت تسجيل حضور قديم. |
| **مثال ملموس** | الممثل يسند المشرفة هالة إلى ورشة الافتتاح؛ تختفي شارة Needs Supervisor. |
| **ماذا ينكسر لو حُذف أو دُمج** | لا يمكن فرض بوابة المشرف للحضور (D38، CAP-05/SUP-06). |
| **المصدر** | §15.2 المرحلة 4، §16 Calendar، §17، D38 |

### session.SessionRegistration

<a id="session-sessionregistration"></a>

| | |
|---|---|
| **الغرض** | حجز شخص لمكان في جلسة مبادرة بنمط محدد. |
| **الميزة وسير العمل** | Register من Explore أو My Initiatives، QR الحجز، الإلغاء، روستر المشرف المؤكد. |
| **لماذا جدول مستقل** | D39: الانضمام للمبادرة لا يحجز جلساتها؛ التسجيل حقيقة منفصلة لها سعة نمط. الفهرس الفريد المفلتر يسمح بإعادة التسجيل بعد الإلغاء (كان القيد السابق غير مفلتر فيمنعها). جلسات المزوّد لا تستخدم هذا الجدول: الحجز على مستوى التجربة. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `session.SessionRegistration` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `PublicId` | uniqueidentifier | لا | `NEWSEQUENTIALID()` | UQ — المعرّف الخارجي في الـAPI والروابط |
| `SessionId` | bigint | لا |  | FK → session.Session (مركب: SessionId, InitiativeId)؛ FK → session.SessionRevision (مركب: SessionRevisionId, SessionId) |
| `InitiativeId` | bigint | لا |  | FK → session.Session (مركب: SessionId, InitiativeId) |
| `PersonId` | bigint | لا |  | FK → iam.Person؛ FK → forms.FormResponse (مركب: RegistrationResponseId, PersonId) |
| `Mode` | nvarchar(16) | لا |  |  |
| `SessionRevisionId` | bigint | لا |  | FK → session.SessionRevision (مركب: SessionRevisionId, SessionId) |
| `Status` | nvarchar(16) | لا | `N'Pending'` |  |
| `RegistrationResponseId` | bigint | نعم |  | FK → forms.FormResponse (مركب: RegistrationResponseId, PersonId) |
| `CredentialHash` | varbinary(32) | نعم |  |  |
| `RegisteredAtUtc` | datetime2(3) | لا |  |  |
| `CancelledAtUtc` | datetime2(3) | نعم |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_SessionRegistration (Id)`
- FK: `(SessionId, InitiativeId) → session.Session(Id, InitiativeId)`
- FK: `(SessionRevisionId, SessionId) → session.SessionRevision(Id, SessionId)`
- FK: `(PersonId) → iam.Person(Id)`
- FK: `(RegistrationResponseId, PersonId) → forms.FormResponse(Id, PersonId)`
- UNIQUE: `(PublicId)`
- UNIQUE: `(Id, SessionId, PersonId)`
- UNIQUE: `(SessionId, PersonId) WHERE Status IN ('Pending','Confirmed')` (فهرس فريد مفلتر)
- UNIQUE: `(CredentialHash) WHERE CredentialHash IS NOT NULL` (فهرس فريد مفلتر)
- INDEX: `(SessionId, Mode) WHERE Status IN ('Pending','Confirmed')`
- CHECK `CK_SessionRegistration_Mode`: `Mode IN ('Online','InPerson')`
- CHECK `CK_SessionRegistration_Status`: `Status IN ('Pending','Confirmed','Cancelled')`
- CHECK `CK_SessionRegistration_Cancelled`: `(Status = 'Cancelled' AND CancelledAtUtc IS NOT NULL) OR (Status <> 'Cancelled' AND CancelledAtUtc IS NULL)`
- حارس: proc session.Register: يقفل صف الجلسة، يتحقق أن النمط معروض وأن العدد < سعة النمط، وينشئ CredentialHash عشوائيًا للحضور الحضوري.
- حارس: TR_SessionRegistration_Capacity: شبكة أمان للسعة والنمط.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `session.Session` عبر `SessionId, InitiativeId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `session.SessionRevision` عبر `SessionRevisionId, SessionId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `PersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `forms.FormResponse` عبر `RegistrationResponseId, PersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `session.Attendance` (RegistrationId, SessionId, PersonId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | Pending → Confirmed → Cancelled؛ Pending → Cancelled. "Checked-in" و"Completed" حالتا عرض مشتقتان من Attendance وCompletion. |
| **الخصوصية والملكية والتفويض** | الشخص، والطاقم المخول للجلسة. |
| **التاريخ والنسخ والاحتفاظ** | الملغى يبقى؛ التسجيل الجديد صف جديد. |
| **مثال ملموس** | فرد مقبول في المبادرة يسجل InPerson؛ يظهر QR في My Registrations؛ المشرف يمسحه فيُنشأ Attendance. |
| **ماذا ينكسر لو حُذف أو دُمج** | يختلط القبول بالحجز ويُفقد حد السعة لكل نمط. |
| **المصدر** | §11.2، §15.1 Sessions، §17.1، §23.2، D39 |

### session.Attendance

<a id="session-attendance"></a>

| | |
|---|---|
| **الغرض** | الحقيقة الواقعية لحضور شخص لجلسة: حاضر/متأخر/غائب/غير مسجل، بطريقة التحقق ومن سجلها، ونتيجة تقييم الجلسة إن وُجدت. |
| **الميزة وسير العمل** | Attendance للمشرف (QR، رمز مكتوب، استثناء يدوي بسبب، online-verified)، Attendance للطالب، Evaluations للمزوّد، الأرنب، تقارير الحضور. |
| **لماذا جدول مستقل** | D36/D37: بروتوكول واحد للحضور في المبادرة والمزوّد. المصدر XOR بمفاتيح مركبة حقيقية: تسجيل جلسة المبادرة للشخص نفسه، أو حجز التجربة للشخص نفسه والتجربة نفسها. تقييم المزوّد لكل جلسة (Completed/Needs follow-up) في الواجهة الحالية له حبيبة الحضور نفسها (حجز × جلسة)، فهو عمودا OutcomeCode/OutcomeNotes هنا لا جدول جديد. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `session.SessionAttendance` + يستوعب `provider.ProviderAttendance` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `SessionId` | bigint | لا |  | FK → session.Session؛ FK → session.SessionRegistration (مركب: RegistrationId, SessionId, PersonId)؛ FK → session.Session (مركب: SessionId, ExperienceId) |
| `PersonId` | bigint | لا |  | FK → iam.Person؛ FK → session.SessionRegistration (مركب: RegistrationId, SessionId, PersonId)؛ FK → provider.ExperienceBooking (مركب: BookingId, ExperienceId, PersonId)؛ FK → evidence.EvidenceEvent (مركب: EvidenceEventId, PersonId) |
| `RegistrationId` | bigint | نعم |  | FK → session.SessionRegistration (مركب: RegistrationId, SessionId, PersonId) |
| `BookingId` | bigint | نعم |  | FK → provider.ExperienceBooking (مركب: BookingId, ExperienceId, PersonId) |
| `ExperienceId` | bigint | نعم |  | FK → session.Session (مركب: SessionId, ExperienceId)؛ FK → provider.ExperienceBooking (مركب: BookingId, ExperienceId, PersonId) |
| `Status` | nvarchar(16) | لا |  |  |
| `Method` | nvarchar(24) | نعم |  |  |
| `MethodReason` | nvarchar(800) | نعم |  |  |
| `RecordedByPersonId` | bigint | لا |  | FK → iam.Person |
| `RecordedAtUtc` | datetime2(3) | لا |  |  |
| `OutcomeCode` | nvarchar(16) | نعم |  |  |
| `OutcomeNotes` | nvarchar(2000) | نعم |  |  |
| `EvidenceEventId` | bigint | نعم |  | FK → evidence.EvidenceEvent (مركب: EvidenceEventId, PersonId) |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_Attendance (Id)`
- FK: `(SessionId) → session.Session(Id)`
- FK: `(PersonId) → iam.Person(Id)`
- FK: `(RegistrationId, SessionId, PersonId) → session.SessionRegistration(Id, SessionId, PersonId)`
- FK: `(SessionId, ExperienceId) → session.Session(Id, ExperienceId)`
- FK: `(BookingId, ExperienceId, PersonId) → provider.ExperienceBooking(Id, ExperienceId, PersonId)`
- FK: `(RecordedByPersonId) → iam.Person(Id)`
- FK: `(EvidenceEventId, PersonId) → evidence.EvidenceEvent(Id, SubjectPersonId)`
- UNIQUE: `(Id, PersonId)`
- UNIQUE: `(SessionId, PersonId)`
- UNIQUE: `(EvidenceEventId) WHERE EvidenceEventId IS NOT NULL` (فهرس فريد مفلتر)
- CHECK `CK_Attendance_Source`: `(RegistrationId IS NOT NULL AND BookingId IS NULL AND ExperienceId IS NULL) OR (RegistrationId IS NULL AND BookingId IS NOT NULL AND ExperienceId IS NOT NULL)`
- CHECK `CK_Attendance_Status`: `Status IN ('Present','Late','Absent','NotRecorded')`
- CHECK `CK_Attendance_Method`: `Method IS NULL OR Method IN ('QrCode','TypedCode','ManualException','OnlineVerified','Closeout')`
- CHECK `CK_Attendance_Recorded`: `Status = 'NotRecorded' OR Method IS NOT NULL`
- CHECK `CK_Attendance_Manual`: `Method <> 'ManualException' OR LEN(TRIM(MethodReason)) > 0`
- CHECK `CK_Attendance_Outcome`: `OutcomeCode IS NULL OR OutcomeCode IN ('Met','NeedsFollowUp','NotMet')`
- حارس: proc session.RecordAttendance: يتحقق من SessionDuty نشط للمسجِّل، ونافذة الدخول من النسخة الحالية، وتطابق CredentialHash، ويعيد السجل الموجود بدل التكرار (idempotent).
- حارس: TR_Attendance_Mode: طريقة QR/TypedCode لنمط حضوري فقط؛ OnlineVerified لنمط عن بعد.
- حارس: كل تغيير بعد الإنشاء يمر عبر proc session.CorrectAttendance فقط (DENY UPDATE المباشر لدور التشغيل).

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `session.Session` عبر `SessionId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `PersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `session.SessionRegistration` عبر `RegistrationId, SessionId, PersonId`؛ وكل صف هناك يقابله صفر أو واحد هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `session.Session` عبر `SessionId, ExperienceId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `provider.ExperienceBooking` عبر `BookingId, ExperienceId, PersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `RecordedByPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `evidence.EvidenceEvent` عبر `EvidenceEventId, PersonId`؛ وكل صف هناك يقابله صفر أو واحد ضمن (EvidenceEventId IS NOT NULL)، وكثير خارجه هنا.
- واردة: `session.AttendanceCorrection` (AttendanceId)، `session.AbsenceExcuse` (AttendanceId, PersonId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | يُنشأ عند أول تسجيل؛ التصحيحات عبر AttendanceCorrection فقط؛ Closeout يحوّل NotRecorded إلى Absent عند إغلاق الجلسة. |
| **الخصوصية والملكية والتفويض** | الشخص، والمشرف المسند، والمالك. العذر المقبول لا يغيّر Absent. |
| **التاريخ والنسخ والاحتفاظ** | كل تغيير له صف تصحيح بالقيم قبل/بعد والفاعل والسبب. |
| **مثال ملموس** | مسح QR مرتين: المرة الثانية تعيد السجل نفسه دون حضور أو مكافأة مكررة. |
| **ماذا ينكسر لو حُذف أو دُمج** | لا حقيقة حضور ولا أرنب ولا تقارير حضور؛ ويضيع شرط المشرف النشط. |
| **المصدر** | §16.2، §17.1، §21.4 F، §23.2، D36، D37، D38 |

### session.AttendanceCorrection

<a id="session-attendancecorrection"></a>

| | |
|---|---|
| **الغرض** | تصحيح مُسند لسجل حضور أو تقييم جلسة، بالقيم قبل وبعد والسبب. |
| **الميزة وسير العمل** | "correction history" في Attendance للمشرف، "correction log" في Evaluations للمزوّد، إعادة تقييم المكافأة بشفافية. |
| **لماذا جدول مستقل** | §17.1 يطلب before/after/actor/time/reason ويقرأها المشرف في الواجهة. المفتاح الأجنبي إلى Attendance لا يملكه AuditEvent (مرجعه نصي)، والتصحيح يقود إبطال الدليل وعكس المكافأة. كان جدولين متطابقين للمبادرة والمزوّد. |
| **نوع الصف** | إلحاقي (a) |
| **الأصل في المخطط الحالي** | `session.AttendanceCorrection` + يستوعب `provider.ProviderAttendanceCorrection` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `AttendanceId` | bigint | لا |  | FK → session.Attendance |
| `OldStatus` | nvarchar(16) | لا |  |  |
| `NewStatus` | nvarchar(16) | لا |  |  |
| `OldOutcomeCode` | nvarchar(16) | نعم |  |  |
| `NewOutcomeCode` | nvarchar(16) | نعم |  |  |
| `CorrectedByPersonId` | bigint | لا |  | FK → iam.Person |
| `Reason` | nvarchar(1000) | لا |  |  |
| `CorrectedAtUtc` | datetime2(3) | لا |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |

**المفاتيح والقيود والفهارس**

- PK: `PK_AttendanceCorrection (Id)`
- FK: `(AttendanceId) → session.Attendance(Id)`
- FK: `(CorrectedByPersonId) → iam.Person(Id)`
- INDEX: `(AttendanceId, CorrectedAtUtc)`
- CHECK `CK_AttendanceCorrection_Status`: `OldStatus IN ('Present','Late','Absent','NotRecorded') AND NewStatus IN ('Present','Late','Absent','NotRecorded')`
- CHECK `CK_AttendanceCorrection_Changed`: `OldStatus <> NewStatus OR ISNULL(OldOutcomeCode, N'') <> ISNULL(NewOutcomeCode, N'')`
- CHECK `CK_AttendanceCorrection_Reason`: `LEN(TRIM(Reason)) > 0`
- صلاحيات: INSERT/SELECT فقط لدور التشغيل؛ `TR_AttendanceCorrection_Immutable` يمنع UPDATE/DELETE.
- حارس: TR_AttendanceCorrection_Immutable: إلحاقي. يُكتب في المعاملة نفسها التي تعدّل Attendance وتُبطل/تُنشئ الدليل.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `session.Attendance` عبر `AttendanceId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `CorrectedByPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: لا شيء.

| | |
|---|---|
| **دورة الحياة والانتقالات** | إلحاقي: صف لكل تصحيح بالقيم قبل/بعد؛ يُكتب في معاملة تعديل Attendance نفسها. |
| **الخصوصية والملكية والتفويض** | الطاقم المخول والشخص المعني. |
| **التاريخ والنسخ والاحتفاظ** | هو التاريخ. |
| **مثال ملموس** | Present → Absent لأن الطالب غادر بعد المسح: صف تصحيح، EvidenceEvent Invalidates، وعكس الأرنب. |
| **ماذا ينكسر لو حُذف أو دُمج** | يصبح تعديل الحضور صامتًا وتبقى مكافأة بلا مصدر صالح. |
| **المصدر** | §17.1، §21.3، §21.4 F، D36 |

### session.AbsenceExcuse

<a id="session-absenceexcuse"></a>

| | |
|---|---|
| **الغرض** | عذر غياب عن جلسة محددة: تقديم الطالب، توصية المشرف، قرار الممثل النهائي. |
| **الميزة وسير العمل** | Notes & Excuses للمشرف، Attendance & excuses للممثل، عرض "Excused Absence" للطالب. |
| **لماذا جدول مستقل** | D35/D36: العذر سجل قرار منفصل؛ الحضور يبقى Absent والعرض "Excused Absence" تركيب. المرفق مقيد القراءة. كل تبادل MoreInfo على الصف نفسه، والتاريخ التفصيلي في AuditEvent. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `session.AbsenceExcuse` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `PublicId` | uniqueidentifier | لا | `NEWSEQUENTIALID()` | UQ — المعرّف الخارجي في الـAPI والروابط |
| `AttendanceId` | bigint | لا |  | FK → session.Attendance (مركب: AttendanceId, PersonId) |
| `PersonId` | bigint | لا |  | FK → session.Attendance (مركب: AttendanceId, PersonId) |
| `Reason` | nvarchar(1000) | لا |  |  |
| `FileId` | bigint | نعم |  | FK → files.SecureFile |
| `Status` | nvarchar(16) | لا | `N'Submitted'` |  |
| `Recommendation` | nvarchar(8) | نعم |  |  |
| `RecommendationNote` | nvarchar(1000) | نعم |  |  |
| `RecommendedByPersonId` | bigint | نعم |  | FK → iam.Person |
| `RecommendedAtUtc` | datetime2(3) | نعم |  |  |
| `DecidedByPersonId` | bigint | نعم |  | FK → iam.Person |
| `DecisionReason` | nvarchar(1000) | نعم |  |  |
| `DecidedAtUtc` | datetime2(3) | نعم |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_AbsenceExcuse (Id)`
- FK: `(AttendanceId, PersonId) → session.Attendance(Id, PersonId)`
- FK: `(FileId) → files.SecureFile(Id)`
- FK: `(RecommendedByPersonId) → iam.Person(Id)`
- FK: `(DecidedByPersonId) → iam.Person(Id)`
- UNIQUE: `(PublicId)`
- UNIQUE: `(AttendanceId)`
- CHECK `CK_AbsenceExcuse_Status`: `Status IN ('Submitted','MoreInfo','Recommended','Accepted','Rejected','Withdrawn')`
- CHECK `CK_AbsenceExcuse_Recommendation`: `Recommendation IS NULL OR Recommendation IN ('Accept','Reject')`
- CHECK `CK_AbsenceExcuse_Recommended`: `Status <> 'Recommended' OR (Recommendation IS NOT NULL AND RecommendedByPersonId IS NOT NULL AND RecommendedAtUtc IS NOT NULL)`
- CHECK `CK_AbsenceExcuse_Decided`: `(Status IN ('Accepted','Rejected') AND DecidedByPersonId IS NOT NULL AND DecidedAtUtc IS NOT NULL AND LEN(TRIM(DecisionReason)) > 0) OR (Status NOT IN ('Accepted','Rejected') AND DecidedAtUtc IS NULL)`
- حارس: TR_AbsenceExcuse_Owner: الحضور المرتبط Status=Absent ويخص مقدم العذر؛ الملف يملكه المقدم.
- حارس: القرار النهائي في المبادرة للممثل فقط (proc)؛ التوصية للمشرف المسند فقط.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `session.Attendance` عبر `AttendanceId, PersonId`؛ وكل صف هناك يقابله صفر أو واحد هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `files.SecureFile` عبر `FileId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `iam.Person` عبر `RecommendedByPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `iam.Person` عبر `DecidedByPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: لا شيء.

| | |
|---|---|
| **دورة الحياة والانتقالات** | Submitted → MoreInfo ↔ Submitted → Recommended → Accepted \| Rejected؛ Withdrawn من الطالب قبل القرار. |
| **الخصوصية والملكية والتفويض** | الطالب، ومشرفو المبادرة، وممثلها؛ المدرب يرى الأثر التشغيلي فقط؛ المرفق عبر SecureFile بتدقيق الوصول. |
| **التاريخ والنسخ والاحتفاظ** | لا يُحذف؛ قرار مقبول لا يمنح حضورًا ولا أرنبًا. |
| **مثال ملموس** | طالب يرفق تقريرًا طبيًا؛ المشرف يوصي Accept؛ الممثل يقبل؛ الحضور يبقى Absent والعرض Excused. |
| **ماذا ينكسر لو حُذف أو دُمج** | يختلط العذر بالحضور فيصبح الغياب حضورًا ويُمنح أرنب (يمنعه D36 وEXC-10). |
| **المصدر** | §17.1، §15.1 Attendance & Excuses، D35، D36؛ Client/src/workspaces/commands/initiative.js (member.excuse.*، initiative.excuse.*) |

### session.Completion

<a id="session-completion"></a>

| | |
|---|---|
| **الغرض** | حكم الإكمال المُسند لمشاركة واحدة بموجب قاعدة الإكمال في نسخة منشورة محددة: مبادرة، برنامج مدرب، أو مخيم مزوّد. |
| **الميزة وسير العمل** | "Completed" في My Initiatives وتاريخ البرامج، Insights → Offline & Experiences، Evaluations للمزوّد، بيت الطائر، معلم جماعي للمبادرة. |
| **لماذا جدول مستقل** | D10 يوحّد صراحة إكمال المبادرة والبرنامج في تصنيف تاريخ وتقرير واحد، وإكمال المخيم يظهر في القائمة نفسها. الموضوع مكتوب بمفاتيح حقيقية لكل نوع مع CHECK حصري، وكل حكم مثبّت على نسخة القاعدة التي طُبّقت. كانت ثلاثة جداول متطابقة الأعمدة. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `session.InitiativeCompletion` + يستوعب `coach.ProgramCompletion`، `provider.CampCompletion` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `PublicId` | uniqueidentifier | لا | `NEWSEQUENTIALID()` | UQ — المعرّف الخارجي في الـAPI والروابط |
| `Kind` | nvarchar(16) | لا |  |  |
| `PersonId` | bigint | لا |  | FK → iam.Person؛ FK → institution.InitiativeApplication (مركب: ApplicationId, InitiativeId, PersonId)؛ FK → provider.ExperienceBooking (مركب: BookingId, ExperienceId, PersonId)؛ FK → evidence.EvidenceEvent (مركب: EvidenceEventId, PersonId) |
| `InitiativeId` | bigint | نعم |  | FK → institution.InitiativeApplication (مركب: ApplicationId, InitiativeId, PersonId)؛ FK → institution.InitiativeRevision (مركب: InitiativeRevisionId, InitiativeId) |
| `ApplicationId` | bigint | نعم |  | FK → institution.InitiativeApplication (مركب: ApplicationId, InitiativeId, PersonId) |
| `InitiativeRevisionId` | bigint | نعم |  | FK → institution.InitiativeRevision (مركب: InitiativeRevisionId, InitiativeId) |
| `ProgramId` | bigint | نعم |  | FK → coach.CoachProgram؛ FK → coach.ProgramRevision (مركب: ProgramRevisionId, ProgramId) |
| `ProgramRevisionId` | bigint | نعم |  | FK → coach.ProgramRevision (مركب: ProgramRevisionId, ProgramId) |
| `ExperienceId` | bigint | نعم |  | FK → provider.ExperienceBooking (مركب: BookingId, ExperienceId, PersonId)؛ FK → provider.ExperienceRevision (مركب: ExperienceRevisionId, ExperienceId) |
| `BookingId` | bigint | نعم |  | FK → provider.ExperienceBooking (مركب: BookingId, ExperienceId, PersonId) |
| `ExperienceRevisionId` | bigint | نعم |  | FK → provider.ExperienceRevision (مركب: ExperienceRevisionId, ExperienceId) |
| `Status` | nvarchar(16) | لا | `N'Pending'` |  |
| `EvaluatorPersonId` | bigint | نعم |  | FK → iam.Person |
| `EvaluatedAtUtc` | datetime2(3) | نعم |  |  |
| `BasisJson` | nvarchar(max) | نعم |  |  |
| `EvidenceEventId` | bigint | نعم |  | FK → evidence.EvidenceEvent (مركب: EvidenceEventId, PersonId) |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_Completion (Id)`
- FK: `(PersonId) → iam.Person(Id)`
- FK: `(ApplicationId, InitiativeId, PersonId) → institution.InitiativeApplication(Id, InitiativeId, PersonId)`
- FK: `(InitiativeRevisionId, InitiativeId) → institution.InitiativeRevision(Id, InitiativeId)`
- FK: `(ProgramId) → coach.CoachProgram(Id)`
- FK: `(ProgramRevisionId, ProgramId) → coach.ProgramRevision(Id, ProgramId)`
- FK: `(BookingId, ExperienceId, PersonId) → provider.ExperienceBooking(Id, ExperienceId, PersonId)`
- FK: `(ExperienceRevisionId, ExperienceId) → provider.ExperienceRevision(Id, ExperienceId)`
- FK: `(EvaluatorPersonId) → iam.Person(Id)`
- FK: `(EvidenceEventId, PersonId) → evidence.EvidenceEvent(Id, SubjectPersonId)`
- UNIQUE: `(PublicId)`
- UNIQUE: `(ApplicationId) WHERE ApplicationId IS NOT NULL` (فهرس فريد مفلتر)
- UNIQUE: `(ProgramId, PersonId) WHERE ProgramId IS NOT NULL` (فهرس فريد مفلتر)
- UNIQUE: `(BookingId) WHERE BookingId IS NOT NULL` (فهرس فريد مفلتر)
- UNIQUE: `(EvidenceEventId) WHERE EvidenceEventId IS NOT NULL` (فهرس فريد مفلتر)
- INDEX: `(PersonId, Kind)`
- CHECK `CK_Completion_Kind`: `Kind IN ('Initiative','Program','Camp')`
- CHECK `CK_Completion_Subject`: `(Kind = 'Initiative' AND InitiativeId IS NOT NULL AND ApplicationId IS NOT NULL AND InitiativeRevisionId IS NOT NULL AND ProgramId IS NULL AND ProgramRevisionId IS NULL AND ExperienceId IS NULL AND BookingId IS NULL AND ExperienceRevisionId IS NULL) OR (Kind = 'Program' AND ProgramId IS NOT NULL AND ProgramRevisionId IS NOT NULL AND InitiativeId IS NULL AND ApplicationId IS NULL AND InitiativeRevisionId IS NULL AND ExperienceId IS NULL AND BookingId IS NULL AND ExperienceRevisionId IS NULL) OR (Kind = 'Camp' AND ExperienceId IS NOT NULL AND BookingId IS NOT NULL AND ExperienceRevisionId IS NOT NULL AND InitiativeId IS NULL AND ApplicationId IS NULL AND InitiativeRevisionId IS NULL AND ProgramId IS NULL AND ProgramRevisionId IS NULL)`
- CHECK `CK_Completion_Status`: `Status IN ('Pending','Completed','NotMet')`
- CHECK `CK_Completion_Decided`: `Status = 'Pending' OR (EvaluatorPersonId IS NOT NULL AND EvaluatedAtUtc IS NOT NULL)`
- CHECK `CK_Completion_Evidence`: `EvidenceEventId IS NULL OR Status = 'Completed'`
- CHECK `CK_Completion_Basis`: `BasisJson IS NULL OR ISJSON(BasisJson) = 1`
- حارس: TR_Completion_Owner: المقيِّم مخول لمالك الموضوع (ممثل/مشرف المبادرة، مالك البرنامج، مشرف التجربة أو المزوّد).
- حارس: إكمال المبادرة يحوّل الطلب Accepted → Completed ويحرر المقعد في المعاملة نفسها (قرار #11).

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `PersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `institution.InitiativeApplication` عبر `ApplicationId, InitiativeId, PersonId`؛ وكل صف هناك يقابله صفر أو واحد ضمن (ApplicationId IS NOT NULL)، وكثير خارجه هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `institution.InitiativeRevision` عبر `InitiativeRevisionId, InitiativeId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `coach.CoachProgram` عبر `ProgramId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `coach.ProgramRevision` عبر `ProgramRevisionId, ProgramId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `provider.ExperienceBooking` عبر `BookingId, ExperienceId, PersonId`؛ وكل صف هناك يقابله صفر أو واحد ضمن (BookingId IS NOT NULL)، وكثير خارجه هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `provider.ExperienceRevision` عبر `ExperienceRevisionId, ExperienceId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `iam.Person` عبر `EvaluatorPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `evidence.EvidenceEvent` عبر `EvidenceEventId, PersonId`؛ وكل صف هناك يقابله صفر أو واحد ضمن (EvidenceEventId IS NOT NULL)، وكثير خارجه هنا.
- واردة: لا شيء.

| | |
|---|---|
| **دورة الحياة والانتقالات** | Pending → Completed \| NotMet؛ التصحيح يغيّر الحالة عبر proc يكتب AuditEvent ويُبطل الدليل عند الحاجة. |
| **الخصوصية والملكية والتفويض** | الشخص، ومالك الموضوع ومشغّلوه المخولون. |
| **التاريخ والنسخ والاحتفاظ** | تغييرات الحكم في AuditEvent؛ BasisJson يحفظ ما حُسب به الحكم (الجلسات المعدودة، المهام المعتمدة). |
| **مثال ملموس** | مخيم من ثلاث جلسات: المشرف يقيّم الحجز Completed؛ يُنشأ EvidenceEvent وقد تمنح السياسة بيت طائر مرة واحدة. |
| **ماذا ينكسر لو حُذف أو دُمج** | لا إكمال موثّق، ولا بيت طائر، ولا تحرير مقعد عند الإكمال. |
| **المصدر** | §9.1، §9.2، §16.2، §11.2، D10، D39، D46؛ قرار المالك #11 |

---

## provider — تجارب المزوّد

### provider.Experience

<a id="provider-experience"></a>

| | |
|---|---|
| **الغرض** | تجربة أو مخيم يملكه مزوّد معتمد. |
| **الميزة وسير العمل** | My Experiences وBuilder ذو المراحل الست، Explore (Outdoor Experiences / Camps)، Partnerships. |
| **لماذا جدول مستقل** | المزوّد يحتفظ بملكية الحجز والسلامة والطاقم والإكمال حتى عند الربط بمبادرة (D40). المفتاح المركب مع Kind=Provider يمنع مؤسسة من امتلاك تجربة. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `provider.Experience` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK؛ FK → provider.ExperienceRevision (مركب: CurrentRevisionId, Id) |
| `PublicId` | uniqueidentifier | لا | `NEWSEQUENTIALID()` | UQ — المعرّف الخارجي في الـAPI والروابط |
| `ProviderId` | bigint | لا |  | FK → org.Organization (مركب: ProviderId, ProviderKind) |
| `ProviderKind` | nvarchar(16) | لا | `N'Provider'` | FK → org.Organization (مركب: ProviderId, ProviderKind) |
| `Kind` | nvarchar(16) | لا |  |  |
| `Status` | nvarchar(16) | لا | `N'Draft'` |  |
| `CurrentRevisionId` | bigint | نعم |  | FK → provider.ExperienceRevision (مركب: CurrentRevisionId, Id) |
| `DraftJson` | nvarchar(max) | نعم |  |  |
| `DraftLastSavedStage` | tinyint | نعم |  |  |
| `DraftUpdatedAtUtc` | datetime2(3) | نعم |  |  |
| `CancelledAtUtc` | datetime2(3) | نعم |  |  |
| `CancelledByPersonId` | bigint | نعم |  | FK → iam.Person |
| `CancellationReason` | nvarchar(800) | نعم |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_Experience (Id)`
- FK: `(ProviderId, ProviderKind) → org.Organization(Id, Kind)`
- FK: `(CurrentRevisionId, Id) → provider.ExperienceRevision(Id, ExperienceId)`
- FK: `(CancelledByPersonId) → iam.Person(Id)`
- UNIQUE: `(PublicId)`
- CHECK `CK_Experience_ProviderKind`: `ProviderKind = 'Provider'`
- CHECK `CK_Experience_Kind`: `Kind IN ('Experience','Camp')`
- CHECK `CK_Experience_Status`: `Status IN ('Draft','Published','Suspended','Completed','Cancelled','Archived')`
- CHECK `CK_Experience_Published`: `Status IN ('Draft','Archived') OR CurrentRevisionId IS NOT NULL`
- CHECK `CK_Experience_DraftJson`: `DraftJson IS NULL OR ISJSON(DraftJson) = 1`
- CHECK `CK_Experience_DraftStage`: `DraftLastSavedStage IS NULL OR DraftLastSavedStage BETWEEN 1 AND 6`
- CHECK `CK_Experience_Cancellation`: `(Status = 'Cancelled' AND CancelledAtUtc IS NOT NULL AND LEN(TRIM(CancellationReason)) > 0) OR (Status <> 'Cancelled' AND CancelledAtUtc IS NULL)`
- حارس: هذا الصف نقطة القفل لكل أوامر سعة الحجز والانتظار والعروض.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `org.Organization` عبر `ProviderId, ProviderKind`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `provider.ExperienceRevision` عبر `CurrentRevisionId, Id`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `iam.Person` عبر `CancelledByPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `org.StaffAppointment` (ExperienceId)، `task.OperationalReport` (ExperienceId)، `session.Session` (ExperienceId)، `provider.ExperienceRevision` (ExperienceId)، `provider.ExperienceBooking` (ExperienceId)، `provider.ProviderCohort` (ExperienceId)، `provider.ProviderIncident` (ExperienceId)، `forms.Form` (ExperienceId)، `partnership.PartnershipLink` (ExperienceId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | Draft → Published → Completed → Archived؛ Published ↔ Suspended (Admin)؛ → Cancelled (يغلق الحجز المستقبلي والعروض، ويحفظ الحضور والإكمال). |
| **الخصوصية والملكية والتفويض** | عام عند النشر. |
| **التاريخ والنسخ والاحتفاظ** | النسخ في ExperienceRevision. |
| **مثال ملموس** | مزوّد ينشر مخيمًا لثلاثة أيام بسعة 20 مع قائمة انتظار. |
| **ماذا ينكسر لو حُذف أو دُمج** | لا يوجد مسار المزوّد كله. |
| **المصدر** | §16، §16.3، D18، D40؛ Client/src/workspaces/builders/experience.js |

### provider.ExperienceRevision

<a id="provider-experiencerevision"></a>

| | |
|---|---|
| **الغرض** | نسخة منشورة ثابتة من شروط التجربة: المكان، الوقت، السعة، الأهلية، السلامة، التكلفة المعلنة، قاعدة الإكمال، نموذج المشارك. |
| **الميزة وسير العمل** | تفاصيل التجربة في Explore، الحجز، التعديل بعد النشر مع إشعار، Evaluations. |
| **لماذا جدول مستقل** | §16.3: تغيير المكان أو الوقت أو السعر أو الأهلية بعد النشر ينشئ نسخة مُسندة وإشعارًا. الحجز يثبَّت على النسخة التي حُجز بموجبها، والإكمال على قاعدة نسخته. |
| **نوع الصف** | إلحاقي (a) |
| **الأصل في المخطط الحالي** | `provider.ExperienceRevision` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `ExperienceId` | bigint | لا |  | FK → provider.Experience |
| `RevisionNo` | int | لا |  |  |
| `Title` | nvarchar(200) | لا |  |  |
| `Venue` | nvarchar(300) | لا |  |  |
| `City` | nvarchar(120) | نعم |  |  |
| `TimeZoneId` | nvarchar(80) | لا |  |  |
| `StartsAtUtc` | datetime2(3) | لا |  |  |
| `EndsAtUtc` | datetime2(3) | لا |  |  |
| `BookingOpensAtUtc` | datetime2(3) | نعم |  |  |
| `BookingClosesAtUtc` | datetime2(3) | نعم |  |  |
| `Capacity` | int | لا |  |  |
| `WaitlistEnabled` | bit | لا |  |  |
| `OfferHoldHours` | smallint | نعم |  |  |
| `AudienceCode` | nvarchar(80) | لا |  |  |
| `MinAge` | tinyint | نعم |  |  |
| `MaxAge` | tinyint | نعم |  |  |
| `ConsentNoticeVersion` | nvarchar(64) | لا |  |  |
| `SafetyRef` | nvarchar(300) | لا |  |  |
| `CancellationPolicyRef` | nvarchar(300) | لا |  |  |
| `CostKind` | nvarchar(8) | لا |  |  |
| `Price` | decimal(19,4) | نعم |  |  |
| `Currency` | char(3) | نعم |  |  |
| `CompletionRuleRef` | nvarchar(120) | لا |  |  |
| `ParticipantFormVersionId` | bigint | نعم |  | FK → forms.FormVersion |
| `ChangeReason` | nvarchar(800) | نعم |  |  |
| `PublishedSnapshotJson` | nvarchar(max) | لا |  |  |
| `PublishedByPersonId` | bigint | لا |  | FK → iam.Person |
| `PublishedAtUtc` | datetime2(3) | لا |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |

**المفاتيح والقيود والفهارس**

- PK: `PK_ExperienceRevision (Id)`
- FK: `(ExperienceId) → provider.Experience(Id)`
- FK: `(ParticipantFormVersionId) → forms.FormVersion(Id)`
- FK: `(PublishedByPersonId) → iam.Person(Id)`
- UNIQUE: `(Id, ExperienceId)`
- UNIQUE: `(ExperienceId, RevisionNo)`
- CHECK `CK_ExperienceRevision_RevisionNo`: `RevisionNo > 0`
- CHECK `CK_ExperienceRevision_Times`: `EndsAtUtc > StartsAtUtc`
- CHECK `CK_ExperienceRevision_Capacity`: `Capacity > 0`
- CHECK `CK_ExperienceRevision_Booking`: `BookingClosesAtUtc IS NULL OR BookingOpensAtUtc IS NULL OR BookingClosesAtUtc > BookingOpensAtUtc`
- CHECK `CK_ExperienceRevision_Ages`: `MaxAge IS NULL OR MinAge IS NULL OR MaxAge >= MinAge`
- CHECK `CK_ExperienceRevision_OfferHold`: `OfferHoldHours IS NULL OR OfferHoldHours > 0`
- CHECK `CK_ExperienceRevision_Cost`: `(CostKind = 'Free' AND Price IS NULL AND Currency IS NULL) OR (CostKind = 'Paid' AND Price > 0 AND Currency IS NOT NULL)`
- CHECK `CK_ExperienceRevision_Snapshot`: `ISJSON(PublishedSnapshotJson) = 1`
- صلاحيات: INSERT/SELECT فقط لدور التشغيل؛ `TR_ExperienceRevision_Immutable` يمنع UPDATE/DELETE.
- حارس: TR_ExperienceRevision_Immutable: إلحاقي.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `provider.Experience` عبر `ExperienceId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `forms.FormVersion` عبر `ParticipantFormVersionId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `PublishedByPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `session.Completion` (ExperienceRevisionId, ExperienceId)، `provider.Experience` (CurrentRevisionId, Id)، `provider.ExperienceBooking` (RevisionId, ExperienceId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | إلحاقي: النسخة 1 عند النشر، ثم نسخة لكل تغيير مكان/وقت/سعر/أهلية/سعة مع ChangeReason وإشعار. |
| **الخصوصية والملكية والتفويض** | عام؛ تفاصيل السلامة الحساسة في اللقطة تُعرض للطاقم فقط. |
| **التاريخ والنسخ والاحتفاظ** | هو التاريخ. |
| **مثال ملموس** | رفع السعة من 20 إلى 24: نسخة جديدة؛ الوظيفة تعرض المقاعد الجديدة على الطابور فورًا. |
| **ماذا ينكسر لو حُذف أو دُمج** | تُعاد كتابة شروط حجوزات قائمة. |
| **المصدر** | §16، §16.2، §16.3 |

### provider.ExperienceBooking

<a id="provider-experiencebooking"></a>

| | |
|---|---|
| **الغرض** | حجز شخص في تجربة: الطابور، العرض المؤقت، التأكيد، الإلغاء. |
| **الميزة وسير العمل** | Book/Join Waitlist من Explore، My Registrations، Registrations وWaiting List للمزوّد، QR الحجز. |
| **لماذا جدول مستقل** | §16.1: Queued → Offered → Accepted \| Declined \| Expired مع "Confirmed + held ≤ capacity". العرض 1:1 مع الحجز وينتهي نهائيًا، فلا يحتاج جدولًا مستقلًا (كان SeatOffer): أعمدته هنا. الفهرس المفلتر يسمح بحجز جديد بعد الإلغاء أو انتهاء العرض، وكان القيد السابق غير مفلتر فيمنع ذلك خلافًا للواجهة. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `provider.ExperienceBooking` + يستوعب `provider.SeatOffer` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `PublicId` | uniqueidentifier | لا | `NEWSEQUENTIALID()` | UQ — المعرّف الخارجي في الـAPI والروابط |
| `ExperienceId` | bigint | لا |  | FK → provider.Experience؛ FK → provider.ExperienceRevision (مركب: RevisionId, ExperienceId) |
| `PersonId` | bigint | لا |  | FK → iam.Person؛ FK → forms.FormResponse (مركب: ParticipantResponseId, PersonId) |
| `RevisionId` | bigint | لا |  | FK → provider.ExperienceRevision (مركب: RevisionId, ExperienceId) |
| `Status` | nvarchar(16) | لا |  |  |
| `Mode` | nvarchar(16) | نعم |  |  |
| `ConsentAtUtc` | datetime2(3) | لا |  |  |
| `ParticipantResponseId` | bigint | نعم |  | FK → forms.FormResponse (مركب: ParticipantResponseId, PersonId) |
| `QueuedAtUtc` | datetime2(3) | نعم |  |  |
| `OfferedAtUtc` | datetime2(3) | نعم |  |  |
| `OfferExpiresAtUtc` | datetime2(3) | نعم |  |  |
| `OfferRespondedAtUtc` | datetime2(3) | نعم |  |  |
| `ConfirmedAtUtc` | datetime2(3) | نعم |  |  |
| `CancelledAtUtc` | datetime2(3) | نعم |  |  |
| `CancelledByPersonId` | bigint | نعم |  | FK → iam.Person |
| `CancelReason` | nvarchar(800) | نعم |  |  |
| `CredentialHash` | varbinary(32) | نعم |  |  |
| `BookedAtUtc` | datetime2(3) | لا |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_ExperienceBooking (Id)`
- FK: `(ExperienceId) → provider.Experience(Id)`
- FK: `(PersonId) → iam.Person(Id)`
- FK: `(RevisionId, ExperienceId) → provider.ExperienceRevision(Id, ExperienceId)`
- FK: `(ParticipantResponseId, PersonId) → forms.FormResponse(Id, PersonId)`
- FK: `(CancelledByPersonId) → iam.Person(Id)`
- UNIQUE: `(PublicId)`
- UNIQUE: `(Id, ExperienceId)`
- UNIQUE: `(Id, ExperienceId, PersonId)`
- UNIQUE: `(ExperienceId, PersonId) WHERE Status IN ('Queued','Offered','Confirmed')` (فهرس فريد مفلتر)
- UNIQUE: `(CredentialHash) WHERE CredentialHash IS NOT NULL` (فهرس فريد مفلتر)
- INDEX: `(ExperienceId) INCLUDE (Status) WHERE Status IN ('Offered','Confirmed')`
- INDEX: `(ExperienceId, QueuedAtUtc) WHERE Status = 'Queued'`
- CHECK `CK_ExperienceBooking_Status`: `Status IN ('Queued','Offered','Confirmed','Cancelled','OfferDeclined','OfferExpired','Rejected')`
- CHECK `CK_ExperienceBooking_Mode`: `Mode IS NULL OR Mode IN ('Online','InPerson')`
- CHECK `CK_ExperienceBooking_Queued`: `Status <> 'Queued' OR QueuedAtUtc IS NOT NULL`
- CHECK `CK_ExperienceBooking_Offer`: `(Status <> 'Offered' OR (OfferedAtUtc IS NOT NULL AND OfferExpiresAtUtc > OfferedAtUtc AND OfferRespondedAtUtc IS NULL)) AND (Status NOT IN ('OfferDeclined','OfferExpired') OR (OfferedAtUtc IS NOT NULL AND OfferRespondedAtUtc IS NOT NULL))`
- CHECK `CK_ExperienceBooking_Confirmed`: `Status <> 'Confirmed' OR ConfirmedAtUtc IS NOT NULL`
- CHECK `CK_ExperienceBooking_Cancelled`: `Status <> 'Cancelled' OR CancelledAtUtc IS NOT NULL`
- حارس: كل أمر سعة يقفل provider.Experience ثم يتحقق: Confirmed + Offered ≤ سعة النسخة الحالية.
- حارس: TR_ExperienceBooking_Capacity: شبكة أمان للسعة.
- حارس: وظيفة مجدولة: Offered منتهٍ → OfferExpired ثم عرض على أقدم Queued مؤهل، ذريًا.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `provider.Experience` عبر `ExperienceId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `PersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `provider.ExperienceRevision` عبر `RevisionId, ExperienceId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `forms.FormResponse` عبر `ParticipantResponseId, PersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `iam.Person` عبر `CancelledByPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `session.Attendance` (BookingId, ExperienceId, PersonId)، `session.Completion` (BookingId, ExperienceId, PersonId)، `provider.ProviderCohortMember` (BookingId, ExperienceId)، `provider.ProviderIncident` (BookingId, ExperienceId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | Queued → Offered → Confirmed \| OfferDeclined \| OfferExpired؛ Queued\|Offered\|Confirmed → Cancelled؛ Queued → Rejected (أهلية). "Checked-in" و"Completed" حالتا عرض من Attendance وCompletion. |
| **الخصوصية والملكية والتفويض** | الشخص والمزوّد وطاقمه المسند. المبادرة المرتبطة ترى فقط ما يسمح به نطاق الشراكة. |
| **التاريخ والنسخ والاحتفاظ** | تاريخ الانتقالات في AuditEvent؛ الصفوف لا تُحذف. |
| **مثال ملموس** | تجربة ممتلئة؛ يُلغي شخص؛ أقدم Queued يصبح Offered حتى +24 ساعة؛ إن انتهت المهلة يصبح OfferExpired ويُعرض على التالي. |
| **ماذا ينكسر لو حُذف أو دُمج** | يضيع الحجز وقائمة الانتظار وضمان عدم تجاوز السعة (D27، WAIT-14). |
| **المصدر** | §16.1، §16.2، §11.2، D27، D40؛ Client/src/workspaces/domain.js (offerNext، expireOffers) |

### provider.ProviderCohort

<a id="provider-providercohort"></a>

| | |
|---|---|
| **الغرض** | فوج مشاركين داخل تجربة تحت مشرف مزوّد مسند. |
| **الميزة وسير العمل** | Provider cohorts للمشرف، تقييد رؤية المشرف لمشاركي فوجه. |
| **لماذا جدول مستقل** | المشرف المسند من المزوّد يرى فوجه فقط (§17). ليس مجموعة مهام: لا يقبل مهامًا ولا حديقة (D13)، ولذلك يبقى منفصلًا عن OperationalGroup بدل إضافة أب ثالث وقيود منع. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `provider.ProviderCohort` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `ExperienceId` | bigint | لا |  | FK → provider.Experience؛ FK → org.StaffAppointment (مركب: SupervisorAppointmentId, ExperienceId) |
| `SupervisorAppointmentId` | bigint | لا |  | FK → org.StaffAppointment (مركب: SupervisorAppointmentId, ExperienceId) |
| `Name` | nvarchar(160) | لا |  |  |
| `Status` | nvarchar(16) | لا | `N'Active'` |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_ProviderCohort (Id)`
- FK: `(ExperienceId) → provider.Experience(Id)`
- FK: `(SupervisorAppointmentId, ExperienceId) → org.StaffAppointment(Id, ExperienceId)`
- UNIQUE: `(Id, ExperienceId)`
- CHECK `CK_ProviderCohort_Status`: `Status IN ('Active','Closed')`
- حارس: TR_ProviderCohort_Supervisor: التعيين Active.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `provider.Experience` عبر `ExperienceId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `org.StaffAppointment` عبر `SupervisorAppointmentId, ExperienceId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `provider.ProviderCohortMember` (CohortId, ExperienceId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | Active → Closed. |
| **الخصوصية والملكية والتفويض** | المزوّد والمشرف المسند. |
| **التاريخ والنسخ والاحتفاظ** | الفوج المغلق يبقى مع عضوياته لتفسير من أشرف على من. |
| **مثال ملموس** | مخيم 40 شخصًا مقسم إلى فوجين لكل منهما مشرف. |
| **ماذا ينكسر لو حُذف أو دُمج** | يرى مشرف المزوّد كل المشاركين بدل فوجه. |
| **المصدر** | §2.1 Supervisor Cohort، §16، §17 |

### provider.ProviderCohortMember

<a id="provider-providercohortmember"></a>

| | |
|---|---|
| **الغرض** | فترة انتماء حجز مؤكد إلى فوج. |
| **الميزة وسير العمل** | توزيع المشاركين على الأفواج ونقلهم. |
| **لماذا جدول مستقل** | المفتاحان المركبان يضمنان أن الفوج والحجز من التجربة نفسها؛ الفهرس المفلتر فوج نشط واحد لكل حجز؛ الفترات تحفظ تاريخ النقل (§17 preserve transfer history). |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `provider.ProviderCohortMember` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `CohortId` | bigint | لا |  | FK → provider.ProviderCohort (مركب: CohortId, ExperienceId) |
| `ExperienceId` | bigint | لا |  | FK → provider.ProviderCohort (مركب: CohortId, ExperienceId)؛ FK → provider.ExperienceBooking (مركب: BookingId, ExperienceId) |
| `BookingId` | bigint | لا |  | FK → provider.ExperienceBooking (مركب: BookingId, ExperienceId) |
| `JoinedAtUtc` | datetime2(3) | لا |  |  |
| `LeftAtUtc` | datetime2(3) | نعم |  |  |
| `MovedByPersonId` | bigint | لا |  | FK → iam.Person |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_ProviderCohortMember (Id)`
- FK: `(CohortId, ExperienceId) → provider.ProviderCohort(Id, ExperienceId)`
- FK: `(BookingId, ExperienceId) → provider.ExperienceBooking(Id, ExperienceId)`
- FK: `(MovedByPersonId) → iam.Person(Id)`
- UNIQUE: `(BookingId) WHERE LeftAtUtc IS NULL` (فهرس فريد مفلتر)
- CHECK `CK_ProviderCohortMember_Times`: `LeftAtUtc IS NULL OR LeftAtUtc >= JoinedAtUtc`
- حارس: TR_ProviderCohortMember_Booking: الحجز Confirmed.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `provider.ProviderCohort` عبر `CohortId, ExperienceId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `provider.ExperienceBooking` عبر `BookingId, ExperienceId`؛ وكل صف هناك يقابله صفر أو واحد ضمن (LeftAtUtc IS NULL)، وكثير خارجه هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `MovedByPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: لا شيء.

| | |
|---|---|
| **دورة الحياة والانتقالات** | نشطة حتى LeftAtUtc. |
| **الخصوصية والملكية والتفويض** | المزوّد والمشرف المسند. |
| **التاريخ والنسخ والاحتفاظ** | الفترات المنتهية تبقى. |
| **مثال ملموس** | نقل مشارك من فوج أ إلى ب: يُغلق الصف القديم ويُنشأ جديد. |
| **ماذا ينكسر لو حُذف أو دُمج** | لا يمكن فرض حدود الفوج على المشرف ولا تتبع النقل. |
| **المصدر** | §16 Supervisors & Staff، §17 Students & Groups / cohorts؛ Client/src/workspaces/pages/supervisor/desk.js |

### provider.ProviderIncident

<a id="provider-providerincident"></a>

| | |
|---|---|
| **الغرض** | تقرير حادثة سلامة في تجربة، اختياريًا لجلسة أو حجز محدد. |
| **الميزة وسير العمل** | آلية الإبلاغ الآمن، "incident-safe aggregate" في تقارير المزوّد. |
| **لماذا جدول مستقل** | §24.2 يطلب آلية إبلاغ آمنة وقواعد حوادث؛ للحادثة دورة حياة ومرفق مقيد ومراجعة. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `provider.ProviderIncident` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `PublicId` | uniqueidentifier | لا | `NEWSEQUENTIALID()` | UQ — المعرّف الخارجي في الـAPI والروابط |
| `ExperienceId` | bigint | لا |  | FK → provider.Experience؛ FK → session.Session (مركب: SessionId, ExperienceId)؛ FK → provider.ExperienceBooking (مركب: BookingId, ExperienceId) |
| `SessionId` | bigint | نعم |  | FK → session.Session (مركب: SessionId, ExperienceId) |
| `BookingId` | bigint | نعم |  | FK → provider.ExperienceBooking (مركب: BookingId, ExperienceId) |
| `ReportedByPersonId` | bigint | لا |  | FK → iam.Person |
| `Summary` | nvarchar(2000) | لا |  |  |
| `FileId` | bigint | نعم |  | FK → files.SecureFile |
| `Status` | nvarchar(16) | لا | `N'Open'` |  |
| `OccurredAtUtc` | datetime2(3) | لا |  |  |
| `ResolutionNote` | nvarchar(2000) | نعم |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_ProviderIncident (Id)`
- FK: `(ExperienceId) → provider.Experience(Id)`
- FK: `(SessionId, ExperienceId) → session.Session(Id, ExperienceId)`
- FK: `(BookingId, ExperienceId) → provider.ExperienceBooking(Id, ExperienceId)`
- FK: `(ReportedByPersonId) → iam.Person(Id)`
- FK: `(FileId) → files.SecureFile(Id)`
- UNIQUE: `(PublicId)`
- CHECK `CK_ProviderIncident_Status`: `Status IN ('Open','Reviewed','Closed')`
- CHECK `CK_ProviderIncident_Resolved`: `Status = 'Open' OR ResolutionNote IS NOT NULL`

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `provider.Experience` عبر `ExperienceId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `session.Session` عبر `SessionId, ExperienceId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `provider.ExperienceBooking` عبر `BookingId, ExperienceId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `ReportedByPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `files.SecureFile` عبر `FileId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: لا شيء.

| | |
|---|---|
| **دورة الحياة والانتقالات** | Open → Reviewed → Closed. |
| **الخصوصية والملكية والتفويض** | حساس: المزوّد والطاقم المخول وAdmin فقط؛ التقارير تعرض مجاميع. |
| **التاريخ والنسخ والاحتفاظ** | لا تُحذف؛ مدة الاحتفاظ تحتاج سياسة قانونية لم تُحدَّد. |
| **مثال ملموس** | مشرف يسجل التواء كاحل مشارك في الجلسة 2 مع صورة مقيدة. |
| **ماذا ينكسر لو حُذف أو دُمج** | لا سجل سلامة قابل للتدقيق. |
| **المصدر** | §16، §24.2 |

---

## forms — النماذج والمسابقات

### forms.Form

<a id="forms-form"></a>

| | |
|---|---|
| **الغرض** | نموذج معرَّف الهوية يملكه مكوّن مبادرة أو تجربة مزوّد: تسجيل، استبيان، اختبار قصير، ملاحظات، أو مسابقة. |
| **الميزة وسير العمل** | Forms & surveys وCompetitions للمؤسسة، نموذج المشارك للمزوّد (المرحلة 5) والملاحظات الطوعية بعد الحضور، Tasks & forms للطالب، Explore (Competitions). |
| **لماذا جدول مستقل** | §15.4 يعدّ مشاركات المسابقة نوعًا من النماذج المعرّفة صراحة، والواجهة تستخدم "المحرك نفسه والسجلات نفسها". المسابقة إذن نموذج بغرض Competition مع حالة نشر النتائج؛ جدول Competition السابق كان تكرارًا. الملكية XOR تُصلح ثغرة سابقة: كان النموذج يتطلب مبادرة، فلا يمكن للمزوّد ربط نموذج مشارك (§16.3). |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `forms.Form` + يستوعب `forms.Competition` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK؛ FK → forms.FormVersion (مركب: CurrentVersionId, Id) |
| `PublicId` | uniqueidentifier | لا | `NEWSEQUENTIALID()` | UQ — المعرّف الخارجي في الـAPI والروابط |
| `InitiativeId` | bigint | نعم |  | FK → institution.Initiative |
| `ExperienceId` | bigint | نعم |  | FK → provider.Experience |
| `Purpose` | nvarchar(16) | لا |  |  |
| `Title` | nvarchar(200) | لا |  |  |
| `Status` | nvarchar(24) | لا | `N'Draft'` |  |
| `CurrentVersionId` | bigint | نعم |  | FK → forms.FormVersion (مركب: CurrentVersionId, Id) |
| `DraftJson` | nvarchar(max) | نعم |  |  |
| `ResultsPublishedAtUtc` | datetime2(3) | نعم |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_Form (Id)`
- FK: `(InitiativeId) → institution.Initiative(Id)`
- FK: `(ExperienceId) → provider.Experience(Id)`
- FK: `(CurrentVersionId, Id) → forms.FormVersion(Id, FormId)`
- UNIQUE: `(PublicId)`
- CHECK `CK_Form_Owner`: `(InitiativeId IS NOT NULL AND ExperienceId IS NULL) OR (InitiativeId IS NULL AND ExperienceId IS NOT NULL)`
- CHECK `CK_Form_Purpose`: `Purpose IN ('Registration','Survey','Quiz','Feedback','Competition')`
- CHECK `CK_Form_CompetitionOwner`: `Purpose <> 'Competition' OR InitiativeId IS NOT NULL`
- CHECK `CK_Form_Status`: `Status IN ('Draft','Published','Closed','ResultsPublished','Archived')`
- CHECK `CK_Form_Results`: `(Status = 'ResultsPublished' AND Purpose = 'Competition' AND ResultsPublishedAtUtc IS NOT NULL) OR (Status <> 'ResultsPublished' AND ResultsPublishedAtUtc IS NULL)`
- CHECK `CK_Form_Published`: `Status IN ('Draft','Archived') OR CurrentVersionId IS NOT NULL`
- CHECK `CK_Form_DraftJson`: `DraftJson IS NULL OR ISJSON(DraftJson) = 1`

**العلاقات**

- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `institution.Initiative` عبر `InitiativeId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `provider.Experience` عبر `ExperienceId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `forms.FormVersion` عبر `CurrentVersionId, Id`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `forms.FormVersion` (FormId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | Draft → Published → Closed → (للمسابقة) ResultsPublished → Archived. تعديل المنشور = نسخة جديدة. |
| **الخصوصية والملكية والتفويض** | لا استبيان مجهول (D41). الردود للمستجيب والمالك المخول فقط. |
| **التاريخ والنسخ والاحتفاظ** | النسخ في FormVersion. |
| **مثال ملموس** | الممثل ينشئ مسابقة "Design a feed-free evening" مرتبطة بالمبادرة؛ تظهر في Explore → Competitions. |
| **ماذا ينكسر لو حُذف أو دُمج** | لا نماذج تسجيل ولا استبيانات ولا مسابقات معرّفة (D41). |
| **المصدر** | §15.1 Forms/Competitions، §15.4، §16.3، D41؛ Client/src/workspaces/commands/institution.js (respondToForm، enterCompetition) |

### forms.FormVersion

<a id="forms-formversion"></a>

| | |
|---|---|
| **الغرض** | نسخة منشورة ثابتة من النموذج: نافذة الفتح، الموافقة، تعدد الردود، وللمسابقة القواعد وسياسة المشاركة. |
| **الميزة وسير العمل** | Publish revision، الرد مثبّت على النسخة، "historical response version". |
| **لماذا جدول مستقل** | §15.4/D41: الرد مثبّت على نسخة التعريف، والتعديل لا يعيد كتابة الردود السابقة. للمسابقة: نسخة القواعد هي نسخة الـrubric التي يُقيَّم بها. |
| **نوع الصف** | إلحاقي (a) |
| **الأصل في المخطط الحالي** | `forms.FormVersion` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `FormId` | bigint | لا |  | FK → forms.Form |
| `VersionNo` | int | لا |  |  |
| `ConsentNoticeVersion` | nvarchar(64) | لا |  |  |
| `OpensAtUtc` | datetime2(3) | لا |  |  |
| `ClosesAtUtc` | datetime2(3) | لا |  |  |
| `AllowMultipleResponses` | bit | لا | `0` |  |
| `RulesText` | nvarchar(max) | نعم |  |  |
| `EntryPolicyJson` | nvarchar(max) | نعم |  |  |
| `PublishedByPersonId` | bigint | لا |  | FK → iam.Person |
| `PublishedAtUtc` | datetime2(3) | لا |  |  |
| `SealedAtUtc` | datetime2(3) | نعم |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |

**المفاتيح والقيود والفهارس**

- PK: `PK_FormVersion (Id)`
- FK: `(FormId) → forms.Form(Id)`
- FK: `(PublishedByPersonId) → iam.Person(Id)`
- UNIQUE: `(Id, FormId)`
- UNIQUE: `(FormId, VersionNo)`
- CHECK `CK_FormVersion_VersionNo`: `VersionNo > 0`
- CHECK `CK_FormVersion_Window`: `ClosesAtUtc > OpensAtUtc`
- CHECK `CK_FormVersion_EntryPolicy`: `EntryPolicyJson IS NULL OR ISJSON(EntryPolicyJson) = 1`
- صلاحيات: INSERT/SELECT فقط لدور التشغيل؛ `TR_FormVersion_Immutable` يمنع UPDATE/DELETE عدا الاستثناء المذكور في الحراس.
- حارس: TR_FormVersion_Immutable: لا تحديث إلا ضبط SealedAtUtc مرة واحدة في معاملة النشر.
- حارس: الأسئلة والخيارات والمعايير تُدرج فقط قبل SealedAtUtc؛ الردود تُقبل فقط بعده.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `forms.Form` عبر `FormId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `PublishedByPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `institution.InitiativeRevision` (RegistrationFormVersionId)، `provider.ExperienceRevision` (ParticipantFormVersionId)، `forms.Form` (CurrentVersionId, Id)، `forms.FormQuestion` (FormVersionId)، `forms.FormResponse` (FormVersionId)، `forms.CompetitionCriterion` (FormVersionId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | إلحاقي؛ مختومة عند النشر. |
| **الخصوصية والملكية والتفويض** | القواعد والنافذة عامة للجمهور المستهدف؛ تعديلها للمالك فقط. |
| **التاريخ والنسخ والاحتفاظ** | كل النسخ تبقى. |
| **مثال ملموس** | تعديل سؤال بعد 30 ردًا: النسخة 2؛ الردود الثلاثون تبقى على النسخة 1. |
| **ماذا ينكسر لو حُذف أو دُمج** | تتغير الأسئلة تحت ردود موجودة. |
| **المصدر** | §15.4، §21.2، D41 |

### forms.FormQuestion

<a id="forms-formquestion"></a>

| | |
|---|---|
| **الغرض** | سؤال واحد في نسخة نموذج. |
| **الميزة وسير العمل** | منشئ الأسئلة، عرض الردود والمجاميع لكل سؤال في forms/:id/responses. |
| **لماذا جدول مستقل** | الإجابات تشير إلى السؤال بمفتاح مركب يضمن أنه من نسخة الرد نفسها، والتقارير تجمع الإجابات لكل سؤال عبر المستجيبين؛ هذه شروط الصفوف العلائقية في سياسة JSON. |
| **نوع الصف** | إلحاقي (a) |
| **الأصل في المخطط الحالي** | `forms.FormQuestion` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `FormVersionId` | bigint | لا |  | FK → forms.FormVersion |
| `QuestionKey` | nvarchar(80) | لا |  |  |
| `SortOrder` | smallint | لا |  |  |
| `Prompt` | nvarchar(1000) | لا |  |  |
| `QuestionType` | nvarchar(16) | لا |  |  |
| `IsRequired` | bit | لا |  |  |
| `ValidationJson` | nvarchar(1000) | نعم |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |

**المفاتيح والقيود والفهارس**

- PK: `PK_FormQuestion (Id)`
- FK: `(FormVersionId) → forms.FormVersion(Id)`
- UNIQUE: `(Id, FormVersionId)`
- UNIQUE: `(FormVersionId, QuestionKey)`
- UNIQUE: `(FormVersionId, SortOrder)`
- CHECK `CK_FormQuestion_Type`: `QuestionType IN ('ShortText','LongText','Number','SingleChoice','MultipleChoice','File','Consent')`
- CHECK `CK_FormQuestion_SortOrder`: `SortOrder > 0`
- CHECK `CK_FormQuestion_Validation`: `ValidationJson IS NULL OR ISJSON(ValidationJson) = 1`
- صلاحيات: INSERT/SELECT فقط لدور التشغيل؛ `TR_FormQuestion_Immutable` يمنع UPDATE/DELETE.
- حارس: TR_FormQuestion_Immutable: إلحاقي ومختوم مع النسخة.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `forms.FormVersion` عبر `FormVersionId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `forms.FormQuestionOption` (QuestionId)، `forms.FormAnswer` (QuestionId, FormVersionId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | إلحاقي: يُدرج في معاملة النشر قبل SealedAtUtc ثم يُختم مع النسخة. |
| **الخصوصية والملكية والتفويض** | نص السؤال مرئي للمستجيبين المؤهلين؛ الأسئلة الحساسة تُعلَّم في ValidationJson لتقييد قراء إجاباتها. |
| **التاريخ والنسخ والاحتفاظ** | يتبع النسخة. |
| **مثال ملموس** | Q3 "Which session times work for you?" من نوع MultipleChoice. |
| **ماذا ينكسر لو حُذف أو دُمج** | يفقد ربط الإجابة بسؤال نسختها والتجميع لكل سؤال. |
| **المصدر** | §15.1 Forms، §15.4 |

### forms.FormQuestionOption

<a id="forms-formquestionoption"></a>

| | |
|---|---|
| **الغرض** | خيار واحد لسؤال اختيار. |
| **الميزة وسير العمل** | أسئلة الاختيار المفرد والمتعدد، عدّ الاختيارات في المجاميع. |
| **لماذا جدول مستقل** | الإجابة الاختيارية تشير إلى الخيار بمفتاح مركب (OptionId, QuestionId) يمنع اختيار خيار من سؤال آخر، وعدّ الاختيارات عبر المستجيبين تجميع صفوف. |
| **نوع الصف** | إلحاقي (a) |
| **الأصل في المخطط الحالي** | `forms.FormQuestionOption` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `QuestionId` | bigint | لا |  | FK → forms.FormQuestion |
| `OptionCode` | nvarchar(120) | لا |  |  |
| `Label` | nvarchar(300) | لا |  |  |
| `SortOrder` | smallint | لا |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |

**المفاتيح والقيود والفهارس**

- PK: `PK_FormQuestionOption (Id)`
- FK: `(QuestionId) → forms.FormQuestion(Id)`
- UNIQUE: `(Id, QuestionId)`
- UNIQUE: `(QuestionId, OptionCode)`
- UNIQUE: `(QuestionId, SortOrder)`
- CHECK `CK_FormQuestionOption_SortOrder`: `SortOrder > 0`
- صلاحيات: INSERT/SELECT فقط لدور التشغيل؛ `TR_FormQuestionOption_Immutable` يمنع UPDATE/DELETE.
- حارس: TR_FormQuestionOption_Immutable: إلحاقي ومختوم مع النسخة.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `forms.FormQuestion` عبر `QuestionId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `forms.FormAnswer` (OptionId, QuestionId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | إلحاقي: يُدرج مع سؤاله قبل الختم ولا يتغير. |
| **الخصوصية والملكية والتفويض** | مرئي للمستجيبين المؤهلين. |
| **التاريخ والنسخ والاحتفاظ** | يتبع النسخة. |
| **مثال ملموس** | خيارات Q3: evening، weekend، online-only. |
| **ماذا ينكسر لو حُذف أو دُمج** | يمكن تخزين اختيار غير موجود أو من سؤال آخر. |
| **المصدر** | §15.1 Forms |

### forms.FormResponse

<a id="forms-formresponse"></a>

| | |
|---|---|
| **الغرض** | رد شخص واحد على نسخة نموذج، أو مشاركته في مسابقة. |
| **الميزة وسير العمل** | تعبئة النماذج من Explore/My Initiatives/Tasks & forms، نموذج التسجيل المرتبط بالطلب أو الحجز، مشاركة المسابقة وحالتها. |
| **لماذا جدول مستقل** | الرد سجل مُسند بموافقة ونسخة، ويُشار إليه من الطلب والحجز وتسجيل الجلسة كدليل على "submits required consent/form" (§15.3)، ومن أحكام المسابقة. مشاركة المسابقة كانت جدولًا منفصلًا بالأعمدة نفسها تقريبًا؛ "Reviewed" حالة مشتقة من وجود حكم. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `forms.FormResponse` + يستوعب `forms.CompetitionEntry` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `PublicId` | uniqueidentifier | لا | `NEWSEQUENTIALID()` | UQ — المعرّف الخارجي في الـAPI والروابط |
| `FormVersionId` | bigint | لا |  | FK → forms.FormVersion |
| `PersonId` | bigint | لا |  | FK → iam.Person |
| `ResponseNo` | int | لا |  |  |
| `Status` | nvarchar(16) | لا | `N'Draft'` |  |
| `ConsentAtUtc` | datetime2(3) | نعم |  |  |
| `SubmittedAtUtc` | datetime2(3) | نعم |  |  |
| `WithdrawnAtUtc` | datetime2(3) | نعم |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_FormResponse (Id)`
- FK: `(FormVersionId) → forms.FormVersion(Id)`
- FK: `(PersonId) → iam.Person(Id)`
- UNIQUE: `(PublicId)`
- UNIQUE: `(Id, FormVersionId)`
- UNIQUE: `(Id, PersonId)`
- UNIQUE: `(FormVersionId, PersonId, ResponseNo)`
- INDEX: `(FormVersionId) WHERE Status = 'Submitted'`
- CHECK `CK_FormResponse_ResponseNo`: `ResponseNo > 0`
- CHECK `CK_FormResponse_Status`: `Status IN ('Draft','Submitted','Withdrawn')`
- CHECK `CK_FormResponse_Submitted`: `Status = 'Draft' OR (SubmittedAtUtc IS NOT NULL AND ConsentAtUtc IS NOT NULL)`
- CHECK `CK_FormResponse_Withdrawn`: `(Status = 'Withdrawn' AND WithdrawnAtUtc IS NOT NULL) OR (Status <> 'Withdrawn' AND WithdrawnAtUtc IS NULL)`
- حارس: TR_FormResponse_Guard: ResponseNo > 1 مسموح فقط إن كانت AllowMultipleResponses=1؛ النافذة مفتوحة؛ النسخة مختومة؛ المستجيب مؤهل.
- حارس: TR_FormResponse_Terminal: بعد Submitted لا يتغير المالك ولا الإجابات؛ يُسمح فقط بـWithdrawn.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `forms.FormVersion` عبر `FormVersionId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `PersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `institution.InitiativeApplication` (RegistrationResponseId, PersonId)، `session.SessionRegistration` (RegistrationResponseId, PersonId)، `provider.ExperienceBooking` (ParticipantResponseId, PersonId)، `forms.FormAnswer` (ResponseId, FormVersionId)، `forms.CompetitionJudgment` (ResponseId, FormVersionId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | Draft → Submitted → Withdrawn (إن سمحت السياسة). |
| **الخصوصية والملكية والتفويض** | معرَّف؛ يقرؤه المستجيب والقارئ المخول للمالك؛ الإجابات الحساسة بقراء ضيقين (§24.1). |
| **التاريخ والنسخ والاحتفاظ** | لا يُحذف؛ مدة الاحتفاظ لم تُحدَّد. |
| **مثال ملموس** | متقدم لمبادرة يملأ نموذج التسجيل (العمر، الدافع)؛ يُربط الرد بـInitiativeApplication.RegistrationResponseId. |
| **ماذا ينكسر لو حُذف أو دُمج** | لا دليل على النموذج والموافقة عند التقديم، ولا مسابقات. |
| **المصدر** | §15.3، §15.4، §16.2، D41 |

### forms.FormAnswer

<a id="forms-formanswer"></a>

| | |
|---|---|
| **الغرض** | قيمة إجابة واحدة: نص، رقم، ملف، أو خيار واحد (الاختيار المتعدد = عدة صفوف). |
| **الميزة وسير العمل** | حفظ الرد، عرض الردود، المجاميع لكل خيار وسؤال، التصدير. |
| **لماذا جدول مستقل** | الإجابة تحتاج مفاتيح مركبة حقيقية إلى السؤال والخيار في النسخة نفسها، وتُجمع عبر المستجيبين. جدول FormAnswerChoice السابق كرر حقيقة "الخيار المختار" بطريقتين (ChoiceCode نصي للمفرد وجدول للمتعدد)؛ الآن الخيار دائمًا OptionId بمفتاح أجنبي. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `forms.FormAnswer` + يستوعب `forms.FormAnswerChoice` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `ResponseId` | bigint | لا |  | FK → forms.FormResponse (مركب: ResponseId, FormVersionId) |
| `FormVersionId` | bigint | لا |  | FK → forms.FormResponse (مركب: ResponseId, FormVersionId)؛ FK → forms.FormQuestion (مركب: QuestionId, FormVersionId) |
| `QuestionId` | bigint | لا |  | FK → forms.FormQuestion (مركب: QuestionId, FormVersionId)؛ FK → forms.FormQuestionOption (مركب: OptionId, QuestionId) |
| `OptionId` | bigint | نعم |  | FK → forms.FormQuestionOption (مركب: OptionId, QuestionId) |
| `TextValue` | nvarchar(max) | نعم |  |  |
| `NumberValue` | decimal(18,4) | نعم |  |  |
| `FileId` | bigint | نعم |  | FK → files.SecureFile |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_FormAnswer (Id)`
- FK: `(ResponseId, FormVersionId) → forms.FormResponse(Id, FormVersionId)`
- FK: `(QuestionId, FormVersionId) → forms.FormQuestion(Id, FormVersionId)`
- FK: `(OptionId, QuestionId) → forms.FormQuestionOption(Id, QuestionId)`
- FK: `(FileId) → files.SecureFile(Id)`
- UNIQUE: `(ResponseId, QuestionId) WHERE OptionId IS NULL` (فهرس فريد مفلتر)
- UNIQUE: `(ResponseId, QuestionId, OptionId) WHERE OptionId IS NOT NULL` (فهرس فريد مفلتر)
- INDEX: `(QuestionId, OptionId)`
- CHECK `CK_FormAnswer_OneValue`: `(CASE WHEN OptionId IS NULL THEN 0 ELSE 1 END + CASE WHEN TextValue IS NULL THEN 0 ELSE 1 END + CASE WHEN NumberValue IS NULL THEN 0 ELSE 1 END + CASE WHEN FileId IS NULL THEN 0 ELSE 1 END) = 1`
- حارس: TR_FormAnswer_Guard: نوع القيمة يطابق QuestionType؛ SingleChoice يقبل صف خيار واحدًا؛ الملف يملكه المستجيب؛ لا تعديل بعد Submitted.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `forms.FormResponse` عبر `ResponseId, FormVersionId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `forms.FormQuestion` عبر `QuestionId, FormVersionId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `forms.FormQuestionOption` عبر `OptionId, QuestionId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `files.SecureFile` عبر `FileId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: لا شيء.

| | |
|---|---|
| **دورة الحياة والانتقالات** | قابل للتعديل في Draft؛ مختوم بعد Submitted. |
| **الخصوصية والملكية والتفويض** | معرَّف؛ المستجيب والقارئ المخول للمالك؛ إجابات الأسئلة الحساسة لقارئ أضيق (§24.1)، والمدرب لا يرى إلا الأثر التشغيلي. |
| **التاريخ والنسخ والاحتفاظ** | يتبع الرد. |
| **مثال ملموس** | Q3 متعدد: صفان OptionId=evening وOptionId=weekend؛ Q1 نصي: صف TextValue. |
| **ماذا ينكسر لو حُذف أو دُمج** | تفقد الإجابات ربطها الموثوق بالأسئلة والخيارات، وتصبح المجاميع تحليلًا لنصوص. |
| **المصدر** | §15.1 Forms responses، §15.4 |

### forms.CompetitionCriterion

<a id="forms-competitioncriterion"></a>

| | |
|---|---|
| **الغرض** | معيار تحكيم منشور في نسخة المسابقة. |
| **الميزة وسير العمل** | "judging criteria" في منشئ المسابقة، بطاقة التحكيم. |
| **لماذا جدول مستقل** | الدرجات تشير إلى المعيار بمفتاح مركب مع نسخة المسابقة، فلا يمكن تحكيم مشاركة بمعيار من نسخة أخرى. الترتيب والنتائج تجميع للدرجات عبر المشاركات. |
| **نوع الصف** | إلحاقي (a) |
| **الأصل في المخطط الحالي** | `forms.CompetitionCriterion` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `FormVersionId` | bigint | لا |  | FK → forms.FormVersion |
| `CriterionCode` | nvarchar(80) | لا |  |  |
| `Label` | nvarchar(300) | لا |  |  |
| `MaxScore` | decimal(9,4) | لا |  |  |
| `Weight` | decimal(9,4) | نعم |  |  |
| `SortOrder` | smallint | لا |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |

**المفاتيح والقيود والفهارس**

- PK: `PK_CompetitionCriterion (Id)`
- FK: `(FormVersionId) → forms.FormVersion(Id)`
- UNIQUE: `(Id, FormVersionId)`
- UNIQUE: `(FormVersionId, CriterionCode)`
- CHECK `CK_CompetitionCriterion_MaxScore`: `MaxScore > 0`
- CHECK `CK_CompetitionCriterion_Weight`: `Weight IS NULL OR Weight > 0`
- CHECK `CK_CompetitionCriterion_SortOrder`: `SortOrder > 0`
- صلاحيات: INSERT/SELECT فقط لدور التشغيل؛ `TR_CompetitionCriterion_Immutable` يمنع UPDATE/DELETE.
- حارس: TR_CompetitionCriterion_Guard: النموذج Purpose=Competition؛ مختوم مع النسخة.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `forms.FormVersion` عبر `FormVersionId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `forms.CompetitionCriterionScore` (CriterionId, FormVersionId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | إلحاقي: يُدرج مع نسخة المسابقة قبل الختم؛ تغيير الـrubric نسخة جديدة. |
| **الخصوصية والملكية والتفويض** | عام للمشاركين. |
| **التاريخ والنسخ والاحتفاظ** | يتبع النسخة. |
| **مثال ملموس** | Originality (MaxScore 10)، Feasibility (MaxScore 10). |
| **ماذا ينكسر لو حُذف أو دُمج** | تُحكَّم المشاركات بمعايير غير منشورة أو متغيرة. |
| **المصدر** | §15.1 Competitions، §11.2 Competition، §26.2 #8 |

### forms.CompetitionJudgment

<a id="forms-competitionjudgment"></a>

| | |
|---|---|
| **الغرض** | حكم محكّم واحد على مشاركة مسابقة. |
| **الميزة وسير العمل** | Judge with audit، Feedback المرئية للمشارك، نشر النتائج. |
| **لماذا جدول مستقل** | لكل مشاركة عدة محكّمين، ولكل حكم درجات معايير؛ الحكم إلحاقي ومُسند (§15.1). لا يمنح مكافأة شخصية (no Garden farming). |
| **نوع الصف** | إلحاقي (a) |
| **الأصل في المخطط الحالي** | `forms.CompetitionJudgment` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `ResponseId` | bigint | لا |  | FK → forms.FormResponse (مركب: ResponseId, FormVersionId) |
| `FormVersionId` | bigint | لا |  | FK → forms.FormResponse (مركب: ResponseId, FormVersionId) |
| `JudgePersonId` | bigint | لا |  | FK → iam.Person |
| `Decision` | nvarchar(16) | لا |  |  |
| `Feedback` | nvarchar(2000) | نعم |  |  |
| `DecidedAtUtc` | datetime2(3) | لا |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |

**المفاتيح والقيود والفهارس**

- PK: `PK_CompetitionJudgment (Id)`
- FK: `(ResponseId, FormVersionId) → forms.FormResponse(Id, FormVersionId)`
- FK: `(JudgePersonId) → iam.Person(Id)`
- UNIQUE: `(Id, FormVersionId)`
- UNIQUE: `(ResponseId, JudgePersonId)`
- CHECK `CK_CompetitionJudgment_Decision`: `Decision IN ('Scored','Disqualified','Abstained')`
- صلاحيات: INSERT/SELECT فقط لدور التشغيل؛ `TR_CompetitionJudgment_Immutable` يمنع UPDATE/DELETE.
- حارس: TR_CompetitionJudgment_Immutable: إلحاقي. الحكَم مخول للمبادرة (ممثل/مشرف/مدرب نشط) ولا يحكم على مشاركته.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `forms.FormResponse` عبر `ResponseId, FormVersionId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `JudgePersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `forms.CompetitionCriterionScore` (JudgmentId, FormVersionId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | إلحاقي: حكم واحد لكل محكّم ومشاركة؛ التصحيح بعد نشر النتائج يحتاج سياسة استئناف لم تُعتمد (§26.2 #8). |
| **الخصوصية والملكية والتفويض** | الدرجات التفصيلية للطاقم؛ المشارك يرى حالته والنتائج المسموحة. |
| **التاريخ والنسخ والاحتفاظ** | يبقى ويُستخدم في إعادة حساب النتائج. |
| **مثال ملموس** | المشرفة تحكم على المشاركة 14 بـScored. |
| **ماذا ينكسر لو حُذف أو دُمج** | لا تحكيم قابل للتدقيق. |
| **المصدر** | §15.1 Competitions |

### forms.CompetitionCriterionScore

<a id="forms-competitioncriterionscore"></a>

| | |
|---|---|
| **الغرض** | درجة معيار واحد في حكم واحد. |
| **الميزة وسير العمل** | الترتيب والنتائج المنشورة. |
| **لماذا جدول مستقل** | الترتيب = مجموع الدرجات الموزونة عبر المحكّمين والمعايير لكل مشاركة؛ تجميع صفوف. المفتاحان المركبان يضمنان أن الحكم والمعيار من نسخة المسابقة نفسها. |
| **نوع الصف** | إلحاقي (a) |
| **الأصل في المخطط الحالي** | `forms.CompetitionCriterionScore` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `JudgmentId` | bigint | لا |  | FK → forms.CompetitionJudgment (مركب: JudgmentId, FormVersionId) |
| `CriterionId` | bigint | لا |  | FK → forms.CompetitionCriterion (مركب: CriterionId, FormVersionId) |
| `FormVersionId` | bigint | لا |  | FK → forms.CompetitionJudgment (مركب: JudgmentId, FormVersionId)؛ FK → forms.CompetitionCriterion (مركب: CriterionId, FormVersionId) |
| `Score` | decimal(9,4) | لا |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |

**المفاتيح والقيود والفهارس**

- PK: `PK_CompetitionCriterionScore (Id)`
- FK: `(JudgmentId, FormVersionId) → forms.CompetitionJudgment(Id, FormVersionId)`
- FK: `(CriterionId, FormVersionId) → forms.CompetitionCriterion(Id, FormVersionId)`
- UNIQUE: `(JudgmentId, CriterionId)`
- CHECK `CK_CompetitionCriterionScore_Score`: `Score >= 0`
- صلاحيات: INSERT/SELECT فقط لدور التشغيل؛ `TR_CompetitionCriterionScore_Immutable` يمنع UPDATE/DELETE.
- حارس: TR_CompetitionCriterionScore_Guard: Score ≤ MaxScore؛ إلحاقي.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `forms.CompetitionJudgment` عبر `JudgmentId, FormVersionId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `forms.CompetitionCriterion` عبر `CriterionId, FormVersionId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: لا شيء.

| | |
|---|---|
| **دورة الحياة والانتقالات** | إلحاقي: يُدرج مع حكمه في المعاملة نفسها. |
| **الخصوصية والملكية والتفويض** | الطاقم المخول؛ المشارك يرى ما تسمح به سياسة نشر النتائج. |
| **التاريخ والنسخ والاحتفاظ** | يبقى مع حكمه. |
| **مثال ملموس** | الحكم 31: Originality=8، Feasibility=6. |
| **ماذا ينكسر لو حُذف أو دُمج** | لا يمكن حساب النتائج من سجلات قابلة للتدقيق. |
| **المصدر** | §15.1 Competitions |

---

## community — المجتمع

### community.Post

<a id="community-post"></a>

| | |
|---|---|
| **الغرض** | منشور مجتمع قصير، اختياريًا مشاركة إنجاز حقيقي. |
| **الميزة وسير العمل** | Community feed، New Post، Share Achievement (اختياري، بلا مكافأة)، Hear from Your Community في Home. |
| **لماذا جدول مستقل** | المجتمع ضمن النطاق المحتفظ به (D44، §12.1) والمنشور جذر التفاعلات والإبلاغات. المفتاح المركب إلى الدليل يضمن أن الشخص يشارك إنجازه هو فقط. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `community.Post` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `PublicId` | uniqueidentifier | لا | `NEWSEQUENTIALID()` | UQ — المعرّف الخارجي في الـAPI والروابط |
| `AuthorPersonId` | bigint | لا |  | FK → iam.Person؛ FK → evidence.EvidenceEvent (مركب: SharedEvidenceEventId, AuthorPersonId) |
| `TopicCode` | nvarchar(40) | نعم |  |  |
| `Body` | nvarchar(max) | لا |  |  |
| `ImageFileId` | bigint | نعم |  | FK → files.SecureFile |
| `SharedEvidenceEventId` | bigint | نعم |  | FK → evidence.EvidenceEvent (مركب: SharedEvidenceEventId, AuthorPersonId) |
| `Status` | nvarchar(16) | لا | `N'Draft'` |  |
| `PublishedAtUtc` | datetime2(3) | نعم |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_Post (Id)`
- FK: `(AuthorPersonId) → iam.Person(Id)`
- FK: `(ImageFileId) → files.SecureFile(Id)`
- FK: `(SharedEvidenceEventId, AuthorPersonId) → evidence.EvidenceEvent(Id, SubjectPersonId)`
- UNIQUE: `(PublicId)`
- INDEX: `(PublishedAtUtc) WHERE Status = 'Published'`
- CHECK `CK_Post_Status`: `Status IN ('Draft','Published','Hidden','Removed')`
- CHECK `CK_Post_Published`: `Status <> 'Published' OR PublishedAtUtc IS NOT NULL`
- حارس: TR_Post_Owner: المؤلف لا يتغير.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `AuthorPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `files.SecureFile` عبر `ImageFileId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `evidence.EvidenceEvent` عبر `SharedEvidenceEventId, AuthorPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `community.Comment` (PostId)، `community.Reaction` (PostId)، `community.Bookmark` (PostId)، `community.ContentReport` (PostId)، `community.ModerationDecision` (PostId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | Draft → Published → Hidden \| Removed (إشراف) → Published (Restore). |
| **الخصوصية والملكية والتفويض** | مرئي للأعضاء عند النشر؛ لا يكشف بيانات خاصة إلا باختيار صريح. |
| **التاريخ والنسخ والاحتفاظ** | لا حذف فعلي؛ قرارات الإشراف في ModerationDecision. |
| **مثال ملموس** | مستخدم يشارك "First week of evening walks" مع ربط حدث الروتين؛ لا نمو في الحديقة. |
| **ماذا ينكسر لو حُذف أو دُمج** | لا يبقى للمجتمع محتوى ولا مرجع للتفاعلات والإبلاغات والمشاركة الاختيارية للإنجاز. |
| **المصدر** | §7.5، §12.1، D44؛ Client/src/pages/member/community/* |

### community.Comment

<a id="community-comment"></a>

| | |
|---|---|
| **الغرض** | تعليق على منشور. |
| **الميزة وسير العمل** | Comments، الإبلاغ عن تعليق، الإشراف. |
| **لماذا جدول مستقل** | كيان بمؤلف وحالة إشراف ويمكن الإبلاغ عنه مستقلًا عن منشوره. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `community.Comment` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `PostId` | bigint | لا |  | FK → community.Post |
| `AuthorPersonId` | bigint | لا |  | FK → iam.Person |
| `Body` | nvarchar(2000) | لا |  |  |
| `Status` | nvarchar(16) | لا | `N'Published'` |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_Comment (Id)`
- FK: `(PostId) → community.Post(Id)`
- FK: `(AuthorPersonId) → iam.Person(Id)`
- INDEX: `(PostId, CreatedAtUtc)`
- CHECK `CK_Comment_Status`: `Status IN ('Published','Hidden','Removed')`
- حارس: TR_Comment_Owner: المؤلف والمنشور لا يتغيران.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `community.Post` عبر `PostId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `AuthorPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `community.ContentReport` (CommentId)، `community.ModerationDecision` (CommentId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | Published → Hidden \| Removed → Published. |
| **الخصوصية والملكية والتفويض** | مرئي لأعضاء المجتمع حسب حالة المنشور؛ المخفي يراه المؤلف والمشرفون. |
| **التاريخ والنسخ والاحتفاظ** | لا حذف فعلي. |
| **مثال ملموس** | تعليق مسيء يُبلَّغ عنه ثم يُخفى. |
| **ماذا ينكسر لو حُذف أو دُمج** | لا تعليقات ولا إشراف عليها. |
| **المصدر** | §12.1؛ Client/src/pages/member/community/community.js |

### community.Reaction

<a id="community-reaction"></a>

| | |
|---|---|
| **الغرض** | تفاعل شخص مع منشور. |
| **الميزة وسير العمل** | Reactions، عدّ التفاعلات. |
| **لماذا جدول مستقل** | الفهرس الفريد يمنع التفاعل المزدوج في السباق؛ العدّ عبر الأشخاص. لا يمنح مكافأة. |
| **نوع الصف** | إلحاقي (a) |
| **الأصل في المخطط الحالي** | `community.Reaction` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `PostId` | bigint | لا |  | FK → community.Post |
| `PersonId` | bigint | لا |  | FK → iam.Person |
| `ReactionCode` | nvarchar(24) | لا |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |

**المفاتيح والقيود والفهارس**

- PK: `PK_Reaction (Id)`
- FK: `(PostId) → community.Post(Id)`
- FK: `(PersonId) → iam.Person(Id)`
- UNIQUE: `(PostId, PersonId, ReactionCode)`
- صلاحيات: INSERT/SELECT فقط لدور التشغيل؛ `TR_Reaction_Immutable` يمنع UPDATE/DELETE.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `community.Post` عبر `PostId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `PersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: لا شيء.

| | |
|---|---|
| **دورة الحياة والانتقالات** | إضافة؛ الإلغاء حذف الصف (تبديل بلا قيمة تاريخية؛ لا متطلب لتاريخ التفاعلات). |
| **الخصوصية والملكية والتفويض** | العدّ عام؛ هوية المتفاعلين حسب سياسة المجتمع. |
| **التاريخ والنسخ والاحتفاظ** | لا تاريخ مطلوب. |
| **مثال ملموس** | ضغط "support" مرتين متزامنتين ينتج صفًا واحدًا. |
| **ماذا ينكسر لو حُذف أو دُمج** | تكرار التفاعلات. |
| **المصدر** | §12.1؛ Client/src/pages/member/community/community.js |

### community.Bookmark

<a id="community-bookmark"></a>

| | |
|---|---|
| **الغرض** | حفظ شخص لمنشور. |
| **الميزة وسير العمل** | Save/bookmark. |
| **لماذا جدول مستقل** | خاص بالشخص (لا يُعرض لغيره) بخلاف التفاعل العام؛ اختلاف تصنيف الخصوصية يبرر عدم دمجهما. |
| **نوع الصف** | إلحاقي (a) |
| **الأصل في المخطط الحالي** | `community.Bookmark` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `PostId` | bigint | لا |  | FK → community.Post |
| `PersonId` | bigint | لا |  | FK → iam.Person |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |

**المفاتيح والقيود والفهارس**

- PK: `PK_Bookmark (Id)`
- FK: `(PostId) → community.Post(Id)`
- FK: `(PersonId) → iam.Person(Id)`
- UNIQUE: `(PostId, PersonId)`
- صلاحيات: INSERT/SELECT فقط لدور التشغيل؛ `TR_Bookmark_Immutable` يمنع UPDATE/DELETE.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `community.Post` عبر `PostId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `PersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: لا شيء.

| | |
|---|---|
| **دورة الحياة والانتقالات** | إضافة/حذف. |
| **الخصوصية والملكية والتفويض** | خاص بالشخص. |
| **التاريخ والنسخ والاحتفاظ** | لا تاريخ مطلوب. |
| **مثال ملموس** | حفظ منشور نصائح للعودة إليه. |
| **ماذا ينكسر لو حُذف أو دُمج** | يفقد المستخدم قائمة محفوظاته الخاصة. |
| **المصدر** | §12.1؛ Client/src/pages/member/community/community.js |

### community.ContentReport

<a id="community-contentreport"></a>

| | |
|---|---|
| **الغرض** | بلاغ عن محتوى مسيء. |
| **الميزة وسير العمل** | Report، طابور Community moderation في Admin. |
| **لماذا جدول مستقل** | للبلاغ دورة حياة ومبلّغ؛ الهدف XOR بمفتاحين حقيقيين. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `community.ContentReport` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `PostId` | bigint | نعم |  | FK → community.Post |
| `CommentId` | bigint | نعم |  | FK → community.Comment |
| `ReporterPersonId` | bigint | لا |  | FK → iam.Person |
| `ReasonCode` | nvarchar(40) | لا |  |  |
| `Details` | nvarchar(1000) | نعم |  |  |
| `Status` | nvarchar(16) | لا | `N'Submitted'` |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_ContentReport (Id)`
- FK: `(PostId) → community.Post(Id)`
- FK: `(CommentId) → community.Comment(Id)`
- FK: `(ReporterPersonId) → iam.Person(Id)`
- UNIQUE: `(PostId, ReporterPersonId) WHERE PostId IS NOT NULL AND Status <> 'Resolved'` (فهرس فريد مفلتر)
- UNIQUE: `(CommentId, ReporterPersonId) WHERE CommentId IS NOT NULL AND Status <> 'Resolved'` (فهرس فريد مفلتر)
- CHECK `CK_ContentReport_Target`: `(PostId IS NOT NULL AND CommentId IS NULL) OR (PostId IS NULL AND CommentId IS NOT NULL)`
- CHECK `CK_ContentReport_Status`: `Status IN ('Submitted','Reviewing','Resolved')`
- حارس: TR_ContentReport_Owner: الهدف والمبلِّغ لا يتغيران.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `community.Post` عبر `PostId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `community.Comment` عبر `CommentId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `ReporterPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `community.ModerationDecision` (ReportId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | Submitted → Reviewing → Resolved. |
| **الخصوصية والملكية والتفويض** | المبلّغ وMMods؛ هوية المبلّغ لا تُكشف للمؤلف. |
| **التاريخ والنسخ والاحتفاظ** | البلاغ المحلول يبقى مع قرارات الإشراف لتفسير الإخفاء أو الإزالة. |
| **مثال ملموس** | بلاغان من شخصين على المنشور نفسه؛ بلاغ مكرر من الشخص نفسه يُرفض. |
| **ماذا ينكسر لو حُذف أو دُمج** | لا آلية إبلاغ. |
| **المصدر** | §12.1، §19 Community moderation |

### community.ModerationDecision

<a id="community-moderationdecision"></a>

| | |
|---|---|
| **الغرض** | قرار إشراف مُسند بسبب على منشور أو تعليق، ببلاغ أو بمبادرة المشرف. |
| **الميزة وسير العمل** | Review/Hide/Dismiss/Remove والاستعادة في moderation. |
| **لماذا جدول مستقل** | المحتوى قد يُخفى ثم يُستعاد بعد مراجعة (سلسلة قرارات)، وقد يتصرف المشرف دون بلاغ. القرار سجل إلحاقي يقرؤه Admin كتاريخ الهدف. |
| **نوع الصف** | إلحاقي (a) |
| **الأصل في المخطط الحالي** | `community.ModerationDecision` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `ReportId` | bigint | نعم |  | FK → community.ContentReport |
| `PostId` | bigint | نعم |  | FK → community.Post |
| `CommentId` | bigint | نعم |  | FK → community.Comment |
| `ModeratorPersonId` | bigint | لا |  | FK → iam.Person |
| `Decision` | nvarchar(16) | لا |  |  |
| `Reason` | nvarchar(1000) | لا |  |  |
| `DecidedAtUtc` | datetime2(3) | لا |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |

**المفاتيح والقيود والفهارس**

- PK: `PK_ModerationDecision (Id)`
- FK: `(ReportId) → community.ContentReport(Id)`
- FK: `(PostId) → community.Post(Id)`
- FK: `(CommentId) → community.Comment(Id)`
- FK: `(ModeratorPersonId) → iam.Person(Id)`
- INDEX: `(PostId, DecidedAtUtc) WHERE PostId IS NOT NULL`
- CHECK `CK_ModerationDecision_Target`: `(PostId IS NOT NULL AND CommentId IS NULL) OR (PostId IS NULL AND CommentId IS NOT NULL)`
- CHECK `CK_ModerationDecision_Decision`: `Decision IN ('Hide','Remove','Restore','Dismiss')`
- CHECK `CK_ModerationDecision_Dismiss`: `Decision <> 'Dismiss' OR ReportId IS NOT NULL`
- CHECK `CK_ModerationDecision_Reason`: `LEN(TRIM(Reason)) > 0`
- صلاحيات: INSERT/SELECT فقط لدور التشغيل؛ `TR_ModerationDecision_Immutable` يمنع UPDATE/DELETE.
- حارس: TR_ModerationDecision_Immutable: إلحاقي؛ يحدّث حالة الهدف في المعاملة نفسها.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `community.ContentReport` عبر `ReportId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `community.Post` عبر `PostId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `community.Comment` عبر `CommentId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `ModeratorPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: لا شيء.

| | |
|---|---|
| **دورة الحياة والانتقالات** | إلحاقي: كل قرار صف؛ الحالة الحالية للهدف = آخر قرار. |
| **الخصوصية والملكية والتفويض** | المشرفون وAdmin؛ المؤلف يرى النتيجة والسبب. |
| **التاريخ والنسخ والاحتفاظ** | هو التاريخ. |
| **مثال ملموس** | Hide بسبب سب، ثم Restore بعد استئناف. |
| **ماذا ينكسر لو حُذف أو دُمج** | لا تاريخ إشراف ولا استئناف. |
| **المصدر** | §12.1، §19 |

---

## partnership — الشراكات

### partnership.PartnershipLink

<a id="partnership-partnershiplink"></a>

| | |
|---|---|
| **الغرض** | اتفاق ربط بين مبادرة ومورد يملكه غيرها: برنامج مدرب مستقل أو تجربة مزوّد، بنطاق مشاركة بيانات. |
| **الميزة وسير العمل** | Partnerships للمؤسسة والمزوّد، المكوّن المرتبط في تفاصيل المبادرة في Explore. |
| **لماذا جدول مستقل** | §18: الربط يتطلب قبول الطرف الآخر وشروط مشاركة، والمالك الأصلي يحتفظ بالتشغيل. الجدولان السابقان متطابقا الأعمدة؛ الهدف XOR بمفتاحين حقيقيين وفهرس فريد لكل نوع. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `partnership.ProgramLink` + يستوعب `partnership.ExperienceLink` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `PublicId` | uniqueidentifier | لا | `NEWSEQUENTIALID()` | UQ — المعرّف الخارجي في الـAPI والروابط |
| `InitiativeId` | bigint | لا |  | FK → institution.Initiative |
| `ProgramId` | bigint | نعم |  | FK → coach.CoachProgram |
| `ExperienceId` | bigint | نعم |  | FK → provider.Experience |
| `Purpose` | nvarchar(800) | نعم |  |  |
| `ScopeVersion` | nvarchar(64) | لا |  |  |
| `DataSharingScopeJson` | nvarchar(max) | نعم |  |  |
| `StartsOnLocalDate` | date | نعم |  |  |
| `EndsOnLocalDate` | date | نعم |  |  |
| `Status` | nvarchar(16) | لا | `N'Requested'` |  |
| `RequestedByPersonId` | bigint | لا |  | FK → iam.Person |
| `RespondedByPersonId` | bigint | نعم |  | FK → iam.Person |
| `RespondedAtUtc` | datetime2(3) | نعم |  |  |
| `EndedAtUtc` | datetime2(3) | نعم |  |  |
| `EndedByPersonId` | bigint | نعم |  | FK → iam.Person |
| `EndReason` | nvarchar(800) | نعم |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_PartnershipLink (Id)`
- FK: `(InitiativeId) → institution.Initiative(Id)`
- FK: `(ProgramId) → coach.CoachProgram(Id)`
- FK: `(ExperienceId) → provider.Experience(Id)`
- FK: `(RequestedByPersonId) → iam.Person(Id)`
- FK: `(RespondedByPersonId) → iam.Person(Id)`
- FK: `(EndedByPersonId) → iam.Person(Id)`
- UNIQUE: `(PublicId)`
- UNIQUE: `(InitiativeId, ProgramId) WHERE ProgramId IS NOT NULL AND Status IN ('Requested','Accepted')` (فهرس فريد مفلتر)
- UNIQUE: `(InitiativeId, ExperienceId) WHERE ExperienceId IS NOT NULL AND Status IN ('Requested','Accepted')` (فهرس فريد مفلتر)
- CHECK `CK_PartnershipLink_Target`: `(ProgramId IS NOT NULL AND ExperienceId IS NULL) OR (ProgramId IS NULL AND ExperienceId IS NOT NULL)`
- CHECK `CK_PartnershipLink_Status`: `Status IN ('Requested','Accepted','Declined','Ended')`
- CHECK `CK_PartnershipLink_Responded`: `Status NOT IN ('Accepted','Declined') OR (RespondedByPersonId IS NOT NULL AND RespondedAtUtc IS NOT NULL)`
- CHECK `CK_PartnershipLink_Ended`: `Status <> 'Ended' OR (EndedAtUtc IS NOT NULL AND EndedByPersonId IS NOT NULL)`
- CHECK `CK_PartnershipLink_Scope`: `DataSharingScopeJson IS NULL OR ISJSON(DataSharingScopeJson) = 1`
- حارس: TR_PartnershipLink_Ownership: القبول من مالك البرنامج أو عضو نشط في المزوّد؛ الربط لا ينقل ملكية ولا حجوزًا ولا عضويات.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `institution.Initiative` عبر `InitiativeId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `coach.CoachProgram` عبر `ProgramId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `provider.Experience` عبر `ExperienceId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `RequestedByPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `iam.Person` عبر `RespondedByPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `iam.Person` عبر `EndedByPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: لا شيء.

| | |
|---|---|
| **دورة الحياة والانتقالات** | Requested → Accepted \| Declined؛ Accepted → Ended. |
| **الخصوصية والملكية والتفويض** | الطرفان وAdmin؛ المبادرة ترى فقط ما يسمح به النطاق (مجاميع أو حالة مشارك مسموحة). |
| **التاريخ والنسخ والاحتفاظ** | الروابط المنتهية تبقى. |
| **مثال ملموس** | المؤسسة تطلب ربط مخيم مزوّد؛ ممثل المزوّد يقبل؛ يظهر المكوّن في صفحة المبادرة، والحجز يبقى للمزوّد. |
| **ماذا ينكسر لو حُذف أو دُمج** | لا تعاون بين المالكين أو تُنقل الملكية خطأً (D40). |
| **المصدر** | §18، §15.1 Partners، §16 Partnerships، D40 |

---

## governance — المحتوى المحكوم (CMS)

### governance.ContentRelease

<a id="governance-contentrelease"></a>

| | |
|---|---|
| **الغرض** | إصدار محتوى CMS لمنطقة مستهدفة مسموح بها (Landing، Home، اكتشاف الشركاء…). |
| **الميزة وسير العمل** | Content Studio في Admin: preview/draft/publish/rollback. |
| **لماذا جدول مستقل** | §19: المحتوى المنشور يصل إلى أهداف صريحة بنسخ قابلة للتراجع. التراجع نسخة جديدة تشير إلى ما تحل محله. الحمولة لقطة ثابتة مقروءة كوحدة، لذلك JSON. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `governance.ContentRelease` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `TargetCode` | nvarchar(120) | لا |  |  |
| `VersionNo` | int | لا |  |  |
| `Status` | nvarchar(16) | لا | `N'Draft'` |  |
| `PayloadJson` | nvarchar(max) | لا |  |  |
| `SupersedesId` | bigint | نعم |  | FK → governance.ContentRelease |
| `IsRollback` | bit | لا | `0` |  |
| `PublishedByPersonId` | bigint | نعم |  | FK → iam.Person |
| `PublishedAtUtc` | datetime2(3) | نعم |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_ContentRelease (Id)`
- FK: `(SupersedesId) → governance.ContentRelease(Id)`
- FK: `(PublishedByPersonId) → iam.Person(Id)`
- UNIQUE: `(TargetCode, VersionNo)`
- UNIQUE: `(TargetCode) WHERE Status = 'Draft'` (فهرس فريد مفلتر)
- CHECK `CK_ContentRelease_VersionNo`: `VersionNo > 0`
- CHECK `CK_ContentRelease_Status`: `Status IN ('Draft','Published','Superseded')`
- CHECK `CK_ContentRelease_Published`: `Status = 'Draft' OR (PublishedByPersonId IS NOT NULL AND PublishedAtUtc IS NOT NULL)`
- CHECK `CK_ContentRelease_Payload`: `ISJSON(PayloadJson) = 1`
- حارس: TR_ContentRelease_Immutable: بعد Published لا يتغير إلا Status → Superseded.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `governance.ContentRelease` عبر `SupersedesId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `iam.Person` عبر `PublishedByPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `governance.ContentRelease` (SupersedesId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | Draft → Published → Superseded. |
| **الخصوصية والملكية والتفويض** | عام بعد النشر. |
| **التاريخ والنسخ والاحتفاظ** | كل الإصدارات تبقى. |
| **مثال ملموس** | نشر نسخة 4 من hero الصفحة الرئيسية، ثم Rollback ينشئ النسخة 5 بمحتوى النسخة 3. |
| **ماذا ينكسر لو حُذف أو دُمج** | لا تحرير محتوى محكوم ولا تراجع. |
| **المصدر** | §19 Content Studio، D14 |

---

## ops — التشغيل: تدقيق، إشعارات، Outbox، Idempotency

### ops.AuditEvent

<a id="ops-auditevent"></a>

| | |
|---|---|
| **الغرض** | سجل تدقيق إلحاقي لكل أمر حساس: الفاعل والصفة المختارة والمورد والحالة قبل/بعد والسبب والوقت ومعرّف الترابط. |
| **الميزة وسير العمل** | Audit في Admin، إجراءات الحوكمة (unpublish/suspend/remove)، رفض الأوامر غير المخولة، تغييرات الحكم والإكمال. |
| **لماذا جدول مستقل** | §23.3 يطلب تدقيق الفاعل والمنحة المختارة والمورد والحالات والسبب. إجراءات حوكمة Admin لها الأعمدة نفسها، فـGovernanceAction صار حدثًا هنا (حكم Codex نفسه: SAFE). هذا ليس بديلًا عن سجلات الأعمال المقروءة (القرارات، التصحيحات)، بل سجلها التقني العام. |
| **نوع الصف** | إلحاقي (a) |
| **الأصل في المخطط الحالي** | `ops.AuditEvent` + يستوعب `governance.GovernanceAction` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `ActorPersonId` | bigint | نعم |  | FK → iam.Person |
| `ActorCapacity` | nvarchar(24) | نعم |  |  |
| `SelectedGrantRef` | nvarchar(80) | نعم |  |  |
| `ResourceKind` | nvarchar(64) | لا |  |  |
| `ResourcePublicId` | uniqueidentifier | لا |  |  |
| `Action` | nvarchar(64) | لا |  |  |
| `BeforeStatus` | nvarchar(40) | نعم |  |  |
| `AfterStatus` | nvarchar(40) | نعم |  |  |
| `BeforeHash` | varbinary(32) | نعم |  |  |
| `AfterHash` | varbinary(32) | نعم |  |  |
| `Reason` | nvarchar(1000) | نعم |  |  |
| `DetailJson` | nvarchar(max) | نعم |  |  |
| `AtUtc` | datetime2(3) | لا |  |  |
| `CorrelationId` | uniqueidentifier | لا |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |

**المفاتيح والقيود والفهارس**

- PK: `PK_AuditEvent (Id)`
- FK: `(ActorPersonId) → iam.Person(Id)`
- INDEX: `(ResourceKind, ResourcePublicId, AtUtc)`
- INDEX: `(ActorPersonId, AtUtc)`
- INDEX: `(CorrelationId)`
- CHECK `CK_AuditEvent_Detail`: `DetailJson IS NULL OR ISJSON(DetailJson) = 1`
- صلاحيات: INSERT/SELECT فقط لدور التشغيل؛ `TR_AuditEvent_Immutable` يمنع UPDATE/DELETE.
- حارس: TR_AuditEvent_Immutable: إلحاقي؛ دور التشغيل INSERT فقط.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `iam.Person` عبر `ActorPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: لا شيء.

| | |
|---|---|
| **دورة الحياة والانتقالات** | إلحاقي: يُكتب في معاملة الأمر نفسها (أو لمحاولة مرفوضة في معاملة مستقلة) ولا يتغير. |
| **الخصوصية والملكية والتفويض** | Admin بقدرة مخصصة؛ المالك يرى أحداث موارده عند الحاجة. لا قيم حساسة خام. |
| **التاريخ والنسخ والاحتفاظ** | هو التاريخ؛ مدة الاحتفاظ لم تُحدَّد. |
| **مثال ملموس** | Admin يعلّق مبادرة: حدث ResourceKind=Initiative، Action=Suspend، Reason إلزامي في الطبقة التطبيقية لإجراءات الحوكمة. |
| **ماذا ينكسر لو حُذف أو دُمج** | لا تدقيق قابل للإثبات للأوامر الحساسة. |
| **المصدر** | §23.3، §19، §24.6 |

### ops.Notification

<a id="ops-notification"></a>

| | |
|---|---|
| **الغرض** | إشعار داخل التطبيق لمستلم واحد يشير إلى المورد الفعلي. |
| **الميزة وسير العمل** | Notifications/Updates في كل مساحة، إشعارات الدعوات والقرارات والعروض والتغييرات (§23.3). |
| **لماذا جدول مستقل** | لكل مستلم حالة قراءة وسحب؛ الفهرس الفريد يجعل إنشاء الإشعار نفسه من الحدث نفسه idempotent. الإشعار يُسحب عند تغير الحالة كي لا يبقى زر فعل غير صالح. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `ops.Notification` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `PublicId` | uniqueidentifier | لا | `NEWSEQUENTIALID()` | UQ — المعرّف الخارجي في الـAPI والروابط |
| `RecipientPersonId` | bigint | لا |  | FK → iam.Person |
| `EventPublicId` | uniqueidentifier | لا |  |  |
| `TemplateCode` | nvarchar(80) | لا |  |  |
| `ResourceKind` | nvarchar(64) | لا |  |  |
| `ResourcePublicId` | uniqueidentifier | لا |  |  |
| `Status` | nvarchar(16) | لا | `N'Ready'` |  |
| `ReadAtUtc` | datetime2(3) | نعم |  |  |
| `EmailOutboxMessageId` | bigint | نعم |  | FK → ops.OutboxMessage |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_Notification (Id)`
- FK: `(RecipientPersonId) → iam.Person(Id)`
- FK: `(EmailOutboxMessageId) → ops.OutboxMessage(Id)`
- UNIQUE: `(PublicId)`
- UNIQUE: `(RecipientPersonId, EventPublicId, TemplateCode)`
- INDEX: `(RecipientPersonId, CreatedAtUtc) WHERE Status IN ('Ready','Read')`
- CHECK `CK_Notification_Status`: `Status IN ('Pending','Ready','Read','Withdrawn')`
- CHECK `CK_Notification_Read`: `Status <> 'Read' OR ReadAtUtc IS NOT NULL`

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `RecipientPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `ops.OutboxMessage` عبر `EmailOutboxMessageId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: لا شيء.

| | |
|---|---|
| **دورة الحياة والانتقالات** | Pending → Ready → Read؛ → Withdrawn. |
| **الخصوصية والملكية والتفويض** | المستلم فقط. |
| **التاريخ والنسخ والاحتفاظ** | يمكن تنظيفه بعد مدة تشغيلية لم تُحدَّد. |
| **مثال ملموس** | عرض مقعد ينشئ إشعارًا للمستلم مع رسالة بريد في Outbox؛ انتهاء العرض يسحب الإشعار. |
| **ماذا ينكسر لو حُذف أو دُمج** | لا إشعارات مرئية ولا منع تكرارها. |
| **المصدر** | §21.3، §23.3 |

### ops.OutboxMessage

<a id="ops-outboxmessage"></a>

| | |
|---|---|
| **الغرض** | رسالة تكامل موثوقة تُكتب في معاملة الأمر نفسها ثم يرسلها عامل خلفي (بريد، أحداث داخلية) مع إعادة المحاولة. |
| **الميزة وسير العمل** | بريد الدعوات وOTP وإشعارات العروض، انتهاء العروض المجدول، معالجة المكافآت غير المتزامنة. |
| **لماذا جدول مستقل** | §22.1 و§24.6: إعادة المحاولة والـidempotency للمهام الخلفية. حالة التسليم النهائية ومحاولاتها هنا؛ تفاصيل كل محاولة إرسال كانت جدول DeliveryAttempt، وهي telemetry تشغيلية تنتقل إلى السجلات المنظمة (structured logs)، لأن المنتج يحتاج النتيجة النهائية والمحاولة الأخيرة فقط. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `ops.OutboxMessage` + يستوعب `ops.DeliveryAttempt` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `EventPublicId` | uniqueidentifier | لا |  |  |
| `EventType` | nvarchar(120) | لا |  |  |
| `Channel` | nvarchar(16) | لا | `N'Internal'` |  |
| `PayloadJson` | nvarchar(max) | لا |  |  |
| `OccurredAtUtc` | datetime2(3) | لا |  |  |
| `Status` | nvarchar(16) | لا | `N'Pending'` |  |
| `Attempts` | int | لا | `0` |  |
| `NextAttemptAtUtc` | datetime2(3) | نعم |  |  |
| `LastAttemptAtUtc` | datetime2(3) | نعم |  |  |
| `LastError` | nvarchar(1000) | نعم |  |  |
| `ProviderRef` | nvarchar(160) | نعم |  |  |
| `DeliveredAtUtc` | datetime2(3) | نعم |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_OutboxMessage (Id)`
- UNIQUE: `(EventPublicId)`
- INDEX: `(NextAttemptAtUtc) WHERE Status = 'Pending'`
- CHECK `CK_OutboxMessage_Channel`: `Channel IN ('Internal','Email')`
- CHECK `CK_OutboxMessage_Status`: `Status IN ('Pending','Delivered','DeadLetter')`
- CHECK `CK_OutboxMessage_Attempts`: `Attempts >= 0`
- CHECK `CK_OutboxMessage_Delivered`: `(Status = 'Delivered' AND DeliveredAtUtc IS NOT NULL) OR (Status <> 'Delivered' AND DeliveredAtUtc IS NULL)`
- CHECK `CK_OutboxMessage_Payload`: `ISJSON(PayloadJson) = 1`
- حارس: TR_OutboxMessage_Terminal: الحالة النهائية لا تُعاد فتحها.

**العلاقات**

- صادرة: لا شيء.
- واردة: `ops.Notification` (EmailOutboxMessageId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | Pending → Delivered \| DeadLetter. |
| **الخصوصية والملكية والتفويض** | تشغيلي؛ الحمولة تقتصر على المعرّفات اللازمة. |
| **التاريخ والنسخ والاحتفاظ** | تنظيف تشغيلي بعد مدة لم تُحدَّد. |
| **مثال ملموس** | دعوة مشرف: رسالة Email تُرسل؛ فشل SMTP يزيد Attempts ويضبط NextAttemptAtUtc. |
| **ماذا ينكسر لو حُذف أو دُمج** | تضيع الرسائل عند فشل الإرسال بعد الالتزام بالمعاملة. |
| **المصدر** | §22.1، §23.3، §24.6 |

### ops.IdempotencyRecord

<a id="ops-idempotencyrecord"></a>

| | |
|---|---|
| **الغرض** | مفتاح عدم التكرار لأمر HTTP: إعادة الطلب نفسه تعيد النتيجة الأصلية، وطلب مختلف بالمفتاح نفسه يُرفض. |
| **الميزة وسير العمل** | نقرة مزدوجة على Approve/Accept offer/Submit، إعادة الإرسال بعد انقطاع الشبكة. |
| **لماذا جدول مستقل** | الفهارس الطبيعية تمنع الأثر المكرر لكنها لا تعيد الرد الأصلي ولا تكشف أن الطلب الثاني مختلف (RequestHash). §22.3 يطلب idempotency key حيث توجد سباقات. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `ops.IdempotencyRecord` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `ActorPersonId` | bigint | لا |  | FK → iam.Person |
| `CommandCode` | nvarchar(80) | لا |  |  |
| `IdempotencyKey` | nvarchar(160) | لا |  |  |
| `RequestHash` | binary(32) | لا |  |  |
| `Status` | nvarchar(16) | لا | `N'InProgress'` |  |
| `ResponseRef` | nvarchar(300) | نعم |  |  |
| `ExpiresAtUtc` | datetime2(3) | لا |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_IdempotencyRecord (Id)`
- FK: `(ActorPersonId) → iam.Person(Id)`
- UNIQUE: `(ActorPersonId, CommandCode, IdempotencyKey)`
- CHECK `CK_IdempotencyRecord_Status`: `Status IN ('InProgress','Completed','Failed')`

**العلاقات**

- صادرة: كل صف هنا يشير إلى **واحد** في `iam.Person` عبر `ActorPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: لا شيء.

| | |
|---|---|
| **دورة الحياة والانتقالات** | InProgress → Completed \| Failed؛ تُحذف بعد ExpiresAtUtc. |
| **الخصوصية والملكية والتفويض** | تشغيلي؛ لا يحمل محتوى الطلب، فقط hash ومرجع الرد. |
| **التاريخ والنسخ والاحتفاظ** | لا تاريخ مطلوب بعد الانتهاء. |
| **مثال ملموس** | Approve مرتين بالمفتاح نفسه: الثانية تعيد "Accepted" نفسه دون قرار ثانٍ. |
| **ماذا ينكسر لو حُذف أو دُمج** | يرى العميل أخطاء تكرار بدل النتيجة، أو تُنفّذ أوامر بلا فهرس طبيعي مرتين. |
| **المصدر** | §22.3، §24.6، ADMIT-03، ATT-11 |

---

## files — الملفات الآمنة

### files.SecureFile

<a id="files-securefile"></a>

| | |
|---|---|
| **الغرض** | بيانات وصفية لملف مرفوع في مخزن كائنات خاص. |
| **الميزة وسير العمل** | إثبات التحقق، مرفق العذر، مرفق المهمة، إجابة ملف، صورة حادثة، صورة منشور. |
| **لماذا جدول مستقل** | الملف كيان مستقل له فحص (Quarantined) واحتفاظ وحذف آمن، ويُشار إليه من عدة جداول بمفاتيح حقيقية. |
| **نوع الصف** | قابل للتعديل (m) |
| **الأصل في المخطط الحالي** | `files.SecureFile` |

**الأعمدة**

| العمود | النوع (SQL Server) | NULL | الافتراضي | ملاحظات |
|---|---|---|---|---|
| `Id` | bigint | لا | `IDENTITY(1,1)` | PK |
| `PublicId` | uniqueidentifier | لا | `NEWSEQUENTIALID()` | UQ — المعرّف الخارجي في الـAPI والروابط |
| `OwnerPersonId` | bigint | نعم |  | FK → iam.Person |
| `Purpose` | nvarchar(32) | لا |  |  |
| `ObjectKey` | nvarchar(300) | لا |  |  |
| `MimeType` | nvarchar(120) | لا |  |  |
| `Bytes` | bigint | لا |  |  |
| `Sha256` | binary(32) | لا |  |  |
| `Status` | nvarchar(16) | لا | `N'Pending'` |  |
| `RetentionUntilUtc` | datetime2(3) | نعم |  |  |
| `DeletedAtUtc` | datetime2(3) | نعم |  |  |
| `CreatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `UpdatedAtUtc` | datetime2(3) | لا | `SYSUTCDATETIME()` |  |
| `RowVersion` | rowversion | لا |  | تزامن متفائل (EF IsRowVersion) |

**المفاتيح والقيود والفهارس**

- PK: `PK_SecureFile (Id)`
- FK: `(OwnerPersonId) → iam.Person(Id)`
- UNIQUE: `(PublicId)`
- UNIQUE: `(ObjectKey)`
- CHECK `CK_SecureFile_Purpose`: `Purpose IN ('VerificationEvidence','ExcuseAttachment','SubmissionAttachment','FormAnswer','IncidentAttachment','PostImage')`
- CHECK `CK_SecureFile_Bytes`: `Bytes > 0`
- CHECK `CK_SecureFile_Status`: `Status IN ('Pending','Available','Quarantined','Deleted')`
- CHECK `CK_SecureFile_Deleted`: `(Status = 'Deleted' AND DeletedAtUtc IS NOT NULL) OR (Status <> 'Deleted' AND DeletedAtUtc IS NULL)`
- حارس: التنزيل لا يعتمد على OwnerPersonId: الخدمة تحمّل السجل المالك (عذر، إرسال، رد، حادثة…) وتطبق صلاحيته، ثم تسجل الوصول في AuditEvent.

**العلاقات**

- صادرة: كل صف هنا يشير إلى **صفر أو واحد** في `iam.Person` عبر `OwnerPersonId`؛ وكل صف هناك يقابله صفر أو كثير هنا.
- واردة: `org.VerificationCase` (EvidenceFileId)، `task.SubmissionAttempt` (FileId)، `session.AbsenceExcuse` (FileId)، `provider.ProviderIncident` (FileId)، `forms.FormAnswer` (FileId)، `community.Post` (ImageFileId)

| | |
|---|---|
| **دورة الحياة والانتقالات** | Pending → Available \| Quarantined → Deleted. |
| **الخصوصية والملكية والتفويض** | حسب السجل المالك والغرض؛ لا وصول عام. |
| **التاريخ والنسخ والاحتفاظ** | الحذف حالة؛ مدد الاحتفاظ لم تُحدَّد. |
| **مثال ملموس** | مرفق عذر طبي: Purpose=ExcuseAttachment؛ يقرؤه المشرف والممثل فقط عبر AbsenceExcuse. |
| **ماذا ينكسر لو حُذف أو دُمج** | لا مرفقات آمنة. |
| **المصدر** | §17.1، §24.1، §24.6؛ ملاحظة المالك عن حارس التنزيل المرتبط بالمورد |
