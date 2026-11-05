namespace DeepSprout.Domain;

public sealed class Assignment : MutableRecord
{
    public Guid PublicId { get; set; }
    public long GroupId { get; set; }
    public long AuthorPersonId { get; set; }
    public string Status { get; set; } = "Draft";
}

public sealed class AssignmentRevision : Record
{
    public long AssignmentId { get; set; }
    public int RevisionNo { get; set; }
    public long? PracticeVersionId { get; set; }
    public string Instructions { get; set; } = "";
    public string ReviewMode { get; set; } = "";
    public DateTime? DueAtUtc { get; set; }
    public DateTime? PublishedAtUtc { get; set; }
}

public sealed class AssignmentRecipient : MutableRecord
{
    public long AssignmentId { get; set; }
    public long PersonId { get; set; }
    public long AssignedRevisionId { get; set; }
    public string Status { get; set; } = "Assigned";
    public int LastAttemptNo { get; set; }
    public DateTime AssignedAtUtc { get; set; }
}

public sealed class SubmissionAttempt : Record
{
    public long RecipientId { get; set; }
    public int AttemptNo { get; set; }
    public long AssignmentRevisionId { get; set; }
    public string? Body { get; set; }
    public long? FileId { get; set; }
    public long AssignmentId { get; set; }
    public DateTime SubmittedAtUtc { get; set; }
}

public sealed class ReviewDecision : Record
{
    public long AttemptId { get; set; }
    public int DecisionNo { get; set; }
    public long? SupersedesId { get; set; }
    public long ReviewerPersonId { get; set; }
    public string Decision { get; set; } = "";
    public string? Feedback { get; set; }
    public string? RuleVersion { get; set; }
    public long? EvidenceEventId { get; set; }
    public DateTime DecidedAtUtc { get; set; }
}

public sealed class ReviewPrivateNote : Record
{
    public long DecisionId { get; set; }
    public long AuthorPersonId { get; set; }
    public string Note { get; set; } = "";
}

public sealed class CoachReport : MutableRecord
{
    public long GroupId { get; set; }
    public long AuthorPersonId { get; set; }
    public DateOnly PeriodStart { get; set; }
    public DateOnly PeriodEnd { get; set; }
    public string Status { get; set; } = "Draft";
    public string? Narrative { get; set; }
}

public sealed class SupervisorReport : MutableRecord
{
    public long InitiativeId { get; set; }
    public long AuthorPersonId { get; set; }
    public DateOnly PeriodStart { get; set; }
    public DateOnly PeriodEnd { get; set; }
    public string Status { get; set; } = "Draft";
    public string? Narrative { get; set; }
}
