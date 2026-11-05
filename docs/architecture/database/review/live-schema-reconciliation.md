# Live schema reconciliation / مطابقة المخطط الفعلي

Captured UTC: 2026-11-03T04:40:06.0192519Z

Server: `DESKTOP-A4AL2KR`; database: `DeepSprout_Validation`; SQL Server version: `17.0.1000.7`.

Catalog: 131 physical tables including `dbo.__EFMigrationsHistory` and `dbo.sysdiagrams`; 129 product tables; 1263 columns including administrative tables; 261 foreign keys; 70 composite foreign keys; 185 CHECK constraints; 23 applied migrations.

## EF ModelSnapshot

Mapped tables: 129. Missing in snapshot: none. Snapshot-only: none. Tables with column-name differences: 0.


## v2.1 dictionary

Rows: 129. Live-only: none. Dictionary-only: none.

The dictionary is a design-era source. All detailed columns and constraints in the guide come from the live SQL catalog, not from its shorthand rows.

## Migrations and regression evidence

Migration source files: 23 expected pairs; applied IDs: 23.

The archived phase-b final regression summary totals 330 PASS / 0 FAIL across 17 suites. This review did not rerun write-capable suites.

## Claude v3 comparison source

All 129 rows in Claude's C-design matrix were mapped by schema-qualified name. Its 48 MERGE, 1 REMOVE, and 9 DEFER-policy proposals are reviewed in the generated decision matrix. Its audit explicitly lacked access to the current Server source and SQL Server. The MasterDB reference PDF remains absent from the supplied attachments, so only the requested Arabic/English presentation direction was available.

## Exact metadata checks

Snapshot properties: 1256; live product columns: 1256; missing/extra columns: 0/0; data type, nullability and default differences: 0; CHECK-name differences: 0; index signature differences: 0.

The live catalog's 129 product tables have the same table and column names, column types, nullability, explicit defaults, CHECK names, and EF index column/uniqueness/filter signatures as the EF ModelSnapshot. FK/CHECK trust flags are zero. The live 23 applied migration IDs match the 23 source migration IDs exactly.

**Key discrepancy:** the ModelSnapshot declares 133 PK/UQ constraints while live SQL has 178. The 45 extra live constraints are all alternate UNIQUE keys; no key appears in the snapshot without a live counterpart. They are present in the migration DDL but absent from ModelSnapshot key metadata:

- `activity.OfflineRoutine(Id, PersonId)` (UQ).
- `activity.PracticeAttempt(Id, PersonId)` (UQ).
- `coach.ProgramRevision(Id, ProgramId)` (UQ).
- `community.JointGoalMember(GoalId, PersonId)` (UQ).
- `evidence.EvidenceEvent(Id, SubjectPersonId)` (UQ).
- `evidence.GroupRewardEntry(Id, GroupGardenId)` (UQ).
- `evidence.PersonalRewardEntry(Id, PersonId)` (UQ).
- `forms.CompetitionCriterion(Id, CompetitionId, RubricVersion)` (UQ).
- `forms.CompetitionEntry(Id, CompetitionId)` (UQ).
- `forms.CompetitionJudgment(Id, CompetitionId, RubricVersion)` (UQ).
- `forms.FormAnswer(Id, QuestionId)` (UQ).
- `forms.FormQuestion(Id, FormVersionId)` (UQ).
- `forms.FormQuestionOption(Id, QuestionId)` (UQ).
- `forms.FormResponse(Id, FormVersionId)` (UQ).
- `institution.Initiative(Id, InstitutionId)` (UQ).
- `institution.InitiativeApplication(Id, InitiativeId)` (UQ).
- `institution.InitiativeApplication(Id, InitiativeId, PersonId)` (UQ).
- `institution.InitiativeApplication(Id, InitiativeId, TermsRevisionId)` (UQ).
- `institution.InitiativeMembership(Id, InitiativeId)` (UQ).
- `institution.InitiativeRevision(Id, InitiativeId)` (UQ).
- `institution.InitiativeStaffAppointment(Id, InitiativeId)` (UQ).
- `institution.InitiativeStaffInvitation(Id, InitiativeId, Role)` (UQ).
- `lab.AssessmentAttempt(Id, PersonId)` (UQ).
- `lab.AssessmentWindow(Id, PersonId)` (UQ).
- `lab.InstrumentVersion(Id, InstrumentId)` (UQ).
- `provider.ExperienceBooking(Id, ExperienceId)` (UQ).
- `provider.ExperienceRevision(Id, ExperienceId)` (UQ).
- `provider.ExperienceSession(Id, ExperienceId)` (UQ).
- `provider.ProviderCohort(Id, ExperienceId)` (UQ).
- `provider.ProviderStaffAppointment(Id, ExperienceId)` (UQ).
- `provider.ProviderStaffInvitation(Id, ExperienceId)` (UQ).
- `recovery.PlanRevision(Id, CycleId)` (UQ).
- `recovery.RecoveryCycle(Id, PersonId)` (UQ).
- `recovery.RecoveryJourney(Id, PersonId)` (UQ).
- `recovery.ScheduledAction(Id, PersonId)` (UQ).
- `session.SessionCapacityPool(Id, SessionId)` (UQ).
- `session.SessionRegistration(Id, SessionId, PersonId)` (UQ).
- `session.SessionRevision(Id, SessionId)` (UQ).
- `shield.BrowserUsagePeriod(Id, ConfigurationId)` (UQ).
- `shield.ExtensionInstallation(Id, PersonId)` (UQ).
- `shield.ShieldConfiguration(Id, PersonId)` (UQ).
- `shield.ShieldSelectedDomain(ConfigurationId, DomainCode)` (UQ).
- `task.AssignmentRecipient(Id, AssignmentId)` (UQ).
- `task.AssignmentRevision(Id, AssignmentId)` (UQ).
- `task.ReviewDecision(Id, AttemptId)` (UQ).

**FK discrepancy:** the ModelSnapshot declares 257 FK relationships while live SQL has 261. The following four composite FKs exist in SQL but not in ModelSnapshot relationship metadata; the reverse difference is zero:

- `coach.InitiativeGroupPlacement(GroupId, InitiativeId)` → `coach.OperationalGroup(Id, InitiativeId)`.
- `coach.ProgramGroupMembership(GroupId, ProgramId)` → `coach.OperationalGroup(Id, ProgramId)`.
- `evidence.GroupGarden(IndependentGroupId, ProgramId)` → `coach.OperationalGroup(Id, ProgramId)`.
- `session.InitiativeSessionDuty(SessionId, InitiativeId)` → `session.Session(Id, InitiativeId)`.

Three are installed through raw `migrationBuilder.Sql` in `CoachParticipation` and `SessionOperations`; the `GroupGarden` FK comes from the embedded `EvidenceGuards.sql` batch invoked by `EvidenceLedger`. The live schema and generated diagrams include them. EF model-only checks cannot detect drift of these raw SQL constraints.

The archived broad integrity query reported `TargetTables=129` and `UniqueIndexes=480`. Repeating that same read-only query now returns `130` and `482`; `dbo.sysdiagrams` was created on 2 November 2026 at 16:49 UTC and contributes one table and two unique indexes. The product schema remains 129 tables. The broad index query also includes objects beyond product tables, so it should not be called 480 product unique indexes.

Claude's audit said `Removed/Completed` could not release capacity and `Rejected` could not reapply. The live `CK_InitiativeMembership_EndRelease` requires a release timestamp in both terminal states, and the implemented `institution.SubmitApplication` permits a new attempt after Rejected when no membership/open/blocked application exists. The former missing-field concern was also resolved by the applied migrations (`explicit_absent=0` in the phase-b field verification). These are exact source-era discrepancies, not reasons to alter the database in this review.
