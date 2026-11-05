# DeepSprout v4 — تتبع الفحوص الـ330 المسجلة إلى المخطط الجديد

> **ملف مُولَّد** من `model/*.mjs` بواسطة `node generate.mjs`. لا تحرره يدويًا؛ عدّل النموذج ثم أعد التوليد.

المصدر: `../phase-b/final-regression/*.jsonl` (330 فحصًا، كلها PASS في 1 نوفمبر على `DeepSprout_Validation`). كل فحص يظهر هنا مرة واحدة بقرار صريح؛ لا يُحذف فحص بصمت لأن جدوله اختفى.

| القرار | المعنى | العدد |
|---|---|---:|
| CARRY | الثابت نفسه على الجدول نفسه (أو اسمه الجديد): يُنقل كما هو | 140 |
| REWRITE | الثابت نفسه يُفرض الآن بجدول/قيد آخر بعد الدمج: يُعاد كتابته | 101 |
| STRUCTURAL | كان يحرس اتساق نسختين من حقيقة واحدة؛ النسخة اختفت، والبديل المسمى يثبت الضمان | 6 |
| DEFER | ميزته مؤجلة؛ يعود معها | 22 |
| REGENERATE | بيئة/عدد جداول/حفظ بيانات/ملخص: يُعاد توليده لقاعدة v4 | 61 |
| **المجموع** | | **330** |

## الفحوص البنيوية (STRUCTURAL) وبدائلها

| الفحص | الأصل | البديل |
|---|---|---|
| `COACH-STAGE-TIMES` | SQL 547; The INSERT statement conflicted with the CHECK constraint "CK_ProgramStage_Times" | المراحل داخل StagesJson؛ البديل: NEW-PROG-STAGES-VALIDATION (تحقق C# عند النشر يرفض تواريخ مرحلة مقلوبة). |
| `COACH-STAGE-SEALED` | SQL 55005; Program stages cannot be added after publication | لا يمكن إضافة مرحلة لنسخة منشورة لأنها عمود في صف إلحاقي؛ يغطيه COACH-REVISION-IMMUTABLE. |
| `IE-CONTENT-ORDER` | SQL 547; The INSERT statement conflicted with the CHECK constraint "CK_InitiativeContent_O | المحتوى داخل PublishedSnapshotJson؛ البديل: NEW-INIT-SNAPSHOT-VALIDATION (ترتيب المكوّنات يُتحقق عند النشر). |
| `OPS-DELIVERY-IMMUTABLE` | SQL 54003; Delivery attempt is append-only | سجل كل محاولة انتقل إلى السجلات المنظمة؛ البديل: NEW-OPS-OUTBOX-DELIVERY (Delivered ⇒ DeliveredAtUtc، والحالة النهائية لا تُعاد فتحها). |
| `PROV-OFFER-UNIQUE` | SQL 2601; Cannot insert duplicate key row in object 'provider.SeatOffer' with unique index | العرض حالة للحجز نفسه، فلا يمكن وجود عرضين حيين؛ البديل: NEW-PROV-OFFER-ONCE (OfferExpired/OfferDeclined نهائيتان ولا تعودان إلى Offered). |
| `SESS-POOL-OWNER` | SQL 547; The INSERT statement conflicted with the FOREIGN KEY constraint "FK_SessionRegist | لا "مسبح" منفصل؛ البديل: NEW-SESS-MODE-OFFERED (تسجيل InPerson في جلسة Online يُرفض بالمشغّل). |

## الجدول الكامل

| الجناح | الفحص | النتيجة السابقة | التفصيل السابق | القرار | الهدف في v4 | ملاحظة |
|---|---|---|---|---|---|---|
| coach-participation | `CP-ENV` | PASS | DESKTOP-A4AL2KR/DeepSprout_Validation; SPID=79 | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| coach-participation | `CP-SCHEMA` | PASS | 10 Coach tables, 12 migrations, zero disabled or untrusted FK/CHECK | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| coach-participation | `CP-PROGRAM-OWNER-FK` | PASS | SQL 547; The INSERT statement conflicted with the FOREIGN KEY constraint "FK_ProgramGroupMembership_ | **REWRITE** | coach.GroupMembership | FK (GroupId, ProgramId) → OperationalGroup(Id, ProgramId). |
| coach-participation | `CP-MEMBER-UNIQUE` | PASS | SQL 2601; Cannot insert duplicate key row in object 'coach.ProgramGroupMembership' with unique index | **REWRITE** | coach.GroupMembership | UQ (GroupId, PersonId) WHERE Status=Active؛ أضف حالة: العودة بعد Ended مسموحة. |
| coach-participation | `CP-MEMBER-STATUS` | PASS | SQL 547; The INSERT statement conflicted with the CHECK constraint "CK_ProgramGroupMembership_Status | **CARRY** | coach.GroupMembership |  |
| coach-participation | `CP-INVITE-KIND` | PASS | SQL 58007; Program group invitation requires a Program group | **REWRITE** | coach.GroupMembership | CK Invited: الدعوة تتطلب ProgramId (لا دعوة بريدية لمجموعة مبادرة). |
| coach-participation | `CP-INVITE-UNIQUE` | PASS | SQL 2601; Cannot insert duplicate key row in object 'coach.ProgramGroupInvitation' with unique index | **REWRITE** | coach.GroupMembership | UQ (GroupId, NormalizedEmail) WHERE Status='Invited'. |
| coach-participation | `CP-ASSIGN-PARENT` | PASS | SQL 58005; Coach assignment must match its group and active Initiative appointment | **CARRY** | coach.GroupCoachAssignment | التعيين عبر org.StaffAppointment(Id, InitiativeId). |
| coach-participation | `CP-ASSIGN-RACE` | PASS | SPIDs=80,81; errors=2601,0 | **CARRY** | coach.GroupCoachAssignment |  |
| coach-participation | `CP-COMPLETION-REVISION` | PASS | SQL 547; The INSERT statement conflicted with the FOREIGN KEY constraint "FK_ProgramCompletion_Progr | **REWRITE** | session.Completion | FK (ProgramRevisionId, ProgramId). |
| coach-participation | `CP-EVIDENCE-OWNER` | PASS | SQL 547; The INSERT statement conflicted with the FOREIGN KEY constraint "FK_ProgramCompletion_Evide | **REWRITE** | session.Completion | FK (EvidenceEventId, PersonId). |
| coach-participation | `CP-COMPLETION-UNIQUE` | PASS | SQL 2601; Cannot insert duplicate key row in object 'coach.ProgramCompletion' with unique index 'IX_ | **REWRITE** | session.Completion | UQ (ProgramId, PersonId) WHERE ProgramId IS NOT NULL. |
| coach-participation | `CP-PLACEMENT-GROUP-OWNER` | PASS | SQL 547; The INSERT statement conflicted with the FOREIGN KEY constraint "FK_InitiativeGroupPlacemen | **REWRITE** | coach.GroupMembership | FK (GroupId, InitiativeId) وFK (ApplicationId, InitiativeId, PersonId). |
| coach-participation | `CP-PRESERVATION` | PASS | M1 and Activity fixture rows retained | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| coach-participation | `CP-SUMMARY` | PASS | failures=0; fixtureTag=coach-part-f7fb65ca3c | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| coach | `COACH-ENV` | PASS | DESKTOP-A4AL2KR/DeepSprout_Validation; SPID=79 | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| coach | `COACH-SCHEMA` | PASS | 5 Coach foundation tables, 9 migrations, all FK/CHECK trusted | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| coach | `COACH-APPROVAL-STATUS` | PASS | SQL 547; The INSERT statement conflicted with the CHECK constraint "CK_CoachApproval_Status". The co | **REWRITE** | org.VerificationCase | CK Status لـKind=Coach. |
| coach | `COACH-PUBLISH-GUARD` | PASS | SQL 55002; Published Program requires a revision | **REWRITE** | coach.CoachProgram | صار CHECK (Published ⇒ CurrentRevisionId) بدل مشغّل. |
| coach | `COACH-REVISION-RACE` | PASS | SPIDs=80,81; errors=2601,0 | **CARRY** | coach.ProgramRevision |  |
| coach | `COACH-STAGE-TIMES` | PASS | SQL 547; The INSERT statement conflicted with the CHECK constraint "CK_ProgramStage_Times". The conf | **STRUCTURAL** | coach.ProgramRevision | المراحل داخل StagesJson؛ البديل: NEW-PROG-STAGES-VALIDATION (تحقق C# عند النشر يرفض تواريخ مرحلة مقلوبة). |
| coach | `COACH-STAGE-IMMUTABLE` | PASS | SQL 55004; Program stage is immutable | **REWRITE** | coach.ProgramRevision | المراحل ثابتة لأنها داخل نسخة إلحاقية؛ اختبار TR_ProgramRevision_Immutable على StagesJson. |
| coach | `COACH-REVISION-IMMUTABLE` | PASS | SQL 55003; Program revision is immutable | **CARRY** | coach.ProgramRevision |  |
| coach | `COACH-STAGE-SEALED` | PASS | SQL 55005; Program stages cannot be added after publication | **STRUCTURAL** | coach.ProgramRevision | لا يمكن إضافة مرحلة لنسخة منشورة لأنها عمود في صف إلحاقي؛ يغطيه COACH-REVISION-IMMUTABLE. |
| coach | `COACH-OWNER-IMMUTABLE` | PASS | SQL 55001; Coach Program owner is immutable | **CARRY** | coach.CoachProgram |  |
| coach | `COACH-GROUP-XOR` | PASS | SQL 547; The INSERT statement conflicted with the CHECK constraint "CK_OperationalGroup_Parent". The | **CARRY** | coach.OperationalGroup |  |
| coach | `COACH-GROUP-NULLABLE` | PASS | nullable parent and XOR hold for Program group | **CARRY** | coach.OperationalGroup |  |
| coach | `COACH-GROUP-PARENT-IMMUTABLE` | PASS | SQL 55006; Operational Group parent cannot change | **CARRY** | coach.OperationalGroup |  |
| coach | `COACH-EF-OUTPUT` | PASS | EF Core inserted triggered Program and Group with generated IDs | **CARRY** | coach.CoachProgram | EF Core مع جداول عليها مشغّلات (OUTPUT clause). |
| coach | `COACH-M1-PRESERVATION` | PASS | M1, Lab, and Shield rows remain present | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| coach | `COACH-SUMMARY` | PASS | failures=0; fixtureTag=coach-1e6541daa0 | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| commercial | `COM-ENV` | PASS | DESKTOP-A4AL2KR/DeepSprout_Validation; SPID=79 | **DEFER** | — | Commercial مؤجل (§20 غير موقّع). |
| commercial | `COM-SCHEMA` | PASS | 5 Commercial tables, 21 migrations, trusted FK/CHECK | **DEFER** | — | Commercial مؤجل (§20 غير موقّع). |
| commercial | `COM-PLAN-PRICE` | PASS | SQL 547; The INSERT statement conflicted with the CHECK constraint "CK_PlanVersion_Price". The confl | **DEFER** | — | Commercial مؤجل (§20 غير موقّع). |
| commercial | `COM-PLAN-IMMUTABLE` | PASS | SQL 66001; Plan version is immutable | **DEFER** | — | Commercial مؤجل (§20 غير موقّع). |
| commercial | `COM-FEATURE-LIMIT` | PASS | SQL 547; The INSERT statement conflicted with the CHECK constraint "CK_PlanFeature_Limit". The confl | **DEFER** | — | Commercial مؤجل (§20 غير موقّع). |
| commercial | `COM-SUB-PAYER-XOR` | PASS | SQL 547; The INSERT statement conflicted with the CHECK constraint "CK_Subscription_Payer". The conf | **DEFER** | — | Commercial مؤجل (§20 غير موقّع). |
| commercial | `COM-SUB-WINDOW` | PASS | SQL 547; The UPDATE statement conflicted with the CHECK constraint "CK_Subscription_Window". The con | **DEFER** | — | Commercial مؤجل (§20 غير موقّع). |
| commercial | `COM-SUB-PAYER-IMMUTABLE` | PASS | SQL 66003; Subscription payer and pinned plan are immutable | **DEFER** | — | Commercial مؤجل (§20 غير موقّع). |
| commercial | `COM-ALLOC-BENEFICIARY-XOR` | PASS | SQL 547; The INSERT statement conflicted with the CHECK constraint "CK_EntitlementAllocation_Benefic | **DEFER** | — | Commercial مؤجل (§20 غير موقّع). |
| commercial | `COM-ALLOC-WINDOW` | PASS | SQL 547; The UPDATE statement conflicted with the CHECK constraint "CK_EntitlementAllocation_Window" | **DEFER** | — | Commercial مؤجل (§20 غير موقّع). |
| commercial | `COM-USAGE-RACE` | PASS | SPIDs=86,80; errors=66007,0 | **DEFER** | — | Commercial مؤجل (§20 غير موقّع). |
| commercial | `COM-DIRECT-OVERLIMIT` | PASS | SQL 66007; Entitlement usage outside allocation range | **DEFER** | — | Commercial مؤجل (§20 غير موقّع). |
| commercial | `COM-CORRECTION` | PASS | compensating quantity restored entitlement | **DEFER** | — | Commercial مؤجل (§20 غير موقّع). |
| commercial | `COM-NEGATIVE-BALANCE` | PASS | SQL 66007; Entitlement usage outside allocation range | **DEFER** | — | Commercial مؤجل (§20 غير موقّع). |
| commercial | `COM-IDEMPOTENCY` | PASS | SQL 2601; Cannot insert duplicate key row in object 'commercial.UsageLedger' with unique index 'IX_U | **DEFER** | — | Commercial مؤجل (§20 غير موقّع). |
| commercial | `COM-LEDGER-IMMUTABLE` | PASS | SQL 66006; Usage ledger is append-only | **DEFER** | — | Commercial مؤجل (§20 غير موقّع). |
| commercial | `COM-PRESERVATION` | PASS | M1 and Partnership rows retained | **DEFER** | — | Commercial مؤجل (§20 غير موقّع). |
| commercial | `COM-SUMMARY` | PASS | failures=0; fixtureTag=commercial-96c81ce6e4 | **DEFER** | — | Commercial مؤجل (§20 غير موقّع). |
| community | `COMM-ENV` | PASS | DESKTOP-A4AL2KR/DeepSprout_Validation; SPID=79 | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| community | `COMM-SCHEMA` | PASS | 9 community tables, 14 migrations, trusted FK/CHECK | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| community | `COMM-POST-EVIDENCE-OWNER` | PASS | SQL 547; The INSERT statement conflicted with the FOREIGN KEY constraint "FK_Post_EvidenceEvent_Shar | **CARRY** | community.* |  |
| community | `COMM-POST-PUBLISH-TIME` | PASS | SQL 547; The INSERT statement conflicted with the CHECK constraint "CK_Post_Published". The conflict | **CARRY** | community.* |  |
| community | `COMM-POST-OWNER` | PASS | SQL 60001; Post author is immutable | **CARRY** | community.* |  |
| community | `COMM-COMMENT-STATUS` | PASS | SQL 547; The INSERT statement conflicted with the CHECK constraint "CK_Comment_Status". The conflict | **CARRY** | community.* |  |
| community | `COMM-COMMENT-OWNER` | PASS | SQL 60002; Comment owner and post are immutable | **CARRY** | community.* |  |
| community | `COMM-REACTION-RACE` | PASS | SPIDs=81,80; errors=2601,0 | **CARRY** | community.* |  |
| community | `COMM-BOOKMARK-UNIQUE` | PASS | SQL 2601; Cannot insert duplicate key row in object 'community.Bookmark' with unique index 'IX_Bookm | **CARRY** | community.* |  |
| community | `COMM-REPORT-XOR` | PASS | SQL 547; The INSERT statement conflicted with the CHECK constraint "CK_ContentReport_Target". The co | **CARRY** | community.* |  |
| community | `COMM-REPORT-TARGET-IMMUTABLE` | PASS | SQL 60003; Content report target and reporter are immutable | **CARRY** | community.* |  |
| community | `COMM-MODERATION-IMMUTABLE` | PASS | SQL 60004; Moderation decision is append-only | **CARRY** | community.* |  |
| community | `COMM-CHECKIN-MEMBER-FK` | PASS | SQL 547; The INSERT statement conflicted with the FOREIGN KEY constraint "FK_JointGoalCheckIn_JointG | **DEFER** | — | Joint Goals مستبعدة. |
| community | `COMM-CHECKIN-ACTIVE` | PASS | SQL 60006; Joint goal check-in requires active goal membership | **DEFER** | — | Joint Goals مستبعدة. |
| community | `COMM-CHECKIN-IMMUTABLE` | PASS | SQL 60005; Joint goal check-in is append-only | **DEFER** | — | Joint Goals مستبعدة. |
| community | `COMM-PRESERVATION` | PASS | Task and M1 rows remain present | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| community | `COMM-SUMMARY` | PASS | failures=0; fixtureTag=community-b61c5a3ef0 | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| evidence | `EVIDENCE-ENV` | PASS | DESKTOP-A4AL2KR/DeepSprout_Validation; SPID=79 | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| evidence | `EVIDENCE-SCHEMA` | PASS | 5 Evidence tables, 10 migrations, all FK/CHECK trusted | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| evidence | `EVIDENCE-CORRECTION-OWNER` | PASS | SQL 547; The INSERT statement conflicted with the FOREIGN KEY SAME TABLE constraint "FK_EvidenceEven | **CARRY** | evidence.* |  |
| evidence | `EVIDENCE-CORRECTION-UNIQUE` | PASS | SQL 2601; Cannot insert duplicate key row in object 'evidence.EvidenceEvent' with unique index 'IX_E | **CARRY** | evidence.* |  |
| evidence | `EVIDENCE-CORRECTION-CHAIN` | PASS | SQL 56002; Only an accepted source event can be invalidated | **CARRY** | evidence.* |  |
| evidence | `EVIDENCE-IMMUTABLE` | PASS | SQL 56001; Evidence event is append-only | **CARRY** | evidence.* |  |
| evidence | `EVIDENCE-POLICY-IMMUTABLE` | PASS | SQL 56003; Reward policy version is immutable | **CARRY** | evidence.* |  |
| evidence | `EVIDENCE-REWARD-OWNER` | PASS | SQL 547; The INSERT statement conflicted with the FOREIGN KEY constraint "FK_PersonalRewardEntry_Evi | **CARRY** | evidence.* |  |
| evidence | `EVIDENCE-GRANT-RACE` | PASS | SPIDs=80,81; errors=0,2601; policy version does not duplicate grant | **CARRY** | evidence.* |  |
| evidence | `EVIDENCE-GRANT-IMMUTABLE` | PASS | SQL 56004; Personal reward entry is append-only | **CARRY** | evidence.* |  |
| evidence | `EVIDENCE-REVERSAL-UNIQUE` | PASS | SQL 2601; Cannot insert duplicate key row in object 'evidence.PersonalRewardEntry' with unique index | **CARRY** | evidence.* |  |
| evidence | `EVIDENCE-REVERSAL-CHAIN` | PASS | SQL 56005; Reversal must refer to a grant | **CARRY** | evidence.* |  |
| evidence | `EVIDENCE-GARDEN-OWNER` | PASS | SQL 547; The INSERT statement conflicted with the FOREIGN KEY constraint "FK_GroupGarden_Operational | **REWRITE** | evidence.GroupRewardEntry | FK (GroupId, ProgramId) → OperationalGroup(Id, ProgramId) يرفض مجموعة داخلية لمبادرة. |
| evidence | `EVIDENCE-GARDEN-XOR` | PASS | SQL 547; The INSERT statement conflicted with the CHECK constraint "CK_GroupGarden_Owner". The confl | **REWRITE** | evidence.GroupRewardEntry | CK Owner. |
| evidence | `EVIDENCE-GARDEN-IMMUTABLE` | PASS | SQL 56008; Group Garden owner is immutable | **REWRITE** | evidence.GroupRewardEntry | المالك عمود في صف إلحاقي؛ TR_GroupRewardEntry_Immutable. |
| evidence | `EVIDENCE-GROUP-GRANT-UNIQUE` | PASS | SQL 2601; Cannot insert duplicate key row in object 'evidence.GroupRewardEntry' with unique index 'I | **REWRITE** | evidence.GroupRewardEntry | UQ (EvidenceEventId, EffectCode) WHERE Grant — أقوى: يمنع المنح لحديقتين. |
| evidence | `EVIDENCE-GROUP-IMMUTABLE` | PASS | SQL 56006; Group reward entry is append-only | **CARRY** | evidence.* |  |
| evidence | `EVIDENCE-PRESERVATION` | PASS | M1, Lab, Shield and Coach data retained | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| evidence | `EVIDENCE-SUMMARY` | PASS | failures=0; fixtureTag=evidence-1ab8e9abda | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| forms | `FORM-ENV` | PASS | DESKTOP-A4AL2KR/DeepSprout_Validation; SPID=79 | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| forms | `FORM-SCHEMA` | PASS | 12 Forms/Competition tables, 22 migrations, trusted FK/CHECK | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| forms | `FORM-WINDOW` | PASS | SQL 547; The INSERT statement conflicted with the CHECK constraint "CK_FormVersion_Window". The conf | **CARRY** | forms.* |  |
| forms | `FORM-VERSION-IMMUTABLE` | PASS | SQL 67001; Form version is immutable | **CARRY** | forms.* |  |
| forms | `FORM-QUESTION-VERSION` | PASS | SQL 547; The INSERT statement conflicted with the FOREIGN KEY constraint "FK_FormAnswer_FormQuestion | **CARRY** | forms.* |  |
| forms | `FORM-ONE-VALUE` | PASS | SQL 547; The INSERT statement conflicted with the CHECK constraint "CK_FormAnswer_OneValue". The con | **REWRITE** | forms.FormAnswer | CK OneValue يشمل OptionId (قيمة واحدة بالضبط). |
| forms | `FORM-REQUIRED` | PASS | SQL 67006; Required Form question has no answer | **CARRY** | forms.* |  |
| forms | `FORM-CHOICE-QUESTION` | PASS | SQL 547; The INSERT statement conflicted with the FOREIGN KEY constraint "FK_FormAnswerChoice_FormQu | **REWRITE** | forms.FormAnswer | FK (OptionId, QuestionId). |
| forms | `FORM-ANSWER-SEALED` | PASS | SQL 67007; Submitted Form answers are immutable | **CARRY** | forms.* |  |
| forms | `FORM-CHOICE-SEALED` | PASS | SQL 67009; Submitted Form answer choices are immutable | **REWRITE** | forms.FormAnswer | الاختيارات صفوف إجابة؛ ختم الإجابات يغطيها. |
| forms | `FORM-RESPONSE-TERMINAL` | PASS | SQL 67004; Submitted Form response owner and terminal state are immutable | **CARRY** | forms.* |  |
| forms | `FORM-RESPONSE-RACE` | PASS | SPIDs=80,86; errors=0,2601 | **CARRY** | forms.* |  |
| forms | `FORM-SCORE-COMPETITION` | PASS | SQL 547; The INSERT statement conflicted with the FOREIGN KEY constraint "FK_CompetitionCriterionSco | **REWRITE** | forms.CompetitionCriterionScore | FK (JudgmentId, FormVersionId). |
| forms | `FORM-SCORE-RUBRIC` | PASS | SQL 547; The INSERT statement conflicted with the FOREIGN KEY constraint "FK_CompetitionCriterionSco | **REWRITE** | forms.CompetitionCriterionScore | FK (CriterionId, FormVersionId). |
| forms | `FORM-SCORE-IMMUTABLE` | PASS | SQL 67015; Competition criterion score is append-only | **CARRY** | forms.* |  |
| forms | `FORM-JUDGMENT-IMMUTABLE` | PASS | SQL 67014; Competition judgment is append-only | **CARRY** | forms.* |  |
| forms | `FORM-PRESERVATION` | PASS | M1 and Commercial rows retained | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| forms | `FORM-SUMMARY` | PASS | failures=0; fixtureTag=forms-dc214c656b | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| institution-extensions | `IE-ENV` | PASS | DESKTOP-A4AL2KR/DeepSprout_Validation; SPID=79 | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| institution-extensions | `IE-SCHEMA` | PASS | 13 Institution tables, 19 migrations, trusted FK/CHECK | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| institution-extensions | `IE-OFFER-CAPACITY` | PASS | SQL 64003; Initiative capacity exceeded by active memberships and offers | **REWRITE** | institution.InitiativeApplication | Offered حالة تحجز مقعدًا على صف الطلب. |
| institution-extensions | `IE-APPROVE-HELD` | PASS | SQL 51212; Initiative capacity is full | **REWRITE** | institution.InitiativeApplication | Offered حالة تحجز مقعدًا على صف الطلب. |
| institution-extensions | `IE-APPROVE-TRANSFER` | PASS | own held offer became one membership within approval transaction | **REWRITE** | institution.InitiativeApplication | Offered → Accepted على الصف نفسه؛ أثبت أن العدّ لا يتغير وأن قرارًا واحدًا كُتب. |
| institution-extensions | `IE-APPROVE-FULL` | PASS | SQL 51212; Initiative capacity is full | **REWRITE** | institution.InitiativeApplication | Offered حالة تحجز مقعدًا على صف الطلب. |
| institution-extensions | `IE-CONTENT-ORDER` | PASS | SQL 547; The INSERT statement conflicted with the CHECK constraint "CK_InitiativeContent_Order". The | **STRUCTURAL** | institution.InitiativeRevision | المحتوى داخل PublishedSnapshotJson؛ البديل: NEW-INIT-SNAPSHOT-VALIDATION (ترتيب المكوّنات يُتحقق عند النشر). |
| institution-extensions | `IE-CANCEL-AUTH` | PASS | SQL 51705; Actor has no cancellation authority | **REWRITE** | institution.Initiative / InitiativeApplication | الإلغاء يغلق العروض الحية (Offered → Cancelled) على صف الطلب. |
| institution-extensions | `IE-CANCEL-AUTH-STATE` | PASS | unauthorized request preserved offer | **REWRITE** | institution.Initiative / InitiativeApplication | الإلغاء يغلق العروض الحية (Offered → Cancelled) على صف الطلب. |
| institution-extensions | `IE-CANCEL-ROLLBACK` | PASS | injected outer failure rolled back Initiative, offer, and application | **REWRITE** | institution.Initiative / InitiativeApplication | الإلغاء يغلق العروض الحية (Offered → Cancelled) على صف الطلب. |
| institution-extensions | `IE-CANCEL-OFFER` | PASS | permanent cancellation closed offer and application, one offer audit | **REWRITE** | institution.Initiative / InitiativeApplication | الإلغاء يغلق العروض الحية (Offered → Cancelled) على صف الطلب. |
| institution-extensions | `IE-CANCEL-DUPLICATE` | PASS | SQL 51703; Initiative is already cancelled | **REWRITE** | institution.Initiative / InitiativeApplication | الإلغاء يغلق العروض الحية (Offered → Cancelled) على صف الطلب. |
| institution-extensions | `IE-OFFER-COMMAND-AUTH` | PASS | SQL 64007; Actor has no seat-offer authority | **REWRITE** | institution.InitiativeApplication | Offered حالة تحجز مقعدًا على صف الطلب. |
| institution-extensions | `IE-OFFER-RACE` | PASS | SPIDs=86,80; errors=0,64003 | **REWRITE** | institution.InitiativeApplication | Offered حالة تحجز مقعدًا على صف الطلب. |
| institution-extensions | `IE-PRESERVATION` | PASS | M1 and Provider rows remain present | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| institution-extensions | `IE-SUMMARY` | PASS | failures=0; fixtureTag=inst-ext-740c1fbce2 | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| lab | `LAB-ENV` | PASS | DESKTOP-A4AL2KR/DeepSprout_Validation; SPID=79 | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| lab | `LAB-SCHEMA` | PASS | 7 Lab/personal tables, 5 migrations, zero untrusted or disabled FK/CHECK | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| lab | `LAB-WINDOW-INTERVAL` | PASS | SQL 547; The INSERT statement conflicted with the CHECK constraint "CK_AssessmentWindow_Interval". T | **CARRY** | lab.* |  |
| lab | `LAB-WINDOW-UNIQUE` | PASS | SQL 2601; Cannot insert duplicate key row in object 'lab.AssessmentWindow' with unique index 'IX_Ass | **CARRY** | lab.* |  |
| lab | `LAB-WINDOW-OWNER` | PASS | SQL 547; The INSERT statement conflicted with the FOREIGN KEY constraint "FK_AssessmentAttempt_Asses | **CARRY** | lab.* |  |
| lab | `LAB-VERSION-INSTRUMENT` | PASS | SQL 547; The INSERT statement conflicted with the FOREIGN KEY constraint "FK_AssessmentAttempt_Instr | **REWRITE** | lab.AssessmentAttempt | FK (InstrumentVersionId, InstrumentCode). |
| lab | `LAB-PROFILE-OWNER` | PASS | SQL 547; The INSERT statement conflicted with the FOREIGN KEY constraint "FK_IndividualProfile_Asses | **CARRY** | lab.* |  |
| lab | `LAB-RESPONSE-TRIAL` | PASS | SQL 547; The INSERT statement conflicted with the CHECK constraint "CK_AssessmentResponse_Trial". Th | **CARRY** | lab.* |  |
| lab | `LAB-RESPONSE-SEALED` | PASS | SQL 52003; Assessment responses are sealed after submission | **CARRY** | lab.* |  |
| lab | `LAB-VERSION-IMMUTABLE` | PASS | SQL 52001; Published instrument version is immutable | **CARRY** | lab.* |  |
| lab | `LAB-PROFILE-LINK` | PASS | same-person profile link persisted | **CARRY** | lab.* |  |
| lab | `LAB-BASELINE-RACE` | PASS | SPIDs=81,80; errors=0,2601; valid=1 | **CARRY** | lab.* |  |
| lab | `LAB-SCORE-IMMUTABLE` | PASS | SQL 52002; Assessment score is append-only | **CARRY** | lab.* |  |
| lab | `LAB-TRANSITION` | PASS | SQL 52004; Unsupported assessment attempt transition | **CARRY** | lab.* |  |
| lab | `LAB-M1-PRESERVATION` | PASS | M1 rows and its applied migration remain present | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| lab | `LAB-SUMMARY` | PASS | failures=0; fixtureTag=lab-098c7e7f45 | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| m1 | `ENV-01` | PASS | DESKTOP-A4AL2KR/DeepSprout_Validation; version=17.0.1000.7; SPID=79 | **REGENERATE** | — |  |
| m1 | `BLD-01` | PASS | titleless stage-one draft saved | **REWRITE** | institution.Initiative | مسودة بلا عنوان تُحفظ في DraftJson. |
| m1 | `BLD-02` | PASS | SQL 51105; Draft rowversion conflict | **REWRITE** | institution.Initiative | تعارض RowVersion على الجذر. |
| m1 | `BLD-03` | PASS | SQL 51107; Six builder stages are incomplete | **REWRITE** | institution.Initiative | النشر يرفض مسودة ناقصة المراحل. |
| m1 | `BLD-04` | PASS | root/revision/draft/audit committed; revision=179 | **REWRITE** | institution.Initiative | الجذر والنسخة والتدقيق في معاملة واحدة، وتفريغ المسودة. |
| m1 | `BLD-05` | PASS | SQL 51041; Published initiative revisions are immutable | **CARRY** | institution.InitiativeRevision |  |
| m1 | `SQL-CK-01` | PASS | SQL 547; The UPDATE statement conflicted with the CHECK constraint "CK_Initiative_Capacity". The con | **REWRITE** | institution.InitiativeRevision | CK Capacity BETWEEN 1 AND 135 على النسخة. |
| m1 | `SQL-CK-02` | PASS | SQL 547; The UPDATE statement conflicted with the CHECK constraint "CK_InitiativeDraft_Json1". The c | **REWRITE** | institution.Initiative | CK DraftStage BETWEEN 1 AND 6. |
| m1 | `SQL-04` | PASS | SQL 547; The INSERT statement conflicted with the FOREIGN KEY constraint "FK_InitiativeApplicationDe | **REWRITE** | coach.GroupMembership / session.Completion | FK (ApplicationId, InitiativeId, PersonId) يحل محل FK العضوية الثلاثي. |
| m1 | `SQL-03` | PASS | SQL 547; The INSERT statement conflicted with the FOREIGN KEY constraint "FK_InitiativeMembership_In | **REWRITE** | institution.InitiativeApplication | FK (TermsRevisionId, InitiativeId). |
| m1 | `BLD-03-GUARD` | PASS | SQL 51040; Published initiative requires a matching revision | **REWRITE** | institution.Initiative | CHECK Published ⇒ CurrentRevisionId. |
| m1 | `HIST-01` | PASS | SQL 51042; Application decisions are append-only | **CARRY** | institution.InitiativeApplicationDecision |  |
| m1 | `APP-01` | PASS | pending withdrawal without membership | **CARRY** | institution.InitiativeApplication |  |
| m1 | `APP-02` | PASS | attempts=1598,1599; AttemptNo=2 | **CARRY** | institution.InitiativeApplication |  |
| m1 | `APP-03` | PASS | SQL 51204; Applicant is blocked | **REWRITE** | institution.InitiativeApplication | Blocked داخل الفهرس الفريد المفتوح؛ أضف BlockLifted يسمح بمحاولة جديدة. |
| m1 | `APP-04` | PASS | SQL 51205; Open or accepted application already exists | **REWRITE** | institution.InitiativeApplication | الفهرس الفريد المفلتر على (InitiativeId, PersonId). |
| m1 | `APP-05` | PASS | SQL 51209; Actor has no current admission authority | **CARRY** | institution.InitiativeApplication |  |
| m1 | `APP-05-STATE` | PASS | no unauthorized membership; one denial audit | **CARRY** | institution.InitiativeApplication |  |
| m1 | `APP-06` | PASS | retry returned one membership and one decision | **REWRITE** | institution.InitiativeApplication | إعادة الأمر تعيد صفًا مقبولًا واحدًا وقرارًا واحدًا (مع IdempotencyRecord). |
| m1 | `SQL-CK-03` | PASS | SQL 547; The UPDATE statement conflicted with the CHECK constraint "CK_InitiativeMembership_EndRelea | **REWRITE** | institution.InitiativeApplication | CK Membership وCK Open. |
| m1 | `MEM-02` | PASS | withdrawal released capacity before cutoff | **REWRITE** | institution.InitiativeApplication | نهاية العضوية تحرر السعة فورًا (حالة لا تحجز مقعدًا). |
| m1 | `MEM-03-FUNCTION` | PASS | exact boundary rejected by SQL function | **CARRY** | institution.InitiativeApplication | CanWithdraw(now, cutoff) = now < cutoff. |
| m1 | `MEM-04` | PASS | SQL 51303; Voluntary withdrawal is unavailable at or after the effective cutoff | **CARRY** | institution.InitiativeApplication |  |
| m1 | `MEM-05` | PASS | SQL 51212; Initiative capacity is full | **REWRITE** | institution.InitiativeApplication | نهاية العضوية تحرر السعة فورًا (حالة لا تحجز مقعدًا). |
| m1 | `MEM-05-AUTH` | PASS | SQL 51102; Representative grant is not active | **REWRITE** | institution.InitiativeApplication | نهاية العضوية تحرر السعة فورًا (حالة لا تحجز مقعدًا). |
| m1 | `MEM-05-RESTORE` | PASS | active representative restored suspended membership | **REWRITE** | institution.InitiativeApplication | نهاية العضوية تحرر السعة فورًا (حالة لا تحجز مقعدًا). |
| m1 | `MEM-06-REMOVED` | PASS | removed immediately releases capacity | **REWRITE** | institution.InitiativeApplication | نهاية العضوية تحرر السعة فورًا (حالة لا تحجز مقعدًا). |
| m1 | `MEM-06-COMPLETED` | PASS | completed immediately releases capacity | **REWRITE** | institution.InitiativeApplication | نهاية العضوية تحرر السعة فورًا (حالة لا تحجز مقعدًا). |
| m1 | `MEM-07` | PASS | earlier start did not remove existing withdrawal right | **CARRY** | institution.InitiativeApplication |  |
| m1 | `MEM-03--1-STATE` | PASS | now=cutoff-1ms; status=Withdrawn; occupied=0; auditDelta=1 | **CARRY** | institution.InitiativeApplication | cutoff−1ms ينجح. |
| m1 | `MEM-03-0-ERROR` | PASS | SQL 51303; Voluntary withdrawal is unavailable at or after the effective cutoff | **CARRY** | institution.InitiativeApplication | عند الحد يُرفض. |
| m1 | `MEM-03-0-STATE` | PASS | now=cutoff0ms; status=Accepted; occupied=1; auditDelta=0 | **CARRY** | institution.InitiativeApplication |  |
| m1 | `MEM-03-1-ERROR` | PASS | SQL 51303; Voluntary withdrawal is unavailable at or after the effective cutoff | **CARRY** | institution.InitiativeApplication |  |
| m1 | `MEM-03-1-STATE` | PASS | now=cutoff+1ms; status=Accepted; occupied=1; auditDelta=0 | **CARRY** | institution.InitiativeApplication |  |
| m1 | `RESCHEDULE-POSTPONE` | PASS | old=2026-11-04T18:14:30.9180000; extended=2026-11-06T10:14:30.9240000; historical revision retained | **CARRY** | institution.InitiativeRevision / InitiativeApplication |  |
| m1 | `RESCHEDULE-POSTPONE-WITHDRAW` | PASS | actual withdrawal command succeeded after old cutoff but before extended cutoff | **CARRY** | institution.InitiativeApplication |  |
| m1 | `RESCHEDULE-ADVANCE` | PASS | new=2026-11-03T12:14:30.9290000; preserved=2026-11-06T10:14:30.9240000; withdrawal command succeeded | **CARRY** | institution.InitiativeApplication |  |
| m1 | `RESCHEDULE-UNSAFE` | PASS | SQL 51601; Invalid rescheduled interval | **CARRY** | institution.InitiativeRevision |  |
| m1 | `MEM-08-UNAUTHORIZED` | PASS | SQL 51705; Actor has no cancellation authority | **REWRITE** | institution.Initiative / InitiativeApplication | الإلغاء الدائم يحدّث صفوف الطلب الموحد: المفتوحة والمقبولة والموقوفة → Cancelled مع EndReason، والتاريخ المكتمل يبقى. |
| m1 | `MEM-08-UNAUTHORIZED-STATE` | PASS | denied command left initiative and pending application intact | **REWRITE** | institution.Initiative / InitiativeApplication | الإلغاء الدائم يحدّث صفوف الطلب الموحد: المفتوحة والمقبولة والموقوفة → Cancelled مع EndReason، والتاريخ المكتمل يبقى. |
| m1 | `MEM-08-ROOT` | PASS | root cancellation reason, actor, and time persisted | **REWRITE** | institution.Initiative / InitiativeApplication | الإلغاء الدائم يحدّث صفوف الطلب الموحد: المفتوحة والمقبولة والموقوفة → Cancelled مع EndReason، والتاريخ المكتمل يبقى. |
| m1 | `MEM-08-APPLICATIONS` | PASS | open application explicitly cancelled; accepted application history retained | **REWRITE** | institution.Initiative / InitiativeApplication | الإلغاء الدائم يحدّث صفوف الطلب الموحد: المفتوحة والمقبولة والموقوفة → Cancelled مع EndReason، والتاريخ المكتمل يبقى. |
| m1 | `MEM-08-MEMBERSHIPS` | PASS | accepted and suspended terminated, capacity released, completed history retained | **REWRITE** | institution.Initiative / InitiativeApplication | الإلغاء الدائم يحدّث صفوف الطلب الموحد: المفتوحة والمقبولة والموقوفة → Cancelled مع EndReason، والتاريخ المكتمل يبقى. |
| m1 | `MEM-08-AUDIT` | PASS | root, application, and membership audit events present | **REWRITE** | institution.Initiative / InitiativeApplication | الإلغاء الدائم يحدّث صفوف الطلب الموحد: المفتوحة والمقبولة والموقوفة → Cancelled مع EndReason، والتاريخ المكتمل يبقى. |
| m1 | `MEM-08-DUPLICATE` | PASS | SQL 51703; Initiative is already cancelled | **REWRITE** | institution.Initiative / InitiativeApplication | الإلغاء الدائم يحدّث صفوف الطلب الموحد: المفتوحة والمقبولة والموقوفة → Cancelled مع EndReason، والتاريخ المكتمل يبقى. |
| m1 | `MEM-08-DUPLICATE-STATE` | PASS | duplicate request added no audit or decision side effects | **REWRITE** | institution.Initiative / InitiativeApplication | الإلغاء الدائم يحدّث صفوف الطلب الموحد: المفتوحة والمقبولة والموقوفة → Cancelled مع EndReason، والتاريخ المكتمل يبقى. |
| m1 | `MEM-08-NO-APPLICATION` | PASS | SQL 51201; Initiative is not open | **REWRITE** | institution.Initiative / InitiativeApplication | الإلغاء الدائم يحدّث صفوف الطلب الموحد: المفتوحة والمقبولة والموقوفة → Cancelled مع EndReason، والتاريخ المكتمل يبقى. |
| m1 | `MEM-08-NO-APPROVAL` | PASS | SQL 51201; Initiative is not open | **REWRITE** | institution.Initiative / InitiativeApplication | الإلغاء الدائم يحدّث صفوف الطلب الموحد: المفتوحة والمقبولة والموقوفة → Cancelled مع EndReason، والتاريخ المكتمل يبقى. |
| m1 | `MEM-08-NO-RESCHEDULE` | PASS | SQL 51602; Initiative is not published | **REWRITE** | institution.Initiative / InitiativeApplication | الإلغاء الدائم يحدّث صفوف الطلب الموحد: المفتوحة والمقبولة والموقوفة → Cancelled مع EndReason، والتاريخ المكتمل يبقى. |
| m1 | `MEM-08-PERMANENT` | PASS | SQL 51706; Cancelled initiative is permanent | **REWRITE** | institution.Initiative / InitiativeApplication | الإلغاء الدائم يحدّث صفوف الطلب الموحد: المفتوحة والمقبولة والموقوفة → Cancelled مع EndReason، والتاريخ المكتمل يبقى. |
| m1 | `MEM-08-ADMIN` | PASS | active platform cancellation grant authorized cancellation | **REWRITE** | institution.Initiative / InitiativeApplication | الإلغاء الدائم يحدّث صفوف الطلب الموحد: المفتوحة والمقبولة والموقوفة → Cancelled مع EndReason، والتاريخ المكتمل يبقى. |
| m1 | `MEM-08-NO-PUBLICATION` | PASS | SQL 51106; Publishable draft not found | **REWRITE** | institution.Initiative / InitiativeApplication | الإلغاء الدائم يحدّث صفوف الطلب الموحد: المفتوحة والمقبولة والموقوفة → Cancelled مع EndReason، والتاريخ المكتمل يبقى. |
| m1 | `MEM-08-ROLLBACK-ERROR` | PASS | SQL 51799; Injected cancellation failure | **REWRITE** | institution.Initiative / InitiativeApplication | الإلغاء الدائم يحدّث صفوف الطلب الموحد: المفتوحة والمقبولة والموقوفة → Cancelled مع EndReason، والتاريخ المكتمل يبقى. |
| m1 | `MEM-08-ROLLBACK-STATE` | PASS | injected late failure rolled back root, application, membership, decision and test trigger | **REWRITE** | institution.Initiative / InitiativeApplication | الإلغاء الدائم يحدّث صفوف الطلب الموحد: المفتوحة والمقبولة والموقوفة → Cancelled مع EndReason، والتاريخ المكتمل يبقى. |
| m1 | `MEM-03-CLOCK-PRIVILEGE` | PASS | runtime direct clock procedure denied with SQL 229 | **CARRY** | institution.InitiativeApplication |  |
| m1 | `MEM-03-RUNTIME-WRAPPER` | PASS | runtime public command SQL 0; voluntary withdrawal succeeded | **CARRY** | institution.InitiativeApplication |  |
| m1 | `SUP-03` | PASS | SQL 51033; Verified email does not match invitation | **REWRITE** | org.StaffAppointment | بريد غير مطابق يبقي Pending. |
| m1 | `SUP-01` | PASS | third supervisor accepted | **REWRITE** | org.StaffAppointment |  |
| m1 | `SUP-02` | PASS | SQL 51034; Three active supervisors already assigned | **REWRITE** | org.StaffAppointment | المشرف الرابع يُرفض (proc + TR_StaffAppointment_SupervisorCap). |
| m1 | `SUP-04` | PASS | SQL 51209; Actor has no current admission authority | **REWRITE** | org.StaffAppointment / institution.InitiativeApplication | مشرف مسحوب لا يوافق. |
| m1 | `SEC-01-DB` | PASS | SQL 51501; Secure file access denied | **CARRY** | files.SecureFile |  |
| m1 | `BLD-05-RUNTIME` | PASS | direct UPDATE denied with SQL 229 | **CARRY** | institution.InitiativeRevision | DENY UPDATE لدور التشغيل. |
| m1 | `CAP-01` | PASS | 135th acceptance occupied the last seat | **REWRITE** | institution.InitiativeApplication | الطلب 135 يأخذ آخر مقعد؛ 136 يُرفض أو يُصطف؛ سباق اتصالين ينتج مقعدًا واحدًا. |
| m1 | `CAP-02` | PASS | SQL 51212; Initiative capacity is full | **REWRITE** | institution.InitiativeApplication | الطلب 135 يأخذ آخر مقعد؛ 136 يُرفض أو يُصطف؛ سباق اتصالين ينتج مقعدًا واحدًا. |
| m1 | `CAP-03` | PASS | SPIDs=81,80; errors=0,51212; occupied=1; decisions=1; audits=1 | **REWRITE** | institution.InitiativeApplication | الطلب 135 يأخذ آخر مقعد؛ 136 يُرفض أو يُصطف؛ سباق اتصالين ينتج مقعدًا واحدًا. |
| m1 | `MEM-01` | PASS | SPIDs=80,81; errors=2601,0; active=1; decisions=1; audits=1 | **REWRITE** | institution.InitiativeApplication | UQ (PersonId) WHERE Status IN ('Accepted','Suspended') في سباق اتصالين. |
| m1 | `SQL-05` | PASS | SQL 2601; Cannot insert duplicate key row in object 'institution.InitiativeMembership' with unique i | **REWRITE** | institution.InitiativeApplication | تكرار عضوية فعالة يُرفض بالفهرس نفسه. |
| m1 | `SUMMARY` | PASS | failures=0; fixtureTag=m1-3709eb28e4 | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| operations | `OPS-ENV` | PASS | DESKTOP-A4AL2KR/DeepSprout_Validation; SPID=79 | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| operations | `OPS-SCHEMA` | PASS | 2 governance and 5 ops tables including M1 audit; 7 migrations; all constraints trusted | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| operations | `GOV-RELEASE-UNIQUE` | PASS | SQL 2601; Cannot insert duplicate key row in object 'governance.ContentRelease' with unique index 'I | **CARRY** | ops.* / governance.ContentRelease |  |
| operations | `GOV-RELEASE-IMMUTABLE` | PASS | SQL 54001; Content release is immutable; publish a new version | **CARRY** | ops.* / governance.ContentRelease |  |
| operations | `GOV-ACTION-IMMUTABLE` | PASS | SQL 54002; Governance action is append-only | **REWRITE** | ops.AuditEvent | إجراء الحوكمة حدث تدقيق إلحاقي. |
| operations | `OPS-OUTBOX-ATTEMPTS` | PASS | SQL 547; The UPDATE statement conflicted with the CHECK constraint "CK_OutboxMessage_Attempts". The  | **CARRY** | ops.* / governance.ContentRelease |  |
| operations | `OPS-OUTBOX-TERMINAL` | PASS | SQL 54004; Terminal outbox status cannot be reopened | **CARRY** | ops.* / governance.ContentRelease |  |
| operations | `OPS-NOTIFICATION-UNIQUE` | PASS | SQL 2601; Cannot insert duplicate key row in object 'ops.Notification' with unique index 'IX_Notific | **CARRY** | ops.* / governance.ContentRelease |  |
| operations | `OPS-DELIVERY-IMMUTABLE` | PASS | SQL 54003; Delivery attempt is append-only | **STRUCTURAL** | ops.OutboxMessage | سجل كل محاولة انتقل إلى السجلات المنظمة؛ البديل: NEW-OPS-OUTBOX-DELIVERY (Delivered ⇒ DeliveredAtUtc، والحالة النهائية لا تُعاد فتحها). |
| operations | `OPS-IDEMPOTENCY-HASH` | PASS | SQL 547; The INSERT statement conflicted with the CHECK constraint "CK_IdempotencyRecord_Hash". The  | **CARRY** | ops.* / governance.ContentRelease |  |
| operations | `OPS-IDEMPOTENCY-RACE` | PASS | SPIDs=81,80; errors=2601,0; one command key | **CARRY** | ops.* / governance.ContentRelease |  |
| operations | `OPS-DATA-PRESERVED` | PASS | M1, Lab and Shield data remained present | **CARRY** | ops.* / governance.ContentRelease |  |
| operations | `OPS-SUMMARY` | PASS | failures=0; fixtureTag=ops-32d18ecfe4 | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| partnership | `PART-ENV` | PASS | DESKTOP-A4AL2KR/DeepSprout_Validation; SPID=79 | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| partnership | `PART-SCHEMA` | PASS | 2 Partnership tables, 20 migrations, trusted FK/CHECK | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| partnership | `PART-PROGRAM-ACCEPTED-BY` | PASS | SQL 547; The UPDATE statement conflicted with the CHECK constraint "CK_ProgramLink_AcceptedBy". The  | **REWRITE** | partnership.PartnershipLink | القيد نفسه على الجدول الموحد. |
| partnership | `PART-PROGRAM-OWNER` | PASS | SQL 65002; Program link requires acceptance by Program owner | **REWRITE** | partnership.PartnershipLink | القيد نفسه على الجدول الموحد. |
| partnership | `PART-PROGRAM-ACTIVE-UNIQUE` | PASS | SQL 2601; Cannot insert duplicate key row in object 'partnership.ProgramLink' with unique index 'IX_ | **REWRITE** | partnership.PartnershipLink | القيد نفسه على الجدول الموحد. |
| partnership | `PART-EXPERIENCE-OWNER` | PASS | SQL 65004; Experience link requires acceptance by active Provider member | **REWRITE** | partnership.PartnershipLink | القيد نفسه على الجدول الموحد. |
| partnership | `PART-OWNERS-RETAINED` | PASS | accepted link did not transfer Program or Experience ownership | **CARRY** | partnership.PartnershipLink |  |
| partnership | `PART-LINK-RACE` | PASS | SPIDs=86,80; errors=2601,0 | **CARRY** | partnership.PartnershipLink |  |
| partnership | `PART-PRESERVATION` | PASS | Provider and M1 rows retained | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| partnership | `PART-SUMMARY` | PASS | failures=0; fixtureTag=partner-d508951b07 | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| provider-foundation | `PROV-ENV` | PASS | DESKTOP-A4AL2KR/DeepSprout_Validation; SPID=79 | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| provider-foundation | `PROV-SCHEMA` | PASS | 8 provider foundation tables, 16 migrations, all FK/CHECK trusted | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| provider-foundation | `PROV-MEMBERSHIP-UNIQUE` | PASS | SQL 2601; Cannot insert duplicate key row in object 'provider.ProviderMembership' with unique index  | **REWRITE** | org.OrganizationMember |  |
| provider-foundation | `PROV-EXPERIENCE-TIMES` | PASS | SQL 547; The INSERT statement conflicted with the CHECK constraint "CK_Experience_CapacityTimes". Th | **REWRITE** | provider.ExperienceRevision | الأوقات والسعة على النسخة. |
| provider-foundation | `PROV-REV-COST` | PASS | SQL 547; The INSERT statement conflicted with the CHECK constraint "CK_ExperienceRevision_Cost". The | **CARRY** | provider.* |  |
| provider-foundation | `PROV-REV-IMMUTABLE` | PASS | SQL 62001; Experience revision is immutable | **CARRY** | provider.* |  |
| provider-foundation | `PROV-DRAFT-BOOK` | PASS | SQL 62007; Published Experience not found | **CARRY** | provider.* |  |
| provider-foundation | `PROV-BOOK-RACE` | PASS | SPIDs=80,81; errors=0,62005 | **CARRY** | provider.* |  |
| provider-foundation | `PROV-DIRECT-CAPACITY` | PASS | SQL 62005; Experience capacity exceeded | **CARRY** | provider.* |  |
| provider-foundation | `PROV-REV-OWNER` | PASS | SQL 547; The INSERT statement conflicted with the FOREIGN KEY constraint "FK_ExperienceBooking_Exper | **CARRY** | provider.* |  |
| provider-foundation | `PROV-OFFER-HOLDS` | PASS | SQL 62005; Experience capacity exceeded | **REWRITE** | provider.ExperienceBooking | Offered يحجز مقعدًا. |
| provider-foundation | `PROV-OFFER-UNIQUE` | PASS | SQL 2601; Cannot insert duplicate key row in object 'provider.SeatOffer' with unique index 'IX_SeatO | **STRUCTURAL** | provider.ExperienceBooking | العرض حالة للحجز نفسه، فلا يمكن وجود عرضين حيين؛ البديل: NEW-PROV-OFFER-ONCE (OfferExpired/OfferDeclined نهائيتان ولا تعودان إلى Offered). |
| provider-foundation | `PROV-OFFER-RELEASE` | PASS | expired offer releases held seat | **REWRITE** | provider.ExperienceBooking |  |
| provider-foundation | `PROV-PRESERVATION` | PASS | M1 and Session rows retained | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| provider-foundation | `PROV-SUMMARY` | PASS | failures=0; fixtureTag=provider-5e53dac7ad | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| provider-operations | `PO-ENV` | PASS | DESKTOP-A4AL2KR/DeepSprout_Validation; SPID=79 | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| provider-operations | `PO-SCHEMA` | PASS | 17 Provider tables, 17 migrations, trusted FK/CHECK | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| provider-operations | `PO-STAFF-EMAIL` | PASS | SQL 63001; Provider appointment requires unexpired invitation and verified matching email | **REWRITE** | org.StaffAppointment |  |
| provider-operations | `PO-STAFF-SESSION-UNIQUE` | PASS | SQL 2601; Cannot insert duplicate key row in object 'provider.ProviderAppointmentSession' with uniqu | **REWRITE** | session.SessionDuty |  |
| provider-operations | `PO-COHORT-BOOKING` | PASS | SQL 63004; Active cohort member requires confirmed booking | **CARRY** | provider.ProviderCohortMember |  |
| provider-operations | `PO-COHORT-RACE` | PASS | SPIDs=80,81; errors=2601,0 | **CARRY** | provider.ProviderCohortMember |  |
| provider-operations | `PO-ATTENDANCE-RECORDER` | PASS | SQL 63007; Attendance recorder must be assigned to this Experience Session | **REWRITE** | session.Attendance |  |
| provider-operations | `PO-ATTENDANCE-EVIDENCE` | PASS | SQL 63006; Provider attendance evidence belongs to another person | **REWRITE** | session.Attendance | صار FK مركبًا (EvidenceEventId, PersonId) بدل مشغّل. |
| provider-operations | `PO-CORRECTION-IMMUTABLE` | PASS | SQL 63008; Provider attendance correction is append-only | **REWRITE** | session.AttendanceCorrection |  |
| provider-operations | `PO-COMPLETION-EVIDENCE` | PASS | SQL 63009; Camp completion evidence belongs to another person | **REWRITE** | session.Completion | FK مركب (EvidenceEventId, PersonId). |
| provider-operations | `PO-COMPLETION-UNIQUE` | PASS | SQL 2601; Cannot insert duplicate key row in object 'provider.CampCompletion' with unique index 'IX_ | **REWRITE** | session.Completion | UQ (BookingId). |
| provider-operations | `PO-INCIDENT` | PASS | incident linked to same Experience booking | **CARRY** | provider.ProviderIncident |  |
| provider-operations | `PO-PRESERVATION` | PASS | Provider foundation and M1 rows retained | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| provider-operations | `PO-SUMMARY` | PASS | failures=0; fixtureTag=provider-ops-11261096c0 | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| recovery | `REC-ENV` | PASS | DESKTOP-A4AL2KR/DeepSprout_Validation; SPID=79 | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| recovery | `REC-SCHEMA` | PASS | 11 Recovery/Activity tables, 11 migrations, trusted FK/CHECK | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| recovery | `REC-JOURNEY-ACTIVE` | PASS | SQL 2601; Cannot insert duplicate key row in object 'recovery.RecoveryJourney' with unique index 'IX | **REWRITE** | recovery.RecoveryCycle / personal.IndividualProfile | دورة حالية واحدة لكل شخص + ملف شخصي واحد. |
| recovery | `REC-CYCLE-OWNER` | PASS | SQL 547; The INSERT statement conflicted with the FOREIGN KEY constraint "FK_RecoveryCycle_RecoveryJ | **REWRITE** | recovery.RecoveryCycle | FK PersonId مباشر. |
| recovery | `REC-ACTIVE-CYCLE-RACE` | PASS | SPIDs=80,81; errors=2601,0 | **CARRY** | recovery.RecoveryCycle | الفهرس الآن على PersonId. |
| recovery | `REC-PLAN-IMMUTABLE` | PASS | SQL 57003; Accepted plan terms are immutable | **CARRY** | recovery.* / activity.* |  |
| recovery | `REC-PLAN-NO` | PASS | SQL 547; The INSERT statement conflicted with the CHECK constraint "CK_PlanRevision_No". The conflic | **CARRY** | recovery.* / activity.* |  |
| recovery | `ACT-TYPE` | PASS | SQL 547; The INSERT statement conflicted with the CHECK constraint "CK_PracticeDefinition_Type". The | **CARRY** | recovery.* / activity.* |  |
| recovery | `ACT-VERSION-TIER` | PASS | SQL 547; The INSERT statement conflicted with the CHECK constraint "CK_PracticeVersion_Tier". The co | **CARRY** | recovery.* / activity.* |  |
| recovery | `ACT-VERSION-IMMUTABLE` | PASS | SQL 57004; Practice version is immutable | **CARRY** | recovery.* / activity.* |  |
| recovery | `REC-ACTION-PRACTICE` | PASS | SQL 547; The INSERT statement conflicted with the CHECK constraint "CK_ScheduledAction_Practice". Th | **CARRY** | recovery.* / activity.* |  |
| recovery | `REC-ACTION-OWNER` | PASS | SQL 547; The INSERT statement conflicted with the FOREIGN KEY constraint "FK_ScheduledAction_Recover | **CARRY** | recovery.* / activity.* |  |
| recovery | `ACT-ATTEMPT-OWNER` | PASS | SQL 547; The INSERT statement conflicted with the FOREIGN KEY constraint "FK_PracticeAttempt_Schedul | **CARRY** | recovery.* / activity.* |  |
| recovery | `ACT-ATTEMPT-VERSION` | PASS | SQL 57006; Practice attempt must match its scheduled practice | **CARRY** | recovery.* / activity.* |  |
| recovery | `ACT-EVIDENCE-OWNER` | PASS | SQL 547; The UPDATE statement conflicted with the FOREIGN KEY constraint "FK_PracticeAttempt_Evidenc | **CARRY** | recovery.* / activity.* |  |
| recovery | `REC-COMPLETION-LINK` | PASS | same-person completed attempt linked to its scheduled action | **CARRY** | recovery.* / activity.* |  |
| recovery | `REC-COMPLETION-MISMATCH` | PASS | SQL 57005; Completed attempt must belong to the scheduled action | **CARRY** | recovery.* / activity.* |  |
| recovery | `ACT-ROUTINE-OWNER` | PASS | SQL 547; The INSERT statement conflicted with the FOREIGN KEY constraint "FK_RoutineCheckIn_OfflineR | **CARRY** | recovery.* / activity.* |  |
| recovery | `ACT-ROUTINE-EVIDENCE-OWNER` | PASS | SQL 547; The INSERT statement conflicted with the FOREIGN KEY constraint "FK_RoutineCheckIn_Evidence | **CARRY** | recovery.* / activity.* |  |
| recovery | `ACT-CHECKIN-RACE` | PASS | SPIDs=81,80; errors=2601,0 | **CARRY** | recovery.* / activity.* |  |
| recovery | `REC-REVIEW-IMMUTABLE` | PASS | SQL 57007; Weekly review is append-only | **CARRY** | recovery.* / activity.* |  |
| recovery | `ACT-PROGRESSION-TIER` | PASS | SQL 547; The INSERT statement conflicted with the CHECK constraint "CK_PracticeProgressionDecision_T | **CARRY** | recovery.* / activity.* |  |
| recovery | `REC-DATA-PRESERVATION` | PASS | M1 and Evidence rows remain present | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| recovery | `REC-SUMMARY` | PASS | failures=0; fixtureTag=recovery-7113b32bf8 | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| session | `SESS-ENV` | PASS | DESKTOP-A4AL2KR/DeepSprout_Validation; SPID=79 | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| session | `SESS-SCHEMA` | PASS | 10 session tables, 15 migrations, all FK/CHECK trusted | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| session | `SESS-TIME` | PASS | SQL 547; The INSERT statement conflicted with the CHECK constraint "CK_Session_Times". The conflict  | **CARRY** | session.* |  |
| session | `SESS-REV-IMMUTABLE` | PASS | SQL 61001; Session revision is immutable | **CARRY** | session.* |  |
| session | `SESS-DRAFT-REGISTER` | PASS | SQL 61012; Published Session capacity pool not found | **REWRITE** | session.SessionRegistration | جلسة غير منشورة أو نمط غير معروض يُرفض. |
| session | `SESS-CAPACITY-RACE` | PASS | SPIDs=80,81; errors=61005,0 | **REWRITE** | session.SessionRegistration | سعة النمط على Session تحت القفل. |
| session | `SESS-POOL-OWNER` | PASS | SQL 547; The INSERT statement conflicted with the FOREIGN KEY constraint "FK_SessionRegistration_Ses | **STRUCTURAL** | session.SessionRegistration | لا "مسبح" منفصل؛ البديل: NEW-SESS-MODE-OFFERED (تسجيل InPerson في جلسة Online يُرفض بالمشغّل). |
| session | `SESS-REV-OWNER` | PASS | SQL 547; The INSERT statement conflicted with the FOREIGN KEY constraint "FK_SessionRegistration_Ses | **CARRY** | session.* |  |
| session | `SESS-POOL-SHRINK` | PASS | SQL 61003; Capacity cannot shrink below confirmed registrations | **REWRITE** | session.Session | TR_Session_CapacityShrink. |
| session | `SESS-ATTENDANCE-OWNER` | PASS | SQL 547; The INSERT statement conflicted with the FOREIGN KEY constraint "FK_SessionAttendance_Sessi | **CARRY** | session.* |  |
| session | `SESS-EXCUSE-FACT` | PASS | SQL 61010; Absence excuse requires absent attendance and matching person/file | **CARRY** | session.* |  |
| session | `SESS-EXCUSE-PERSON` | PASS | SQL 61010; Absence excuse requires absent attendance and matching person/file | **CARRY** | session.* |  |
| session | `SESS-CORRECTION-IMMUTABLE` | PASS | SQL 61009; Attendance correction is append-only | **CARRY** | session.* |  |
| session | `SESS-STANDALONE-EMAIL` | PASS | SQL 61008; Active standalone supervisor requires matching verified email | **DEFER** | — | الجلسة المستقلة مؤجلة. |
| session | `SESS-PRESERVATION` | PASS | M1 and Community rows retained | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| session | `SESS-SUMMARY` | PASS | failures=0; fixtureTag=session-0ee67c2c24 | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| shield | `SHIELD-ENV` | PASS | DESKTOP-A4AL2KR/DeepSprout_Validation; SPID=79 | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| shield | `SHIELD-SCHEMA` | PASS | 6 Shield tables, 6 migrations, zero untrusted or disabled FK/CHECK | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| shield | `SHIELD-THRESHOLD` | PASS | SQL 547; The INSERT statement conflicted with the CHECK constraint "CK_ShieldConfiguration_Threshold | **REWRITE** | shield.ShieldConfiguration | ReminderThresholdMinutes. |
| shield | `SHIELD-SESSION-OWNER` | PASS | SQL 547; The INSERT statement conflicted with the FOREIGN KEY constraint "FK_ProtectionSession_Exten | **REWRITE** | shield.ProtectionSession | FK (InstallationId, PersonId) فقط؛ لا ارتباط بإعداد التذكير. |
| shield | `SHIELD-SESSION-TIME` | PASS | SQL 547; The INSERT statement conflicted with the CHECK constraint "CK_ProtectionSession_Times". The | **CARRY** | shield.* |  |
| shield | `SHIELD-PERIOD-OWNER` | PASS | SQL 547; The INSERT statement conflicted with the FOREIGN KEY constraint "FK_BrowserUsagePeriod_Shie | **CARRY** | shield.* |  |
| shield | `SHIELD-INGEST-TOTAL` | PASS | SQL 53011; Domain totals do not match period | **CARRY** | shield.* |  |
| shield | `SHIELD-INGEST-ROLLBACK` | PASS | invalid total inserted no period | **CARRY** | shield.* |  |
| shield | `SHIELD-INGEST-DOMAIN` | PASS | SQL 53014; Domain is not selected in this configuration | **CARRY** | shield.* |  |
| shield | `SHIELD-INGEST` | PASS | period and selected-domain totals committed together | **CARRY** | shield.* |  |
| shield | `SHIELD-DOMAIN-PAIR` | PASS | SQL 547; The INSERT statement conflicted with the FOREIGN KEY constraint "FK_BrowserUsageDomain_Brow | **CARRY** | shield.* |  |
| shield | `SHIELD-CONFIG-IMMUTABLE` | PASS | SQL 53001; Shield configuration is immutable | **CARRY** | shield.* |  |
| shield | `SHIELD-DOMAINS-SEALED` | PASS | SQL 53004; Selected domains are sealed after configuration use | **CARRY** | shield.* |  |
| shield | `SHIELD-PERIOD-IMMUTABLE` | PASS | SQL 53002; Browser usage period is append-only | **CARRY** | shield.* |  |
| shield | `SHIELD-SEQUENCE-RACE` | PASS | SPIDs=81,80; errors=0,2601; one sequence 2 | **CARRY** | shield.* |  |
| shield | `SHIELD-M1-LAB-PRESERVATION` | PASS | M1 and Lab rows and migration history retained | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| shield | `SHIELD-SUMMARY` | PASS | failures=0; fixtureTag=shield-bb089a6268 | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| task | `TASK-ENV` | PASS | DESKTOP-A4AL2KR/DeepSprout_Validation; SPID=79 | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| task | `TASK-SCHEMA` | PASS | 8 task tables, 13 migrations, all FK/CHECK trusted | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| task | `TASK-REV-IMMUTABLE` | PASS | SQL 59008; Published assignment revision is immutable | **CARRY** | task.* |  |
| task | `TASK-RECIPIENT-MEMBER` | PASS | SQL 59002; Recipient is not an active member of the assignment group | **REWRITE** | task.AssignmentRecipient | العضوية تُقرأ من coach.GroupMembership. |
| task | `TASK-RECIPIENT-OWNER` | PASS | SQL 59001; Assignment recipient owner is immutable | **CARRY** | task.* |  |
| task | `TASK-RECIPIENT-REV-FK` | PASS | SQL 547; The INSERT statement conflicted with the FOREIGN KEY constraint "FK_AssignmentRecipient_Ass | **CARRY** | task.* |  |
| task | `TASK-SUBMIT-DRAFT` | PASS | SQL 59009; Recipient is not eligible for submission | **CARRY** | task.* |  |
| task | `TASK-SUBMIT-PERSON` | PASS | SQL 59009; Recipient is not eligible for submission | **CARRY** | task.* |  |
| task | `TASK-SUBMIT-RACE` | PASS | SPIDs=80,81; errors=0,0; attempts=2 | **CARRY** | task.SubmissionAttempt | السجل الأصلي: errors=0,0؛ attempts=2. أكّد أن إرسالين متزامنين مقصودان (رقما محاولة مختلفان) وليس تكرارًا؛ وإلا أضف قفلًا على المستلم. |
| task | `TASK-ATTEMPT-REV` | PASS | SQL 59004; Submission revision or file owner does not match recipient | **CARRY** | task.* |  |
| task | `TASK-FILE-OWNER` | PASS | SQL 59004; Submission revision or file owner does not match recipient | **CARRY** | task.* |  |
| task | `TASK-ATTEMPT-IMMUTABLE` | PASS | SQL 59003; Submission attempt is append-only | **CARRY** | task.* |  |
| task | `TASK-REVIEW-EVIDENCE-OWNER` | PASS | SQL 59006; Review evidence must belong to submission recipient | **CARRY** | task.* |  |
| task | `TASK-REVIEW-IMMUTABLE` | PASS | SQL 59005; Review decision is append-only | **CARRY** | task.* |  |
| task | `TASK-NOTE-IMMUTABLE` | PASS | SQL 59007; Private review note is append-only | **CARRY** | task.* |  |
| task | `TASK-REPORT-DATES` | PASS | SQL 547; The INSERT statement conflicted with the CHECK constraint "CK_CoachReport_Dates". The confl | **REWRITE** | task.OperationalReport | CK Dates. |
| task | `TASK-PRESERVATION` | PASS | M1 and Recovery rows retained | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
| task | `TASK-SUMMARY` | PASS | failures=0; fixtureTag=task-0aec43407b | **REGENERATE** | — | يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير). |
