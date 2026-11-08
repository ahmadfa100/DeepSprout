namespace DeepSprout.Domain;

public sealed class RecoveryJourney : MutableRecord
{
    public long PersonId { get; set; }
    public DateTime StartedAtUtc { get; set; }
    public string Status { get; set; } = "Active";
    public int JourneyLevel { get; set; } = 1;
}

public sealed class RecoveryCycle : MutableRecord
{
    public Guid PublicId { get; set; }
    public long JourneyId { get; set; }
    public long PersonId { get; set; }
    public int CycleNo { get; set; }
    public string Status { get; set; } = "Draft";
    public DateOnly? StartLocalDate { get; set; }
    public DateOnly? EndLocalDate { get; set; }
    public string TimeZoneId { get; set; } = "";
}

public sealed class PlanRevision : MutableRecord
{
    public long CycleId { get; set; }
    public int RevisionNo { get; set; }
    public string GoalCode { get; set; } = "";
    public string PolicyVersion { get; set; } = "";
    public DateOnly EffectiveFromLocalDate { get; set; }
    public string Reason { get; set; } = "";
    public string Status { get; set; } = "Draft";
    public DateTime? AcceptedAtUtc { get; set; }
}

public sealed class ScheduledAction : MutableRecord
{
    public long CycleId { get; set; }
    public long PersonId { get; set; }
    public long PlanRevisionId { get; set; }
    public long? PracticeVersionId { get; set; }
    public DateOnly LocalDate { get; set; }
    public string ActionKind { get; set; } = "";
    public string Status { get; set; } = "Due";
    public long? CompletedAttemptId { get; set; }
}

public sealed class WeeklyReview : Record
{
    public long CycleId { get; set; }
    public byte WeekNo { get; set; }
    public long PlanRevisionId { get; set; }
    public string? ManageabilityCode { get; set; }
    public string? FitCode { get; set; }
    public string DecisionCode { get; set; } = "";
    public DateTime ReviewedAtUtc { get; set; }
}

public sealed class PracticeDefinition : MutableRecord
{
    public string Code { get; set; } = "";
    public string PracticeType { get; set; } = "";
    public string Status { get; set; } = "Draft";
}

public sealed class PracticeVersion : Record
{
    public long DefinitionId { get; set; }
    public int VersionNo { get; set; }
    public string ContentRef { get; set; } = "";
    public short DifficultyTier { get; set; }
    public short? EstimatedMinutes { get; set; }
    public string EvidenceTier { get; set; } = "";
    public string ValidationVersion { get; set; } = "";
    public DateTime PublishedAtUtc { get; set; }
}

public sealed class PracticeAttempt : MutableRecord
{
    public Guid PublicId { get; set; }
    public long PersonId { get; set; }
    public long PracticeVersionId { get; set; }
    public long? ScheduledActionId { get; set; }
    public string Status { get; set; } = "Started";
    public bool? Valid { get; set; }
    public string? OutcomeCode { get; set; }
    public DateTime StartedAtUtc { get; set; }
    public DateTime? EndedAtUtc { get; set; }
    public long? EvidenceEventId { get; set; }
}

public sealed class PracticeProgressionDecision : Record
{
    public long PersonId { get; set; }
    public string PracticeType { get; set; } = "";
    public short FromTier { get; set; }
    public short ToTier { get; set; }
    public string PolicyVersion { get; set; } = "";
    public string DecisionCode { get; set; } = "";
    public DateTime DecidedAtUtc { get; set; }
}

public sealed class OfflineRoutine : MutableRecord
{
    public long PersonId { get; set; }
    public string Title { get; set; } = "";
    public string? ScheduleRule { get; set; }
    public string Status { get; set; } = "Active";
}

public sealed class RoutineCheckIn : MutableRecord
{
    public long RoutineId { get; set; }
    public long PersonId { get; set; }
    public DateOnly LocalDate { get; set; }
    public string State { get; set; } = "Done";
    public long? EvidenceEventId { get; set; }
}
