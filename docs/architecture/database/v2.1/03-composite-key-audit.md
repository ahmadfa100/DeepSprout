# Composite foreign-key target audit

Static audit of the proposed v2.1 dictionary. This verifies column existence, ordering, and declared target `PK`/`UQ`; it is **not** SQL Server execution.

| Child FK columns | Referenced declared target key | Result |
|---|---|---|
| `personal.IndividualProfile(LastAssessmentAttemptId,PersonId)` | `lab.AssessmentAttempt(Id,PersonId)` | PASS — declared unfiltered `UQ`/`PK` |
| `lab.AssessmentAttempt(InstrumentVersionId,InstrumentId)` | `lab.InstrumentVersion(Id,InstrumentId)` | PASS — declared unfiltered `UQ`/`PK` |
| `lab.AssessmentAttempt(WindowId,PersonId)` | `lab.AssessmentWindow(Id,PersonId)` | PASS — declared unfiltered `UQ`/`PK` |
| `recovery.ScheduledAction(PlanRevisionId,CycleId)` | `recovery.PlanRevision(Id,CycleId)` | PASS — declared unfiltered `UQ`/`PK` |
| `recovery.WeeklyReview(PlanRevisionId,CycleId)` | `recovery.PlanRevision(Id,CycleId)` | PASS — declared unfiltered `UQ`/`PK` |
| `shield.ProtectionSession(InstallationId,PersonId)` | `shield.ExtensionInstallation(Id,PersonId)` | PASS — declared unfiltered `UQ`/`PK` |
| `shield.ProtectionSession(ConfigurationId,PersonId)` | `shield.ShieldConfiguration(Id,PersonId)` | PASS — declared unfiltered `UQ`/`PK` |
| `shield.BrowserUsagePeriod(InstallationId,PersonId)` | `shield.ExtensionInstallation(Id,PersonId)` | PASS — declared unfiltered `UQ`/`PK` |
| `shield.BrowserUsagePeriod(ConfigurationId,PersonId)` | `shield.ShieldConfiguration(Id,PersonId)` | PASS — declared unfiltered `UQ`/`PK` |
| `shield.BrowserUsageDomain(UsagePeriodId,ConfigurationId)` | `shield.BrowserUsagePeriod(Id,ConfigurationId)` | PASS — declared unfiltered `UQ`/`PK` |
| `shield.BrowserUsageDomain(ConfigurationId,DomainCode)` | `shield.ShieldSelectedDomain(ConfigurationId,DomainCode)` | PASS — declared unfiltered `UQ`/`PK` |
| `institution.InitiativeDraft(BaseRevisionId,InitiativeId)` | `institution.InitiativeRevision(Id,InitiativeId)` | PASS — declared unfiltered `UQ`/`PK` |
| `institution.InitiativeDraft(PublishedRevisionId,InitiativeId)` | `institution.InitiativeRevision(Id,InitiativeId)` | PASS — declared unfiltered `UQ`/`PK` |
| `institution.InitiativeApplication(TermsRevisionId,InitiativeId)` | `institution.InitiativeRevision(Id,InitiativeId)` | PASS — declared unfiltered `UQ`/`PK` |
| `institution.InitiativeSeatOffer(ApplicationId,InitiativeId)` | `institution.InitiativeApplication(Id,InitiativeId)` | PASS — declared unfiltered `UQ`/`PK` |
| `institution.InitiativeApplicationDecision(ApplicationId,InitiativeId,TermsRevisionId)` | `institution.InitiativeApplication(Id,InitiativeId,TermsRevisionId)` | PASS — declared unfiltered `UQ`/`PK` |
| `institution.InitiativeMembership(ApplicationId,InitiativeId,PersonId)` | `institution.InitiativeApplication(Id,InitiativeId,PersonId)` | PASS — declared unfiltered `UQ`/`PK` |
| `institution.InitiativeStaffAppointment(InvitationId,InitiativeId,Role)` | `institution.InitiativeStaffInvitation(Id,InitiativeId,Role)` | PASS — declared unfiltered `UQ`/`PK` |
| `coach.InitiativeGroupPlacement(GroupId,InitiativeId)` | `coach.OperationalGroup(Id,InitiativeId)` | PASS — declared unfiltered `UQ`/`PK` |
| `coach.InitiativeGroupPlacement(MembershipId,InitiativeId)` | `institution.InitiativeMembership(Id,InitiativeId)` | PASS — declared unfiltered `UQ`/`PK` |
| `coach.ProgramGroupMembership(GroupId,ProgramId)` | `coach.OperationalGroup(Id,ProgramId)` | PASS — declared unfiltered `UQ`/`PK` |
| `coach.ProgramCompletion(ProgramRevisionId,ProgramId)` | `coach.ProgramRevision(Id,ProgramId)` | PASS — declared unfiltered `UQ`/`PK` |
| `task.AssignmentRecipient(AssignedRevisionId,AssignmentId)` | `task.AssignmentRevision(Id,AssignmentId)` | PASS — declared unfiltered `UQ`/`PK` |
| `task.SubmissionAttempt(RecipientId,AssignmentId)` | `task.AssignmentRecipient(Id,AssignmentId)` | PASS — declared unfiltered `UQ`/`PK` |
| `task.SubmissionAttempt(AssignmentRevisionId,AssignmentId)` | `task.AssignmentRevision(Id,AssignmentId)` | PASS — declared unfiltered `UQ`/`PK` |
| `task.ReviewDecision(SupersedesId,AttemptId)` | `task.ReviewDecision(Id,AttemptId)` | PASS — declared unfiltered `UQ`/`PK` |
| `session.Session(InitiativeId,InstitutionId)` | `institution.Initiative(Id,InstitutionId)` | PASS — declared unfiltered `UQ`/`PK` |
| `session.InitiativeSessionDuty(SessionId,InitiativeId)` | `session.Session(Id,InitiativeId)` | PASS — declared unfiltered `UQ`/`PK` |
| `session.InitiativeSessionDuty(AppointmentId,InitiativeId)` | `institution.InitiativeStaffAppointment(Id,InitiativeId)` | PASS — declared unfiltered `UQ`/`PK` |
| `session.SessionRegistration(PoolId,SessionId)` | `session.SessionCapacityPool(Id,SessionId)` | PASS — declared unfiltered `UQ`/`PK` |
| `session.SessionRegistration(SessionRevisionId,SessionId)` | `session.SessionRevision(Id,SessionId)` | PASS — declared unfiltered `UQ`/`PK` |
| `session.SessionAttendance(RegistrationId,SessionId,PersonId)` | `session.SessionRegistration(Id,SessionId,PersonId)` | PASS — declared unfiltered `UQ`/`PK` |
| `session.InitiativeCompletion(MembershipId,InitiativeId)` | `institution.InitiativeMembership(Id,InitiativeId)` | PASS — declared unfiltered `UQ`/`PK` |
| `session.InitiativeCompletion(RuleRevisionId,InitiativeId)` | `institution.InitiativeRevision(Id,InitiativeId)` | PASS — declared unfiltered `UQ`/`PK` |
| `provider.ExperienceBooking(RevisionId,ExperienceId)` | `provider.ExperienceRevision(Id,ExperienceId)` | PASS — declared unfiltered `UQ`/`PK` |
| `provider.SeatOffer(BookingId,ExperienceId)` | `provider.ExperienceBooking(Id,ExperienceId)` | PASS — declared unfiltered `UQ`/`PK` |
| `provider.ProviderStaffAppointment(InvitationId,ExperienceId)` | `provider.ProviderStaffInvitation(Id,ExperienceId)` | PASS — declared unfiltered `UQ`/`PK` |
| `provider.ProviderAppointmentSession(AppointmentId,ExperienceId)` | `provider.ProviderStaffAppointment(Id,ExperienceId)` | PASS — declared unfiltered `UQ`/`PK` |
| `provider.ProviderAppointmentSession(SessionId,ExperienceId)` | `provider.ExperienceSession(Id,ExperienceId)` | PASS — declared unfiltered `UQ`/`PK` |
| `provider.ProviderCohort(SupervisorAppointmentId,ExperienceId)` | `provider.ProviderStaffAppointment(Id,ExperienceId)` | PASS — declared unfiltered `UQ`/`PK` |
| `provider.ProviderCohortMember(CohortId,ExperienceId)` | `provider.ProviderCohort(Id,ExperienceId)` | PASS — declared unfiltered `UQ`/`PK` |
| `provider.ProviderCohortMember(BookingId,ExperienceId)` | `provider.ExperienceBooking(Id,ExperienceId)` | PASS — declared unfiltered `UQ`/`PK` |
| `provider.ProviderAttendance(BookingId,ExperienceId)` | `provider.ExperienceBooking(Id,ExperienceId)` | PASS — declared unfiltered `UQ`/`PK` |
| `provider.ProviderAttendance(SessionId,ExperienceId)` | `provider.ExperienceSession(Id,ExperienceId)` | PASS — declared unfiltered `UQ`/`PK` |
| `provider.CampCompletion(BookingId,ExperienceId)` | `provider.ExperienceBooking(Id,ExperienceId)` | PASS — declared unfiltered `UQ`/`PK` |
| `provider.CampCompletion(RuleRevisionId,ExperienceId)` | `provider.ExperienceRevision(Id,ExperienceId)` | PASS — declared unfiltered `UQ`/`PK` |
| `forms.FormAnswerChoice(AnswerId,QuestionId)` | `forms.FormAnswer(Id,QuestionId)` | PASS — declared unfiltered `UQ`/`PK` |
| `forms.FormAnswerChoice(OptionId,QuestionId)` | `forms.FormQuestionOption(Id,QuestionId)` | PASS — declared unfiltered `UQ`/`PK` |
| `forms.FormAnswer(ResponseId,FormVersionId)` | `forms.FormResponse(Id,FormVersionId)` | PASS — declared unfiltered `UQ`/`PK` |
| `forms.FormAnswer(QuestionId,FormVersionId)` | `forms.FormQuestion(Id,FormVersionId)` | PASS — declared unfiltered `UQ`/`PK` |
| `forms.CompetitionJudgment(EntryId,CompetitionId)` | `forms.CompetitionEntry(Id,CompetitionId)` | PASS — declared unfiltered `UQ`/`PK` |
| `forms.CompetitionCriterionScore(JudgmentId,CompetitionId,RubricVersion)` | `forms.CompetitionJudgment(Id,CompetitionId,RubricVersion)` | PASS — declared unfiltered `UQ`/`PK` |
| `forms.CompetitionCriterionScore(CriterionId,CompetitionId,RubricVersion)` | `forms.CompetitionCriterion(Id,CompetitionId,RubricVersion)` | PASS — declared unfiltered `UQ`/`PK` |
| `activity.PracticeAttempt(EvidenceEventId,PersonId)` | `evidence.EvidenceEvent(Id,SubjectPersonId)` | PASS — declared unfiltered `UQ`/`PK` |
| `evidence.EvidenceEvent(InvalidatesEventId,SubjectPersonId)` | `evidence.EvidenceEvent(Id,SubjectPersonId)` | PASS — declared unfiltered `UQ`/`PK` |
| `evidence.PersonalRewardEntry(EvidenceEventId,PersonId)` | `evidence.EvidenceEvent(Id,SubjectPersonId)` | PASS — declared unfiltered `UQ`/`PK` |
| `evidence.PersonalRewardEntry(ReversesEntryId,PersonId)` | `evidence.PersonalRewardEntry(Id,PersonId)` | PASS — declared unfiltered `UQ`/`PK` |
| `evidence.GroupRewardEntry(ReversesEntryId,GroupGardenId)` | `evidence.GroupRewardEntry(Id,GroupGardenId)` | PASS — declared unfiltered `UQ`/`PK` |
| `evidence.GroupGarden(IndependentGroupId,ProgramId)` | `coach.OperationalGroup(Id,ProgramId)` | PASS — declared unfiltered `UQ`/`PK` |

Total: **59** composite references; **0** missing target keys in the proposed dictionary.
