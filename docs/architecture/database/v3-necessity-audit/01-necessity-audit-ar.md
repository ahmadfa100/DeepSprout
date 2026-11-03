# DeepSprout — تدقيق ضرورة جداول قاعدة البيانات (مستقل ونقدي)

**التاريخ:** 2 نوفمبر 2026
**الحالة:** تقرير قرار للمالك. **لم يُعدَّل أي جدول أو Migration أو كود.** حزم v1 وv2 وv2.1 كما هي.
**الملفات:** هذا التقرير؛ [02-table-matrix-ar.md](02-table-matrix-ar.md) (المصفوفة الكاملة للجداول الـ129 والجرد الاسمي، مُولَّدة)؛ [generate_audit.py](generate_audit.py) (يعيد إنتاج كل الأعداد ويتحقق منها).

---

## 1. الحكم المختصر

**نعم، المخطط الحالي مُفرط الهندسة، وبمقدار يمكن قياسه.** من 129 جدولًا:

| | العدد | المعنى |
|---|---:|---|
| جداول يمكن دمجها أو حذفها **دون فقد أي متطلب معتمد** | **49** (38%) | هذا هو المقياس الحقيقي للإفراط الهندسي |
| جداول لميزات **غير معتمدة بعد** (تجاري، Joint Goals، جلسة مستقلة) | **9** (7%) | تأجيل ميزة بانتظار قرار، لا حذف |
| جداول ضرورية للنطاق المعتمد كاملًا | **71** | التصميم C |

| التصميم | الجداول | ماذا يغطي |
|---|---:|---|
| **A — MVP لمشروع طلابي** | **21** | الهوية، الرحلة الشخصية كاملة (اختبارات، خطة، ممارسات، روتين، الحديقة بأشجارها الأربع)، ودورة قبول المبادرة كاملة بقواعد المالك |
| **B — عملي (أولويات المالك)** | **54** | A + المدربون والمجموعات ومحرك المهام المشترك، الجلسات والحضور والأعذار والإكمال، حديقة المجموعة، النماذج، الإشعارات |
| **C — النطاق المعتمد كاملًا** | **71** | B + Provider والانتظار والمخيمات، Digital Shield، المسابقات، الشراكات، المجتمع، CMS |
| C إذا رُفضت كل الدمجات الخلافية | 87 | انظر القسم 8 |
| الحالي (v2.1) | 129 | |

**أهم خمسة مصادر للتضخم (بأمثلة من القاموس نفسه):**

1. **الحالة نفسها مخزنة في أكثر من جدول.** قبول طالب من قائمة الانتظار يمس ثلاثة جداول تحمل الحالة نفسها: `InitiativeApplication.Status` يقبل `'Offered'` و`'Accepted'`، و`InitiativeSeatOffer.Status` يقبل `'Offered'` و`'Accepted'`، و`InitiativeMembership.Status` يقبل `'Accepted'`. ثم يحتاج المخطط FK ثلاثيًا `(ApplicationId, InitiativeId, PersonId)` لمجرد إبقاء النسخ متسقة. آلة الحالة في المواصفة (§15.3) **سلسلة واحدة** على سجل واحد.
2. **محركات متوازية لنفس المفهوم.** ثلاثة جداول إكمال (`InitiativeCompletion`، `ProgramCompletion`، `CampCompletion`) رغم أن D10 يقول نصًا إن إكمال المبادرة والبرنامج "تصنيف واحد". ثلاث حالات تحقق بأعمدة متطابقة. جدولا حضور وجدولا تصحيح حضور. جدولا تقارير بأعمدة متطابقة عدا النطاق. جدولا روابط شراكة متطابقان.
3. **الدعوة والتعيين مفصولان في ثلاثة أماكن، ومدموجان في رابع.** `InitiativeStaffInvitation`→`InitiativeStaffAppointment`، `ProviderStaffInvitation`→`ProviderStaffAppointment`، `ProgramGroupInvitation`→`ProgramGroupMembership`. لكن `StandaloneSessionSupervisorAppointment` في القاموس نفسه يحمل `NormalizedEmail` و`TokenHash` و`PersonId NULL` في صف واحد، وكذلك نموذج الـClient (`SupervisorAppointment.status: 'Invited'|'Accepted'|'Declined'|'Revoked'`). المخطط لا يتبع نمطًا واحدًا.
4. **التاريخ يُسجَّل مرتين.** `AttendanceCorrection(OldStatus, NewStatus, CorrectedByPersonId, Reason)` هي حرفيًا أعمدة `AuditEvent(BeforeStatus, AfterStatus, ActorPersonId, Reason)`. و`GovernanceAction(ActorPersonId, ActionCode, ResourceType, ResourcePublicId, Reason)` مجموعة جزئية من `AuditEvent`.
5. **جداول بلا محتوى خاص بها.** `RecoveryJourney` لا يحمل إلا `PersonId` و`Status` وعليه قيد "رحلة نشطة واحدة لكل شخص". `GroupGarden` لا يحمل إلا مفتاح المالك و`Status` وهو 1:1 مع المبادرة أو المجموعة. `SessionCapacityPool` صفان على الأكثر لكل جلسة (Online/InPerson). `AssessmentInstrument` أربعة صفوف ثابتة.

**ما ليس إفراطًا (ويجب ألا يُحذف بحجة التبسيط):** `InitiativeRevision` (قرار المالك #8: حفظ نسخ الشروط التاريخية)، `InitiativeApplicationDecision` (قرار #9)، `SubmissionAttempt` و`ReviewDecision` (D32)، `AbsenceExcuse` منفصلًا عن الحضور (D35/D36)، `PlanRevision` (§5.5 نصًا)، و`ReviewPrivateNote` (قارئ مختلف وتصنيف خصوصية مختلف، D33). هذه تكاليف تاريخ **طلبها المالك**.

---

## 2. أساس الأدلة وحدوده — اقرأ هذا أولًا

الطلب يقول إن هناك **129 جدولًا منفذًا في SQL Server و23 Migration لـEF Core واختبارات ناجحة**. لم أجد أيًا من ذلك:

- مجلد `Server/` في الريبو يحتوي `README.md` فقط، وينص على أنه "لا backend ولا مخطط قاعدة بيانات".
- بحثت في تاريخ git لكل الفروع والـstashes: لا ملف `.cs` ولا `.csproj` في أي commit.
- الفرع `main` على GitHub (`ahmadfa100/DeepSprout`) مطابق للنسخة المحلية (`baa39ac`)، ولا فروع أخرى تحتوي backend.
- بحثت في `~/Documents` و`~/Desktop` و`~/Downloads` و`~/Public` كاملة (دون فلتر تاريخ) عن أي ملف `.cs` يذكر DeepSprout، وعن `*.csproj` و`*ModelSnapshot.cs` باسم يحتوي sprout، وعن مجلدات `Migrations` المعدلة بعد 25 أكتوبر: لا شيء يخص المشروع. **لم أبحث خارج هذه المجلدات ولا على أجهزة أخرى.**
- أحدث وثيقة، `~/Downloads/DeepSprout-DB-Test-Gate-2026-11-01/README-AR.md`، تقول: "لم يُنفّذ أي أمر SQL"، و"SQL الخاص بالنسخة المصححة ذات 19 جدولًا غير متاح ... ولذلك لم ننشئ Migration".

**لذلك أجريت التدقيق على `docs/architecture/database/v2.1/02-canonical-dictionary.md`**، وهو يعرّف 129 جدولًا بالضبط، أي العدد نفسه المذكور في الطلب. إذا كان التنفيذ موجودًا على جهاز آخر (مثل جهاز Windows عليه SSMS المذكور في حزمة 1 نوفمبر)، فالخطوة التالية بسيطة: أعطني مسار المشروع، وسأقارن `ModelSnapshot.cs` بهذا القاموس، ثم أعيد تشغيل `generate_audit.py`. لو اختلفت أسماء جداول، يفشل السكربت ويحدد الفرق بالاسم.

**ماذا يثبت "نجاح الاختبارات" حتى لو وُجد؟** يثبت أن القيود المختبرة تعمل كما صُممت. لا يثبت أن الجدول ضروري. مثال: اختبار يتحقق من أن FK الثلاثي بين `InitiativeMembership` و`InitiativeApplication` يرفض عضوية لا تطابق طلبها سينجح. لكن هذا الاختبار يحرس اتساق نسختين من الحقيقة نفسها، ولن يكون له موضوع بعد الدمج. وحزمة 1 نوفمبر وجدت **12 عمودًا مطلوبًا غير مُعلن في 11 من جداول الشريحة الأولى الـ19**، مثل `Initiative.StartsAtUtc` و`AuditEvent.AtUtc` و`InitiativeMembership.EndedAtUtc`، رغم أن القيود تشير إليها. **حجم القاموس لا يعني اكتماله.**

---

## 3. كيف وصلنا إلى 129

| المرحلة | العدد | ما حدث |
|---|---:|---|
| Codex v1 (27 أكتوبر) | 136 | رسم كل ما في المواصفة كجداول، بما فيها 3 جداول مقاعد مرقمة |
| مراجعة Claude (27 أكتوبر) | ~115 مقترح | دمج 21 جدولًا |
| Codex v2 (30 أكتوبر) | 128 | قبل 9 دمجات وحذف، ورفض أغلب الباقي، وأضاف جدولًا |
| Codex v2.1 (30 أكتوبر) | 129 | أضاف `InitiativeDraft` |

**لماذا لم تلتقط المراجعات السابقة هذا الحجم؟** لسببين:

**أولًا، عمود "عاقبة الحذف" في `v2/02-table-disposition.md` مكتوب بقالب ثابت.** 127 صفًا من 137 تقول حرفيًا: *"Lose X and its source-linked history/ownership"*، و*"Retain source-backed boundary and original keys"*. مثال: `iam.PersonEmail`: "Lose verified contact and its source-linked history/ownership". هذا يعيد اسم الجدول ولا يجيب عن السؤال: هل يمكن أن يكون عمودًا؟ **لم يخضع أي جدول تقريبًا لاختبار ضرورة فعلي.**

**ثانيًا، المراجعات قيّمت الجداول فرادى، لا عائلات.** `ProviderAttendance` يبدو ضروريًا إذا نظرت إليه وحده. لا يظهر أنه تكرار إلا عند وضعه بجانب `SessionAttendance` ومقارنة الأعمدة.

**مقارنة مفيدة:** الشريحة الأولى المعتمدة (M1) تحتوي 19 جدولًا، وتغطي **الهوية وقبول المبادرة فقط**. التصميم A يغطي الهوية وقبول المبادرة **و**الرحلة الشخصية كاملة بـ21 جدولًا.

---

## 4. قواعد الحكم المستخدمة

طبّقت ست قواعد على كل جدول. لكل قاعدة مثال من القاموس:

1. **جدول مستقل يحتاج دورة حياة مستقلة أو تعددًا حقيقيًا.** العلاقة 1:1 بلا حالة خاصة تعني أعمدة. مثال: `PasswordCredential` عليه `UQ PersonId`. **الاستثناء:** امتداد اختياري حساس، مثل `IndividualProfile`، لأن ليس كل شخص فردًا.
2. **الإصدار يحتاج جدولًا فقط إذا اجتمع شرطان:** متطلب معتمد بتثبيت النسخة التاريخية، **و**محتوى يحرره مستخدم أو Admin أثناء التشغيل. إذا كان المحتوى في الكود، يكفي عمود نصي مثل `ScoringVersion`. القاموس نفسه يفعل ذلك مع `PlanRevision.PolicyVersion` و`WeeklyReview`، لكنه ينشئ جدولًا كاملًا لـ`RewardPolicyVersion`.
3. **الأبناء الثابتة داخل نسخة ثابتة تُخزّن داخل النسخة** ما لم يُشِر إليها FK. مثال: `ProgramStage` لا يشير إليه أي FK في القاموس.
4. **جدول تاريخ مستقل فقط إذا قرأه منطق عمل أو عرضته واجهة بأعمدة لا يملكها `AuditEvent`.** `SessionRevision` يبقى لأن `AuditEvent` يحفظ `BeforeHash/AfterHash` فقط لا القيم، و§16 يطلب "history/version retained". أما `AttendanceCorrection` فيندمج لأن أعمدته موجودة في `AuditEvent`.
5. **مفهومان بالأعمدة نفسها والقراء أنفسهم وتصنيف الخصوصية نفسه = جدول واحد** بمفاتيح أجنبية nullable وقيد `CHECK` من نوع XOR. **لا `TargetType/TargetId` أبدًا**، فهذا يفقد الـFK. **الاستثناء:** اختلاف تصنيف الخصوصية مبرر للفصل. لهذا يبقى `PersonalRewardEntry` (S) منفصلًا عن `GroupRewardEntry` (O)، ويبقى `ReviewPrivateNote` (R) منفصلًا عن `ReviewDecision` (O).
6. **الاعتماد يُحدَّد من المصدر، لا من رأيي.** المصادر: D01–D48، و§26.2 (مفتوح)، و§12.2 ("not fully adopted")، و§20 ("not a signed catalog")، وقرارات المالك الـ13 في حزمة 1 نوفمبر.

---

## 5. النماذج المتداخلة والمكررة (بالأعمدة)

| العائلة | الجداول الحالية | الدليل من القاموس | في C |
|---|---|---|---|
| **قبول المبادرة** | `InitiativeApplication`، `InitiativeSeatOffer`، `InitiativeMembership` | `'Offered'` في جدولين، و`'Accepted'` في ثلاثة؛ العرض الحي واحد لكل طلب (`UXF ApplicationId WHERE Status='Offered'`)؛ `Expired` نهائي؛ العضوية 1:1 (`UQ ApplicationId`) | 1 (`InitiativeApplication`) + سجل القرارات |
| **شروط المبادرة** | `Initiative`، `InitiativeRevision`، `InitiativeDraft`، `InitiativeContent` | `Title/Mode/Capacity/TimeZoneId/WithdrawalCutoffAtUtc` على الجذر **و**في النسخة **و**داخل `PublishedSnapshotJson` **و**داخل `Stage1..6Json`. موعد الانسحاب في خمسة أماكن. نسخته على العضوية **مبررة** (قرار #8: لا تُسلب حقوق الانسحاب بإعادة الجدولة). نسخته على الجذر **تكرار** | 2 (`Initiative` + `InitiativeRevision`) |
| **التحقق** | `InstitutionVerificationCase`، `ProviderVerificationCase`، `CoachApproval` | الأعمدة نفسها `Status, EvidenceFileId, DecidedByPersonId, DecisionReason`؛ الفرق أن `CoachApproval` يحدد المعني بـ`PersonId` بدل `ApplicantPersonId` + مفتاح المنظمة. صفحة Admin `Applications` واحدة (§19) | 1 (`VerificationCase`) |
| **المنظمات** | `Institution`، `Provider`، `RepresentativeMembership`، `ProviderMembership` | `Name, Status, CountryCode, HeadquartersCity` متطابقة في الجدولين | 2 (`Organization(Kind)`، `OrganizationMember`) — خلافي |
| **الدعوات والتعيينات** | 3 جداول دعوة + 3 تعيين + `StandaloneSessionSupervisorAppointment` | النمط المدموج موجود أصلًا في جدول واحد وفي الـClient | 2 (`StaffAppointment`، `GroupMembership`) |
| **الجلسات والواجب** | `Session`، `ExperienceSession`، `SessionCapacityPool`، `InitiativeSessionDuty`، `ProviderAppointmentSession` | `ExperienceSession(Title, Mode, Status)` مجموعة جزئية من `Session`؛ الواجب مفهوم واحد بجدولين | 3 (`Session`، `SessionRevision`، `SessionDuty`) |
| **الحضور والتصحيح** | `SessionAttendance`، `ProviderAttendance`، وجدولا تصحيح | البروتوكول نفسه (D36/D37): Present/Absent/Late/Not Recorded والطرق نفسها | 1 (`Attendance`) + `AuditEvent` |
| **عروض المقاعد** | `InitiativeSeatOffer`، `SeatOffer` | كلاهما 1:1 مع أبيه؛ §16.1: الرفض/الانتهاء ينقل العرض **للتالي**، لا يكرره لنفس الحجز | 0 (أعمدة على الطلب/الحجز) |
| **الإكمال** | 3 جداول | D10 يوحّد صراحة | 1 (`Completion`) |
| **التقارير** | `CoachReport`، `SupervisorReport` | `AuthorPersonId, PeriodStart, PeriodEnd, Status, Narrative` متطابقة | 1 (`OperationalReport`) |
| **الشراكات** | `ProgramLink`، `ExperienceLink` | `RequestedBy, AcceptedBy, ScopeVersion, Status` متطابقة | 1 (`PartnershipLink`) |
| **النماذج والمسابقات** | 12 جدولًا | §15.4 يعدّ "competition entries" نوعًا من النماذج صراحة؛ الأسئلة والخيارات صفوف ثابتة داخل نسخة ثابتة | 4 (`Form`، `FormVersion`، `FormResponse`، `CompetitionJudgment`) |
| **التاريخ والتدقيق** | `AuditEvent`، `GovernanceAction`، `ModerationDecision`، تصحيحان، `PracticeProgressionDecision`، `DeliveryAttempt` | أعمدة الحوكمة والتصحيح موجودة في `AuditEvent`؛ `OutboxMessage` يحمل `Attempts` أصلًا | `AuditEvent` + `OutboxMessage` |
| **الإصدار** | 13 جدول نسخة + 6 جداول أبناء نسخ | `ConsentVersion` مكرر كعمود في `IndividualProfile` و`ShieldConfiguration` و`ExperienceRevision` و`FormVersion` رغم وجود `ConsentRecord`؛ `RewardPolicyVersion` جدول بينما بقية نسخ السياسات نصوص | 11 جدول نسخ، لكل منها مبرر في المصفوفة |

**ثغرات رغم الحجم.** وجود 129 جدولًا لا يعني تغطية كل شيء:

- `forms.Form.InitiativeId` من نوع `NOT NULL`، فلا يمكن ربط نموذج بتجربة Provider. هذا رغم أن §16.3 (المرحلة 5) يطلب "participant form/version" للحجز.
- `InitiativeMembership` فيه `CK` يفرض `CapacityReleasedAtUtc IS NULL` عندما تكون الحالة `Removed` أو `Completed`. هذا يناقض قرار المالك #11: تحرير السعة فور الإزالة أو الإكمال.
- `InitiativeApplication` يقول "repeat submission is policy-blocked". هذا يناقض قرار #9: إعادة التقديم بعد `Rejected` مسموحة.

هذه ليست موضوع التقرير، لكنها تثبت أن الجهد ذهب إلى العدد أكثر من الصحة.

---

## 6. حذف جدول ≠ تأجيل ميزة

هذا التمييز هو جوهر الإجابة. الأرقام تُقرأ كسلسلة:

```
129  الحالي
 −49  دمج/حذف بنيوي، كل المتطلبات المعتمدة باقية        ← هذا هو الإفراط الهندسي
 −9   ميزات غير معتمدة (تجاري 5، Joint Goals 3، جلسة مستقلة 1)  ← تأجيل حتى قرار المالك
= 71  C: النطاق المعتمد كاملًا
 −17  تأجيل وحدات معتمدة: Provider 5، Shield 4، المجتمع 5، المسابقات 1، الشراكات 1، CMS 1
= 54  B: أولويات المالك
 −23  تأجيل وحدات معتمدة: المدربون 5، المهام 7، الجلسات 7، النماذج 3، حديقة المجموعة 1
 −10  تبسيط متطلبات غير جوهرية في MVP (القائمة في 7.1)
= 21  A: MVP
```

- **الـ49 حذف حقيقي.** لا يعود أي منها مع الميزة لاحقًا، لأن الوظيفة نفسها موجودة في جدول آخر.
- **الـ9 والـ17 والـ23 تأجيل.** كل ميزة منها تعود بجداولها بالشكل المدموج الموجود في C، لا بشكلها الحالي.
- **الـ10 في A تبسيط واعٍ لمتطلب.** مثال: نسخة الشروط المقبولة تصبح عمودًا على `Person` بدل سجل موافقات. هذا يفقد سجل سحب الموافقة. التبسيط مقبول لمشروع طلابي، **غير مقبول للإنتاج**، ولذلك يعود في B.

---

## 7. التصاميم الثلاثة

الجرد الاسمي الكامل لكل تصميم في [02-table-matrix-ar.md §2](02-table-matrix-ar.md#2-الجرد-الاسمي-لكل-تصميم).

### 7.1 A — MVP لمشروع طلابي: 21 جدولًا

**المبرر:** يثبت الحلقتين اللتين تعرّفان DeepSprout، ويحقق كل قرارات المالك الخاصة بالقبول (#4–#11) وبالحديقة (#12):

- **الحلقة الشخصية:** تسجيل، ثم أربعة اختبارات، ثم الخطة، ثم الممارسات والروتين، ثم الأشجار الأربع.
- **الحلقة المؤسسية:** نشر المبادرة، ثم التقديم، ثم موافقة المشرف أو الممثل، ثم السعة، ثم الانسحاب قبل 120 ساعة.

`iam`: `Person`، `OtpChallenge` · `personal`: `IndividualProfile` · `lab`: `AssessmentAttempt`، `AssessmentScore` · `recovery`: `RecoveryCycle`، `PlanRevision`، `ScheduledAction`، `WeeklyReview` · `activity`: `PracticeAttempt`، `OfflineRoutine`، `RoutineCheckIn` · `evidence`: `PersonalRewardEntry` · `institution`: `Institution`، `RepresentativeMembership`، `Initiative`، `InitiativeRevision`، `InitiativeApplication`، `InitiativeApplicationDecision`، `StaffAppointment` · `ops`: `AuditEvent`

**كيف تتحقق القواعد الحرجة:**

- **مبادرة واحدة:** `UXF (PersonId) WHERE Status IN ('Accepted','Suspended')` على `InitiativeApplication`.
- **135 مقعدًا:** عدّ الطلبات `Accepted/Suspended/Offered` غير المحررة، تحت `UPDLOCK` على صف `Initiative`.
- **3 مشرفين:** عدّ `StaffAppointment` النشطة تحت القفل نفسه.
- **الانسحاب:** `WithdrawalCutoffAtUtc` يُثبَّت على الطلب لحظة القبول، والقرار يُسجَّل في `InitiativeApplicationDecision`.
- **الأشجار الأربع:** `PersonalRewardEntry` يرتبط بـ`PracticeAttemptId XOR RoutineCheckInId` مع `UQ` لكل مصدر، ونوع الممارسة يحدد الشجرة.

**التبسيطات العشرة، وما يُفقد في كل منها:**

| الجدول | في A | ما يُفقد |
|---|---|---|
| `GlobalGrant` | `Person.IsPlatformAdmin` | تعدد قدرات Admin |
| `ConsentRecord` | عمودا نسخة الإشعار وتاريخه على `Person` | سجل سحب الموافقة |
| `InstrumentVersion` | نصوص نسخة على المحاولة | FK يضمن نشر النسخة |
| `PracticeDefinition` و`PracticeVersion` | الكتالوج في الكود | نشر ممارسات من Admin |
| حالة التحقق | أعمدة على `Institution` | تعدد الطلبات وملف الإثبات |
| `SecureFile` | لا رفع ملفات | المرفقات |
| `OutboxMessage` و`Notification` | رابط دعوة قابل للنسخ، و§23.3 يسمح بذلك في Phase 1 | البريد الموثوق ومركز الإشعارات |
| `EvidenceEvent` | لا حاجة إليه بمصدرين فقط | توحيد مصادر المكافأة |

### 7.2 B — عملي: 54 جدولًا

**المبرر:** يغطي مراحل التبعية 1–4 و6 في §28.1 (عدا Shield من المرحلة 2 وجزء Provider من المرحلة 6)، وشرائح §30 من 1 إلى 4:

- قبول المبادرة وطاقمها.
- محرك المهام المشترك (D19، D31–D34)، والطالب المدعو الذي يرقّى بالهوية نفسها.
- الجلسات والحضور بالـQR وبالطرق اليدوية، والأعذار، والإكمال (D35–D39).
- حديقة المجموعة (D13).
- النماذج المعرّفة (D41)، لأن §15.3 يقول إن الطالب "submits required consent/form" عند التقديم.

**بنية B مطابقة لـC تمامًا للوحدات المضمّنة**، أي أنه لا يضعف أي متطلب معتمد داخل نطاقه. الفرق عن C تأجيل وحدات كاملة فقط.

**افتراض يحتاج تأكيدك:** أجّلت Provider (+5 جداول) وShield (+4). جدوى إضافة المتصفح مفتوحة (§26.2 #9)، وProvider هو المرحلة 5 في §28.1. إن كان Provider أولوية فـB = 59، وإن كان الاثنان فـB = 63.

### 7.3 C — النطاق المعتمد كاملًا: 71 جدولًا

**المبرر:** يحفظ كل متطلب معتمد في D01–D48 وقرارات المالك الـ13. الجدول يبقى فقط إذا اجتاز القواعد الست. تفاصيل كل جدول في المصفوفة.

**الدمجات الرئيسية في C:**

| الجدول الناتج | ماذا يستوعب |
|---|---|
| `org.Organization` (Kind) | Institution وProvider |
| `org.VerificationCase` | ثلاث حالات تحقق |
| `institution.StaffAppointment` | أربعة جداول دعوة وتعيين |
| `coach.GroupMembership` | التسكين، وعضوية البرنامج، ودعوة المجموعة |
| `session.Session` | جلسات المبادرة والتجربة، والسعة لكل نمط |
| `session.SessionDuty` | جدولا الواجب |
| `session.Attendance` | جدولا الحضور |
| `session.Completion` | ثلاثة جداول إكمال |
| `task.OperationalReport` | تقرير المدرب وملخص المشرف |
| `partnership.PartnershipLink` | رابطا الشراكة |
| `forms.*` | المسابقة كنموذج، والأسئلة والإجابات JSON داخل النسخة والرد |
| `evidence.GroupRewardEntry` | هوية حديقة المجموعة |
| `ops.AuditEvent` | الحوكمة والتصحيحات |

**الميزات غير المعتمدة لا تدخل C.** لو اعتمدها المالك:

- **التجاري:** 3 جداول تكفي، لا 5: `PlanVersion` بميزاته JSON، و`Subscription`، و`UsageLedger`.
- **Joint Goals:** 3 جداول.
- **الجلسة المستقلة:** صفر جداول، تُضاف `SessionId` إلى XOR في `StaffAppointment`.

---

## 8. الدمجات الخلافية — حيث يمكن الاختلاف معي

16 جدولًا من الـ49 دمجها قرار موازنة، لا خطأ واضح. لو رُفضت كلها يصبح C = 87، وهو ما يزال أقل بـ42 جدولًا من الحالي.

| المجموعة | الحجة للدمج | الحجة ضده | الفرق |
|---|---|---|---:|
| G1 Organization | الأعمدة متطابقة، والتحقق والاشتراكات لاحقًا تبسط إلى `OrganizationId` | المواصفة تعامل المؤسسة والمزوّد كنوعين مختلفين؛ يحتاج FK مركبًا `(OrganizationId, Kind)` في `Initiative` و`Experience` | +2 |
| G2–G5 محرك تشغيل واحد للمبادرة والمزوّد | بروتوكول الحضور والإكمال والطاقم واحد (D36، D37، D10) | D40: المزوّد يحتفظ بملكية مستقلة؛ الاستعلامات تتفرع حسب المالك؛ XOR في 4 جداول | +5 |
| G6 العضوية داخل الطلب | آلة حالة واحدة في §15.3، ويختفي FK الثلاثي وحالة `Accepted` المكررة | فصل "الطلب" عن "المشاركة" أوضح للقارئ؛ تغيير في قلب M1 المختبر | +1 |
| G7 كلمة المرور داخل Person | 1:1 بلا دورة حياة؛ EF table splitting يحفظ العزل في الكود | عزل فيزيائي للمادة السرية ممارسة أمنية مألوفة | +1 |
| G8 النماذج JSON | التعريف ثابت داخل النسخة، والرد يُقرأ كوحدة | تقارير SQL على الإجابات تحتاج `OPENJSON`؛ يُفقد FK من الإجابة إلى الخيار | +4 |
| G9 إجابات الاختبار JSON | لا تقرير معتمد يقرأ بندًا عبر الأشخاص | تحليل بحثي على مستوى المحاولات الفردية أصعب | +1 |
| G10 التصحيحات في AuditEvent | الأعمدة نفسها | يفقد FK المباشر؛ يحتاج `PublicId` على `Attendance`؛ `AuditEvent` يصبح مقروءًا في واجهة المشرف | +2 |

**توصيتي:**

- **اقبل G6 وG7 وG10.** المكسب واضح والخسارة صغيرة.
- **G1–G5 قرارك الأهم**، لأنه يحدد إن كان Provider محركًا منفصلًا أم مالكًا آخر على المحرك نفسه. أوصي بالمحرك الواحد.
- **في G8 وG9، ابدأ بـJSON.** الرجوع إلى الصفوف لاحقًا migration بيانات بسيطة.

---

## 9. عواقب الترحيل والحفاظ على البيانات

**الحالة الحاسمة: هل في قاعدة البيانات الحالية بيانات حقيقية يجب حفظها؟** لم أرَ القاعدة، لكن مشروعًا طلابيًا قبل الإنتاج غالبًا لا يحمل إلا بيانات اختبار وبذور.

### 9.1 إن لم تكن هناك بيانات حقيقية (المسار الموصى به)

1. **ضع tag على الـcommit الحالي** (مثل `db-v2.1-129`) حتى يبقى الـ23 Migration قابلة للاسترجاع.
2. احذف مجلد `Migrations`، وأنشئ **Migration أولية واحدة** للتصميم المختار من الـEntities الجديدة.
3. **راجع الـSQL الناتج** (`dotnet ef migrations script`) قبل تطبيقه، وطبّقه على قاعدة اختبار **جديدة**. لا تعدّل `CourseHubDB` ولا أي قاعدة لمشروع آخر.
4. **انقل الاختبارات حسب القاعدة لا حسب الجدول.** الثوابت المختبرة تنتقل:
   - مبادرة واحدة لكل شخص ← `InitiativeApplication`.
   - 3 مشرفين ← `StaffAppointment`.
   - منع تكرار المكافأة ← `PersonalRewardEntry`/`GroupRewardEntry`.

   أما الاختبارات التي كانت تحرس الاتساق بين نسختين مدموجتين (مثل FK الثلاثي) فتُحذف لأن موضوعها اختفى. **سجّلها بالاسم في تقرير التغيير** حتى لا يبدو حذفها إخفاءً لفشل.

**لا تحاول الوصول إلى التصميم الجديد بثلاثين Migration تدريجية فوق الـ23.** كل دمج في EF Core يولّد افتراضيًا `DropTable` و`CreateTable`، أي فقدان بيانات صامتًا، إلا إذا كتبت نسخ البيانات يدويًا.

### 9.2 إن كانت هناك بيانات يجب حفظها

كل دمج يمر بأربع خطوات: **توسيع** (إضافة الأعمدة)، ثم **نسخ** بـ`migrationBuilder.Sql`، ثم **تحقق** (أعداد ومجاميع وFKs)، ثم **تضييق** (إسقاط القديم). الحذف في Migration منفصلة **بعد** التحقق. ثلاثة أمثلة من هذا المخطط:

**(أ) `InitiativeMembership` ← `InitiativeApplication`.** الربط مباشر لأن `UQ ApplicationId` يضمن 1:1.
- انسخ إلى صف الطلب: `Status` و`EndedAtUtc` و`CapacityReleasedAtUtc` و`WithdrawalCutoffAtUtc`.
- أعِد توجيه `InitiativeGroupPlacement.MembershipId` و`InitiativeCompletion.MembershipId` إلى `ApplicationId`.
- **الخطر:** في الفترة بين إسقاط `UXF PersonId` على العضوية وإنشائه على الطلب لا يحرس قاعدة المبادرة الواحدة أي فهرس. نفّذ الخطوتين في معاملة واحدة أثناء إيقاف الكتابة.
- **يُفقد:** `PublicId` الخاص بالعضوية. إن كان مكشوفًا في API أو رابط، احفظه في عمود `LegacyMembershipPublicId`.

**(ب) ثلاث حالات تحقق ← `VerificationCase`.**
- أدخل صفوف Provider وCoach بـ`INSERT…SELECT`.
- احفظ جدول ربط مؤقتًا `(OldTable, OldId, NewId)`، لأن قيم `IDENTITY` ستتغير، ثم أعِد توجيه الـFKs.
- قيم `PublicId` من نوع GUID تُنقل كما هي، فالمراجع الخارجية لا تنكسر.
- تحقق: عدد الصفوف الجديدة = مجموع القديمة، وكل `EvidenceFileId` ما زال يشير إلى ملف موجود.

**(ج) `AttendanceCorrection` ← `AuditEvent`.**
- انقل الأعمدة كالتالي: `OldStatus`→`BeforeStatus`، `NewStatus`→`AfterStatus`، `CorrectedByPersonId`→`ActorPersonId`. احتفظ بـ`CreatedAtUtc` الأصلي. جدولا الحضور **لا يملكان `PublicId`** في القاموس، فأضِفه أولًا ليصبح `ResourcePublicId`.
- **يُفقد:** FK الحقيقي من التصحيح إلى الحضور. التاريخ نفسه لا يضيع.

**دمجات JSON** (`AssessmentResponse`، أسئلة وإجابات النماذج) تُنقل بـ`FOR JSON PATH` لكل أب. **تفقد نهائيًا** `CreatedAtUtc` و`RowVersion` لكل صف ابن، إلا إذا أُدرجت داخل الـJSON. قرر ذلك قبل النقل.

**إعادة التسمية** (`Institution` ← `Organization`) يجب أن تكون `RenameTable` صريحًا في الـMigration، لا تغيير اسم كيان يتركه EF يولّد حذفًا وإنشاءً.

---

## 10. قرارات مطلوبة منك قبل أي كود

1. **النطاق:** A (21) أم B (54) أم C (71)؟ وهل Provider أو Shield ضمن B؟
2. **الدمجات الخلافية:** G1–G5 (محرك تشغيل واحد للمبادرة والمزوّد)، وG6 (العضوية داخل الطلب). الباقي يمكن أن أوصي به افتراضيًا.
3. **أين التنفيذ؟** إن كانت الـ23 Migration موجودة، أعطني المسار لأتحقق من تطابقها مع القاموس، وأخبرني هل تحمل بيانات يجب حفظها. هذا يحدد 9.1 أم 9.2.
4. **تناقضات القاموس مع قراراتك** (القسم 5) تُصلح في أي تصميم تختاره:
   - تحرير السعة عند `Removed/Completed` (قرار #11).
   - إعادة التقديم بعد `Rejected` (قرار #9).
   - نماذج Provider (§16.3).
   - `UseLimit` في دعوة المجموعة: §13.2 يذكره، وv2 حذفته.

**لا كود ولا Migrations ولا إعادة تصميم حتى تختار.**
