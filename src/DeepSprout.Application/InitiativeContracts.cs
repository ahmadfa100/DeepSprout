namespace DeepSprout.Application;

// Command contracts are independent of EF Core and SQL Server. A later ASP.NET Core
// adapter may call these, but the M1 milestone does not add routes or a full API.
public sealed record DraftCreated(long InitiativeId, long DraftId);
public sealed record PublicationTerms(
    string Title, string Mode, short Capacity, string TimeZoneId,
    DateTime StartsAtUtc, DateTime EndsAtUtc, string Summary,
    string AudienceCode, string CompletionPolicyRef);

public interface IInitiativeCommands
{
    Task<DraftCreated> CreateDraftAsync(long institutionId, long actorPersonId, CancellationToken cancellationToken);
    Task SaveDraftStageAsync(long draftId, long actorPersonId, byte[] expectedRowVersion,
        byte stage, string stageJson, CancellationToken cancellationToken);
    Task<long> PublishDraftAsync(long draftId, long actorPersonId, PublicationTerms terms,
        CancellationToken cancellationToken);
    Task<long> SubmitApplicationAsync(long initiativeId, long personId, CancellationToken cancellationToken);
    Task<long> ApproveApplicationAsync(long applicationId, long actorPersonId, CancellationToken cancellationToken);
    Task EndMembershipAsync(long membershipId, long actorPersonId, string terminalStatus,
        CancellationToken cancellationToken);
    Task<long> RescheduleAsync(long initiativeId, long actorPersonId,
        DateTime startsAtUtc, DateTime endsAtUtc, CancellationToken cancellationToken);
    Task CancelInitiativeAsync(long initiativeId, long actorPersonId, string reason,
        CancellationToken cancellationToken);
}
