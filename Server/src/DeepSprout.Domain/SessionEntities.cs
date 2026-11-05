namespace DeepSprout.Domain;

public sealed class Session : MutableRecord
{
    public Guid PublicId { get; set; }
    public long InstitutionId { get; set; }
    public long? InitiativeId { get; set; }
    public string Title { get; set; } = "";
    public string Mode { get; set; } = "";
    public string Status { get; set; } = "Draft";
    public string TimeZoneId { get; set; } = "";
    public bool AttendanceRequired { get; set; }
    public DateTime StartAtUtc { get; set; }
    public DateTime EndAtUtc { get; set; }
}
public sealed class SessionRevision : Record
{
    public long SessionId { get; set; }
    public int RevisionNo { get; set; }
    public string? Venue { get; set; }
    public string? ProtectedLinkRef { get; set; }
    public short CheckInBeforeMinutes { get; set; }
    public short CheckInAfterMinutes { get; set; }
    public string CompletionRuleRef { get; set; } = "";
    public DateTime PublishedAtUtc { get; set; }
}
public sealed class InitiativeSessionDuty : MutableRecord
{
    public long InitiativeId { get; set; }
    public long SessionId { get; set; }
    public long AppointmentId { get; set; }
    public string Status { get; set; } = "Active";
    public DateTime AssignedAtUtc { get; set; }
}
public sealed class StandaloneSessionSupervisorAppointment : MutableRecord
{
    public long SessionId { get; set; }
    public long? PersonId { get; set; }
    public string NormalizedEmail { get; set; } = "";
    public long InvitedByPersonId { get; set; }
    public byte[] TokenHash { get; set; } = [];
    public string Status { get; set; } = "Pending";
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? AcceptedAtUtc { get; set; }
}
public sealed class SessionCapacityPool : MutableRecord
{
    public long SessionId { get; set; }
    public string Mode { get; set; } = "";
    public int Capacity { get; set; }
}
public sealed class SessionRegistration : MutableRecord
{
    public Guid PublicId { get; set; }
    public long SessionId { get; set; }
    public long PersonId { get; set; }
    public long PoolId { get; set; }
    public long SessionRevisionId { get; set; }
    public string Status { get; set; } = "Pending";
    public byte[]? CredentialHash { get; set; }
    public DateTime RegisteredAtUtc { get; set; }
}
public sealed class SessionAttendance : MutableRecord
{
    public long RegistrationId { get; set; }
    public long SessionId { get; set; }
    public long PersonId { get; set; }
    public string Status { get; set; } = "NotRecorded";
    public string Method { get; set; } = "";
    public long RecordedByPersonId { get; set; }
    public long? EvidenceEventId { get; set; }
    public DateTime RecordedAtUtc { get; set; }
}
public sealed class AttendanceCorrection : Record
{
    public long AttendanceId { get; set; }
    public string OldStatus { get; set; } = "";
    public string NewStatus { get; set; } = "";
    public long CorrectedByPersonId { get; set; }
    public string Reason { get; set; } = "";
    public DateTime CorrectedAtUtc { get; set; }
}
public sealed class AbsenceExcuse : MutableRecord
{
    public Guid PublicId { get; set; }
    public long AttendanceId { get; set; }
    public long SubmittedByPersonId { get; set; }
    public string Reason { get; set; } = "";
    public long? FileId { get; set; }
    public string? Recommendation { get; set; }
    public long? RecommendedByPersonId { get; set; }
    public string? Decision { get; set; }
    public long? DecidedByPersonId { get; set; }
    public string Status { get; set; } = "Submitted";
}
public sealed class InitiativeCompletion : MutableRecord
{
    public long InitiativeId { get; set; }
    public long MembershipId { get; set; }
    public long RuleRevisionId { get; set; }
    public string Status { get; set; } = "Pending";
    public long EvaluatorPersonId { get; set; }
    public long? EvidenceEventId { get; set; }
    public DateTime? EvaluatedAtUtc { get; set; }
}
