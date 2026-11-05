# DeepSprout v4 — مخططات العلاقات (ERD)

> **ملف مُولَّد** من `model/*.mjs` بواسطة `node generate.mjs`. لا تحرره يدويًا؛ عدّل النموذج ثم أعد التوليد.

المخططات مولَّدة من المفاتيح الأجنبية المعرفة في النموذج نفسه، فلا توجد علاقة مرسومة غير موجودة في القاموس. تُعرض بـMermaid (GitHub وVS Code وأغلب عارضات Markdown).

**قراءة الرموز:** `||--o{` أب إلزامي وأبناء كثيرون؛ `|o--o{` الأب اختياري (FK يقبل NULL)؛ `--o|` علاقة واحد لواحد على الأكثر. الأعمدة المعروضة هي المفاتيح والحالة والنوع؛ الأعمدة الكاملة في [02-data-dictionary-ar.md](02-data-dictionary-ar.md). لتخفيف الزحام، روابط `iam.Person` لأعمدة الفاعل (`…ByPersonId`، المراجع، المقيِّم…) لا تُرسم في مخططات الوحدات؛ كلها مفاتيح حقيقية في القاموس.

## 1. الخريطة العامة للوحدات

كل عقدة وحدة (schema) بعدد جداولها، وكل سهم = مفاتيح أجنبية من الوحدة إلى الوحدة الهدف (بالعدد). `iam` هدف لكل الوحدات تقريبًا لأن الهوية واحدة.

```mermaid
flowchart LR
  iam["iam<br/>5 جداول"]
  org["org<br/>4 جداول"]
  personal["personal<br/>1 جداول"]
  lab["lab<br/>5 جداول"]
  recovery["recovery<br/>4 جداول"]
  activity["activity<br/>6 جداول"]
  shield["shield<br/>6 جداول"]
  evidence["evidence<br/>4 جداول"]
  institution["institution<br/>4 جداول"]
  coach["coach<br/>5 جداول"]
  task["task<br/>7 جداول"]
  session["session<br/>8 جداول"]
  provider["provider<br/>6 جداول"]
  forms["forms<br/>9 جداول"]
  community["community<br/>6 جداول"]
  partnership["partnership<br/>1 جداول"]
  governance["governance<br/>1 جداول"]
  ops["ops<br/>4 جداول"]
  files["files<br/>1 جداول"]
  activity -->|2| evidence
  activity -->|3| iam
  activity -->|1| recovery
  coach -->|6| iam
  coach -->|2| institution
  coach -->|1| org
  community -->|1| evidence
  community -->|1| files
  community -->|6| iam
  evidence -->|1| coach
  evidence -->|3| iam
  evidence -->|1| institution
  files -->|1| iam
  forms -->|1| files
  forms -->|3| iam
  forms -->|1| institution
  forms -->|1| provider
  governance -->|1| iam
  institution -->|2| forms
  institution -->|5| iam
  institution -->|1| org
  lab -->|2| iam
  ops -->|3| iam
  org -->|1| files
  org -->|9| iam
  org -->|1| institution
  org -->|1| provider
  partnership -->|1| coach
  partnership -->|3| iam
  partnership -->|1| institution
  partnership -->|1| provider
  personal -->|1| iam
  personal -->|1| lab
  provider -->|1| files
  provider -->|2| forms
  provider -->|6| iam
  provider -->|2| org
  provider -->|1| session
  recovery -->|3| activity
  recovery -->|1| iam
  session -->|2| coach
  session -->|2| evidence
  session -->|1| files
  session -->|1| forms
  session -->|11| iam
  session -->|3| institution
  session -->|3| org
  session -->|4| provider
  shield -->|2| iam
  task -->|2| activity
  task -->|3| coach
  task -->|1| evidence
  task -->|1| files
  task -->|6| iam
  task -->|1| institution
  task -->|1| provider
```

## 2. مخططات الوحدات

كل جدول في التصميم يظهر في مخطط وحدته بالضبط. الجداول الخارجية تظهر كأطراف علاقات فقط.

### 2.1 iam — الهوية والمصادقة

```mermaid
erDiagram
  iam_Person {
    bigint Id PK
    uniqueidentifier PublicId UK
    nvarchar Status
  }
  iam_PasswordCredential {
    bigint Id PK
    bigint PersonId FK, UK
    nvarchar Status
  }
  iam_OtpChallenge {
    bigint Id PK
    bigint PersonId FK
    nvarchar Purpose
    nvarchar Status
  }
  iam_ConsentRecord {
    bigint Id PK
    bigint PersonId FK
    nvarchar Decision
  }
  iam_GlobalGrant {
    bigint Id PK
    bigint PersonId FK
    bigint GrantedByPersonId FK
    bigint RevokedByPersonId FK
  }
  iam_Person ||--o| iam_PasswordCredential : "PersonId"
  iam_Person |o--o{ iam_OtpChallenge : "PersonId"
  iam_Person ||--o{ iam_ConsentRecord : "PersonId"
  iam_Person ||--o{ iam_GlobalGrant : "PersonId / GrantedByPersonId / RevokedByPersonId"
```

الجداول: `iam.Person`، `iam.PasswordCredential`، `iam.OtpChallenge`، `iam.ConsentRecord`، `iam.GlobalGrant`.

### 2.2 org — المنظمات والتحقق والطاقم

```mermaid
erDiagram
  org_Organization {
    bigint Id PK
    uniqueidentifier PublicId UK
    nvarchar Kind
    nvarchar Status
  }
  org_OrganizationMember {
    bigint Id PK
    bigint OrganizationId FK
    bigint PersonId FK
    nvarchar Status
    bigint GrantedByPersonId FK
    bigint RevokedByPersonId FK
  }
  org_VerificationCase {
    bigint Id PK
    uniqueidentifier PublicId UK
    nvarchar Kind FK
    bigint OrganizationId FK
    bigint ApplicantPersonId FK
    nvarchar Status
    bigint EvidenceFileId FK
    bigint DecidedByPersonId FK
  }
  org_StaffAppointment {
    bigint Id PK
    uniqueidentifier PublicId UK
    bigint InitiativeId FK
    bigint ExperienceId FK
    nvarchar Role
    nvarchar Status
    bigint RequestedByPersonId FK
    bigint InvitedByPersonId FK
    bigint PersonId FK
    bigint EndedByPersonId FK
  }
  iam_Person {
    bigint Id PK
  }
  files_SecureFile {
    bigint Id PK
  }
  institution_Initiative {
    bigint Id PK
  }
  provider_Experience {
    bigint Id PK
  }
  org_Organization ||--o{ org_OrganizationMember : "OrganizationId"
  iam_Person ||--o{ org_OrganizationMember : "PersonId"
  org_Organization |o--o{ org_VerificationCase : "OrganizationId,Kind"
  iam_Person ||--o{ org_VerificationCase : "ApplicantPersonId"
  files_SecureFile |o--o{ org_VerificationCase : "EvidenceFileId"
  institution_Initiative |o--o{ org_StaffAppointment : "InitiativeId"
  provider_Experience |o--o{ org_StaffAppointment : "ExperienceId"
  iam_Person |o--o{ org_StaffAppointment : "PersonId"
  org_Organization ||--o{ institution_Initiative : "InstitutionId,InstitutionKind"
  org_Organization ||--o{ provider_Experience : "ProviderId,ProviderKind"
  iam_Person |o--o{ files_SecureFile : "OwnerPersonId"
```

الجداول: `org.Organization`، `org.OrganizationMember`، `org.VerificationCase`، `org.StaffAppointment`. أطراف خارجية: `iam.Person`، `files.SecureFile`، `institution.Initiative`، `provider.Experience`.

### 2.3 personal — الملف الشخصي والرحلة

```mermaid
erDiagram
  personal_IndividualProfile {
    bigint Id PK
    bigint PersonId FK, UK
    bigint LastAssessmentAttemptId FK
  }
  iam_Person {
    bigint Id PK
  }
  lab_AssessmentAttempt {
    bigint Id PK
  }
  iam_Person ||--o| personal_IndividualProfile : "PersonId"
  lab_AssessmentAttempt |o--o| personal_IndividualProfile : "LastAssessmentAttemptId,PersonId"
  iam_Person ||--o{ lab_AssessmentAttempt : "PersonId"
```

الجداول: `personal.IndividualProfile`. أطراف خارجية: `iam.Person`، `lab.AssessmentAttempt`.

### 2.4 lab — Lab: الاختبارات

```mermaid
erDiagram
  lab_InstrumentVersion {
    bigint Id PK
    nvarchar InstrumentCode
    nvarchar Status
  }
  lab_AssessmentWindow {
    bigint Id PK
    bigint PersonId FK
    nvarchar Status
  }
  lab_AssessmentAttempt {
    bigint Id PK
    uniqueidentifier PublicId UK
    bigint PersonId FK
    bigint InstrumentVersionId FK
    nvarchar InstrumentCode FK
    nvarchar Kind
    bigint WindowId FK
    nvarchar Status
  }
  lab_AssessmentResponse {
    bigint Id PK
    bigint AttemptId FK
  }
  lab_AssessmentScore {
    bigint Id PK
    bigint AttemptId FK
  }
  iam_Person {
    bigint Id PK
  }
  iam_Person ||--o{ lab_AssessmentWindow : "PersonId"
  iam_Person ||--o{ lab_AssessmentAttempt : "PersonId"
  lab_InstrumentVersion ||--o{ lab_AssessmentAttempt : "InstrumentVersionId,InstrumentCode"
  lab_AssessmentWindow |o--o{ lab_AssessmentAttempt : "WindowId,PersonId"
  lab_AssessmentAttempt ||--o{ lab_AssessmentResponse : "AttemptId"
  lab_AssessmentAttempt ||--o{ lab_AssessmentScore : "AttemptId"
```

الجداول: `lab.InstrumentVersion`، `lab.AssessmentWindow`، `lab.AssessmentAttempt`، `lab.AssessmentResponse`، `lab.AssessmentScore`. أطراف خارجية: `iam.Person`.

### 2.5 recovery — Recovery Plan

```mermaid
erDiagram
  recovery_RecoveryCycle {
    bigint Id PK
    uniqueidentifier PublicId UK
    bigint PersonId FK
    nvarchar Kind
    nvarchar Status
  }
  recovery_PlanRevision {
    bigint Id PK
    bigint CycleId FK
    nvarchar Status
  }
  recovery_ScheduledAction {
    bigint Id PK
    bigint CycleId FK
    bigint PersonId FK
    bigint PlanRevisionId FK
    nvarchar ActionKind
    bigint PracticeVersionId FK
    bigint RoutineId FK
    nvarchar Status
    bigint CompletedAttemptId FK
    bigint RescheduledToActionId FK
  }
  recovery_WeeklyReview {
    bigint Id PK
    bigint CycleId FK
    bigint PlanRevisionId FK
    bigint ResultingRevisionId FK
  }
  iam_Person {
    bigint Id PK
  }
  activity_PracticeVersion {
    bigint Id PK
  }
  activity_OfflineRoutine {
    bigint Id PK
  }
  activity_PracticeAttempt {
    bigint Id PK
  }
  iam_Person ||--o{ recovery_RecoveryCycle : "PersonId"
  recovery_RecoveryCycle ||--o{ recovery_PlanRevision : "CycleId"
  recovery_RecoveryCycle ||--o{ recovery_ScheduledAction : "CycleId,PersonId"
  recovery_PlanRevision ||--o{ recovery_ScheduledAction : "PlanRevisionId,CycleId"
  activity_PracticeVersion |o--o{ recovery_ScheduledAction : "PracticeVersionId"
  activity_OfflineRoutine |o--o{ recovery_ScheduledAction : "RoutineId,PersonId"
  activity_PracticeAttempt |o--o{ recovery_ScheduledAction : "CompletedAttemptId,PersonId"
  recovery_ScheduledAction |o--o{ recovery_ScheduledAction : "RescheduledToActionId,PersonId"
  recovery_RecoveryCycle ||--o{ recovery_WeeklyReview : "CycleId"
  recovery_PlanRevision ||--o{ recovery_WeeklyReview : "PlanRevisionId,CycleId / ResultingRevisionId,CycleId"
  iam_Person ||--o{ activity_PracticeAttempt : "PersonId"
  activity_PracticeVersion ||--o{ activity_PracticeAttempt : "PracticeVersionId"
  recovery_ScheduledAction |o--o{ activity_PracticeAttempt : "ScheduledActionId,PersonId"
  iam_Person ||--o{ activity_OfflineRoutine : "PersonId"
```

الجداول: `recovery.RecoveryCycle`، `recovery.PlanRevision`، `recovery.ScheduledAction`، `recovery.WeeklyReview`. أطراف خارجية: `iam.Person`، `activity.PracticeVersion`، `activity.OfflineRoutine`، `activity.PracticeAttempt`.

### 2.6 activity — Activities والروتين

```mermaid
erDiagram
  activity_PracticeDefinition {
    bigint Id PK
    nvarchar PracticeType
    nvarchar Status
  }
  activity_PracticeVersion {
    bigint Id PK
    bigint DefinitionId FK
  }
  activity_PracticeAttempt {
    bigint Id PK
    uniqueidentifier PublicId UK
    bigint PersonId FK
    bigint PracticeVersionId FK
    bigint ScheduledActionId FK
    nvarchar Status
    bigint EvidenceEventId FK
  }
  activity_PracticeProgressionDecision {
    bigint Id PK
    bigint PersonId FK
    nvarchar PracticeType
    bigint BasisAttemptId FK
  }
  activity_OfflineRoutine {
    bigint Id PK
    bigint PersonId FK
    nvarchar Status
  }
  activity_RoutineCheckIn {
    bigint Id PK
    bigint RoutineId FK
    bigint PersonId FK
    bigint EvidenceEventId FK
  }
  iam_Person {
    bigint Id PK
  }
  recovery_ScheduledAction {
    bigint Id PK
  }
  evidence_EvidenceEvent {
    bigint Id PK
  }
  activity_PracticeVersion |o--o{ recovery_ScheduledAction : "PracticeVersionId"
  activity_OfflineRoutine |o--o{ recovery_ScheduledAction : "RoutineId,PersonId"
  activity_PracticeAttempt |o--o{ recovery_ScheduledAction : "CompletedAttemptId,PersonId"
  recovery_ScheduledAction |o--o{ recovery_ScheduledAction : "RescheduledToActionId,PersonId"
  activity_PracticeDefinition ||--o{ activity_PracticeVersion : "DefinitionId"
  iam_Person ||--o{ activity_PracticeAttempt : "PersonId"
  activity_PracticeVersion ||--o{ activity_PracticeAttempt : "PracticeVersionId"
  recovery_ScheduledAction |o--o{ activity_PracticeAttempt : "ScheduledActionId,PersonId"
  evidence_EvidenceEvent |o--o{ activity_PracticeAttempt : "EvidenceEventId,PersonId"
  iam_Person ||--o{ activity_PracticeProgressionDecision : "PersonId"
  activity_PracticeAttempt |o--o{ activity_PracticeProgressionDecision : "BasisAttemptId,PersonId"
  iam_Person ||--o{ activity_OfflineRoutine : "PersonId"
  activity_OfflineRoutine ||--o{ activity_RoutineCheckIn : "RoutineId,PersonId"
  evidence_EvidenceEvent |o--o{ activity_RoutineCheckIn : "EvidenceEventId,PersonId"
  iam_Person ||--o{ evidence_EvidenceEvent : "SubjectPersonId"
  evidence_EvidenceEvent |o--o{ evidence_EvidenceEvent : "InvalidatesEventId,SubjectPersonId"
```

الجداول: `activity.PracticeDefinition`، `activity.PracticeVersion`، `activity.PracticeAttempt`، `activity.PracticeProgressionDecision`، `activity.OfflineRoutine`، `activity.RoutineCheckIn`. أطراف خارجية: `iam.Person`، `recovery.ScheduledAction`، `evidence.EvidenceEvent`.

### 2.7 shield — Digital Shield

```mermaid
erDiagram
  shield_ExtensionInstallation {
    bigint Id PK
    bigint PersonId FK
    nvarchar Status
  }
  shield_ShieldConfiguration {
    bigint Id PK
    bigint PersonId FK
  }
  shield_ShieldSelectedDomain {
    bigint Id PK
    bigint ConfigurationId FK
  }
  shield_ProtectionSession {
    bigint Id PK
    uniqueidentifier PublicId UK
    bigint PersonId FK
    bigint InstallationId FK
    nvarchar Status
  }
  shield_BrowserUsagePeriod {
    bigint Id PK
    bigint PersonId FK
    bigint InstallationId FK
    bigint ConfigurationId FK
  }
  shield_BrowserUsageDomain {
    bigint Id PK
    bigint UsagePeriodId FK
    bigint ConfigurationId FK
    nvarchar DomainCode FK
  }
  iam_Person {
    bigint Id PK
  }
  iam_Person ||--o{ shield_ExtensionInstallation : "PersonId"
  iam_Person ||--o{ shield_ShieldConfiguration : "PersonId"
  shield_ShieldConfiguration ||--o{ shield_ShieldSelectedDomain : "ConfigurationId"
  shield_ExtensionInstallation ||--o{ shield_ProtectionSession : "InstallationId,PersonId"
  shield_ExtensionInstallation ||--o{ shield_BrowserUsagePeriod : "InstallationId,PersonId"
  shield_ShieldConfiguration ||--o{ shield_BrowserUsagePeriod : "ConfigurationId,PersonId"
  shield_BrowserUsagePeriod ||--o{ shield_BrowserUsageDomain : "UsagePeriodId,ConfigurationId"
  shield_ShieldSelectedDomain ||--o{ shield_BrowserUsageDomain : "ConfigurationId,DomainCode"
```

الجداول: `shield.ExtensionInstallation`، `shield.ShieldConfiguration`، `shield.ShieldSelectedDomain`، `shield.ProtectionSession`، `shield.BrowserUsagePeriod`، `shield.BrowserUsageDomain`. أطراف خارجية: `iam.Person`.

### 2.8 evidence — الأدلة والحدائق

```mermaid
erDiagram
  evidence_EvidenceEvent {
    bigint Id PK
    bigint SubjectPersonId FK
    nvarchar Kind
    bigint InvalidatesEventId FK
    bigint RecordedByPersonId FK
  }
  evidence_RewardPolicyVersion {
    bigint Id PK
    bigint PublishedByPersonId FK
  }
  evidence_PersonalRewardEntry {
    bigint Id PK
    bigint EvidenceEventId FK
    bigint PersonId FK
    bigint PolicyVersionId FK
    nvarchar EffectCode
    nvarchar PracticeType
    nvarchar EntryKind
    bigint ReversesEntryId FK
  }
  evidence_GroupRewardEntry {
    bigint Id PK
    bigint EvidenceEventId FK
    bigint ContributorPersonId FK
    bigint InitiativeId FK
    bigint GroupId FK
    bigint ProgramId FK
    bigint PolicyVersionId FK
    nvarchar EffectCode
    nvarchar EntryKind
    bigint ReversesEntryId FK
  }
  iam_Person {
    bigint Id PK
  }
  institution_Initiative {
    bigint Id PK
  }
  coach_OperationalGroup {
    bigint Id PK
  }
  iam_Person ||--o{ evidence_EvidenceEvent : "SubjectPersonId"
  evidence_EvidenceEvent |o--o{ evidence_EvidenceEvent : "InvalidatesEventId,SubjectPersonId"
  evidence_EvidenceEvent ||--o{ evidence_PersonalRewardEntry : "EvidenceEventId,PersonId"
  evidence_RewardPolicyVersion ||--o{ evidence_PersonalRewardEntry : "PolicyVersionId"
  evidence_PersonalRewardEntry |o--o{ evidence_PersonalRewardEntry : "ReversesEntryId,PersonId"
  evidence_EvidenceEvent ||--o{ evidence_GroupRewardEntry : "EvidenceEventId,ContributorPersonId"
  institution_Initiative |o--o{ evidence_GroupRewardEntry : "InitiativeId"
  coach_OperationalGroup |o--o{ evidence_GroupRewardEntry : "GroupId,ProgramId"
  evidence_RewardPolicyVersion ||--o{ evidence_GroupRewardEntry : "PolicyVersionId"
  evidence_GroupRewardEntry |o--o{ evidence_GroupRewardEntry : "ReversesEntryId,InitiativeId / ReversesEntryId,GroupId"
  institution_Initiative |o--o{ coach_OperationalGroup : "InitiativeId"
```

الجداول: `evidence.EvidenceEvent`، `evidence.RewardPolicyVersion`، `evidence.PersonalRewardEntry`، `evidence.GroupRewardEntry`. أطراف خارجية: `iam.Person`، `institution.Initiative`، `coach.OperationalGroup`.

### 2.9 institution — مبادرات المؤسسة

```mermaid
erDiagram
  institution_Initiative {
    bigint Id PK, FK
    uniqueidentifier PublicId UK
    bigint InstitutionId FK
    nvarchar InstitutionKind FK
    nvarchar Status
    bigint CurrentRevisionId FK
    bigint DraftBaseRevisionId FK
    bigint DraftUpdatedByPersonId FK
    bigint CancelledByPersonId FK
  }
  institution_InitiativeRevision {
    bigint Id PK
    bigint InitiativeId FK
    bigint RegistrationFormVersionId FK
    bigint PublishedByPersonId FK
  }
  institution_InitiativeApplication {
    bigint Id PK
    uniqueidentifier PublicId UK
    bigint InitiativeId FK
    bigint PersonId FK
    bigint TermsRevisionId FK
    bigint RegistrationResponseId FK
    nvarchar Status
  }
  institution_InitiativeApplicationDecision {
    bigint Id PK
    bigint ApplicationId FK
    bigint InitiativeId FK
    nvarchar Action
    bigint ActorPersonId FK
    bigint TermsRevisionId FK
  }
  org_Organization {
    bigint Id PK
  }
  forms_FormVersion {
    bigint Id PK
  }
  iam_Person {
    bigint Id PK
  }
  forms_FormResponse {
    bigint Id PK
  }
  org_Organization ||--o{ institution_Initiative : "InstitutionId,InstitutionKind"
  institution_InitiativeRevision |o--o{ institution_Initiative : "CurrentRevisionId,Id / DraftBaseRevisionId,Id"
  institution_Initiative ||--o{ institution_InitiativeRevision : "InitiativeId"
  forms_FormVersion |o--o{ institution_InitiativeRevision : "RegistrationFormVersionId"
  institution_Initiative ||--o{ institution_InitiativeApplication : "InitiativeId"
  iam_Person ||--o{ institution_InitiativeApplication : "PersonId"
  institution_InitiativeRevision ||--o{ institution_InitiativeApplication : "TermsRevisionId,InitiativeId"
  forms_FormResponse |o--o{ institution_InitiativeApplication : "RegistrationResponseId,PersonId"
  institution_InitiativeApplication ||--o{ institution_InitiativeApplicationDecision : "ApplicationId,InitiativeId"
  institution_InitiativeRevision ||--o{ institution_InitiativeApplicationDecision : "TermsRevisionId,InitiativeId"
  forms_FormVersion ||--o{ forms_FormResponse : "FormVersionId"
  iam_Person ||--o{ forms_FormResponse : "PersonId"
```

الجداول: `institution.Initiative`، `institution.InitiativeRevision`، `institution.InitiativeApplication`، `institution.InitiativeApplicationDecision`. أطراف خارجية: `org.Organization`، `forms.FormVersion`، `iam.Person`، `forms.FormResponse`.

### 2.10 coach — برامج المدربين والمجموعات

```mermaid
erDiagram
  coach_CoachProgram {
    bigint Id PK, FK
    uniqueidentifier PublicId UK
    bigint OwnerPersonId FK
    nvarchar Status
    bigint CurrentRevisionId FK
  }
  coach_ProgramRevision {
    bigint Id PK
    bigint ProgramId FK
  }
  coach_OperationalGroup {
    bigint Id PK
    uniqueidentifier PublicId UK
    bigint InitiativeId FK
    bigint ProgramId FK
    nvarchar Status
  }
  coach_GroupMembership {
    bigint Id PK
    bigint GroupId FK
    bigint InitiativeId FK
    bigint ProgramId FK
    bigint ApplicationId FK
    bigint PersonId FK
    nvarchar Status
    bigint InvitedByPersonId FK
    bigint ChangedByPersonId FK
  }
  coach_GroupCoachAssignment {
    bigint Id PK
    bigint GroupId FK
    bigint InitiativeId FK
    bigint CoachPersonId FK
    bigint StaffAppointmentId FK
    bigint AssignedByPersonId FK
  }
  iam_Person {
    bigint Id PK
  }
  institution_Initiative {
    bigint Id PK
  }
  institution_InitiativeApplication {
    bigint Id PK
  }
  org_StaffAppointment {
    bigint Id PK
  }
  institution_Initiative |o--o{ org_StaffAppointment : "InitiativeId"
  iam_Person |o--o{ org_StaffAppointment : "PersonId"
  institution_Initiative ||--o{ institution_InitiativeApplication : "InitiativeId"
  iam_Person ||--o{ institution_InitiativeApplication : "PersonId"
  iam_Person ||--o{ coach_CoachProgram : "OwnerPersonId"
  coach_ProgramRevision |o--o{ coach_CoachProgram : "CurrentRevisionId,Id"
  coach_CoachProgram ||--o{ coach_ProgramRevision : "ProgramId"
  institution_Initiative |o--o{ coach_OperationalGroup : "InitiativeId"
  coach_CoachProgram |o--o{ coach_OperationalGroup : "ProgramId"
  coach_OperationalGroup ||--o{ coach_GroupMembership : "GroupId / GroupId,InitiativeId / GroupId,ProgramId"
  institution_InitiativeApplication |o--o{ coach_GroupMembership : "ApplicationId,InitiativeId,PersonId"
  iam_Person |o--o{ coach_GroupMembership : "PersonId"
  coach_OperationalGroup ||--o{ coach_GroupCoachAssignment : "GroupId / GroupId,InitiativeId"
  org_StaffAppointment |o--o{ coach_GroupCoachAssignment : "StaffAppointmentId,InitiativeId"
  iam_Person ||--o{ coach_GroupCoachAssignment : "CoachPersonId"
```

الجداول: `coach.CoachProgram`، `coach.ProgramRevision`، `coach.OperationalGroup`، `coach.GroupMembership`، `coach.GroupCoachAssignment`. أطراف خارجية: `iam.Person`، `institution.Initiative`، `institution.InitiativeApplication`، `org.StaffAppointment`.

### 2.11 task — محرك المهام والتقارير

```mermaid
erDiagram
  task_Assignment {
    bigint Id PK, FK
    uniqueidentifier PublicId UK
    bigint GroupId FK
    bigint AuthorPersonId FK
    nvarchar Status
    bigint CurrentRevisionId FK
  }
  task_AssignmentRevision {
    bigint Id PK
    bigint AssignmentId FK
    bigint PracticeVersionId FK
  }
  task_AssignmentRecipient {
    bigint Id PK
    bigint AssignmentId FK
    bigint PersonId FK
    bigint AssignedRevisionId FK
    nvarchar Status
  }
  task_SubmissionAttempt {
    bigint Id PK
    bigint RecipientId FK
    bigint AssignmentId FK
    bigint PersonId FK
    bigint AssignmentRevisionId FK
    bigint FileId FK
    bigint PracticeAttemptId FK
  }
  task_ReviewDecision {
    bigint Id PK
    bigint AttemptId FK
    bigint SupersedesId FK
    bigint ReviewerPersonId FK
    nvarchar Decision
    bigint EvidenceEventId FK
  }
  task_ReviewPrivateNote {
    bigint Id PK
    bigint DecisionId FK
    bigint AuthorPersonId FK
  }
  task_OperationalReport {
    bigint Id PK
    uniqueidentifier PublicId UK
    nvarchar Kind
    bigint GroupId FK
    bigint InitiativeId FK
    bigint ExperienceId FK
    bigint AuthorPersonId FK
    nvarchar Status
    bigint IncludedInReportId FK
    bigint ReviewedByPersonId FK
  }
  coach_OperationalGroup {
    bigint Id PK
  }
  iam_Person {
    bigint Id PK
  }
  activity_PracticeVersion {
    bigint Id PK
  }
  activity_PracticeAttempt {
    bigint Id PK
  }
  files_SecureFile {
    bigint Id PK
  }
  evidence_EvidenceEvent {
    bigint Id PK
  }
  institution_Initiative {
    bigint Id PK
  }
  provider_Experience {
    bigint Id PK
  }
  iam_Person ||--o{ activity_PracticeAttempt : "PersonId"
  activity_PracticeVersion ||--o{ activity_PracticeAttempt : "PracticeVersionId"
  evidence_EvidenceEvent |o--o{ activity_PracticeAttempt : "EvidenceEventId,PersonId"
  iam_Person ||--o{ evidence_EvidenceEvent : "SubjectPersonId"
  evidence_EvidenceEvent |o--o{ evidence_EvidenceEvent : "InvalidatesEventId,SubjectPersonId"
  institution_Initiative |o--o{ coach_OperationalGroup : "InitiativeId"
  coach_OperationalGroup ||--o{ task_Assignment : "GroupId"
  iam_Person ||--o{ task_Assignment : "AuthorPersonId"
  task_AssignmentRevision |o--o{ task_Assignment : "CurrentRevisionId,Id"
  task_Assignment ||--o{ task_AssignmentRevision : "AssignmentId"
  activity_PracticeVersion |o--o{ task_AssignmentRevision : "PracticeVersionId"
  task_Assignment ||--o{ task_AssignmentRecipient : "AssignmentId"
  iam_Person ||--o{ task_AssignmentRecipient : "PersonId"
  task_AssignmentRevision ||--o{ task_AssignmentRecipient : "AssignedRevisionId,AssignmentId"
  task_AssignmentRecipient ||--o{ task_SubmissionAttempt : "RecipientId,AssignmentId,PersonId"
  task_AssignmentRevision ||--o{ task_SubmissionAttempt : "AssignmentRevisionId,AssignmentId"
  activity_PracticeAttempt |o--o{ task_SubmissionAttempt : "PracticeAttemptId,PersonId"
  files_SecureFile |o--o{ task_SubmissionAttempt : "FileId"
  task_SubmissionAttempt ||--o{ task_ReviewDecision : "AttemptId"
  task_ReviewDecision |o--o{ task_ReviewDecision : "SupersedesId,AttemptId"
  evidence_EvidenceEvent |o--o{ task_ReviewDecision : "EvidenceEventId"
  task_ReviewDecision ||--o{ task_ReviewPrivateNote : "DecisionId"
  iam_Person ||--o{ task_ReviewPrivateNote : "AuthorPersonId"
  coach_OperationalGroup |o--o{ task_OperationalReport : "GroupId / GroupId,InitiativeId"
  institution_Initiative |o--o{ task_OperationalReport : "InitiativeId"
  provider_Experience |o--o{ task_OperationalReport : "ExperienceId"
  task_OperationalReport |o--o{ task_OperationalReport : "IncludedInReportId,InitiativeId"
  iam_Person ||--o{ task_OperationalReport : "AuthorPersonId"
  iam_Person |o--o{ files_SecureFile : "OwnerPersonId"
```

الجداول: `task.Assignment`، `task.AssignmentRevision`، `task.AssignmentRecipient`، `task.SubmissionAttempt`، `task.ReviewDecision`، `task.ReviewPrivateNote`، `task.OperationalReport`. أطراف خارجية: `coach.OperationalGroup`، `iam.Person`، `activity.PracticeVersion`، `activity.PracticeAttempt`، `files.SecureFile`، `evidence.EvidenceEvent`، `institution.Initiative`، `provider.Experience`.

### 2.12 session — الجلسات والحضور والإكمال

```mermaid
erDiagram
  session_Session {
    bigint Id PK, FK
    uniqueidentifier PublicId UK
    bigint InitiativeId FK
    bigint ExperienceId FK
    nvarchar Purpose
    nvarchar Mode
    nvarchar Status
    bigint CurrentRevisionId FK
    bigint MeetingAudiencePersonId FK
  }
  session_SessionRevision {
    bigint Id PK
    bigint SessionId FK
    bigint PublishedByPersonId FK
  }
  session_SessionDuty {
    bigint Id PK
    bigint SessionId FK
    bigint StaffAppointmentId FK
    bigint InitiativeId FK
    bigint ExperienceId FK
    nvarchar Status
    bigint AssignedByPersonId FK
  }
  session_SessionRegistration {
    bigint Id PK
    uniqueidentifier PublicId UK
    bigint SessionId FK
    bigint InitiativeId FK
    bigint PersonId FK
    nvarchar Mode
    bigint SessionRevisionId FK
    nvarchar Status
    bigint RegistrationResponseId FK
  }
  session_Attendance {
    bigint Id PK
    bigint SessionId FK
    bigint PersonId FK
    bigint RegistrationId FK
    bigint BookingId FK
    bigint ExperienceId FK
    nvarchar Status
    bigint RecordedByPersonId FK
    bigint EvidenceEventId FK
  }
  session_AttendanceCorrection {
    bigint Id PK
    bigint AttendanceId FK
    bigint CorrectedByPersonId FK
  }
  session_AbsenceExcuse {
    bigint Id PK
    uniqueidentifier PublicId UK
    bigint AttendanceId FK, UK
    bigint PersonId FK
    bigint FileId FK
    nvarchar Status
    bigint RecommendedByPersonId FK
    bigint DecidedByPersonId FK
  }
  session_Completion {
    bigint Id PK
    uniqueidentifier PublicId UK
    nvarchar Kind
    bigint PersonId FK
    bigint InitiativeId FK
    bigint ApplicationId FK
    bigint InitiativeRevisionId FK
    bigint ProgramId FK
    bigint ProgramRevisionId FK
    bigint ExperienceId FK
    bigint BookingId FK
    bigint ExperienceRevisionId FK
    nvarchar Status
    bigint EvaluatorPersonId FK
    bigint EvidenceEventId FK
  }
  institution_Initiative {
    bigint Id PK
  }
  provider_Experience {
    bigint Id PK
  }
  org_StaffAppointment {
    bigint Id PK
  }
  iam_Person {
    bigint Id PK
  }
  forms_FormResponse {
    bigint Id PK
  }
  provider_ExperienceBooking {
    bigint Id PK
  }
  evidence_EvidenceEvent {
    bigint Id PK
  }
  files_SecureFile {
    bigint Id PK
  }
  institution_InitiativeApplication {
    bigint Id PK
  }
  institution_InitiativeRevision {
    bigint Id PK
  }
  coach_CoachProgram {
    bigint Id PK
  }
  coach_ProgramRevision {
    bigint Id PK
  }
  provider_ExperienceRevision {
    bigint Id PK
  }
  institution_Initiative |o--o{ org_StaffAppointment : "InitiativeId"
  provider_Experience |o--o{ org_StaffAppointment : "ExperienceId"
  iam_Person |o--o{ org_StaffAppointment : "PersonId"
  iam_Person ||--o{ evidence_EvidenceEvent : "SubjectPersonId"
  evidence_EvidenceEvent |o--o{ evidence_EvidenceEvent : "InvalidatesEventId,SubjectPersonId"
  institution_InitiativeRevision |o--o{ institution_Initiative : "CurrentRevisionId,Id / DraftBaseRevisionId,Id"
  institution_Initiative ||--o{ institution_InitiativeRevision : "InitiativeId"
  institution_Initiative ||--o{ institution_InitiativeApplication : "InitiativeId"
  iam_Person ||--o{ institution_InitiativeApplication : "PersonId"
  institution_InitiativeRevision ||--o{ institution_InitiativeApplication : "TermsRevisionId,InitiativeId"
  forms_FormResponse |o--o{ institution_InitiativeApplication : "RegistrationResponseId,PersonId"
  iam_Person ||--o{ coach_CoachProgram : "OwnerPersonId"
  coach_ProgramRevision |o--o{ coach_CoachProgram : "CurrentRevisionId,Id"
  coach_CoachProgram ||--o{ coach_ProgramRevision : "ProgramId"
  institution_Initiative |o--o{ session_Session : "InitiativeId"
  provider_Experience |o--o{ session_Session : "ExperienceId"
  session_SessionRevision |o--o{ session_Session : "CurrentRevisionId,Id"
  session_Session ||--o{ session_SessionRevision : "SessionId"
  session_Session ||--o{ session_SessionDuty : "SessionId / SessionId,InitiativeId / SessionId,ExperienceId"
  org_StaffAppointment ||--o{ session_SessionDuty : "StaffAppointmentId / StaffAppointmentId,InitiativeId / Staff"
  session_Session ||--o{ session_SessionRegistration : "SessionId,InitiativeId"
  session_SessionRevision ||--o{ session_SessionRegistration : "SessionRevisionId,SessionId"
  iam_Person ||--o{ session_SessionRegistration : "PersonId"
  forms_FormResponse |o--o{ session_SessionRegistration : "RegistrationResponseId,PersonId"
  session_Session ||--o{ session_Attendance : "SessionId / SessionId,ExperienceId"
  iam_Person ||--o{ session_Attendance : "PersonId"
  session_SessionRegistration |o--o| session_Attendance : "RegistrationId,SessionId,PersonId"
  provider_ExperienceBooking |o--o{ session_Attendance : "BookingId,ExperienceId,PersonId"
  evidence_EvidenceEvent |o--o{ session_Attendance : "EvidenceEventId,PersonId"
  session_Attendance ||--o{ session_AttendanceCorrection : "AttendanceId"
  session_Attendance ||--o| session_AbsenceExcuse : "AttendanceId,PersonId"
  files_SecureFile |o--o{ session_AbsenceExcuse : "FileId"
  iam_Person ||--o{ session_Completion : "PersonId"
  institution_InitiativeApplication |o--o{ session_Completion : "ApplicationId,InitiativeId,PersonId"
  institution_InitiativeRevision |o--o{ session_Completion : "InitiativeRevisionId,InitiativeId"
  coach_CoachProgram |o--o{ session_Completion : "ProgramId"
  coach_ProgramRevision |o--o{ session_Completion : "ProgramRevisionId,ProgramId"
  provider_ExperienceBooking |o--o{ session_Completion : "BookingId,ExperienceId,PersonId"
  provider_ExperienceRevision |o--o{ session_Completion : "ExperienceRevisionId,ExperienceId"
  evidence_EvidenceEvent |o--o{ session_Completion : "EvidenceEventId,PersonId"
  provider_ExperienceRevision |o--o{ provider_Experience : "CurrentRevisionId,Id"
  provider_Experience ||--o{ provider_ExperienceRevision : "ExperienceId"
  provider_Experience ||--o{ provider_ExperienceBooking : "ExperienceId"
  iam_Person ||--o{ provider_ExperienceBooking : "PersonId"
  provider_ExperienceRevision ||--o{ provider_ExperienceBooking : "RevisionId,ExperienceId"
  forms_FormResponse |o--o{ provider_ExperienceBooking : "ParticipantResponseId,PersonId"
  iam_Person ||--o{ forms_FormResponse : "PersonId"
  iam_Person |o--o{ files_SecureFile : "OwnerPersonId"
```

الجداول: `session.Session`، `session.SessionRevision`، `session.SessionDuty`، `session.SessionRegistration`، `session.Attendance`، `session.AttendanceCorrection`، `session.AbsenceExcuse`، `session.Completion`. أطراف خارجية: `institution.Initiative`، `provider.Experience`، `org.StaffAppointment`، `iam.Person`، `forms.FormResponse`، `provider.ExperienceBooking`، `evidence.EvidenceEvent`، `files.SecureFile`، `institution.InitiativeApplication`، `institution.InitiativeRevision`، `coach.CoachProgram`، `coach.ProgramRevision`، `provider.ExperienceRevision`.

### 2.13 provider — تجارب المزوّد

```mermaid
erDiagram
  provider_Experience {
    bigint Id PK, FK
    uniqueidentifier PublicId UK
    bigint ProviderId FK
    nvarchar ProviderKind FK
    nvarchar Kind
    nvarchar Status
    bigint CurrentRevisionId FK
    bigint CancelledByPersonId FK
  }
  provider_ExperienceRevision {
    bigint Id PK
    bigint ExperienceId FK
    bigint ParticipantFormVersionId FK
    bigint PublishedByPersonId FK
  }
  provider_ExperienceBooking {
    bigint Id PK
    uniqueidentifier PublicId UK
    bigint ExperienceId FK
    bigint PersonId FK
    bigint RevisionId FK
    nvarchar Status
    nvarchar Mode
    bigint ParticipantResponseId FK
    bigint CancelledByPersonId FK
  }
  provider_ProviderCohort {
    bigint Id PK
    bigint ExperienceId FK
    bigint SupervisorAppointmentId FK
    nvarchar Status
  }
  provider_ProviderCohortMember {
    bigint Id PK
    bigint CohortId FK
    bigint ExperienceId FK
    bigint BookingId FK
    bigint MovedByPersonId FK
  }
  provider_ProviderIncident {
    bigint Id PK
    uniqueidentifier PublicId UK
    bigint ExperienceId FK
    bigint SessionId FK
    bigint BookingId FK
    bigint ReportedByPersonId FK
    bigint FileId FK
    nvarchar Status
  }
  org_Organization {
    bigint Id PK
  }
  forms_FormVersion {
    bigint Id PK
  }
  iam_Person {
    bigint Id PK
  }
  forms_FormResponse {
    bigint Id PK
  }
  org_StaffAppointment {
    bigint Id PK
  }
  session_Session {
    bigint Id PK
  }
  files_SecureFile {
    bigint Id PK
  }
  provider_Experience |o--o{ org_StaffAppointment : "ExperienceId"
  iam_Person |o--o{ org_StaffAppointment : "PersonId"
  provider_Experience |o--o{ session_Session : "ExperienceId"
  org_Organization ||--o{ provider_Experience : "ProviderId,ProviderKind"
  provider_ExperienceRevision |o--o{ provider_Experience : "CurrentRevisionId,Id"
  provider_Experience ||--o{ provider_ExperienceRevision : "ExperienceId"
  forms_FormVersion |o--o{ provider_ExperienceRevision : "ParticipantFormVersionId"
  provider_Experience ||--o{ provider_ExperienceBooking : "ExperienceId"
  iam_Person ||--o{ provider_ExperienceBooking : "PersonId"
  provider_ExperienceRevision ||--o{ provider_ExperienceBooking : "RevisionId,ExperienceId"
  forms_FormResponse |o--o{ provider_ExperienceBooking : "ParticipantResponseId,PersonId"
  provider_Experience ||--o{ provider_ProviderCohort : "ExperienceId"
  org_StaffAppointment ||--o{ provider_ProviderCohort : "SupervisorAppointmentId,ExperienceId"
  provider_ProviderCohort ||--o{ provider_ProviderCohortMember : "CohortId,ExperienceId"
  provider_ExperienceBooking ||--o{ provider_ProviderCohortMember : "BookingId,ExperienceId"
  provider_Experience ||--o{ provider_ProviderIncident : "ExperienceId"
  session_Session |o--o{ provider_ProviderIncident : "SessionId,ExperienceId"
  provider_ExperienceBooking |o--o{ provider_ProviderIncident : "BookingId,ExperienceId"
  files_SecureFile |o--o{ provider_ProviderIncident : "FileId"
  forms_FormVersion ||--o{ forms_FormResponse : "FormVersionId"
  iam_Person ||--o{ forms_FormResponse : "PersonId"
  iam_Person |o--o{ files_SecureFile : "OwnerPersonId"
```

الجداول: `provider.Experience`، `provider.ExperienceRevision`، `provider.ExperienceBooking`، `provider.ProviderCohort`، `provider.ProviderCohortMember`، `provider.ProviderIncident`. أطراف خارجية: `org.Organization`، `forms.FormVersion`، `iam.Person`، `forms.FormResponse`، `org.StaffAppointment`، `session.Session`، `files.SecureFile`.

### 2.14 forms — النماذج والمسابقات

```mermaid
erDiagram
  forms_Form {
    bigint Id PK, FK
    uniqueidentifier PublicId UK
    bigint InitiativeId FK
    bigint ExperienceId FK
    nvarchar Purpose
    nvarchar Status
    bigint CurrentVersionId FK
  }
  forms_FormVersion {
    bigint Id PK
    bigint FormId FK
    bigint PublishedByPersonId FK
  }
  forms_FormQuestion {
    bigint Id PK
    bigint FormVersionId FK
  }
  forms_FormQuestionOption {
    bigint Id PK
    bigint QuestionId FK
  }
  forms_FormResponse {
    bigint Id PK
    uniqueidentifier PublicId UK
    bigint FormVersionId FK
    bigint PersonId FK
    nvarchar Status
  }
  forms_FormAnswer {
    bigint Id PK
    bigint ResponseId FK
    bigint FormVersionId FK
    bigint QuestionId FK
    bigint OptionId FK
    bigint FileId FK
  }
  forms_CompetitionCriterion {
    bigint Id PK
    bigint FormVersionId FK
  }
  forms_CompetitionJudgment {
    bigint Id PK
    bigint ResponseId FK
    bigint FormVersionId FK
    bigint JudgePersonId FK
    nvarchar Decision
  }
  forms_CompetitionCriterionScore {
    bigint Id PK
    bigint JudgmentId FK
    bigint CriterionId FK
    bigint FormVersionId FK
  }
  institution_Initiative {
    bigint Id PK
  }
  provider_Experience {
    bigint Id PK
  }
  iam_Person {
    bigint Id PK
  }
  files_SecureFile {
    bigint Id PK
  }
  institution_Initiative |o--o{ forms_Form : "InitiativeId"
  provider_Experience |o--o{ forms_Form : "ExperienceId"
  forms_FormVersion |o--o{ forms_Form : "CurrentVersionId,Id"
  forms_Form ||--o{ forms_FormVersion : "FormId"
  forms_FormVersion ||--o{ forms_FormQuestion : "FormVersionId"
  forms_FormQuestion ||--o{ forms_FormQuestionOption : "QuestionId"
  forms_FormVersion ||--o{ forms_FormResponse : "FormVersionId"
  iam_Person ||--o{ forms_FormResponse : "PersonId"
  forms_FormResponse ||--o{ forms_FormAnswer : "ResponseId,FormVersionId"
  forms_FormQuestion ||--o{ forms_FormAnswer : "QuestionId,FormVersionId"
  forms_FormQuestionOption |o--o{ forms_FormAnswer : "OptionId,QuestionId"
  files_SecureFile |o--o{ forms_FormAnswer : "FileId"
  forms_FormVersion ||--o{ forms_CompetitionCriterion : "FormVersionId"
  forms_FormResponse ||--o{ forms_CompetitionJudgment : "ResponseId,FormVersionId"
  forms_CompetitionJudgment ||--o{ forms_CompetitionCriterionScore : "JudgmentId,FormVersionId"
  forms_CompetitionCriterion ||--o{ forms_CompetitionCriterionScore : "CriterionId,FormVersionId"
  iam_Person |o--o{ files_SecureFile : "OwnerPersonId"
```

الجداول: `forms.Form`، `forms.FormVersion`، `forms.FormQuestion`، `forms.FormQuestionOption`، `forms.FormResponse`، `forms.FormAnswer`، `forms.CompetitionCriterion`، `forms.CompetitionJudgment`، `forms.CompetitionCriterionScore`. أطراف خارجية: `institution.Initiative`، `provider.Experience`، `iam.Person`، `files.SecureFile`.

### 2.15 community — المجتمع

```mermaid
erDiagram
  community_Post {
    bigint Id PK
    uniqueidentifier PublicId UK
    bigint AuthorPersonId FK
    bigint ImageFileId FK
    bigint SharedEvidenceEventId FK
    nvarchar Status
  }
  community_Comment {
    bigint Id PK
    bigint PostId FK
    bigint AuthorPersonId FK
    nvarchar Status
  }
  community_Reaction {
    bigint Id PK
    bigint PostId FK
    bigint PersonId FK
  }
  community_Bookmark {
    bigint Id PK
    bigint PostId FK
    bigint PersonId FK
  }
  community_ContentReport {
    bigint Id PK
    bigint PostId FK
    bigint CommentId FK
    bigint ReporterPersonId FK
    nvarchar Status
  }
  community_ModerationDecision {
    bigint Id PK
    bigint ReportId FK
    bigint PostId FK
    bigint CommentId FK
    bigint ModeratorPersonId FK
    nvarchar Decision
  }
  iam_Person {
    bigint Id PK
  }
  files_SecureFile {
    bigint Id PK
  }
  evidence_EvidenceEvent {
    bigint Id PK
  }
  iam_Person ||--o{ evidence_EvidenceEvent : "SubjectPersonId"
  evidence_EvidenceEvent |o--o{ evidence_EvidenceEvent : "InvalidatesEventId,SubjectPersonId"
  iam_Person ||--o{ community_Post : "AuthorPersonId"
  files_SecureFile |o--o{ community_Post : "ImageFileId"
  evidence_EvidenceEvent |o--o{ community_Post : "SharedEvidenceEventId,AuthorPersonId"
  community_Post ||--o{ community_Comment : "PostId"
  iam_Person ||--o{ community_Comment : "AuthorPersonId"
  community_Post ||--o{ community_Reaction : "PostId"
  iam_Person ||--o{ community_Reaction : "PersonId"
  community_Post ||--o{ community_Bookmark : "PostId"
  iam_Person ||--o{ community_Bookmark : "PersonId"
  community_Post |o--o{ community_ContentReport : "PostId"
  community_Comment |o--o{ community_ContentReport : "CommentId"
  iam_Person ||--o{ community_ContentReport : "ReporterPersonId"
  community_ContentReport |o--o{ community_ModerationDecision : "ReportId"
  community_Post |o--o{ community_ModerationDecision : "PostId"
  community_Comment |o--o{ community_ModerationDecision : "CommentId"
  iam_Person |o--o{ files_SecureFile : "OwnerPersonId"
```

الجداول: `community.Post`، `community.Comment`، `community.Reaction`، `community.Bookmark`، `community.ContentReport`، `community.ModerationDecision`. أطراف خارجية: `iam.Person`، `files.SecureFile`، `evidence.EvidenceEvent`.

### 2.16 partnership — الشراكات

```mermaid
erDiagram
  partnership_PartnershipLink {
    bigint Id PK
    uniqueidentifier PublicId UK
    bigint InitiativeId FK
    bigint ProgramId FK
    bigint ExperienceId FK
    nvarchar Purpose
    nvarchar Status
    bigint RequestedByPersonId FK
    bigint RespondedByPersonId FK
    bigint EndedByPersonId FK
  }
  institution_Initiative {
    bigint Id PK
  }
  coach_CoachProgram {
    bigint Id PK
  }
  provider_Experience {
    bigint Id PK
  }
  institution_Initiative ||--o{ partnership_PartnershipLink : "InitiativeId"
  coach_CoachProgram |o--o{ partnership_PartnershipLink : "ProgramId"
  provider_Experience |o--o{ partnership_PartnershipLink : "ExperienceId"
```

الجداول: `partnership.PartnershipLink`. أطراف خارجية: `institution.Initiative`، `coach.CoachProgram`، `provider.Experience`.

### 2.17 governance — المحتوى المحكوم (CMS)

```mermaid
erDiagram
  governance_ContentRelease {
    bigint Id PK
    nvarchar Status
    bigint SupersedesId FK
    bigint PublishedByPersonId FK
  }
  governance_ContentRelease |o--o{ governance_ContentRelease : "SupersedesId"
```

الجداول: `governance.ContentRelease`.

### 2.18 ops — التشغيل: تدقيق، إشعارات، Outbox، Idempotency

```mermaid
erDiagram
  ops_AuditEvent {
    bigint Id PK
    bigint ActorPersonId FK
    nvarchar Action
  }
  ops_Notification {
    bigint Id PK
    uniqueidentifier PublicId UK
    bigint RecipientPersonId FK
    nvarchar Status
    bigint EmailOutboxMessageId FK
  }
  ops_OutboxMessage {
    bigint Id PK
    nvarchar Status
  }
  ops_IdempotencyRecord {
    bigint Id PK
    bigint ActorPersonId FK
    nvarchar Status
  }
  iam_Person {
    bigint Id PK
  }
  iam_Person ||--o{ ops_Notification : "RecipientPersonId"
  ops_OutboxMessage |o--o{ ops_Notification : "EmailOutboxMessageId"
```

الجداول: `ops.AuditEvent`، `ops.Notification`، `ops.OutboxMessage`، `ops.IdempotencyRecord`. أطراف خارجية: `iam.Person`.

### 2.19 files — الملفات الآمنة

```mermaid
erDiagram
  files_SecureFile {
    bigint Id PK
    uniqueidentifier PublicId UK
    bigint OwnerPersonId FK
    nvarchar Purpose
    nvarchar Status
  }
  iam_Person {
    bigint Id PK
  }
  iam_Person |o--o{ files_SecureFile : "OwnerPersonId"
```

الجداول: `files.SecureFile`. أطراف خارجية: `iam.Person`.

## 3. خرائط عابرة للوحدات

### 3.1 الهوية والتفويض: من يملك صلاحية على ماذا

كل صلاحية مورد هي صف بحالة وفترة يربط Person بمورد محدد؛ لا يوجد دور عام يمنح قراءة بيانات خاصة. مساحات العمل في الـWorkspace Switcher تُشتق من هذه الصفوف النشطة فقط.

```mermaid
erDiagram
  iam_Person {
    bigint Id PK
  }
  iam_GlobalGrant {
    bigint Id PK
  }
  org_Organization {
    bigint Id PK
  }
  org_OrganizationMember {
    bigint Id PK
  }
  org_VerificationCase {
    bigint Id PK
  }
  org_StaffAppointment {
    bigint Id PK
  }
  institution_Initiative {
    bigint Id PK
  }
  provider_Experience {
    bigint Id PK
  }
  coach_CoachProgram {
    bigint Id PK
  }
  coach_OperationalGroup {
    bigint Id PK
  }
  coach_GroupMembership {
    bigint Id PK
  }
  coach_GroupCoachAssignment {
    bigint Id PK
  }
  session_Session {
    bigint Id PK
  }
  session_SessionDuty {
    bigint Id PK
  }
  provider_ProviderCohort {
    bigint Id PK
  }
  iam_Person ||--o{ iam_GlobalGrant : "PersonId / GrantedByPersonId / RevokedByPersonId"
  org_Organization ||--o{ org_OrganizationMember : "OrganizationId"
  iam_Person ||--o{ org_OrganizationMember : "PersonId / GrantedByPersonId / RevokedByPersonId"
  org_Organization |o--o{ org_VerificationCase : "OrganizationId,Kind"
  iam_Person ||--o{ org_VerificationCase : "ApplicantPersonId / DecidedByPersonId"
  institution_Initiative |o--o{ org_StaffAppointment : "InitiativeId"
  provider_Experience |o--o{ org_StaffAppointment : "ExperienceId"
  iam_Person |o--o{ org_StaffAppointment : "PersonId / RequestedByPersonId / InvitedByPersonId / EndedBy"
  org_Organization ||--o{ institution_Initiative : "InstitutionId,InstitutionKind"
  iam_Person |o--o{ institution_Initiative : "DraftUpdatedByPersonId / CancelledByPersonId"
  iam_Person ||--o{ coach_CoachProgram : "OwnerPersonId"
  institution_Initiative |o--o{ coach_OperationalGroup : "InitiativeId"
  coach_CoachProgram |o--o{ coach_OperationalGroup : "ProgramId"
  coach_OperationalGroup ||--o{ coach_GroupMembership : "GroupId / GroupId,InitiativeId / GroupId,ProgramId"
  iam_Person |o--o{ coach_GroupMembership : "PersonId / InvitedByPersonId / ChangedByPersonId"
  coach_OperationalGroup ||--o{ coach_GroupCoachAssignment : "GroupId / GroupId,InitiativeId"
  org_StaffAppointment |o--o{ coach_GroupCoachAssignment : "StaffAppointmentId,InitiativeId"
  iam_Person ||--o{ coach_GroupCoachAssignment : "CoachPersonId / AssignedByPersonId"
  institution_Initiative |o--o{ session_Session : "InitiativeId"
  provider_Experience |o--o{ session_Session : "ExperienceId"
  iam_Person |o--o{ session_Session : "MeetingAudiencePersonId"
  session_Session ||--o{ session_SessionDuty : "SessionId / SessionId,InitiativeId / SessionId,ExperienceId"
  org_StaffAppointment ||--o{ session_SessionDuty : "StaffAppointmentId / StaffAppointmentId,InitiativeId / Staff"
  iam_Person ||--o{ session_SessionDuty : "AssignedByPersonId"
  org_Organization ||--o{ provider_Experience : "ProviderId,ProviderKind"
  iam_Person |o--o{ provider_Experience : "CancelledByPersonId"
  provider_Experience ||--o{ provider_ProviderCohort : "ExperienceId"
  org_StaffAppointment ||--o{ provider_ProviderCohort : "SupervisorAppointmentId,ExperienceId"
```

### 3.2 العضوية والمشاركة عبر المالكين

المبادرة: طلب واحد يحمل الطابور والعرض والعضوية؛ التسكين في المجموعة يشير إليه. البرنامج: عضوية المجموعة بالدعوة. المزوّد: الحجز يحمل الطابور والعرض. الجلسة: تسجيل المبادرة أو حجز المزوّد مصدر الحضور (XOR). الإكمال يشير إلى أحد الثلاثة.

```mermaid
erDiagram
  iam_Person {
    bigint Id PK
  }
  institution_Initiative {
    bigint Id PK
  }
  institution_InitiativeApplication {
    bigint Id PK
  }
  institution_InitiativeApplicationDecision {
    bigint Id PK
  }
  coach_OperationalGroup {
    bigint Id PK
  }
  coach_GroupMembership {
    bigint Id PK
  }
  coach_CoachProgram {
    bigint Id PK
  }
  provider_Experience {
    bigint Id PK
  }
  provider_ExperienceBooking {
    bigint Id PK
  }
  provider_ProviderCohortMember {
    bigint Id PK
  }
  session_Session {
    bigint Id PK
  }
  session_SessionRegistration {
    bigint Id PK
  }
  session_Attendance {
    bigint Id PK
  }
  session_AbsenceExcuse {
    bigint Id PK
  }
  session_Completion {
    bigint Id PK
  }
  institution_Initiative ||--o{ institution_InitiativeApplication : "InitiativeId"
  iam_Person ||--o{ institution_InitiativeApplication : "PersonId"
  institution_InitiativeApplication ||--o{ institution_InitiativeApplicationDecision : "ApplicationId,InitiativeId"
  iam_Person ||--o{ coach_CoachProgram : "OwnerPersonId"
  institution_Initiative |o--o{ coach_OperationalGroup : "InitiativeId"
  coach_CoachProgram |o--o{ coach_OperationalGroup : "ProgramId"
  coach_OperationalGroup ||--o{ coach_GroupMembership : "GroupId / GroupId,InitiativeId / GroupId,ProgramId"
  institution_InitiativeApplication |o--o{ coach_GroupMembership : "ApplicationId,InitiativeId,PersonId"
  iam_Person |o--o{ coach_GroupMembership : "PersonId"
  institution_Initiative |o--o{ session_Session : "InitiativeId"
  provider_Experience |o--o{ session_Session : "ExperienceId"
  session_Session ||--o{ session_SessionRegistration : "SessionId,InitiativeId"
  iam_Person ||--o{ session_SessionRegistration : "PersonId"
  session_Session ||--o{ session_Attendance : "SessionId / SessionId,ExperienceId"
  iam_Person ||--o{ session_Attendance : "PersonId"
  session_SessionRegistration |o--o| session_Attendance : "RegistrationId,SessionId,PersonId"
  provider_ExperienceBooking |o--o{ session_Attendance : "BookingId,ExperienceId,PersonId"
  session_Attendance ||--o| session_AbsenceExcuse : "AttendanceId,PersonId"
  iam_Person ||--o{ session_Completion : "PersonId"
  institution_InitiativeApplication |o--o{ session_Completion : "ApplicationId,InitiativeId,PersonId"
  coach_CoachProgram |o--o{ session_Completion : "ProgramId"
  provider_ExperienceBooking |o--o{ session_Completion : "BookingId,ExperienceId,PersonId"
  provider_Experience ||--o{ provider_ExperienceBooking : "ExperienceId"
  iam_Person ||--o{ provider_ExperienceBooking : "PersonId"
  provider_ExperienceBooking ||--o{ provider_ProviderCohortMember : "BookingId,ExperienceId"
```

### 3.3 الأدلة والمكافآت: من المصدر إلى الحديقة

خمسة مصادر فقط تنتج EvidenceEvent بمفتاح مصدر فريد؛ دفترا المكافأة يستهلكان الحدث مرة واحدة لكل أثر، والعكس يشير إلى المنح. التسجيل والعذر المقبول والنقر والمنشورات لا تنتج دليلًا (المنشور يشير إلى دليل موجود فقط للمشاركة).

```mermaid
erDiagram
  iam_Person {
    bigint Id PK
  }
  evidence_EvidenceEvent {
    bigint Id PK
  }
  activity_PracticeAttempt {
    bigint Id PK
  }
  activity_RoutineCheckIn {
    bigint Id PK
  }
  task_ReviewDecision {
    bigint Id PK
  }
  session_Attendance {
    bigint Id PK
  }
  session_Completion {
    bigint Id PK
  }
  community_Post {
    bigint Id PK
  }
  evidence_RewardPolicyVersion {
    bigint Id PK
  }
  evidence_PersonalRewardEntry {
    bigint Id PK
  }
  evidence_GroupRewardEntry {
    bigint Id PK
  }
  institution_Initiative {
    bigint Id PK
  }
  coach_OperationalGroup {
    bigint Id PK
  }
  iam_Person ||--o{ activity_PracticeAttempt : "PersonId"
  evidence_EvidenceEvent |o--o{ activity_PracticeAttempt : "EvidenceEventId,PersonId"
  evidence_EvidenceEvent |o--o{ activity_RoutineCheckIn : "EvidenceEventId,PersonId"
  iam_Person ||--o{ evidence_EvidenceEvent : "SubjectPersonId"
  evidence_EvidenceEvent |o--o{ evidence_EvidenceEvent : "InvalidatesEventId,SubjectPersonId"
  evidence_EvidenceEvent ||--o{ evidence_PersonalRewardEntry : "EvidenceEventId,PersonId"
  evidence_RewardPolicyVersion ||--o{ evidence_PersonalRewardEntry : "PolicyVersionId"
  evidence_PersonalRewardEntry |o--o{ evidence_PersonalRewardEntry : "ReversesEntryId,PersonId"
  evidence_EvidenceEvent ||--o{ evidence_GroupRewardEntry : "EvidenceEventId,ContributorPersonId"
  institution_Initiative |o--o{ evidence_GroupRewardEntry : "InitiativeId"
  coach_OperationalGroup |o--o{ evidence_GroupRewardEntry : "GroupId,ProgramId"
  evidence_RewardPolicyVersion ||--o{ evidence_GroupRewardEntry : "PolicyVersionId"
  evidence_GroupRewardEntry |o--o{ evidence_GroupRewardEntry : "ReversesEntryId,InitiativeId / ReversesEntryId,GroupId"
  institution_Initiative |o--o{ coach_OperationalGroup : "InitiativeId"
  task_ReviewDecision |o--o{ task_ReviewDecision : "SupersedesId,AttemptId"
  evidence_EvidenceEvent |o--o{ task_ReviewDecision : "EvidenceEventId"
  iam_Person ||--o{ session_Attendance : "PersonId"
  evidence_EvidenceEvent |o--o{ session_Attendance : "EvidenceEventId,PersonId"
  iam_Person ||--o{ session_Completion : "PersonId"
  evidence_EvidenceEvent |o--o{ session_Completion : "EvidenceEventId,PersonId"
  iam_Person ||--o{ community_Post : "AuthorPersonId"
  evidence_EvidenceEvent |o--o{ community_Post : "SharedEvidenceEventId,AuthorPersonId"
```

### 3.4 النسخ الثابتة ومن يثبّت عليها

كل مورد منشور له جذر قابل للتغيير ونسخ إلحاقية؛ كل فعل مشارك يثبَّت على النسخة التي تم بموجبها، فلا يُعاد كتابة شرط قُبل عليه أحد.

```mermaid
erDiagram
  institution_Initiative {
    bigint Id PK
  }
  institution_InitiativeRevision {
    bigint Id PK
  }
  institution_InitiativeApplication {
    bigint Id PK
  }
  coach_CoachProgram {
    bigint Id PK
  }
  coach_ProgramRevision {
    bigint Id PK
  }
  provider_Experience {
    bigint Id PK
  }
  provider_ExperienceRevision {
    bigint Id PK
  }
  provider_ExperienceBooking {
    bigint Id PK
  }
  session_Session {
    bigint Id PK
  }
  session_SessionRevision {
    bigint Id PK
  }
  session_SessionRegistration {
    bigint Id PK
  }
  session_Completion {
    bigint Id PK
  }
  forms_Form {
    bigint Id PK
  }
  forms_FormVersion {
    bigint Id PK
  }
  forms_FormResponse {
    bigint Id PK
  }
  task_Assignment {
    bigint Id PK
  }
  task_AssignmentRevision {
    bigint Id PK
  }
  task_SubmissionAttempt {
    bigint Id PK
  }
  activity_PracticeDefinition {
    bigint Id PK
  }
  activity_PracticeVersion {
    bigint Id PK
  }
  activity_PracticeAttempt {
    bigint Id PK
  }
  lab_InstrumentVersion {
    bigint Id PK
  }
  lab_AssessmentAttempt {
    bigint Id PK
  }
  lab_InstrumentVersion ||--o{ lab_AssessmentAttempt : "InstrumentVersionId,InstrumentCode"
  activity_PracticeDefinition ||--o{ activity_PracticeVersion : "DefinitionId"
  activity_PracticeVersion ||--o{ activity_PracticeAttempt : "PracticeVersionId"
  institution_InitiativeRevision |o--o{ institution_Initiative : "CurrentRevisionId,Id / DraftBaseRevisionId,Id"
  institution_Initiative ||--o{ institution_InitiativeRevision : "InitiativeId"
  forms_FormVersion |o--o{ institution_InitiativeRevision : "RegistrationFormVersionId"
  institution_Initiative ||--o{ institution_InitiativeApplication : "InitiativeId"
  institution_InitiativeRevision ||--o{ institution_InitiativeApplication : "TermsRevisionId,InitiativeId"
  forms_FormResponse |o--o{ institution_InitiativeApplication : "RegistrationResponseId,PersonId"
  coach_ProgramRevision |o--o{ coach_CoachProgram : "CurrentRevisionId,Id"
  coach_CoachProgram ||--o{ coach_ProgramRevision : "ProgramId"
  task_AssignmentRevision |o--o{ task_Assignment : "CurrentRevisionId,Id"
  task_Assignment ||--o{ task_AssignmentRevision : "AssignmentId"
  activity_PracticeVersion |o--o{ task_AssignmentRevision : "PracticeVersionId"
  task_AssignmentRevision ||--o{ task_SubmissionAttempt : "AssignmentRevisionId,AssignmentId"
  activity_PracticeAttempt |o--o{ task_SubmissionAttempt : "PracticeAttemptId,PersonId"
  institution_Initiative |o--o{ session_Session : "InitiativeId"
  provider_Experience |o--o{ session_Session : "ExperienceId"
  session_SessionRevision |o--o{ session_Session : "CurrentRevisionId,Id"
  session_Session ||--o{ session_SessionRevision : "SessionId"
  session_Session ||--o{ session_SessionRegistration : "SessionId,InitiativeId"
  session_SessionRevision ||--o{ session_SessionRegistration : "SessionRevisionId,SessionId"
  forms_FormResponse |o--o{ session_SessionRegistration : "RegistrationResponseId,PersonId"
  institution_InitiativeApplication |o--o{ session_Completion : "ApplicationId,InitiativeId,PersonId"
  institution_InitiativeRevision |o--o{ session_Completion : "InitiativeRevisionId,InitiativeId"
  coach_CoachProgram |o--o{ session_Completion : "ProgramId"
  coach_ProgramRevision |o--o{ session_Completion : "ProgramRevisionId,ProgramId"
  provider_ExperienceBooking |o--o{ session_Completion : "BookingId,ExperienceId,PersonId"
  provider_ExperienceRevision |o--o{ session_Completion : "ExperienceRevisionId,ExperienceId"
  provider_ExperienceRevision |o--o{ provider_Experience : "CurrentRevisionId,Id"
  provider_Experience ||--o{ provider_ExperienceRevision : "ExperienceId"
  forms_FormVersion |o--o{ provider_ExperienceRevision : "ParticipantFormVersionId"
  provider_Experience ||--o{ provider_ExperienceBooking : "ExperienceId"
  provider_ExperienceRevision ||--o{ provider_ExperienceBooking : "RevisionId,ExperienceId"
  forms_FormResponse |o--o{ provider_ExperienceBooking : "ParticipantResponseId,PersonId"
  institution_Initiative |o--o{ forms_Form : "InitiativeId"
  provider_Experience |o--o{ forms_Form : "ExperienceId"
  forms_FormVersion |o--o{ forms_Form : "CurrentVersionId,Id"
  forms_Form ||--o{ forms_FormVersion : "FormId"
  forms_FormVersion ||--o{ forms_FormResponse : "FormVersionId"
```

### 3.5 كل الإشارات إلى الهوية الموحدة `iam.Person`

| الوحدة | الأعمدة |
|---|---|
| iam | `PasswordCredential.PersonId`، `OtpChallenge.PersonId`، `ConsentRecord.PersonId`، `GlobalGrant.PersonId`، `GlobalGrant.GrantedByPersonId`، `GlobalGrant.RevokedByPersonId` |
| org | `OrganizationMember.PersonId`، `OrganizationMember.GrantedByPersonId`، `OrganizationMember.RevokedByPersonId`، `VerificationCase.ApplicantPersonId`، `VerificationCase.DecidedByPersonId`، `StaffAppointment.PersonId`، `StaffAppointment.RequestedByPersonId`، `StaffAppointment.InvitedByPersonId`، `StaffAppointment.EndedByPersonId` |
| personal | `IndividualProfile.PersonId` |
| lab | `AssessmentWindow.PersonId`، `AssessmentAttempt.PersonId` |
| recovery | `RecoveryCycle.PersonId` |
| activity | `PracticeAttempt.PersonId`، `PracticeProgressionDecision.PersonId`، `OfflineRoutine.PersonId` |
| shield | `ExtensionInstallation.PersonId`، `ShieldConfiguration.PersonId` |
| evidence | `EvidenceEvent.SubjectPersonId`، `EvidenceEvent.RecordedByPersonId`، `RewardPolicyVersion.PublishedByPersonId` |
| institution | `Initiative.DraftUpdatedByPersonId`، `Initiative.CancelledByPersonId`، `InitiativeRevision.PublishedByPersonId`، `InitiativeApplication.PersonId`، `InitiativeApplicationDecision.ActorPersonId` |
| coach | `CoachProgram.OwnerPersonId`، `GroupMembership.PersonId`، `GroupMembership.InvitedByPersonId`، `GroupMembership.ChangedByPersonId`، `GroupCoachAssignment.CoachPersonId`، `GroupCoachAssignment.AssignedByPersonId` |
| task | `Assignment.AuthorPersonId`، `AssignmentRecipient.PersonId`، `ReviewDecision.ReviewerPersonId`، `ReviewPrivateNote.AuthorPersonId`، `OperationalReport.AuthorPersonId`، `OperationalReport.ReviewedByPersonId` |
| session | `Session.MeetingAudiencePersonId`، `SessionRevision.PublishedByPersonId`، `SessionDuty.AssignedByPersonId`، `SessionRegistration.PersonId`، `Attendance.PersonId`، `Attendance.RecordedByPersonId`، `AttendanceCorrection.CorrectedByPersonId`، `AbsenceExcuse.RecommendedByPersonId`، `AbsenceExcuse.DecidedByPersonId`، `Completion.PersonId`، `Completion.EvaluatorPersonId` |
| provider | `Experience.CancelledByPersonId`، `ExperienceRevision.PublishedByPersonId`، `ExperienceBooking.PersonId`، `ExperienceBooking.CancelledByPersonId`، `ProviderCohortMember.MovedByPersonId`، `ProviderIncident.ReportedByPersonId` |
| forms | `FormVersion.PublishedByPersonId`، `FormResponse.PersonId`، `CompetitionJudgment.JudgePersonId` |
| community | `Post.AuthorPersonId`، `Comment.AuthorPersonId`، `Reaction.PersonId`، `Bookmark.PersonId`، `ContentReport.ReporterPersonId`، `ModerationDecision.ModeratorPersonId` |
| partnership | `PartnershipLink.RequestedByPersonId`، `PartnershipLink.RespondedByPersonId`، `PartnershipLink.EndedByPersonId` |
| governance | `ContentRelease.PublishedByPersonId` |
| ops | `AuditEvent.ActorPersonId`، `Notification.RecipientPersonId`، `IdempotencyRecord.ActorPersonId` |
| files | `SecureFile.OwnerPersonId` |
