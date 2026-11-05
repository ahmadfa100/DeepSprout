# DeepSprout v4 — تقرير قرار المعمارية النهائي (المخرج F)

> **ملف مكتوب يدويًا.** توصية واحدة للنطاق الكامل المعتمد، لا قائمة بدائل. التفاصيل في: [01 خريطة المنتج](01-product-workflow-map-ar.md) · [02 القاموس](02-data-dictionary-ar.md) · [03 المخططات](03-erd-ar.md) · [04 مصفوفة الترحيل](04-migration-matrix-ar.md) · [05 خطة التحقق](05-validation-plan-ar.md) · [05a تتبع الفحوص](05a-test-traceability-ar.md).

## 1. القرار

**المخطط النهائي الموصى به: 87 جدولًا في 19 مخططًا (schema)، قاعدة SQL Server واحدة، و`DbContext` واحد.**

| المقياس | القيمة |
|---|---:|
| الجداول | **87** |
| الأعمدة | 1116 |
| المفاتيح الأجنبية | 234 (منها 85 مركبة للملكية) |
| القيود الفريدة | 172 (منها 53 مفلترة) |
| CHECK | 294 |
| جداول إلحاقية (تاريخ ثابت) | 33 |

**المطابقة الحسابية مع الـ129:** 87 KEEP + 33 MERGE + 0 REMOVE + 9 DEFER = **129**. كل جدول نهائي له مصدر KEEP واحد بالضبط، ولا يضيف التصميم كيانًا جديدًا بلا أصل (يتحقق منه `generate.mjs`: 0 أخطاء).

### لماذا 87 وليس 71 ولا 119 ولا 129

| الرقم | المصدر | سبب عدم اعتماده |
|---|---|---|
| 129 | قاعدة Codex المنفذة | 33 جدولًا منها تمثيل ثانٍ لحقيقة واحدة (عضوية = طلب مقبول، دعوة = تعيين معلق، مزوّد ومؤسسة = منظمة، حضور المزوّد = حضور) تتطلب مشغّلات مزامنة بين النسختين، و9 لميزات غير معتمدة |
| 119 | توصية Codex | تقبل دمجًا واحدًا فقط؛ ترفض دمجات تبيّن من الواجهة الحالية وقرارات المالك أنها حقيقة واحدة (التفاصيل §4) |
| 71 | تدقيق Claude v3 (C) | 15 دمجًا منها تستبدل جداول علائقية بـJSON أو بسجل تدقيق، فتفقد FK أو تفردًا أو تحليلًا مستقلًا؛ Codex محق فيها (§3.2) |
| **87** | **v4** | يقبل كل دمج يزيل نسخة مكررة دون إضعاف ضمان، ويرفض كل دمج يضعف ضمانًا علائقيًا |

87 هو بالضبط رقم "C مع رفض الدمجات المتنازع عليها" الذي ظهر في v3 — لكنه هنا **مُشتق من مراجعة كل دمج على حدة** في ضوء الواجهة الحالية، لا من قبول القائمة كما هي.

---

## 2. الجرد الاسمي حسب الوحدة، ولماذا يلزم كل جدول

التبرير الكامل لكل جدول (الأعمدة، القيود، دورة الحياة، مثال الإنشاء، عاقبة الحذف، المصدر) في [02-data-dictionary-ar.md](02-data-dictionary-ar.md). هنا سطر واحد لكل جدول.

### iam — الهوية (5)
| الجدول | لماذا هو مستقل |
|---|---|
| `iam.Person` | هوية واحدة لكل الأدوار (D45، قرار #3)؛ البريد الموثّق عمود بفهرس فريد مفلتر |
| `iam.PasswordCredential` | 1:0..1 (الطالب المدعو قد لا يملك كلمة مرور)؛ عزل المادة السرية بصلاحية جدول |
| `iam.OtpChallenge` | تحديات قصيرة العمر متعددة لكل شخص بأغراض مختلفة وعداد محاولات |
| `iam.ConsentRecord` | تاريخ موافقات إلحاقي لكل غرض ونسخة نص |
| `iam.GlobalGrant` | صلاحيات Admin منفصلة عن المنح المقيدة بالمورد (D15) |

### org — المنظمات والطاقم (4)
| `org.Organization` | المؤسسة والمزوّد بنوع ثابت؛ FK مركب `(Id, Kind)` يمنع خلط المالك |
|---|---|
| `org.OrganizationMember` | سلطة الممثل/عضو المزوّد؛ تاريخ منح وسحب |
| `org.VerificationCase` | طلبات Coach/Institution/Provider بصفحة Admin واحدة ودورة MoreInfo |
| `org.StaffAppointment` | الدعوة → القبول → السحب لمشرفي ومدربي المبادرة ومشرفي التجربة؛ حد الثلاثة |

### personal (1) · lab (5) · recovery (4)
| `personal.IndividualProfile` | المساحة الشخصية ومرحلة الـonboarding الدقيقة وبداية الرحلة |
|---|---|
| `lab.InstrumentVersion` | نسخة الأداة وخوارزمية التصحيح؛ المقارنة تعتمد عليها |
| `lab.AssessmentWindow` | نافذة إعادة التقييم الأسبوعية وحالتها (Used/Missed) |
| `lab.AssessmentAttempt` | المحاولة بنوعها (Baseline/Official/Practice) وصلاحيتها |
| `lab.AssessmentResponse` | البنود للحفظ الجزئي وإعادة التصحيح؛ JSON يفقد الفحص والتحليل لكل بند |
| `lab.AssessmentScore` | درجات إلحاقية لكل نسخة تصحيح |
| `recovery.RecoveryCycle` | الدورة (28 يومًا اتجاهًا) ونهايتها ومراجعتها |
| `recovery.PlanRevision` | الخطة المقبولة والمسودة والتاريخ ("Plan adjusted") |
| `recovery.ScheduledAction` | الإجراء اليومي القابل للقياس بحالة ورابط إكمال حقيقي |
| `recovery.WeeklyReview` | قرار المراجعة الأسبوعية الإلحاقي |

### activity (6) · shield (6) · evidence (4)
| `activity.PracticeDefinition` / `PracticeVersion` | الكتالوج ونسخه الثابتة التي تشير إليها المحاولات والمهام والخطة |
|---|---|
| `activity.PracticeAttempt` | الدليل الأساسي للممارسة ومصدر نمو الشجرة |
| `activity.PracticeProgressionDecision` | تاريخ تدرج المستوى لكل نوع (يُعرض في Insights)؛ أربعة أعمدة كانت ستفقد التاريخ |
| `activity.OfflineRoutine` / `RoutineCheckIn` | الروتين وتسجيل Done/Skipped اليومي الفريد |
| `shield.ExtensionInstallation` | الاقتران الصريح وحالته |
| `shield.ShieldConfiguration` / `ShieldSelectedDomain` | نسخ الحد والمواقع؛ المواقع هدف FK مركب من استخدام الموقع |
| `shield.ProtectionSession` | جلسة الحماية وحالاتها |
| `shield.BrowserUsagePeriod` / `BrowserUsageDomain` | دفعات القياس الإلحاقية ومواقعها لـ"By website" |
| `evidence.EvidenceEvent` | الدليل الموحد المصدر لكل مكافأة، وإبطاله |
| `evidence.RewardPolicyVersion` | قاعدة المكافأة المجمّدة وقت المنح (Garden Rules) |
| `evidence.PersonalRewardEntry` / `GroupRewardEntry` | دفترا المنح والعكس الإلحاقيان للحديقتين |

### institution (4) · coach (5) · task (7)
| `institution.Initiative` | الجذر ونقطة القفل للسعة؛ يحمل المسودة |
|---|---|
| `institution.InitiativeRevision` | الشروط المنشورة الثابتة التي قدّم عليها كل متقدم |
| `institution.InitiativeApplication` | الطلب ← العرض ← العضوية في صف واحد بحالاته الأربع عشرة |
| `institution.InitiativeApplicationDecision` | سجل القرارات الإلحاقي المتسلسل |
| `coach.CoachProgram` / `ProgramRevision` | البرنامج المستقل ونسخه المنشورة |
| `coach.OperationalGroup` | المجموعة بأب واحد (برنامج أو مبادرة، D19) |
| `coach.GroupMembership` | الدعوة والعضوية والتسكين والنقل |
| `coach.GroupCoachAssignment` | من يدرّب أي مجموعة ومتى (التسليم) |
| `task.Assignment` / `AssignmentRevision` / `AssignmentRecipient` | المهمة ونسخها ومستلموها بحالة لكل مستلم |
| `task.SubmissionAttempt` / `ReviewDecision` / `ReviewPrivateNote` | تاريخ الإرسال والمراجعة الثابت والملاحظة الداخلية المعزولة (D32، D33) |
| `task.OperationalReport` | تقارير المدرب والمشرف والمزوّد وسلسلة التضمين (Report inbox) |

### session (8) · provider (6)
| `session.Session` / `SessionRevision` / `SessionDuty` | الجلسة لأي مالك، نسخها، والمشرف المسؤول |
|---|---|
| `session.SessionRegistration` | التسجيل بالنمط وبيانات الدخول |
| `session.Attendance` / `AttendanceCorrection` | الحقيقة الفعلية وتصحيحاتها الإلحاقية |
| `session.AbsenceExcuse` | العذر ← التوصية ← القرار |
| `session.Completion` | إكمال المبادرة/البرنامج/المخيم بتصنيف واحد (D10) |
| `provider.Experience` / `ExperienceRevision` / `ExperienceBooking` | التجربة ونسخها والحجز مع الانتظار والعرض |
| `provider.ProviderCohort` / `ProviderCohortMember` | الأفواج وتقييد رؤية المشرف |
| `provider.ProviderIncident` | السلامة |

### forms (9) · community (6) · partnership (1) · governance (1) · ops (4) · files (1)
| `forms.Form` / `FormVersion` / `FormQuestion` / `FormQuestionOption` | النموذج ونسخته المختومة وأسئلته وخياراته (FK من الإجابات) |
|---|---|
| `forms.FormResponse` / `FormAnswer` | الرد المُعرَّف وإجاباته القابلة للعدّ |
| `forms.CompetitionCriterion` / `CompetitionJudgment` / `CompetitionCriterionScore` | معايير التحكيم والأحكام والدرجات |
| `community.Post` / `Comment` / `Reaction` / `Bookmark` | المجتمع العادي |
| `community.ContentReport` / `ModerationDecision` | البلاغ وقرارات الإشراف المتعددة الإلحاقية |
| `partnership.PartnershipLink` | ربط برنامج أو تجربة بمبادرة دون نقل ملكية |
| `governance.ContentRelease` | CMS بمسودة ونشر وتراجع |
| `ops.AuditEvent` / `Notification` / `OutboxMessage` / `IdempotencyRecord` | التدقيق، الإشعارات، البريد الموثوق، منع تكرار الأوامر |
| `files.SecureFile` | كل الملفات بحارس تنزيل مرتبط بالمورد |

**المجموع:** 5+4+1+5+4+6+6+4+4+5+7+8+6+9+6+1+1+4+1 = **87**.

---

## 3. دمجات Claude: ما بقي مبررًا وما سقط

### 3.1 الدمجات المقبولة (33 من 48)

| النوع | الدمجات | المبرر |
|---|---|---|
| **حقيقة واحدة بتمثيلين** (24) | `InitiativeMembership` + `InitiativeSeatOffer` → `InitiativeApplication`؛ `SeatOffer` → `ExperienceBooking`؛ `InitiativeStaffInvitation` + `ProviderStaffInvitation` + `ProviderStaffAppointment` → `StaffAppointment`؛ `ProgramGroupInvitation` + `InitiativeGroupPlacement` → `GroupMembership`؛ `Provider` → `Organization`؛ `ProviderMembership` → `OrganizationMember`؛ `CoachApproval` + `ProviderVerificationCase` → `VerificationCase`؛ `ExperienceSession` → `Session`؛ `ProviderAppointmentSession` → `SessionDuty`؛ `ProviderAttendance` → `Attendance`؛ `ProviderAttendanceCorrection` → `AttendanceCorrection`؛ `ProgramCompletion` + `CampCompletion` → `Completion`؛ `Competition` → `Form`؛ `CompetitionEntry` → `FormResponse`؛ `FormAnswerChoice` → `FormAnswer`؛ `ExperienceLink` → `PartnershipLink`؛ `SupervisorReport` → `OperationalReport`؛ `GovernanceAction` → `AuditEvent` | كل زوج كان يحتاج FK ثلاثيًا أو مشغّلًا ليبقي النسختين متسقتين؛ بعد الدمج تختفي إمكانية عدم الاتساق نفسها، وتبقى حدود الملكية بـCHECK على المالك + FK مركب |
| **إزالة بنية بلا بيانات خاصة** (6) | `PersonEmail` → `Person`؛ `RecoveryJourney` → `IndividualProfile`؛ `AssessmentInstrument` → `InstrumentVersion` (أربع أدوات ثابتة بـCHECK)؛ `InitiativeDraft` → `Initiative`؛ `GroupGarden` → `GroupRewardEntry`؛ `SessionCapacityPool` → `Session` | علاقات 1:1 أو مجموعات مغلقة لم يطلب أي قرار تعددها |
| **لقطة JSON ثابتة** (2) | `InitiativeContent` → `PublishedSnapshotJson`؛ `ProgramStage` → `StagesJson` | محتوى عرض ثابت داخل نسخة منشورة إلحاقية؛ لا FK وارد، لا تحديث مستقل، لا تقارير لكل مكوّن |
| **إلى السجلات** (1) | `DeliveryAttempt` → أعمدة آخر محاولة على `OutboxMessage` + سجلات منظمة | telemetry تشغيلي، لا حقيقة منتج |

### 3.2 الدمجات المرفوضة — Codex محق (15) + الإزالة الوحيدة

| دمج v3 المرفوض | لماذا يبقى الجدول |
|---|---|
| `PasswordCredential` → `Person` | الفصل يسمح بعزل الصلاحية على مستوى الجدول؛ 1:0..1 |
| `AssessmentWindow` → `AssessmentAttempt` | للنافذة دورة حياة (Missed) بلا محاولة |
| `AssessmentResponse` → JSON | الحفظ الجزئي، إعادة التصحيح، والتحليل لكل بند |
| `PracticeProgressionDecision` → أعمدة | يُفقد تاريخ المستويات المعروض |
| `ShieldSelectedDomain`، `BrowserUsageDomain` → JSON | FK مركب بين الموقع المختار واستخدامه؛ "By website" |
| `AttendanceCorrection` → `AuditEvent` | يحتاج FK حقيقيًا إلى الحضور وقيم قبل/بعد قابلة للاستعلام |
| `ProviderCohortMember` → عمود على الحجز | النقل بين الأفواج يحتاج تاريخًا |
| `FormQuestion`، `FormQuestionOption`، `CompetitionCriterion` → JSON | الإجابات والدرجات تشير إليها بـFK مركب؛ العدّ لكل خيار |
| `FormAnswer` → JSON | مجاميع لكل سؤال، تصدير، FK إلى الخيار |
| `CompetitionCriterionScore` → JSON | ترتيب محسوب من درجات مقيدة بالمعيار |
| `ModerationDecision` → أعمدة على البلاغ | قرارات متعددة لكل هدف (إخفاء ثم استعادة) ولا يُشترط بلاغ |
| `RewardPolicyVersion` → نص | السياسة المجمّدة يجب أن تكون صفًا ثابتًا مرجعيًا |
| **REMOVE** `IdempotencyRecord` | يحفظ `RequestHash` والرد الأصلي؛ الفهارس الطبيعية لا تكفي |

### 3.3 رفض Codex الذي لا يتبناه v4 (وسبب ذلك)

| موقف Codex | قرار v4 | السبب |
|---|---|---|
| الطلب والعضوية والعرض حقائق منفصلة | **دمج** | قرار المالك #5 (السعة عددية فقط)؛ العضوية 1:0..1 بلا هوية مستقلة؛ كل جدول تابع (التسكين، الإكمال) يشير الآن إلى `ApplicationId` بـFK حقيقي؛ والدمج **يسد ثغرة فعلية**: القاعدة الحية لا تملك حالة لعرض مرفوض أو منتهٍ رغم أن §16.1 وD27 يطلبانها |
| المؤسسة والمزوّد منفصلان | **دمج في `Organization(Kind)`** | التحقق والعضوية والإيقاف متطابقة؛ الفصل المطلوب (D40) محفوظ بـ`Kind` ثابت (مشغّل) وFK مركب `(Id, Kind)` من المبادرة والتجربة، فلا يمكن لمزوّد أن يملك مبادرة |
| `SessionCapacityPool` هدف FK | **دمج** | السعة لكل نمط عمودان على الجلسة والنسخة؛ `NEW-SESS-MODE-OFFERED` يثبت ما كان FK "المسبح" يحرسه |
| حضور المزوّد CONDITIONAL | **دمج** | بالشروط التي وضعها Codex نفسه: XOR مصدر (Registration أو Booking) بمفاتيح مركبة حقيقية، ومصدر المكافأة محفوظ (`EvidenceEventId`)؛ كلها مطبقة |
| `GroupGarden` هدف FK | **دمج** | المشهد لا يملك بيانات؛ مالكه المبادرة أو المجموعة، و`CK_GroupRewardEntry_Owner` يفرض مالكًا واحدًا (D13) |
| `FormAnswerChoice` | **دمج** | صف `FormAnswer` لكل خيار مع FK مركب إلى `FormQuestionOption`؛ نفس الضمان بجدول أقل |
| `DeliveryAttempt` | **إلى السجلات** | لا شاشة منتج تعرض المحاولات؛ الحالة النهائية والأخيرة على الرسالة (`NEW-OPS-OUTBOX-DELIVERY`) |
| `ProgramStage` CONDITIONAL | **دمج** | الشرط الذي وضعه Codex متحقق: المراحل محتوى ثابت داخل نسخة منشورة إلحاقية |

---

## 4. سياسة JSON — ما يُفقد وكيف يُعوَّض

28 عمود JSON، كلها عليها `ISJSON() = 1`. لا يُستخدم JSON لأي بيانات تحتاج FK أو هوية أو تفردًا أو تحديثًا متعدد المستخدمين.

| الفئة | الأعمدة | ما يُفقد | التعويض |
|---|---|---|---|
| مسودات محرر واحد | `Initiative/CoachProgram/Experience/Form.DraftJson` | تحقق SQL للحقول الجزئية | DTO مرقم، RowVersion، والتحقق الكامل عند النشر حيث تُكتب أعمدة حقيقية |
| لقطات نشر ثابتة | `InitiativeRevision/ExperienceRevision.PublishedSnapshotJson`، `ProgramRevision.StagesJson`، `PlanRevision.PlanJson`، `Completion.BasisJson`، `OperationalReport.MetricsSnapshotJson` | CHECK الترتيب/التواريخ داخل اللقطة | تحقق C# عند النشر (`NEW-INIT-SNAPSHOT-VALIDATION`، `NEW-PROG-STAGES-VALIDATION`)؛ الصف إلحاقي فلا يتغير بعد التحقق؛ **كل ما يفرض قيدًا** (السعة، التواريخ، الحد، السعر) عمود حقيقي |
| محتوى وقواعد مُرقَّمة | `InstrumentVersion/PracticeVersion.ContentJson`، `PracticeVersion/RewardPolicyVersion.RulesJson`، `ContentRelease.PayloadJson`، `FormQuestion.ValidationJson`، `FormVersion.EntryPolicyJson` | لا شيء علائقي | نسخة ثابتة يحددها `VersionNo` |
| إعدادات المالك الواحد | `IndividualProfile.SetupAnswersJson/PreferencesJson`، `Organization.ProfileJson/SettingsJson`، `OfflineRoutine.ScheduleRuleJson`، `VerificationCase.ClaimJson`، `PartnershipLink.DataSharingScopeJson`، `AssessmentWindow.OfferedInstrumentsJson`، `ProtectionSession.DomainCodesJson` | الاستعلام عبر الأشخاص | لا متطلب لذلك؛ ما يُستعلم عنه (`GoalCode`، `ScopeVersion`) مستخرج كعمود |
| حمولات تشغيلية | `AuditEvent.DetailJson`، `OutboxMessage.PayloadJson` | — | ليست مصدر حقيقة منتج |

---

## 5. الميزات المؤجلة (9 جداول، DEFER)

| الميزة | الجداول | السبب | عند الاعتماد |
|---|---|---|---|
| Commercial (الخطط، الاشتراكات، الحصص) | `PlanVersion`، `PlanFeature`، `Subscription`، `EntitlementAllocation`، `UsageLedger` | §20 و§26.2 #7: لا أسعار/حصص/دفع موقّعة؛ Pricing نموذج عرض | وحدة `commercial` مستقلة؛ لا تغيّر الجداول الـ87 |
| Community Challenge / Joint Goals | `JointGoal`، `JointGoalMember`، `JointGoalCheckIn` | **استبعاد بقرار المالك** قيد إعادة النظر | وحدة مستقلة إن أُعيدت |
| جلسة مستقلة خارج مبادرة | `StandaloneSessionSupervisorAppointment` | ليست مسار تشغيل معتمد | صفر جداول: نطاق ثالث في `StaffAppointment` و`Session` |

البيانات الحالية لهذه الجداول تبقى في `DeepSprout_Validation` دون حذف.

---

## 6. قرارات المنتج المتبقية (فقط ما يراه المستخدم)

| # | السؤال | الوضع الحالي | الافتراض في v4 | أثره على المخطط |
|---|---|---|---|---|
| 1 | **إعادة الانضمام إلى المبادرة نفسها بعد عضوية منتهية** (Withdrawn / Removed / Completed) — قرار المالك #10 "لم يُعتمد بعد" | الواجهة تسمح بالتقديم بعد Withdrawn/Removed وتمنعه بعد Completed | **ممنوع** (قبول واحد لكل شخص في كل مبادرة) — الأكثر تحفظًا | فهرس مفلتر واحد يتغير؛ لا جداول |
| 2 | **مشهد الحديقة الشخصية**: أربع أشجار (قرار #12، D07، الواجهة الحالية) أم نبتة رئيسية واحدة (`AGENTS.md`) | تعارض موثق في `current-product-guide.md` | البيانات محايدة للرسم: نمو لكل نوع ممارسة + زينات محدودة | **صفر** — قرار تصميم مرئي فقط |

**مسائل سياسة لا تغيّر البنية** (تُضبط كقيم سياسة أو نسخة، ويمكن حسمها لاحقًا): طول نافذة Lab ومعالجة الفائتة (§26.2 #1)؛ عتبات النمو وحدود الزينات (#2)؛ مدة الدورة (#3)؛ ترتيب الانتظار وحد الإلغاء ومدة العرض (24 ساعة مؤقتًا) (#5)؛ أثر العذر المقبول على الإكمال (#6)؛ استئناف المسابقات (#8).

---

## 7. استراتيجية التنفيذ

1. **اعتماد التصميم** (هذا التقرير + قرار المسألة #1 أو قبول الافتراض المحافظ).
2. **فرع جديد** `db/v4` ومشروع Infrastructure بسلسلة ترحيلات جديدة تبدأ بـ`V4_Initial`. ترحيلات الـ129 لا تُمس.
3. **ترتيب البناء حسب الاعتماديات:** iam → org → personal/lab/activity/recovery/shield → evidence → institution → coach → task → session → provider → forms → community/partnership/governance/ops/files. كل وحدة: Entities → Configurations → ترحيل → سكربتات SQL للحراس → اختبارات الوحدة (CARRY/REWRITE من 05a) قبل الانتقال.
4. **قاعدة جديدة** `DeepSprout_V4_Validation`؛ تشغيل L0–L8 من [05-validation-plan-ar.md](05-validation-plan-ar.md).
5. **ETL اختياري** من الـ129 لإثبات قابلية التحويل.
6. **بعد البوابة:** v4 خط الأساس؛ أرشفة قاعدة الـ129 (لا حذف)؛ بدء API بطبقات Onion (Domain / Application / Infrastructure / API) وDTOs واختبارات HTTP (L9).

**ملاحظة اتساق:** `docs/current-product-guide.md` يذكر "ASP.NET Core MVC" اتجاهًا للخادم، بينما طلب هذه المراجعة يحدد ASP.NET Core API بمعمارية Onion. القرار لا يؤثر على قاعدة البيانات، لكن يستحسن توحيد الوثائق قبل بدء الخادم.

## 8. المخاطر

| الخطر | الاحتمال | التخفيف |
|---|---|---|
| حراس كثيرة في مشغّلات/إجراءات SQL (منطق خارج EF) | متوسط | ملفات SQL مرقمة في الترحيلات، اختبار لكل حارس، وثيقة في القاموس لكل واحد |
| JSON يتسرب لاحقًا إلى بيانات علائقية | منخفض | قاعدة §4 في مراجعة الكود؛ لا JSON جديد دون تبرير مكتوب |
| إعادة كتابة 101 فحصًا (REWRITE) | متوسط (جهد) | التتبع في 05a يحدد الهدف الجديد لكل فحص؛ مولّد اختبارات FK/CHECK آلي من `schema.json` |
| دمج الطلب/العضوية يجعل `InitiativeApplication` جدولًا مركزيًا كثير الحالات | متوسط | مشغّل انتقالات صريح + مصفوفة اختبار كاملة (§5 من خطة التحقق) + قفل صف المبادرة الواحد |
| قرار المالك #10 يأتي متأخرًا | منخفض | التغيير فهرس واحد وترحيل صغير |
| الكود الحالي في `Server/` مكتوب لـ129 جدولًا | مؤكد | يُبنى v4 في فرع منفصل؛ لا refactor للكود الحالي في هذه المرحلة |

## 9. الخلاصة

**اعتمدوا 87 جدولًا.** هذا أبسط مخطط صحيح يغطي النطاق المعتمد كاملًا كما تعرضه الواجهة الحالية: يزيل كل تمثيل مكرر لحقيقة واحدة (33 دمجًا)، يحتفظ بكل جدول يحمل FK أو تفردًا أو تاريخًا أو تحليلًا مستقلًا (رافضًا 15 دمجًا من مقترحي السابق)، يؤجل 9 جداول لميزات غير معتمدة، ويسد ثغرة حالة العرض المرفوض/المنتهي في القاعدة الحالية. المسألة الوحيدة التي تحتاج قرارك قبل البناء هي إعادة الانضمام إلى المبادرة نفسها (§6 #1)، ولها افتراض محافظ آمن إن أردت البدء الآن.
