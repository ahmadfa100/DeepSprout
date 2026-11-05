using System.Data;
using DeepSprout.Application;
using Microsoft.Data.SqlClient;

namespace DeepSprout.Infrastructure;

// The runtime connection should use a principal in deepsprout_runtime. The database
// procedures own authority, locking, atomic writes, and audit for this M1 slice.
public sealed class InitiativeSqlCommands(string connectionString) : IInitiativeCommands
{
    public async Task<DraftCreated> CreateDraftAsync(long institutionId, long actorPersonId, CancellationToken cancellationToken)
    {
        await using var connection = await Open(cancellationToken);
        await using var command = Procedure(connection, "institution.CreateDraft",
            ("@InstitutionId", institutionId), ("@ActorPersonId", actorPersonId));
        var initiative = Output(command, "@InitiativeId");
        var draft = Output(command, "@DraftId");
        await command.ExecuteNonQueryAsync(cancellationToken);
        return new DraftCreated((long)initiative.Value, (long)draft.Value);
    }

    public Task SaveDraftStageAsync(long draftId, long actorPersonId, byte[] expectedRowVersion,
        byte stage, string stageJson, CancellationToken cancellationToken) =>
        Execute("institution.SaveDraftStage", cancellationToken,
            ("@DraftId", draftId), ("@ActorPersonId", actorPersonId),
            ("@ExpectedRowVersion", expectedRowVersion), ("@Stage", stage), ("@StageJson", stageJson));

    public Task<long> PublishDraftAsync(long draftId, long actorPersonId, PublicationTerms terms,
        CancellationToken cancellationToken) => ExecuteWithId("institution.PublishDraft", "@RevisionId", cancellationToken,
            ("@DraftId", draftId), ("@ActorPersonId", actorPersonId),
            ("@Title", terms.Title), ("@Mode", terms.Mode), ("@Capacity", terms.Capacity),
            ("@TimeZoneId", terms.TimeZoneId), ("@StartsAtUtc", terms.StartsAtUtc),
            ("@EndsAtUtc", terms.EndsAtUtc), ("@Summary", terms.Summary),
            ("@AudienceCode", terms.AudienceCode), ("@CompletionPolicyRef", terms.CompletionPolicyRef));

    public Task<long> SubmitApplicationAsync(long initiativeId, long personId, CancellationToken cancellationToken) =>
        ExecuteWithId("institution.SubmitApplication", "@ApplicationId", cancellationToken,
            ("@InitiativeId", initiativeId), ("@PersonId", personId));

    public Task<long> ApproveApplicationAsync(long applicationId, long actorPersonId, CancellationToken cancellationToken) =>
        ExecuteWithId("institution.ApproveApplication", "@MembershipId", cancellationToken,
            ("@ApplicationId", applicationId), ("@ActorPersonId", actorPersonId));

    public Task EndMembershipAsync(long membershipId, long actorPersonId, string terminalStatus,
        CancellationToken cancellationToken) => Execute("institution.EndMembership", cancellationToken,
            ("@MembershipId", membershipId), ("@ActorPersonId", actorPersonId), ("@NewStatus", terminalStatus));

    public Task<long> RescheduleAsync(long initiativeId, long actorPersonId,
        DateTime startsAtUtc, DateTime endsAtUtc, CancellationToken cancellationToken) =>
        ExecuteWithId("institution.RescheduleInitiative", "@RevisionId", cancellationToken,
            ("@InitiativeId", initiativeId), ("@ActorPersonId", actorPersonId),
            ("@NewStartsAtUtc", startsAtUtc), ("@NewEndsAtUtc", endsAtUtc));

    public Task CancelInitiativeAsync(long initiativeId, long actorPersonId, string reason,
        CancellationToken cancellationToken) => Execute("institution.CancelInitiative", cancellationToken,
            ("@InitiativeId", initiativeId), ("@ActorPersonId", actorPersonId), ("@Reason", reason));

    private async Task<SqlConnection> Open(CancellationToken cancellationToken)
    {
        var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        return connection;
    }

    private static SqlCommand Procedure(SqlConnection connection, string name, params (string Name, object Value)[] values)
    {
        var command = connection.CreateCommand();
        command.CommandText = name;
        command.CommandType = CommandType.StoredProcedure;
        foreach (var (parameterName, value) in values) command.Parameters.AddWithValue(parameterName, value);
        return command;
    }

    private static SqlParameter Output(SqlCommand command, string name)
    {
        var parameter = command.Parameters.Add(name, SqlDbType.BigInt);
        parameter.Direction = ParameterDirection.Output;
        return parameter;
    }

    private async Task Execute(string name, CancellationToken cancellationToken, params (string Name, object Value)[] values)
    {
        await using var connection = await Open(cancellationToken);
        await using var command = Procedure(connection, name, values);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private async Task<long> ExecuteWithId(string name, string outputName, CancellationToken cancellationToken,
        params (string Name, object Value)[] values)
    {
        await using var connection = await Open(cancellationToken);
        await using var command = Procedure(connection, name, values);
        var output = Output(command, outputName);
        await command.ExecuteNonQueryAsync(cancellationToken);
        return (long)output.Value;
    }
}
