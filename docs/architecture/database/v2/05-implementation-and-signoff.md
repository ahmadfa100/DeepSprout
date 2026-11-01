# 05 — Implementation plan, validation gate and final verdict

## الملخص التنفيذي

حسم المالك أن المرحلة التالية هي قاعدة بيانات حقيقية على SQL Server ضمن نظام ASP.NET Core/EF Core أحادي معياري. يوصي هذا الإصدار بـ **128 جدولًا للنطاق الكامل** بدل 136 في المسودة الأولى: ألغينا ثلاثة جداول لمقاعد مرقّمة لا يقابلها مقعد فعلي، وأربع جداول عرض مشتقة، ودمجنا تقدّم التهيئة في الملف الفردي وحالة التسليم في مستلم المهمة، ثم أضفنا سجلًّا غير قابل للاستبدال لقرارات طلب الانضمام. الشريحة الأولى **18 جدولًا** فقط، وتتحقق من الهوية، المؤسسة، نشر شروط المبادرة، الطلب، العضوية الواحدة، الانسحاب، التعيين والإسناد. العددان موثّقان بأسماء الجداول، وليس تقديرًا تقريبيًا.

يرتبط الطالب بمبادرة واحدة **فعّالة** في أي لحظة عبر فهرس SQL مفلتر على `PersonId` لحالتي `Accepted` و`Suspended`، مع بقاء المشاركة المنتهية في التاريخ. عدّ السعة يتم من الوقائع الأصلية تحت قفل صف المبادرة/التجربة/حوض الجلسة، ولا يصحّ تحويل شرط `CHECK` على عدّاد إلى ادعاء بأن العدّاد يطابق السجلات. سؤال «أكثر من خمسة أيام» لا يزال يحتاج قرارًا دقيقًا بين 120 ساعة وخمسة أيام محلية؛ توصي الحزمة بالأول وتخزّن موعد القطع المنشور، لكنها لا تعرضه كقرار معتمد. الحديقة أربع أشجار مختلفة المظهر حسب أنواع الممارسة الأربعة؛ دفتر المكافآت لا يحتاج جدولًا لكل شجرة. محرك التعافي المعتمد هو مصدر الخطة، والذكاء الاصطناعي يشرح نتائج مسموحًا بها فقط.

**توصية التوقيع: CONDITIONAL GO للتنفيذ المرحلي لشريحة قاعدة البيانات، لا توقيع إنتاجي للنطاق الكامل الآن.** يلزم اعتماد دلالة الخمسة أيام وإعادة الجدولة/إعادة التقديم/تحرير السعة، ثم تشغيل SQL والاختبارات المتزامنة فعليًا، واستكمال سياسة الخصوصية والسنّ قبل جمع بيانات حساسة. لا توجد بيئة `sqlcmd` أو Docker/Podman في هذا الفحص، ولذلك كل النتائج الموسومة SQL هنا **NOT EXECUTED**.

## EF Core model and migration strategy

One `DbContext`/migration stream at first, with configuration classes per schema and module-owned command services. Configure `ToTable(..., schema)`, explicit `HasKey`, alternate keys for composite FKs, filtered indexes with SQL predicates, `rowversion` as concurrency token, `DeleteBehavior.NoAction`, bounded lengths and UTC conversion policy. Do not use EF InMemory to validate SQL Server filters, locks or `rowversion`. Published revision and business-history entities are insert-only at the runtime boundary; migrations/maintenance have a distinct principal. Use `FromSql`/ADO.NET for capacity procedures so owner-row lock hints remain explicit; do not implement those transitions as load/count/save through ordinary EF change tracking. Map database 2601/2627 to conflict and 1205 to bounded whole-command retry after fresh read. Outbox worker sends only external messages. Use interceptors or explicit unit-of-work hooks for safe audit metadata, never raw Lab/Shield/credential payloads. Query projections are narrow per grant, with no broad `Person` graph eager-loading.

**Migration order:** (1) IAM, files, ops and reference vocabularies; (2) Institution owner/verification/Representative; (3) Initiative/Revision/Application/Decision/Membership/Staff and filtered indexes; (4) personal/Lab/Recovery/activity/shield; (5) Coach/Group/Task; (6) Session and Provider capacity/attendance; (7) evidence/reward; (8) forms/partnership/community/governance; (9) commercial only after policy. Within a migration, create parent tables, then child tables, then composite alternate keys/FKs and filtered indexes. The six root-to-revision circular FKs have been removed, so publication still takes a transaction but not a two-step FK insert. `files.SecureFile` must be created before proof/excuse/attachment referencing tables. Apply expand/backfill/switch/contract for demo-to-server data; import only verified identity mappings, quarantine ambiguous local demo identities, retain original source labels, dry-run counts and restore tested backups. Never treat demo fixture prices, Admin shortcuts or browser-generated facts as production truth.

## Acceptance and execution record

| Critical invariant | Artifact and assertion | Execution status / remaining proof |
|---|---|
| Initiative cap 1..135 and serialized acceptance | `001` CHECK + ApproveApplication owner lock/count; `002` second approval at capacity one fails | **NOT EXECUTED**; repeat on two SQL connections at cap 135. |
| Held offers consume capacity; expiry frees under lock | `003` MakeOffer/AcceptOffer/ExpireOffer proof with capacity one | **NOT EXECUTED**; extend exact pattern to `InitiativeSeatOffer`, then two-connection accept-vs-expire race. |
| Pending withdrawal and accepted cutoff | `001` two withdrawal procedures; `002` pending and before/after cutoff assertions | **NOT EXECUTED**; owner must approve 120-hour or local-date semantics/reschedule rule. |
| One effective Initiative at a time | `001` filtered unique Person index; `002` procedure and direct-DML negatives | **NOT EXECUTED**; two-connection different-Initiative race required. |
| Application decision history | `001` append-only table; `002` approval decision survives membership withdrawal, which has its own keyed audit | **NOT EXECUTED**; SQL permission/trigger test for update/delete before release. |
| Three active Supervisors | `001` serialized acceptance; `002` fourth rejected | **NOT EXECUTED**; two-connection third-vs-fourth race required. |
| Group XOR and cross-owner placement | `003` XOR CHECK and composite FKs with rejected wrong Initiative | **NOT EXECUTED**; full target migrations also need Program membership and Provider cohort composite tests. |
| Submission/review integrity | `003` recipient/attempt/revision composite FKs and two immutable review decisions | **NOT EXECUTED**; validate reviewer grant, transfer and supersession in API integration. |
| Attendance, excuse, completion distinct | `003` factual Absent remains after Accepted excuse, correction row preserved | **NOT EXECUTED**; full completion rule tests await policy. |
| Provider booking/offer expiry | `003` held capacity, expired accept failure, reoffer/accept | **NOT EXECUTED**; two-connection expiry/accept and last-seat booking race required. |
| Evidence/reward duplication and reversal | `003` unique Grant and reversal target indexes | **NOT EXECUTED**; add same-transaction source/ledger replay test on full schema. |
| History after transfer/correction | `003` reviews/correction rows; v2 relational placement/history design | **NOT EXECUTED**; full integration test must transfer group/Coach and inspect authorship. |
| Revoked grant and unauthorized access | `003` scoped read procedure denied after revocation; `002` approval scope check | **NOT EXECUTED**; add direct-ID read/file/partner/Lab negatives in API tests. |

Run scripts in a **new disposable SQL Server 2019+ database** in order `001`, `002`; run `003` in another new disposable database (its `proof` schema is isolated, but separation avoids fixtures being mistaken for production schema). A successful single-session script is not proof of concurrent safety. For race gates use two independent connections and a barrier: both attempt the last capacity slot/third Supervisor/one Person in different Initiatives/offer accept versus expiry at the same time; verify one successful transition, one typed rejection, exact committed counts, and preserved audit/history. Repeat under `READ COMMITTED SNAPSHOT` if that option will be enabled. Capture SQL Server version, database options, scripts hash, command transcript and resulting table counts before signing off. No success result is claimed in this package.

## Detailed implementation gates

1. **M1 identity/admission:** owner confirms cutoff and reschedule semantics, application/reapplication policy, capacity release after removal/completion, eligibility and consent requirements. Run 001/002 and concurrent cases. Add publication/application/administrative procedures and runtime grants before live use; the proof slice alone does not grant a working API.
2. **M2 personal:** approve Lab versions/comparability and age/guardian/retention. Then implement versioned instruments, deterministic Recovery Engine, activity/shield evidence contracts and private access tests. No AI mutation path.
3. **M3–M5 operations:** introduce Initiative waitlist held offers, Groups/tasks and Session mode pools, with full source-linked correction tests; complete cases in `003` against real target migrations. Keep Rep-only rejection/removal/suspension/restoration/block powers.
4. **M6 Provider:** resolve safety/booking/cancellation and offer priority policy before collecting incident data; test two-connection expiry and confirm races.
5. **M7–M9:** identified forms, accepted partnerships, governance/Community and then commercial entitlement tables only when respective policies are approved. Entitlement never grants resource access.
6. **Operational sign-off:** least-privilege runtime principal, migration principal, append-only history guard, backup/restore drill, audit access policy, file authorization, retention job, outbox dead-letter monitoring, plan/index review and privacy threat model.

## Final architectural answers

1. **هل كان تصميم 136 جدولًا مبالغًا فيه؟** نعم في تمثيل السعة بمقاعد مرقّمة غير موجودة، أربع طبقات عرض قابلة للاشتقاق، وحالتي 1:1 متوازيتين في التهيئة/التسليم. لكنه كان خريطة نطاق كاملة صحيحة في كثير من فصل الملكية والتاريخ.
2. **أي نقد من Claude صحيح؟** صحيح في المقاعد، غياب `InitiativeApplicationDecision`، موضع `SecureFile`، عدّادات الدعوة والـFK الدائرية؛ صحيح جزئيًا في المزامنة والمخرجات المشتقة. دمج RecoveryJourney وProgramStage وSessionRevision وAssessmentResponse والتقارير وتاريخ التدرج أو النطاقات في JSON/Audit وحده غير مبرهن وقد يفقد سلامة وتاريخًا مهمين. جدول [المقارنة التفصيلية](01-architecture-and-review.md#claude-claims--individual-disposition) يغطي كل قضية.
3. **كم جدولًا؟** 128 في الهدف الكامل: 136 − 9 + 1، و18 في شريحة التنفيذ الأولى. القائمتان الدقيقتان في [المصفوفة](02-table-disposition.md) و[القاموس](03-target-dictionary.md).
4. **لماذا كل جدول محتفَظ به؟** لكل واحد مسؤولية/مالك/نوع بيانات ومصدر ومحصلة حذفه في مصفوفة الـ136؛ الجداول المؤجلة تحفظ قدرات معتمدة أو مشروطة، لا تبرر بناؤها الآن.
5. **أي بدائل رُفضت؟** مقاعد مرقمة، عدّاد غير قابل للمصالحة، تاريخ أعمال في Audit فقط، JSON حين يلزم FK/نسخة/استعلام، دعوة أو مالك عام بـ`TargetType/TargetId`، وتحديث المكافأة محليًا عبر عامل غير متزامن بلا حاجة.
6. **هل حُفظ كل السلوك المعتمد؟** نعم على مستوى النموذج المستهدف: ملكيات Institution/Coach/Provider، الوقائع المنفصلة، المراجعات والمكافآت وأربع الأشجار، مع عدم ادعاء إنجاز التشغيل أو حسم السياسات المفتوحة.
7. **هل تنفذ العضوية الواحدة والخمسة أيام؟** فهرس SQL يفرض الواحدة فعليًا. إجراء الانسحاب يقارن بموعد قطع منشور محفوظ، لكن تحديد 120 ساعة أو أيام محلية وأثر إعادة الجدولة يحتاج توقيع المالك قبل الإنتاج.
8. **هل يمكن إنشاء SQL Server والتحقق دون إعادة تصميم جذري؟** شريحة الـ18 مصاغة DDL واختبارات، لكن لم تُشغّل؛ الهدف الكامل قاموس للترحيلات وليس DDL كاملًا مُجمّعًا. لا يجوز الجزم قبل تشغيل الترحيلات والسباقات والتحقق من الخصوصية.
9. **ما المعطّل بقرار منتج؟** تعريف القطع وإعادة الجدولة/التقديم/تحرير السعة، السنّ/الموافقة/الاحتفاظ، Lab والمقارنة، أثر العذر على الإكمال، انتظار العروض، الجلسة المستقلة، المدفوعات، حدود AI.
10. **قرار GO؟** **CONDITIONAL GO** لبدء تنفيذ قاعدة البيانات بالتدرج بعد قرار العضوية/الانسحاب وتشغيل اختبارات SQL؛ **لا توقيع إنتاجي** قبل استكمال بوابات الخصوصية والتزامن والسياسات المعنية.
