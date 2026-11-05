# DeepSprout — مصفوفة اختبارات اعتماد M1

**النسخة:** أولية مبنية على Product Decisions حتى 2026-11-01 وعلى تقرير v2.1؛ لا حالة PASS تنفيذية حتى الآن.

| ID | النوع | سيناريو الاختبار | النتيجة المطلوبة | الحالة الحالية |
|---|---|---|---|---|
| ENV-01 | بيئة | استعلام إصدار الخادم والإعدادات واسم القاعدة | يُوثّق إصدار SQL Server وCompatibility وRCSI | NOT RUN ON USER SERVER |
| DOC-01 | ساكن | أسماء الجداول الـ19 ضمن القاموس | 19/19 موجودة | PASS (source only) |
| DOC-02 | ساكن | 12 عمودًا حرجًا في 11 جدولًا | 0 مراجع مفقودة | **FAIL (12 missing)** |
| SQL-01 | Schema | تطبيق Migration على قاعدة `DeepSprout_Validation` فارغة | إنشاء الجداول دون خطأ | NOT RUN |
| SQL-02 | Schema | وجود الـ19 جدولًا وحقولها الأساسية | جميع نتائج `02-schema-contract-readonly.sql` PASS | NOT RUN |
| SQL-03 | Schema | FK مركب: العضوية/طلب الشخص والمبادرة | يرفض شخصًا أو مبادرة لا يطابقان الطلب | NOT RUN |
| SQL-04 | Schema | FK مركب: القرار/نسخة شروط الطلب | يرفض قرارًا يشير إلى Revision مختلفة | NOT RUN |
| SQL-05 | Schema | فهرس العضوية الفعالة على PersonId | رفض عضوية ثانية `Accepted` أو `Suspended` على مستوى القاعدة | NOT RUN |
| BLD-01 | Operation | حفظ المرحلة الأولى قبل وجود عنوان | تحفظ مسودة جزئية؛ لا تصبح Published | NOT RUN |
| BLD-02 | Operation | حفظ المسودة بصف قديم من RowVersion | كشف تعارض التعديل بدل الكتابة فوقه | NOT RUN |
| BLD-03 | Operation | نشر مسودة غير مكتملة | رفض واضح؛ لا Initiative منشورة دون Revision | NOT RUN |
| BLD-04 | Operation | نشر مسودة مكتملة | Initiative + Revision + Audit في Transaction واحدة | NOT RUN |
| BLD-05 | Security | تحديث/حذف Published Revision بحساب التطبيق | رفض التعديل والحذف | NOT RUN |
| APP-01 | Operation | Pending Applicant ينسحب قبل البت | ينتقل إلى Withdrawn؛ لا تُنشأ Membership | NOT RUN |
| APP-02 | Operation | رفض عادي ثم محاولة جديدة مع أهلية قائمة | سجل Application جديد AttemptNo=2 ويحفظ السابق | NOT RUN |
| APP-03 | Operation | Blocked Applicant يحاول التسجيل | رفض دون تخطي الحظر بإضافة AttemptNo | NOT RUN |
| APP-04 | Operation | محاولة تطبيق مفتوحة ثانية للشخص والمبادرة نفسيهما | رفض الطلب المكرر | NOT RUN |
| APP-05 | Operation | موافقة Supervisor بلا صلاحية حالية | رفض + لا Membership + دليل Audit مناسب | NOT RUN |
| APP-06 | Operation | ضغط موافقة مرتين أو retry | عضوية واحدة، قرار منضبط؛ لا حجز سعة مزدوج | NOT RUN |
| CAP-01 | Operation | قبول الطالب رقم 135 مع 134 سعة مشغولة | ينجح إذا بقية الشروط صحيحة | NOT RUN |
| CAP-02 | Operation | محاولة قبول الطالب رقم 136 بعد الامتلاء | رفض بسبب السعة | NOT RUN |
| CAP-03 | Concurrency | اتصالان يحاولان آخر وحدة سعة | قبول واحد فقط دون تجاوز | NOT RUN |
| MEM-01 | Schema+Operation | محاولتان لقبول نفس الشخص بمبادرتين | قاعدة عضوية واحدة ترفض الثانية | NOT RUN |
| MEM-02 | Operation | `Accepted` الانسحاب قبل `StartsAtUtc-120h` بلحظة | يسمح، يسجل نهاية العضوية ويحرر السعة | NOT RUN |
| MEM-03 | Operation | الانسحاب عند حد `StartsAtUtc-120h` بالضبط | رفض | NOT RUN |
| MEM-04 | Operation | الانسحاب بعد الحد | رفض | NOT RUN |
| MEM-05 | Operation | `Suspended` | يبقى ضمن السعة؛ استعادة تتطلب Representative | NOT RUN |
| MEM-06 | Operation | `Removed` أو `Completed` بعد إنهاء مشاركة فعلية | تحرر السعة فورًا، مع تاريخ النهاية | NOT RUN |
| MEM-07 | Operation | تغيير الموعد إلى وقت أقرب | لا يسقط تلقائيًا حق انسحاب كان متاحًا؛ يلزم عقد تنفيذي واضح | NOT RUN / SPEC PENDING |
| MEM-08 | Operation | إلغاء المبادرة | إنهاء/إلغاء مناسب وتحرير مطالبات دون وصفه انسحابًا طوعيًا | NOT RUN / STATE MODEL PENDING |
| SUP-01 | Operation | إضافة المشرف الثالث | يُسمح ضمن الشروط | NOT RUN |
| SUP-02 | Operation | إضافة مشرف رابع | يرفضه إجراء التعيين | NOT RUN |
| SUP-03 | Negative test | صاحب بريد آخر يقبل دعوة | يرفض بسبب عدم مطابقة البريد، **لا** بسبب امتلاء الثلاثة | NOT RUN |
| SUP-04 | Security | مشرف سحبت صلاحياته يوافق على طلب | رفض العملية | NOT RUN |
| SEC-01 | Security | مستخدم غير مخول يحاول قراءة ملف إثبات المؤسسة | رفض الوصول حتى لو عرف FileId | NOT RUN |
| SEC-02 | Security | مستخدم خاص يحاول قراءة سجلات Lab/Shield لشخص آخر | رفض عبر API/authorization (لاحقًا) | NOT RUN / LATER SLICE |
| HIST-01 | Integrity | قرار قديم بعد إعادة التقديم/التعديل | لا تعديل للقرار القديم ولا فقد للنسخة الأصلية | NOT RUN |
| EF-01 | Migrations | إنشاء نفس القاعدة من الصفر بمشروع EF | نفس Schema/قيود Migration | NOT RUN |
| EF-02 | Migrations | تحديث قاعدة الاختبار بعد Migration جديدة | لا حذف بيانات غير مقصود ولا اختلاف مخطط | NOT RUN |

**تعريف النجاح:** يجب أن تكون جميع اختبارات M1 المنطبقة قد نُفذت وأن تكون PASS مع سجل حقيقي. لا يُعتبر فشل متوقع بسبب FK/UNIQUE/CHECK مشكلة، بل **نجاحًا للاختبار السلبي فقط إذا وقع لسبب صحيح ومحدد** (error number مثل 547 أو 2601/2627 مع تعريف القيد الصحيح). مجرد حصول أي exception لا يكفي.

**اختبارات التزامن:** نحتاج اتصالين مستقلين وحاجز بدء، وحالة بيانات مضبوطة مسبقًا، وتسجيل عدد العضويات والـAudit بعد الانتهاء؛ لا يكفي تشغيل إجراء مرتين بصورة متتابعة.

**خارج M1:** Lab/Shield/Provider/Forms/Rewards لم يتم تطبيق DDL الخاص بها؛ فحص العلاقات المركبة الـ59 في Markdown لا يُعد اختبارًا إنتاجيًا لها.
