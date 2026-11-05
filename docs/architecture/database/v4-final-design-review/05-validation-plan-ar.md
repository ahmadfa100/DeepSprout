# DeepSprout v4 — خطة التحقق التقني (المخرج E)

> **ملف مكتوب يدويًا.** يكمّل [05a-test-traceability-ar.md](05a-test-traceability-ar.md) (المولَّد) الذي يتتبع كل فحص من الفحوص الـ330 السابقة فحصًا فحصًا. هذا الملف يحدد **كيف** يُبنى المخطط الجديد ويُثبت على SQL Server وEF Core، و**متى** يُعتبر جاهزًا ليحل محل قاعدة الـ129 جدولًا.

## 0. القواعد الثابتة

1. **لا يُمس `DeepSprout_Validation`** (الـ129 جدولًا، 23 ترحيلًا، 330 PASS). تبقى خط الأساس المحفوظ حتى يجتاز v4 كل البوابات أدناه ويوافق المالك.
2. v4 يُبنى في **قاعدة جديدة** (`DeepSprout_V4_Validation`) على الخادم نفسه، من **سلسلة ترحيلات جديدة** في فرع/مشروع منفصل. ترحيلات الـ129 لا تُحذف ولا تُعدَّل.
3. **مصدر الحقيقة للمخطط هو EF Core** (Entities + `IEntityTypeConfiguration` + ترحيلات). `schema.json` المولَّد هنا هو **العقد** الذي يجب أن يطابقه الكتالوج الفعلي.
4. الفحص يقرأ هوية الفاعل من سياق موثوق (`SESSION_CONTEXT` في طبقة SQL أثناء الاختبار، ثم Claims في HTTP)، لا من معامل يرسله العميل.

---

## 1. طبقات التحقق والبوابات

| الطبقة | ما يثبته | الأداة | البوابة |
|---|---|---|---|
| L0 النموذج | 87 جدولًا، كل FK يشير إلى جدول موجود، كل FK مركب يقابله UNIQUE، كل جدول له مصدر KEEP واحد، المطابقة 87+33+0+9=129، الـ330 فحصًا كلها لها قرار | `node generate.mjs` | **مُجتاز** (`validation-report.txt`: 0 أخطاء) |
| L1 الكتالوج | قاعدة مبنية من الصفر تطابق `schema.json` عمودًا عمودًا | استعلام `sys.*` → JSON → مقارنة (يعاد استخدام نهج `../review/extract-live-schema.ps1` و`compare_snapshot.py`) | فروق = 0؛ كل FK/CHECK `is_not_trusted=0` و`is_disabled=0` |
| L2 القيود | كل FK/UQ/CHECK يرفض الحالة الخاطئة بالرقم المتوقع (547، 2601/2627) | مشروع `DeepSprout.DatabaseValidation` (نسخة v4) | كل قيد معلن له حالة سلبية واحدة على الأقل |
| L3 الحراس | المشغّلات والإجراءات (أرقام أخطاء مخصصة 5xxxx) | المشروع نفسه | كل `guard` في القاموس له اختبار |
| L4 الانتقالات | مصفوفة الحالة مسموح/ممنوع لكل آلة حالة | اختبارات مولَّدة من تعريف الحالات | كل خلية مغطاة |
| L5 التزامن | السباقات على اتصالين حقيقيين | `SqlConnection` × 2 + `Barrier` | لا تجاوز سعة، لا عضوية مزدوجة |
| L6 التاريخ | الجداول الإلحاقية (33) ترفض UPDATE/DELETE؛ النسخ المختومة لا تتغير | المشروع نفسه | 33/33 |
| L7 تكافؤ EF | النموذج = القاعدة | `dotnet ef migrations has-pending-model-changes`، `dotnet ef migrations script --idempotent` | لا تغييرات معلقة؛ السكربت idempotent يُنفَّذ مرتين بلا خطأ |
| L8 الترحيل | بناء من الصفر، إعادة البناء، ترحيل بيانات الاختبار من 129 | §9 | انظر §9 |
| L9 HTTP (لاحقًا) | المصادقة والتفويض عبر API | `WebApplicationFactory` + Testcontainers/LocalDB | §10 |

**قاعدة الحسم:** لا يُعلن "PASS" إلا بدليل محفوظ (JSONL لكل فحص: المعرف، النتيجة، رقم الخطأ أو الحالة الملاحظة، SPID للسباقات) كما في `../phase-b/final-regression/`.

---

## 2. المفاتيح الأجنبية والملكية

**الهدف:** لا يمكن لسجل أن يشير إلى أب من مالك آخر.

| الفحص | الإعداد | المتوقع |
|---|---|---|
| FK بسيط لكل علاقة (234) | إدراج بمعرّف أب غير موجود | 547 |
| FK مركب للملكية (85) — مثال `coach.GroupMembership(GroupId, ProgramId) → OperationalGroup(Id, ProgramId)` | مجموعة البرنامج A مع `ProgramId` = B | 547 |
| `institution.Initiative(InstitutionId, InstitutionKind) → org.Organization(Id, Kind)` | مزوّد بدل مؤسسة | 547 |
| `Initiative.CurrentRevisionId` | نسخة مبادرة أخرى | 547 (`(CurrentRevisionId, Id) → InitiativeRevision(Id, InitiativeId)`) |
| `lab.AssessmentResponse` | بند لمحاولة شخص آخر | 547 |
| `session.Attendance` | حضور لتسجيل جلسة أخرى أو شخص آخر | 547 (`(RegistrationId, SessionId, PersonId)`) |
| `coach.GroupCoachAssignment` في مبادرة | تعيين بـStaffAppointment لمبادرة أخرى | 547 |
| `evidence.PersonalRewardEntry` العكس | عكس منحة شخص آخر | خطأ المشغّل `TR_PersonalRewardEntry_Reversal` |
| `files.SecureFile` | مرفق عذر بملف يملكه غير المقدم | خطأ `TR_AbsenceExcuse_Owner` |

**أداة مساعدة:** يُولَّد من `schema.json` اختبار سلبي آلي لكل FK (234) — المولّد يعرف الأعمدة والجدول المرجعي، فيدرج صفًا صالحًا ثم يكسر عمود FK واحدًا. الاختبارات اليدوية تُكتب فقط لحالات الملكية المركبة أعلاه.

---

## 3. القيود الفريدة (172، منها 53 مفلترة)

لكل UQ مفلتر **حالتان**: (أ) تكرار داخل المرشّح ⇒ 2601؛ (ب) التكرار نفسه خارج المرشّح ⇒ ينجح (يثبت أن المرشّح ليس أوسع من اللازم).

| UQ | (أ) يُرفض | (ب) يُقبل |
|---|---|---|
| `InitiativeApplication(PersonId) WHERE Status IN (Accepted, Suspended)` | عضوية ثانية في مبادرة أخرى | الشخص Withdrawn من A ثم Accepted في B |
| `InitiativeApplication(InitiativeId, PersonId) WHERE Status IN (Pending…Blocked)` | طلب ثانٍ مفتوح | طلب جديد بعد Rejected (`AttemptNo=2`، قرار #9) |
| `InitiativeApplication(InitiativeId, PersonId) WHERE AcceptedAtUtc IS NOT NULL` | قبول ثانٍ بعد Withdrawn | — (يتغير إن قرر المالك #10 خلاف ذلك) |
| `org.StaffAppointment(InitiativeId, NormalizedEmail, Role) WHERE Pending` | دعوتان حيتان | دعوة جديدة بعد Expired |
| `coach.GroupMembership(GroupId, PersonId) WHERE Active` | عضويتان نشطتان | العودة بعد Ended |
| `lab.AssessmentAttempt(PersonId, InstrumentCode) WHERE Baseline AND Valid` | baseline صالح ثانٍ | baseline Invalid ثم Valid |
| `recovery.RecoveryCycle(PersonId) WHERE Status IN (Draft…Paused)` | دورتان مفتوحتان | دورة جديدة بعد Reviewed |
| `recovery.PlanRevision(CycleId) WHERE Accepted` / `WHERE Draft` | نسختان مقبولتان / مسودتان | Superseded متعددة |
| `evidence.*RewardEntry(EvidenceEventId, EffectCode) WHERE Grant` | منحة مكررة | Reversal للمنحة نفسها |
| `shield.BrowserUsagePeriod(InstallationId, SequenceNo)` | إعادة الدفعة | تسلسل جديد |
| `session.SessionRegistration(SessionId, PersonId) WHERE Pending/Confirmed` | تسجيل ثانٍ | إعادة التسجيل بعد Cancelled |
| `provider.ExperienceBooking(ExperienceId, PersonId) WHERE Queued/Offered/Confirmed` | حجز ثانٍ | حجز بعد Cancelled |
| `session.Completion(ApplicationId)` / `(BookingId)` / `(ProgramId, PersonId)` | إكمال ثانٍ | — |
| `forms.CompetitionJudgment(ResponseId, JudgePersonId)` | حكم ثانٍ | محكّم آخر |
| `community.Reaction(PostId, PersonId, ReactionCode)` | تفاعل مكرر | رمز آخر |

---

## 4. الحالات السلبية العامة (CHECK — 294)

- **الأنماط المغلقة (enum):** كل عمود `Status/Kind/Mode/Role/…` يرفض قيمة خارج القائمة (547). هذه **إضافة جديدة** على القاعدة الحية التي كانت تترك كثيرًا منها نصًا حرًا.
- **ترابط الأعمدة بالحالة:** مثل `CK_InitiativeApplication_Offer` (Offered يتطلب `OfferExpiresAtUtc > OfferedAtUtc`)، `CK_Completion_Subject` (الأعمدة الصحيحة لكل Kind)، `CK_StaffAppointment_Scope` (نطاق واحد)، `CK_GroupRewardEntry_Owner` (مبادرة **أو** مجموعة برنامج).
- **الحدود:** `Capacity BETWEEN 1 AND 135`، `ReportedPhoneMinutesPerDay BETWEEN 0 AND 1440`، `ObservedSeconds <= CoverageSeconds`.
- **JSON:** كل عمود JSON عليه `ISJSON(...) = 1`، وكل JSON له اختبار تحقق بنية في C# (§7).

يُولَّد اختبار سلبي لكل CHECK من `schema.json` حيث يمكن اشتقاق قيمة مخالفة آليًا (enum والحدود)؛ الترابطات تُكتب يدويًا.

---

## 5. انتقالات الحالة

لكل آلة حالة مصفوفة (من → إلى) تُختبر كاملة: كل انتقال مسموح ينجح، كل ممنوع يُرفض بخطأ المشغّل.

| الآلة | الجدول | خلايا ذات أولوية |
|---|---|---|
| طلب المبادرة (14 حالة) | `InitiativeApplication` | Removed → Accepted ممنوع؛ Completed → أي حالة ممنوع؛ OfferExpired → Offered ممنوع (`NEW-PROV-OFFER-ONCE` مثيله للمزوّد)؛ Blocked → Pending ممنوع؛ BlockLifted ثم طلب جديد مسموح |
| المبادرة | `Initiative` | Cancelled نهائي؛ Draft → Completed ممنوع |
| تعيين الطاقم | `StaffAppointment` | Expired → Active ممنوع؛ Revoked نهائي |
| الدورة والخطة | `RecoveryCycle`، `PlanRevision` | Accepted → Draft ممنوع؛ Superseded نهائي |
| محاولة Lab | `AssessmentAttempt` | Valid → Started ممنوع |
| المستلم والمراجعة | `AssignmentRecipient` | Approved → Submitted ممنوع؛ NeedsRevision → Submitted مسموح |
| العذر | `AbsenceExcuse` | Accepted يتطلب سببًا؛ Withdrawn بعد القرار ممنوع |
| الحجز | `ExperienceBooking` | OfferDeclined → Confirmed ممنوع |
| الإشراف | `Post`/`Comment` | Removed → Published عبر قرار Restore فقط |

---

## 6. حفظ التاريخ (33 جدولًا إلحاقيًا + الصفوف المختومة)

| الفحص | المتوقع |
|---|---|
| UPDATE أو DELETE على أي جدول إلحاقي | خطأ المشغّل `TR_*_Immutable` (أو DENY للدور التشغيلي) |
| تعديل `InitiativeRevision` / `ProgramRevision` / `ExperienceRevision` / `SessionRevision` / `AssignmentRevision` | مرفوض؛ التغيير = نسخة جديدة |
| `FormVersion` بعد `SealedAtUtc` | لا إدراج أسئلة/خيارات/معايير؛ لا تعديل |
| `PlanRevision` بعد Accepted | يُسمح فقط بـStatus → Superseded |
| `OperationalReport` بعد Submitted | كلمات المؤلف ولقطة المقاييس ثابتة؛ أعمدة المراجعة فقط |
| `Attendance` | UPDATE مباشر مرفوض لدور التشغيل؛ التصحيح عبر `session.CorrectAttendance` يكتب `AttendanceCorrection` بالقيم قبل/بعد في المعاملة نفسها |
| `FormResponse` بعد Submitted | الإجابات ثابتة؛ Withdrawn فقط |
| الطلب يحتفظ بشروطه | `TermsRevisionId` لا يتغير بعد إعادة الجدولة؛ المتقدم يرى "Terms you applied under" |
| حذف الشخص | غير ممكن (FK من مئات الصفوف)؛ الإغلاق حالة |

---

## 7. السعة والعضوية والسباقات (L5)

كل سباق: اتصالان، `Barrier` لبدء متزامن، تسجيل SPID ورقم الخطأ لكل طرف والحالة النهائية.

| المعرّف (قديم → v4) | السيناريو | المتوقع |
|---|---|---|
| `CAP-03` | قبولان متزامنان على آخر مقعد | واحد ينجح، الآخر خطأ السعة؛ مقعد مشغول واحد، قرار واحد، تدقيق واحد |
| `MEM-01` | قبول الشخص نفسه في مبادرتين متزامنًا | الثاني 2601 على `UQ(PersonId) WHERE Accepted/Suspended` |
| `IE-OFFER-RACE` | انتهاء عرض بالوظيفة المجدولة وقبوله في اللحظة نفسها | أحدهما فقط؛ لا مقعد مزدوج؛ العرض التالي يُنشأ مرة واحدة |
| `CP-ASSIGN-RACE` | تعيين المدرب نفسه للمجموعة مرتين | 2601 للثاني |
| **جديد** `V4-SUP-RACE` | قبول دعوتي مشرف متزامنًا والمبادرة فيها 2 | واحد فقط Active؛ العدد = 3 |
| **جديد** `V4-BOOK-RACE` | حجزان على آخر مقعد في تجربة | واحد Confirmed، الآخر Queued أو مرفوض |
| **جديد** `V4-SESS-RACE` | تسجيلان في آخر مقعد نمط InPerson | واحد ينجح |
| **جديد** `V4-REWARD-RACE` | معالجتان متوازيتان لنفس `EvidenceEvent` | منحة واحدة |
| **جديد** `V4-CAP-SHRINK` | تخفيض السعة تحت العدد الحالي | مرفوض |

**ثوابت السعة المطلوب إثباتها بعد كل سيناريو:** `COUNT(Status IN (Offered, Accepted, Suspended)) ≤ Capacity(CurrentRevision)`؛ Suspended يحتفظ بالمقعد؛ Withdrawn/Removed/Completed/Cancelled/OfferDeclined/OfferExpired تحرره فورًا (قرار #11).

---

## 8. الانسحاب والإلغاء وحدود الطاقم

### 8.1 الانسحاب (قرارات #6، #7، #8)

يُستخدم مصدر الوقت القابل للتحكم في الاختبار (`MEM-03-CLOCK-PRIVILEGE`: دالة الوقت لا يغيّرها إلا دور الاختبار).

| المعرّف | الوقت بالنسبة لـ`WithdrawalCutoffAtUtc` (= البداية − 120 ساعة) | المتوقع |
|---|---|---|
| `MEM-03--1-STATE` | قبل الحد بـ1 مللي ثانية | Withdrawn، المقعد يتحرر |
| `MEM-03-0-ERROR/STATE` | عند الحد بالضبط | مرفوض؛ الحالة تبقى Accepted |
| `MEM-03-1-ERROR/STATE` | بعد الحد | مرفوض |
| `APP-05` | Pending | Withdrawn في أي وقت |
| `RESCHEDULE-POSTPONE` + `-WITHDRAW` | تأجيل المبادرة | الحد يُمدد؛ الانسحاب المتاح يبقى متاحًا |
| `RESCHEDULE-ADVANCE` | تقديم الموعد | الحد **لا يُقصَّر** للأعضاء الحاليين؛ من كان يحق له الانسحاب يحتفظ بالحق |
| `RESCHEDULE-UNSAFE` | تغيير غير آمن | مرفوض |

### 8.2 الإلغاء الدائم (`MEM-08-*`)

| الفحص | المتوقع |
|---|---|
| `MEM-08-UNAUTHORIZED(-STATE)` | غير الممثل يُرفض؛ لا تغيير |
| `MEM-08-ROOT` | `Status=Cancelled`، `CancelledByPersonId`، `CancellationReason`، الوقت محفوظ |
| `MEM-08-APPLICATIONS` | كل Pending/Queued/Offered → Cancelled |
| `MEM-08-MEMBERSHIPS` | Accepted/Suspended → Cancelled، `EndReason=InitiativeCancelled`، السعة محررة، Completed السابقة **تبقى** |
| `MEM-08-AUDIT` | قرار لكل طلب + `AuditEvent` للجذر |
| `MEM-08-DUPLICATE(-STATE)` | إلغاء ثانٍ لا يغيّر شيئًا (idempotent أو مرفوض) |
| `MEM-08-NO-APPLICATION/APPROVAL/RESCHEDULE/PUBLICATION` | بعد الإلغاء: لا طلب، لا قبول، لا إعادة جدولة، لا نشر |
| `MEM-08-ROLLBACK-ERROR/STATE` | فشل في منتصف العملية ⇒ لا تغيير جزئي إطلاقًا |
| **جديد** `V4-CANCEL-CASCADE` | المجموعات تُغلق، عضوياتها Ended(`InitiativeEnded`)، الجلسات المستقبلية Cancelled، المهام المفتوحة Cancelled، الإشعارات تُنشأ |

### 8.3 حدود الطاقم (`SUP-01..04`)

ثلاثة مشرفين نشطين كحد أقصى لكل مبادرة (لا لكل مؤسسة، D28)؛ الدعوات المعلقة لا تُحتسب؛ قبول الرابع يُرفض؛ سحب أحدهم يسمح بقبول جديد؛ قبول الدعوة يتطلب تطابق البريد الموثق (D23)؛ Supervisor في تجربة مزوّد لا يُحتسب ضمن حد المبادرة.

---

## 9. الأدلة والمكافآت الآمنة

| الفحص | المتوقع |
|---|---|
| المنحة تتطلب `EvidenceEvent` Accepted | لا منحة بلا دليل (FK + مشغّل) |
| لا منحة مزدوجة | `UQ(EvidenceEventId, EffectCode) WHERE Grant` |
| الإبطال | `EvidenceEvent(InvalidatesEventId)` + `Reversal` واحد؛ لا عكس مزدوج (`UQ(ReversesEntryId)`) |
| `PolicyVersionId` مجمَّد | نشر سياسة جديدة لا يغيّر المنح القديمة |
| العذر المقبول | لا يُنتج `AttendanceDecoration` (D36) |
| إكمال مبادرة/برنامج | لا `PersonalRewardEntry` (D10)؛ `GroupRewardEntry(CompletionMilestone)` للمبادرة فقط |
| مصدر من AI | لا يوجد `Provenance` يسمح بـAI كمصدر حاسم (قرار #13) — CHECK على `Provenance` |
| الدليل يخص صاحبه | `ReviewDecision` الموافق يشير إلى دليل لمستلم الإرسال نفسه |
| تصحيح الحضور | Present → Absent يعكس الأرنب في المعاملة نفسها |

---

## 10. سلامة الترحيل والبناء من الصفر

### 10.1 البناء من الصفر (Fresh build)

1. `dotnet ef database update` على قاعدة فارغة ⇒ 87 جدولًا + المشغّلات والإجراءات (عبر `migrationBuilder.Sql` من ملفات مرقمة، كما في `Server/src/DeepSprout.Infrastructure/Sql`).
2. L1: مقارنة الكتالوج مع `schema.json` ⇒ 0 فروق.
3. `dotnet ef migrations script --idempotent` يُنفَّذ مرتين على القاعدة نفسها بلا خطأ (يُعاد استخدام `Server/scripts/fix-ef-idempotent.mjs` إن لزم لمعالجة كتل `CREATE TRIGGER`).
4. `has-pending-model-changes` = لا.
5. حذف القاعدة وإعادة بنائها ينتج الكتالوج نفسه (حتمية).

### 10.2 سلسلة الترحيلات

**التوصية:** ترحيل أساسي واحد `V4_Initial` (لا ترحيل تحويلي فوق الـ23)، لأن التغيير إعادة تشكيل (33 دمجًا) ولا توجد بيانات إنتاج. ترحيلات لاحقة صغيرة لكل تغيير بعد ذلك. ترحيلات الـ129 تبقى في فرعها كما هي.

### 10.3 ترحيل بيانات التحقق (اختياري، لإثبات قابلية التحويل)

سكربت ETL للقراءة فقط من `DeepSprout_Validation` إلى `DeepSprout_V4_Validation` وفق [04-migration-matrix-ar.md](04-migration-matrix-ar.md):

| الفحص | المتوقع |
|---|---|
| KEEP | عدد الصفوف متساوٍ (مع إعادة التسمية) |
| MERGE | مجموع صفوف المصادر = صفوف الوجهة (مثال: `InitiativeMembership` تُدمج في `InitiativeApplication`: كل عضوية تجد طلبها؛ لا طلب Accepted بلا `AcceptedAtUtc`) |
| DEFER | لا تُنقل؛ تبقى في القاعدة القديمة |
| القيود | كل الصفوف المنقولة تجتاز قيود v4 (أي صف يفشل = عيب في البيانات القديمة أو في الخريطة، يُوثَّق) |
| `../../../../tests/database/ef-data-preservation-readonly.sql` | يُكيَّف لمقارنة المجاميع بين القاعدتين |

---

## 11. اختبارات HTTP للمصادقة والتفويض (لاحقًا، مع API)

عندما يبدأ API (ASP.NET Core، Onion: Domain / Application / Infrastructure / API):

| المجال | الفحص |
|---|---|
| هوية الفاعل | أي `ActorPersonId` في جسم الطلب **يُتجاهل**؛ الفاعل من Claims فقط. اختبار: طلب بـ`ActorPersonId` لشخص آخر ⇒ يُنفَّذ باسم صاحب الـtoken أو يُرفض |
| حد الموارد | الوصول لمورد مالك آخر ⇒ 404 (لا كشف وجود) أو 403 حسب السياسة؛ مصفوفة دور × مورد × إجراء من [01-product-workflow-map-ar.md](01-product-workflow-map-ar.md) |
| تبديل المساحة | لا يمنح صلاحية؛ المشرف المسحوب تعيينه يفقد الوصول فورًا |
| الخصوصية | DTO الطالب لا يحتوي `ReviewPrivateNote`؛ المشرف لا يرى نتائج Lab/Shield الخاصة |
| الملفات | التنزيل يتحقق من صلاحية السجل المالك ويكتب `AuditEvent` |
| التزامن | `If-Match`/RowVersion ⇒ 409 عند التعارض؛ `Idempotency-Key` ⇒ إعادة النتيجة نفسها |
| الأخطاء | أخطاء SQL (547، 2601، 5xxxx) تُترجم إلى ProblemDetails بلا تسريب تفاصيل |
| AI | أي endpoint ذكاء اصطناعي للقراءة/التلخيص فقط؛ لا يكتب في جداول التقييم أو الحضور أو الموافقات أو المكافآت |

الأداة: `WebApplicationFactory<Program>` + قاعدة SQL Server حقيقية (LocalDB أو Testcontainers)، لا مزود InMemory (لا يفرض القيود).

---

## 12. خريطة اختبارات القبول المهمة

الخريطة الكاملة للـ330 في [05a-test-traceability-ar.md](05a-test-traceability-ar.md) (140 CARRY، 101 REWRITE، 6 STRUCTURAL، 22 DEFER، 61 REGENERATE). أهمها:

| الثابت | الفحوص القديمة | التنفيذ في v4 |
|---|---|---|
| سعة 135 | `SQL-CK-01`، `CAP-01..03`، `IE-APPROVE-FULL` | `CK InitiativeRevision.Capacity BETWEEN 1 AND 135` + قفل Initiative + مشغّل السعة |
| عضوية فعالة واحدة | `MEM-01`، `SQL-03/04` | `UQ(PersonId) WHERE Status IN ('Accepted','Suspended')` على `InitiativeApplication` (كانت على `InitiativeMembership`) |
| سحب Pending | `APP-05`، `APP-05-STATE` | `institution.WithdrawApplication` |
| إعادة التقديم بعد الرفض | `APP-02` (AttemptNo=2) | UQ المفلتر يستثني Rejected |
| Blocked يمنع | `APP-06` | Blocked داخل مرشّح UQ المفتوح |
| 120 ساعة | `MEM-03-*` | `WithdrawalCutoffAtUtc` + الإجراء |
| عدم سلب الحق | `RESCHEDULE-*` | `institution.RescheduleInitiative` يمدد ولا يقصّر |
| الإلغاء الدائم | `MEM-08-*`، `IE-CANCEL-*` | `institution.CancelInitiative` |
| تحرير السعة | `MEM-06-REMOVED/COMPLETED` | الحالات خارج مرشّح العدّ |
| Suspended يحتفظ | `MEM-05`، `MEM-05-RESTORE` | Suspended داخل مرشّح العدّ |
| 3 مشرفين | `SUP-01..04` | `org.AcceptStaffAppointment` + `TR_StaffAppointment_SupervisorCap` |
| العرض والانتظار | `IE-OFFER-*` | حالات Offered/OfferDeclined/OfferExpired على الطلب نفسه |
| المسودة والنشر الذري | `BLD-01..05` | `Initiative.DraftJson` + `institution.PublishDraft` |
| الملف الآمن | `SEC-01-DB` | `files.SecureFile` + حارس التنزيل |

### 12.1 الاختبارات البديلة للفحوص البنيوية (STRUCTURAL)

| الجديد | يحل محل | يثبت |
|---|---|---|
| `NEW-INIT-SNAPSHOT-VALIDATION` | `IE-CONTENT-ORDER` | ترتيب مكونات المحتوى صحيح عند النشر (C#) |
| `NEW-PROG-STAGES-VALIDATION` | `COACH-STAGE-TIMES` | لا مرحلة بتواريخ مقلوبة في `StagesJson` (C#) |
| `NEW-OPS-OUTBOX-DELIVERY` | `OPS-DELIVERY-IMMUTABLE` | Delivered ⇒ `DeliveredAtUtc`؛ الحالة النهائية لا تُعاد |
| `NEW-PROV-OFFER-ONCE` | `PROV-OFFER-UNIQUE` | OfferExpired/OfferDeclined نهائيتان |
| `NEW-SESS-MODE-OFFERED` | `SESS-POOL-OWNER` | تسجيل InPerson في جلسة Online يُرفض |

### 12.2 اختبارات جديدة لا مقابل لها في الـ330

`V4-SUP-RACE`، `V4-BOOK-RACE`، `V4-SESS-RACE`، `V4-REWARD-RACE`، `V4-CAP-SHRINK`، `V4-CANCEL-CASCADE` (أعلاه)، إضافة إلى: `V4-ENUM-*` (CHECK لكل enum كان نصًا حرًا)، `V4-OFFER-DECLINE` (الثغرة المسدودة: رفض عرض المبادرة يحرر المقعد ويعرض على التالي)، `V4-REJOIN-RULE` (يُكتب بعد قرار المالك #10)، `V4-GROUP-GARDEN-OWNER` (مالك واحد للمساهمة الجماعية).

---

## 13. معيار الخروج (Gate) لاعتماد v4

1. L0–L8 كلها PASS بأدلة محفوظة.
2. كل CARRY وREWRITE (241) منفذ ومجتاز على v4؛ كل STRUCTURAL له بديل مجتاز؛ REGENERATE معاد توليده.
3. الاختبارات الجديدة في §12.2 مجتازة.
4. لا FK/CHECK غير موثوق أو معطل.
5. قرار المالك في المسائل المفتوحة المذكورة في [06-final-decision-report-ar.md](06-final-decision-report-ar.md) مسجل، أو الافتراض المحافظ موثق صراحة.
6. بعدها فقط تصبح v4 خط الأساس، وتُؤرشف قاعدة الـ129 (دون حذف) ويبدأ API.
