#!/usr/bin/env python3
"""DeepSprout v3 database necessity audit — reproducible table mapping.

Reads the 129-row v2.1 canonical dictionary, applies one disposition per table
for each design (A = MVP, B = practical, C = full approved scope), asserts that
every table is mapped exactly once and that every design's target inventory is
anchored, then writes 02-table-matrix-ar.md.

Run from the repository root:
    python3 docs/architecture/database/v3-necessity-audit/generate_audit.py
"""
import re
import sys
from collections import Counter, OrderedDict
from pathlib import Path

HERE = Path(__file__).resolve().parent
DICT = HERE.parent / "v2.1" / "02-canonical-dictionary.md"
OUT = HERE / "02-table-matrix-ar.md"

# Category codes
CAT = {
    "N": "نواة",
    "V": "إصدار/نسخ",
    "H": "تاريخ/تدقيق",
    "I": "بنية تشغيلية",
    "S": "تخميني/غير معتمد",
}

# Modules included in design B (practical). Everything else is a postponed feature in B.
B_MODULES = {
    "iam", "personal", "lab", "recovery", "activity", "org", "initiative",
    "coach", "task", "session", "forms", "files", "evidence", "ops", "governance",
}

# Contested merges: a reasonable reviewer may keep these tables. Group -> tables.
CONTESTED = OrderedDict([
    ("G1", ("دمج Institution وProvider في Organization", ["provider.Provider", "provider.ProviderMembership"])),
    ("G2", ("موظفو Initiative وProvider في StaffAppointment واحد", ["provider.ProviderStaffAppointment"])),
    ("G3", ("جلسات Initiative وExperience في Session واحد، وواجب الجلسة في SessionDuty", ["provider.ExperienceSession", "provider.ProviderAppointmentSession"])),
    ("G4", ("حضور Initiative وProvider في Attendance واحد", ["provider.ProviderAttendance"])),
    ("G5", ("إكمال المخيم ضمن Completion المشترك", ["provider.CampCompletion"])),
    ("G6", ("دمج InitiativeMembership في InitiativeApplication", ["institution.InitiativeMembership"])),
    ("G7", ("كلمة المرور داخل Person (EF table splitting)", ["iam.PasswordCredential"])),
    ("G8", ("أسئلة وإجابات النماذج JSON بدل صفوف", ["forms.FormQuestion", "forms.FormQuestionOption", "forms.FormAnswer", "forms.FormAnswerChoice"])),
    ("G9", ("إجابات الاختبار JSON داخل المحاولة", ["lab.AssessmentResponse"])),
    ("G10", ("تصحيحات الحضور داخل AuditEvent", ["session.AttendanceCorrection", "provider.ProviderAttendanceCorrection"])),
])

# Row: (table, module, category, approval, feature, verdict, A, C, loss)
# A and C dispositions: "KEEP", "KEEP→schema.New", "MERGE→schema.Target (columns)",
# "DEFER", "DEFER (سياسة)", "REMOVE". B is derived from C and B_MODULES.
ROWS = [
    # ---------------- iam ----------------
    ("iam.Person", "iam", "N", "معتمد D45، §2.2", "هوية واحدة لكل الأدوار",
     "جذر الهوية؛ لا بديل له", "KEEP", "KEEP", "—"),
    ("iam.PersonEmail", "iam", "N", "D23 يطلب بريدًا موثقًا؛ تعدد البريد غير مطلوب", "بريد موثّق لمطابقة الدعوات",
     "علاقة 1:N لم يطلبها أي قرار. تغيير البريد يمر عبر OtpChallenge(Purpose)",
     "MERGE→iam.Person (NormalizedEmail, EmailVerifiedAtUtc)", "MERGE→iam.Person (NormalizedEmail, EmailVerifiedAtUtc)",
     "أكثر من بريد موثق للشخص، وصفوف البريد المتقاعد (تنتقل إلى AuditEvent). يبقى UXF على Person.NormalizedEmail"),
    ("iam.PasswordCredential", "iam", "I", "§24.6 تخزين آمن", "Hash كلمة المرور",
     "1:1 بقيد UQ PersonId وبلا دورة حياة مستقلة؛ المدعو بـOTP بلا كلمة مرور = عمود NULL. العزل البرمجي ممكن بـEF table splitting",
     "MERGE→iam.Person (PasswordHash, PasswordAlgorithm, PasswordUpdatedAtUtc)", "MERGE→iam.Person (PasswordHash, PasswordAlgorithm, PasswordUpdatedAtUtc)",
     "الفصل الفيزيائي للمادة السرية؛ يجب منع إسقاط أعمدة الـhash في أي DTO (خلافي G7)"),
    ("iam.OtpChallenge", "iam", "I", "§2.2 OTP للمدعوين، §24.6 حد المحاولات", "تحقق OTP ومحاولاته",
     "حالة قصيرة العمر بعدّاد وانتهاء؛ مكانها ليس Person", "KEEP", "KEEP", "—"),
    ("iam.GlobalGrant", "iam", "N", "معتمد D14، §23.1 قدرة Admin صريحة", "صلاحيات Admin الخاصة",
     "مبرر في C: قدرات متعددة قابلة للمنح والسحب",
     "MERGE→iam.Person (IsPlatformAdmin)", "KEEP",
     "في A: تعدد القدرات وصفوف المنح/السحب (يبقى الأثر في AuditEvent)"),
    ("iam.ConsentRecord", "iam", "H", "معتمد D41، §24.1", "موافقة بغرض ونسخة إشعار",
     "سجل إلحاقي لقرار قانوني (منح/سحب)؛ مبرر في C. ملاحظة: ConsentVersion مكرر أيضًا كعمود في 4 جداول",
     "MERGE→iam.Person (AcceptedNoticeVersion, AcceptedAtUtc)", "KEEP",
     "في A: سجل سحب الموافقة وتعدد الأغراض"),
    # ---------------- personal ----------------
    ("personal.IndividualProfile", "personal", "N", "معتمد §4.1–4.5، D04", "إعداد الفرد وحالة الـonboarding",
     "امتداد اختياري حساس (ليس كل شخص فردًا)؛ فصل مبرر. Person.IndividualEnabled يكرر وجود الصف",
     "KEEP", "KEEP", "—"),
    # ---------------- lab ----------------
    ("lab.AssessmentInstrument", "lab", "V", "معتمد §4.4 (أربعة اختبارات ثابتة)", "تعريف الاختبار",
     "جدول بحث لأربعة صفوف ثابتة (Code, Title, Status)",
     "MERGE→lab.AssessmentAttempt (InstrumentCode + CHECK)", "MERGE→lab.InstrumentVersion (InstrumentCode + CHECK)",
     "Status على مستوى الأداة (يُستبدل بسحب نسخها) وFK إلى صف الأداة"),
    ("lab.InstrumentVersion", "lab", "V", "معتمد §4.4 نسخة المحتوى والتصحيح، §24.5", "تجميد محتوى الاختبار وقواعد تصحيحه",
     "مبرر في C: المقارنة بين المحاولات تعتمد ComparabilityGroup، ومحرر Admin سيحكم النسخ (§19)",
     "MERGE→lab.AssessmentAttempt (ContentVersion, ScoringVersion نصية)", "KEEP",
     "في A: FK يضمن أن النسخة منشورة فعلًا؛ يصبح تحققًا في C#"),
    ("lab.AssessmentWindow", "lab", "H", "معتمد D05؛ مدة النافذة مفتوحة §26.2", "أهلية إعادة القياس الأسبوعية",
     "يخزّن نتيجة حساب: النافذة دالة في السياسة وتاريخ التفعيل، وUsed مشتق من وجود محاولة",
     "MERGE→lab.AssessmentAttempt (WindowKey, PolicyVersion)", "MERGE→lab.AssessmentAttempt (WindowKey, PolicyVersion)",
     "أوقات فتح/غلق مخزنة لكل شخص. منع محاولتين رسميتين في نافذة واحدة يصبح UXF على (PersonId, InstrumentCode, WindowKey)"),
    ("lab.AssessmentAttempt", "lab", "N", "معتمد D04، D05", "محاولة اختبار",
     "جذر", "KEEP", "KEEP", "—"),
    ("lab.AssessmentResponse", "lab", "N", "معتمد §4.4 حفظ التقدم الجزئي والتوقيت", "إجابات/تجارب كل بند",
     "تُقرأ وتُكتب كوحدة واحدة للمحاولة؛ لا تقرير معتمد يستعلم بندًا عبر الأشخاص",
     "MERGE→lab.AssessmentAttempt (ResponsesJson)", "MERGE→lab.AssessmentAttempt (ResponsesJson)",
     "UQ(AttemptId,ItemKey,TrialNo) وCHECK على LatencyMs في SQL؛ تنتقل إلى C#. إعادة التصحيح تقرأ JSON (خلافي G9)"),
    ("lab.AssessmentScore", "lab", "N", "معتمد §10.3", "مقاييس المحاولة",
     "تُستعلم عبر الزمن في Insights؛ صفوف مبررة", "KEEP", "KEEP", "—"),
    # ---------------- recovery ----------------
    ("recovery.RecoveryJourney", "recovery", "N", "اسمه في §5.7 (آلة حالة مقترحة)؛ بدء رحلة جديدة غير معتمد", "حاوية الدورات",
     "لا يحمل إلا PersonId وStatus، وعليه UXF رحلة نشطة واحدة لكل شخص: 1:1 فعليًا",
     "MERGE→recovery.RecoveryCycle (PersonId)", "MERGE→recovery.RecoveryCycle (PersonId)",
     "تجميع الدورات في رحلات متعددة بعد الأرشفة؛ v2 نفسها تصفه بأنه policy-gated"),
    ("recovery.RecoveryCycle", "recovery", "N", "§5 (28 يومًا اتجاه قوي)", "دورة الخطة",
     "جذر الخطة", "KEEP", "KEEP", "—"),
    ("recovery.PlanRevision", "recovery", "V", "§5.5: احفظ نسخة الخطة والسبب والتواريخ", "نسخ الخطة",
     "إصدار مطلوب نصًا", "KEEP", "KEEP", "—"),
    ("recovery.ScheduledAction", "recovery", "N", "§5.2 This Week، §5.5 مستحق/منجز", "التزامات الأسبوع",
     "قد يُولّد من القواعد، لكن التعديل وأيام الراحة والربط بالمحاولة تجعل التخزين أبسط", "KEEP", "KEEP", "—"),
    ("recovery.WeeklyReview", "recovery", "N", "معتمد §5.5", "المراجعة الأسبوعية",
     "قرار المستخدم الأسبوعي", "KEEP", "KEEP", "—"),
    # ---------------- activity ----------------
    ("activity.PracticeDefinition", "activity", "V", "§19 كتالوج Admin، D31 مهام من كتالوج معتمد", "كتالوج الممارسات",
     "مبرر في C: Admin ينشر ممارسات يختارها Coach",
     "MERGE→activity.PracticeAttempt (PracticeCode, PracticeType؛ الكتالوج في الكود)", "KEEP",
     "في A: نشر ممارسات من Admin دون نشر كود"),
    ("activity.PracticeVersion", "activity", "V", "§19، §23.2 عدم إعادة كتابة السجلات", "محتوى الممارسة المجمّد",
     "مبرر في C للسبب نفسه", "MERGE→activity.PracticeAttempt (ContentVersion)", "KEEP",
     "في A: FK للمحتوى المجمّد؛ ScheduledAction يحمل PracticeCode"),
    ("activity.PracticeAttempt", "activity", "N", "معتمد §7.8، D08", "تنفيذ ممارسة وصلاحيته",
     "مصدر نمو الأشجار الأربع", "KEEP", "KEEP", "—"),
    ("activity.PracticeProgressionDecision", "activity", "H", "§7.3 مستوى مستقل لكل نوع؛ الأرقام مفتوحة", "قرار رفع/خفض المستوى",
     "المستوى الحالي أربع قيم لكل شخص؛ تاريخ المستوى مشتق من DifficultyTier في المحاولات",
     "MERGE→personal.IndividualProfile (أربعة أعمدة Tier)", "MERGE→personal.IndividualProfile (أربعة أعمدة Tier)",
     "صف لكل قرار Try Next Level/Stay Here مع PolicyVersion؛ الأثر يبقى في AuditEvent"),
    ("activity.OfflineRoutine", "activity", "N", "معتمد §7.4", "الروتين الشخصي",
     "كيان يملكه المستخدم", "KEEP", "KEEP", "—"),
    ("activity.RoutineCheckIn", "activity", "N", "معتمد §7.4، D09 (الزهرة)", "تسجيل الروتين اليومي",
     "مصدر مكافأة الزهرة", "KEEP", "KEEP", "—"),
    # ---------------- shield ----------------
    ("shield.ExtensionInstallation", "shield", "N", "D44 قدرتان؛ جدوى الإضافة مفتوحة §26.2 #9", "ربط إضافة المتصفح",
     "مبرر عند وجود الإضافة", "DEFER", "KEEP", "في A وB: الميزة كلها مؤجلة لأن الإضافة غير موجودة"),
    ("shield.ShieldConfiguration", "shield", "V", "§6", "نسخ إعداد الحماية والحد",
     "النسخة تربط فترات الاستخدام بالمواقع المختارة وقتها", "DEFER", "KEEP", "—"),
    ("shield.ShieldSelectedDomain", "shield", "V", "§6", "نطاق مختار داخل نسخة إعداد",
     "قائمة قصيرة من قائمة مغلقة، تُقرأ وتُكتب كوحدة", "DEFER", "MERGE→shield.ShieldConfiguration (SelectedDomainsJson)",
     "FK المركب الذي يضمن أن النطاق المحسوب كان مختارًا"),
    ("shield.ProtectionSession", "shield", "N", "§6.1", "تشغيل الحماية اليدوية",
     "حالات Active/Expired/Failed", "DEFER", "KEEP", "—"),
    ("shield.BrowserUsagePeriod", "shield", "H", "§6.2", "وقت الاستخدام المجمّع",
     "مصدر التذكير وInsights", "DEFER", "KEEP", "—"),
    ("shield.BrowserUsageDomain", "shield", "H", "§6.2: الوقت يُجمع كمجموعة لا لكل موقع", "تفصيل الوقت لكل نطاق",
     "تفصيل لا تطلبه المواصفة", "DEFER", "MERGE→shield.BrowserUsagePeriod (DomainSecondsJson)",
     "استعلام SQL مباشر لوقت كل نطاق"),
    # ---------------- org (Institution) ----------------
    ("institution.Institution", "org", "N", "معتمد D17، §15", "المؤسسة المُتحقق منها",
     "أعمدته مطابقة لـprovider.Provider (Name, Status, CountryCode, HeadquartersCity)",
     "KEEP", "KEEP→org.Organization (Kind)",
     "في C: جدولان منفصلان؛ Initiative يحتاج FK مركب (OrganizationId, Kind='Institution') (خلافي G1)"),
    ("institution.InstitutionVerificationCase", "org", "H", "معتمد D17، D47", "قرار Admin على إثبات المؤسسة",
     "أعمدته تطابق ProviderVerificationCase، وCoachApproval عدا أنه يحدد المعني بـPersonId؛ وصفحة Admin Applications واحدة (§19)",
     "MERGE→institution.Institution (VerificationStatus, DecidedBy, DecidedAtUtc, Reason)", "KEEP→org.VerificationCase (OrganizationId XOR CoachPersonId)",
     "في A: تعدد الحالات (طلب معلومات/إعادة تقديم) وملف الإثبات"),
    ("institution.RepresentativeMembership", "org", "N", "معتمد D17، D26", "سلطة الممثل في المؤسسة",
     "يطابق ProviderMembership (+Role)", "KEEP", "KEEP→org.OrganizationMember", "—"),
    # ---------------- initiative ----------------
    ("institution.Initiative", "initiative", "N", "معتمد §15", "جذر المبادرة وقفل السعة",
     "جذر. Title/Mode/Capacity/TimeZoneId/WithdrawalCutoffAtUtc مكررة في InitiativeRevision وفي PublishedSnapshotJson",
     "KEEP", "KEEP", "—"),
    ("institution.InitiativeRevision", "initiative", "V", "قرار المالك #8، §15.2 المرحلة 6", "نسخ الشروط المنشورة",
     "إصدار معتمد صراحة؛ لا يُمس", "KEEP", "KEEP", "—"),
    ("institution.InitiativeContent", "initiative", "V", "D20 محتوى توعوي ضمن المكونات", "ربط المبادرة بإصدار CMS",
     "المحتوى جزء من الشروط المنشورة (لقطة المرحلة 3)",
     "MERGE→institution.InitiativeRevision (ComponentsJson)", "MERGE→institution.InitiativeRevision (ComponentsJson)",
     "سحب/ترتيب مكوّن واحد دون نسخة جديدة، والربط بمحرر CMS العام"),
    ("institution.InitiativeApplication", "initiative", "N", "معتمد §15.3، D25، قرار #6 و#9", "طلب الانضمام وحالته",
     "سجل واحد يراه الممثل والمشرف (§15.3)", "KEEP", "KEEP", "—"),
    ("institution.InitiativeSeatOffer", "initiative", "N", "معتمد §15.3 Queued→Offered", "عرض مقعد من الانتظار",
     "الطلب نفسه يحمل الحالة Offered، والعرض الحي واحد لكل طلب، وExpired نهائي: 1:1 وحالة مكررة",
     "MERGE→institution.InitiativeApplication (OfferedAtUtc, OfferExpiresAtUtc)", "MERGE→institution.InitiativeApplication (OfferedAtUtc, OfferExpiresAtUtc)",
     "أكثر من عرض لنفس الطلب، وهو غير موجود في آلة الحالة"),
    ("institution.InitiativeMembership", "initiative", "N", "معتمد D25، D28، قرارات #4 #7 #11", "العضوية المقبولة",
     "الحالة Accepted موجودة في الطلب والعضوية معًا؛ 1:1 بـUQ ApplicationId وFK ثلاثي فقط لإبقاء النسختين متسقتين",
     "MERGE→institution.InitiativeApplication (Accepted/Suspended/Removed/Completed، EndedAtUtc، CapacityReleasedAtUtc، WithdrawalCutoffAtUtc)",
     "MERGE→institution.InitiativeApplication (Accepted/Suspended/Removed/Completed، EndedAtUtc، CapacityReleasedAtUtc، WithdrawalCutoffAtUtc)",
     "الفصل بين الطلب والمشاركة كجدولين. قاعدة المبادرة الواحدة تبقى UXF على PersonId (خلافي G6)"),
    ("institution.InitiativeStaffInvitation", "initiative", "N", "معتمد D21، D23", "دعوة مشرف/مدرب بالبريد",
     "الدعوة والتعيين مرحلتان لسجل واحد؛ StandaloneSessionSupervisorAppointment والـClient يدمجانهما أصلًا",
     "MERGE→institution.StaffAppointment (InvitedEmail, TokenHash, ExpiresAtUtc)", "MERGE→institution.StaffAppointment (InvitedEmail, TokenHash, ExpiresAtUtc)",
     "صف مستقل لكل إعادة إرسال (يصبح تدوير TokenHash)"),
    ("institution.InitiativeStaffAppointment", "initiative", "N", "معتمد D21، D28 (3 مشرفين)، D30", "تعيين فعّال بنطاق",
     "يبقى؛ يستوعب الدعوة", "KEEP→institution.StaffAppointment", "KEEP→institution.StaffAppointment (InitiativeId XOR ExperienceId)", "—"),
    # ---------------- coach ----------------
    ("coach.CoachApproval", "coach", "H", "§13 تحقق مهني؛ الدليل مفتوح §26.2 #4", "اعتماد Coach مستقل",
     "نفس شكل حالة التحقق", "DEFER", "MERGE→org.VerificationCase (CoachPersonId)", "لا شيء وظيفي"),
    ("coach.CoachProgram", "coach", "N", "معتمد D19، D24", "برنامج Coach مستقل",
     "جذر", "DEFER", "KEEP", "—"),
    ("coach.ProgramRevision", "coach", "V", "§13.2 Versioned Program، §23.2", "نسخ البرنامج المنشورة",
     "إصدار مطلوب نصًا", "DEFER", "KEEP", "—"),
    ("coach.ProgramStage", "coach", "V", "§13.2 مراحل البرنامج", "مرحلة داخل نسخة",
     "صفوف ثابتة داخل نسخة غير قابلة للتعديل، ولا يشير إليها أي FK في القاموس",
     "DEFER", "MERGE→coach.ProgramRevision (StagesJson)", "لا شيء: لا FK يشير إلى المرحلة"),
    ("coach.OperationalGroup", "coach", "N", "معتمد D19 (أب واحد XOR)", "مجموعة تشغيلية",
     "جذر", "DEFER", "KEEP", "—"),
    ("coach.InitiativeGroupPlacement", "coach", "H", "معتمد D29 (نقل مع تاريخ)", "تسكين عضو مبادرة في مجموعة",
     "نفس مفهوم ProgramGroupMembership بأب مختلف",
     "DEFER", "MERGE→coach.GroupMembership (ApplicationId بـFK مركب مع InitiativeId)",
     "جدول لكل نوع أب؛ قيد العضو من نفس المبادرة يبقى عبر FK مركب"),
    ("coach.ProgramGroupMembership", "coach", "N", "معتمد §13", "عضو مجموعة برنامج",
     "يصبح جدول عضوية المجموعات الموحد بصفوف مؤرخة", "DEFER", "KEEP→coach.GroupMembership", "—"),
    ("coach.ProgramCompletion", "coach", "N", "D10: إكمال المبادرة والبرنامج تصنيف واحد", "إكمال البرنامج",
     "D10 نفسه يوحّدهما", "DEFER", "MERGE→session.Completion (ProgramId, PersonId, ProgramRevisionId)",
     "لا شيء وظيفي؛ ProgramRevisionId يصبح FK nullable"),
    ("coach.GroupCoachAssignment", "coach", "H", "معتمد D29، D33", "مسؤولية المدرب والتسليم",
     "تاريخ تسليم معتمد", "DEFER", "KEEP", "—"),
    ("coach.ProgramGroupInvitation", "coach", "N", "معتمد §13.2، D23", "دعوة طالب لمجموعة",
     "دعوة ثم عضوية لنفس السجل", "DEFER", "MERGE→coach.GroupMembership (Status='Invited', InvitedEmail, TokenHash)",
     "UseLimit/Uses (حذفتها v2 مع أن §13.2 يذكر use limit — قرار مطلوب)"),
    # ---------------- task ----------------
    ("task.Assignment", "task", "N", "معتمد D31، §13.1 محرك واحد", "مهمة مشتركة",
     "جذر", "DEFER", "KEEP", "—"),
    ("task.AssignmentRevision", "task", "V", "§13.2: تغيير المهمة المنشورة ينشئ نسخة جديدة", "نسخ المهمة",
     "مبرر بنص صريح", "DEFER", "KEEP", "—"),
    ("task.AssignmentRecipient", "task", "N", "D31", "حالة المهمة لكل طالب",
     "يحفظ من كُلّف فعلًا رغم النقل", "DEFER", "KEEP", "—"),
    ("task.SubmissionAttempt", "task", "H", "معتمد D32", "محاولات التسليم الثابتة",
     "تاريخ معتمد", "DEFER", "KEEP", "—"),
    ("task.ReviewDecision", "task", "H", "معتمد D32، §13.3", "قرار المراجعة",
     "تاريخ قرارات معتمد", "DEFER", "KEEP", "—"),
    ("task.ReviewPrivateNote", "task", "H", "معتمد D33، §13.3 قراء مختلفون", "ملاحظة داخلية للمشرف",
     "قارئ مختلف وتصنيف خصوصية R مقابل O: فصل مبرر", "DEFER", "KEEP", "—"),
    ("task.CoachReport", "task", "N", "معتمد D34", "تقرير المدرب",
     "أعمدته مطابقة لـSupervisorReport عدا النطاق", "DEFER", "KEEP→task.OperationalReport (GroupId XOR InitiativeId)", "—"),
    ("task.SupervisorReport", "task", "N", "معتمد D34", "ملخص المشرف",
     "نفس الشكل", "DEFER", "MERGE→task.OperationalReport (InitiativeId)", "لا شيء وظيفي"),
    # ---------------- session ----------------
    ("session.Session", "session", "N", "معتمد D39، §15.2", "جلسة مكوّن",
     "جذر؛ يستوعب ExperienceSession في C", "DEFER", "KEEP (InitiativeId XOR ExperienceId)", "—"),
    ("session.SessionRevision", "session", "V", "§16 Calendar: history/version retained، §15.2", "نسخ شروط الجلسة",
     "AuditEvent يحفظ hash فقط لا القيم، فلا يكفي لحفظ النسخة", "DEFER", "KEEP", "—"),
    ("session.InitiativeSessionDuty", "session", "N", "§15.2 المرحلة 4 responsible session appointment", "المشرف المسؤول عن الجلسة",
     "صلاحية الحضور على مستوى المبادرة كلها (§17)، فالواجب معلوماتي هنا وتقييدي لمشرف Provider",
     "DEFER", "KEEP→session.SessionDuty", "—"),
    ("session.StandaloneSessionSupervisorAppointment", "session", "S", "غير معتمد: الجلسة المستقلة غير موجودة في المواصفة؛ v2 صنفته DEFER", "مشرف جلسة مستقلة",
     "ميزة تخمينية", "DEFER (سياسة)", "DEFER (سياسة)",
     "لو اعتُمد: يندمج في StaffAppointment بإضافة SessionId إلى XOR، بلا جدول جديد"),
    ("session.SessionCapacityPool", "session", "N", "D37 Hybrid حسب النمط، §15.2 mode capacity", "سعة كل نمط",
     "صفان على الأكثر لكل جلسة (Online/InPerson)",
     "DEFER", "MERGE→session.Session (InPersonCapacity, OnlineCapacity)",
     "أنماط سعة غير محدودة؛ القفل ينتقل إلى صف Session"),
    ("session.SessionRegistration", "session", "N", "معتمد D39", "تسجيل في جلسة",
     "حقيقة منفصلة عن العضوية", "DEFER", "KEEP", "—"),
    ("session.SessionAttendance", "session", "N", "معتمد D36، D37", "الحضور الفعلي",
     "يستوعب ProviderAttendance في C", "DEFER", "KEEP→session.Attendance (RegistrationId XOR BookingId)", "—"),
    ("session.AttendanceCorrection", "session", "H", "§17.1 التصحيح يحفظ قبل/بعد/الفاعل/السبب", "تصحيح الحضور",
     "أعمدته (OldStatus, NewStatus, CorrectedBy, Reason) تطابق AuditEvent (BeforeStatus, AfterStatus, ActorPersonId, Reason)",
     "DEFER", "MERGE→ops.AuditEvent",
     "FK مباشر من التصحيح إلى الحضور (يصبح ResourcePublicId، ويحتاج إضافة PublicId إلى Attendance)؛ يجب أن يُقرأ AuditEvent في واجهة المشرف (خلافي G10)"),
    ("session.AbsenceExcuse", "session", "N", "معتمد D35، D36", "عذر الغياب وقرار الممثل",
     "قرار منفصل عن الحضور: معتمد صراحة", "DEFER", "KEEP", "—"),
    ("session.InitiativeCompletion", "session", "N", "معتمد D10، D39", "إكمال المبادرة",
     "يستوعب إكمال البرنامج والمخيم", "DEFER", "KEEP→session.Completion (ApplicationId XOR ProgramId+PersonId XOR BookingId)", "—"),
    # ---------------- provider ----------------
    ("provider.Provider", "provider", "N", "معتمد D40، §16", "مزوّد التجارب",
     "أعمدته مطابقة لـInstitution", "DEFER", "MERGE→org.Organization (Kind='Provider')", "جدول منفصل (خلافي G1)"),
    ("provider.ProviderVerificationCase", "provider", "H", "D47", "تحقق المزوّد",
     "نفس شكل حالة التحقق", "DEFER", "MERGE→org.VerificationCase", "لا شيء وظيفي"),
    ("provider.ProviderMembership", "provider", "N", "§16", "موظفو المزوّد",
     "يطابق RepresentativeMembership", "DEFER", "MERGE→org.OrganizationMember (Role)", "جدول منفصل (خلافي G1)"),
    ("provider.Experience", "provider", "N", "معتمد D40، §16", "تجربة/مخيم",
     "جذر وقفل السعة", "DEFER", "KEEP", "—"),
    ("provider.ExperienceRevision", "provider", "V", "§16.3 attributed revision، موافقة وسلامة وقت الحجز", "نسخ شروط التجربة",
     "إصدار مطلوب نصًا", "DEFER", "KEEP", "—"),
    ("provider.ExperienceSession", "provider", "N", "§16 جلسات المخيم", "جلسة داخل تجربة",
     "أعمدته (Title, Mode, Status) جزء من Session", "DEFER", "MERGE→session.Session (ExperienceId)", "جدول جلسات منفصل لكل مالك (خلافي G3)"),
    ("provider.ExperienceBooking", "provider", "N", "معتمد D27، D40", "حجز المشارك",
     "جذر المشاركة في Provider", "DEFER", "KEEP", "—"),
    ("provider.SeatOffer", "provider", "N", "معتمد D27، §16.1", "عرض مقعد من الانتظار",
     "الرفض/الانتهاء يحرر المقعد للتالي فلا يتكرر العرض لنفس الحجز؛ الـClient يعامله كحالة حجز",
     "DEFER", "MERGE→provider.ExperienceBooking (OfferedAtUtc, OfferExpiresAtUtc)", "أكثر من عرض لنفس الحجز (غير موجود في §16.1)"),
    ("provider.ProviderStaffInvitation", "provider", "N", "§16 Supervisors & Staff", "دعوة موظف مزوّد",
     "دعوة ثم تعيين لنفس السجل", "DEFER", "MERGE→institution.StaffAppointment", "صف لكل إعادة إرسال"),
    ("provider.ProviderStaffAppointment", "provider", "N", "§17 مشرف Provider بنطاق محدود", "تعيين موظف مزوّد",
     "نفس شكل تعيين المبادرة", "DEFER", "MERGE→institution.StaffAppointment (ExperienceId)", "جدول تعيين منفصل (خلافي G2)"),
    ("provider.ProviderAppointmentSession", "provider", "N", "§16 named sessions/cohorts", "جلسات مسندة لمشرف المزوّد",
     "نفس مفهوم InitiativeSessionDuty", "DEFER", "MERGE→session.SessionDuty", "جدول واجب منفصل (خلافي G3)"),
    ("provider.ProviderCohort", "provider", "N", "مصطلح معتمد Supervisor Cohort §2.1، §17", "فوج تحت مشرف",
     "معتمد اصطلاحيًا رغم أن v2 أجّله", "DEFER", "KEEP", "—"),
    ("provider.ProviderCohortMember", "provider", "N", "§17", "عضو الفوج",
     "الحجز ينتمي إلى فوج واحد على الأكثر", "DEFER", "MERGE→provider.ExperienceBooking (CohortId بـFK مركب مع ExperienceId)",
     "انتماء حجز واحد إلى أكثر من فوج"),
    ("provider.ProviderAttendance", "provider", "N", "D36، D37 (نفس بروتوكول الحضور)", "حضور جلسات المزوّد",
     "أعمدته شبه مطابقة لـSessionAttendance", "DEFER", "MERGE→session.Attendance (BookingId)", "جدول حضور منفصل (خلافي G4)"),
    ("provider.ProviderAttendanceCorrection", "provider", "H", "§17.1", "تصحيح حضور المزوّد",
     "نسخة ثانية من AttendanceCorrection", "DEFER", "MERGE→ops.AuditEvent", "FK مباشر (خلافي G10)"),
    ("provider.CampCompletion", "provider", "N", "D09 (بيت الطائر)، §16.2", "إكمال المخيم",
     "نفس شكل الإكمال", "DEFER", "MERGE→session.Completion (BookingId)", "جدول إكمال منفصل (خلافي G5)"),
    ("provider.ProviderIncident", "provider", "H", "§24.2 safe reporting mechanism؛ السياسة مفتوحة §26.2 #4", "بلاغ سلامة",
     "بيانات سلامة بتصنيف R وقراء محدودين", "DEFER", "KEEP", "—"),
    # ---------------- forms ----------------
    ("forms.Form", "forms", "N", "معتمد D41، §15.4", "نموذج/استبيان معرّف الهوية",
     "جذر؛ يستوعب Competition في C", "DEFER", "KEEP", "—"),
    ("forms.FormVersion", "forms", "V", "D41 versioned", "نسخة النموذج المنشورة",
     "إصدار مطلوب نصًا؛ يحمل تعريف الأسئلة", "DEFER", "KEEP", "—"),
    ("forms.FormQuestion", "forms", "V", "§15.4", "سؤال داخل نسخة",
     "صفوف ثابتة داخل نسخة غير قابلة للتعديل", "DEFER", "MERGE→forms.FormVersion (DefinitionJson)",
     "FK من الإجابة إلى السؤال؛ التحقق في C# مقابل النسخة المثبتة (خلافي G8)"),
    ("forms.FormQuestionOption", "forms", "V", "§15.4", "خيار سؤال",
     "نفس السبب", "DEFER", "MERGE→forms.FormVersion (DefinitionJson)", "FK من الاختيار إلى الخيار (خلافي G8)"),
    ("forms.FormResponse", "forms", "N", "D41", "رد شخص معرّف",
     "جذر الرد", "DEFER", "KEEP", "—"),
    ("forms.FormAnswer", "forms", "N", "§15.4", "إجابة سؤال",
     "تُقرأ كوحدة مع الرد", "DEFER", "MERGE→forms.FormResponse (AnswersJson)",
     "FK من الإجابة إلى SecureFile (يُعكس: SecureFile يحمل FormResponseId)، وتقارير SQL تحتاج OPENJSON (خلافي G8)"),
    ("forms.FormAnswerChoice", "forms", "N", "§15.4", "اختيار متعدد",
     "نفس السبب", "DEFER", "MERGE→forms.FormResponse (AnswersJson)", "خلافي G8"),
    ("files.SecureFile", "files", "I", "§15.4، D35 مرفقات مقيدة", "ملف آمن",
     "مشترك بين 8 جداول", "DEFER", "KEEP", "في A: لا رفع ملفات"),
    ("forms.Competition", "competition", "N", "§15.4 يعدّ competition entries نوعًا من النماذج", "مسابقة",
     "المواصفة نفسها تضعها تحت محرك النماذج", "DEFER", "MERGE→forms.Form (Purpose='Competition')", "جذر مسابقة منفصل"),
    ("forms.CompetitionCriterion", "competition", "V", "rubric مفتوح §26.2 #8", "معيار تحكيم",
     "جزء من التعريف المجمّد", "DEFER", "MERGE→forms.FormVersion (DefinitionJson)", "FK من الدرجة إلى المعيار"),
    ("forms.CompetitionEntry", "competition", "N", "§15.4", "مشاركة",
     "هي رد على نموذج المسابقة", "DEFER", "MERGE→forms.FormResponse", "لا شيء وظيفي"),
    ("forms.CompetitionJudgment", "competition", "H", "§20.4 eligible competitions", "تحكيم بهوية الحكم",
     "حقيقة مختلفة عن الإجابة (حكم، قرار، ملاحظات)", "DEFER", "KEEP", "—"),
    ("forms.CompetitionCriterionScore", "competition", "H", "rubric مفتوح §26.2 #8", "درجة لكل معيار",
     "تُقرأ كوحدة مع الحكم", "DEFER", "MERGE→forms.CompetitionJudgment (ScoresJson)", "استعلام SQL مباشر للدرجة"),
    # ---------------- partnership ----------------
    ("partnership.ProgramLink", "partnership", "N", "معتمد §18، D19", "ربط برنامج Coach بمبادرة",
     "أعمدته مطابقة لـExperienceLink", "DEFER", "KEEP→partnership.PartnershipLink (ProgramId XOR ExperienceId)", "—"),
    ("partnership.ExperienceLink", "partnership", "N", "معتمد §18، D40", "ربط تجربة بمبادرة",
     "نفس الشكل", "DEFER", "MERGE→partnership.PartnershipLink (ExperienceId)", "لا شيء وظيفي"),
    # ---------------- community ----------------
    ("community.Post", "community", "N", "§12.1 اتجاه محفوظ؛ التفاصيل مؤجلة §12.2", "منشور",
     "جذر المجتمع", "DEFER", "KEEP", "—"),
    ("community.Comment", "community", "N", "§12.1", "تعليق", "كيان مستقل", "DEFER", "KEEP", "—"),
    ("community.Reaction", "community", "N", "§12.1", "تفاعل عام", "كيان مستقل", "DEFER", "KEEP", "—"),
    ("community.Bookmark", "community", "N", "§12.1 save/bookmark", "حفظ خاص",
     "خاص بالشخص (S) مقابل تفاعل عام", "DEFER", "KEEP", "—"),
    ("community.ContentReport", "community", "N", "§12.1، §19 الإشراف", "بلاغ محتوى",
     "يستوعب قرار الإشراف", "DEFER", "KEEP", "—"),
    ("community.ModerationDecision", "community", "H", "§19؛ الاستئناف مفتوح §26.2 #8", "قرار الإشراف",
     "قرار واحد لكل بلاغ", "DEFER", "MERGE→community.ContentReport (Decision, DecidedBy, DecidedAtUtc, Reason)",
     "سلسلة قرارات للبلاغ الواحد (استئناف غير معتمد)"),
    ("community.JointGoal", "jointgoal", "S", "§12.1 not finalized، §26.2 #8", "هدف مشترك",
     "ميزة غير محسومة", "DEFER (سياسة)", "DEFER (سياسة)", "تأجيل ميزة لا حذف جدول"),
    ("community.JointGoalMember", "jointgoal", "S", "§26.2 #8", "عضو الهدف",
     "ميزة غير محسومة", "DEFER (سياسة)", "DEFER (سياسة)", "تأجيل ميزة"),
    ("community.JointGoalCheckIn", "jointgoal", "S", "§26.2 #8", "متابعة الهدف",
     "ميزة غير محسومة", "DEFER (سياسة)", "DEFER (سياسة)", "تأجيل ميزة"),
    # ---------------- governance ----------------
    ("governance.ContentRelease", "cms", "V", "§19 Content Studio؛ المناطق مفتوحة §26.2 #8", "إصدار محتوى CMS",
     "draft/publish/rollback معتمد", "DEFER", "KEEP", "—"),
    ("governance.GovernanceAction", "governance", "H", "§19", "إجراء حوكمة Admin",
     "أعمدته (Actor, ActionCode, ResourceType, ResourcePublicId, Reason) مجموعة جزئية من AuditEvent",
     "MERGE→ops.AuditEvent", "MERGE→ops.AuditEvent", "لا شيء: كل الأعمدة موجودة في AuditEvent"),
    # ---------------- commercial ----------------
    ("commercial.PlanVersion", "commercial", "S", "§20: ليس كتالوجًا موقّعًا، §26.2 #7", "نسخة خطة اشتراك",
     "قرار تجاري مفتوح", "DEFER (سياسة)", "DEFER (سياسة)", "تأجيل ميزة؛ لو اعتُمدت تكفي 3 جداول"),
    ("commercial.PlanFeature", "commercial", "S", "§20", "ميزة/حد الخطة", "قرار مفتوح", "DEFER (سياسة)", "DEFER (سياسة)", "تأجيل ميزة"),
    ("commercial.Subscription", "commercial", "S", "§20", "اشتراك", "قرار مفتوح", "DEFER (سياسة)", "DEFER (سياسة)", "تأجيل ميزة"),
    ("commercial.EntitlementAllocation", "commercial", "S", "§20.6", "توزيع الاستحقاق", "قرار مفتوح", "DEFER (سياسة)", "DEFER (سياسة)", "تأجيل ميزة"),
    ("commercial.UsageLedger", "commercial", "S", "§20.6", "دفتر الاستخدام", "قرار مفتوح", "DEFER (سياسة)", "DEFER (سياسة)", "تأجيل ميزة"),
    # ---------------- evidence ----------------
    ("evidence.EvidenceEvent", "evidence", "H", "§9.2 معرّف حدث مصدر فريد، §23.2 لا مكافأة مزدوجة عبر workspace مرتبطة", "حدث دليل موحد",
     "مبرر في C: ستة أنواع مصادر، والشراكات قد تعرض الحدث نفسه مرتين",
     "DEFER", "KEEP", "في A: المكافأة تشير مباشرة إلى PracticeAttempt XOR RoutineCheckIn"),
    ("evidence.RewardPolicyVersion", "evidence", "V", "§9.2 policy version؛ العتبات مفتوحة", "نسخة سياسة المكافأة",
     "القواعد في الكود؛ بقية نسخ السياسات في القاموس نصية أصلًا (PlanRevision.PolicyVersion...)",
     "MERGE→evidence.PersonalRewardEntry (PolicyVersion نصي)", "MERGE→evidence.PersonalRewardEntry (PolicyVersion نصي، وكذلك GroupRewardEntry)",
     "FK إلى سجل نسخة السياسة"),
    ("evidence.PersonalRewardEntry", "evidence", "H", "معتمد D07–D11", "دفتر المكافأة الشخصية",
     "نمو مكتسب لا يُسحب عند تغيير السياسة: دفتر مطلوب", "KEEP", "KEEP", "—"),
    ("evidence.GroupRewardEntry", "evidence", "H", "معتمد D13", "دفتر مكافأة المجموعة",
     "منفصل عن الشخصي لأن تصنيف الخصوصية مختلف (S مقابل O) وقراؤه موظفون", "DEFER", "KEEP", "—"),
    ("evidence.GroupGarden", "evidence", "N", "D13 حديقة لكل مبادرة أو مجموعة مستقلة", "هوية حديقة المجموعة",
     "1:1 مع المبادرة أو المجموعة (UXF على كل منهما) ولا يحمل إلا Status",
     "DEFER", "MERGE→evidence.GroupRewardEntry (InitiativeId XOR OperationalGroupId)", "حالة أرشفة للحديقة نفسها"),
    # ---------------- ops ----------------
    ("ops.AuditEvent", "ops", "H", "§23.3، §19", "سجل التدقيق",
     "يستوعب GovernanceAction والتصحيحات", "KEEP", "KEEP", "—"),
    ("ops.OutboxMessage", "ops", "I", "§23.3، §24.6", "رسائل خارجية بعد commit",
     "ضروري لإرسال بريد الدعوات بشكل موثوق", "DEFER", "KEEP", "في A: رابط دعوة قابل للنسخ (مسموح §23.3)"),
    ("ops.Notification", "ops", "N", "§23.3", "إشعار داخل التطبيق",
     "معتمد", "DEFER", "KEEP", "في A: الحالة تظهر في My Initiatives بدل مركز إشعارات"),
    ("ops.DeliveryAttempt", "ops", "H", "§23.3 notification outcome", "محاولة توصيل",
     "Outbox فيه Attempts أصلًا", "DEFER", "MERGE→ops.OutboxMessage (Attempts, LastError, ProviderRef)", "صف لكل محاولة"),
    ("ops.IdempotencyRecord", "ops", "I", "§22.3 idempotency حيث توجد سباقات", "تخزين استجابة الطلب المكرر",
     "كل سباق مذكور له مفتاح طبيعي: قبول الطلب (UXF)، QR (UQ)، فترات الاستخدام (SequenceNo)، المكافأة (UQ المصدر)",
     "REMOVE", "REMOVE", "إعادة الاستجابة نفسها حرفيًا لطلب POST مكرر؛ يعيد الـAPI الحالة الحالية"),
    # ---------------- v2 additions ----------------
    ("institution.InitiativeApplicationDecision", "initiative", "H", "قرار المالك #9", "سجل قرارات الطلب",
     "تاريخ معتمد صراحة؛ يحمل كل انتقالات الطلب بعد الدمج", "KEEP", "KEEP", "—"),
    ("institution.InitiativeDraft", "initiative", "V", "§15.2 حفظ المسودة في كل مرحلة", "مسودة البناء ذات المراحل الست",
     "UXF مسودة واحدة لكل مبادرة، والجذر يحمل أعمدة مسودة nullable أصلًا",
     "MERGE→institution.Initiative (DraftJson, DraftStage, DraftUpdatedByPersonId)", "MERGE→institution.Initiative (DraftJson, DraftStage, DraftUpdatedByPersonId)",
     "rowversion منفصل للمسودة؛ الحفظ التلقائي سيغيّر rowversion الجذر"),
]


def target_of(disp, original):
    """Return the target table for a KEEP/MERGE disposition, else None."""
    if disp.startswith("KEEP"):
        m = re.match(r"KEEP→([\w.]+)", disp)
        return m.group(1) if m else original
    if disp.startswith("MERGE"):
        return re.match(r"MERGE→([\w.]+)", disp).group(1)
    return None


def b_disp(module, c):
    return c if module in B_MODULES else "DEFER"


def main():
    src = DICT.read_text(encoding="utf-8")
    names = [re.match(r"\| `([\w.]+)`", l).group(1) for l in src.splitlines() if l.startswith("| `")]
    assert len(names) == 129, len(names)
    mapped = [r[0] for r in ROWS]
    dup = [n for n, c in Counter(mapped).items() if c > 1]
    assert not dup, dup
    assert set(mapped) == set(names), (set(names) - set(mapped), set(mapped) - set(names))
    order = {n: i for i, n in enumerate(names, 1)}
    rows = sorted(ROWS, key=lambda r: order[r[0]])

    designs = {}
    for key, idx in (("A", 6), ("C", 7)):
        designs[key] = [(r[0], r[idx]) for r in rows]
    designs["B"] = [(r[0], b_disp(r[1], r[7])) for r in rows]

    inv, stats = {}, {}
    for key, pairs in designs.items():
        anchors = [target_of(d, n) for n, d in pairs if d.startswith("KEEP")]
        targets = {target_of(d, n) for n, d in pairs if target_of(d, n)}
        assert len(anchors) == len(set(anchors)), (key, [a for a, c in Counter(anchors).items() if c > 1])
        assert targets == set(anchors), (key, targets ^ set(anchors))
        inv[key] = sorted(anchors)
        s = Counter()
        for _, d in pairs:
            s["KEEP" if d.startswith("KEEP") else "MERGE" if d.startswith("MERGE") else
              "DEFER (سياسة)" if d == "DEFER (سياسة)" else d] += 1
        assert sum(s.values()) == 129
        stats[key] = s

    contested = [t for _, (_, ts) in CONTESTED.items() for t in ts]
    cmap = dict(designs["C"])
    for t in contested:
        assert cmap[t].startswith("MERGE"), t

    # ---------- write markdown ----------
    L = []
    w = L.append
    w("# مصفوفة الجداول الـ129 — KEEP / MERGE / DEFER / REMOVE")
    w("")
    w("**مُولَّد** بواسطة `generate_audit.py` من `../v2.1/02-canonical-dictionary.md`. لا تحرّر هذا الملف يدويًا؛ عدّل البيانات في السكربت ثم أعد التشغيل. التقرير التحليلي في [01-necessity-audit-ar.md](01-necessity-audit-ar.md).")
    w("")
    w("**المفاتيح:** `KEEP` يبقى جدولًا (قد يُعاد تسميته بعد السهم)؛ `MERGE→X` تنتقل بياناته إلى الجدول X (الأعمدة بين القوسين)؛ `DEFER` تأجيل **الميزة كلها** في هذا التصميم، والجدول يعود معها؛ `DEFER (سياسة)` ميزة غير معتمدة بعد، تنتظر قرار المالك؛ `REMOVE` حذف جدول غير ضروري مع بقاء الوظيفة. **A** = MVP، **B** = عملي، **C** = النطاق المعتمد كاملًا.")
    w("")
    w("## 1. الأعداد المُتحقق منها")
    w("")
    w("| التصميم | جداول ناتجة | KEEP | MERGE | DEFER (ميزة مؤجلة) | DEFER (سياسة) | REMOVE |")
    w("|---|---:|---:|---:|---:|---:|---:|")
    for key, label in (("A", "A — MVP"), ("B", "B — عملي"), ("C", "C — كامل معتمد")):
        s = stats[key]
        w(f"| {label} | **{len(inv[key])}** | {s['KEEP']} | {s['MERGE']} | {s['DEFER']} | {s['DEFER (سياسة)']} | {s['REMOVE']} |")
    w(f"| الحالي (v2.1) | **129** | 129 | 0 | 0 | 0 | 0 |")
    w("")
    w(f"كل صف من الـ129 يظهر مرة واحدة في كل تصميم، وكل جدول ناتج له جدول أصلي واحد يرسو عليه (`KEEP`). السكربت يفشل إذا اختلّ أي من الشرطين.")
    w("")
    w(f"**الدمجات الخلافية في C:** {len(contested)} جدولًا في {len(CONTESTED)} مجموعات. لو رُفضت كلها يصبح C = **{len(inv['C']) + len(contested)}** جدولًا.")
    w("")
    w("| المجموعة | الدمج | الجداول التي تعود لو رُفض | الفرق |")
    w("|---|---|---|---:|")
    for g, (desc, ts) in CONTESTED.items():
        w(f"| {g} | {desc} | {'، '.join(f'`{t}`' for t in ts)} | +{len(ts)} |")
    w("")
    w("## 2. الجرد الاسمي لكل تصميم")
    w("")
    for key, label in (("A", "A — MVP"), ("B", "B — عملي"), ("C", "C — النطاق المعتمد كاملًا")):
        w(f"### {label}: {len(inv[key])} جدولًا")
        w("")
        by_schema = OrderedDict()
        for t in inv[key]:
            by_schema.setdefault(t.split(".")[0], []).append(t)
        for sch, ts in by_schema.items():
            w(f"- **{sch}** ({len(ts)}): " + "، ".join(f"`{t.split('.')[1]}`" for t in ts))
        w("")
    w("## 3. المصفوفة الكاملة")
    w("")
    w("العمود \"الحكم\" يجيب: لماذا جدول مستقل، أو لماذا لا. العمود \"ما يُفقد\" يذكر القيد أو الوظيفة أو الدليل التاريخي الذي يضيع بالتغيير.")
    w("")
    current = None
    for r in rows:
        name, module, cat, appr, feat, verdict, a, c, loss = r
        sch = name.split(".")[0]
        if sch != current:
            current = sch
            w(f"### `{sch}`")
            w("")
            w("| # | الجدول | الميزة/سير العمل | الاعتماد والمصدر | الفئة | الحكم | A | B | C | ما يُفقد عند التغيير |")
            w("|---:|---|---|---|---|---|---|---|---|---|")
        b = b_disp(module, c)
        w(f"| {order[name]} | `{name.split('.')[1]}` | {feat} | {appr} | {CAT[cat]} | {verdict} | {a} | {b} | {c} | {loss} |")
        if r is rows[-1] or rows[rows.index(r) + 1][0].split(".")[0] != sch:
            w("")
    OUT.write_text("\n".join(L).rstrip("\n") + "\n", encoding="utf-8")

    print(f"129 tables mapped; A={len(inv['A'])} B={len(inv['B'])} C={len(inv['C'])} "
          f"C-if-contested-rejected={len(inv['C']) + len(contested)}")
    for k in "ABC":
        print(k, dict(stats[k]))
    cats = Counter(r[2] for r in rows)
    print("categories", dict(cats))


if __name__ == "__main__":
    sys.exit(main())
