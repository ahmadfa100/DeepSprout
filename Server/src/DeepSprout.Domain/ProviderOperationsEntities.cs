namespace DeepSprout.Domain;

public sealed class ProviderStaffInvitation : MutableRecord
{
    public long ExperienceId { get; set; }
    public string NormalizedEmail { get; set; } = "";
    public byte[] TokenHash { get; set; } = [];
    public string Status { get; set; } = "Pending";
    public long InvitedByPersonId { get; set; }
    public DateTime ExpiresAtUtc { get; set; }
}
public sealed class ProviderStaffAppointment : MutableRecord
{
    public long ExperienceId { get; set; }
    public long PersonId { get; set; }
    public long InvitationId { get; set; }
    public string Status { get; set; } = "Active";
    public DateTime AcceptedAtUtc { get; set; }
    public DateTime? RevokedAtUtc { get; set; }
}
public sealed class ProviderAppointmentSession : Record
{
    public long ExperienceId { get; set; }
    public long AppointmentId { get; set; }
    public long SessionId { get; set; }
}
public sealed class ProviderCohort : MutableRecord
{
    public long ExperienceId { get; set; }
    public long SupervisorAppointmentId { get; set; }
    public string Name { get; set; } = "";
    public string Status { get; set; } = "Active";
}
public sealed class ProviderCohortMember : MutableRecord
{
    public long CohortId { get; set; }
    public long BookingId { get; set; }
    public long ExperienceId { get; set; }
    public DateTime JoinedAtUtc { get; set; }
    public DateTime? LeftAtUtc { get; set; }
}
public sealed class ProviderAttendance : MutableRecord
{
    public long ExperienceId { get; set; }
    public long BookingId { get; set; }
    public long SessionId { get; set; }
    public string Status { get; set; } = "NotRecorded";
    public string Method { get; set; } = "";
    public long RecordedByPersonId { get; set; }
    public long? EvidenceEventId { get; set; }
    public DateTime RecordedAtUtc { get; set; }
}
public sealed class ProviderAttendanceCorrection : Record
{
    public long AttendanceId { get; set; }
    public string OldStatus { get; set; } = "";
    public string NewStatus { get; set; } = "";
    public long CorrectedByPersonId { get; set; }
    public string Reason { get; set; } = "";
    public DateTime CorrectedAtUtc { get; set; }
}
public sealed class CampCompletion : MutableRecord
{
    public long ExperienceId { get; set; }
    public long BookingId { get; set; }
    public long RuleRevisionId { get; set; }
    public string Status { get; set; } = "Pending";
    public long EvaluatorPersonId { get; set; }
    public long? EvidenceEventId { get; set; }
    public DateTime? EvaluatedAtUtc { get; set; }
}
public sealed class ProviderIncident : MutableRecord
{
    public Guid PublicId { get; set; }
    public long ExperienceId { get; set; }
    public long? BookingId { get; set; }
    public long ReportedByPersonId { get; set; }
    public string Summary { get; set; } = "";
    public long? FileId { get; set; }
    public string Status { get; set; } = "Open";
    public DateTime OccurredAtUtc { get; set; }
}
