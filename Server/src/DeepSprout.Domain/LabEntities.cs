namespace DeepSprout.Domain;

public sealed class IndividualProfile : MutableRecord
{
    public long PersonId { get; set; }
    public string? GoalCode { get; set; }
    public string PreferredTimeZone { get; set; } = "";
    public int PreferenceVersion { get; set; }
    public string? ConsentVersion { get; set; }
    public string OnboardingStage { get; set; } = "Started";
    public long? LastAssessmentAttemptId { get; set; }
    public DateTime? OnboardingCompletedAtUtc { get; set; }
}

public sealed class AssessmentInstrument : MutableRecord
{
    public string Code { get; set; } = "";
    public string Title { get; set; } = "";
    public string Status { get; set; } = "Draft";
}

public sealed class InstrumentVersion : Record
{
    public long InstrumentId { get; set; }
    public int VersionNo { get; set; }
    public string ContentRef { get; set; } = "";
    public string ScoringVersion { get; set; } = "";
    public string ProtocolVersion { get; set; } = "";
    public string? ComparabilityGroup { get; set; }
    public DateTime PublishedAtUtc { get; set; }
}

public sealed class AssessmentWindow : MutableRecord
{
    public long PersonId { get; set; }
    public string WindowKey { get; set; } = "";
    public string PolicyVersion { get; set; } = "";
    public DateTime OpensAtUtc { get; set; }
    public DateTime ClosesAtUtc { get; set; }
    public string Status { get; set; } = "Open";
}

public sealed class AssessmentAttempt : MutableRecord
{
    public Guid PublicId { get; set; }
    public long PersonId { get; set; }
    public long InstrumentId { get; set; }
    public long InstrumentVersionId { get; set; }
    public long? WindowId { get; set; }
    public string Kind { get; set; } = "";
    public string Status { get; set; } = "Started";
    public DateTime StartedAtUtc { get; set; }
    public DateTime? FinishedAtUtc { get; set; }
    public string? ValidityCode { get; set; }
    public string? AccessibilityMode { get; set; }
}

public sealed class AssessmentResponse : MutableRecord
{
    public long AttemptId { get; set; }
    public string ItemKey { get; set; } = "";
    public int TrialNo { get; set; }
    public string? ResponseText { get; set; }
    public decimal? ResponseNumber { get; set; }
    public int? LatencyMs { get; set; }
    public DateTime RecordedAtUtc { get; set; }
}

public sealed class AssessmentScore : Record
{
    public long AttemptId { get; set; }
    public string ScoringVersion { get; set; } = "";
    public string MetricCode { get; set; } = "";
    public decimal Value { get; set; }
    public bool Comparable { get; set; }
    public DateTime ComputedAtUtc { get; set; }
}
