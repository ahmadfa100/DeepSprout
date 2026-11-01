#!/usr/bin/env python3
"""Materialize one self-contained v2.1 target dictionary and composite-FK audit.

The preserved v2 package is source evidence, never a required implementation overlay.
"""
from __future__ import annotations

from collections import defaultdict
from pathlib import Path
import re

HERE = Path(__file__).resolve().parent
SOURCE = HERE.parent / "v2" / "03-target-dictionary.md"
ROW = re.compile(r"^\| `([a-z]+\.[A-Za-z]+)` ([MHPV])/([USROI]) \| (.*?) \| (.*?) \| (.*?) \|$")
FIELD = re.compile(r"^([A-Za-z][A-Za-z0-9]*) ([a-z]+(?:\([0-9a-z,]+\))?)([!?])(?:→(.+))?$")
PUBLIC = set("Person AssessmentAttempt RecoveryCycle PracticeAttempt Institution Initiative InitiativeApplication InitiativeSeatOffer InitiativeMembership CoachProgram OperationalGroup Assignment Session SessionRegistration AbsenceExcuse Provider Experience ExperienceBooking SeatOffer ProviderIncident Form FormResponse Competition CompetitionEntry ProgramLink ExperienceLink Post JointGoal Notification".split())

rows = {}
for line in SOURCE.read_text().splitlines():
    match = ROW.match(line)
    if not match:
        continue
    name, cls, privacy, purpose, rules, override = match.groups()
    fields = []
    for token in re.findall(r"`([^`]+)`", purpose):
        field = FIELD.match(token)
        if field:
            fields.append(list(field.groups()))
    rows[name] = dict(cls=cls, privacy=privacy, purpose=purpose.split(" `", 1)[0].rstrip(". "), fields=fields, rules=rules)
assert len(rows) == 128, len(rows)

def add(table, name, typ, nullable=False, target=None):
    assert name not in {f[0] for f in rows[table]["fields"]}, (table, name)
    rows[table]["fields"].append([name, typ, "?" if nullable else "!", target])

def nullable(table, *names):
    for field in rows[table]["fields"]:
        if field[0] in names:
            field[2] = "?"

def rule(table, value):
    rows[table]["rules"] = value

# Only final, currently proposed columns are emitted. These deltas are applied here,
# not left as prose for the implementer to reconcile.
add("personal.IndividualProfile", "OnboardingStage", "nvarchar(40)")
add("personal.IndividualProfile", "LastAssessmentAttemptId", "bigint", True, "lab.AssessmentAttempt")
add("personal.IndividualProfile", "OnboardingCompletedAtUtc", "datetime2(3)", True)
add("institution.Initiative", "WithdrawalCutoffAtUtc", "datetime2(3)", True)
nullable("institution.Initiative", "Title", "Mode", "Capacity", "TimeZoneId")
for field in [
    ("Title", "nvarchar(200)", False), ("Mode", "nvarchar(24)", False),
    ("Capacity", "smallint", False), ("TimeZoneId", "nvarchar(80)", False),
    ("StartsAtUtc", "datetime2(3)", False), ("EndsAtUtc", "datetime2(3)", False),
    ("WithdrawalCutoffAtUtc", "datetime2(3)", False),
    ("PublishedSnapshotJson", "nvarchar(max)", False),
]:
    add("institution.InitiativeRevision", *field)
add("institution.InitiativeApplication", "AttemptNo", "int")
add("institution.InitiativeMembership", "CapacityReleasedAtUtc", "datetime2(3)", True)
add("institution.InitiativeMembership", "WithdrawalCutoffAtUtc", "datetime2(3)")
add("task.AssignmentRecipient", "LastAttemptNo", "int")
add("task.SubmissionAttempt", "AssignmentId", "bigint")
add("provider.ExperienceBooking", "CapacityReleasedAtUtc", "datetime2(3)", True)
add("provider.ProviderCohortMember", "ExperienceId", "bigint")
add("forms.FormAnswerChoice", "QuestionId", "bigint")
add("forms.FormAnswer", "FormVersionId", "bigint")
add("forms.CompetitionJudgment", "CompetitionId", "bigint")
add("forms.CompetitionCriterionScore", "CompetitionId", "bigint")
add("forms.CompetitionCriterionScore", "RubricVersion", "nvarchar(64)")
add("shield.BrowserUsagePeriod", "PersonId", "bigint", False, "iam.Person")
add("shield.BrowserUsageDomain", "ConfigurationId", "bigint")

rows["institution.InitiativeDraft"] = dict(
    cls="M", privacy="O", purpose="Mutable six-stage Builder working copy, separate from immutable published terms",
    fields=[
        ["InitiativeId", "bigint", "!", "institution.Initiative"],
        ["BaseRevisionId", "bigint", "?", None],
        ["LastSavedStage", "tinyint", "!", None],
        *[[f"Stage{n}Json", "nvarchar(max)", "?", None] for n in range(1, 7)],
        ["Status", "nvarchar(24)", "!", None],
        ["UpdatedByPersonId", "bigint", "!", "iam.Person"],
        ["PublishedRevisionId", "bigint", "?", None],
    ],
    rules="UQ `(Id,InitiativeId)`; UXF `InitiativeId WHERE Status='Draft'`; CK `LastSavedStage BETWEEN 1 AND 6`; CK `Status IN ('Draft','Published','Abandoned')`; CK `Stage1Json..Stage6Json IS NULL OR ISJSON(...)=1`; CK `Status='Published'` requires `PublishedRevisionId IS NOT NULL`; immutable published revisions receive a full snapshot in the same transaction",
)

# Replace entire changed rule cells. No superseded key, FK or lifecycle survives.
for field in rows["iam.Person"]["fields"]:
    if field[0] == "Status":
        field[1] = "nvarchar(24)"
rule("iam.PersonEmail", "UXF `NormalizedEmail WHERE Status='Verified'`; UXF `PersonId WHERE IsPrimary=1 AND Status='Verified'`; CK `Status='Verified'` requires `VerifiedAtUtc IS NOT NULL`; CK `Status IN ('Pending','Verified','Retired')`; normalized email required")
rule("recovery.RecoveryJourney", "UXF `PersonId WHERE Status='Active'`; CK `Status IN ('Active','Archived')`; archived journeys remain historical")
rule("lab.AssessmentWindow", "UQ `(PersonId,WindowKey)`, `(Id,PersonId)`; CK `ClosesAtUtc>OpensAtUtc`; IX `(PersonId,OpensAtUtc)`; CK `Status IN ('Open','Closed','Used')`")
rule("lab.AssessmentAttempt", "FK `(InstrumentVersionId,InstrumentId)→lab.InstrumentVersion(Id,InstrumentId)`; FK `(WindowId,PersonId)→lab.AssessmentWindow(Id,PersonId)`; IX `(PersonId,InstrumentId,FinishedAtUtc)`; UXF `(PersonId,InstrumentId) WHERE Kind='Baseline' AND Status='Valid'`; CK `Status IN ('Started','Paused','Submitted','Valid','Invalid')`")
rule("lab.AssessmentAttempt", rows["lab.AssessmentAttempt"]["rules"] + "; UQ `(Id,PersonId)`")
rule("personal.IndividualProfile", "UQ `PersonId`; FK `(LastAssessmentAttemptId,PersonId)→lab.AssessmentAttempt(Id,PersonId)`; CK `OnboardingStage IN ('Started','Setup','Baselines','Preview','Activated','TourDone')`; one profile per Person")
rule("recovery.PlanRevision", "UQ `(CycleId,RevisionNo)`, `(Id,CycleId)`; IX `(CycleId,EffectiveFromLocalDate)`; CK `Status IN ('Draft','Accepted','Superseded')`; accepted content immutable")
rule("recovery.ScheduledAction", "FK `(PlanRevisionId,CycleId)→recovery.PlanRevision(Id,CycleId)`; IX `(CycleId,LocalDate,Status)`; CK practice FK required for practice kind; CK `Status IN ('Due','Completed','Missed','Rescheduled','Cancelled')`")
rule("recovery.WeeklyReview", "UQ `(CycleId,WeekNo)`; FK `(PlanRevisionId,CycleId)→recovery.PlanRevision(Id,CycleId)`; CK `WeekNo>0`; official review is append-only")
rule("activity.PracticeAttempt", "IX `(PersonId,StartedAtUtc)`; UXF `EvidenceEventId WHERE EvidenceEventId IS NOT NULL`; FK `(EvidenceEventId,PersonId)→evidence.EvidenceEvent(Id,SubjectPersonId)`; CK `Status IN ('Started','Paused','Submitted','Completed','Invalid')`; source validation is authoritative")
rule("shield.ExtensionInstallation", "UQ `InstallationPublicId`, `(Id,PersonId)`; IX `(PersonId,Status)`; CK `Status IN ('Connected','Disconnected','Revoked')`")
rule("shield.ShieldConfiguration", "UQ `(PersonId,VersionNo)`, `(Id,PersonId)`; CK `ThresholdMinutes IS NULL OR ThresholdMinutes>0`; published configuration immutable")
rule("shield.ProtectionSession", "FK `(InstallationId,PersonId)→shield.ExtensionInstallation(Id,PersonId)`; FK `(ConfigurationId,PersonId)→shield.ShieldConfiguration(Id,PersonId)`; IX `(PersonId,StartedAtUtc DESC)`; CK `EndsAtUtc>StartedAtUtc`; CK `Status IN ('Configured','Active','Ended','Failed','Disconnected')`")
rule("shield.BrowserUsagePeriod", "UQ `(InstallationId,SequenceNo)`, `(Id,ConfigurationId)`; FK `(InstallationId,PersonId)→shield.ExtensionInstallation(Id,PersonId)`; FK `(ConfigurationId,PersonId)→shield.ShieldConfiguration(Id,PersonId)`; IX `(InstallationId,LocalDate)`; CK `ObservedSeconds>=0 AND CoverageSeconds>=0 AND GapCount>=0`")
rule("shield.BrowserUsageDomain", "UQ `(UsagePeriodId,DomainCode)`; FK `(UsagePeriodId,ConfigurationId)→shield.BrowserUsagePeriod(Id,ConfigurationId)`; FK `(ConfigurationId,DomainCode)→shield.ShieldSelectedDomain(ConfigurationId,DomainCode)`; CK `ObservedSeconds>=0`; period total checked at ingestion under one transaction")
rule("institution.Initiative", "UQ `(Id,InstitutionId)`; IX `(InstitutionId,Status)`, `(Status,StartsAtUtc)`; CK `Status IN ('Draft','Published','Closed','Completed','Cancelled','Archived')`; CK `Capacity IS NULL OR Capacity BETWEEN 1 AND 135`; CK `EndsAtUtc IS NULL OR StartsAtUtc IS NOT NULL AND EndsAtUtc>StartsAtUtc`; CK `Status<>'Published' OR Title IS NOT NULL AND Mode IS NOT NULL AND Capacity IS NOT NULL AND TimeZoneId IS NOT NULL AND StartsAtUtc IS NOT NULL AND EndsAtUtc IS NOT NULL AND WithdrawalCutoffAtUtc IS NOT NULL`; CK `WithdrawalCutoffAtUtc IS NULL OR StartsAtUtc IS NOT NULL AND WithdrawalCutoffAtUtc<StartsAtUtc`; publication procedure requires a matching published revision")
rule("institution.InitiativeRevision", "UQ `(InitiativeId,RevisionNo)`, `(Id,InitiativeId)`; CK `RevisionNo>0`; CK `(CostKind='Free' AND Price IS NULL AND Currency IS NULL) OR (CostKind='Paid' AND Price>0 AND Currency IS NOT NULL)`; CK `ISJSON(PublishedSnapshotJson)=1`; CK `Capacity BETWEEN 1 AND 135 AND EndsAtUtc>StartsAtUtc AND WithdrawalCutoffAtUtc<StartsAtUtc`; runtime UPDATE/DELETE denied and immutability trigger required")
rule("institution.InitiativeDraft", rows["institution.InitiativeDraft"]["rules"])
rule("institution.InitiativeApplication", "UQ `(InitiativeId,PersonId,AttemptNo)`, `(Id,InitiativeId)`, `(Id,InitiativeId,PersonId)`, `(Id,InitiativeId,TermsRevisionId)`; UXF `(InitiativeId,PersonId) WHERE Status IN ('Pending','Queued','Offered')`; FK `(TermsRevisionId,InitiativeId)→institution.InitiativeRevision(Id,InitiativeId)`; IX `(InitiativeId,Status,SubmittedAtUtc)`; CK `AttemptNo>0`; CK `Status IN ('Pending','Queued','Offered','Accepted','Rejected','Withdrawn','Blocked')`; repeat submission is policy-blocked until owner decision")
rule("institution.InitiativeSeatOffer", "FK `(ApplicationId,InitiativeId)→institution.InitiativeApplication(Id,InitiativeId)`; UQ `(Id,InitiativeId)`; UXF `ApplicationId WHERE Status='Offered'`; IX `(InitiativeId,Status,ExpiresAtUtc)`; CK `ExpiresAtUtc>OfferedAtUtc`; CK `Status IN ('Offered','Accepted','Declined','Expired','Cancelled')`; live offers consume held capacity until serialized terminal transition")
rule("institution.InitiativeApplicationDecision", "UQ `(ApplicationId,DecisionNo)`; FK `(ApplicationId,InitiativeId,TermsRevisionId)→institution.InitiativeApplication(Id,InitiativeId,TermsRevisionId)`; IX `(InitiativeId,AtUtc)`; CK `Action IN ('Approved','Rejected','Withdrawn','Queued','Offered','Blocked')`; append-only, status updated in same transaction")
rule("institution.InitiativeMembership", "UQ `ApplicationId`, `(Id,InitiativeId)`; UXF `PersonId WHERE Status IN ('Accepted','Suspended')`; FK `(ApplicationId,InitiativeId,PersonId)→institution.InitiativeApplication(Id,InitiativeId,PersonId)`; IX `(InitiativeId,CapacityReleasedAtUtc,Status)`; CK `Status IN ('Accepted','Suspended','Withdrawn','Removed','Completed')`; CK `(Status IN ('Accepted','Suspended') AND EndedAtUtc IS NULL AND CapacityReleasedAtUtc IS NULL) OR (Status='Withdrawn' AND EndedAtUtc IS NOT NULL AND CapacityReleasedAtUtc IS NOT NULL AND CapacityReleasedAtUtc>=EndedAtUtc) OR (Status IN ('Removed','Completed') AND EndedAtUtc IS NOT NULL AND CapacityReleasedAtUtc IS NULL)`; no blanket `(InitiativeId,PersonId)` unique key; repeat admission remains policy-blocked")
rule("institution.InitiativeStaffInvitation", "UQ `(Id,InitiativeId,Role)`; UXF `(InitiativeId,NormalizedEmail,Role) WHERE Status='Pending'`; IX `(Status,ExpiresAtUtc)`; CK `Role IN ('Supervisor','Coach')`; CK `Status IN ('Pending','Accepted','Declined','Expired','Cancelled','Revoked')`")
rule("institution.InitiativeStaffAppointment", "UQ `(Id,InitiativeId)`, `InvitationId`; UXF `(InitiativeId,PersonId,Role) WHERE Status='Active'`; FK `(InvitationId,InitiativeId,Role)→institution.InitiativeStaffInvitation(Id,InitiativeId,Role)`; IX `(PersonId,Status)`; CK `Role IN ('Supervisor','Coach')`; CK `Status IN ('Active','Revoked')`; active Supervisor count <=3 in serialized owner transaction")
rule("session.Session", "FK `(InitiativeId,InstitutionId)→institution.Initiative(Id,InstitutionId)` when InitiativeId is not null; UQ `(Id,InitiativeId)`; IX `(InstitutionId,StartAtUtc)`, `(InitiativeId,StartAtUtc)`; CK `EndAtUtc>StartAtUtc`; CK `Status IN ('Draft','Published','Cancelled','Completed')`; current published revision = maximum RevisionNo")
rule("task.AssignmentRecipient", "FK `(AssignedRevisionId,AssignmentId)→task.AssignmentRevision(Id,AssignmentId)`; UQ `(AssignmentId,PersonId)`, `(Id,AssignmentId)`; IX `(PersonId,Status)`; CK `LastAttemptNo>=0`; CK `Status IN ('Assigned','Started','Submitted','Approved','Cancelled')`")
rule("task.SubmissionAttempt", "UQ `(RecipientId,AttemptNo)`; FK `(RecipientId,AssignmentId)→task.AssignmentRecipient(Id,AssignmentId)`; FK `(AssignmentRevisionId,AssignmentId)→task.AssignmentRevision(Id,AssignmentId)`; IX `(RecipientId,SubmittedAtUtc)`; CK `AttemptNo>0`; append-only")
rule("task.ReviewDecision", "UQ `(AttemptId,DecisionNo)`, `(Id,AttemptId)`; UXF `SupersedesId WHERE SupersedesId IS NOT NULL`; FK `(SupersedesId,AttemptId)→task.ReviewDecision(Id,AttemptId)`; IX `(ReviewerPersonId,DecidedAtUtc)`; CK `Decision IN ('Approved','NeedsRevision','Rejected')`; append-only")
rule("coach.ProgramGroupMembership", "FK `(GroupId,ProgramId)→coach.OperationalGroup(Id,ProgramId)`; UQ `(GroupId,PersonId)`; IX `(PersonId,Status)`, `(PersonId,ProgramId)`; CK `Status IN ('Active','Left','Removed','Completed')`")
rule("coach.ProgramCompletion", "FK `(ProgramRevisionId,ProgramId)→coach.ProgramRevision(Id,ProgramId)`; UQ `(ProgramId,PersonId)`; IX `(ProgramId,Status)`; CK `Status IN ('Pending','Completed','NotMet','Corrected')`")
rule("session.SessionAttendance", "FK `(RegistrationId,SessionId,PersonId)→session.SessionRegistration(Id,SessionId,PersonId)`; UQ `(SessionId,PersonId)`, `RegistrationId`; IX `(SessionId,Status)`; CK `Status IN ('Present','Late','Absent','NotRecorded')`; method constrained by mode policy; correction is a child history row")
rule("provider.ProviderStaffInvitation", "UQ `(Id,ExperienceId)`; UXF `(ExperienceId,NormalizedEmail) WHERE Status='Pending'`; CK `Status IN ('Pending','Accepted','Expired','Revoked')`")
rule("provider.ProviderStaffAppointment", "UQ `(Id,ExperienceId)`; UXF `(ExperienceId,PersonId) WHERE Status='Active'`; FK `(InvitationId,ExperienceId)→provider.ProviderStaffInvitation(Id,ExperienceId)`; IX `(PersonId,Status)`; CK `Status IN ('Active','Revoked')`")
rule("provider.ProviderCohort", "UQ `(Id,ExperienceId)`; FK `(SupervisorAppointmentId,ExperienceId)→provider.ProviderStaffAppointment(Id,ExperienceId)`; IX `(ExperienceId,Status)`; CK `Status IN ('Active','Closed')`")
rule("provider.ProviderCohortMember", "UXF `BookingId WHERE LeftAtUtc IS NULL`; FK `(CohortId,ExperienceId)→provider.ProviderCohort(Id,ExperienceId)`; FK `(BookingId,ExperienceId)→provider.ExperienceBooking(Id,ExperienceId)`; IX `(CohortId,LeftAtUtc)`; accepted booking required at transaction time")
rule("provider.ExperienceBooking", "UQ `(ExperienceId,PersonId)`, `(Id,ExperienceId)`; FK `(RevisionId,ExperienceId)→provider.ExperienceRevision(Id,ExperienceId)`; IX `(ExperienceId,Status,BookedAtUtc)`; CK `Status IN ('Queued','Offered','Confirmed','Cancelled','CheckedIn','Completed','Declined')`; capacity uses unreleased confirmed claims plus live offers under Experience lock")
rule("provider.SeatOffer", "FK `(BookingId,ExperienceId)→provider.ExperienceBooking(Id,ExperienceId)`; UQ `(Id,ExperienceId)`; UXF `BookingId WHERE Status='Offered'`; IX `(ExperienceId,Status,ExpiresAtUtc)`; CK `ExpiresAtUtc>OfferedAtUtc`; CK `Status IN ('Offered','Accepted','Declined','Expired','Cancelled')`")
rule("forms.FormAnswer", "UQ `(ResponseId,QuestionId)`, `(Id,QuestionId)`; CK at most one scalar value kind; answers immutable after response submission")
rule("forms.FormResponse", "UQ `(FormVersionId,PersonId,ResponseNo)`, `(Id,FormVersionId)`; IX `(FormVersionId,Status)`; CK `Status IN ('Draft','Submitted','Withdrawn')`; identified Person required")
rule("forms.FormQuestion", "UQ `(FormVersionId,QuestionKey)`, `(Id,FormVersionId)`; typed answer validation uses pinned published schema")
rule("forms.FormAnswer", "UQ `(ResponseId,QuestionId)`, `(Id,QuestionId)`; FK `(ResponseId,FormVersionId)→forms.FormResponse(Id,FormVersionId)`; FK `(QuestionId,FormVersionId)→forms.FormQuestion(Id,FormVersionId)`; CK at most one scalar value kind; answers immutable after response submission")
rule("forms.FormQuestionOption", "UQ `(QuestionId,OptionCode)`, `(QuestionId,SortOrder)`, `(Id,QuestionId)`; immutable with published form version")
rule("forms.FormAnswerChoice", "UQ `(AnswerId,OptionId)`; FK `(AnswerId,QuestionId)→forms.FormAnswer(Id,QuestionId)`; FK `(OptionId,QuestionId)→forms.FormQuestionOption(Id,QuestionId)`; immutable after response submission")
rule("forms.CompetitionEntry", "UQ `(CompetitionId,PersonId,EntryNo)`, `(Id,CompetitionId)`; IX `(CompetitionId,Status)`; CK `Status IN ('Submitted','Withdrawn','Reviewed')`")
rule("forms.CompetitionCriterion", "UQ `(CompetitionId,CriterionCode,RubricVersion)`, `(Id,CompetitionId,RubricVersion)`; immutable published rubric")
rule("forms.CompetitionJudgment", "UQ `(EntryId,JudgePersonId,RubricVersion)`, `(Id,CompetitionId,RubricVersion)`; FK `(EntryId,CompetitionId)→forms.CompetitionEntry(Id,CompetitionId)`; IX `(EntryId)`; attributed rubric decision, append-only")
rule("forms.CompetitionCriterionScore", "UQ `(JudgmentId,CriterionId)`; FK `(JudgmentId,CompetitionId,RubricVersion)→forms.CompetitionJudgment(Id,CompetitionId,RubricVersion)`; FK `(CriterionId,CompetitionId,RubricVersion)→forms.CompetitionCriterion(Id,CompetitionId,RubricVersion)`; published rubric validates score range")
rule("evidence.EvidenceEvent", "UQ `EventPublicId`, `(SourceContext,SourceKey,SourceVersion)`, `(Id,SubjectPersonId)`; UXF `InvalidatesEventId WHERE InvalidatesEventId IS NOT NULL`; FK `(InvalidatesEventId,SubjectPersonId)→evidence.EvidenceEvent(Id,SubjectPersonId)`; IX `(SubjectPersonId,OccurredAtUtc)`; append-only correction event")
rule("evidence.PersonalRewardEntry", "UQ `(Id,PersonId)`; UXF `(EvidenceEventId,PersonId,EffectCode) WHERE EntryKind='Grant'`; UXF `ReversesEntryId WHERE ReversesEntryId IS NOT NULL`; FK `(EvidenceEventId,PersonId)→evidence.EvidenceEvent(Id,SubjectPersonId)`; FK `(ReversesEntryId,PersonId)→evidence.PersonalRewardEntry(Id,PersonId)`; IX `(PersonId,DecidedAtUtc)`; CK `EntryKind IN ('Grant','Reversal')`; append-only")
rule("evidence.GroupRewardEntry", "UQ `(Id,GroupGardenId)`; UXF `(EvidenceEventId,GroupGardenId,EffectCode) WHERE EntryKind='Grant'`; UXF `ReversesEntryId WHERE ReversesEntryId IS NOT NULL`; FK `(ReversesEntryId,GroupGardenId)→evidence.GroupRewardEntry(Id,GroupGardenId)`; IX `(GroupGardenId,DecidedAtUtc)`; CK `EntryKind IN ('Grant','Reversal')`; append-only")
rule("evidence.GroupGarden", "CK `(InitiativeId IS NOT NULL AND IndependentGroupId IS NULL AND ProgramId IS NULL) OR (InitiativeId IS NULL AND IndependentGroupId IS NOT NULL AND ProgramId IS NOT NULL)`; FK `(IndependentGroupId,ProgramId)→coach.OperationalGroup(Id,ProgramId)`; UXF `InitiativeId WHERE InitiativeId IS NOT NULL`; UXF `IndependentGroupId WHERE IndependentGroupId IS NOT NULL`")

# Explicit composite references are normalized to target column order, so every
# target can be checked against a declared UQ/PK before the dictionary is issued.
COMPOSITES = [
    ("personal.IndividualProfile", "LastAssessmentAttemptId,PersonId", "lab.AssessmentAttempt", "Id,PersonId"),
    ("lab.AssessmentAttempt", "InstrumentVersionId,InstrumentId", "lab.InstrumentVersion", "Id,InstrumentId"),
    ("lab.AssessmentAttempt", "WindowId,PersonId", "lab.AssessmentWindow", "Id,PersonId"),
    ("recovery.ScheduledAction", "PlanRevisionId,CycleId", "recovery.PlanRevision", "Id,CycleId"),
    ("recovery.WeeklyReview", "PlanRevisionId,CycleId", "recovery.PlanRevision", "Id,CycleId"),
    ("shield.ProtectionSession", "InstallationId,PersonId", "shield.ExtensionInstallation", "Id,PersonId"),
    ("shield.ProtectionSession", "ConfigurationId,PersonId", "shield.ShieldConfiguration", "Id,PersonId"),
    ("shield.BrowserUsagePeriod", "InstallationId,PersonId", "shield.ExtensionInstallation", "Id,PersonId"),
    ("shield.BrowserUsagePeriod", "ConfigurationId,PersonId", "shield.ShieldConfiguration", "Id,PersonId"),
    ("shield.BrowserUsageDomain", "UsagePeriodId,ConfigurationId", "shield.BrowserUsagePeriod", "Id,ConfigurationId"),
    ("shield.BrowserUsageDomain", "ConfigurationId,DomainCode", "shield.ShieldSelectedDomain", "ConfigurationId,DomainCode"),
    ("institution.InitiativeDraft", "BaseRevisionId,InitiativeId", "institution.InitiativeRevision", "Id,InitiativeId"),
    ("institution.InitiativeDraft", "PublishedRevisionId,InitiativeId", "institution.InitiativeRevision", "Id,InitiativeId"),
    ("institution.InitiativeApplication", "TermsRevisionId,InitiativeId", "institution.InitiativeRevision", "Id,InitiativeId"),
    ("institution.InitiativeSeatOffer", "ApplicationId,InitiativeId", "institution.InitiativeApplication", "Id,InitiativeId"),
    ("institution.InitiativeApplicationDecision", "ApplicationId,InitiativeId,TermsRevisionId", "institution.InitiativeApplication", "Id,InitiativeId,TermsRevisionId"),
    ("institution.InitiativeMembership", "ApplicationId,InitiativeId,PersonId", "institution.InitiativeApplication", "Id,InitiativeId,PersonId"),
    ("institution.InitiativeStaffAppointment", "InvitationId,InitiativeId,Role", "institution.InitiativeStaffInvitation", "Id,InitiativeId,Role"),
    ("coach.InitiativeGroupPlacement", "GroupId,InitiativeId", "coach.OperationalGroup", "Id,InitiativeId"),
    ("coach.InitiativeGroupPlacement", "MembershipId,InitiativeId", "institution.InitiativeMembership", "Id,InitiativeId"),
    ("coach.ProgramGroupMembership", "GroupId,ProgramId", "coach.OperationalGroup", "Id,ProgramId"),
    ("coach.ProgramCompletion", "ProgramRevisionId,ProgramId", "coach.ProgramRevision", "Id,ProgramId"),
    ("task.AssignmentRecipient", "AssignedRevisionId,AssignmentId", "task.AssignmentRevision", "Id,AssignmentId"),
    ("task.SubmissionAttempt", "RecipientId,AssignmentId", "task.AssignmentRecipient", "Id,AssignmentId"),
    ("task.SubmissionAttempt", "AssignmentRevisionId,AssignmentId", "task.AssignmentRevision", "Id,AssignmentId"),
    ("task.ReviewDecision", "SupersedesId,AttemptId", "task.ReviewDecision", "Id,AttemptId"),
    ("session.Session", "InitiativeId,InstitutionId", "institution.Initiative", "Id,InstitutionId"),
    ("session.InitiativeSessionDuty", "SessionId,InitiativeId", "session.Session", "Id,InitiativeId"),
    ("session.InitiativeSessionDuty", "AppointmentId,InitiativeId", "institution.InitiativeStaffAppointment", "Id,InitiativeId"),
    ("session.SessionRegistration", "PoolId,SessionId", "session.SessionCapacityPool", "Id,SessionId"),
    ("session.SessionRegistration", "SessionRevisionId,SessionId", "session.SessionRevision", "Id,SessionId"),
    ("session.SessionAttendance", "RegistrationId,SessionId,PersonId", "session.SessionRegistration", "Id,SessionId,PersonId"),
    ("session.InitiativeCompletion", "MembershipId,InitiativeId", "institution.InitiativeMembership", "Id,InitiativeId"),
    ("session.InitiativeCompletion", "RuleRevisionId,InitiativeId", "institution.InitiativeRevision", "Id,InitiativeId"),
    ("provider.ExperienceBooking", "RevisionId,ExperienceId", "provider.ExperienceRevision", "Id,ExperienceId"),
    ("provider.SeatOffer", "BookingId,ExperienceId", "provider.ExperienceBooking", "Id,ExperienceId"),
    ("provider.ProviderStaffAppointment", "InvitationId,ExperienceId", "provider.ProviderStaffInvitation", "Id,ExperienceId"),
    ("provider.ProviderAppointmentSession", "AppointmentId,ExperienceId", "provider.ProviderStaffAppointment", "Id,ExperienceId"),
    ("provider.ProviderAppointmentSession", "SessionId,ExperienceId", "provider.ExperienceSession", "Id,ExperienceId"),
    ("provider.ProviderCohort", "SupervisorAppointmentId,ExperienceId", "provider.ProviderStaffAppointment", "Id,ExperienceId"),
    ("provider.ProviderCohortMember", "CohortId,ExperienceId", "provider.ProviderCohort", "Id,ExperienceId"),
    ("provider.ProviderCohortMember", "BookingId,ExperienceId", "provider.ExperienceBooking", "Id,ExperienceId"),
    ("provider.ProviderAttendance", "BookingId,ExperienceId", "provider.ExperienceBooking", "Id,ExperienceId"),
    ("provider.ProviderAttendance", "SessionId,ExperienceId", "provider.ExperienceSession", "Id,ExperienceId"),
    ("provider.CampCompletion", "BookingId,ExperienceId", "provider.ExperienceBooking", "Id,ExperienceId"),
    ("provider.CampCompletion", "RuleRevisionId,ExperienceId", "provider.ExperienceRevision", "Id,ExperienceId"),
    ("forms.FormAnswerChoice", "AnswerId,QuestionId", "forms.FormAnswer", "Id,QuestionId"),
    ("forms.FormAnswerChoice", "OptionId,QuestionId", "forms.FormQuestionOption", "Id,QuestionId"),
    ("forms.FormAnswer", "ResponseId,FormVersionId", "forms.FormResponse", "Id,FormVersionId"),
    ("forms.FormAnswer", "QuestionId,FormVersionId", "forms.FormQuestion", "Id,FormVersionId"),
    ("forms.CompetitionJudgment", "EntryId,CompetitionId", "forms.CompetitionEntry", "Id,CompetitionId"),
    ("forms.CompetitionCriterionScore", "JudgmentId,CompetitionId,RubricVersion", "forms.CompetitionJudgment", "Id,CompetitionId,RubricVersion"),
    ("forms.CompetitionCriterionScore", "CriterionId,CompetitionId,RubricVersion", "forms.CompetitionCriterion", "Id,CompetitionId,RubricVersion"),
    ("activity.PracticeAttempt", "EvidenceEventId,PersonId", "evidence.EvidenceEvent", "Id,SubjectPersonId"),
    ("evidence.EvidenceEvent", "InvalidatesEventId,SubjectPersonId", "evidence.EvidenceEvent", "Id,SubjectPersonId"),
    ("evidence.PersonalRewardEntry", "EvidenceEventId,PersonId", "evidence.EvidenceEvent", "Id,SubjectPersonId"),
    ("evidence.PersonalRewardEntry", "ReversesEntryId,PersonId", "evidence.PersonalRewardEntry", "Id,PersonId"),
    ("evidence.GroupRewardEntry", "ReversesEntryId,GroupGardenId", "evidence.GroupRewardEntry", "Id,GroupGardenId"),
    ("evidence.GroupGarden", "IndependentGroupId,ProgramId", "coach.OperationalGroup", "Id,ProgramId"),
]

names = defaultdict(list)
for table in rows:
    names[table.split(".", 1)[1]].append(table)

def resolve(target):
    if target in rows:
        return target
    options = names[target]
    assert len(options) == 1, (target, options)
    return options[0]

def fields_of(table):
    return {"Id", *(f[0] for f in rows[table]["fields"]), "CreatedAtUtc", *( ["UpdatedAtUtc", "RowVersion"] if rows[table]["cls"] == "M" else []), *( ["PublicId"] if table.split(".")[-1] in PUBLIC else [])}

def unique_keys(table):
    rules = rows[table]["rules"]
    found = {("Id",)}
    for match in re.finditer(r"\bUQ\b([^;]*)", rules):
        for token in re.findall(r"`([^`]+)`", match.group(1)):
            if " WHERE " in token:
                continue
            found.add(tuple(x.strip() for x in token.strip("()").split(",")))
    return found

audit = []
for child, child_cols, target, target_cols in COMPOSITES:
    c = tuple(child_cols.split(",")); t = tuple(target_cols.split(","))
    assert len(c) == len(t) and set(c) <= fields_of(child), (child, c)
    assert set(t) <= fields_of(target), (target, t)
    assert t in unique_keys(target), (child, target, t, unique_keys(target))
    audit.append((child, c, target, t))

# A draft's two nullable revision pointers are deliberately checked against the
# same Initiative; do not rely on independent Id FKs for owner identity.
rule("institution.InitiativeDraft", rows["institution.InitiativeDraft"]["rules"] + "; FK `(BaseRevisionId,InitiativeId)→institution.InitiativeRevision(Id,InitiativeId)`; FK `(PublishedRevisionId,InitiativeId)→institution.InitiativeRevision(Id,InitiativeId)`")

lines = [
    "# DeepSprout v2.1 — canonical SQL Server target dictionary",
    "",
    "**Status: proposed correction, not executed or approved for production.** This is a complete stand-alone definition of the target tables. It contains no superseded columns, keys, or override instructions. The 129 rows include one Builder draft table required by the six-stage contract. Class `M` has mutable audit columns and `rowversion`; `H` and `V` are insert-only. `!` means `NOT NULL`; `?` means `NULL`. `Id` is `bigint IDENTITY(1,1) PRIMARY KEY` in every table. All foreign keys use `ON DELETE NO ACTION`. Every outward `PublicId` is `uniqueidentifier NOT NULL UNIQUE`. `datetime2(3)` is UTC unless the name says `LocalDate`. A `UQ` is an unfiltered alternate key, `UXF` a filtered unique index, `IX` a nonunique index, and `CK` a check. A rule requiring another row's state is a serialized command guard rather than a SQL `CHECK`.",
    "",
    "| Table · class/privacy | Final columns, including common columns | Final keys, FKs, checks and indexes |",
    "|---|---|---|",
]
for table, data in rows.items():
    common = ["`Id bigint IDENTITY(1,1) NOT NULL PK`"]
    if table.split(".")[-1] in PUBLIC:
        common.append("`PublicId uniqueidentifier NOT NULL UQ`")
    field_text = []
    simple_fks = []
    for name, typ, mark, target in data["fields"]:
        field_text.append(f"`{name} {typ} {'NOT NULL' if mark == '!' else 'NULL'}`")
        if target:
            simple_fks.append(f"FK `({name})→{resolve(target)}(Id)`")
    common.append("`CreatedAtUtc datetime2(3) NOT NULL`")
    if data["cls"] == "M":
        common += ["`UpdatedAtUtc datetime2(3) NOT NULL`", "`RowVersion rowversion NOT NULL`"]
    # All composite FKs are explicit in the rule cell, even if the inherited rule
    # described them less precisely.
    composites = [f"FK `({','.join(c)})→{target}({','.join(t)})`" for child,c,target,t in audit if child == table]
    constraints = data["rules"]
    for item in simple_fks + composites:
        if item not in constraints:
            constraints += "; " + item
    lines.append(f"| `{table}` {data['cls']}/{data['privacy']} | {', '.join(common + field_text)} | {constraints} |")
first_slice = [
    "files.SecureFile", "iam.ConsentRecord", "iam.GlobalGrant", "iam.OtpChallenge",
    "iam.PasswordCredential", "iam.Person", "iam.PersonEmail", "institution.Initiative",
    "institution.InitiativeDraft", "institution.InitiativeApplication",
    "institution.InitiativeApplicationDecision", "institution.InitiativeMembership",
    "institution.InitiativeRevision", "institution.InitiativeStaffAppointment",
    "institution.InitiativeStaffInvitation", "institution.Institution",
    "institution.InstitutionVerificationCase", "institution.RepresentativeMembership", "ops.AuditEvent",
]
assert len(first_slice) == 19 and set(first_slice) <= set(rows)
lines += [
    "", f"**Inventory:** {len(rows)} target tables; {len(audit)} composite foreign keys verified against declared target `PK`/`UQ` keys. This inventory is a design dictionary; later slice migrations remain unimplemented.",
    "", "**Exact corrected first slice (19):** " + ", ".join(f"`{name}`" for name in first_slice) + ".", "",
]
(HERE / "02-canonical-dictionary.md").write_text("\n".join(lines))

audit_lines = ["# Composite foreign-key target audit", "", "Static audit of the proposed v2.1 dictionary. This verifies column existence, ordering, and declared target `PK`/`UQ`; it is **not** SQL Server execution.", "", "| Child FK columns | Referenced declared target key | Result |", "|---|---|---|"]
for child,c,target,t in audit:
    audit_lines.append(f"| `{child}({','.join(c)})` | `{target}({','.join(t)})` | PASS — declared unfiltered `UQ`/`PK` |")
audit_lines += ["", f"Total: **{len(audit)}** composite references; **0** missing target keys in the proposed dictionary.", ""]
(HERE / "03-composite-key-audit.md").write_text("\n".join(audit_lines))
print(f"{len(rows)} tables; {len(audit)} composite FK targets verified")
