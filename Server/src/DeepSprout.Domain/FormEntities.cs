namespace DeepSprout.Domain;

public sealed class Form : MutableRecord
{
    public Guid PublicId { get; set; }
    public long InitiativeId { get; set; }
    public string Purpose { get; set; } = "";
    public string Title { get; set; } = "";
    public string Status { get; set; } = "Draft";
}
public sealed class FormVersion : Record
{
    public long FormId { get; set; }
    public int VersionNo { get; set; }
    public string ConsentVersion { get; set; } = "";
    public DateTime OpensAtUtc { get; set; }
    public DateTime ClosesAtUtc { get; set; }
    public DateTime PublishedAtUtc { get; set; }
}
public sealed class FormQuestion : Record
{
    public long FormVersionId { get; set; }
    public string QuestionKey { get; set; } = "";
    public string Prompt { get; set; } = "";
    public string QuestionType { get; set; } = "";
    public bool Required { get; set; }
}
public sealed class FormQuestionOption : Record
{
    public long QuestionId { get; set; }
    public string OptionCode { get; set; } = "";
    public string Label { get; set; } = "";
    public short SortOrder { get; set; }
}
public sealed class FormResponse : MutableRecord
{
    public Guid PublicId { get; set; }
    public long FormVersionId { get; set; }
    public long PersonId { get; set; }
    public int ResponseNo { get; set; }
    public string Status { get; set; } = "Draft";
    public DateTime? SubmittedAtUtc { get; set; }
    public DateTime? ConsentAtUtc { get; set; }
}
public sealed class FormAnswer : MutableRecord
{
    public long ResponseId { get; set; }
    public long QuestionId { get; set; }
    public string? TextValue { get; set; }
    public decimal? NumberValue { get; set; }
    public string? ChoiceCode { get; set; }
    public long? FileId { get; set; }
    public long FormVersionId { get; set; }
}
public sealed class FormAnswerChoice : MutableRecord
{
    public long AnswerId { get; set; }
    public long OptionId { get; set; }
    public long QuestionId { get; set; }
}
public sealed class Competition : MutableRecord
{
    public Guid PublicId { get; set; }
    public long InitiativeId { get; set; }
    public string Title { get; set; } = "";
    public string RulesVersion { get; set; } = "";
    public string Status { get; set; } = "Draft";
    public DateTime OpensAtUtc { get; set; }
    public DateTime ClosesAtUtc { get; set; }
}
public sealed class CompetitionCriterion : Record
{
    public long CompetitionId { get; set; }
    public string CriterionCode { get; set; } = "";
    public string Label { get; set; } = "";
    public string RubricVersion { get; set; } = "";
}
public sealed class CompetitionEntry : MutableRecord
{
    public Guid PublicId { get; set; }
    public long CompetitionId { get; set; }
    public long PersonId { get; set; }
    public int EntryNo { get; set; }
    public string? Body { get; set; }
    public long? FileId { get; set; }
    public string Status { get; set; } = "Submitted";
    public DateTime SubmittedAtUtc { get; set; }
}
public sealed class CompetitionJudgment : Record
{
    public long EntryId { get; set; }
    public long JudgePersonId { get; set; }
    public string RubricVersion { get; set; } = "";
    public string Decision { get; set; } = "";
    public string? Feedback { get; set; }
    public long CompetitionId { get; set; }
    public DateTime DecidedAtUtc { get; set; }
}
public sealed class CompetitionCriterionScore : Record
{
    public long JudgmentId { get; set; }
    public long CriterionId { get; set; }
    public decimal Score { get; set; }
    public long CompetitionId { get; set; }
    public string RubricVersion { get; set; } = "";
}
