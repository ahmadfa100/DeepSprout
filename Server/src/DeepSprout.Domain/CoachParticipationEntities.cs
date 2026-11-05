namespace DeepSprout.Domain;

public sealed class InitiativeGroupPlacement : MutableRecord
{
    public long InitiativeId { get; set; }
    public long GroupId { get; set; }
    public long MembershipId { get; set; }
    public long MovedByPersonId { get; set; }
    public DateTime StartedAtUtc { get; set; }
    public DateTime? EndedAtUtc { get; set; }
}

public sealed class ProgramGroupMembership : MutableRecord
{
    public long ProgramId { get; set; }
    public long GroupId { get; set; }
    public long PersonId { get; set; }
    public string Status { get; set; } = "Active";
    public DateTime? JoinedAtUtc { get; set; }
}

public sealed class ProgramCompletion : MutableRecord
{
    public long ProgramId { get; set; }
    public long PersonId { get; set; }
    public long ProgramRevisionId { get; set; }
    public string Status { get; set; } = "Pending";
    public long EvaluatorPersonId { get; set; }
    public long? EvidenceEventId { get; set; }
    public DateTime? EvaluatedAtUtc { get; set; }
}

public sealed class GroupCoachAssignment : MutableRecord
{
    public long GroupId { get; set; }
    public long CoachPersonId { get; set; }
    public long? InitiativeAppointmentId { get; set; }
    public long AssignedByPersonId { get; set; }
    public DateTime FromUtc { get; set; }
    public DateTime? ToUtc { get; set; }
}

public sealed class ProgramGroupInvitation : MutableRecord
{
    public long GroupId { get; set; }
    public string NormalizedEmail { get; set; } = "";
    public byte[] TokenHash { get; set; } = [];
    public string Status { get; set; } = "Pending";
    public DateTime ExpiresAtUtc { get; set; }
}
