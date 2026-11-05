namespace DeepSprout.Domain;

public sealed class CoachApproval : MutableRecord
{
    public long PersonId { get; set; }
    public string Status { get; set; } = "Submitted";
    public long? EvidenceFileId { get; set; }
    public long? DecidedByPersonId { get; set; }
    public string? DecisionReason { get; set; }
}

public sealed class CoachProgram : MutableRecord
{
    public Guid PublicId { get; set; }
    public long OwnerPersonId { get; set; }
    public string Title { get; set; } = "";
    public string Status { get; set; } = "Draft";
}

public sealed class ProgramRevision : Record
{
    public long ProgramId { get; set; }
    public int RevisionNo { get; set; }
    public string Purpose { get; set; } = "";
    public string RuleRef { get; set; } = "";
    public DateTime PublishedAtUtc { get; set; }
}

public sealed class ProgramStage : Record
{
    public long ProgramRevisionId { get; set; }
    public short StageNo { get; set; }
    public string Title { get; set; } = "";
    public DateTime? StartsAtUtc { get; set; }
    public DateTime? EndsAtUtc { get; set; }
}

public sealed class OperationalGroup : MutableRecord
{
    public Guid PublicId { get; set; }
    public long? InitiativeId { get; set; }
    public long? ProgramId { get; set; }
    public string Name { get; set; } = "";
    public string Status { get; set; } = "Open";
}
