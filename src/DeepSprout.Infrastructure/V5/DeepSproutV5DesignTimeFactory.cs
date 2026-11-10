using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace DeepSprout.Infrastructure.V5;

/// <summary>
/// Design-time factory for `dotnet ef ... --context DeepSproutV5DbContext`.
/// It never chooses a database by itself: commands that connect need DEEPSPROUT_V5_CONNECTION.
/// Commands that only read the model (migrations add, migrations script, has-pending-model-changes) work without it.
/// </summary>
public sealed class DeepSproutV5DesignTimeFactory : IDesignTimeDbContextFactory<DeepSproutV5DbContext>
{
    public const string ConnectionVariable = "DEEPSPROUT_V5_CONNECTION";

    public DeepSproutV5DbContext CreateDbContext(string[] args)
    {
        var connection = Environment.GetEnvironmentVariable(ConnectionVariable);
        if (string.IsNullOrWhiteSpace(connection))
        {
            // An unreachable placeholder: model-only commands succeed, connecting commands fail fast.
            connection = "Server=tcp:set-DEEPSPROUT_V5_CONNECTION.invalid,1;Database=unset;Connect Timeout=1;Encrypt=True";
        }
        var options = new DbContextOptionsBuilder<DeepSproutV5DbContext>()
            .UseSqlServer(connection)
            .Options;
        return new DeepSproutV5DbContext(options);
    }
}
