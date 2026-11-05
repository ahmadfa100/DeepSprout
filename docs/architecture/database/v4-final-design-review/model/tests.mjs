// Traceability of the 330 recorded regression checks (docs/architecture/database/phase-b/final-regression/*.jsonl)
// to the v4 schema. Disposition:
//   CARRY      same invariant, same (possibly renamed) table: port the test as-is against the new name.
//   REWRITE    same invariant, now enforced by a different table/constraint after a merge: rewrite the test.
//   STRUCTURAL the old test guarded consistency between two copies of one fact; the copy no longer exists.
//              The named replacement test proves the guarantee the old test protected.
//   DEFER      feature deferred/excluded; the test returns with the feature.
//   REGENERATE environment/schema-count/preservation/summary check: regenerate for the new database.
// Every old ID appears exactly once in the generated traceability table; nothing is silently dropped.

export const suiteDefaults = {
  'coach-participation': ['CARRY', 'coach.GroupMembership'],
  'coach': ['CARRY', 'coach.CoachProgram'],
  'commercial': ['DEFER', '—'],
  'community': ['CARRY', 'community.*'],
  'evidence': ['CARRY', 'evidence.*'],
  'forms': ['CARRY', 'forms.*'],
  'institution-extensions': ['REWRITE', 'institution.InitiativeApplication'],
  'lab': ['CARRY', 'lab.*'],
  'm1': ['REWRITE', 'institution.InitiativeApplication'],
  'operations': ['CARRY', 'ops.* / governance.ContentRelease'],
  'partnership': ['REWRITE', 'partnership.PartnershipLink'],
  'provider-foundation': ['CARRY', 'provider.*'],
  'provider-operations': ['REWRITE', 'session.* / org.StaffAppointment'],
  'recovery': ['CARRY', 'recovery.* / activity.*'],
  'session': ['CARRY', 'session.*'],
  'shield': ['CARRY', 'shield.*'],
  'task': ['CARRY', 'task.*'],
};

export const overrides = {
  // coach-participation
  'CP-PROGRAM-OWNER-FK': ['REWRITE', 'coach.GroupMembership', 'FK (GroupId, ProgramId) → OperationalGroup(Id, ProgramId).'],
  'CP-MEMBER-UNIQUE': ['REWRITE', 'coach.GroupMembership', 'UQ (GroupId, PersonId) WHERE Status=Active؛ أضف حالة: العودة بعد Ended مسموحة.'],
  'CP-INVITE-KIND': ['REWRITE', 'coach.GroupMembership', 'CK Invited: الدعوة تتطلب ProgramId (لا دعوة بريدية لمجموعة مبادرة).'],
  'CP-INVITE-UNIQUE': ['REWRITE', 'coach.GroupMembership', "UQ (GroupId, NormalizedEmail) WHERE Status='Invited'."],
  'CP-ASSIGN-PARENT': ['CARRY', 'coach.GroupCoachAssignment', 'التعيين عبر org.StaffAppointment(Id, InitiativeId).'],
  'CP-ASSIGN-RACE': ['CARRY', 'coach.GroupCoachAssignment'],
  'CP-COMPLETION-REVISION': ['REWRITE', 'session.Completion', 'FK (ProgramRevisionId, ProgramId).'],
  'CP-EVIDENCE-OWNER': ['REWRITE', 'session.Completion', 'FK (EvidenceEventId, PersonId).'],
  'CP-COMPLETION-UNIQUE': ['REWRITE', 'session.Completion', 'UQ (ProgramId, PersonId) WHERE ProgramId IS NOT NULL.'],
  'CP-PLACEMENT-GROUP-OWNER': ['REWRITE', 'coach.GroupMembership', 'FK (GroupId, InitiativeId) وFK (ApplicationId, InitiativeId, PersonId).'],
  // coach
  'COACH-APPROVAL-STATUS': ['REWRITE', 'org.VerificationCase', 'CK Status لـKind=Coach.'],
  'COACH-PUBLISH-GUARD': ['REWRITE', 'coach.CoachProgram', 'صار CHECK (Published ⇒ CurrentRevisionId) بدل مشغّل.'],
  'COACH-REVISION-RACE': ['CARRY', 'coach.ProgramRevision'],
  'COACH-STAGE-TIMES': ['STRUCTURAL', 'coach.ProgramRevision', 'المراحل داخل StagesJson؛ البديل: NEW-PROG-STAGES-VALIDATION (تحقق C# عند النشر يرفض تواريخ مرحلة مقلوبة).'],
  'COACH-STAGE-IMMUTABLE': ['REWRITE', 'coach.ProgramRevision', 'المراحل ثابتة لأنها داخل نسخة إلحاقية؛ اختبار TR_ProgramRevision_Immutable على StagesJson.'],
  'COACH-REVISION-IMMUTABLE': ['CARRY', 'coach.ProgramRevision'],
  'COACH-STAGE-SEALED': ['STRUCTURAL', 'coach.ProgramRevision', 'لا يمكن إضافة مرحلة لنسخة منشورة لأنها عمود في صف إلحاقي؛ يغطيه COACH-REVISION-IMMUTABLE.'],
  'COACH-OWNER-IMMUTABLE': ['CARRY', 'coach.CoachProgram'],
  'COACH-GROUP-XOR': ['CARRY', 'coach.OperationalGroup'],
  'COACH-GROUP-NULLABLE': ['CARRY', 'coach.OperationalGroup'],
  'COACH-GROUP-PARENT-IMMUTABLE': ['CARRY', 'coach.OperationalGroup'],
  'COACH-EF-OUTPUT': ['CARRY', 'coach.CoachProgram', 'EF Core مع جداول عليها مشغّلات (OUTPUT clause).'],
  // community
  'COMM-CHECKIN-MEMBER-FK': ['DEFER', '—', 'Joint Goals مستبعدة.'],
  'COMM-CHECKIN-ACTIVE': ['DEFER', '—', 'Joint Goals مستبعدة.'],
  'COMM-CHECKIN-IMMUTABLE': ['DEFER', '—', 'Joint Goals مستبعدة.'],
  // evidence
  'EVIDENCE-GARDEN-OWNER': ['REWRITE', 'evidence.GroupRewardEntry', 'FK (GroupId, ProgramId) → OperationalGroup(Id, ProgramId) يرفض مجموعة داخلية لمبادرة.'],
  'EVIDENCE-GARDEN-XOR': ['REWRITE', 'evidence.GroupRewardEntry', 'CK Owner.'],
  'EVIDENCE-GARDEN-IMMUTABLE': ['REWRITE', 'evidence.GroupRewardEntry', 'المالك عمود في صف إلحاقي؛ TR_GroupRewardEntry_Immutable.'],
  'EVIDENCE-GROUP-GRANT-UNIQUE': ['REWRITE', 'evidence.GroupRewardEntry', "UQ (EvidenceEventId, EffectCode) WHERE Grant — أقوى: يمنع المنح لحديقتين."],
  // forms
  'FORM-ONE-VALUE': ['REWRITE', 'forms.FormAnswer', 'CK OneValue يشمل OptionId (قيمة واحدة بالضبط).'],
  'FORM-CHOICE-QUESTION': ['REWRITE', 'forms.FormAnswer', 'FK (OptionId, QuestionId).'],
  'FORM-CHOICE-SEALED': ['REWRITE', 'forms.FormAnswer', 'الاختيارات صفوف إجابة؛ ختم الإجابات يغطيها.'],
  'FORM-SCORE-COMPETITION': ['REWRITE', 'forms.CompetitionCriterionScore', 'FK (JudgmentId, FormVersionId).'],
  'FORM-SCORE-RUBRIC': ['REWRITE', 'forms.CompetitionCriterionScore', 'FK (CriterionId, FormVersionId).'],
  // institution-extensions
  'IE-CONTENT-ORDER': ['STRUCTURAL', 'institution.InitiativeRevision', 'المحتوى داخل PublishedSnapshotJson؛ البديل: NEW-INIT-SNAPSHOT-VALIDATION (ترتيب المكوّنات يُتحقق عند النشر).'],
  'IE-APPROVE-TRANSFER': ['REWRITE', 'institution.InitiativeApplication', 'Offered → Accepted على الصف نفسه؛ أثبت أن العدّ لا يتغير وأن قرارًا واحدًا كُتب.'],
  // lab
  'LAB-VERSION-INSTRUMENT': ['REWRITE', 'lab.AssessmentAttempt', 'FK (InstrumentVersionId, InstrumentCode).'],
  // m1 — carried invariants (boundary semantics, immutability, privileges)
  'ENV-01': ['REGENERATE', '—'],
  'BLD-01': ['REWRITE', 'institution.Initiative', 'مسودة بلا عنوان تُحفظ في DraftJson.'],
  'BLD-02': ['REWRITE', 'institution.Initiative', 'تعارض RowVersion على الجذر.'],
  'BLD-03': ['REWRITE', 'institution.Initiative', 'النشر يرفض مسودة ناقصة المراحل.'],
  'BLD-04': ['REWRITE', 'institution.Initiative', 'الجذر والنسخة والتدقيق في معاملة واحدة، وتفريغ المسودة.'],
  'BLD-05': ['CARRY', 'institution.InitiativeRevision'],
  'BLD-05-RUNTIME': ['CARRY', 'institution.InitiativeRevision', 'DENY UPDATE لدور التشغيل.'],
  'BLD-03-GUARD': ['REWRITE', 'institution.Initiative', 'CHECK Published ⇒ CurrentRevisionId.'],
  'SQL-CK-01': ['REWRITE', 'institution.InitiativeRevision', 'CK Capacity BETWEEN 1 AND 135 على النسخة.'],
  'SQL-CK-02': ['REWRITE', 'institution.Initiative', 'CK DraftStage BETWEEN 1 AND 6.'],
  'SQL-03': ['REWRITE', 'institution.InitiativeApplication', 'FK (TermsRevisionId, InitiativeId).'],
  'SQL-04': ['REWRITE', 'coach.GroupMembership / session.Completion', 'FK (ApplicationId, InitiativeId, PersonId) يحل محل FK العضوية الثلاثي.'],
  'HIST-01': ['CARRY', 'institution.InitiativeApplicationDecision'],
  'APP-01': ['CARRY', 'institution.InitiativeApplication'],
  'APP-02': ['CARRY', 'institution.InitiativeApplication'],
  'APP-03': ['REWRITE', 'institution.InitiativeApplication', 'Blocked داخل الفهرس الفريد المفتوح؛ أضف BlockLifted يسمح بمحاولة جديدة.'],
  'APP-04': ['REWRITE', 'institution.InitiativeApplication', 'الفهرس الفريد المفلتر على (InitiativeId, PersonId).'],
  'APP-05': ['CARRY', 'institution.InitiativeApplication'],
  'APP-05-STATE': ['CARRY', 'institution.InitiativeApplication'],
  'APP-06': ['REWRITE', 'institution.InitiativeApplication', 'إعادة الأمر تعيد صفًا مقبولًا واحدًا وقرارًا واحدًا (مع IdempotencyRecord).'],
  'SQL-CK-03': ['REWRITE', 'institution.InitiativeApplication', 'CK Membership وCK Open.'],
  'MEM-03-FUNCTION': ['CARRY', 'institution.InitiativeApplication', 'CanWithdraw(now, cutoff) = now < cutoff.'],
  'MEM-03--1-STATE': ['CARRY', 'institution.InitiativeApplication', 'cutoff−1ms ينجح.'],
  'MEM-03-0-ERROR': ['CARRY', 'institution.InitiativeApplication', 'عند الحد يُرفض.'],
  'MEM-03-0-STATE': ['CARRY', 'institution.InitiativeApplication'],
  'MEM-03-1-ERROR': ['CARRY', 'institution.InitiativeApplication'],
  'MEM-03-1-STATE': ['CARRY', 'institution.InitiativeApplication'],
  'MEM-03-CLOCK-PRIVILEGE': ['CARRY', 'institution.InitiativeApplication'],
  'MEM-03-RUNTIME-WRAPPER': ['CARRY', 'institution.InitiativeApplication'],
  'MEM-04': ['CARRY', 'institution.InitiativeApplication'],
  'MEM-07': ['CARRY', 'institution.InitiativeApplication'],
  'RESCHEDULE-POSTPONE': ['CARRY', 'institution.InitiativeRevision / InitiativeApplication'],
  'RESCHEDULE-POSTPONE-WITHDRAW': ['CARRY', 'institution.InitiativeApplication'],
  'RESCHEDULE-ADVANCE': ['CARRY', 'institution.InitiativeApplication'],
  'RESCHEDULE-UNSAFE': ['CARRY', 'institution.InitiativeRevision'],
  'SUP-01': ['REWRITE', 'org.StaffAppointment'],
  'SUP-02': ['REWRITE', 'org.StaffAppointment', 'المشرف الرابع يُرفض (proc + TR_StaffAppointment_SupervisorCap).'],
  'SUP-03': ['REWRITE', 'org.StaffAppointment', 'بريد غير مطابق يبقي Pending.'],
  'SUP-04': ['REWRITE', 'org.StaffAppointment / institution.InitiativeApplication', 'مشرف مسحوب لا يوافق.'],
  'SEC-01-DB': ['CARRY', 'files.SecureFile'],
  'MEM-01': ['REWRITE', 'institution.InitiativeApplication', "UQ (PersonId) WHERE Status IN ('Accepted','Suspended') في سباق اتصالين."],
  'SQL-05': ['REWRITE', 'institution.InitiativeApplication', 'تكرار عضوية فعالة يُرفض بالفهرس نفسه.'],
  // operations
  'GOV-ACTION-IMMUTABLE': ['REWRITE', 'ops.AuditEvent', 'إجراء الحوكمة حدث تدقيق إلحاقي.'],
  'OPS-DELIVERY-IMMUTABLE': ['STRUCTURAL', 'ops.OutboxMessage', 'سجل كل محاولة انتقل إلى السجلات المنظمة؛ البديل: NEW-OPS-OUTBOX-DELIVERY (Delivered ⇒ DeliveredAtUtc، والحالة النهائية لا تُعاد فتحها).'],
  // partnership
  'PART-OWNERS-RETAINED': ['CARRY', 'partnership.PartnershipLink'],
  'PART-LINK-RACE': ['CARRY', 'partnership.PartnershipLink'],
  // provider-foundation
  'PROV-MEMBERSHIP-UNIQUE': ['REWRITE', 'org.OrganizationMember'],
  'PROV-EXPERIENCE-TIMES': ['REWRITE', 'provider.ExperienceRevision', 'الأوقات والسعة على النسخة.'],
  'PROV-OFFER-HOLDS': ['REWRITE', 'provider.ExperienceBooking', 'Offered يحجز مقعدًا.'],
  'PROV-OFFER-UNIQUE': ['STRUCTURAL', 'provider.ExperienceBooking', 'العرض حالة للحجز نفسه، فلا يمكن وجود عرضين حيين؛ البديل: NEW-PROV-OFFER-ONCE (OfferExpired/OfferDeclined نهائيتان ولا تعودان إلى Offered).'],
  'PROV-OFFER-RELEASE': ['REWRITE', 'provider.ExperienceBooking'],
  // provider-operations
  'PO-COHORT-BOOKING': ['CARRY', 'provider.ProviderCohortMember'],
  'PO-COHORT-RACE': ['CARRY', 'provider.ProviderCohortMember'],
  'PO-INCIDENT': ['CARRY', 'provider.ProviderIncident'],
  'PO-STAFF-EMAIL': ['REWRITE', 'org.StaffAppointment'],
  'PO-STAFF-SESSION-UNIQUE': ['REWRITE', 'session.SessionDuty'],
  'PO-ATTENDANCE-RECORDER': ['REWRITE', 'session.Attendance'],
  'PO-ATTENDANCE-EVIDENCE': ['REWRITE', 'session.Attendance', 'صار FK مركبًا (EvidenceEventId, PersonId) بدل مشغّل.'],
  'PO-CORRECTION-IMMUTABLE': ['REWRITE', 'session.AttendanceCorrection'],
  'PO-COMPLETION-EVIDENCE': ['REWRITE', 'session.Completion', 'FK مركب (EvidenceEventId, PersonId).'],
  'PO-COMPLETION-UNIQUE': ['REWRITE', 'session.Completion', 'UQ (BookingId).'],
  // recovery
  'REC-JOURNEY-ACTIVE': ['REWRITE', 'recovery.RecoveryCycle / personal.IndividualProfile', 'دورة حالية واحدة لكل شخص + ملف شخصي واحد.'],
  'REC-CYCLE-OWNER': ['REWRITE', 'recovery.RecoveryCycle', 'FK PersonId مباشر.'],
  'REC-ACTIVE-CYCLE-RACE': ['CARRY', 'recovery.RecoveryCycle', 'الفهرس الآن على PersonId.'],
  // session
  'SESS-DRAFT-REGISTER': ['REWRITE', 'session.SessionRegistration', 'جلسة غير منشورة أو نمط غير معروض يُرفض.'],
  'SESS-CAPACITY-RACE': ['REWRITE', 'session.SessionRegistration', 'سعة النمط على Session تحت القفل.'],
  'SESS-POOL-OWNER': ['STRUCTURAL', 'session.SessionRegistration', 'لا "مسبح" منفصل؛ البديل: NEW-SESS-MODE-OFFERED (تسجيل InPerson في جلسة Online يُرفض بالمشغّل).'],
  'SESS-POOL-SHRINK': ['REWRITE', 'session.Session', 'TR_Session_CapacityShrink.'],
  'SESS-STANDALONE-EMAIL': ['DEFER', '—', 'الجلسة المستقلة مؤجلة.'],
  // shield
  'SHIELD-THRESHOLD': ['REWRITE', 'shield.ShieldConfiguration', 'ReminderThresholdMinutes.'],
  'SHIELD-SESSION-OWNER': ['REWRITE', 'shield.ProtectionSession', 'FK (InstallationId, PersonId) فقط؛ لا ارتباط بإعداد التذكير.'],
  // task
  'TASK-RECIPIENT-MEMBER': ['REWRITE', 'task.AssignmentRecipient', 'العضوية تُقرأ من coach.GroupMembership.'],
  'TASK-REPORT-DATES': ['REWRITE', 'task.OperationalReport', 'CK Dates.'],
  'TASK-SUBMIT-RACE': ['CARRY', 'task.SubmissionAttempt', 'السجل الأصلي: errors=0,0؛ attempts=2. أكّد أن إرسالين متزامنين مقصودان (رقما محاولة مختلفان) وليس تكرارًا؛ وإلا أضف قفلًا على المستلم.'],
};

// For REWRITE defaults in m1 / institution-extensions, these IDs are cancellation/capacity rewrites.
export const prefixNotes = [
  [/^MEM-08/, 'REWRITE', 'institution.Initiative / InitiativeApplication', 'الإلغاء الدائم يحدّث صفوف الطلب الموحد: المفتوحة والمقبولة والموقوفة → Cancelled مع EndReason، والتاريخ المكتمل يبقى.'],
  [/^CAP-0/, 'REWRITE', 'institution.InitiativeApplication', 'الطلب 135 يأخذ آخر مقعد؛ 136 يُرفض أو يُصطف؛ سباق اتصالين ينتج مقعدًا واحدًا.'],
  [/^MEM-0[256]/, 'REWRITE', 'institution.InitiativeApplication', 'نهاية العضوية تحرر السعة فورًا (حالة لا تحجز مقعدًا).'],
  [/^IE-CANCEL/, 'REWRITE', 'institution.Initiative / InitiativeApplication', 'الإلغاء يغلق العروض الحية (Offered → Cancelled) على صف الطلب.'],
  [/^IE-(OFFER|APPROVE)/, 'REWRITE', 'institution.InitiativeApplication', 'Offered حالة تحجز مقعدًا على صف الطلب.'],
  [/^PART-(PROGRAM|EXPERIENCE)/, 'REWRITE', 'partnership.PartnershipLink', 'القيد نفسه على الجدول الموحد.'],
  [/(-ENV|-SCHEMA|-SUMMARY|PRESERVATION|^SUMMARY$)/, 'REGENERATE', '—', 'يُعاد توليده لقاعدة v4 الجديدة (أعداد الجداول والترحيلات تتغير).'],
];
