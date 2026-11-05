"""Generate review artifacts from read-only sys catalog metadata. No database writes."""
from __future__ import annotations

import collections
import csv
import datetime as dt
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
DATA = json.loads((HERE / "live-schema.json").read_text(encoding="utf-8"))
DICTIONARY = ROOT / "docs/architecture/database/v2.1/02-canonical-dictionary.md"
SNAPSHOT = ROOT / "Server/src/DeepSprout.Infrastructure/Migrations/DeepSproutDbContextModelSnapshot.cs"
CLAUDE_MATRIX = ROOT / "docs/architecture/database/v3-necessity-audit/02-table-matrix-ar.md"

# A SAFE finding concerns the architecture only; no live migration is authorized.
SAFE = {"governance.GovernanceAction"}
CONDITIONAL = {
    "lab.AssessmentInstrument", "recovery.RecoveryJourney", "coach.CoachApproval",
    "coach.ProgramStage", "coach.InitiativeGroupPlacement", "coach.ProgramCompletion",
    "task.SupervisorReport", "provider.ProviderVerificationCase",
    "provider.ExperienceSession", "provider.ProviderStaffAppointment",
    "provider.ProviderAppointmentSession", "provider.ProviderAttendance",
    "provider.CampCompletion", "partnership.ExperienceLink", "institution.InitiativeDraft",
}
COMPENSATION = {
"governance.GovernanceAction":"انقل ActorPersonId/ActionCode/ResourceType/ResourcePublicId/Reason/AtUtc إلى AuditEvent مع CorrelationId فريد، وثبّت نوع الحدث واستعلامات الحوكمة والتدقيق.",
"lab.AssessmentInstrument":"يلزم رمز أداة ثابت قابل للإشارة، وحالة نشر/تقاعد مستقلة، وإعادة توجيه FK المحاولة إلى نسخة الأداة مع اختبارات المقارنة.",
"recovery.RecoveryJourney":"لا يُقبل إلا إذا أكد المالك عدم الحاجة إلى رحلات متعددة أو أرشفة رحلة مستقلة؛ احفظ تسلسل الدورات ومعرّف الشخص والفهرس الفريد.",
"coach.CoachApproval":"أنشئ VerificationCase ذا XOR حقيقي لموضوع Coach/Institution/Provider، مع FK لكل نوع، وسياسات قرار وإذن وخصوصية منفصلة.",
"coach.ProgramStage":"يمكن تضمين مراحل النسخة المنشورة في JSON بشرط التحقق من البنية والترتيب والهوية قبل النشر وتثبيت النسخة واختبار استعلامات التقارير.",
"coach.InitiativeGroupPlacement":"حافظ على كل سجل انتقال للمجموعة وتواريخه، وFK مركب للعضوية المقبولة والمبادرة، ومنع وصل طالب/مجموعة من مبادرتين مختلفتين.",
"coach.ProgramCompletion":"يتطلب Completion موحداً بمفاتيح typed/XOR وFK لنسخة البرنامج والعضوية، مع سياسات الإكمال والخصوصية المنفصلة.",
"task.SupervisorReport":"اجمع التقريرين فقط مع GroupId XOR InitiativeId، وFK فعلي لكل مالك، وإذن قراءة مختلف للمدرب والمشرف، واختبارات النطاق.",
"provider.ProviderVerificationCase":"يتطلب VerificationCase موحداً مع FK/XOR لموضوع المزود وحالات مراجعة مستقلة وإذن إثبات ضيق.",
"provider.ExperienceSession":"يلزم Session موحد بمالك Initiative XOR Experience، وFKs للحجز/الحضور/المشرف، وفصل أهلية المشرف والسعة وسياسات الأمان.",
"provider.ProviderStaffAppointment":"يلزم StaffAppointment واحد بمفتاح مورد typed/XOR وقيود منع التفويض العابر وحصص المشرفين الخاصة بالمبادرة.",
"provider.ProviderAppointmentSession":"يلزم SessionDuty موحد يشير عبر FK إلى تعيين المزود وجلسة تجربته نفسها، ويحفظ تاريخ التكليف.",
"provider.ProviderAttendance":"يلزم Attendance موحد مع Booking XOR Registration وFKs مركبة للموارد والأشخاص، ومصادر مكافأة منفصلة وقيود الصلاحية.",
"provider.CampCompletion":"يلزم Completion موحد مع Booking FK وسياسة إكمال المخيم ونسخة التجربة، دون تحويل مجرد حضور إلى إكمال.",
"partnership.ExperienceLink":"يلزم PartnershipLink مع ProgramId XOR ExperienceId وFK لكل مالك، وفهارس فريدة مفلترة لكل نوع وحالة الرابط.",
"institution.InitiativeDraft":"يلزم حفظ مراحل المسودة ونسخة الأساس وآخر محرر وقفل تزامن مستقل عن تحديث الجذر، ونشر ذري إلى Revision ثابتة.",
}

PURPOSES = {
"dbo": {"__EFMigrationsHistory":"سجل EF Core التقني لمعرّفات الترحيلات المنفذة وإصدار المنتج", "sysdiagrams":"تعريفات مخططات SQL Server Management Studio المحفوظة، وليست سجلات منتج"},
"activity": {
"OfflineRoutine":"تعريف روتين واقعي يختاره الفرد خارج الشاشة", "PracticeAttempt":"محاولة أداء تمرين ذي معنى ودليل نتيجتها", "PracticeDefinition":"تعريف نوع التمرين ومجاله", "PracticeProgressionDecision":"قرار تقدم مستوى المهارة المرتبط بمحاولة مثبتة", "PracticeVersion":"نسخة محتوى التمرين وسياسة تقييمه", "RoutineCheckIn":"تسجيل تحقق فردي من الروتين دون تحويله إلى مكافأة تلقائية"},
"coach": {
"CoachApproval":"مراجعة أهلية المدرب المستقل ومنحها أو تعليقها", "CoachProgram":"برنامج مستقل يملكه مدرب", "GroupCoachAssignment":"إسناد مدرب إلى مجموعة تشغيلية بصلاحيات محددة", "InitiativeGroupPlacement":"موضع الطالب التاريخي في مجموعة مبادرة", "OperationalGroup":"مجموعة تشغيلية تتبع مبادرة أو برنامجاً واحداً", "ProgramCompletion":"إكمال الطالب لبرنامج المدرب بمصدر معتمد", "ProgramGroupInvitation":"دعوة طالب إلى مجموعة برنامج", "ProgramGroupMembership":"عضوية الطالب المقبولة في مجموعة البرنامج", "ProgramRevision":"نسخة منشورة من شروط ومحتوى البرنامج", "ProgramStage":"مرحلة مرتبة داخل نسخة البرنامج"},
"commercial": {
"EntitlementAllocation":"تخصيص حق استخدام لمستفيد محدد", "PlanFeature":"ميزة معلنة ضمن نسخة خطة", "PlanVersion":"نسخة سعر ومزايا خطة الاشتراك", "Subscription":"اشتراك صاحب الحساب وحالته", "UsageLedger":"سجل استهلاك حق مدفوع أو محدود"},
"community": {
"Bookmark":"حفظ منشور للعودة إليه", "Comment":"تعليق على منشور مجتمعي", "ContentReport":"بلاغ عن محتوى يحتاج مراجعة", "JointGoal":"هدف جماعي اختياري منفصل عن خطة التعافي", "JointGoalCheckIn":"مساهمة عضو في هدف جماعي", "JointGoalMember":"عضوية شخص في هدف جماعي", "ModerationDecision":"قرار إشراف موثق على بلاغ", "Post":"منشور يكتبه عضو المجتمع", "Reaction":"تفاعل شخص مع منشور"},
"evidence": {
"EvidenceEvent":"حدث دليل فريد يربط الإنجاز بمصدر قابل للتدقيق", "GroupGarden":"مشهد الحديقة الجماعية المملوك لمبادرة أو مجموعة مستقلة", "GroupRewardEntry":"قيد أثر جماعي ناتج عن دليل وسياسة", "PersonalRewardEntry":"قيد أثر حديقة شخصية ناتج عن دليل وسياسة", "RewardPolicyVersion":"نسخة سياسة تحدد أهلية المكافآت وحدودها"},
"files": {"SecureFile":"بيانات وصفية لملف إثبات محمي وصلاحية الوصول إليه"},
"forms": {
"Competition":"مسابقة داخل مبادرة", "CompetitionCriterion":"معيار تحكيم محدد للمسابقة", "CompetitionCriterionScore":"درجة معيار واحد في حكم موثق", "CompetitionEntry":"مشاركة متسابق أو فريق", "CompetitionJudgment":"قرار المحكم على مشاركة", "Form":"نموذج أو استبيان مملوك لمبادرة", "FormAnswer":"إجابة سؤال في استجابة محددة", "FormAnswerChoice":"خيار محدد من إجابة متعددة الخيارات", "FormQuestion":"سؤال تابع لنسخة نموذج", "FormQuestionOption":"خيار إجابة معرّف لسؤال", "FormResponse":"استجابة طالب لنموذج منشور", "FormVersion":"نسخة منشورة ثابتة من النموذج"},
"governance": {"ContentRelease":"إصدار محتوى معتمد قبل نشره", "GovernanceAction":"إجراء إداري على مورد مع سبب وهوية فاعله"},
"iam": {"ConsentRecord":"قرار موافقة أو سحب موافقة مع نسخة الإشعار", "GlobalGrant":"منحة صلاحية نظامية لشخص", "OtpChallenge":"تحدي تحقق مؤقت للحساب", "PasswordCredential":"اعتماد كلمة مرور محمي وقابل للتدوير", "Person":"هوية الشخص المشتركة بين جميع الأدوار", "PersonEmail":"عنوان بريد الشخص وحالة التحقق منه"},
"institution": {
"Initiative":"المبادرة التي تملكها المؤسسة وحالتها وسعتها", "InitiativeApplication":"محاولة طلب انضمام طالب إلى مبادرة", "InitiativeApplicationDecision":"سجل قرارات الطلب المتتابعة ومن اتخذها", "InitiativeContent":"ربط إصدار محتوى معتمد بمبادرة", "InitiativeDraft":"مسودة مراحل بناء المبادرة القابلة للاستئناف", "InitiativeMembership":"حق مشاركة الطالب المقبول ومقعده في المبادرة", "InitiativeRevision":"نسخة شروط المبادرة المنشورة وغير القابلة للتعديل", "InitiativeSeatOffer":"عرض مقعد مؤقت لطالب في قائمة الانتظار", "InitiativeStaffAppointment":"تكليف موظف بمهام مبادرة محددة", "InitiativeStaffInvitation":"دعوة موظف إلى دور في مبادرة", "Institution":"كيان المؤسسة الخاضع للتحقق", "InstitutionVerificationCase":"طلب إثبات المؤسسة وقرار مراجعته", "RepresentativeMembership":"صلاحية ممثل شخصي لإدارة المؤسسة"},
"lab": {"AssessmentAttempt":"محاولة تقييم لفرد ضمن أداة ونافذة", "AssessmentInstrument":"تعريف أداة تقييم منشورة", "AssessmentResponse":"إجابة بند أو تجربة ضمن محاولة تقييم", "AssessmentScore":"درجة محسوبة من محاولة ونسخة خوارزمية", "AssessmentWindow":"نافذة إعادة تقييم محددة للفرد", "InstrumentVersion":"نسخة بروتوكول ومحتوى أداة التقييم"},
"ops": {"AuditEvent":"أثر تدقيق مستقل لإجراء على مورد", "DeliveryAttempt":"محاولة تسليم إشعار عبر قناة", "IdempotencyRecord":"مفتاح يمنع تكرار تنفيذ أمر حساس", "Notification":"إشعار موجه لشخص عن حدث", "OutboxMessage":"حدث ينتظر نشره بعد التزام المعاملة"},
"partnership": {"ExperienceLink":"ربط تجربة مزود بمبادرة دون نقل ملكيتها", "ProgramLink":"ربط برنامج مدرب بمبادرة دون نقل ملكيته"},
"personal": {"IndividualProfile":"إعداد الفرد وتقدمه في التهيئة وتفضيلاته"},
"provider": {
"CampCompletion":"إكمال مخيم مثبت حسب سياسة المزود", "Experience":"تجربة خارجية يملكها مزود مستقل", "ExperienceBooking":"حجز شخص ومقعده في تجربة", "ExperienceRevision":"نسخة منشورة من تفاصيل وشروط التجربة", "ExperienceSession":"جلسة أو محطة زمنية ضمن التجربة", "Provider":"كيان المزود المستقل عن المؤسسة", "ProviderAppointmentSession":"ربط تكليف مشرف بجلسة تجربة", "ProviderAttendance":"حقيقة حضور شخص في تجربة أو جلسة", "ProviderAttendanceCorrection":"تصحيح منسوب على حضور المزود", "ProviderCohort":"فوج تشغيلي لتنسيق تجربة", "ProviderCohortMember":"عضوية مشارك في فوج تجربة", "ProviderIncident":"واقعة سلامة أو تشغيل تتطلب سجلاً مقيداً", "ProviderMembership":"صلاحية ممثل شخصي داخل المزود", "ProviderStaffAppointment":"تكليف موظف مزود بنطاق محدد", "ProviderStaffInvitation":"دعوة موظف للعمل ضمن المزود", "ProviderVerificationCase":"طلب تحقق المزود ومستنداته وقراره", "SeatOffer":"عرض مقعد مؤقت لحجز في قائمة انتظار تجربة"},
"recovery": {"PlanRevision":"نسخة خطة تعافٍ بأهداف وأنشطة محددة", "RecoveryCycle":"دورة تعافٍ لمدة محددة وحالتها", "RecoveryJourney":"سلسلة دورات التعافي الخاصة بفرد", "ScheduledAction":"التزام مجدول ضمن خطة فردية", "WeeklyReview":"مراجعة أسبوعية للخطة مع دليل التعديل"},
"session": {"AbsenceExcuse":"عذر غياب وتوصية وقرار منفصل عن الحضور", "AttendanceCorrection":"تصحيح منسوب لحقيقة حضور محفوظة", "InitiativeCompletion":"إكمال مبادرة وفق شروط منشورة", "InitiativeSessionDuty":"تكليف مشرف بحضور جلسة مبادرة", "Session":"جلسة مشتركة منشورة للمبادرة", "SessionAttendance":"حقيقة حضور مسجل في جلسة", "SessionCapacityPool":"حوض مقاعد مشترك يحمي سعة الجلسة", "SessionRegistration":"حجز شخص لمقعد في جلسة", "SessionRevision":"نسخة وقت ومكان وقواعد جلسة منشورة", "StandaloneSessionSupervisorAppointment":"تكليف مشرف لجلسة مستقلة"},
"shield": {"BrowserUsageDomain":"مدة رصد نطاق محدد ضمن فترة استخدام", "BrowserUsagePeriod":"فترة استخدام متصفح من تركيب وإعداد معروفين", "ExtensionInstallation":"تركيب إضافة المتصفح المرتبط بفرد", "ProtectionSession":"جلسة عمل محمية اختيارية للفرد", "ShieldConfiguration":"إعداد حماية المواقع والتذكير", "ShieldSelectedDomain":"نطاق يختاره الفرد للحماية أو الرصد"},
"task": {"Assignment":"تكليف نشاط لفرد أو مجموعة ضمن مالك واضح", "AssignmentRecipient":"مستلم التكليف وحالته الخاصة", "AssignmentRevision":"نسخة منشورة من تعليمات التكليف", "CoachReport":"تقرير مدرب في نطاقه المرخص", "ReviewDecision":"قرار مراجعة محاولة تسليم", "ReviewPrivateNote":"ملاحظة مراجعة خاصة لا تظهر للطالب", "SubmissionAttempt":"محاولة تسليم مؤرخة من المستلم", "SupervisorReport":"تقرير مشرف عن نطاقه المعين"}
}

SPECIAL_RISKS = {
"institution.InitiativeApplication":"دمجه مع العضوية يمحو الطلبات المرفوضة والمنتظرة ومحاولات إعادة التقديم، ويخلط قرار القبول مع استهلاك المقعد.",
"institution.InitiativeMembership":"دمجه مع الطلب يضعف FK المركب للتسجيل والمجموعات والحضور ويضيع دورة المقعد بعد القبول.",
"institution.InitiativeSeatOffer":"دمجه في حالة الطلب أو JSON يضيع تواريخ العروض المتعاقبة وانتهاء المهلة وتنافس حجز المقعد.",
"institution.Institution":"دمجه مع المزود يخلط التحقق والملكية والتفويض وحصص النشر للمؤسسات مع مسؤولية السلامة والحجوزات للمزود.",
"provider.Provider":"دمجه مع المؤسسة يخلط الجهة المشغلة للتجربة مع الجهة المنظمة للمبادرة وحدود البيانات.",
"session.SessionCapacityPool":"إزالته تضعف حجز السعة المشتركة عندما تخدم جلسة أكثر من مسار مشاركة.",
"session.SessionAttendance":"حقيقة الحضور مستقلة عن الحجز والعذر والإكمال؛ دمجها يلغي هذا الفصل.",
"session.AttendanceCorrection":"دمجه في AuditEvent عام يفقد FK إلى سجل الحضور وقيود التصحيح وسبب القرار.",
"forms.FormQuestion":"تخزين الأسئلة في JSON يحذف FK من الإجابة إلى سؤال النسخة المعتمدة.",
"forms.FormQuestionOption":"تخزين الخيارات في JSON يحذف FK من الخيار المختار إلى خيار سؤال منشور.",
"forms.FormAnswerChoice":"تخزين الاختيارات في JSON يضعف تحقق السؤال والخيار والتعددية.",
"lab.AssessmentResponse":"دمج الإجابات مع الدرجة يلغي تفاصيل المحاولة والتحليل وإعادة الحساب.",
"lab.AssessmentScore":"دمج الدرجات مع المحاولة يضيع رقم خوارزمية التقييم وقابلية مقارنة النتائج.",
"iam.PasswordCredential":"دمج الاعتماد مع Person يوسع سطح الاطلاع على بيانات حساسة ويخلط دورة تدوير الاعتماد بالهوية.",
"coach.ProgramGroupMembership":"إزالته تفقد تاريخ قبول الطالب في مجموعة البرنامج وروابطه.",
"coach.InitiativeGroupPlacement":"دمجه مع العضوية الحالية يفقد تغييرات موضع الطالب التاريخية بين مجموعات المبادرة.",
"evidence.EvidenceEvent":"إزالته تجعل المكافأة بلا مصدر فريد قابل للتدقيق.",
"evidence.PersonalRewardEntry":"دمجه مع حالة الحديقة فقط يفقد قيود التعويض ومنع تكرار المصدر.",
"evidence.GroupRewardEntry":"دمجه مع الحديقة فقط يفقد سبب الأثر الجماعي ومنع التكرار."
}

WORD_AR = {"Id":"معرّف", "Public":"عام", "Person":"شخص", "User":"مستخدم", "Institution":"مؤسسة", "Provider":"مزود", "Initiative":"مبادرة", "Experience":"تجربة", "Session":"جلسة", "Group":"مجموعة", "Program":"برنامج", "Coach":"مدرب", "Assignment":"تكليف", "Recipient":"مستلم", "Application":"طلب", "Membership":"عضوية", "Booking":"حجز", "Offer":"عرض", "Seat":"مقعد", "Attendance":"حضور", "Correction":"تصحيح", "Decision":"قرار", "Response":"استجابة", "Answer":"إجابة", "Question":"سؤال", "Option":"خيار", "Criterion":"معيار", "Score":"درجة", "Attempt":"محاولة", "Version":"نسخة", "Revision":"مراجعة", "Policy":"سياسة", "Status":"حالة", "Type":"نوع", "Kind":"نوع", "Code":"رمز", "Name":"اسم", "Title":"عنوان", "Description":"وصف", "Summary":"ملخص", "Reason":"سبب", "Note":"ملاحظة", "Content":"محتوى", "File":"ملف", "Hash":"بصمة", "Key":"مفتاح", "Token":"رمز", "Email":"بريد", "Password":"كلمة مرور", "Normalized":"موحد الصيغة", "Created":"إنشاء", "Updated":"تحديث", "Submitted":"إرسال", "Published":"نشر", "Decided":"بتّ", "Started":"بدء", "Ended":"انتهاء", "Expires":"انقضاء", "At":"وقت", "Utc":"UTC", "Date":"تاريخ", "Local":"محلي", "Time":"وقت", "No":"رقم", "Count":"عدد", "Amount":"مبلغ", "Price":"سعر", "Currency":"عملة", "Capacity":"سعة", "Is":"هل", "Has":"يملك", "By":"بواسطة", "From":"من", "To":"إلى", "Current":"حالي", "Previous":"سابق", "Source":"مصدر", "Target":"هدف", "Owner":"مالك", "Actor":"فاعل", "Evidence":"دليل", "Reward":"مكافأة", "Garden":"حديقة", "Stage":"مرحلة", "Order":"ترتيب", "Value":"قيمة", "Metric":"مقياس", "Minutes":"دقائق", "Seconds":"ثوان", "Duration":"مدة", "Window":"نافذة", "Channel":"قناة", "Method":"طريقة", "Outcome":"نتيجة", "Active":"نشط", "Primary":"أساسي", "Verified":"موثق", "Released":"محرر", "Reference":"مرجع", "Ref":"مرجع", "Snapshot":"لقطة", "Json":"JSON", "Row":"صف", "RowVersion":"إصدار صف للتزامن"}

def full(row, a="SchemaName", b="TableName"):
    return f"{row[a]}.{row[b]}"

def index_by_table(rows, a="SchemaName", b="TableName"):
    d = collections.defaultdict(list)
    for r in rows: d[full(r,a,b)].append(r)
    return d

TABLES = [full(t) for t in DATA["tables"] if t["SchemaName"] != "dbo"]
ADMIN_TABLES = [full(t) for t in DATA["tables"] if t["SchemaName"] == "dbo"]
COLS = index_by_table(DATA["columns"])
CHECKS = index_by_table(DATA["checks"])
KEYS = index_by_table(DATA["key_columns"])
INDEXES = index_by_table(DATA["indexes"])
TRIGGERS = index_by_table(DATA["triggers"])
FK_GROUPS = collections.defaultdict(list)
for x in DATA["foreign_key_columns"]:
    FK_GROUPS[(full(x,"FromSchema","FromTable"),x["ForeignKeyName"])].append(x)
FKS_OUT = collections.defaultdict(list)
FKS_IN = collections.defaultdict(list)
for (source,name), pairs in FK_GROUPS.items():
    pairs.sort(key=lambda x:x["Ordinal"])
    target=full(pairs[0],"ToSchema","ToTable")
    item={"name":name,"source":source,"target":target,"from":[p["FromColumn"] for p in pairs],"to":[p["ToColumn"] for p in pairs],"on_delete":pairs[0]["OnDelete"],"disabled":pairs[0]["IsDisabled"],"untrusted":pairs[0]["IsNotTrusted"]}
    FKS_OUT[source].append(item); FKS_IN[target].append(item)

def type_text(c):
    t=c["TypeName"]
    if t in ("nvarchar","nchar"):
        return f"{t}({'max' if c['MaxLength']==-1 else c['MaxLength']//2})"
    if t in ("varchar","char","varbinary","binary"):
        return f"{t}({'max' if c['MaxLength']==-1 else c['MaxLength']})"
    if t in ("decimal","numeric"):
        return f"{t}({c['PrecisionValue']},{c['ScaleValue']})"
    if t in ("datetime2","datetimeoffset","time"):
        return f"{t}({c['ScaleValue']})"
    return t

def arabic_column(c, table):
    n=c["ColumnName"]
    admin={"MigrationId":"معرّف الترحيل الذي طبقه EF Core.","ProductVersion":"إصدار EF Core الذي سجّل الترحيل.","name":"اسم المخطط المحفوظ.","principal_id":"معرّف مالك مخطط SSMS.","diagram_id":"المعرّف الداخلي للمخطط.","version":"إصدار تمثيل المخطط.","definition":"محتوى الرسم الثنائي المحفوظ بواسطة SSMS."}
    if table.startswith('dbo.') and n in admin:return admin[n]
    standard={"Id":"المعرّف الداخلي للصف.","PublicId":"المعرّف العام الآمن لعرض المورد خارج قاعدة البيانات.","CreatedAtUtc":"وقت إنشاء الصف بتوقيت UTC.","UpdatedAtUtc":"وقت آخر تعديل بتوقيت UTC.","RowVersion":"رمز SQL Server للتزامن المتفائل؛ يتغير مع التحديث.","Status":"الحالة التشغيلية الحالية؛ القيم المقبولة موضحة في قيود CHECK أدناه."}
    if n in standard:return standard[n]
    refs=[f for f in FKS_OUT[table] if n in f["from"]]
    if refs:
        targets=", ".join(sorted({f["target"] for f in refs}))
        return f"معرّف مرجعي إلى {targets}؛ يشارك في FK حقيقي." 
    words=re.findall(r"[A-Z][a-z0-9]*|[0-9]+|UTC|JSON",n)
    label=" ".join(WORD_AR.get(w,w) for w in words) or n
    return f"حقل {label} ضمن سجل {PURPOSES.get(table.split('.')[0],{}).get(table.split('.')[1],table)}."

def table_class(name):
    cs=COLS[name]
    if name.startswith("ops."):return "بنية تشغيلية" 
    if name.endswith(("Revision","Version")) or name in ("governance.ContentRelease",):return "نسخ/إصدارات"
    if name.endswith(("Decision","Correction","Attempt","Event","Entry","Ledger","Record","CheckIn","Score","Judgment")) or any(c["ColumnName"]=="RowVersion" for c in cs)==False:return "تاريخ/أدلة"
    return "بيانات أساسية"

def necessity(name):
    if name=='dbo.__EFMigrationsHistory':return 'يحتاج EF Core إلى سجل منفصل لمعرفة الترحيلات المطبقة؛ لا يخص بيانات المستخدم.'
    if name=='dbo.sysdiagrams':return 'يحفظ أداة SSMS رسوماتها هنا؛ لا يُعد جدول منتج ولا يشارك في قرار التبسيط.'
    if name=='governance.GovernanceAction':return 'لا يحتاج جدولاً مستقلاً بعد نقل كل حقوله ودلالته إلى AuditEvent؛ لا يرد عليه FK تابع، ويجب تثبيت استعلامات الحوكمة وحفظ الوقت والفاعل والسبب.'
    if name in SPECIAL_RISKS:return SPECIAL_RISKS[name]
    classification=table_class(name)
    if classification=="نسخ/إصدارات":return "تحتفظ هذه النسخة بالشروط المنشورة عند حدوث المعاملة؛ دمجها في السجل الحالي يمحو سياق الماضي."
    if classification=="تاريخ/أدلة":return "يسجل هذا الصف واقعة أو قراراً متعدداً عبر الزمن؛ دمجه في الحالة الحالية يفقد ترتيب الأحداث وإسنادها."
    if classification=="بنية تشغيلية":return "له دورة معالجة مستقلة ومفتاح تكرار أو تسليم أو تدقيق؛ دمجه بمورد المنتج يربك إعادة المحاولة والمراقبة."
    if FKS_IN[name]:return "تشير إليه سجلات أخرى بمفاتيح خارجية؛ دمجه يتطلب إعادة تصميم كل المراجع والقيود ودورة الحياة."
    if FKS_OUT[name]:return "يمثل علاقة أو حالة ذات قيود ومراجع مستقلة؛ دمجه يتطلب نقل مفاتيحه وقيوده دون فقد سلامة الإشارة."
    return "يمثل أصلاً مستقلاً في المجال؛ حذفه يفقد تعريفه وإدارته المنفصلة."

def workflow(name):
    if name=='dbo.__EFMigrationsHistory':return 'عند تطبيق Migration يسجل EF Core معرّفها وإصداره؛ لا ينشئ المستخدم هذا الصف.'
    if name=='dbo.sysdiagrams':return 'عند حفظ رسم قاعدة البيانات في SSMS تضيف الأداة تعريف الرسم؛ لا يدخل هذا في سير مستخدم DeepSprout.'
    purpose=PURPOSES.get(name.split('.')[0],{}).get(name.split('.')[1],name)
    parents=[f["target"] for f in FKS_OUT[name] if f["target"] != "iam.Person"]
    linked="، ويرتبط بمفتاح خارجي مع " + " و ".join(dict.fromkeys(parents[:2])) if parents else ""
    if table_class(name) in ("تاريخ/أدلة","نسخ/إصدارات"):
        return f"مثال: عند اعتماد {purpose} يُدرج صف جديد في {name}{linked}؛ يبقى الصف السابق شاهداً على ما حدث."
    if any(c["ColumnName"]=="Status" for c in COLS[name]):
        return f"مثال: عند بدء {purpose} يُدرج صف في {name}{linked}؛ وعند انتقاله إلى الحالة التالية تُحدّث Status تحت قيود الجدول."
    return f"مثال: عند إعداد {purpose} يُدرج صف في {name}{linked}؛ وتستخدمه السجلات التابعة عبر FK."

def fmt_fk(f):
    return f"{f['name']}: ({', '.join(f['from'])}) → {f['target']}({', '.join(f['to'])}) [ON DELETE {f['on_delete']}]"

def unique_indexes(name):
    groups=collections.defaultdict(list)
    for r in INDEXES[name]:
        if r["IsUnique"] and r["ColumnName"] is not None:groups[r["IndexName"]].append(r)
    out=[]
    for key,rows in sorted(groups.items()):
        cols=[x["ColumnName"] for x in sorted(rows,key=lambda x:x["KeyOrdinal"]) if x["KeyOrdinal"]>0]
        out.append(f"{key}: ({', '.join(cols)})" + (f" WHERE {rows[0]['FilterDefinition']}" if rows[0]["HasFilter"] else ""))
    return out

def relationship_cardinality(f):
    nullable=any(c["ColumnName"] in f["from"] and c["IsNullable"] for c in COLS[f["source"]])
    # Filtered unique indexes only constrain a subset of rows; don't call them global 1:1.
    groups=collections.defaultdict(list)
    for r in INDEXES[f["source"]]:
        if r["IsUnique"] and not r["HasFilter"] and r["KeyOrdinal"]>0:
            groups[r["IndexName"]].append(r["ColumnName"])
    one=any(set(cols)==set(f["from"]) and len(cols)==len(f["from"]) for cols in groups.values())
    return ("0..1" if nullable else "1")+" parent; "+("0..1" if one else "0..N")+" child"

def states(name):
    values=[]
    for c in CHECKS[name]:
        if "Status" in c["Definition"] or "State" in c["Definition"]:
            vals=re.findall(r"N?'([^']+)'",c["Definition"])
            if vals:values.extend(vals)
    return ", ".join(dict.fromkeys(values)) or "لا يوجد تعداد حالة مثبت بقيد CHECK؛ راجع قيود الجدول وإجراءات الانتقال."

def snapshot_comparison():
    text=SNAPSHOT.read_text(encoding="utf-8")
    starts=list(re.finditer(r'modelBuilder\.Entity\("[^"]+", b =>',text))
    snap={}
    for i,m in enumerate(starts):
        block=text[m.start():starts[i+1].start() if i+1<len(starts) else len(text)]
        tab=re.search(r'b\.ToTable\("([^"]+)", "([^"]+)"',block)
        if not tab:continue
        name=f"{tab.group(2)}.{tab.group(1)}"
        snap[name]=set(re.findall(r'b\.Property<[^>]+>\("([^"]+)"\)',block))
    live=set(TABLES)
    diffs=[]
    for name in sorted(live & set(snap)):
        lc={c["ColumnName"] for c in COLS[name]}
        missing=sorted(snap[name]-lc); extra=sorted(lc-snap[name])
        if missing or extra:diffs.append((name,missing,extra))
    return snap,sorted(live-set(snap)),sorted(set(snap)-live),diffs

def dictionary_comparison():
    rows={}
    for line in DICTIONARY.read_text(encoding="utf-8").splitlines():
        m=re.match(r"\| `([^`]+)` [^|]+ \|",line)
        if m:rows[m.group(1)]=line
    return rows,sorted(set(TABLES)-set(rows)),sorted(set(rows)-set(TABLES))

def claude_rows():
    schema=''; rows={}
    for line in CLAUDE_MATRIX.read_text(encoding='utf-8').splitlines():
        if line.startswith('### `'):schema=line.split('`')[1]
        match=re.match(r'\| (\d+) \| `([^`]+)` \|',line)
        if match:
            cells=[x.strip() for x in line.strip().strip('|').split('|')]
            rows[f"{schema}.{match.group(2)}"]={"action":cells[-2],"claude_loss":cells[-1],"row":int(match.group(1))}
    assert set(rows)==set(TABLES),(set(TABLES)-set(rows),set(rows)-set(TABLES))
    return rows

CLAUDE = claude_rows()

def verdict(name):
    a=CLAUDE[name]["action"]
    if a.startswith('MERGE') or a=='REMOVE':
        return 'SAFE' if name in SAFE else 'CONDITIONAL' if name in CONDITIONAL else 'REJECT'
    if a.startswith('DEFER'):return 'DEFER-POLICY'
    return 'KEEP'

def recommendation(name):
    v=verdict(name)
    return 'MERGE' if v=='SAFE' else 'DEFER' if v=='DEFER-POLICY' else 'KEEP'

def verdict_reason(name):
    v=verdict(name)
    if v=='SAFE':return COMPENSATION[name]
    if v=='CONDITIONAL':return COMPENSATION[name]
    if v=='REJECT':return necessity(name)
    if v=='DEFER-POLICY':return 'تأجيل قرار الميزة على مستوى المنتج؛ لا يُحذف الجدول من قاعدة التحقق ولا تُزال بياناته الآن.'
    return necessity(name)

def write_csv_matrix():
    path=HERE/"table-decision-matrix.csv"
    with path.open("w",encoding="utf-8-sig",newline="") as fh:
        w=csv.writer(fh)
        w.writerow(["CurrentTable","Domain","Classification","ClaudeCAction","ClaudeLossClaim","ReviewVerdict","RecommendedAction","RecommendedDestination","CompensatingConstraintOrReason","LossIfMergedOrRemoved","OutgoingFKCount","IncomingFKCount","ColumnCount"])
        for name in TABLES:
            w.writerow([name,name.split('.')[0],table_class(name),CLAUDE[name]['action'],CLAUDE[name]['claude_loss'],verdict(name),recommendation(name),"ops.AuditEvent" if name=="governance.GovernanceAction" else name,verdict_reason(name),necessity(name),len(FKS_OUT[name]),len(FKS_IN[name]),len(COLS[name])])
    return path

def write_mermaid():
    diagrams=HERE/"diagrams";diagrams.mkdir(exist_ok=True)
    schema_tables=collections.defaultdict(list)
    for name in TABLES:schema_tables[name.split('.')[0]].append(name)
    def safe(x):return x.replace('.','_').replace('-','_')
    # All relationship edges are retained; repeated FK paths remain separate.
    full_lines=["erDiagram"]
    for name in TABLES:full_lines.append(f"    {safe(name)} {{\n        bigint Id PK\n    }}")
    for fs in FKS_OUT.values():
        for f in fs:
            if f["target"] in TABLES:
                label=f["name"]+" "+"+".join(f["from"])+" to "+"+".join(f["to"])
                full_lines.append(f'    {safe(f["target"])} ||--o{{ {safe(f["source"])} : "{label}"')
    (diagrams/"all-tables.mmd").write_text("\n".join(full_lines)+"\n",encoding="utf-8")
    for schema,names in schema_tables.items():
        lines=["erDiagram"]
        edges=[];nodes=set(names)
        for name in names:
            for f in FKS_OUT[name]:
                edges.append(f);nodes.add(f["target"])
            for f in FKS_IN[name]:
                edges.append(f);nodes.add(f["source"])
        for name in sorted(nodes):lines.append(f"    {safe(name)} {{\n        bigint Id PK\n    }}")
        seen=set()
        for f in edges:
            key=(f["source"],f["name"])
            if key in seen:continue
            seen.add(key)
            label=f["name"]+" "+"+".join(f["from"])+" to "+"+".join(f["to"])
            lines.append(f'    {safe(f["target"])} ||--o{{ {safe(f["source"])} : "{label}"')
        (diagrams/f"{schema}.mmd").write_text("\n".join(lines)+"\n",encoding="utf-8")
    # Readable static overview, derived from actual FK graph.
    counts=collections.Counter((f["source"].split('.')[0],f["target"].split('.')[0]) for fs in FKS_OUT.values() for f in fs if f["source"].split('.')[0]!=f["target"].split('.')[0])
    nodes=sorted(schema_tables)
    colors=["#e8efe6","#f3eee5","#e9eeed","#f4eee8"]
    width=1600; colw=310; rowh=126
    positions={s:(40+(i%5)*colw,55+(i//5)*rowh) for i,s in enumerate(nodes)}
    height=55+((len(nodes)+4)//5)*rowh+40
    parts=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img" aria-label="Actual schema module overview">', '<style>text{font-family:Segoe UI,Arial,sans-serif}.box{stroke:#8ba68d;stroke-width:1.3}.edge{stroke:#a7b7aa;stroke-width:1;fill:none;opacity:.7}.title{font-size:19px;font-weight:700;fill:#243a2b}.small{font-size:12px;fill:#5c7160}</style>']
    for (a,b),cnt in counts.items():
        if a not in positions or b not in positions:continue
        x1,y1=positions[a];x2,y2=positions[b]
        parts.append(f'<path class="edge" d="M{x1+130},{y1+37} L{x2+130},{y2+37}"><title>{html.escape(a)} → {html.escape(b)}: {cnt} FK</title></path>')
    for i,s in enumerate(nodes):
        x,y=positions[s]; parts.append(f'<g><rect class="box" x="{x}" y="{y}" width="260" height="74" rx="9" fill="{colors[i%len(colors)]}"/><text class="title" x="{x+15}" y="{y+30}">{html.escape(s)}</text><text class="small" x="{x+15}" y="{y+54}">{len(schema_tables[s])} tables · {sum(v for (a,b),v in counts.items() if a==s or b==s)} cross-module FK paths</text></g>')
    parts.append('</svg>')
    (diagrams/"module-overview.svg").write_text("\n".join(parts),encoding="utf-8")
    for schema,names in schema_tables.items():
        # A compact, zoomable module map. Each relationship is listed with its real FK columns;
        # a composite path is visibly marked. Mermaid files above retain the full ER syntax.
        related=[];seen=set()
        for name in names:
            for f in FKS_OUT[name]+FKS_IN[name]:
                key=(f['source'],f['name'])
                if key not in seen:related.append(f);seen.add(key)
        h=max(130+len(names)*43,130+len(related)*34)+45
        p=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1700 {h}" role="img" aria-label="{schema} table relationships">',
           '<style>text{font-family:Segoe UI,Arial,sans-serif;fill:#294734}.head{font-weight:bold;font-size:25px}.sub{font-size:13px;fill:#5b745f}.table{font-size:15px;font-weight:600}.edge{font-family:Consolas,monospace;font-size:12px}.muted{fill:#6b806d}</style>',
           f'<rect width="1700" height="{h}" fill="#fbfaf5"/><text class="head" x="32" y="44">{html.escape(schema)} / actual SQL relationships</text>',
           f'<text class="sub" x="32" y="68">{len(names)} tables · {len(related)} incoming/outgoing FK paths · + marks composite columns</text>',
           '<text class="sub" x="32" y="101">TABLES</text><text class="sub" x="470" y="101">FOREIGN KEY PATHS (child → parent)</text>']
        for i,name in enumerate(names):
            y=114+i*43
            p += [f'<rect x="28" y="{y}" width="390" height="34" rx="6" fill="#eaf1e8" stroke="#bacfba"/>',f'<text class="table" x="42" y="{y+23}">{html.escape(name)}</text>']
        for i,f in enumerate(related):
            y=114+i*34
            p += [f'<rect x="466" y="{y}" width="1205" height="29" rx="4" fill="{"#e9efe9" if len(f["from"])>1 else "#f3f5ef"}"/>',
                  f'<text class="edge" x="478" y="{y+20}">{html.escape(f["source"])} ({html.escape(" + ".join(f["from"]))}) → {html.escape(f["target"])} ({html.escape(" + ".join(f["to"]))})</text>']
        p.append('</svg>')
        (diagrams/f'{schema}.svg').write_text('\n'.join(p),encoding='utf-8')
    return diagrams

def build_html(snap_info,dict_info):
    snap,miss_snap,extra_snap,col_diff=snap_info
    drows,miss_dict,extra_dict=dict_info
    stamp=DATA["captured_at_utc"]
    pieces=[f'''<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>DeepSprout Database Study Guide AR/EN</title><style>
@page{{size:A4;margin:17mm 15mm 17mm 15mm}}*{{box-sizing:border-box}}body{{font-family:"Segoe UI",Tahoma,Arial,sans-serif;color:#263b2d;background:#f9f8f2;margin:0;line-height:1.48}}main{{max-width:1100px;margin:auto;padding:35px}}h1,h2,h3{{color:#254b32}}h1{{font-size:36px;margin:.1em 0}}h2{{font-size:24px;border-bottom:2px solid #9bbb9c;padding-bottom:7px}}h3{{font-size:20px;margin:0 0 8px}}p{{margin:7px 0}}.eyebrow{{color:#6d866f;letter-spacing:.12em;font-size:13px;font-weight:700}}.cover{{padding:40px 0 30px}}.intro{{background:#edf3eb;border-right:5px solid #7d9f7f;padding:16px 20px;border-radius:7px}}.stats{{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0}}.stat{{background:#fff;border:1px solid #d8e2d6;padding:12px;border-radius:8px}}.stat b{{display:block;font-size:25px}}.toc{{columns:3}}.toc a{{display:block;color:#305d42;text-decoration:none;direction:ltr;text-align:left;padding:3px}}section.table{{background:white;margin:26px 0;padding:24px;border:1px solid #dbe4d9;border-radius:10px;break-before:page}}.tag{{display:inline-block;border:1px solid #aec4b0;color:#486e50;padding:2px 8px;border-radius:40px;font-size:12px;margin-left:5px}}table{{border-collapse:collapse;width:100%;font-size:12px;margin:10px 0}}th,td{{border:1px solid #d9e2d7;padding:5px 7px;vertical-align:top}}th{{background:#edf3eb}}tr{{break-inside:avoid}}.code,.ltr,code{{direction:ltr;unicode-bidi:isolate;font-family:Consolas,"Courier New",monospace;overflow-wrap:anywhere}}.code{{display:block;text-align:left}}ul{{margin:5px 0;padding-right:22px}}li{{margin:3px 0;overflow-wrap:anywhere}}.meta{{font-size:13px;color:#546b59}}.section-label{{font-weight:700;color:#53745c}}.risk{{background:#f7f1e5;padding:10px;border-right:3px solid #bd9b65}}.search{{padding:10px;width:100%;font-size:17px;border:1px solid #a9c1a9;border-radius:7px;margin:12px 0}}@media print{{body{{background:white}}main{{max-width:none;padding:0}}.search,.no-print{{display:none}}section.table{{border:0;padding:0;margin:0;border-radius:0}}.cover{{break-after:page;padding-top:35mm}}a{{color:#254b32;text-decoration:none}}}}
</style><script>function filterTables(){{let q=document.getElementById('search').value.toLowerCase();for(let x of document.querySelectorAll('section.table'))x.style.display=x.textContent.toLowerCase().includes(q)?'':'none';}}</script></head><body><main><div class="cover"><div class="eyebrow">DEEPSPROUT / DATABASE ARCHITECTURE REVIEW</div><h1>دليل دراسة قاعدة البيانات<br><span dir="ltr">Database Study Guide</span></h1><p>نسخة مراجعة عربية/إنجليزية مبنية على كتالوج SQL Server الفعلي، لا على القاموس التصميمي القديم.</p><p class="meta">التقاط الكتالوج: <span dir="ltr">{html.escape(stamp)}</span> · الخادم <code>DESKTOP-A4AL2KR</code> · القاعدة <code>DeepSprout_Validation</code></p><div class="stats"><div class="stat"><b>129</b>جداول المنتج</div><div class="stat"><b>1,263</b>عموداً مع جدولي الإدارة</div><div class="stat"><b>261</b>مفتاحاً خارجياً</div><div class="stat"><b>70</b>مفتاحاً مركباً</div></div><div class="intro"><b>حدود هذا الدليل:</b> الأسماء والأنواع وNULL والقيم الافتراضية وPK/FK/UNIQUE/CHECK مأخوذة من <code>sys</code مباشرة. الشرح الوظيفي وتوصية KEEP تحليل معماري يتطلب اعتماد المالك. لم تُقرأ صفوف المستخدمين أو كلمات المرور. ملف Claude ذي مقترح 71 وجدول مطابقته وملف PDF المرجعي غير متاحين وقت الإنشاء؛ لذا لا يُنسب أي دمج محدد إلى Claude.</div></div><h2>منهج القراءة والتطابق</h2><p>يشمل الجرد الفعلي أيضاً <code>dbo.__EFMigrationsHistory</code و<code>dbo.sysdiagrams</code، وهما جدولان إداريان خارج 129 جدول منتج. يصف هذا الدليل كل جداول المنتج ويذكر الجدولين الإداريين في الملحق. العلاقات المرسومة مولدة من مفاتيح SQL الفعلية، بما فيها الأعمدة المركبة.</p><p>المقارنة مع EF ModelSnapshot: {len(snap)} جداول نموذج، {len(miss_snap)} جدول منتج غائب في اللقطة، {len(extra_snap)} جدول لقطة غائب من SQL، {len(col_diff)} جدول ذو فرق أسماء أعمدة. المقارنة مع قاموس v2.1: {len(drows)} صفاً، {len(miss_dict)} جدول SQL غير مدرج، {len(extra_dict)} صف غير منفذ.</p><p>عدد الترحيلات المطبقة {len(DATA['migrations'])}. ملف التحقق التاريخي يسجل 330 PASS و0 FAIL في 17 مجموعة؛ هذه الدراسة لم تعِد تشغيل اختبارات تكتب إلى القاعدة.</p><h2>فهرس الجداول</h2><input class="search no-print" id="search" oninput="filterTables()" placeholder="ابحث باسم الجدول أو العمود أو الشرح"><div class="toc">''']
    for name in TABLES+ADMIN_TABLES:pieces.append(f'<a href="#{name.replace(".","-")}">{html.escape(name)}</a>')
    pieces.append('</div><h2>قاموس الجداول الفعلي</h2>')
    for name in TABLES+ADMIN_TABLES:
        schema,short=name.split('.',1);purpose=PURPOSES.get(schema,{}).get(short,f"سجل {short} ضمن نطاق {schema}")
        action=recommendation(name) if name in TABLES else 'SYSTEM'
        pieces.append(f'<section class="table" id="{name.replace(".","-")}"><div class="table-lead"><h3 dir="ltr">{html.escape(name)}</h3><span class="tag">{html.escape(schema)}</span><span class="tag">{table_class(name) if name in TABLES else "إدارة النظام"}</span><span class="tag">{action}</span><p><span class="section-label">الوظيفة:</span> {html.escape(purpose)}.</p></div><p><span class="section-label">سبب الاستقلال:</span> {html.escape(necessity(name))}</p><p><span class="section-label">سير مستخدم ملموس:</span> {html.escape(workflow(name))}</p><p><span class="section-label">ما يُفقد عند الدمج/الحذف:</span> {html.escape(necessity(name))}</p>')
        if name in TABLES:pieces.append(f'<p class="risk"><span class="section-label">مقترح Claude C:</span> <code>{html.escape(CLAUDE[name]["action"])}</code> · <b>{verdict(name)}</b> · {html.escape(verdict_reason(name))}</p>')
        pieces.append('<table><thead><tr><th>SQL column</th><th>النوع</th><th>NULL</th><th>DEFAULT</th><th>الشرح بالعربية</th></tr></thead><tbody>')
        for c in COLS[name]:pieces.append(f'<tr><td class="ltr">{html.escape(c["ColumnName"])}</td><td class="ltr">{html.escape(type_text(c))}</td><td>{"نعم" if c["IsNullable"] else "لا"}</td><td class="ltr">{html.escape(c["DefaultDefinition"] or "—")}</td><td>{html.escape(arabic_column(c,name))}</td></tr>')
        pieces.append('</tbody></table>')
        pk=collections.defaultdict(list)
        for k in KEYS[name]:pk[k["ConstraintName"]].append(k)
        for k,rows in pk.items():
            pieces.append(f'<p><span class="section-label">{rows[0]["ConstraintType"]}:</span> <code>{html.escape(k)} ({html.escape(", ".join(r["ColumnName"] for r in rows))})</code></p>')
        pieces.append('<p><span class="section-label">UNIQUE:</span> '+('; '.join(f'<code>{html.escape(x)}</code>' for x in unique_indexes(name)) or 'لا يوجد')+'</p>')
        pieces.append('<p><span class="section-label">Outgoing FK:</span></p><ul>'+''.join(f'<li><code>{html.escape(fmt_fk(f))}</code> · {relationship_cardinality(f)}</li>' for f in FKS_OUT[name])+'</ul>' if FKS_OUT[name] else '<p><span class="section-label">Outgoing FK:</span> لا يوجد.</p>')
        pieces.append('<p><span class="section-label">Incoming FK:</span></p><ul>'+''.join(f'<li><code>{html.escape(f["source"]+" ("+", ".join(f["from"])+")")}</code> → هذا الجدول؛ {relationship_cardinality(f)}.</li>' for f in FKS_IN[name])+'</ul>' if FKS_IN[name] else '<p><span class="section-label">Incoming FK:</span> لا يوجد.</p>')
        pieces.append(f'<p><span class="section-label">الحالات:</span> {html.escape(states(name))}</p>')
        if CHECKS[name]:pieces.append('<p><span class="section-label">CHECK:</span></p><ul>'+''.join(f'<li><code>{html.escape(c["CheckName"]+": "+c["Definition"])}</code></li>' for c in CHECKS[name])+'</ul>')
        if TRIGGERS[name]:pieces.append('<p><span class="section-label">الحواجز التشغيلية:</span> '+', '.join(f'<code>{html.escape(t["TriggerName"])}</code>' for t in TRIGGERS[name])+'</p>')
        pieces.append('</section>')
    pieces.append('</main></body></html>')
    path=HERE/"DeepSprout-Database-Study-Guide-AR-EN.html"
    content=''.join(pieces)
    content=content.replace('الشرح الوظيفي وتوصية KEEP تحليل معماري يتطلب اعتماد المالك.', 'الشرح الوظيفي والتوصية تحليل معماري يتطلب اعتماد المالك.')
    content=content.replace('ملف Claude ذي مقترح 71 وجدول مطابقته وملف PDF المرجعي غير متاحين وقت الإنشاء؛ لذا لا يُنسب أي دمج محدد إلى Claude.', 'تمت مقارنة جميع صفوف مقترح Claude C مع قاعدة البيانات الفعلية. ملف PDF المرجعي غير متاح في المرفقات؛ استُخدم الاتجاه العربي/الإنجليزي الموصوف في الطلب.')
    content=content.replace('يصف هذا الدليل كل جداول المنتج ويذكر الجدولين الإداريين في الملحق.', 'يصف هذا الدليل 129 جدول منتج والجدولين الإداريين بالتفصيل.')
    content=content.replace('عدد الترحيلات المطبقة 23.', 'تضم القاعدة 45 قيد UNIQUE وأربعة FK مركبة إضافية خارج تمثيل EF ModelSnapshot؛ يعرضها هذا الدليل والرسوم من المصدر الفعلي. عدد الترحيلات المطبقة 23.')
    content=content.replace('</style>', '''@media print {html,body,main{width:100%!important;max-width:100%!important;min-width:0!important;margin:0!important;overflow-x:hidden!important}main{padding:0!important}.toc,.toc-title{display:none!important}.cover{page-break-after:always!important;break-after:page!important}.stats{grid-template-columns:repeat(4,minmax(0,1fr))!important}section.table{width:100%!important;max-width:100%!important;min-width:0!important;page-break-before:auto!important;break-before:auto!important;page-break-inside:auto!important;break-inside:auto!important;margin:18px 0!important;border-top:2px solid #a9c4a9!important;padding-top:12px!important}section.table h3{break-after:avoid!important}table{table-layout:fixed!important;width:100%!important}th,td,p,li,code{overflow-wrap:anywhere!important;word-break:break-word!important}.ltr{word-break:break-all!important}th:nth-child(1){width:22%}th:nth-child(2){width:16%}th:nth-child(3){width:8%}th:nth-child(4){width:20%}th:nth-child(5){width:34%}}\n</style>''',1)
    content=content.replace('<h2>فهرس الجداول</h2>', '<h2 class="toc-title">فهرس الجداول</h2>')
    path.write_text(content,encoding='utf-8')
    return path

def write_comparison(snap_info,dict_info):
    snap,miss_snap,extra_snap,col_diff=snap_info
    drows,miss_dict,extra_dict=dict_info
    lines=["# Live schema reconciliation / مطابقة المخطط الفعلي", "",f"Captured UTC: {DATA['captured_at_utc']}","",f"Server: `{DATA['server'][0]['ServerName']}`; database: `{DATA['server'][0]['DatabaseName']}`; SQL Server version: `{DATA['server'][0]['ProductVersion']}`.","",f"Catalog: {len(DATA['tables'])} physical tables including `dbo.__EFMigrationsHistory` and `dbo.sysdiagrams`; {len(TABLES)} product tables; {len(DATA['columns'])} columns including administrative tables; {len(FK_GROUPS)} foreign keys; {sum(len(v)>1 for v in FK_GROUPS.values())} composite foreign keys; {len(DATA['checks'])} CHECK constraints; {len(DATA['migrations'])} applied migrations.","", "## EF ModelSnapshot", "",f"Mapped tables: {len(snap)}. Missing in snapshot: {miss_snap or 'none'}. Snapshot-only: {extra_snap or 'none'}. Tables with column-name differences: {len(col_diff)}.",""]
    for name,missing,extra in col_diff:lines.append(f"- `{name}`: snapshot-only columns {missing}; live-only columns {extra}")
    lines += ["", "## v2.1 dictionary", "",f"Rows: {len(drows)}. Live-only: {miss_dict or 'none'}. Dictionary-only: {extra_dict or 'none'}.","", "The dictionary is a design-era source. All detailed columns and constraints in the guide come from the live SQL catalog, not from its shorthand rows.","", "## Migrations and regression evidence", "",f"Migration source files: {len(list((ROOT/'Server/src/DeepSprout.Infrastructure/Migrations').glob('20*_*.cs')))//2} expected pairs; applied IDs: {len(DATA['migrations'])}.","", "The archived phase-b final regression summary totals 330 PASS / 0 FAIL across 17 suites. This review did not rerun write-capable suites.","", "## Claude v3 comparison source", "", "All 129 rows in Claude's C-design matrix were mapped by schema-qualified name. Its 48 MERGE, 1 REMOVE, and 9 DEFER-policy proposals are reviewed in the generated decision matrix. Its audit explicitly lacked access to the current Server source and SQL Server. The MasterDB reference PDF remains absent from the supplied attachments, so only the requested Arabic/English presentation direction was available.",""]
    columns=json.loads((HERE/'snapshot-column-comparison.json').read_text(encoding='utf-8'))
    lines += ["## Exact metadata checks", "", f"Snapshot properties: {columns['snapshot_properties']}; live product columns: {columns['live_product_columns']}; missing/extra columns: {len(columns['snapshot_only_columns'])}/{len(columns['live_only_columns'])}; data type, nullability and default differences: {len(columns['metadata_differences'])}; CHECK-name differences: {len(columns['snapshot_only_checks'])+len(columns['live_only_checks'])}; index signature differences: {len(columns['snapshot_only_indexes'])+len(columns['live_only_indexes'])}.", "", "The live catalog's 129 product tables have the same table and column names, column types, nullability, explicit defaults, CHECK names, and EF index column/uniqueness/filter signatures as the EF ModelSnapshot. FK/CHECK trust flags are zero. The live 23 applied migration IDs match the 23 source migration IDs exactly.", "", f"**Key discrepancy:** the ModelSnapshot declares {columns['snapshot_keys']} PK/UQ constraints while live SQL has {columns['live_keys']}. The {len(columns['live_only_keys'])} extra live constraints are all alternate UNIQUE keys; no key appears in the snapshot without a live counterpart. They are present in the migration DDL but absent from ModelSnapshot key metadata:", ""]
    for table,kind,keycols in columns['live_only_keys']:
        lines.append(f"- `{table}({', '.join(keycols)})` ({kind}).")
    lines += ["", f"**FK discrepancy:** the ModelSnapshot declares {columns['snapshot_fks']} FK relationships while live SQL has {columns['live_fks']}. The following four composite FKs exist in SQL but not in ModelSnapshot relationship metadata; the reverse difference is zero:", ""]
    for source,target,child,parent in columns['live_only_fks']:
        lines.append(f"- `{source}({', '.join(child)})` → `{target}({', '.join(parent)})`.")
    lines += ["", "Three are installed through raw `migrationBuilder.Sql` in `CoachParticipation` and `SessionOperations`; the `GroupGarden` FK comes from the embedded `EvidenceGuards.sql` batch invoked by `EvidenceLedger`. The live schema and generated diagrams include them. EF model-only checks cannot detect drift of these raw SQL constraints.", "", "The archived broad integrity query reported `TargetTables=129` and `UniqueIndexes=480`. Repeating that same read-only query now returns `130` and `482`; `dbo.sysdiagrams` was created on 2 November 2026 at 16:49 UTC and contributes one table and two unique indexes. The product schema remains 129 tables. The broad index query also includes objects beyond product tables, so it should not be called 480 product unique indexes.", "", "Claude's audit said `Removed/Completed` could not release capacity and `Rejected` could not reapply. The live `CK_InitiativeMembership_EndRelease` requires a release timestamp in both terminal states, and the implemented `institution.SubmitApplication` permits a new attempt after Rejected when no membership/open/blocked application exists. The former missing-field concern was also resolved by the applied migrations (`explicit_absent=0` in the phase-b field verification). These are exact source-era discrepancies, not reasons to alter the database in this review.", ""]
    (HERE/"live-schema-reconciliation.md").write_text("\n".join(lines),encoding='utf-8')

def main():
    snap=snapshot_comparison();dictionary=dictionary_comparison()
    write_csv_matrix();write_mermaid();build_html(snap,dictionary);write_comparison(snap,dictionary)
    print(f"Generated {len(TABLES)} table studies. Snapshot differences: {len(snap[3])}; dictionary differences: {len(dictionary[1])+len(dictionary[2])}.")

if __name__=="__main__":main()
