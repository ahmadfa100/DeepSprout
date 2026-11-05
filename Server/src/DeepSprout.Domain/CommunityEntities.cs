namespace DeepSprout.Domain;

public sealed class Post : MutableRecord
{
    public Guid PublicId { get; set; }
    public long AuthorPersonId { get; set; }
    public string Body { get; set; } = "";
    public string Status { get; set; } = "Draft";
    public long? SharedEvidenceEventId { get; set; }
    public DateTime? PublishedAtUtc { get; set; }
}

public sealed class Comment : MutableRecord
{
    public long PostId { get; set; }
    public long AuthorPersonId { get; set; }
    public string Body { get; set; } = "";
    public string Status { get; set; } = "Published";
}

public sealed class Reaction : MutableRecord
{
    public long PostId { get; set; }
    public long PersonId { get; set; }
    public string ReactionCode { get; set; } = "";
}

public sealed class Bookmark : MutableRecord
{
    public long PostId { get; set; }
    public long PersonId { get; set; }
}

public sealed class ContentReport : MutableRecord
{
    public long? PostId { get; set; }
    public long? CommentId { get; set; }
    public long ReporterPersonId { get; set; }
    public string ReasonCode { get; set; } = "";
    public string Status { get; set; } = "Submitted";
}

public sealed class ModerationDecision : Record
{
    public long ReportId { get; set; }
    public long ModeratorPersonId { get; set; }
    public string Decision { get; set; } = "";
    public string Reason { get; set; } = "";
    public DateTime DecidedAtUtc { get; set; }
}

public sealed class JointGoal : MutableRecord
{
    public Guid PublicId { get; set; }
    public long CreatorPersonId { get; set; }
    public string Title { get; set; } = "";
    public string Status { get; set; } = "Active";
    public DateOnly? TargetLocalDate { get; set; }
}

public sealed class JointGoalMember : MutableRecord
{
    public long GoalId { get; set; }
    public long PersonId { get; set; }
    public string Status { get; set; } = "Invited";
}

public sealed class JointGoalCheckIn : Record
{
    public long GoalId { get; set; }
    public long PersonId { get; set; }
    public string Body { get; set; } = "";
    public DateOnly LocalDate { get; set; }
}
