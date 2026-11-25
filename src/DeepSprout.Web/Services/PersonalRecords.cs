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
    internal const string IndividualPolicy = "IndividualWorkspace";
    internal const string IndividualClaim = "deepsprout:individual-workspace";
    internal const string OnboardingPath = "/src/pages/member/onboarding/onboarding.html";
    internal const string HomePath = "/src/pages/member/dashboard/dashboard.html";
    internal const string TermsPurpose = "TermsAndPrivacy";
    internal const string TermsNotice = "2026-11-10";

    internal static IndividualProfile NewProfile(long personId, DateTime now) => new()
    {
        PersonId = personId, OnboardingStage = "Started", JourneyLevel = 1, PreferredTimeZone = "UTC", CreatedAtUtc = now
    };

    internal static ConsentRecord AcceptTerms(long personId, DateTime now) => new()
    {
        PersonId = personId, PurposeCode = TermsPurpose, NoticeVersion = TermsNotice, Decision = "Accepted",
        DecidedAtUtc = now, CreatedAtUtc = now
    };

    internal static bool NeedsOnboarding(string? stage) => stage is "Started" or "QuickSetup" or "Story";

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
