# مصفوفة الجداول الـ129 — KEEP / MERGE / DEFER / REMOVE

**مُولَّد** بواسطة `generate_audit.py` من `../v2.1/02-canonical-dictionary.md`. لا تحرّر هذا الملف يدويًا؛ عدّل البيانات في السكربت ثم أعد التشغيل. التقرير التحليلي في [01-necessity-audit-ar.md](01-necessity-audit-ar.md).

**المفاتيح:** `KEEP` يبقى جدولًا (قد يُعاد تسميته بعد السهم)؛ `MERGE→X` تنتقل بياناته إلى الجدول X (الأعمدة بين القوسين)؛ `DEFER` تأجيل **الميزة كلها** في هذا التصميم، والجدول يعود معها؛ `DEFER (سياسة)` ميزة غير معتمدة بعد، تنتظر قرار المالك؛ `REMOVE` حذف جدول غير ضروري مع بقاء الوظيفة. **A** = MVP، **B** = عملي، **C** = النطاق المعتمد كاملًا.

## 1. الأعداد المُتحقق منها

| التصميم | جداول ناتجة | KEEP | MERGE | DEFER (ميزة مؤجلة) | DEFER (سياسة) | REMOVE |
|---|---:|---:|---:|---:|---:|---:|
| A — MVP | **21** | 21 | 20 | 78 | 9 | 1 |
| B — عملي | **54** | 54 | 28 | 45 | 1 | 1 |
| C — كامل معتمد | **71** | 71 | 48 | 0 | 9 | 1 |
| الحالي (v2.1) | **129** | 129 | 0 | 0 | 0 | 0 |

كل صف من الـ129 يظهر مرة واحدة في كل تصميم، وكل جدول ناتج له جدول أصلي واحد يرسو عليه (`KEEP`). السكربت يفشل إذا اختلّ أي من الشرطين.

**الدمجات الخلافية في C:** 16 جدولًا في 10 مجموعات. لو رُفضت كلها يصبح C = **87** جدولًا.

| المجموعة | الدمج | الجداول التي تعود لو رُفض | الفرق |
|---|---|---|---:|
| G1 | دمج Institution وProvider في Organization | `provider.Provider`، `provider.ProviderMembership` | +2 |
| G2 | موظفو Initiative وProvider في StaffAppointment واحد | `provider.ProviderStaffAppointment` | +1 |
| G3 | جلسات Initiative وExperience في Session واحد، وواجب الجلسة في SessionDuty | `provider.ExperienceSession`، `provider.ProviderAppointmentSession` | +2 |
| G4 | حضور Initiative وProvider في Attendance واحد | `provider.ProviderAttendance` | +1 |
| G5 | إكمال المخيم ضمن Completion المشترك | `provider.CampCompletion` | +1 |
| G6 | دمج InitiativeMembership في InitiativeApplication | `institution.InitiativeMembership` | +1 |
| G7 | كلمة المرور داخل Person (EF table splitting) | `iam.PasswordCredential` | +1 |
| G8 | أسئلة وإجابات النماذج JSON بدل صفوف | `forms.FormQuestion`، `forms.FormQuestionOption`، `forms.FormAnswer`، `forms.FormAnswerChoice` | +4 |
| G9 | إجابات الاختبار JSON داخل المحاولة | `lab.AssessmentResponse` | +1 |
| G10 | تصحيحات الحضور داخل AuditEvent | `session.AttendanceCorrection`، `provider.ProviderAttendanceCorrection` | +2 |

## 2. الجرد الاسمي لكل تصميم

### A — MVP: 21 جدولًا

- **activity** (3): `OfflineRoutine`، `PracticeAttempt`، `RoutineCheckIn`
- **evidence** (1): `PersonalRewardEntry`
- **iam** (2): `OtpChallenge`، `Person`
- **institution** (7): `Initiative`، `InitiativeApplication`، `InitiativeApplicationDecision`، `InitiativeRevision`، `Institution`، `RepresentativeMembership`، `StaffAppointment`
- **lab** (2): `AssessmentAttempt`، `AssessmentScore`
- **ops** (1): `AuditEvent`
- **personal** (1): `IndividualProfile`
- **recovery** (4): `PlanRevision`، `RecoveryCycle`، `ScheduledAction`، `WeeklyReview`

### B — عملي: 54 جدولًا

- **activity** (5): `OfflineRoutine`، `PracticeAttempt`، `PracticeDefinition`، `PracticeVersion`، `RoutineCheckIn`
- **coach** (5): `CoachProgram`، `GroupCoachAssignment`، `GroupMembership`، `OperationalGroup`، `ProgramRevision`
- **evidence** (3): `EvidenceEvent`، `GroupRewardEntry`، `PersonalRewardEntry`
- **files** (1): `SecureFile`
- **forms** (3): `Form`، `FormResponse`، `FormVersion`
- **iam** (4): `ConsentRecord`، `GlobalGrant`، `OtpChallenge`، `Person`
- **institution** (5): `Initiative`، `InitiativeApplication`، `InitiativeApplicationDecision`، `InitiativeRevision`، `StaffAppointment`
- **lab** (3): `AssessmentAttempt`، `AssessmentScore`، `InstrumentVersion`
- **ops** (3): `AuditEvent`، `Notification`، `OutboxMessage`
- **org** (3): `Organization`، `OrganizationMember`، `VerificationCase`
- **personal** (1): `IndividualProfile`
- **recovery** (4): `PlanRevision`، `RecoveryCycle`، `ScheduledAction`، `WeeklyReview`
- **session** (7): `AbsenceExcuse`، `Attendance`، `Completion`، `Session`، `SessionDuty`، `SessionRegistration`، `SessionRevision`
- **task** (7): `Assignment`، `AssignmentRecipient`، `AssignmentRevision`، `OperationalReport`، `ReviewDecision`، `ReviewPrivateNote`، `SubmissionAttempt`

### C — النطاق المعتمد كاملًا: 71 جدولًا

- **activity** (5): `OfflineRoutine`، `PracticeAttempt`، `PracticeDefinition`، `PracticeVersion`، `RoutineCheckIn`
- **coach** (5): `CoachProgram`، `GroupCoachAssignment`، `GroupMembership`، `OperationalGroup`، `ProgramRevision`
- **community** (5): `Bookmark`، `Comment`، `ContentReport`، `Post`، `Reaction`
- **evidence** (3): `EvidenceEvent`، `GroupRewardEntry`، `PersonalRewardEntry`
- **files** (1): `SecureFile`
- **forms** (4): `CompetitionJudgment`، `Form`، `FormResponse`، `FormVersion`
- **governance** (1): `ContentRelease`
- **iam** (4): `ConsentRecord`، `GlobalGrant`، `OtpChallenge`، `Person`
- **institution** (5): `Initiative`، `InitiativeApplication`، `InitiativeApplicationDecision`، `InitiativeRevision`، `StaffAppointment`
- **lab** (3): `AssessmentAttempt`، `AssessmentScore`، `InstrumentVersion`
- **ops** (3): `AuditEvent`، `Notification`، `OutboxMessage`
- **org** (3): `Organization`، `OrganizationMember`، `VerificationCase`
- **partnership** (1): `PartnershipLink`
- **personal** (1): `IndividualProfile`
- **provider** (5): `Experience`، `ExperienceBooking`، `ExperienceRevision`، `ProviderCohort`، `ProviderIncident`
- **recovery** (4): `PlanRevision`، `RecoveryCycle`، `ScheduledAction`، `WeeklyReview`
- **session** (7): `AbsenceExcuse`، `Attendance`، `Completion`، `Session`، `SessionDuty`، `SessionRegistration`، `SessionRevision`
- **shield** (4): `BrowserUsagePeriod`، `ExtensionInstallation`، `ProtectionSession`، `ShieldConfiguration`
- **task** (7): `Assignment`، `AssignmentRecipient`، `AssignmentRevision`، `OperationalReport`، `ReviewDecision`، `ReviewPrivateNote`، `SubmissionAttempt`

## 3. المصفوفة الكاملة

العمود "الحكم" يجيب: لماذا جدول مستقل، أو لماذا لا. العمود "ما يُفقد" يذكر القيد أو الوظيفة أو الدليل التاريخي الذي يضيع بالتغيير.

### `iam`

| # | الجدول | الميزة/سير العمل | الاعتماد والمصدر | الفئة | الحكم | A | B | C | ما يُفقد عند التغيير |
|---:|---|---|---|---|---|---|---|---|---|
| 1 | `Person` | هوية واحدة لكل الأدوار | معتمد D45، §2.2 | نواة | جذر الهوية؛ لا بديل له | KEEP | KEEP | KEEP | — |
| 2 | `PersonEmail` | بريد موثّق لمطابقة الدعوات | D23 يطلب بريدًا موثقًا؛ تعدد البريد غير مطلوب | نواة | علاقة 1:N لم يطلبها أي قرار. تغيير البريد يمر عبر OtpChallenge(Purpose) | MERGE→iam.Person (NormalizedEmail, EmailVerifiedAtUtc) | MERGE→iam.Person (NormalizedEmail, EmailVerifiedAtUtc) | MERGE→iam.Person (NormalizedEmail, EmailVerifiedAtUtc) | أكثر من بريد موثق للشخص، وصفوف البريد المتقاعد (تنتقل إلى AuditEvent). يبقى UXF على Person.NormalizedEmail |
| 3 | `PasswordCredential` | Hash كلمة المرور | §24.6 تخزين آمن | بنية تشغيلية | 1:1 بقيد UQ PersonId وبلا دورة حياة مستقلة؛ المدعو بـOTP بلا كلمة مرور = عمود NULL. العزل البرمجي ممكن بـEF table splitting | MERGE→iam.Person (PasswordHash, PasswordAlgorithm, PasswordUpdatedAtUtc) | MERGE→iam.Person (PasswordHash, PasswordAlgorithm, PasswordUpdatedAtUtc) | MERGE→iam.Person (PasswordHash, PasswordAlgorithm, PasswordUpdatedAtUtc) | الفصل الفيزيائي للمادة السرية؛ يجب منع إسقاط أعمدة الـhash في أي DTO (خلافي G7) |
| 4 | `OtpChallenge` | تحقق OTP ومحاولاته | §2.2 OTP للمدعوين، §24.6 حد المحاولات | بنية تشغيلية | حالة قصيرة العمر بعدّاد وانتهاء؛ مكانها ليس Person | KEEP | KEEP | KEEP | — |
| 5 | `GlobalGrant` | صلاحيات Admin الخاصة | معتمد D14، §23.1 قدرة Admin صريحة | نواة | مبرر في C: قدرات متعددة قابلة للمنح والسحب | MERGE→iam.Person (IsPlatformAdmin) | KEEP | KEEP | في A: تعدد القدرات وصفوف المنح/السحب (يبقى الأثر في AuditEvent) |
| 6 | `ConsentRecord` | موافقة بغرض ونسخة إشعار | معتمد D41، §24.1 | تاريخ/تدقيق | سجل إلحاقي لقرار قانوني (منح/سحب)؛ مبرر في C. ملاحظة: ConsentVersion مكرر أيضًا كعمود في 4 جداول | MERGE→iam.Person (AcceptedNoticeVersion, AcceptedAtUtc) | KEEP | KEEP | في A: سجل سحب الموافقة وتعدد الأغراض |

### `personal`

| # | الجدول | الميزة/سير العمل | الاعتماد والمصدر | الفئة | الحكم | A | B | C | ما يُفقد عند التغيير |
|---:|---|---|---|---|---|---|---|---|---|
| 7 | `IndividualProfile` | إعداد الفرد وحالة الـonboarding | معتمد §4.1–4.5، D04 | نواة | امتداد اختياري حساس (ليس كل شخص فردًا)؛ فصل مبرر. Person.IndividualEnabled يكرر وجود الصف | KEEP | KEEP | KEEP | — |

### `lab`

| # | الجدول | الميزة/سير العمل | الاعتماد والمصدر | الفئة | الحكم | A | B | C | ما يُفقد عند التغيير |
|---:|---|---|---|---|---|---|---|---|---|
| 8 | `AssessmentInstrument` | تعريف الاختبار | معتمد §4.4 (أربعة اختبارات ثابتة) | إصدار/نسخ | جدول بحث لأربعة صفوف ثابتة (Code, Title, Status) | MERGE→lab.AssessmentAttempt (InstrumentCode + CHECK) | MERGE→lab.InstrumentVersion (InstrumentCode + CHECK) | MERGE→lab.InstrumentVersion (InstrumentCode + CHECK) | Status على مستوى الأداة (يُستبدل بسحب نسخها) وFK إلى صف الأداة |
| 9 | `InstrumentVersion` | تجميد محتوى الاختبار وقواعد تصحيحه | معتمد §4.4 نسخة المحتوى والتصحيح، §24.5 | إصدار/نسخ | مبرر في C: المقارنة بين المحاولات تعتمد ComparabilityGroup، ومحرر Admin سيحكم النسخ (§19) | MERGE→lab.AssessmentAttempt (ContentVersion, ScoringVersion نصية) | KEEP | KEEP | في A: FK يضمن أن النسخة منشورة فعلًا؛ يصبح تحققًا في C# |
| 10 | `AssessmentWindow` | أهلية إعادة القياس الأسبوعية | معتمد D05؛ مدة النافذة مفتوحة §26.2 | تاريخ/تدقيق | يخزّن نتيجة حساب: النافذة دالة في السياسة وتاريخ التفعيل، وUsed مشتق من وجود محاولة | MERGE→lab.AssessmentAttempt (WindowKey, PolicyVersion) | MERGE→lab.AssessmentAttempt (WindowKey, PolicyVersion) | MERGE→lab.AssessmentAttempt (WindowKey, PolicyVersion) | أوقات فتح/غلق مخزنة لكل شخص. منع محاولتين رسميتين في نافذة واحدة يصبح UXF على (PersonId, InstrumentCode, WindowKey) |
| 11 | `AssessmentAttempt` | محاولة اختبار | معتمد D04، D05 | نواة | جذر | KEEP | KEEP | KEEP | — |
| 12 | `AssessmentResponse` | إجابات/تجارب كل بند | معتمد §4.4 حفظ التقدم الجزئي والتوقيت | نواة | تُقرأ وتُكتب كوحدة واحدة للمحاولة؛ لا تقرير معتمد يستعلم بندًا عبر الأشخاص | MERGE→lab.AssessmentAttempt (ResponsesJson) | MERGE→lab.AssessmentAttempt (ResponsesJson) | MERGE→lab.AssessmentAttempt (ResponsesJson) | UQ(AttemptId,ItemKey,TrialNo) وCHECK على LatencyMs في SQL؛ تنتقل إلى C#. إعادة التصحيح تقرأ JSON (خلافي G9) |
| 13 | `AssessmentScore` | مقاييس المحاولة | معتمد §10.3 | نواة | تُستعلم عبر الزمن في Insights؛ صفوف مبررة | KEEP | KEEP | KEEP | — |

### `recovery`

| # | الجدول | الميزة/سير العمل | الاعتماد والمصدر | الفئة | الحكم | A | B | C | ما يُفقد عند التغيير |
|---:|---|---|---|---|---|---|---|---|---|
| 14 | `RecoveryJourney` | حاوية الدورات | اسمه في §5.7 (آلة حالة مقترحة)؛ بدء رحلة جديدة غير معتمد | نواة | لا يحمل إلا PersonId وStatus، وعليه UXF رحلة نشطة واحدة لكل شخص: 1:1 فعليًا | MERGE→recovery.RecoveryCycle (PersonId) | MERGE→recovery.RecoveryCycle (PersonId) | MERGE→recovery.RecoveryCycle (PersonId) | تجميع الدورات في رحلات متعددة بعد الأرشفة؛ v2 نفسها تصفه بأنه policy-gated |
| 15 | `RecoveryCycle` | دورة الخطة | §5 (28 يومًا اتجاه قوي) | نواة | جذر الخطة | KEEP | KEEP | KEEP | — |
| 16 | `PlanRevision` | نسخ الخطة | §5.5: احفظ نسخة الخطة والسبب والتواريخ | إصدار/نسخ | إصدار مطلوب نصًا | KEEP | KEEP | KEEP | — |
| 17 | `ScheduledAction` | التزامات الأسبوع | §5.2 This Week، §5.5 مستحق/منجز | نواة | قد يُولّد من القواعد، لكن التعديل وأيام الراحة والربط بالمحاولة تجعل التخزين أبسط | KEEP | KEEP | KEEP | — |
| 18 | `WeeklyReview` | المراجعة الأسبوعية | معتمد §5.5 | نواة | قرار المستخدم الأسبوعي | KEEP | KEEP | KEEP | — |

### `activity`

| # | الجدول | الميزة/سير العمل | الاعتماد والمصدر | الفئة | الحكم | A | B | C | ما يُفقد عند التغيير |
|---:|---|---|---|---|---|---|---|---|---|
| 19 | `PracticeDefinition` | كتالوج الممارسات | §19 كتالوج Admin، D31 مهام من كتالوج معتمد | إصدار/نسخ | مبرر في C: Admin ينشر ممارسات يختارها Coach | MERGE→activity.PracticeAttempt (PracticeCode, PracticeType؛ الكتالوج في الكود) | KEEP | KEEP | في A: نشر ممارسات من Admin دون نشر كود |
| 20 | `PracticeVersion` | محتوى الممارسة المجمّد | §19، §23.2 عدم إعادة كتابة السجلات | إصدار/نسخ | مبرر في C للسبب نفسه | MERGE→activity.PracticeAttempt (ContentVersion) | KEEP | KEEP | في A: FK للمحتوى المجمّد؛ ScheduledAction يحمل PracticeCode |
| 21 | `PracticeAttempt` | تنفيذ ممارسة وصلاحيته | معتمد §7.8، D08 | نواة | مصدر نمو الأشجار الأربع | KEEP | KEEP | KEEP | — |
| 22 | `PracticeProgressionDecision` | قرار رفع/خفض المستوى | §7.3 مستوى مستقل لكل نوع؛ الأرقام مفتوحة | تاريخ/تدقيق | المستوى الحالي أربع قيم لكل شخص؛ تاريخ المستوى مشتق من DifficultyTier في المحاولات | MERGE→personal.IndividualProfile (أربعة أعمدة Tier) | MERGE→personal.IndividualProfile (أربعة أعمدة Tier) | MERGE→personal.IndividualProfile (أربعة أعمدة Tier) | صف لكل قرار Try Next Level/Stay Here مع PolicyVersion؛ الأثر يبقى في AuditEvent |
| 23 | `OfflineRoutine` | الروتين الشخصي | معتمد §7.4 | نواة | كيان يملكه المستخدم | KEEP | KEEP | KEEP | — |
| 24 | `RoutineCheckIn` | تسجيل الروتين اليومي | معتمد §7.4، D09 (الزهرة) | نواة | مصدر مكافأة الزهرة | KEEP | KEEP | KEEP | — |

### `shield`

| # | الجدول | الميزة/سير العمل | الاعتماد والمصدر | الفئة | الحكم | A | B | C | ما يُفقد عند التغيير |
|---:|---|---|---|---|---|---|---|---|---|
| 25 | `ExtensionInstallation` | ربط إضافة المتصفح | D44 قدرتان؛ جدوى الإضافة مفتوحة §26.2 #9 | نواة | مبرر عند وجود الإضافة | DEFER | DEFER | KEEP | في A وB: الميزة كلها مؤجلة لأن الإضافة غير موجودة |
| 26 | `ShieldConfiguration` | نسخ إعداد الحماية والحد | §6 | إصدار/نسخ | النسخة تربط فترات الاستخدام بالمواقع المختارة وقتها | DEFER | DEFER | KEEP | — |
| 27 | `ShieldSelectedDomain` | نطاق مختار داخل نسخة إعداد | §6 | إصدار/نسخ | قائمة قصيرة من قائمة مغلقة، تُقرأ وتُكتب كوحدة | DEFER | DEFER | MERGE→shield.ShieldConfiguration (SelectedDomainsJson) | FK المركب الذي يضمن أن النطاق المحسوب كان مختارًا |
| 28 | `ProtectionSession` | تشغيل الحماية اليدوية | §6.1 | نواة | حالات Active/Expired/Failed | DEFER | DEFER | KEEP | — |
| 29 | `BrowserUsagePeriod` | وقت الاستخدام المجمّع | §6.2 | تاريخ/تدقيق | مصدر التذكير وInsights | DEFER | DEFER | KEEP | — |
| 30 | `BrowserUsageDomain` | تفصيل الوقت لكل نطاق | §6.2: الوقت يُجمع كمجموعة لا لكل موقع | تاريخ/تدقيق | تفصيل لا تطلبه المواصفة | DEFER | DEFER | MERGE→shield.BrowserUsagePeriod (DomainSecondsJson) | استعلام SQL مباشر لوقت كل نطاق |

### `institution`

| # | الجدول | الميزة/سير العمل | الاعتماد والمصدر | الفئة | الحكم | A | B | C | ما يُفقد عند التغيير |
|---:|---|---|---|---|---|---|---|---|---|
| 31 | `Institution` | المؤسسة المُتحقق منها | معتمد D17، §15 | نواة | أعمدته مطابقة لـprovider.Provider (Name, Status, CountryCode, HeadquartersCity) | KEEP | KEEP→org.Organization (Kind) | KEEP→org.Organization (Kind) | في C: جدولان منفصلان؛ Initiative يحتاج FK مركب (OrganizationId, Kind='Institution') (خلافي G1) |
| 32 | `InstitutionVerificationCase` | قرار Admin على إثبات المؤسسة | معتمد D17، D47 | تاريخ/تدقيق | أعمدته تطابق ProviderVerificationCase، وCoachApproval عدا أنه يحدد المعني بـPersonId؛ وصفحة Admin Applications واحدة (§19) | MERGE→institution.Institution (VerificationStatus, DecidedBy, DecidedAtUtc, Reason) | KEEP→org.VerificationCase (OrganizationId XOR CoachPersonId) | KEEP→org.VerificationCase (OrganizationId XOR CoachPersonId) | في A: تعدد الحالات (طلب معلومات/إعادة تقديم) وملف الإثبات |
| 33 | `RepresentativeMembership` | سلطة الممثل في المؤسسة | معتمد D17، D26 | نواة | يطابق ProviderMembership (+Role) | KEEP | KEEP→org.OrganizationMember | KEEP→org.OrganizationMember | — |
| 34 | `Initiative` | جذر المبادرة وقفل السعة | معتمد §15 | نواة | جذر. Title/Mode/Capacity/TimeZoneId/WithdrawalCutoffAtUtc مكررة في InitiativeRevision وفي PublishedSnapshotJson | KEEP | KEEP | KEEP | — |
| 35 | `InitiativeRevision` | نسخ الشروط المنشورة | قرار المالك #8، §15.2 المرحلة 6 | إصدار/نسخ | إصدار معتمد صراحة؛ لا يُمس | KEEP | KEEP | KEEP | — |
| 36 | `InitiativeContent` | ربط المبادرة بإصدار CMS | D20 محتوى توعوي ضمن المكونات | إصدار/نسخ | المحتوى جزء من الشروط المنشورة (لقطة المرحلة 3) | MERGE→institution.InitiativeRevision (ComponentsJson) | MERGE→institution.InitiativeRevision (ComponentsJson) | MERGE→institution.InitiativeRevision (ComponentsJson) | سحب/ترتيب مكوّن واحد دون نسخة جديدة، والربط بمحرر CMS العام |
| 37 | `InitiativeApplication` | طلب الانضمام وحالته | معتمد §15.3، D25، قرار #6 و#9 | نواة | سجل واحد يراه الممثل والمشرف (§15.3) | KEEP | KEEP | KEEP | — |
| 38 | `InitiativeSeatOffer` | عرض مقعد من الانتظار | معتمد §15.3 Queued→Offered | نواة | الطلب نفسه يحمل الحالة Offered، والعرض الحي واحد لكل طلب، وExpired نهائي: 1:1 وحالة مكررة | MERGE→institution.InitiativeApplication (OfferedAtUtc, OfferExpiresAtUtc) | MERGE→institution.InitiativeApplication (OfferedAtUtc, OfferExpiresAtUtc) | MERGE→institution.InitiativeApplication (OfferedAtUtc, OfferExpiresAtUtc) | أكثر من عرض لنفس الطلب، وهو غير موجود في آلة الحالة |
| 39 | `InitiativeMembership` | العضوية المقبولة | معتمد D25، D28، قرارات #4 #7 #11 | نواة | الحالة Accepted موجودة في الطلب والعضوية معًا؛ 1:1 بـUQ ApplicationId وFK ثلاثي فقط لإبقاء النسختين متسقتين | MERGE→institution.InitiativeApplication (Accepted/Suspended/Removed/Completed، EndedAtUtc، CapacityReleasedAtUtc، WithdrawalCutoffAtUtc) | MERGE→institution.InitiativeApplication (Accepted/Suspended/Removed/Completed، EndedAtUtc، CapacityReleasedAtUtc، WithdrawalCutoffAtUtc) | MERGE→institution.InitiativeApplication (Accepted/Suspended/Removed/Completed، EndedAtUtc، CapacityReleasedAtUtc، WithdrawalCutoffAtUtc) | الفصل بين الطلب والمشاركة كجدولين. قاعدة المبادرة الواحدة تبقى UXF على PersonId (خلافي G6) |
| 40 | `InitiativeStaffInvitation` | دعوة مشرف/مدرب بالبريد | معتمد D21، D23 | نواة | الدعوة والتعيين مرحلتان لسجل واحد؛ StandaloneSessionSupervisorAppointment والـClient يدمجانهما أصلًا | MERGE→institution.StaffAppointment (InvitedEmail, TokenHash, ExpiresAtUtc) | MERGE→institution.StaffAppointment (InvitedEmail, TokenHash, ExpiresAtUtc) | MERGE→institution.StaffAppointment (InvitedEmail, TokenHash, ExpiresAtUtc) | صف مستقل لكل إعادة إرسال (يصبح تدوير TokenHash) |
| 41 | `InitiativeStaffAppointment` | تعيين فعّال بنطاق | معتمد D21، D28 (3 مشرفين)، D30 | نواة | يبقى؛ يستوعب الدعوة | KEEP→institution.StaffAppointment | KEEP→institution.StaffAppointment (InitiativeId XOR ExperienceId) | KEEP→institution.StaffAppointment (InitiativeId XOR ExperienceId) | — |

### `coach`

| # | الجدول | الميزة/سير العمل | الاعتماد والمصدر | الفئة | الحكم | A | B | C | ما يُفقد عند التغيير |
|---:|---|---|---|---|---|---|---|---|---|
| 42 | `CoachApproval` | اعتماد Coach مستقل | §13 تحقق مهني؛ الدليل مفتوح §26.2 #4 | تاريخ/تدقيق | نفس شكل حالة التحقق | DEFER | MERGE→org.VerificationCase (CoachPersonId) | MERGE→org.VerificationCase (CoachPersonId) | لا شيء وظيفي |
| 43 | `CoachProgram` | برنامج Coach مستقل | معتمد D19، D24 | نواة | جذر | DEFER | KEEP | KEEP | — |
| 44 | `ProgramRevision` | نسخ البرنامج المنشورة | §13.2 Versioned Program، §23.2 | إصدار/نسخ | إصدار مطلوب نصًا | DEFER | KEEP | KEEP | — |
| 45 | `ProgramStage` | مرحلة داخل نسخة | §13.2 مراحل البرنامج | إصدار/نسخ | صفوف ثابتة داخل نسخة غير قابلة للتعديل، ولا يشير إليها أي FK في القاموس | DEFER | MERGE→coach.ProgramRevision (StagesJson) | MERGE→coach.ProgramRevision (StagesJson) | لا شيء: لا FK يشير إلى المرحلة |
| 46 | `OperationalGroup` | مجموعة تشغيلية | معتمد D19 (أب واحد XOR) | نواة | جذر | DEFER | KEEP | KEEP | — |
| 47 | `InitiativeGroupPlacement` | تسكين عضو مبادرة في مجموعة | معتمد D29 (نقل مع تاريخ) | تاريخ/تدقيق | نفس مفهوم ProgramGroupMembership بأب مختلف | DEFER | MERGE→coach.GroupMembership (ApplicationId بـFK مركب مع InitiativeId) | MERGE→coach.GroupMembership (ApplicationId بـFK مركب مع InitiativeId) | جدول لكل نوع أب؛ قيد العضو من نفس المبادرة يبقى عبر FK مركب |
| 48 | `ProgramGroupMembership` | عضو مجموعة برنامج | معتمد §13 | نواة | يصبح جدول عضوية المجموعات الموحد بصفوف مؤرخة | DEFER | KEEP→coach.GroupMembership | KEEP→coach.GroupMembership | — |
| 49 | `ProgramCompletion` | إكمال البرنامج | D10: إكمال المبادرة والبرنامج تصنيف واحد | نواة | D10 نفسه يوحّدهما | DEFER | MERGE→session.Completion (ProgramId, PersonId, ProgramRevisionId) | MERGE→session.Completion (ProgramId, PersonId, ProgramRevisionId) | لا شيء وظيفي؛ ProgramRevisionId يصبح FK nullable |
| 50 | `GroupCoachAssignment` | مسؤولية المدرب والتسليم | معتمد D29، D33 | تاريخ/تدقيق | تاريخ تسليم معتمد | DEFER | KEEP | KEEP | — |
| 51 | `ProgramGroupInvitation` | دعوة طالب لمجموعة | معتمد §13.2، D23 | نواة | دعوة ثم عضوية لنفس السجل | DEFER | MERGE→coach.GroupMembership (Status='Invited', InvitedEmail, TokenHash) | MERGE→coach.GroupMembership (Status='Invited', InvitedEmail, TokenHash) | UseLimit/Uses (حذفتها v2 مع أن §13.2 يذكر use limit — قرار مطلوب) |

### `task`

| # | الجدول | الميزة/سير العمل | الاعتماد والمصدر | الفئة | الحكم | A | B | C | ما يُفقد عند التغيير |
|---:|---|---|---|---|---|---|---|---|---|
| 52 | `Assignment` | مهمة مشتركة | معتمد D31، §13.1 محرك واحد | نواة | جذر | DEFER | KEEP | KEEP | — |
| 53 | `AssignmentRevision` | نسخ المهمة | §13.2: تغيير المهمة المنشورة ينشئ نسخة جديدة | إصدار/نسخ | مبرر بنص صريح | DEFER | KEEP | KEEP | — |
| 54 | `AssignmentRecipient` | حالة المهمة لكل طالب | D31 | نواة | يحفظ من كُلّف فعلًا رغم النقل | DEFER | KEEP | KEEP | — |
| 55 | `SubmissionAttempt` | محاولات التسليم الثابتة | معتمد D32 | تاريخ/تدقيق | تاريخ معتمد | DEFER | KEEP | KEEP | — |
| 56 | `ReviewDecision` | قرار المراجعة | معتمد D32، §13.3 | تاريخ/تدقيق | تاريخ قرارات معتمد | DEFER | KEEP | KEEP | — |
| 57 | `ReviewPrivateNote` | ملاحظة داخلية للمشرف | معتمد D33، §13.3 قراء مختلفون | تاريخ/تدقيق | قارئ مختلف وتصنيف خصوصية R مقابل O: فصل مبرر | DEFER | KEEP | KEEP | — |
| 58 | `CoachReport` | تقرير المدرب | معتمد D34 | نواة | أعمدته مطابقة لـSupervisorReport عدا النطاق | DEFER | KEEP→task.OperationalReport (GroupId XOR InitiativeId) | KEEP→task.OperationalReport (GroupId XOR InitiativeId) | — |
| 59 | `SupervisorReport` | ملخص المشرف | معتمد D34 | نواة | نفس الشكل | DEFER | MERGE→task.OperationalReport (InitiativeId) | MERGE→task.OperationalReport (InitiativeId) | لا شيء وظيفي |

### `session`

| # | الجدول | الميزة/سير العمل | الاعتماد والمصدر | الفئة | الحكم | A | B | C | ما يُفقد عند التغيير |
|---:|---|---|---|---|---|---|---|---|---|
| 60 | `Session` | جلسة مكوّن | معتمد D39، §15.2 | نواة | جذر؛ يستوعب ExperienceSession في C | DEFER | KEEP (InitiativeId XOR ExperienceId) | KEEP (InitiativeId XOR ExperienceId) | — |
| 61 | `SessionRevision` | نسخ شروط الجلسة | §16 Calendar: history/version retained، §15.2 | إصدار/نسخ | AuditEvent يحفظ hash فقط لا القيم، فلا يكفي لحفظ النسخة | DEFER | KEEP | KEEP | — |
| 62 | `InitiativeSessionDuty` | المشرف المسؤول عن الجلسة | §15.2 المرحلة 4 responsible session appointment | نواة | صلاحية الحضور على مستوى المبادرة كلها (§17)، فالواجب معلوماتي هنا وتقييدي لمشرف Provider | DEFER | KEEP→session.SessionDuty | KEEP→session.SessionDuty | — |
| 63 | `StandaloneSessionSupervisorAppointment` | مشرف جلسة مستقلة | غير معتمد: الجلسة المستقلة غير موجودة في المواصفة؛ v2 صنفته DEFER | تخميني/غير معتمد | ميزة تخمينية | DEFER (سياسة) | DEFER (سياسة) | DEFER (سياسة) | لو اعتُمد: يندمج في StaffAppointment بإضافة SessionId إلى XOR، بلا جدول جديد |
| 64 | `SessionCapacityPool` | سعة كل نمط | D37 Hybrid حسب النمط، §15.2 mode capacity | نواة | صفان على الأكثر لكل جلسة (Online/InPerson) | DEFER | MERGE→session.Session (InPersonCapacity, OnlineCapacity) | MERGE→session.Session (InPersonCapacity, OnlineCapacity) | أنماط سعة غير محدودة؛ القفل ينتقل إلى صف Session |
| 65 | `SessionRegistration` | تسجيل في جلسة | معتمد D39 | نواة | حقيقة منفصلة عن العضوية | DEFER | KEEP | KEEP | — |
| 66 | `SessionAttendance` | الحضور الفعلي | معتمد D36، D37 | نواة | يستوعب ProviderAttendance في C | DEFER | KEEP→session.Attendance (RegistrationId XOR BookingId) | KEEP→session.Attendance (RegistrationId XOR BookingId) | — |
| 67 | `AttendanceCorrection` | تصحيح الحضور | §17.1 التصحيح يحفظ قبل/بعد/الفاعل/السبب | تاريخ/تدقيق | أعمدته (OldStatus, NewStatus, CorrectedBy, Reason) تطابق AuditEvent (BeforeStatus, AfterStatus, ActorPersonId, Reason) | DEFER | MERGE→ops.AuditEvent | MERGE→ops.AuditEvent | FK مباشر من التصحيح إلى الحضور (يصبح ResourcePublicId، ويحتاج إضافة PublicId إلى Attendance)؛ يجب أن يُقرأ AuditEvent في واجهة المشرف (خلافي G10) |
| 68 | `AbsenceExcuse` | عذر الغياب وقرار الممثل | معتمد D35، D36 | نواة | قرار منفصل عن الحضور: معتمد صراحة | DEFER | KEEP | KEEP | — |
| 69 | `InitiativeCompletion` | إكمال المبادرة | معتمد D10، D39 | نواة | يستوعب إكمال البرنامج والمخيم | DEFER | KEEP→session.Completion (ApplicationId XOR ProgramId+PersonId XOR BookingId) | KEEP→session.Completion (ApplicationId XOR ProgramId+PersonId XOR BookingId) | — |

### `provider`

| # | الجدول | الميزة/سير العمل | الاعتماد والمصدر | الفئة | الحكم | A | B | C | ما يُفقد عند التغيير |
|---:|---|---|---|---|---|---|---|---|---|
| 70 | `Provider` | مزوّد التجارب | معتمد D40، §16 | نواة | أعمدته مطابقة لـInstitution | DEFER | DEFER | MERGE→org.Organization (Kind='Provider') | جدول منفصل (خلافي G1) |
| 71 | `ProviderVerificationCase` | تحقق المزوّد | D47 | تاريخ/تدقيق | نفس شكل حالة التحقق | DEFER | DEFER | MERGE→org.VerificationCase | لا شيء وظيفي |
| 72 | `ProviderMembership` | موظفو المزوّد | §16 | نواة | يطابق RepresentativeMembership | DEFER | DEFER | MERGE→org.OrganizationMember (Role) | جدول منفصل (خلافي G1) |
| 73 | `Experience` | تجربة/مخيم | معتمد D40، §16 | نواة | جذر وقفل السعة | DEFER | DEFER | KEEP | — |
| 74 | `ExperienceRevision` | نسخ شروط التجربة | §16.3 attributed revision، موافقة وسلامة وقت الحجز | إصدار/نسخ | إصدار مطلوب نصًا | DEFER | DEFER | KEEP | — |
| 75 | `ExperienceSession` | جلسة داخل تجربة | §16 جلسات المخيم | نواة | أعمدته (Title, Mode, Status) جزء من Session | DEFER | DEFER | MERGE→session.Session (ExperienceId) | جدول جلسات منفصل لكل مالك (خلافي G3) |
| 76 | `ExperienceBooking` | حجز المشارك | معتمد D27، D40 | نواة | جذر المشاركة في Provider | DEFER | DEFER | KEEP | — |
| 77 | `SeatOffer` | عرض مقعد من الانتظار | معتمد D27، §16.1 | نواة | الرفض/الانتهاء يحرر المقعد للتالي فلا يتكرر العرض لنفس الحجز؛ الـClient يعامله كحالة حجز | DEFER | DEFER | MERGE→provider.ExperienceBooking (OfferedAtUtc, OfferExpiresAtUtc) | أكثر من عرض لنفس الحجز (غير موجود في §16.1) |
| 78 | `ProviderStaffInvitation` | دعوة موظف مزوّد | §16 Supervisors & Staff | نواة | دعوة ثم تعيين لنفس السجل | DEFER | DEFER | MERGE→institution.StaffAppointment | صف لكل إعادة إرسال |
| 79 | `ProviderStaffAppointment` | تعيين موظف مزوّد | §17 مشرف Provider بنطاق محدود | نواة | نفس شكل تعيين المبادرة | DEFER | DEFER | MERGE→institution.StaffAppointment (ExperienceId) | جدول تعيين منفصل (خلافي G2) |
| 80 | `ProviderAppointmentSession` | جلسات مسندة لمشرف المزوّد | §16 named sessions/cohorts | نواة | نفس مفهوم InitiativeSessionDuty | DEFER | DEFER | MERGE→session.SessionDuty | جدول واجب منفصل (خلافي G3) |
| 81 | `ProviderCohort` | فوج تحت مشرف | مصطلح معتمد Supervisor Cohort §2.1، §17 | نواة | معتمد اصطلاحيًا رغم أن v2 أجّله | DEFER | DEFER | KEEP | — |
| 82 | `ProviderCohortMember` | عضو الفوج | §17 | نواة | الحجز ينتمي إلى فوج واحد على الأكثر | DEFER | DEFER | MERGE→provider.ExperienceBooking (CohortId بـFK مركب مع ExperienceId) | انتماء حجز واحد إلى أكثر من فوج |
| 83 | `ProviderAttendance` | حضور جلسات المزوّد | D36، D37 (نفس بروتوكول الحضور) | نواة | أعمدته شبه مطابقة لـSessionAttendance | DEFER | DEFER | MERGE→session.Attendance (BookingId) | جدول حضور منفصل (خلافي G4) |
| 84 | `ProviderAttendanceCorrection` | تصحيح حضور المزوّد | §17.1 | تاريخ/تدقيق | نسخة ثانية من AttendanceCorrection | DEFER | DEFER | MERGE→ops.AuditEvent | FK مباشر (خلافي G10) |
| 85 | `CampCompletion` | إكمال المخيم | D09 (بيت الطائر)، §16.2 | نواة | نفس شكل الإكمال | DEFER | DEFER | MERGE→session.Completion (BookingId) | جدول إكمال منفصل (خلافي G5) |
| 86 | `ProviderIncident` | بلاغ سلامة | §24.2 safe reporting mechanism؛ السياسة مفتوحة §26.2 #4 | تاريخ/تدقيق | بيانات سلامة بتصنيف R وقراء محدودين | DEFER | DEFER | KEEP | — |

### `forms`

| # | الجدول | الميزة/سير العمل | الاعتماد والمصدر | الفئة | الحكم | A | B | C | ما يُفقد عند التغيير |
|---:|---|---|---|---|---|---|---|---|---|
| 87 | `Form` | نموذج/استبيان معرّف الهوية | معتمد D41، §15.4 | نواة | جذر؛ يستوعب Competition في C | DEFER | KEEP | KEEP | — |
| 88 | `FormVersion` | نسخة النموذج المنشورة | D41 versioned | إصدار/نسخ | إصدار مطلوب نصًا؛ يحمل تعريف الأسئلة | DEFER | KEEP | KEEP | — |
| 89 | `FormQuestion` | سؤال داخل نسخة | §15.4 | إصدار/نسخ | صفوف ثابتة داخل نسخة غير قابلة للتعديل | DEFER | MERGE→forms.FormVersion (DefinitionJson) | MERGE→forms.FormVersion (DefinitionJson) | FK من الإجابة إلى السؤال؛ التحقق في C# مقابل النسخة المثبتة (خلافي G8) |
| 90 | `FormQuestionOption` | خيار سؤال | §15.4 | إصدار/نسخ | نفس السبب | DEFER | MERGE→forms.FormVersion (DefinitionJson) | MERGE→forms.FormVersion (DefinitionJson) | FK من الاختيار إلى الخيار (خلافي G8) |
| 91 | `FormResponse` | رد شخص معرّف | D41 | نواة | جذر الرد | DEFER | KEEP | KEEP | — |
| 92 | `FormAnswer` | إجابة سؤال | §15.4 | نواة | تُقرأ كوحدة مع الرد | DEFER | MERGE→forms.FormResponse (AnswersJson) | MERGE→forms.FormResponse (AnswersJson) | FK من الإجابة إلى SecureFile (يُعكس: SecureFile يحمل FormResponseId)، وتقارير SQL تحتاج OPENJSON (خلافي G8) |
| 93 | `FormAnswerChoice` | اختيار متعدد | §15.4 | نواة | نفس السبب | DEFER | MERGE→forms.FormResponse (AnswersJson) | MERGE→forms.FormResponse (AnswersJson) | خلافي G8 |

### `files`

| # | الجدول | الميزة/سير العمل | الاعتماد والمصدر | الفئة | الحكم | A | B | C | ما يُفقد عند التغيير |
|---:|---|---|---|---|---|---|---|---|---|
| 94 | `SecureFile` | ملف آمن | §15.4، D35 مرفقات مقيدة | بنية تشغيلية | مشترك بين 8 جداول | DEFER | KEEP | KEEP | في A: لا رفع ملفات |

### `forms`

| # | الجدول | الميزة/سير العمل | الاعتماد والمصدر | الفئة | الحكم | A | B | C | ما يُفقد عند التغيير |
|---:|---|---|---|---|---|---|---|---|---|
| 95 | `Competition` | مسابقة | §15.4 يعدّ competition entries نوعًا من النماذج | نواة | المواصفة نفسها تضعها تحت محرك النماذج | DEFER | DEFER | MERGE→forms.Form (Purpose='Competition') | جذر مسابقة منفصل |
| 96 | `CompetitionCriterion` | معيار تحكيم | rubric مفتوح §26.2 #8 | إصدار/نسخ | جزء من التعريف المجمّد | DEFER | DEFER | MERGE→forms.FormVersion (DefinitionJson) | FK من الدرجة إلى المعيار |
| 97 | `CompetitionEntry` | مشاركة | §15.4 | نواة | هي رد على نموذج المسابقة | DEFER | DEFER | MERGE→forms.FormResponse | لا شيء وظيفي |
| 98 | `CompetitionJudgment` | تحكيم بهوية الحكم | §20.4 eligible competitions | تاريخ/تدقيق | حقيقة مختلفة عن الإجابة (حكم، قرار، ملاحظات) | DEFER | DEFER | KEEP | — |
| 99 | `CompetitionCriterionScore` | درجة لكل معيار | rubric مفتوح §26.2 #8 | تاريخ/تدقيق | تُقرأ كوحدة مع الحكم | DEFER | DEFER | MERGE→forms.CompetitionJudgment (ScoresJson) | استعلام SQL مباشر للدرجة |

### `partnership`

| # | الجدول | الميزة/سير العمل | الاعتماد والمصدر | الفئة | الحكم | A | B | C | ما يُفقد عند التغيير |
|---:|---|---|---|---|---|---|---|---|---|
| 100 | `ProgramLink` | ربط برنامج Coach بمبادرة | معتمد §18، D19 | نواة | أعمدته مطابقة لـExperienceLink | DEFER | DEFER | KEEP→partnership.PartnershipLink (ProgramId XOR ExperienceId) | — |
| 101 | `ExperienceLink` | ربط تجربة بمبادرة | معتمد §18، D40 | نواة | نفس الشكل | DEFER | DEFER | MERGE→partnership.PartnershipLink (ExperienceId) | لا شيء وظيفي |

### `community`

| # | الجدول | الميزة/سير العمل | الاعتماد والمصدر | الفئة | الحكم | A | B | C | ما يُفقد عند التغيير |
|---:|---|---|---|---|---|---|---|---|---|
| 102 | `Post` | منشور | §12.1 اتجاه محفوظ؛ التفاصيل مؤجلة §12.2 | نواة | جذر المجتمع | DEFER | DEFER | KEEP | — |
| 103 | `Comment` | تعليق | §12.1 | نواة | كيان مستقل | DEFER | DEFER | KEEP | — |
| 104 | `Reaction` | تفاعل عام | §12.1 | نواة | كيان مستقل | DEFER | DEFER | KEEP | — |
| 105 | `Bookmark` | حفظ خاص | §12.1 save/bookmark | نواة | خاص بالشخص (S) مقابل تفاعل عام | DEFER | DEFER | KEEP | — |
| 106 | `ContentReport` | بلاغ محتوى | §12.1، §19 الإشراف | نواة | يستوعب قرار الإشراف | DEFER | DEFER | KEEP | — |
| 107 | `ModerationDecision` | قرار الإشراف | §19؛ الاستئناف مفتوح §26.2 #8 | تاريخ/تدقيق | قرار واحد لكل بلاغ | DEFER | DEFER | MERGE→community.ContentReport (Decision, DecidedBy, DecidedAtUtc, Reason) | سلسلة قرارات للبلاغ الواحد (استئناف غير معتمد) |
| 108 | `JointGoal` | هدف مشترك | §12.1 not finalized، §26.2 #8 | تخميني/غير معتمد | ميزة غير محسومة | DEFER (سياسة) | DEFER | DEFER (سياسة) | تأجيل ميزة لا حذف جدول |
| 109 | `JointGoalMember` | عضو الهدف | §26.2 #8 | تخميني/غير معتمد | ميزة غير محسومة | DEFER (سياسة) | DEFER | DEFER (سياسة) | تأجيل ميزة |
| 110 | `JointGoalCheckIn` | متابعة الهدف | §26.2 #8 | تخميني/غير معتمد | ميزة غير محسومة | DEFER (سياسة) | DEFER | DEFER (سياسة) | تأجيل ميزة |

### `governance`

| # | الجدول | الميزة/سير العمل | الاعتماد والمصدر | الفئة | الحكم | A | B | C | ما يُفقد عند التغيير |
|---:|---|---|---|---|---|---|---|---|---|
| 111 | `ContentRelease` | إصدار محتوى CMS | §19 Content Studio؛ المناطق مفتوحة §26.2 #8 | إصدار/نسخ | draft/publish/rollback معتمد | DEFER | DEFER | KEEP | — |
| 112 | `GovernanceAction` | إجراء حوكمة Admin | §19 | تاريخ/تدقيق | أعمدته (Actor, ActionCode, ResourceType, ResourcePublicId, Reason) مجموعة جزئية من AuditEvent | MERGE→ops.AuditEvent | MERGE→ops.AuditEvent | MERGE→ops.AuditEvent | لا شيء: كل الأعمدة موجودة في AuditEvent |

### `commercial`

| # | الجدول | الميزة/سير العمل | الاعتماد والمصدر | الفئة | الحكم | A | B | C | ما يُفقد عند التغيير |
|---:|---|---|---|---|---|---|---|---|---|
| 113 | `PlanVersion` | نسخة خطة اشتراك | §20: ليس كتالوجًا موقّعًا، §26.2 #7 | تخميني/غير معتمد | قرار تجاري مفتوح | DEFER (سياسة) | DEFER | DEFER (سياسة) | تأجيل ميزة؛ لو اعتُمدت تكفي 3 جداول |
| 114 | `PlanFeature` | ميزة/حد الخطة | §20 | تخميني/غير معتمد | قرار مفتوح | DEFER (سياسة) | DEFER | DEFER (سياسة) | تأجيل ميزة |
| 115 | `Subscription` | اشتراك | §20 | تخميني/غير معتمد | قرار مفتوح | DEFER (سياسة) | DEFER | DEFER (سياسة) | تأجيل ميزة |
| 116 | `EntitlementAllocation` | توزيع الاستحقاق | §20.6 | تخميني/غير معتمد | قرار مفتوح | DEFER (سياسة) | DEFER | DEFER (سياسة) | تأجيل ميزة |
| 117 | `UsageLedger` | دفتر الاستخدام | §20.6 | تخميني/غير معتمد | قرار مفتوح | DEFER (سياسة) | DEFER | DEFER (سياسة) | تأجيل ميزة |

### `evidence`

| # | الجدول | الميزة/سير العمل | الاعتماد والمصدر | الفئة | الحكم | A | B | C | ما يُفقد عند التغيير |
|---:|---|---|---|---|---|---|---|---|---|
| 118 | `EvidenceEvent` | حدث دليل موحد | §9.2 معرّف حدث مصدر فريد، §23.2 لا مكافأة مزدوجة عبر workspace مرتبطة | تاريخ/تدقيق | مبرر في C: ستة أنواع مصادر، والشراكات قد تعرض الحدث نفسه مرتين | DEFER | KEEP | KEEP | في A: المكافأة تشير مباشرة إلى PracticeAttempt XOR RoutineCheckIn |
| 119 | `RewardPolicyVersion` | نسخة سياسة المكافأة | §9.2 policy version؛ العتبات مفتوحة | إصدار/نسخ | القواعد في الكود؛ بقية نسخ السياسات في القاموس نصية أصلًا (PlanRevision.PolicyVersion...) | MERGE→evidence.PersonalRewardEntry (PolicyVersion نصي) | MERGE→evidence.PersonalRewardEntry (PolicyVersion نصي، وكذلك GroupRewardEntry) | MERGE→evidence.PersonalRewardEntry (PolicyVersion نصي، وكذلك GroupRewardEntry) | FK إلى سجل نسخة السياسة |
| 120 | `PersonalRewardEntry` | دفتر المكافأة الشخصية | معتمد D07–D11 | تاريخ/تدقيق | نمو مكتسب لا يُسحب عند تغيير السياسة: دفتر مطلوب | KEEP | KEEP | KEEP | — |
| 121 | `GroupRewardEntry` | دفتر مكافأة المجموعة | معتمد D13 | تاريخ/تدقيق | منفصل عن الشخصي لأن تصنيف الخصوصية مختلف (S مقابل O) وقراؤه موظفون | DEFER | KEEP | KEEP | — |
| 122 | `GroupGarden` | هوية حديقة المجموعة | D13 حديقة لكل مبادرة أو مجموعة مستقلة | نواة | 1:1 مع المبادرة أو المجموعة (UXF على كل منهما) ولا يحمل إلا Status | DEFER | MERGE→evidence.GroupRewardEntry (InitiativeId XOR OperationalGroupId) | MERGE→evidence.GroupRewardEntry (InitiativeId XOR OperationalGroupId) | حالة أرشفة للحديقة نفسها |

### `ops`

| # | الجدول | الميزة/سير العمل | الاعتماد والمصدر | الفئة | الحكم | A | B | C | ما يُفقد عند التغيير |
|---:|---|---|---|---|---|---|---|---|---|
| 123 | `AuditEvent` | سجل التدقيق | §23.3، §19 | تاريخ/تدقيق | يستوعب GovernanceAction والتصحيحات | KEEP | KEEP | KEEP | — |
| 124 | `OutboxMessage` | رسائل خارجية بعد commit | §23.3، §24.6 | بنية تشغيلية | ضروري لإرسال بريد الدعوات بشكل موثوق | DEFER | KEEP | KEEP | في A: رابط دعوة قابل للنسخ (مسموح §23.3) |
| 125 | `Notification` | إشعار داخل التطبيق | §23.3 | نواة | معتمد | DEFER | KEEP | KEEP | في A: الحالة تظهر في My Initiatives بدل مركز إشعارات |
| 126 | `DeliveryAttempt` | محاولة توصيل | §23.3 notification outcome | تاريخ/تدقيق | Outbox فيه Attempts أصلًا | DEFER | MERGE→ops.OutboxMessage (Attempts, LastError, ProviderRef) | MERGE→ops.OutboxMessage (Attempts, LastError, ProviderRef) | صف لكل محاولة |
| 127 | `IdempotencyRecord` | تخزين استجابة الطلب المكرر | §22.3 idempotency حيث توجد سباقات | بنية تشغيلية | كل سباق مذكور له مفتاح طبيعي: قبول الطلب (UXF)، QR (UQ)، فترات الاستخدام (SequenceNo)، المكافأة (UQ المصدر) | REMOVE | REMOVE | REMOVE | إعادة الاستجابة نفسها حرفيًا لطلب POST مكرر؛ يعيد الـAPI الحالة الحالية |

### `institution`

| # | الجدول | الميزة/سير العمل | الاعتماد والمصدر | الفئة | الحكم | A | B | C | ما يُفقد عند التغيير |
|---:|---|---|---|---|---|---|---|---|---|
| 128 | `InitiativeApplicationDecision` | سجل قرارات الطلب | قرار المالك #9 | تاريخ/تدقيق | تاريخ معتمد صراحة؛ يحمل كل انتقالات الطلب بعد الدمج | KEEP | KEEP | KEEP | — |
| 129 | `InitiativeDraft` | مسودة البناء ذات المراحل الست | §15.2 حفظ المسودة في كل مرحلة | إصدار/نسخ | UXF مسودة واحدة لكل مبادرة، والجذر يحمل أعمدة مسودة nullable أصلًا | MERGE→institution.Initiative (DraftJson, DraftStage, DraftUpdatedByPersonId) | MERGE→institution.Initiative (DraftJson, DraftStage, DraftUpdatedByPersonId) | MERGE→institution.Initiative (DraftJson, DraftStage, DraftUpdatedByPersonId) | rowversion منفصل للمسودة؛ الحفظ التلقائي سيغيّر rowversion الجذر |
