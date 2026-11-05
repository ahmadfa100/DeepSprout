# DeepSprout v4 — خريطة المنتج ومسارات العمل (المخرج A)

> **ملف مكتوب يدويًا** (ليس مولّدًا). يربط كل صفحة ومسار فعلي في `Client/` بالجداول النهائية الـ87 في [02-data-dictionary-ar.md](02-data-dictionary-ar.md). تاريخ المراجعة: 3 نوفمبر 2026.

## 0. المنهج وترتيب المصادر

عند التعارض اعتُمد الأحدث والأكثر صراحة بهذا الترتيب:

1. **تعليمات المالك الصريحة الأحدث**: طلب هذه المراجعة (استبعاد Community Challenge / Joint Goals)، و[سجل قرارات المالك الـ13](../../../../tests/database/test-gate-source/05-owner-decisions-handoff.md) (1 نوفمبر).
2. **سلوك الواجهة الحالي المؤكد** في `Client/src` (الأوامر `commands/*.js`، القواعد `initiative-rules.js`، `domain.js`، والصفحات)، كما يجرده [current-product-guide.md](../../../current-product-guide.md) (3 نوفمبر).
3. **سجل القرارات D01–D48** في `DeepSprout.md` §26.
4. بقية `DeepSprout.md` و`DESIGN.md`.
5. قاعدة Codex الحية (`../review/live-schema.json`) وتدقيق v3: **مصدر للأدلة، لا مرجع للصحة**.

**ما لا يُعتبر متطلبًا للتخزين:** بيانات العرض المزروعة (sample listings في Explore، `demo-account.json`)، الساعة التجريبية، مبدّل الهوية التجريبي، إعادة الضبط المحلية، QR/البريد المحاكى، صفحات العرض التقديمي (`demo.html`، `hero-lab*.html`)، ومسارات Admin القديمة المكررة (`Client/admin.html`) إلا حيث تضيف قدرة فريدة (D14).

### مفتاح الأعمدة في الجداول التالية

| العمود | المعنى |
|---|---|
| **يُعرض** | ما تقرؤه الشاشة |
| **يُدخل → يُحفظ** | ما يكتبه المستخدم والجدول الذي يستقبله |
| **يُحسب** | قيمة مشتقة لا تُخزَّن (أو تُخزَّن كلقطة ثابتة لسبب مذكور) |
| **مؤقت (UI فقط)** | حالة واجهة لا تصل إلى قاعدة البيانات |
| **الصلاحية** | الفاعل الموثوق المأخوذ من الجلسة الموثقة، لا من `ActorPersonId` يرسله العميل |

---

## 1. الهوية، التسجيل، الدخول، الأدوار

**الصفحات:** `register.html`، `login.html`، `partners.html`، `workspaces.html#/auth/register|login|verify|application|application-status|workspaces|staff-invitation|appointment|institution-invitation`، `join.html`.

| الخطوة | يُعرض | يُدخل → يُحفظ | يُحسب | مؤقت | الصلاحية |
|---|---|---|---|---|---|
| تسجيل فردي | نموذج الاسم/البريد/كلمة المرور | `iam.Person` + `iam.PasswordCredential` + `iam.OtpChallenge(Purpose=EmailVerify)` + `iam.ConsentRecord` (الخصوصية) | قوة كلمة المرور | خطوة النموذج | مجهول؛ حد معدل على OTP |
| توثيق البريد | إدخال الرمز | `OtpChallenge` → Consumed؛ `Person.EmailVerifiedAtUtc` | المحاولات المتبقية | — | صاحب التحدي |
| دخول موحد | — | `PasswordCredential.FailedAttemptCount/LockedUntilUtc` | المساحات المتاحة | الجلسة (cookie/token خارج القاعدة) | — |
| Workspace Switcher (`#/auth/workspaces`) | المساحات المتاحة | لا شيء | **يُحسب بالكامل** من `org.OrganizationMember` النشط + `org.StaffAppointment` Active + `coach.GroupMembership` Active + `iam.GlobalGrant` + `Person.IndividualEnabledAtUtc` | المساحة المختارة | التبديل يغيّر العرض ولا يمنح دورًا |
| طلب شريك (Coach/Institution/Provider) | نموذج الجهة والإثبات | `org.Organization(Status=Applied)` (للمؤسسة/المزوّد) + `org.VerificationCase` + `files.SecureFile(Purpose=VerificationProof)`؛ المدرب المستقل: `VerificationCase(Kind=Coach)` بلا منظمة | — | — | صاحب الهوية |
| حالة الطلب | Submitted/MoreInfo/Approved/Rejected | رد MoreInfo يعيد الحالة إلى Submitted | — | — | المتقدم نفسه |

**النتيجة النهائية:** شخص واحد (`iam.Person`) مهما تعددت أدواره (D45، قرار المالك #3). **التزامن:** تسجيلان متزامنان بالبريد نفسه يصطدمان بفهرس `UQ(NormalizedEmail) WHERE NOT NULL`؛ الثاني يتلقى "البريد مستخدم". **الأثر عبر المساحات:** الموافقة على `VerificationCase` تُنشئ `OrganizationMember` تلقائيًا في المعاملة نفسها، فيظهر المسار في Switcher فورًا.

**ليس تخزينًا:** تسجيل الدخول الاجتماعي غير موجود في الواجهة؛ لا جدول له. الجلسات/tokens تُدار بآلية ASP.NET Core وليست جدول منتج (إن احتجنا جلسات قابلة للإبطال لاحقًا فهي بنية أمان، لا كيان منتج).

---

## 2. المساحة الشخصية والملف الشخصي

**الصفحات:** `Client/index.html` (Home الواعية بالعضو)، `profile/profile.html`.

| الخطوة | يُعرض | يُدخل → يُحفظ | يُحسب | مؤقت |
|---|---|---|---|---|
| Home | إجراء الأسبوع، الرحلة، معاينة الحديقة، معاينة المجتمع، فرص المزوّدين | لا شيء | **كله مشتق**: `ScheduledAction` التالي، `PersonalRewardEntry` الأخيرة، `community.Post` الأحدث، `provider.Experience` المنشورة | بطاقات مطوية |
| Profile: الاسم | — | `Person.DisplayName` | — | — |
| Profile: إجابات الإعداد | ملخص | `IndividualProfile.SetupAnswersJson` + `SetupAnswersVersion` | — | — |
| Profile: تفضيلات التذكير والمنطقة الزمنية | — | `IndividualProfile.PreferencesJson`، `PreferredTimeZone` | — | — |
| Profile: "عرض البيانات المخزنة" | ملخص | لا شيء (تصدير يُولَّد عند الطلب) | — | — |
| Profile: تغيير البريد | — | `OtpChallenge(Purpose=EmailChange)` ثم `Person.NormalizedEmail` + `ops.AuditEvent` | — | — |
| Profile: "Plus plan" | مقارنة | **لا شيء** — commercial مؤجل | — | — |
| Profile: "Local reset" | — | **لا يوجد مكافئ خادم**؛ أداة عرض فقط | — | — |

**قرار JSON:** `SetupAnswersJson` و`PreferencesJson` لقطة إعدادات يملكها شخص واحد، لا يُستعلم عنها عبر الأشخاص، ولا تحتاج FK. **ما يُفقد:** التحقق بالمخطط على مستوى SQL؛ **التعويض:** `ISJSON` CHECK + عقد DTO مُرقَّم بـ`SetupAnswersVersion`. الهدف (`GoalCode`) استُخرج كعمود لأنه يدخل في التقارير.

---

## 3. Bimo والـOnboarding والاختبارات الأربعة الأولى

**الصفحات:** `onboarding/onboarding.html` (Meet Bimo → Before We Begin → Quick Personal Setup)، `lab/assessment.html` × 4، `onboarding/starting-point.html`.

| الخطوة | يُعرض | يُدخل → يُحفظ | يُحسب | مؤقت |
|---|---|---|---|---|
| Meet Bimo / Before We Begin | نصوص Bimo (من `governance.ContentRelease`) | `IndividualProfile.OnboardingStage` يتقدم Started → Introduced | — | الرسوم المتحركة |
| Quick Personal Setup | أسئلة الهدف والسياق | `SetupAnswersJson`، `GoalCode`، Stage=Setup | — | — |
| الاختبارات الأربعة (Digital Habits، Sustained Attention، Inhibitory Control، Depth Challenge) | المشغّل | `lab.AssessmentAttempt(Kind=Baseline)` + `lab.AssessmentResponse` لكل بند (حفظ جزئي) | التقدم داخل الاختبار | المؤقت المرئي، البند المعروض |
| Pause/Resume | — | `AssessmentAttempt.Status` Started ↔ Paused | الوقت النشط | — |
| الإرسال | — | Submitted → Valid/Invalid + `lab.AssessmentScore` (إلحاقي، مرتبط بـ`InstrumentVersion.ScoringVersion`) | الصلاحية من قواعد الأداة | — |
| Starting Point | النتائج الأربع، "ليس تشخيصًا" | Stage=Results ثم Preview | **النتائج تُقرأ من AssessmentScore؛ لا تُنسخ** | — |
| معاينة الخطة | الخطة المقترحة | `recovery.RecoveryCycle(Status=Preview)` + `recovery.PlanRevision(Status=Draft, ChangeKind=Initial)` | المحرك يولّد PlanJson | — |
| الالتزام الأول بالروتين | اقتراحات | `activity.OfflineRoutine(IsInitialCommitment=1)` | — | — |
| Activate | — | Cycle → Active، PlanRevision → Accepted، تُولَّد `recovery.ScheduledAction` للأسبوع، `IndividualProfile.JourneyStartedAtUtc` (مرة واحدة) | — | — |
| الجولة القصيرة | — | Stage=TourDone (قابلة للتخطي) | — | — |

**الثوابت:** أربعة baseline صالحة قبل التفعيل (D04): يفرضها أمر التفعيل بعدّ `AssessmentAttempt(Kind=Baseline, Status=Valid)` لكل أداة، و`UQ(PersonId, InstrumentCode) WHERE Kind='Baseline' AND Status='Valid'` يمنع baseline صالحين لأداة واحدة. **الاستئناف الدقيق:** `OnboardingStage` + `LastAssessmentAttemptId` يعيدان المستخدم إلى المكان الصحيح بعد انقطاع (كان هذا تمامًا ما حدث لجلستنا). **التزامن:** نقرتا Activate → `RowVersion` على Cycle + `ops.IdempotencyRecord`. **AI:** لا يولّد النتائج ولا الخطة (قرار المالك #13)؛ المحرك قواعدي ومُرقَّم بـ`PolicyVersion`.

---

## 4. Lab: المحاولات والنتائج وإعادة التقييم والمقارنة

**الصفحات:** `lab/lab.html`، `lab/assessment.html`، تبويب Assessments في Insights، محرر Assessments في Admin.

| الخطوة | يُعرض | يُدخل → يُحفظ | يُحسب | مؤقت |
|---|---|---|---|---|
| قائمة الاختبارات وتاريخها | المحاولات، رسمي/تدريبي، الصلاحية | — | آخر نتيجة صالحة لكل أداة | الفلتر |
| نافذة إعادة التقييم الأسبوعية | "Digital Habits + اختبار متناوب كل سبعة أيام"، "Reassessment unavailable" | `lab.AssessmentWindow` (Open → Used/Closed/Missed) | الأداة المتناوبة التالية | — |
| محاولة رسمية | — | `AssessmentAttempt(Kind=Official, WindowId)` (CHECK: Official ⇔ WindowId غير فارغ) | — | — |
| محاولة تدريبية | — | `AssessmentAttempt(Kind=Practice)`؛ لا تدخل المقارنات | — | — |
| المقارنة | الفرق بين محاولتين | — | **يُحسب** فقط بين محاولات بنفس `ScoringVersion` أو بجدول توافق؛ غير المتوافق يُعرض "غير قابل للمقارنة" لا صفرًا | — |
| Admin: تحرير أداة | مسودة | `lab.InstrumentVersion(Status=Draft)` → Published → Retired | — | — |
| إعادة التصحيح بنسخة scoring جديدة | — | صف `AssessmentScore` جديد (إلحاقي) مرتبط بالنسخة الجديدة؛ القديم يبقى | — | — |

**الثوابت:** نسخة منشورة لا تتغير (مشغّل)؛ محاولة رسمية صالحة واحدة لكل نافذة ولكل أداة (`UQ(WindowId, InstrumentCode) WHERE Kind='Official' AND Status='Valid'`)؛ نافذة واحدة لكل مفتاح أسبوع (`UQ(PersonId, WindowKey)`)؛ البنود لا تُكتب بعد إغلاق المحاولة (مشغّل)؛ `AssessmentResponse` مملوكة لمحاولتها بـFK مركب لا يسمح بخلط محاولات أشخاص. **مسألة مفتوحة (§26.2 #1):** طول النافذة، التعامل مع النافذة الفائتة، وقابلية المقارنة — مُعبَّر عنها كأعمدة/نسخ سياسة، فلا تغيّر الجداول.

---

## 5. Recovery Plan: الخارطة، الدورات، الخطط الأسبوعية، التعديل، التاريخ

**الصفحات:** `recovery-plan/recovery-plan.html` (Overview / This Week / Adjust / History)، `weekly-review/weekly-review.html`.

| الخطوة | يُعرض | يُدخل → يُحفظ | يُحسب | مؤقت |
|---|---|---|---|---|
| Overview | الإجراء الحالي، اتجاه 4 أسابيع، الروتين، أدوات الدعم | — | من `PlanRevision(Accepted).PlanJson` + `ScheduledAction` | — |
| This Week | إجراءات الأسبوع وحالتها | Start Next Activity → `activity.PracticeAttempt` يُربط بـ`ScheduledAction.CompletedAttemptId` | النسبة المكتملة | — |
| Reschedule إجراء | — | الأصل → Rescheduled + صف `ScheduledAction` جديد (`RescheduledToActionId`) | — | — |
| Adjust (مستقبلي فقط) | معاينة التغيير | `PlanRevision(Status=Draft, ChangeKind=Preference/Schedule/Load/Goal)` → Accepted؛ القديمة → Superseded؛ إعادة توليد الإجراءات **المستقبلية فقط** | — | المعاينة قبل الحفظ |
| Weekly Review | ما سُجِّل، سؤال الملاءمة/القدرة، معاينة الأسبوع القادم | `recovery.WeeklyReview` (إلحاقي) + ربما `PlanRevision(ChangeKind=WeeklyReview)` (`ResultingRevisionId`)؛ `ReportedPhoneMinutesPerDay` ذاتي موسوم | — | — |
| مراجعة فائتة | — | `WeeklyReview(DecisionCode=AutoContinued)` | — | — |
| نهاية الدورة | ملخص الدورة | Cycle → Ended → Reviewed + `NextStepCode` (دورة تالية/نهج معدل/صيانة) | — | — |
| History | heatmap، "Plan adjusted" | — | من ScheduledAction + PlanRevision | — |

**الثوابت:** دورة مفتوحة واحدة لكل شخص (`UQ(PersonId) WHERE Status IN ('Draft','Preview','Active','ReviewDue','Paused')`)؛ محاولة واحدة لا تُكمل إجراءين (`UQ(CompletedAttemptId)`)؛ مسودة واحدة ونسخة مقبولة واحدة لكل دورة؛ النسخة المقبولة لا تتغير إلا إلى Superseded (مشغّل)؛ لا يعدَّل إجراء مكتمل أو ماضٍ؛ مراجعة واحدة لكل أسبوع (`UQ(CycleId, WeekNo)`). **قرار JSON:** `PlanJson` لقطة ثابتة لمحتوى الخطة المعروض؛ **ما يُنفَّذ ويُقاس** (الإجراءات اليومية) علائقي في `ScheduledAction` لأنه يحتاج FK إلى `PracticeVersion`/`OfflineRoutine` وحالة مستقلة وتقارير. **مسألة مفتوحة:** مدة الدورة الافتراضية (28 يومًا اتجاه قوي، §26.2 #3) = قيمة سياسة، لا بنية.

---

## 6. الأنشطة، الممارسات، التدرج، الروتين غير المتصل

**الصفحات:** `training/training.html` (For You، Browse Practices، History، Assigned، My Offline Routine)، مشغلات الممارسات الأربع، `offline-routine.js`، كتالوج Admin.

| الخطوة | يُعرض | يُدخل → يُحفظ | يُحسب | مؤقت |
|---|---|---|---|---|
| Browse Practices | الكتالوج | — | من `activity.PracticeDefinition` + آخر `PracticeVersion` منشورة | البحث/الفلتر |
| تشغيل ممارسة (Depth / Listening & Recall / Practical Micro-Challenge / Protected Work) | المشغّل | `activity.PracticeAttempt(Source=Plan/OnDemand/Assignment)` Started ↔ Paused → Submitted → Completed/Invalid؛ `ScoreValue` | — | المؤقت المعروض ("المؤقت وحده لا يعتمد العمل") |
| Protected Work مع Shield | — | `PracticeAttempt` + اختياريًا `shield.ProtectionSession` | — | — |
| التدرج | "Level up/down" | `activity.PracticeProgressionDecision` (إلحاقي، FromTier→ToTier) | **المستوى الحالي = آخر قرار لهذا النوع** | — |
| History | المحاولات | — | — | — |
| Assigned | مهام المدرب (للفرد الكامل) | انظر §14 | — | — |
| My Offline Routine | الروتين | `activity.OfflineRoutine` (Active ↔ Paused → Archived) | — | ترتيب العرض |
| Done/Skipped اليوم | — | `activity.RoutineCheckIn` (`UQ(RoutineId, LocalDate)`) | السلسلة | — |
| Admin: كتالوج | — | `PracticeDefinition` + `PracticeVersion` جديدة لكل تغيير | — | — |

**الإكمال والمكافأة:** `PracticeAttempt` Completed → `evidence.EvidenceEvent(SourceContext=PracticeAttempt)` → `PersonalRewardEntry` لشجرة نوع الممارسة. **التصحيح:** تبديل Done↔Skipped مسموح لليوم نفسه قبل استهلاك الدليل؛ بعده عبر `EvidenceEvent(InvalidatesEventId)` و`PersonalRewardEntry(EntryKind=Reversal)`. **"Offline to-do" قابل للتحرير** في Activities = عناصر `OfflineRoutine` نفسها، لا جدول to-do مستقل.

---

## 7. الحديقة الشخصية

**الصفحات:** `garden/garden.html`، معاينة Home.

| الخطوة | يُعرض | يُدخل → يُحفظ | يُحسب |
|---|---|---|---|
| المشهد | أربع أشجار (Depth، Listening & Recall، Practical Micro-Challenge، Protected Work) + زهرة/أرنب/بيت طائر محدودة | **لا إدخال من المستخدم** (D11: لا زر "grow") | نمو كل شجرة = Σ`Units` في `PersonalRewardEntry` لكل `PracticeType` بعد طرح Reversal، مقارنة بعتبات `RewardPolicyVersion` |
| "Recent qualifying sources" | آخر المصادر | — | من `PersonalRewardEntry` ⨝ `EvidenceEvent` |
| "Next eligible milestone" | — | — | من السياسة السارية |
| No-data | محايد | — | لا تدهور عقابي (D06) |

**المصادر المؤهلة:** ممارسة مكتملة → شجرة نوعها؛ `RoutineCheckIn` Done مؤهل → زهرة (محدودة)؛ `session.Attendance` Present/Late في جلسة مؤهلة → أرنب؛ `session.Completion(Kind=Camp)` Completed → بيت طائر. **لا مكافأة شخصية** لإكمال مبادرة أو برنامج مدرب (D10)، ولا لمنشور المجتمع.

**الضمانات:** `UQ(EvidenceEventId, EffectCode) WHERE EntryKind='Grant'` (EffectCode ∈ PracticeGrowth، RoutineDecoration، AttendanceDecoration، CampDecoration) يمنع المكافأة المزدوجة لنفس الدليل؛ `UQ(ReversesEntryId)` يمنع العكس المزدوج؛ `PolicyVersionId` يجمّد قاعدة القرار وقت المنح. **تعارض التصميم:** قرار المالك #12 وD07 (أربع أشجار، الواجهة الحالية) مقابل `AGENTS.md` ("نبتة رئيسية واحدة"). **أثره على القاعدة: صفر** — الجداول تحفظ `EffectCode` و`PracticeType` و`Units`، والمشهد يُرسم من السياسة. انظر قرارات المالك المتبقية في التقرير النهائي.

---

## 8. الحديقة الجماعية

**الصفحات:** `#/student/garden`، `#/mentor/group-garden`، Group Garden للمبادرة (مسار المؤسسة القديم `group-garden` مخفي حاليًا).

| الخطوة | يُعرض | يُحفظ | يُحسب | الصلاحية |
|---|---|---|---|---|
| المشهد الجماعي | معالم جماعية بمصادرها | `evidence.GroupRewardEntry` لكل مساهمة مؤهلة (`ContributorPersonId`, `InitiativeId` **أو** `GroupId`+`ProgramId`) | التقدم الجماعي = Σ Units | العضو النشط في المجموعة/المبادرة؛ الطالب المدعو يرى هذا فقط قبل الترقية (D12) |

**الملكية (D13):** حديقة واحدة لكل مبادرة مؤسسية (عبر كل مجموعاتها الداخلية)، وحديقة لكل مجموعة مدرب مستقل، ولا حديقة للمزوّد. CHECK في `GroupRewardEntry`: إما `InitiativeId` وإما (`GroupId`,`ProgramId`) — ليس الاثنين. **دمج Codex `GroupGarden` في `GroupRewardEntry`:** الحديقة الجماعية لا تملك بيانات خاصة بها غير هوية مالكها؛ مالكها هو المبادرة أو المجموعة نفسها، فجدول "حديقة" كان صفًا 1:1 بلا أعمدة مستقلة.

**المصادر:** موافقة مدرب على مهمة (`task.ReviewDecision` Approved)، حضور جلسة مبادرة، إكمال مبادرة (معلم جماعي، D10). **الخصوصية:** المشهد الجماعي يعرض مجاميع، لا تفاصيل نتائج Lab أو Shield لأي عضو.

---

## 9. Insights ومصادر البيانات المصرح بها

**الصفحات:** `insights/insights.html` (Overview، Digital Habits، Plan & Practice، Assessments، Offline Life، Next Steps).

| التبويب | المصدر (كله **محسوب**، لا جداول Insights) | قاعدة الأمانة |
|---|---|---|
| Digital Habits | `shield.BrowserUsagePeriod` + `BrowserUsageDomain` (7/14/28 يومًا)، `ShieldConfiguration` (الحد)، `WeeklyReview.ReportedPhoneMinutesPerDay` (موسوم "ذاتي") | لا بيانات ⇒ "No browser usage data available"، لا صفر؛ التغطية تُعرض |
| Plan & Practice | `ScheduledAction`، `PracticeAttempt`، `PracticeProgressionDecision` | المعدل على المجدول فقط |
| Assessments | `AssessmentScore` | لا مقارنة بين نسخ scoring غير متوافقة |
| Offline Life | `RoutineCheckIn`، `session.Attendance`، `session.Completion` | المشاركة الواقعية لا تُصنَّع تحسنًا في Lab/Shield (D46) |
| Next Steps | قواعد ثابتة | AI (إن وُجد) ملخِّص فقط، غير مخزن كمصدر حقيقة (قرار #13) |

**لا جدول Insights مستقل** لأن كل رقم يُعاد حسابه من سجلات المصدر بشاراتها. إن احتاج الأداء لاحقًا إلى تجميعات، فهي views مفهرسة أو cache قابلة لإعادة البناء، لا جداول حقيقة.

---

## 10. Digital Shield وامتداد المتصفح

**الصفحات:** `shield/shield.html` (Website Protection، Usage Reminder)، `Client/extensions/digital-shield/*`.

| الخطوة | يُعرض | يُدخل → يُحفظ | يُحسب | مؤقت |
|---|---|---|---|---|
| حالات الامتداد | Not Installed / Connected / Disconnected / Sync Pending | الاقتران الصريح → `shield.ExtensionInstallation` (+ `iam.ConsentRecord` للقياس) | "Sync Pending" = آخر دفعة أقدم من حد | — |
| Start Protection | العد التنازلي | `shield.ProtectionSession` Requested → Active → Expired؛ Failed/Disconnected/Cancelled | الوقت المتبقي | العداد المرئي |
| Usage Reminder | الحد، المواقع المختارة (قائمة واحدة مشتركة) | `shield.ShieldConfiguration` (نسخة جديدة لكل تغيير) + `shield.ShieldSelectedDomain` | — | — |
| مزامنة الاستخدام | — | `shield.BrowserUsagePeriod` (دفعة بـ`SequenceNo` فريد لكل تثبيت) + `BrowserUsageDomain` | — | — |

**الثوابت:** إعادة إرسال دفعة تُرفض بـ`UQ(InstallationId, SequenceNo)`؛ التصحيح دفعة جديدة لا تعديل؛ جلسة حماية مفتوحة واحدة لكل تثبيت (`UQ(InstallationId) WHERE Status IN ('Requested','Active')`)؛ الفترة وصفوف مواقعها تُدرج ذريًا ويجب أن يساوي مجموعها `ObservedSeconds`؛ يُخزَّن **نطاق الموقع ضمن العائلات المدعومة فقط**، لا تاريخ تصفح كامل (§6.4). **قرار JSON:** `ProtectionSession.DomainCodesJson` لقطة ثابتة لما طُلب حجبه في تلك الجلسة؛ لا يحتاج FK لأن رموز العائلات ثابتة الكود. **المحدودية:** الموقع وحده لا يفرض الحجب؛ الامتداد هو الفاعل، والخادم يستقبل الحقائق فقط. لا تحكم بتطبيقات الهاتف.


---

## 11. Explore والفرص

**الصفحات:** `explore/explore.html` (Initiatives، Sessions، Experiences، Competitions)، `#/participant/discover` و`#/participant/*`.

| الخطوة | يُعرض | يُدخل → يُحفظ | يُحسب | مؤقت |
|---|---|---|---|---|
| القوائم | المبادرات والتجارب والجلسات والمسابقات المنشورة | — | `Initiative.Status IN (Published, RegistrationClosed)` + `CurrentRevisionId`؛ `provider.Experience` Published؛ `session.Session` Published؛ `forms.Form(Kind=Competition)` Published | الفلاتر، البحث |
| التفاصيل | المحتوى، الشروط، السعة المتبقية، حالة المستخدم | — | السعة المتبقية = سعة النسخة − عدّ (Offered, Accepted, Suspended)؛ حالة المستخدم من طلبه/حجزه | — |
| Apply / Book / Register / Enter | — | انظر §13، §16، §17، §18 | — | — |
| المكوّن المرتبط (شراكة) | "يديره المزوّد/المدرب" | — | `partnership.PartnershipLink` Accepted | — |

**ليس تخزينًا:** "sample listings" الموسومة في Explore بيانات عرض تُزرع فقط في بيئة التطوير. **الصلاحية:** القوائم عامة؛ حالة "طلبي" تُقرأ فقط للفاعل الموثوق. **مساحة Partner Participant** عرض تشغيلي إضافي لنفس السجلات، لا يُنشئ كيانات جديدة.

---

## 12. المؤسسة و Initiative Builder

**الصفحات:** `#/organization/dashboard`، `#/organization/initiatives`، `/new`، `/:id`، `/:id/edit`، `#/organization/settings`، `#/admin/initiatives`.

| الخطوة | يُعرض | يُدخل → يُحفظ | يُحسب | مؤقت |
|---|---|---|---|---|
| Builder (6 مراحل) Save Draft | الحقول | `institution.Initiative.DraftJson` + `DraftLastSavedStage` + `DraftUpdatedByPersonId/AtUtc`؛ `RowVersion` يمنع الكتابة فوق محرر آخر | اكتمال كل مرحلة | المرحلة المفتوحة |
| Preview | المعاينة | — | من DraftJson | — |
| Publish | — | `institution.InitiativeRevision` (RevisionNo=1، أعمدة الشروط المقيدة + `PublishedSnapshotJson`)، `CurrentRevisionId`، إفراغ المسودة — **في معاملة واحدة** | — | — |
| Update with reason | الفرق | نسخة جديدة `ChangeKind` + `ChangeReason` + `ops.Notification` للمتقدمين | — | — |
| Reschedule | — | نسخة Reschedule؛ `WithdrawalCutoffAtUtc` للعضويات النشطة **يُمدد ولا يُقصَّر** (قرار المالك #8) | — | — |
| Close registration / Complete / Archive | — | `Initiative.Status` | — | — |
| Cancel (نهائي) | التأكيد والسبب | `Status=Cancelled` + `CancelledByPersonId` + `CancellationReason`؛ كل طلب مفتوح وعضوية → Cancelled (`EndReason=InitiativeCancelled`) + `InitiativeApplicationDecision` لكل منها + `ops.AuditEvent` + إشعارات — ذريًا | السعة المحررة | — |
| Admin: Suspend/Unpublish | — | `Status=Suspended` + `AuditEvent` | — | — |

**الملكية:** `Initiative.InstitutionId → org.Organization` مع `InstitutionKind` (FK مركب يضمن أن المالك مؤسسة لا مزوّد). الممثل = `OrganizationMember` نشط؛ النشر لا يحتاج موافقة Admin لكل مبادرة (D17). **ثوابت:** السعة ≤ 135 (CHECK على النسخة)؛ لا تخفيض للسعة دون العدد المحجوز (حارس الواجهة `cap ≥ seatsUsed` يصبح حارس الأمر). **قرار JSON:** `DraftJson` مسودة مرحلية (لا FK، لا تقارير، محرر واحد في كل مرة بفضل RowVersion)؛ `PublishedSnapshotJson` لقطة نص المحتوى المنشور (المكونات، الترتيب، الأسئلة الشائعة). **ما يُستعلم عنه أو يفرض قيدًا** (السعة، التواريخ، حد الانسحاب، التكلفة، النمط، نسخة نموذج التسجيل) أعمدة حقيقية. **ما يُفقد:** CHECK ترتيب المكونات (`IE-CONTENT-ORDER`)؛ **البديل:** تحقق C# عند النشر (`NEW-INIT-SNAPSHOT-VALIDATION`).

---

## 13. طلبات المبادرة: التقديم، القبول، العضوية، الإلغاء، الإيقاف، الانسحاب

**الصفحات:** Explore → Apply، My Initiatives، `#/organization/participants`، `#/supervisor/applications`، `#/participant/initiatives`.

### 13.1 آلة الحالة (من النموذج والواجهة)

```
Pending ─► Accepted ─► Completed             (يحرر المقعد فورًا، قرار #11)
Pending ─► Queued ─► Offered ─► Accepted
                        ├─► OfferDeclined     (نهائي)
                        └─► OfferExpired      (نهائي؛ العرض ينتقل للتالي ذريًا)
Pending|Queued ─► Rejected                    (إعادة تقديم مسموحة بصف جديد AttemptNo+1، قرار #9)
Pending|Queued ─► Withdrawn                   (مسموح دائمًا، قرار #6)
Accepted ─► Suspended ─► Accepted (Restore) | Removed
Accepted ─► Removed
Accepted ─► Withdrawn                         (فقط إذا الآن < WithdrawalCutoffAtUtc: أكثر من 120 ساعة كاملة، قرار #7)
أي حالة ─► Blocked ─► BlockLifted             (الممثل فقط؛ Blocked النشط يمنع إعادة التقديم)
الحالات المفتوحة ─► Cancelled                  (إلغاء المبادرة الدائم فقط)
```

| الإجراء | الفاعل الموثوق | يُحفظ | الثابت والقيد |
|---|---|---|---|
| Apply | الفرد | `InitiativeApplication(Pending)` + `TermsRevisionId` (الشروط التي قدّم عليها) + `ConsentAtUtc` + `forms.FormResponse` إن وُجد نموذج تسجيل | طلب مفتوح واحد لكل مبادرة وشخص (`UQ(InitiativeId,PersonId) WHERE Status IN (Pending,Queued,Offered,Accepted,Suspended,Blocked)`) |
| Approve | الممثل أو مشرف نشط (D25) | → Accepted (أو Queued إن امتلأت) + `InitiativeApplicationDecision` + `WithdrawalCutoffAtUtc` من النسخة | **عضوية فعالة واحدة عبر كل المبادرات** `UQ(PersonId) WHERE Status IN ('Accepted','Suspended')` (قرار #4)؛ السعة: قفل صف Initiative ثم عدّ (Offered+Accepted+Suspended) ≤ سعة النسخة الحالية + مشغّل أمان |
| Reject / Suspend / Restore / Remove / Block | الممثل وحده (D26) | انتقال + قرار إلحاقي | `TR_InitiativeApplication_Transition` يمنع الانتقالات غير المعرّفة ويثبّت InitiativeId/PersonId/AttemptNo/TermsRevisionId |
| Flag / Escalate | المشرف | `InitiativeApplicationDecision` بلا تغيير حالة | — |
| Withdraw | المتقدم نفسه | → Withdrawn | Accepted فقط قبل الحد؛ اللحظة الحدّية مرفوضة |
| انتهاء العرض | وظيفة مجدولة | OfferExpired + عرض التالي في الطابور | في معاملة واحدة مع قفل الصف الأب |
| Complete | الممثل/المشرف | → Completed + `session.Completion(Kind=Initiative)` + معلم جماعي | يحرر المقعد في المعاملة نفسها |

**أثر السعة:** يحجز مقعدًا: Offered (الحي)، Accepted، Suspended. يحرره: Withdrawn، Removed، Completed، Cancelled، OfferDeclined، OfferExpired (قرارات #5، #11). **التاريخ:** كل انتقال صف في `InitiativeApplicationDecision` بـ`DecisionNo` متسلسل؛ `TermsRevisionId` يحفظ الشروط التاريخية. **الأثر عبر المساحات:** القبول يُظهر مساحة الطالب ويسمح بالتسكين في مجموعة (`coach.GroupMembership.ApplicationId`، والمشغّل يشترط أن يكون الطلب Accepted)؛ إنهاء العضوية ينهي التسكين (`EndReason`).

**دمج `InitiativeMembership` و`InitiativeSeatOffer` في الطلب:** العضوية هي الطلب المقبول نفسه (1:0..1 بلا هوية مستقلة؛ القاعدة الحية كانت تحتاج مشغّلات لمزامنة حالتين)، والعرض حالة مؤقتة للطلب نفسه (`OfferedAtUtc`، `OfferExpiresAtUtc`، `OfferRespondedAtUtc`). **يسد الدمج ثغرة** في القاعدة الحية: لم تكن فيها حالة لعرض مرفوض أو منتهٍ.

**⚠ قرار مفتوح (قرار المالك #10):** الانضمام مجددًا إلى **المبادرة نفسها** بعد عضوية منتهية (Withdrawn/Removed/Completed). الواجهة الحالية (`REAPPLY_BLOCKED` في `initiative-rules.js`) تمنعه بعد Completed وتسمح بالتقديم بعد Withdrawn/Removed؛ النموذج يطبق القاعدة الأكثر تحفظًا `UQ(InitiativeId, PersonId) WHERE AcceptedAtUtc IS NOT NULL` (قبول واحد لكل شخص في كل مبادرة). قرار المالك يغيّر هذا الفهرس المفلتر فقط، لا الجداول.

---

## 14. برامج المدرب، المجموعات، الدعوات، المهام، الإرسال، المراجعة

**الصفحات:** `#/mentor/*`، `#/organization/team`، `#/supervisor/coaches|students`، `#/student/tasks|group`، Activities → Assigned.

| الخطوة | الفاعل | يُحفظ | الثابت |
|---|---|---|---|
| موافقة Admin على مدرب مستقل | Admin | `org.VerificationCase(Kind=Coach)` Approved | النشر يتطلبها؛ حالة واحدة حية لكل مدرب |
| Program Builder → Publish | المدرب المالك | `coach.CoachProgram` + `coach.ProgramRevision` (`StagesJson`، قاعدة الإكمال) | المالك لا يتغير؛ المراحل يتحقق منها C# عند النشر |
| إنشاء مجموعة | مالك البرنامج / الممثل / المشرف | `coach.OperationalGroup` (أب واحد: برنامج أو مبادرة، D19) | الأب لا يتغير |
| دعوة بالبريد | مالك البرنامج | `coach.GroupMembership(Status=Invited, NormalizedEmail, TokenHash, InviteExpiresAtUtc)` | دعوة حية واحدة لكل بريد في المجموعة؛ الدعوة البريدية لمجموعة برنامج فقط |
| قبول الدعوة (`join.html`) | الشخص المطابق للبريد الموثّق | الصف نفسه Invited → Active | بريد خاطئ ⇒ تبقى معلقة (D23)؛ لا هوية مكررة |
| إعادة إرسال / سحب / انتهاء | المالك / وظيفة | تدوير `TokenHash`، Revoked، Expired | — |
| تسكين/نقل طالب مبادرة | الممثل أو المشرف (D29) | إنهاء الصف (Transferred) + صف جديد ذريًا | عضوية نشطة واحدة لكل مجموعة؛ المقعد لا يتغير |
| تعيين مدرب لمجموعة | الممثل/المشرف | `coach.GroupCoachAssignment` | في المبادرة: `StaffAppointment` نشط للشخص نفسه (FK مركب على النطاق)؛ في البرنامج: المدرب = المالك |
| إنشاء مهمة | مدرب مُعيَّن | `task.Assignment` + `task.AssignmentRevision` + `task.AssignmentRecipient` لكل عضو نشط | المؤلف مدرب نشط للمجموعة؛ المستلم عضو نشط |
| Reschedule / Cancel | المدرب | نسخة جديدة؛ المستلم يحتفظ بنسخة إسناده | لا يمحو الإرسالات السابقة |
| Submit / Resubmit | الطالب | `task.SubmissionAttempt` (AttemptNo متسلسل) + اختياريًا `PracticeAttempt` + `files.SecureFile` | إلحاقي؛ المستلم ليس في حالة نهائية؛ الملف يملكه المرسل |
| Review | المدرب المعيّن | `task.ReviewDecision` (Approved/NeedsRevision/Rejected، `SupersedesId` للتصحيح) + `task.ReviewPrivateNote` اختياري | Approved ⇒ `EvidenceEvent` ⇒ `GroupRewardEntry` + نمو الشجرة الشخصية إن كان فردًا كاملًا |
| Program Completion | المالك | `session.Completion(Kind=Program)` | إكمال واحد لكل (برنامج، شخص)؛ لا مكافأة شخصية (D10) |

**الخصوصية:** `ReviewPrivateNote` لا تظهر في أي DTO للطالب (D33)؛ المدرب يرى طلابه المسندين فقط (D31). **التسليم عند الاستبدال:** `GroupCoachAssignment.ToUtc` يغلق القديم ويفتح الجديد؛ القرارات السابقة تبقى باسم مؤلفها. **"Overdue"** حالة عرض مشتقة من الموعد في النسخة.

**دمج `ProgramGroupInvitation` و`InitiativeGroupPlacement` في `GroupMembership`:** الدعوة المقبولة تصبح العضوية نفسها (لم تكن لها هوية بعد القبول)، وتسكين المبادرة عضوية مجموعة بأب مختلف؛ `CK_GroupMembership_Parent` يفرض الأعمدة الصحيحة لكل أب.

---

## 15. الطالب المدعو والانتقال بين المساحات

**الصفحات:** `#/student/dashboard|group|tasks|progress|garden|notifications|account`.

| الخطوة | يُحفظ | ملاحظة |
|---|---|---|
| الانضمام بدعوة | `iam.Person` (إن لم يوجد) + `OtpChallenge` + `GroupMembership` Active | ممكن بلا كلمة مرور |
| العمل في المجموعة | مهام، إرسال، حديقة جماعية | لا Lab/Shield/Recovery قبل الترقية (D12) |
| Upgrade إلى Individual | `Person.IndividualEnabledAtUtc` + `personal.IndividualProfile` + `ConsentRecord` | **الهوية نفسها**؛ الإرسالات والمراجعات والعضوية تبقى؛ يبدأ مسار الـbaselines الأربع (§3) |

**لا جدول "StudentAccount":** الطالب المدعو حالة محسوبة (`GroupMembership` نشط ∧ `IndividualEnabledAtUtc IS NULL`)، لا دور مخزن.

---

## 16. الجلسات، التسجيل، الحضور، الأعذار، الإكمال

**الصفحات:** `#/organization/sessions|attendance`، `#/supervisor/schedule|attendance|excuses`، `#/provider/calendar|attendance|evaluations`، `#/student/progress`، Explore (Sessions).

| الخطوة | الفاعل | يُحفظ | الثابت |
|---|---|---|---|
| إنشاء/نشر جلسة | الممثل / المزوّد | `session.Session` (مالك واحد: مبادرة **أو** تجربة) + `SessionRevision` 1 | `Purpose` = Session أو Meeting (اجتماع بلا حضور)؛ سعة لكل نمط |
| إسناد مشرف | الممثل | `session.SessionDuty` → `StaffAppointment` Supervisor نشط | "Needs Supervisor" = لا Duty نشط (محسوب، D38) |
| Reschedule | المالك | `SessionRevision` جديدة + إشعارات | لا تنخفض سعة نمط تحت تسجيلاته |
| Register | العضو | `session.SessionRegistration(Mode)` + `CredentialHash` | تسجيل حي واحد؛ النمط معروض؛ قفل صف الجلسة. **الواجهة الحالية تطلب الآن اختيار remote/on-site صراحة** (`session-access.js`، تغيير غير مُثبَّت) — يطابق عمود `Mode` الإلزامي |
| Check-in | المشرف المُسند | `session.Attendance` (Present/Late/Absent/NotRecorded؛ Method: QR/TypedCode/Manual+سبب/OnlineVerified) | idempotent؛ QR والرمز للحضوري فقط (D37) |
| Closeout | وظيفة/مشرف | NotRecorded → Absent | — |
| تصحيح | المشرف | `session.AttendanceCorrection` (قبل/بعد) + إبطال/إنشاء `EvidenceEvent` | لا UPDATE مباشر لدور التشغيل |
| عذر غياب | الطالب → المشرف يوصي → الممثل يقرر (D35) | `session.AbsenceExcuse` + `SecureFile` | عذر واحد لكل حضور Absent؛ القبول لا يحوّل الغياب إلى Present ولا يمنح أرنبًا (D36) |
| الإكمال | المخول للمالك | `session.Completion` (Initiative/Program/Camp) + `BasisJson` (لقطة المعايير) | إكمال واحد لكل طلب/حجز/(برنامج، شخص) |

**التسجيل ≠ الحضور ≠ الإكمال (D39):** ثلاثة جداول بثلاث دورات حياة. **دمج جداول Provider المكررة** (`ProviderAttendance`، `ExperienceSession`، `ProviderAppointmentSession`، `CampCompletion`…): الحقيقة نفسها بمالك مختلف؛ CHECK المالك + FK المركب يحافظان على الحدود. **⚠ سياسة مفتوحة (§26.2 #6):** هل العذر المقبول يعفي من جلسة إلزامية للإكمال — تُنشر في سياسة الإكمال (`CompletionPolicyRef`) ولا تغيّر البنية.

---

## 17. تجارب المزوّد والمخيمات والحجوزات والانتظار والطاقم والسلامة

**الصفحات:** `#/provider/*`، `#/supervisor/experiences|cohorts|evaluations`، Explore (Experiences/Camps)، My Registrations.

| الخطوة | الفاعل | يُحفظ | الثابت |
|---|---|---|---|
| Builder → Publish | عضو مزوّد نشط | `provider.Experience` + `provider.ExperienceRevision` (المكان، الوقت، السعر، الأهلية، السعة، `ChangeReason`) | نسخة لكل تغيير مع إشعار |
| Book / Join Waitlist | الفرد | `provider.ExperienceBooking` (Confirmed مباشرة أو Queued) + رد نموذج المشارك + `ConsentAtUtc` | حجز حي واحد لكل تجربة وشخص؛ Confirmed+Offered ≤ السعة (قفل صف Experience + مشغّل) |
| إلغاء → عرض | الفرد/المزوّد → وظيفة | Offered (24 ساعة افتراضيًا قابلة للتهيئة) → Confirmed/OfferDeclined/OfferExpired | العرض حالة للحجز نفسه (لا جدول `SeatOffer`) |
| الطاقم | المزوّد | `org.StaffAppointment(ExperienceId, Role=Supervisor)` | نطاق واحد لكل تعيين (CHECK)؛ دعوة بالبريد |
| الأفواج | المزوّد/المشرف | `provider.ProviderCohort` + `ProviderCohortMember` | الحجز Confirmed؛ فوج حي واحد لكل حجز؛ رؤية المشرف مقيدة بفوجه |
| الحضور والتقييم | المشرف المسند | `session.Attendance` (`OutcomeCode`/`OutcomeNotes`) + `session.Completion(Kind=Camp)` | الإكمال حسب المعايير المنشورة؛ بيت الطائر للمخيم |
| حادثة سلامة | الطاقم | `provider.ProviderIncident` + `SecureFile` | Open → Reviewed → Closed؛ التقارير تعرض مجاميع آمنة فقط |
| تقرير ختامي | المشرف | `task.OperationalReport(Kind=ProviderSupervisor)` | مختوم بعد الإرسال |

**الملكية (D18، D40):** المزوّد يملك الحجز والسلامة حتى عند الربط بمبادرة. **لا حديقة جماعية للمزوّد (D13).** **⚠ سياسة مفتوحة (§26.2 #5، #7):** ترتيب الانتظار والاستثناءات، حد الإلغاء، الأسعار والدفع (محاكى؛ لا جدول دفع).

---

## 18. النماذج والاستبيانات والمسابقات

**الصفحات:** `#/organization/forms` (`/new`، `/:id`، `/:id/edit`، `/:id/responses`)، `#/organization/competitions`، Tasks & forms، Explore (Competitions)، نموذج المشارك في Provider Builder (المرحلة 5).

| الخطوة | يُحفظ | الثابت |
|---|---|---|
| إنشاء/نشر نموذج | `forms.Form` + `FormVersion` + `FormQuestion` + `FormQuestionOption` تُدرج قبل `SealedAtUtc` | لا تعديل بعد الختم؛ التعديل نسخة جديدة |
| الرد | `forms.FormResponse` (Draft → Submitted → Withdrawn) + `FormAnswer` (للاختيار المتعدد صف لكل خيار) | مُعرَّف دائمًا (D41)؛ `ResponseNo>1` فقط إن سمحت النسخة؛ الرد مثبت على نسخته |
| المسابقة | `CompetitionCriterion` (مع النسخة) + المشاركة = `FormResponse` + `CompetitionJudgment` + `CompetitionCriterionScore` | حكم واحد لكل محكّم ومشاركة؛ لا يحكم على مشاركته |
| نشر النتائج | `Form.Status=ResultsPublished` | الترتيب محسوب من الدرجات |

**دمج `Competition` في `Form` و`CompetitionEntry` في `FormResponse`:** المسابقة نموذج بنوع إضافي ومعايير؛ المشاركة رد على نسختها. **دمج `FormAnswerChoice` في `FormAnswer`:** صف لكل خيار مختار مع FK إلى `FormQuestionOption` يحفظ العدّ العلائقي. **⚠ مفتوح (§26.2 #8):** الاستئناف وتعديل الحكم بعد النشر.

---

## 19. المجتمع: المنشورات، التعليقات، التفاعلات، المحفوظات، الإشراف

**الصفحات:** `community/community.html`، "Hear from Your Community" في Home، `#/admin/moderation`.

| الخطوة | يُحفظ | الثابت |
|---|---|---|
| New Post / Share Achievement | `community.Post` (+ `SecureFile` صورة) | Share Achievement اختياري وبلا مكافأة |
| Comment | `community.Comment` | المؤلف والمنشور ثابتان |
| Reaction | `community.Reaction` | `UQ(PostId, PersonId, ReactionCode)`؛ الإلغاء حذف (لا متطلب تاريخ) |
| Bookmark | `community.Bookmark` | `UQ(PostId, PersonId)` |
| Report | `community.ContentReport` | بلاغ مفتوح واحد لكل مبلِّغ وهدف |
| Moderation | `community.ModerationDecision` (إلحاقي) يحدّث حالة الهدف ذريًا | Admin بمنحة `GlobalGrant` |

**مستبعد بقرار المالك:** "challenges" الظاهرة في Community هي **Community Challenge / Joint Goals** (`JointGoal`، `JointGoalMember`، `JointGoalCheckIn`) — **DEFER**، لا جداول في v4. إن أُعيدت الميزة تُضاف وحدة مستقلة دون تعديل الجداول الحالية.

---

## 20. الإدارة، الملفات، الإشعارات، العمليات الأساسية

| القدرة | الصفحات | يُحفظ |
|---|---|---|
| طلبات الشركاء | `#/admin/organizations` | `org.VerificationCase` |
| المنح العامة | — | `iam.GlobalGrant` (منحة حية واحدة لكل قدرة وشخص) |
| الكتالوج / الأدوات / قواعد الحديقة | `#/admin/activity-catalog`، `#/admin/assessments`، Garden Rules | `PracticeDefinition/Version`، `InstrumentVersion`، `RewardPolicyVersion` |
| CMS / Content Studio | `#/admin/cms` | `governance.ContentRelease` (مسودة واحدة لكل هدف) |
| الحوكمة (Suspend/Unpublish/Remove) | `#/admin/initiatives|programs|experiences` | حالة المورد + `ops.AuditEvent` (دُمج فيه `GovernanceAction`) |
| Audit | `#/admin/audit` | `ops.AuditEvent` (INSERT فقط) |
| الإشعارات | Notifications/Updates في كل مساحة | `ops.Notification` + `ops.OutboxMessage` (بريد) |
| منع التكرار | كل الأوامر الحرجة | `ops.IdempotencyRecord` |
| الملفات | كل المرفقات | `files.SecureFile`؛ التنزيل يمر عبر صلاحية السجل المالك لا `OwnerPersonId` |
| الشراكات | `#/provider/partnerships`، Partners | `partnership.PartnershipLink` (يدمج ProgramLink وExperienceLink) |
| Report inbox للمؤسسة | `#/organization/reports`، `/:id` | `task.OperationalReport` (يدمج CoachReport وSupervisorReport): تقرير المدرب يُراجَع ويُضمَّن (`IncludedInReportId`) في ملخص المشرف؛ ملاحظات القضايا عمود `Issues`؛ المرفقات `SecureFile`؛ التصدير يُولَّد عند الطلب |

**مؤجل (commercial):** `#/admin/entitlements`، Subscriptions & Revenue، Pricing — لا كتالوج أسعار معتمد (§20، §26.2 #7). الجداول الخمسة **DEFER** وتبقى بياناتها في قاعدة التحقق.

---

## 21. مصفوفات شاملة

### 21.1 نقاط التزامن الحرجة

| السيناريو | الحماية |
|---|---|
| قبولان متزامنان على آخر مقعد في مبادرة | قفل `UPDLOCK,HOLDLOCK` على صف `Initiative` + عدّ داخل المعاملة + `TR_InitiativeApplication_Capacity` |
| قبول الشخص نفسه في مبادرتين متزامنًا | `UQ(PersonId) WHERE Status IN ('Accepted','Suspended')` — الثاني يفشل بـ2601 |
| قبول مشرف رابع | قفل صف Initiative + عدّ ≤ 3 + `TR_StaffAppointment_SupervisorCap` |
| حجزان على آخر مقعد تجربة / انتهاء عرض أثناء قبوله | قفل صف `Experience` + مشغّل السعة؛ الوظيفة المجدولة والقبول يتسلسلان على القفل نفسه |
| تسجيلان في آخر مقعد جلسة | قفل صف `Session` + `TR_SessionRegistration_Capacity` |
| نقرة مزدوجة (Approve، Accept offer، Submit، Check-in) | `ops.IdempotencyRecord` + `RowVersion` + إجراءات idempotent |
| مكافأة مرتين لنفس الدليل | `UQ(EvidenceEventId, EffectCode) WHERE EntryKind='Grant'` |
| محرران لمسودة المبادرة | `RowVersion` على `Initiative` |
| إعادة إرسال دفعة استخدام | `UQ(InstallationId, SequenceNo)` |

### 21.2 الآثار عبر المساحات

| الحدث | المساحات المتأثرة |
|---|---|
| قبول طلب مبادرة | الفرد (My Initiatives)، الطالب (مساحة جديدة)، الممثل/المشرف (العدّ)، Explore (السعة) |
| إلغاء المبادرة | كل المتقدمين والأعضاء، المجموعات، الجلسات، المهام المفتوحة، الإشعارات |
| ترقية الطالب | مساحة Individual تُفعَّل؛ مساحة الطالب تبقى |
| موافقة مراجعة مدرب | الحديقة الشخصية (إن كان فردًا كاملًا)، الحديقة الجماعية، تقارير المدرب |
| تصحيح حضور | الحديقة الشخصية (عكس الأرنب)، تقارير المشرف والممثل |
| إيقاف منظمة | النشر والقبول الجديد يتوقفان لكل مواردها |
| إنهاء شراكة | المكوّن يختفي من تفاصيل المبادرة؛ الحجوزات تبقى للمزوّد |

### 21.3 حالة واجهة فقط (لا تُخزَّن)

مبدّل الهوية التجريبي، الساعة التجريبية، إعادة الضبط المحلية، المرحلة المفتوحة في الـBuilder قبل الحفظ، الفلاتر والبحث، عدادات المؤقتات المرئية، رسوم Bimo المتحركة، التبويبات المختارة، معاينات "ماذا لو" قبل التأكيد، وتصدير CSV/PDF (يُولَّد عند الطلب).

### 21.4 مسارات العرض فقط أو غير المعتمدة

| العنصر | المعالجة |
|---|---|
| Pricing / Plus / Subscriptions / Entitlements | DEFER (5 جداول) |
| Community challenges / Joint Goals | DEFER بقرار المالك (3 جداول) |
| الجلسة المستقلة خارج مبادرة (`StandaloneSessionSupervisorAppointment`) | DEFER (جدول واحد) |
| Legacy Admin (`Client/admin.html`) | قدراته الفريدة مغطاة بجداول الحوكمة؛ لا جداول مكررة (D14) |
| صفحات العرض (`demo.html`، `hero-lab*`) | لا تخزين |
| مسارات المؤسسة المخفية (`partners`، `group-garden`) | الكيانات موجودة (`PartnershipLink`، `GroupRewardEntry`)؛ الواجهة مخفية مؤقتًا |
