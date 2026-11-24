using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json;
using DeepSprout.Domain.V5;
using DeepSprout.Infrastructure.Identity;
using DeepSprout.Infrastructure.V5;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Web.Services;

internal static class PersonalRecords
{
    internal static IQueryable<Person> PlatformAdmins(DeepSproutV5DbContext db) =>
        db.Set<Person>().Where(person => person.Status == "Active" && person.PlatformRole == "Admin");

    internal static async Task<long?> PlatformAdminId(DeepSproutV5DbContext db, ClaimsPrincipal user, CancellationToken ct)
    {
        var id = await PersonId(db, user, ct);
        return id.HasValue && await PlatformAdmins(db).AnyAsync(person => person.Id == id.Value, ct) ? id : null;
    }

    internal static Task<long?> PersonId(DeepSproutV5DbContext db, ClaimsPrincipal user, CancellationToken ct) =>
        long.TryParse(user.FindFirstValue(JwtRegisteredClaimNames.Sub), out var id)
            ? db.Set<ApplicationUser>().Where(item => item.Id == id).Select(item => (long?)item.PersonId).SingleOrDefaultAsync(ct)
            : Task.FromResult<long?>(null);

    // All personal writers take this lock before changing related V5 records.
    internal static Task<IndividualProfile?> Lock(DeepSproutV5DbContext db, long personId, CancellationToken ct) =>
        db.Set<IndividualProfile>()
            .FromSqlInterpolated($"SELECT * FROM [personal].[IndividualProfile] WITH (UPDLOCK) WHERE [PersonId] = {personId}")
            .SingleOrDefaultAsync(ct);

    internal static DateTime Now(TimeProvider clock) =>
        DateTimeOffset.FromUnixTimeMilliseconds(clock.GetUtcNow().ToUnixTimeMilliseconds()).UtcDateTime;

    internal static AuditEvent Audit(long personId, string kind, long id, string action, object detail, DateTime now) =>
        new()
        {
            ActorPersonId = personId, ActorCapacity = "Individual", ResourceKind = kind, ResourceId = id,
            Action = action, DetailJson = JsonSerializer.Serialize(detail, RecoveryPlanRules.Json),
            AtUtc = now, CreatedAtUtc = now
        };
}
