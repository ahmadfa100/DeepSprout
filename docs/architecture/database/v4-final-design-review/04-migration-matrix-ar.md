# DeepSprout v4 — مصفوفة الترحيل من 129 جدولًا

> **ملف مُولَّد** من `model/*.mjs` بواسطة `node generate.mjs`. لا تحرره يدويًا؛ عدّل النموذج ثم أعد التوليد.

## المطابقة الحسابية

| الإجراء | العدد |
|---|---:|
| KEEP (يبقى مصدر هوية لجدول نهائي، مع إعادة تسمية أو توسيع) | 87 |
| MERGE (محتواه ينتقل إلى جدول نهائي مسمى) | 33 |
| REMOVE (بلا وجهة) | 0 |
| DEFER (ميزة غير معتمدة أو مستبعدة) | 9 |
| **المجموع = جداول المنتج الحية في `DeepSprout_Validation`** | **129** |

**الجدول النهائي = KEEP = 87.** كل جدول نهائي له مصدر KEEP واحد بالضبط (يتحقق منه المولّد)، ولا يوجد جدول نهائي بلا أصل: التصميم لا يضيف كيانات جديدة، بل يعيد تشكيل الموجود ويسد ثغراته بأعمدة.

### حسب نوع التغيير (تمييز المالك بين الحذف والدمج والتأجيل)

| النوع | الصفوف |
|---|---:|
| إبقاء (مع تعديلات أعمدة) | 77 |
| دمج تمثيلين لحقيقة واحدة | 24 |
| إبقاء بإعادة تسمية/نقل مخطط | 10 |
| نقل إلى لقطة JSON ثابتة | 2 |
| تأجيل ميزة غير معتمدة | 6 |
| استبعاد ميزة قيد المراجعة | 3 |
| إزالة بنية غير لازمة | 6 |
| نقل telemetry من SQL إلى السجلات | 1 |

لا يوجد صف من نوع "إضعاف متطلب منتج". صفان فقط ينقلان تعقيدًا من SQL إلى C# بشكل مقصود وموثق: `coach.ProgramStage` (تحقق بنية JSON عند النشر) و`session.SessionCapacityPool` (مشغّل يتحقق أن الجلسة تعرض النمط). وصف واحد ينقل telemetry إلى السجلات: `ops.DeliveryAttempt`.

## المصفوفة الكاملة

عمودا FK الحية من كتالوج SQL الفعلي (`../review/live-schema.json`).

| # | الجدول الحالي | أعمدة | FK صادرة/واردة | الإجراء | الوجهة في v4 | النوع | التغيير | العاقبة العلائقية أو السلوكية |
|---:|---|---:|---|---|---|---|---|---|
| 1 | `activity.OfflineRoutine` | 8 | 1/1 | **KEEP** | `activity.OfflineRoutine` | إبقاء (مع تعديلات أعمدة) | يُضاف Hint وIsInitialCommitment وArchivedAtUtc، وScheduleRule يصبح ScheduleRuleJson. | لا فقد. |
| 2 | `activity.PracticeAttempt` | 14 | 4/1 | **KEEP** | `activity.PracticeAttempt` | إبقاء (مع تعديلات أعمدة) | يُضاف Source (Plan/OnDemand/Assignment) وScoreValue وحالة Cancelled. | لا فقد. |
| 3 | `activity.PracticeDefinition` | 7 | 0/1 | **KEEP** | `activity.PracticeDefinition` | إبقاء (مع تعديلات أعمدة) | قيم PracticeType تصبح رموزًا بلا مسافات؛ يُضاف Title وحالة Deprecated. | تحويل قيم النوع في الترحيل. |
| 4 | `activity.PracticeProgressionDecision` | 9 | 1/0 | **KEEP** | `activity.PracticeProgressionDecision` | إبقاء (مع تعديلات أعمدة) | DecisionCode (Advanced/Stayed/SteppedDown) مع CHECK على اتجاه المستوى وBasisAttemptId. | Accepted القديمة تصبح Advanced. |
| 5 | `activity.PracticeVersion` | 10 | 1/3 | **KEEP** | `activity.PracticeVersion` | إبقاء (مع تعديلات أعمدة) | يُضاف ContentJson وRulesJson؛ EvidenceTier مقيد. | لا فقد. |
| 6 | `activity.RoutineCheckIn` | 9 | 2/0 | **KEEP** | `activity.RoutineCheckIn` | إبقاء (مع تعديلات أعمدة) | يُضاف RecordedAtUtc وفهرس فريد للدليل. | لا فقد. |
| 7 | `coach.CoachApproval` | 9 | 3/0 | **MERGE** | `org.VerificationCase` | دمج تمثيلين لحقيقة واحدة | صف VerificationCase(Kind=Coach, OrganizationId=NULL, ApplicantPersonId=PersonId). | يختفي جدول؛ "هل الشخص مدرب معتمد" = استعلام على VerificationCase بقيد فريد مفلتر لحالة مفتوحة/معتمدة واحدة. |
| 8 | `coach.CoachProgram` | 8 | 1/6 | **KEEP** | `coach.CoachProgram` | إبقاء (مع تعديلات أعمدة) | يُضاف CurrentRevisionId وDraftJson وحالة Suspended؛ Title ينتقل إلى النسخة. | مسودة البرنامج صار لها مكان (كانت مفقودة). |
| 9 | `coach.GroupCoachAssignment` | 10 | 4/0 | **KEEP** | `coach.GroupCoachAssignment` | إبقاء (مع تعديلات أعمدة) | InitiativeAppointmentId → StaffAppointmentId مع مفتاح مركب (StaffAppointmentId, InitiativeId)، وHandoverNote. | لا فقد. |
| 10 | `coach.InitiativeGroupPlacement` | 10 | 4/0 | **MERGE** | `coach.GroupMembership` | دمج تمثيلين لحقيقة واحدة | صف GroupMembership(InitiativeId, ApplicationId, PersonId, Status=Active\|Ended). MembershipId → ApplicationId. | المفتاح المركب يشير الآن إلى (ApplicationId, InitiativeId, PersonId) بدل العضوية المدموجة؛ تاريخ النقل يبقى صفوفًا. |
| 11 | `coach.OperationalGroup` | 9 | 2/9 | **KEEP** | `coach.OperationalGroup` | إبقاء (مع تعديلات أعمدة) | بلا تغيير جوهري. | لا فقد. |
| 12 | `coach.ProgramCompletion` | 11 | 5/0 | **MERGE** | `session.Completion` | دمج تمثيلين لحقيقة واحدة | صف Completion(Kind=Program, ProgramId, ProgramRevisionId). | D10 يوحّد التصنيف؛ القيد الفريد (ProgramId, PersonId) يبقى فهرسًا مفلترًا. |
| 13 | `coach.ProgramGroupInvitation` | 9 | 1/0 | **MERGE** | `coach.GroupMembership` | دمج تمثيلين لحقيقة واحدة | صف GroupMembership(Status=Invited, NormalizedEmail, TokenHash, InviteExpiresAtUtc) يتحول إلى Active عند القبول. | الدعوة والعضوية مرحلتان لحقيقة واحدة؛ يُفقد المفتاح الأجنبي بين الجدولين لأنه صار الصف نفسه. |
| 14 | `coach.ProgramGroupMembership` | 9 | 4/0 | **KEEP** | `coach.GroupMembership` | إبقاء بإعادة تسمية/نقل مخطط | يُعاد تسميته ويُوسَّع ليستوعب تسكين المبادرة ودعوة البرنامج؛ UQ (GroupId, PersonId) يصبح مفلترًا على Active. | يُصلح منع العودة إلى مجموعة بعد مغادرتها. |
| 15 | `coach.ProgramRevision` | 7 | 1/2 | **KEEP** | `coach.ProgramRevision` | إبقاء (مع تعديلات أعمدة) | تُضاف أعمدة العرض وStagesJson. | لا فقد. |
| 16 | `coach.ProgramStage` | 7 | 1/0 | **MERGE** | `coach.ProgramRevision` | نقل إلى لقطة JSON ثابتة | المراحل تصبح StagesJson داخل النسخة الثابتة. | تفقد قيود SQL على ترقيم المرحلة وتواريخها؛ يعوّضها تحقق C# عند النشر، والنسخة لا تتغير بعده ولا يشير أي FK إلى مرحلة. |
| 17 | `commercial.EntitlementAllocation` | 12 | 4/1 | **DEFER** | — | تأجيل ميزة غير معتمدة | §20: لا كتالوج أسعار/حصص موقّع. | لا جدول في v4؛ البيانات الحالية تبقى في قاعدة التحقق دون حذف. |
| 18 | `commercial.PlanFeature` | 6 | 1/0 | **DEFER** | — | تأجيل ميزة غير معتمدة | كما سبق. | كما سبق. |
| 19 | `commercial.PlanVersion` | 8 | 0/2 | **DEFER** | — | تأجيل ميزة غير معتمدة | كما سبق. | كما سبق. |
| 20 | `commercial.Subscription` | 11 | 4/1 | **DEFER** | — | تأجيل ميزة غير معتمدة | كما سبق. | كما سبق. |
| 21 | `commercial.UsageLedger` | 6 | 1/0 | **DEFER** | — | تأجيل ميزة غير معتمدة | كما سبق. | كما سبق. |
| 22 | `community.Bookmark` | 6 | 2/0 | **KEEP** | `community.Bookmark` | إبقاء (مع تعديلات أعمدة) | إلحاقي (لا RowVersion). | لا فقد. |
| 23 | `community.Comment` | 8 | 2/1 | **KEEP** | `community.Comment` | إبقاء (مع تعديلات أعمدة) | بلا تغيير جوهري. | لا فقد. |
| 24 | `community.ContentReport` | 9 | 3/1 | **KEEP** | `community.ContentReport` | إبقاء (مع تعديلات أعمدة) | يُضاف Details وقيد فريد لبلاغ مفتوح واحد لكل مبلّغ وهدف. | لا فقد. |
| 25 | `community.JointGoal` | 9 | 1/1 | **DEFER** | — | استبعاد ميزة قيد المراجعة | Community Challenge / Joint Goals مستبعدة بانتظار قرار المالك. | لا جدول في v4. |
| 26 | `community.JointGoalCheckIn` | 6 | 1/0 | **DEFER** | — | استبعاد ميزة قيد المراجعة | كما سبق. | كما سبق. |
| 27 | `community.JointGoalMember` | 7 | 2/1 | **DEFER** | — | استبعاد ميزة قيد المراجعة | كما سبق. | كما سبق. |
| 28 | `community.ModerationDecision` | 7 | 2/0 | **KEEP** | `community.ModerationDecision` | إبقاء (مع تعديلات أعمدة) | ReportId يصبح اختياريًا ويُضاف هدف مباشر (PostId XOR CommentId) للإشراف الاستباقي. | لا فقد. |
| 29 | `community.Post` | 10 | 2/4 | **KEEP** | `community.Post` | إبقاء (مع تعديلات أعمدة) | يُضاف TopicCode وImageFileId. | لا فقد. |
| 30 | `community.Reaction` | 7 | 2/0 | **KEEP** | `community.Reaction` | إبقاء (مع تعديلات أعمدة) | إلحاقي. | لا فقد. |
| 31 | `evidence.EvidenceEvent` | 12 | 2/12 | **KEEP** | `evidence.EvidenceEvent` | إبقاء (مع تعديلات أعمدة) | يُضاف Reason (إلزامي للإبطال) وRecordedByPersonId؛ SourceContext وProvenance مقيدان. | لا فقد. |
| 32 | `evidence.GroupGarden` | 8 | 3/1 | **MERGE** | `evidence.GroupRewardEntry` | إزالة بنية غير لازمة | المالك (InitiativeId أو GroupId+ProgramId) يصبح أعمدة على المدخل. | يختفي "مشهد" بلا بيانات خاصة؛ XOR المالك ومنع المجموعات الداخلية يبقيان بقيد CHECK ومفتاح مركب. حالة الحديقة مشتقة من حالة المالك. |
| 33 | `evidence.GroupRewardEntry` | 10 | 4/1 | **KEEP** | `evidence.GroupRewardEntry` | إبقاء (مع تعديلات أعمدة) | GroupGardenId → InitiativeId \| (GroupId, ProgramId)؛ يُضاف ContributorPersonId بمفتاح مركب مع الدليل؛ فريد (EvidenceEventId, EffectCode) عبر كل الحدائق. | يمنع منح الحدث نفسه لحديقتين مرتبطتين. |
| 34 | `evidence.PersonalRewardEntry` | 10 | 4/1 | **KEEP** | `evidence.PersonalRewardEntry` | إبقاء (مع تعديلات أعمدة) | EffectCode دلالي + PracticeType. | قيم EffectCode القديمة تُحوَّل؛ لا فقد. |
| 35 | `evidence.RewardPolicyVersion` | 6 | 0/2 | **KEEP** | `evidence.RewardPolicyVersion` | إبقاء (مع تعديلات أعمدة) | RuleRef → RulesJson ثابت. | لا فقد. |
| 36 | `files.SecureFile` | 12 | 1/8 | **KEEP** | `files.SecureFile` | إبقاء (مع تعديلات أعمدة) | يُضاف PublicId وPurpose مقيد وDeletedAtUtc. | لا فقد. |
| 37 | `forms.Competition` | 11 | 1/2 | **MERGE** | `forms.Form` | دمج تمثيلين لحقيقة واحدة | Form(Purpose=Competition) + FormVersion (النافذة، RulesText، EntryPolicyJson) + Status ResultsPublished. | §15.4 يعدّ المسابقة نموذجًا؛ RulesVersion يصبح FormVersion. |
| 38 | `forms.CompetitionCriterion` | 6 | 1/1 | **KEEP** | `forms.CompetitionCriterion` | إبقاء (مع تعديلات أعمدة) | (CompetitionId, RubricVersion) → FormVersionId؛ يُضاف MaxScore وWeight. | المفتاح المركب يبقى بصيغة (Id, FormVersionId). |
| 39 | `forms.CompetitionCriterionScore` | 7 | 2/0 | **KEEP** | `forms.CompetitionCriterionScore` | إبقاء (مع تعديلات أعمدة) | المفاتيح المركبة عبر FormVersionId. | لا فقد. |
| 40 | `forms.CompetitionEntry` | 12 | 3/1 | **MERGE** | `forms.FormResponse` | دمج تمثيلين لحقيقة واحدة | المشاركة رد على نسخة المسابقة؛ Body/FileId يصبحان FormAnswer. | حالة Reviewed تصبح مشتقة من وجود CompetitionJudgment. |
| 41 | `forms.CompetitionJudgment` | 9 | 2/1 | **KEEP** | `forms.CompetitionJudgment` | إبقاء (مع تعديلات أعمدة) | EntryId → ResponseId، RubricVersion → FormVersionId. | لا فقد. |
| 42 | `forms.Form` | 9 | 1/1 | **KEEP** | `forms.Form` | إبقاء (مع تعديلات أعمدة) | InitiativeId يصبح اختياريًا مع ExperienceId (XOR)؛ يُضاف CurrentVersionId وDraftJson وغرض Feedback/Competition. | يُصلح منع المزوّد من امتلاك نموذج مشارك. |
| 43 | `forms.FormAnswer` | 11 | 3/1 | **KEEP** | `forms.FormAnswer` | إبقاء (مع تعديلات أعمدة) | ChoiceCode النصي → OptionId بمفتاح مركب؛ الاختيار المتعدد عدة صفوف. | لا فقد؛ تكسب الإجابة المفردة مفتاحًا أجنبيًا إلى الخيار. |
| 44 | `forms.FormAnswerChoice` | 7 | 2/0 | **MERGE** | `forms.FormAnswer` | دمج تمثيلين لحقيقة واحدة | كل اختيار يصبح صف FormAnswer بـOptionId. | حقيقة "الخيار المختار" كانت ممثلة مرتين؛ قيد "خيار واحد للمفرد" ينتقل إلى مشغّل. |
| 45 | `forms.FormQuestion` | 7 | 1/2 | **KEEP** | `forms.FormQuestion` | إبقاء (مع تعديلات أعمدة) | يُضاف SortOrder وValidationJson ونوع السؤال مقيد. | لا فقد. |
| 46 | `forms.FormQuestionOption` | 6 | 1/1 | **KEEP** | `forms.FormQuestionOption` | إبقاء (مع تعديلات أعمدة) | بلا تغيير جوهري. | لا فقد. |
| 47 | `forms.FormResponse` | 11 | 2/1 | **KEEP** | `forms.FormResponse` | إبقاء (مع تعديلات أعمدة) | يُضاف (Id, PersonId) فريد ليكون هدف مفاتيح من الطلب والحجز والتسجيل. | لا فقد. |
| 48 | `forms.FormVersion` | 8 | 1/2 | **KEEP** | `forms.FormVersion` | إبقاء (مع تعديلات أعمدة) | يُضاف AllowMultipleResponses وRulesText وEntryPolicyJson وSealedAtUtc. | لا فقد. |
| 49 | `governance.ContentRelease` | 8 | 2/2 | **KEEP** | `governance.ContentRelease` | إبقاء (مع تعديلات أعمدة) | PayloadRef → PayloadJson؛ حالة Draft/Published/Superseded وIsRollback. | لا فقد. |
| 50 | `governance.GovernanceAction` | 8 | 1/0 | **MERGE** | `ops.AuditEvent` | دمج تمثيلين لحقيقة واحدة | حدث AuditEvent بـAction الحوكمة وReason إلزامي في الطبقة التطبيقية. | حكم Codex نفسه SAFE؛ لا FK وارد. |
| 51 | `iam.ConsentRecord` | 8 | 1/0 | **KEEP** | `iam.ConsentRecord` | إبقاء (مع تعديلات أعمدة) | بلا تغيير جوهري. | لا فقد. |
| 52 | `iam.GlobalGrant` | 9 | 2/0 | **KEEP** | `iam.GlobalGrant` | إبقاء (مع تعديلات أعمدة) | يُضاف RevokedByPersonId وRevokeReason وقائمة قدرات أولية. | لا فقد. |
| 53 | `iam.OtpChallenge` | 12 | 1/0 | **KEEP** | `iam.OtpChallenge` | إبقاء (مع تعديلات أعمدة) | Used → Consumed، يُضاف Locked. | لا فقد. |
| 54 | `iam.PasswordCredential` | 10 | 1/0 | **KEEP** | `iam.PasswordCredential` | إبقاء (مع تعديلات أعمدة) | يُضاف FailedAttemptCount وLockedUntilUtc. | لا فقد. |
| 55 | `iam.Person` | 8 | 0/87 | **KEEP** | `iam.Person` | إبقاء (مع تعديلات أعمدة) | يستوعب البريد الموثّق الأساسي؛ IndividualEnabled → IndividualEnabledAtUtc. | لا فقد للحقيقة المطلوبة. |
| 56 | `iam.PersonEmail` | 9 | 1/0 | **MERGE** | `iam.Person` | إزالة بنية غير لازمة | البريد الموثّق الأساسي يصبح Person.NormalizedEmail + EmailVerifiedAtUtc بفهرس فريد مفلتر. | يُفقد دعم عدة عناوين لشخص واحد (غير مطلوب)؛ تاريخ تغيير البريد في AuditEvent؛ البريد قيد التحقق في OtpChallenge. |
| 57 | `institution.Initiative` | 17 | 2/15 | **KEEP** | `institution.Initiative` | إبقاء (مع تعديلات أعمدة) | يُزال تكرار Title/Mode/Capacity/TimeZone/Starts/Ends/Cutoff (يُقرأ من النسخة الحالية)؛ يُضاف CurrentRevisionId ومسودة المنشئ وحالة Suspended؛ InstitutionId يُثبت بالنوع. | يختفي مصدر ثانٍ للشروط قد يختلف عن النسخة. |
| 58 | `institution.InitiativeApplication` | 13 | 3/3 | **KEEP** | `institution.InitiativeApplication` | إبقاء (مع تعديلات أعمدة) | يستوعب العضوية وعرض المقعد؛ حالات OfferDeclined/OfferExpired/Removed/Completed/Suspended/BlockLifted. | انظر صفي InitiativeMembership وInitiativeSeatOffer. |
| 59 | `institution.InitiativeApplicationDecision` | 10 | 2/0 | **KEEP** | `institution.InitiativeApplicationDecision` | إبقاء (مع تعديلات أعمدة) | يتوسع ليشمل انتقالات العضوية والعرض والتنبيه (Flagged/FlagResolved) وActorCapacity. | ما كان AuditEvent فقط لانتقالات العضوية صار سجل قرار مقروءًا. |
| 60 | `institution.InitiativeContent` | 8 | 2/0 | **MERGE** | `institution.InitiativeRevision` | نقل إلى لقطة JSON ثابتة | المحتوى المرتب داخل PublishedSnapshotJson للنسخة. | يُفقد FK إلى ContentRelease (محتوى منصة)؛ محتوى المبادرة ملك المؤسسة ويُنشر مع شروطها. |
| 61 | `institution.InitiativeDraft` | 16 | 4/0 | **MERGE** | `institution.Initiative` | إزالة بنية غير لازمة | DraftJson، DraftLastSavedStage، DraftBaseRevisionId، DraftUpdatedBy/At على الجذر. | مسودة واحدة في كل وقت بلا تاريخ مطلوب ولا FK وارد؛ التزامن عبر RowVersion الجذر. |
| 62 | `institution.InitiativeMembership` | 14 | 3/2 | **MERGE** | `institution.InitiativeApplication` | دمج تمثيلين لحقيقة واحدة | AcceptedAtUtc، WithdrawalCutoffAtUtc، EndedAtUtc، EndReason تنتقل إلى صف الطلب (1:1 عبر UQ ApplicationId). | يختفي FK الثلاثي وحالة Accepted المكررة؛ GroupMembership وCompletion يشيران إلى الطلب؛ قيد العضوية الواحدة ينتقل كما هو؛ PublicId العضوية يُحفظ كعمود قديم إن كان مكشوفًا. |
| 63 | `institution.InitiativeRevision` | 20 | 1/4 | **KEEP** | `institution.InitiativeRevision` | إبقاء (مع تعديلات أعمدة) | تُضاف أعمدة الشروط القابلة للفرض (OperatingMode، Waitlist، OfferHoldHours، نافذة التقديم، نموذج التسجيل) وقيد الموعد = البداية − 120 ساعة. | لا فقد. |
| 64 | `institution.InitiativeSeatOffer` | 11 | 1/0 | **MERGE** | `institution.InitiativeApplication` | دمج تمثيلين لحقيقة واحدة | OfferedAtUtc، OfferExpiresAtUtc، OfferRespondedAtUtc على الطلب؛ Offered/OfferDeclined/OfferExpired حالات. | عرض واحد لكل طلب لأن الرفض والانتهاء نهائيان (§15.3)؛ يُصلح غياب حالة للطلب بعد عرض منتهٍ. |
| 65 | `institution.InitiativeStaffAppointment` | 11 | 3/2 | **KEEP** | `org.StaffAppointment` | إبقاء بإعادة تسمية/نقل مخطط | ينتقل إلى org ويستوعب الدعوة وطلب الطاقم والتعيين لدى المزوّد. | انظر صفوف الدعوات. |
| 66 | `institution.InitiativeStaffInvitation` | 11 | 2/1 | **MERGE** | `org.StaffAppointment` | دمج تمثيلين لحقيقة واحدة | حالة Pending بالبريد والرمز على صف التعيين نفسه. | يختفي FK (InvitationId, InitiativeId, Role) لأنه الصف نفسه. |
| 67 | `institution.Institution` | 9 | 0/6 | **KEEP** | `org.Organization` | إبقاء بإعادة تسمية/نقل مخطط | Organization(Kind=Institution)؛ الحالات كما هي (Applied/Verified/Suspended/Closed). | المبادرة تشير بمفتاح مركب (Id, Kind). |
| 68 | `institution.InstitutionVerificationCase` | 11 | 4/0 | **KEEP** | `org.VerificationCase` | إبقاء بإعادة تسمية/نقل مخطط | VerificationCase(Kind=Institution). | لا فقد. |
| 69 | `institution.RepresentativeMembership` | 9 | 3/0 | **KEEP** | `org.OrganizationMember` | إبقاء بإعادة تسمية/نقل مخطط | OrganizationMember لمؤسسة. | لا فقد. |
| 70 | `lab.AssessmentAttempt` | 15 | 4/3 | **KEEP** | `lab.AssessmentAttempt` | إبقاء (مع تعديلات أعمدة) | InstrumentId → InstrumentCode؛ Kind يشمل Official؛ IsLate؛ Abandoned. | لا فقد. |
| 71 | `lab.AssessmentInstrument` | 7 | 0/2 | **MERGE** | `lab.InstrumentVersion` | إزالة بنية غير لازمة | InstrumentCode بقيد CHECK على الأربعة. | مجموعة مغلقة بقرار المالك؛ يبقى قيد baseline الفريد عبر InstrumentCode. |
| 72 | `lab.AssessmentResponse` | 11 | 1/0 | **KEEP** | `lab.AssessmentResponse` | إبقاء (مع تعديلات أعمدة) | بلا تغيير. | لا فقد. |
| 73 | `lab.AssessmentScore` | 8 | 1/0 | **KEEP** | `lab.AssessmentScore` | إبقاء (مع تعديلات أعمدة) | بلا تغيير. | لا فقد. |
| 74 | `lab.AssessmentWindow` | 10 | 1/1 | **KEEP** | `lab.AssessmentWindow` | إبقاء (مع تعديلات أعمدة) | يُضاف OfferedInstrumentsJson وحالة Missed. | لا فقد. |
| 75 | `lab.InstrumentVersion` | 9 | 1/1 | **KEEP** | `lab.InstrumentVersion` | إبقاء (مع تعديلات أعمدة) | يُضاف Title وContentJson وStatus. | لا فقد. |
| 76 | `ops.AuditEvent` | 15 | 1/0 | **KEEP** | `ops.AuditEvent` | إبقاء (مع تعديلات أعمدة) | يُضاف ActorCapacity/SelectedGrantRef وDetailJson. | لا فقد. |
| 77 | `ops.DeliveryAttempt` | 7 | 1/0 | **MERGE** | `ops.OutboxMessage` | نقل telemetry من SQL إلى السجلات | المحاولة الأخيرة ونتيجتها (Attempts، LastAttemptAtUtc، LastError، ProviderRef، DeliveredAtUtc) على الرسالة؛ تفاصيل كل محاولة في السجلات المنظمة. | نقل telemetry من SQL إلى السجلات؛ يُفقد سجل SQL لكل محاولة فردية. |
| 78 | `ops.IdempotencyRecord` | 11 | 1/0 | **KEEP** | `ops.IdempotencyRecord` | إبقاء (مع تعديلات أعمدة) | بلا تغيير. | لا فقد. |
| 79 | `ops.Notification` | 12 | 1/1 | **KEEP** | `ops.Notification` | إبقاء (مع تعديلات أعمدة) | يُضاف EmailOutboxMessageId. | لا فقد. |
| 80 | `ops.OutboxMessage` | 11 | 0/0 | **KEEP** | `ops.OutboxMessage` | إبقاء (مع تعديلات أعمدة) | يُضاف Channel وحالة التسليم. | لا فقد. |
| 81 | `partnership.ExperienceLink` | 11 | 4/0 | **MERGE** | `partnership.PartnershipLink` | دمج تمثيلين لحقيقة واحدة | PartnershipLink(ExperienceId). | الأعمدة متطابقة؛ الهدف XOR بمفتاحين حقيقيين وفهرس فريد لكل نوع. |
| 82 | `partnership.ProgramLink` | 11 | 4/0 | **KEEP** | `partnership.PartnershipLink` | إبقاء بإعادة تسمية/نقل مخطط | PartnershipLink(ProgramId)؛ Accepted/Active توحدا. | لا فقد. |
| 83 | `personal.IndividualProfile` | 12 | 2/0 | **KEEP** | `personal.IndividualProfile` | إبقاء (مع تعديلات أعمدة) | يُضاف SetupAnswersJson وPreferencesJson وJourneyStartedAtUtc؛ ConsentVersion المكرر يُزال (ConsentRecord). | يُصلح غياب إجابات الإعداد السريع. |
| 84 | `provider.CampCompletion` | 11 | 4/0 | **MERGE** | `session.Completion` | دمج تمثيلين لحقيقة واحدة | Completion(Kind=Camp, ExperienceId, BookingId, ExperienceRevisionId). | D10 يوحّد التصنيف؛ المفاتيح المركبة تبقى. |
| 85 | `provider.Experience` | 13 | 1/6 | **KEEP** | `provider.Experience` | إبقاء (مع تعديلات أعمدة) | ProviderId يُثبت بالنوع؛ Title/Capacity/Times إلى النسخة؛ CurrentRevisionId ومسودة وSuspended. | لا فقد. |
| 86 | `provider.ExperienceBooking` | 13 | 3/5 | **KEEP** | `provider.ExperienceBooking` | إبقاء (مع تعديلات أعمدة) | يستوعب عرض المقعد؛ CheckedIn/Completed تصبح حالات عرض مشتقة؛ UQ (ExperienceId, PersonId) يصبح مفلترًا. | يُصلح منع الحجز من جديد بعد الإلغاء. |
| 87 | `provider.ExperienceRevision` | 12 | 1/2 | **KEEP** | `provider.ExperienceRevision` | إبقاء (مع تعديلات أعمدة) | تُضاف أعمدة الوقت والسعة والأهلية والانتظار ونموذج المشارك واللقطة. | لا فقد. |
| 88 | `provider.ExperienceSession` | 10 | 1/2 | **MERGE** | `session.Session` | دمج تمثيلين لحقيقة واحدة | Session(ExperienceId). | بروتوكول جلسة وحضور واحد (D36/D37)؛ الملكية تبقى للمزوّد عبر FK. |
| 89 | `provider.Provider` | 9 | 0/5 | **MERGE** | `org.Organization` | دمج تمثيلين لحقيقة واحدة | Organization(Kind=Provider)؛ Approved → Verified. | التجربة تشير بمفتاح مركب (Id, Kind=Provider). |
| 90 | `provider.ProviderAppointmentSession` | 5 | 2/0 | **MERGE** | `session.SessionDuty` | دمج تمثيلين لحقيقة واحدة | SessionDuty(ExperienceId). | المفاتيح المركبة تبقى عبر ExperienceId. |
| 91 | `provider.ProviderAttendance` | 12 | 4/1 | **MERGE** | `session.Attendance` | دمج تمثيلين لحقيقة واحدة | Attendance(BookingId, ExperienceId) + OutcomeCode/OutcomeNotes للتقييم. | المصدر XOR بمفاتيح مركبة حقيقية. |
| 92 | `provider.ProviderAttendanceCorrection` | 8 | 2/0 | **MERGE** | `session.AttendanceCorrection` | دمج تمثيلين لحقيقة واحدة | AttendanceCorrection مع Old/NewOutcomeCode. | لا فقد؛ FK إلى Attendance يبقى. |
| 93 | `provider.ProviderCohort` | 8 | 1/1 | **KEEP** | `provider.ProviderCohort` | إبقاء (مع تعديلات أعمدة) | SupervisorAppointmentId يشير إلى org.StaffAppointment(Id, ExperienceId). | لا فقد. |
| 94 | `provider.ProviderCohortMember` | 9 | 2/0 | **KEEP** | `provider.ProviderCohortMember` | إبقاء (مع تعديلات أعمدة) | يُضاف MovedByPersonId. | لا فقد. |
| 95 | `provider.ProviderIncident` | 12 | 4/0 | **KEEP** | `provider.ProviderIncident` | إبقاء (مع تعديلات أعمدة) | يُضاف SessionId وResolutionNote. | لا فقد. |
| 96 | `provider.ProviderMembership` | 9 | 2/0 | **MERGE** | `org.OrganizationMember` | دمج تمثيلين لحقيقة واحدة | OrganizationMember لمزوّد. | عمود Role الحر يُزال: العضوية = سلطة الممثل؛ أدوار التشغيل في StaffAppointment. |
| 97 | `provider.ProviderStaffAppointment` | 10 | 2/2 | **MERGE** | `org.StaffAppointment` | دمج تمثيلين لحقيقة واحدة | StaffAppointment(ExperienceId, Role=Supervisor). | المفاتيح المركبة من الأفواج والواجبات تبقى عبر (Id, ExperienceId). |
| 98 | `provider.ProviderStaffInvitation` | 10 | 2/1 | **MERGE** | `org.StaffAppointment` | دمج تمثيلين لحقيقة واحدة | Pending على صف التعيين نفسه. | كما في دعوات المبادرة. |
| 99 | `provider.ProviderVerificationCase` | 10 | 4/0 | **MERGE** | `org.VerificationCase` | دمج تمثيلين لحقيقة واحدة | VerificationCase(Kind=Provider). | لا فقد. |
| 100 | `provider.SeatOffer` | 11 | 1/0 | **MERGE** | `provider.ExperienceBooking` | دمج تمثيلين لحقيقة واحدة | أعمدة العرض على الحجز. | عرض واحد لكل حجز لأن الرفض/الانتهاء نهائي (§16.1). |
| 101 | `recovery.PlanRevision` | 12 | 1/2 | **KEEP** | `recovery.PlanRevision` | إبقاء (مع تعديلات أعمدة) | يُضاف ChangeKind وPlanJson وفهرسان لنسخة مقبولة واحدة ومسودة واحدة. | لا فقد. |
| 102 | `recovery.RecoveryCycle` | 12 | 1/3 | **KEEP** | `recovery.RecoveryCycle` | إبقاء (مع تعديلات أعمدة) | JourneyId يُزال؛ قيد الدورة الحالية الواحدة على PersonId؛ Kind وNextStepCode. | لا فقد. |
| 103 | `recovery.RecoveryJourney` | 7 | 1/1 | **MERGE** | `personal.IndividualProfile` | إزالة بنية غير لازمة | JourneyStartedAtUtc على الملف الشخصي. | الجدول لم يحمل إلا PersonId والحالة وقيد "رحلة نشطة واحدة"؛ يُفقد احتمال عدة رحلات لشخص (غير مطلوب). |
| 104 | `recovery.ScheduledAction` | 12 | 4/1 | **KEEP** | `recovery.ScheduledAction` | إبقاء (مع تعديلات أعمدة) | يُضاف RoutineId وIsOptional وRescheduledToActionId وحالة Excluded. | لا فقد. |
| 105 | `recovery.WeeklyReview` | 9 | 2/0 | **KEEP** | `recovery.WeeklyReview` | إبقاء (مع تعديلات أعمدة) | يُضاف ResultingRevisionId وReportedPhoneMinutesPerDay. | يُصلح غياب وقت الهاتف المُبلَّغ ذاتيًا. |
| 106 | `session.AbsenceExcuse` | 14 | 5/0 | **KEEP** | `session.AbsenceExcuse` | إبقاء (مع تعديلات أعمدة) | AttendanceId مركب مع PersonId؛ حالة Withdrawn وأعمدة التوقيت. | لا فقد. |
| 107 | `session.AttendanceCorrection` | 8 | 2/0 | **KEEP** | `session.AttendanceCorrection` | إبقاء (مع تعديلات أعمدة) | Old/NewOutcomeCode. | لا فقد. |
| 108 | `session.InitiativeCompletion` | 11 | 4/0 | **KEEP** | `session.Completion` | إبقاء بإعادة تسمية/نقل مخطط | Completion(Kind=Initiative, ApplicationId) يستوعب الأنواع الثلاثة. | MembershipId → ApplicationId. |
| 109 | `session.InitiativeSessionDuty` | 9 | 3/0 | **KEEP** | `session.SessionDuty` | إبقاء بإعادة تسمية/نقل مخطط | يستوعب واجبات جلسات المزوّد. | لا فقد. |
| 110 | `session.Session` | 14 | 2/6 | **KEEP** | `session.Session` | إبقاء (مع تعديلات أعمدة) | InstitutionId يُزال (المالك عبر المبادرة)؛ ExperienceId XOR؛ سعة النمطين؛ Purpose=Meeting. | لا فقد. |
| 111 | `session.SessionAttendance` | 12 | 3/2 | **KEEP** | `session.Attendance` | إبقاء بإعادة تسمية/نقل مخطط | يستوعب حضور المزوّد. | لا فقد. |
| 112 | `session.SessionCapacityPool` | 7 | 1/1 | **MERGE** | `session.Session` | إزالة بنية غير لازمة | OnlineCapacity/InPersonCapacity على الجلسة والنسخة. | يُفقد FK من التسجيل إلى "المسبح"؛ يعوّضه CHECK للنمط ومشغّل يتحقق أن الجلسة تعرض النمط؛ السعة لم تكن مفروضة بالـFK أصلًا. |
| 113 | `session.SessionRegistration` | 12 | 4/1 | **KEEP** | `session.SessionRegistration` | إبقاء (مع تعديلات أعمدة) | PoolId → Mode؛ InitiativeId مركب؛ فريد مفلتر يسمح بالتسجيل بعد الإلغاء. | لا فقد. |
| 114 | `session.SessionRevision` | 10 | 1/1 | **KEEP** | `session.SessionRevision` | إبقاء (مع تعديلات أعمدة) | تُضاف السعات والوقت والسبب. | لا فقد. |
| 115 | `session.StandaloneSessionSupervisorAppointment` | 12 | 3/0 | **DEFER** | — | تأجيل ميزة غير معتمدة | الجلسة المستقلة خارج مبادرة ليست مسار تشغيل معتمد. | لو اعتُمدت: صفر جداول (نطاق ثالث في StaffAppointment وSession). |
| 116 | `shield.BrowserUsageDomain` | 6 | 2/0 | **KEEP** | `shield.BrowserUsageDomain` | إبقاء (مع تعديلات أعمدة) | بلا تغيير. | لا فقد. |
| 117 | `shield.BrowserUsagePeriod` | 12 | 3/1 | **KEEP** | `shield.BrowserUsagePeriod` | إبقاء (مع تعديلات أعمدة) | يُضاف ReceivedAtUtc وقيد Observed ≤ Coverage. | لا فقد. |
| 118 | `shield.ExtensionInstallation` | 9 | 1/2 | **KEEP** | `shield.ExtensionInstallation` | إبقاء (مع تعديلات أعمدة) | يُضاف BrowserCode وExtensionVersion وSyncKeyHash وLastSeenAtUtc. | لا فقد. |
| 119 | `shield.ProtectionSession` | 11 | 3/0 | **KEEP** | `shield.ProtectionSession` | إبقاء (مع تعديلات أعمدة) | ConfigurationId يُزال، ويُضاف DomainCodesJson وLockMode. | يُصلح ربط الحماية خطأً بمواقع التذكير. |
| 120 | `shield.ShieldConfiguration` | 7 | 1/3 | **KEEP** | `shield.ShieldConfiguration` | إبقاء (مع تعديلات أعمدة) | ThresholdMinutes → ReminderThresholdMinutes + ReminderEnabled. | لا فقد. |
| 121 | `shield.ShieldSelectedDomain` | 4 | 1/1 | **KEEP** | `shield.ShieldSelectedDomain` | إبقاء (مع تعديلات أعمدة) | بلا تغيير. | لا فقد. |
| 122 | `task.Assignment` | 8 | 2/2 | **KEEP** | `task.Assignment` | إبقاء (مع تعديلات أعمدة) | يُضاف CurrentRevisionId والإلغاء بسبب. | لا فقد. |
| 123 | `task.AssignmentRecipient` | 10 | 3/1 | **KEEP** | `task.AssignmentRecipient` | إبقاء (مع تعديلات أعمدة) | حالات NeedsRevision/Rejected/Expired؛ فريد (Id, AssignmentId, PersonId). | لا فقد. |
| 124 | `task.AssignmentRevision` | 9 | 2/2 | **KEEP** | `task.AssignmentRevision` | إبقاء (مع تعديلات أعمدة) | يُضاف Title وIsRequired وStartsAtUtc وAllowLate. | لا فقد. |
| 125 | `task.CoachReport` | 10 | 2/0 | **KEEP** | `task.OperationalReport` | إبقاء بإعادة تسمية/نقل مخطط | OperationalReport(Kind=Coach) مع لقطة المقاييس ومراجعة المشرف والتضمين. | يُصلح غياب مراجعة المشرف وربط التضمين. |
| 126 | `task.ReviewDecision` | 11 | 4/2 | **KEEP** | `task.ReviewDecision` | إبقاء (مع تعديلات أعمدة) | فريد للدليل؛ CHECK المراجع أو القاعدة. | لا فقد. |
| 127 | `task.ReviewPrivateNote` | 5 | 2/0 | **KEEP** | `task.ReviewPrivateNote` | إبقاء (مع تعديلات أعمدة) | بلا تغيير. | لا فقد. |
| 128 | `task.SubmissionAttempt` | 9 | 3/1 | **KEEP** | `task.SubmissionAttempt` | إبقاء (مع تعديلات أعمدة) | PersonId وPracticeAttemptId بمفاتيح مركبة. | لا فقد. |
| 129 | `task.SupervisorReport` | 10 | 2/0 | **MERGE** | `task.OperationalReport` | دمج تمثيلين لحقيقة واحدة | OperationalReport(Kind=InitiativeSupervisor)؛ وتقارير إغلاق مشرف المزوّد Kind=ProviderSupervisor. | الأعمدة ودورة الحياة وسلسلة القراء متطابقة؛ التضمين صار FK ذاتيًا مركبًا. |

## الاتجاه العكسي: كل جدول نهائي ومصادره

| الجدول النهائي | مصدر KEEP | مدموج فيه |
|---|---|---|
| `iam.Person` | `iam.Person` | `iam.PersonEmail` |
| `iam.PasswordCredential` | `iam.PasswordCredential` | — |
| `iam.OtpChallenge` | `iam.OtpChallenge` | — |
| `iam.ConsentRecord` | `iam.ConsentRecord` | — |
| `iam.GlobalGrant` | `iam.GlobalGrant` | — |
| `org.Organization` | `institution.Institution` | `provider.Provider` |
| `org.OrganizationMember` | `institution.RepresentativeMembership` | `provider.ProviderMembership` |
| `org.VerificationCase` | `institution.InstitutionVerificationCase` | `coach.CoachApproval`، `provider.ProviderVerificationCase` |
| `org.StaffAppointment` | `institution.InitiativeStaffAppointment` | `institution.InitiativeStaffInvitation`، `provider.ProviderStaffAppointment`، `provider.ProviderStaffInvitation` |
| `personal.IndividualProfile` | `personal.IndividualProfile` | `recovery.RecoveryJourney` |
| `lab.InstrumentVersion` | `lab.InstrumentVersion` | `lab.AssessmentInstrument` |
| `lab.AssessmentWindow` | `lab.AssessmentWindow` | — |
| `lab.AssessmentAttempt` | `lab.AssessmentAttempt` | — |
| `lab.AssessmentResponse` | `lab.AssessmentResponse` | — |
| `lab.AssessmentScore` | `lab.AssessmentScore` | — |
| `recovery.RecoveryCycle` | `recovery.RecoveryCycle` | — |
| `recovery.PlanRevision` | `recovery.PlanRevision` | — |
| `recovery.ScheduledAction` | `recovery.ScheduledAction` | — |
| `recovery.WeeklyReview` | `recovery.WeeklyReview` | — |
| `activity.PracticeDefinition` | `activity.PracticeDefinition` | — |
| `activity.PracticeVersion` | `activity.PracticeVersion` | — |
| `activity.PracticeAttempt` | `activity.PracticeAttempt` | — |
| `activity.PracticeProgressionDecision` | `activity.PracticeProgressionDecision` | — |
| `activity.OfflineRoutine` | `activity.OfflineRoutine` | — |
| `activity.RoutineCheckIn` | `activity.RoutineCheckIn` | — |
| `shield.ExtensionInstallation` | `shield.ExtensionInstallation` | — |
| `shield.ShieldConfiguration` | `shield.ShieldConfiguration` | — |
| `shield.ShieldSelectedDomain` | `shield.ShieldSelectedDomain` | — |
| `shield.ProtectionSession` | `shield.ProtectionSession` | — |
| `shield.BrowserUsagePeriod` | `shield.BrowserUsagePeriod` | — |
| `shield.BrowserUsageDomain` | `shield.BrowserUsageDomain` | — |
| `evidence.EvidenceEvent` | `evidence.EvidenceEvent` | — |
| `evidence.RewardPolicyVersion` | `evidence.RewardPolicyVersion` | — |
| `evidence.PersonalRewardEntry` | `evidence.PersonalRewardEntry` | — |
| `evidence.GroupRewardEntry` | `evidence.GroupRewardEntry` | `evidence.GroupGarden` |
| `institution.Initiative` | `institution.Initiative` | `institution.InitiativeDraft` |
| `institution.InitiativeRevision` | `institution.InitiativeRevision` | `institution.InitiativeContent` |
| `institution.InitiativeApplication` | `institution.InitiativeApplication` | `institution.InitiativeMembership`، `institution.InitiativeSeatOffer` |
| `institution.InitiativeApplicationDecision` | `institution.InitiativeApplicationDecision` | — |
| `coach.CoachProgram` | `coach.CoachProgram` | — |
| `coach.ProgramRevision` | `coach.ProgramRevision` | `coach.ProgramStage` |
| `coach.OperationalGroup` | `coach.OperationalGroup` | — |
| `coach.GroupMembership` | `coach.ProgramGroupMembership` | `coach.InitiativeGroupPlacement`، `coach.ProgramGroupInvitation` |
| `coach.GroupCoachAssignment` | `coach.GroupCoachAssignment` | — |
| `task.Assignment` | `task.Assignment` | — |
| `task.AssignmentRevision` | `task.AssignmentRevision` | — |
| `task.AssignmentRecipient` | `task.AssignmentRecipient` | — |
| `task.SubmissionAttempt` | `task.SubmissionAttempt` | — |
| `task.ReviewDecision` | `task.ReviewDecision` | — |
| `task.ReviewPrivateNote` | `task.ReviewPrivateNote` | — |
| `task.OperationalReport` | `task.CoachReport` | `task.SupervisorReport` |
| `session.Session` | `session.Session` | `provider.ExperienceSession`، `session.SessionCapacityPool` |
| `session.SessionRevision` | `session.SessionRevision` | — |
| `session.SessionDuty` | `session.InitiativeSessionDuty` | `provider.ProviderAppointmentSession` |
| `session.SessionRegistration` | `session.SessionRegistration` | — |
| `session.Attendance` | `session.SessionAttendance` | `provider.ProviderAttendance` |
| `session.AttendanceCorrection` | `session.AttendanceCorrection` | `provider.ProviderAttendanceCorrection` |
| `session.AbsenceExcuse` | `session.AbsenceExcuse` | — |
| `session.Completion` | `session.InitiativeCompletion` | `coach.ProgramCompletion`، `provider.CampCompletion` |
| `provider.Experience` | `provider.Experience` | — |
| `provider.ExperienceRevision` | `provider.ExperienceRevision` | — |
| `provider.ExperienceBooking` | `provider.ExperienceBooking` | `provider.SeatOffer` |
| `provider.ProviderCohort` | `provider.ProviderCohort` | — |
| `provider.ProviderCohortMember` | `provider.ProviderCohortMember` | — |
| `provider.ProviderIncident` | `provider.ProviderIncident` | — |
| `forms.Form` | `forms.Form` | `forms.Competition` |
| `forms.FormVersion` | `forms.FormVersion` | — |
| `forms.FormQuestion` | `forms.FormQuestion` | — |
| `forms.FormQuestionOption` | `forms.FormQuestionOption` | — |
| `forms.FormResponse` | `forms.FormResponse` | `forms.CompetitionEntry` |
| `forms.FormAnswer` | `forms.FormAnswer` | `forms.FormAnswerChoice` |
| `forms.CompetitionCriterion` | `forms.CompetitionCriterion` | — |
| `forms.CompetitionJudgment` | `forms.CompetitionJudgment` | — |
| `forms.CompetitionCriterionScore` | `forms.CompetitionCriterionScore` | — |
| `community.Post` | `community.Post` | — |
| `community.Comment` | `community.Comment` | — |
| `community.Reaction` | `community.Reaction` | — |
| `community.Bookmark` | `community.Bookmark` | — |
| `community.ContentReport` | `community.ContentReport` | — |
| `community.ModerationDecision` | `community.ModerationDecision` | — |
| `partnership.PartnershipLink` | `partnership.ProgramLink` | `partnership.ExperienceLink` |
| `governance.ContentRelease` | `governance.ContentRelease` | — |
| `ops.AuditEvent` | `ops.AuditEvent` | `governance.GovernanceAction` |
| `ops.Notification` | `ops.Notification` | — |
| `ops.OutboxMessage` | `ops.OutboxMessage` | `ops.DeliveryAttempt` |
| `ops.IdempotencyRecord` | `ops.IdempotencyRecord` | — |
| `files.SecureFile` | `files.SecureFile` | — |
