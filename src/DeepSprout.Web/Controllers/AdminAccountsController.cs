using DeepSprout.Domain.V5;
using DeepSprout.Infrastructure.Identity;
using DeepSprout.Infrastructure.V5;
using DeepSprout.Web.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Web.Controllers;

[ApiController]
[Authorize]
[Route("api/admin/accounts")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class AdminAccountsController(DeepSproutV5DbContext db, UserManager<ApplicationUser> users,
    TimeProvider clock) : ControllerBase
{
    public sealed record AccountAccessChange(string? Reason);

    [HttpPost("{id:guid}/{command:regex(^(suspend|restore|revoke-sessions)$)}")]
    public async Task<IActionResult> ChangeAccess(Guid id, string command, AccountAccessChange input, CancellationToken ct)
    {
        if (await PersonalRecords.PlatformAdminId(db, User, ct) is not { } actorId) return Forbid();
        if (string.IsNullOrWhiteSpace(input.Reason) || input.Reason.Length > 1000)
            return BadRequest("Enter a reason of at most 1000 characters.");

        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        // Keep the actor's authority stable until the account change and audit commit.
        var admin = await db.Set<Person>()
            .FromSqlInterpolated($"SELECT * FROM [iam].[Person] WITH (UPDLOCK) WHERE [Id] = {actorId}")
            .SingleOrDefaultAsync(ct);
        if (admin is not { Status: "Active", PlatformRole: "Admin" }) return Forbid();

        var person = await db.Set<Person>()
            .FromSqlInterpolated($"SELECT * FROM [iam].[Person] WITH (UPDLOCK) WHERE [PublicId] = {id} AND ([PlatformRole] IS NULL OR [PlatformRole] <> 'Admin')")
            .SingleOrDefaultAsync(ct);
        if (person is null) return NotFound();
        if (person.Status is not ("Active" or "Suspended")) return Conflict("This account is closed.");

        var before = person.Status;
        var after = command switch { "suspend" => "Suspended", "restore" => "Active", _ => before };
        if (command != "revoke-sessions" && before == after) return NoContent();
        var user = await db.Set<ApplicationUser>().SingleOrDefaultAsync(item => item.PersonId == person.Id, ct);
        if (user is null) return NotFound();
        if (!(await users.UpdateSecurityStampAsync(user)).Succeeded)
            return Conflict("The account changed. Try again.");

        var now = PersonalRecords.Now(clock);
        person.Status = after;
        db.Add(new AuditEvent
        {
            ActorPersonId = actorId, ActorCapacity = "Admin", ResourceKind = "iam.Person", ResourceId = person.Id,
            Action = command switch { "suspend" => "SuspendAccount", "restore" => "RestoreAccount", _ => "RevokeSessions" },
            BeforeStatus = before, AfterStatus = after, Reason = input.Reason.Trim(), AtUtc = now, CreatedAtUtc = now
        });
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return NoContent();
    }
}
