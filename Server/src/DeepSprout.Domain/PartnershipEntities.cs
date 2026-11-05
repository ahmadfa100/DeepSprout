namespace DeepSprout.Domain;

public sealed class ProgramLink : MutableRecord
{
    public Guid PublicId { get; set; }
    public long InitiativeId { get; set; }
    public long ProgramId { get; set; }
    public long RequestedByPersonId { get; set; }
    public long? AcceptedByPersonId { get; set; }
    public string ScopeVersion { get; set; } = "";
    public string Status { get; set; } = "Requested";
}
public sealed class ExperienceLink : MutableRecord
{
    public Guid PublicId { get; set; }
    public long InitiativeId { get; set; }
    public long ExperienceId { get; set; }
    public long RequestedByPersonId { get; set; }
    public long? AcceptedByPersonId { get; set; }
    public string ScopeVersion { get; set; } = "";
    public string Status { get; set; } = "Requested";
}
