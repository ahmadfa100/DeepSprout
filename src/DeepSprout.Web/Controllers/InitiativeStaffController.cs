using System.ComponentModel.DataAnnotations;
using System.Data;
using System.Security.Cryptography;
using DeepSprout.Domain.V5;
using DeepSprout.Infrastructure.Identity;
using DeepSprout.Infrastructure.V5;
using DeepSprout.Web.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Web.Controllers;

[ApiController]
[Authorize]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[Route("api/initiative-staff")]
public sealed class InitiativeStaffController(
    DeepSproutV5DbContext db, UserManager<ApplicationUser> users, TimeProvider clock) : ControllerBase
{
    private const string Resource = "org.StaffAppointment";
    private const int SupervisorLimit = 3;
    public sealed record InviteInput([Required, MaxLength(320)] string Email, [Required, MaxLength(16)] string Role);
    public sealed record TokenInput([Required, StringLength(43, MinimumLength = 43)] string Token);
    public sealed record EndInput([MaxLength(800)] string? Reason);

    [HttpGet("owned/{initiativeId:guid}")]
    public async Task<IActionResult> Owned(Guid initiativeId, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        var initiative = await OwnedInitiatives(actor).SingleOrDefaultAsync(item => item.PublicId == initiativeId, ct);
        if (initiative is null) return NotFound();
        var now = PersonalRecords.Now(clock);
        var rows = await (from appointment in Appointments(initiative.Id).AsNoTracking()
                          where OwnedInitiatives(actor).Any(item => item.Id == appointment.InitiativeId)
                          join person in db.Set<Person>() on appointment.PersonId equals (long?)person.Id into people
                          from person in people.DefaultIfEmpty()
                          orderby appointment.Id descending
                          select new { appointment, staffName = person == null ? null : person.DisplayName }).ToListAsync(ct);
        return Ok(new
        {
            canInvite = await Eligible(initiative.Id, now, ct),
            appointments = rows.Select(row => new { appointment = View(row.appointment, now), row.staffName })
        });
    }

    [HttpGet("owned/{initiativeId:guid}/{id:guid}")]
    public async Task<IActionResult> OwnedDetail(Guid initiativeId, Guid id, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        var appointment = await (from row in db.Set<StaffAppointment>().AsNoTracking()
                                 join initiative in OwnedInitiatives(actor) on row.InitiativeId equals (long?)initiative.Id
                                 where initiative.PublicId == initiativeId && row.ExperienceId == null && row.PublicId == id
                                 select row).SingleOrDefaultAsync(ct);
        if (appointment is null) return NotFound();
        var events = await (from entry in db.Set<AuditEvent>().AsNoTracking()
                            join person in db.Set<Person>() on entry.ActorPersonId equals (long?)person.Id into actors
                            from person in actors.DefaultIfEmpty()
                            where entry.ResourceKind == Resource && entry.ResourceId == appointment.Id
                            orderby entry.Id
                            select new { entry.Action, entry.BeforeStatus, entry.AfterStatus, entry.Reason, entry.AtUtc,
                                actor = person == null ? null : person.DisplayName, entry.ActorCapacity }).ToListAsync(ct);
        return Ok(new { appointment = View(appointment, PersonalRecords.Now(clock)), history = events.Select(entry =>
            new { entry.Action, entry.BeforeStatus, entry.AfterStatus, entry.Reason, atUtc = Utc(entry.AtUtc), entry.actor, entry.ActorCapacity }) });
    }

    [HttpPost("owned/{initiativeId:guid}")]
    public async Task<IActionResult> Invite(Guid initiativeId, InviteInput input, CancellationToken ct)
    {
        var email = input.Email.Trim();
        if (!ValidRole(input.Role) || !new EmailAddressAttribute().IsValid(email))
            return BadRequest("Choose Coach or Supervisor and enter a valid email address.");
        var normalizedEmail = users.NormalizeEmail(email);
        if (string.IsNullOrEmpty(normalizedEmail) || normalizedEmail.Length > 320) return BadRequest("Enter a valid email address.");
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var initiative = await LockOwned(initiativeId, actor, ct);
        if (initiative is null) return NotFound();
        var now = PersonalRecords.Now(clock);
        if (!await Eligible(initiative.Id, now, ct)) return Conflict("This Initiative is closed for staff invitations.");

        var sameRole = Appointments(initiative.Id).Where(item => item.Role == input.Role);
        if (await sameRole.AnyAsync(item => item.Status == "Active" && (item.NormalizedEmail == normalizedEmail ||
                db.Set<ApplicationUser>().Any(user => user.PersonId == item.PersonId && user.NormalizedEmail == normalizedEmail)), ct))
            return Conflict("This account already has an active appointment for that role.");
        var pending = await sameRole.SingleOrDefaultAsync(item => item.Status == "Pending" &&
            item.NormalizedEmail == normalizedEmail, ct);
        if (pending is not null)
        {
            if (pending.ExpiresAtUtc > now) return Conflict("A pending invitation already exists for that email and role.");
            End(pending, actor, "Representative", "Expired", "Invitation deadline passed.", now);
            await db.SaveChangesAsync(ct);
        }

        var secret = RandomNumberGenerator.GetBytes(32);
        var appointment = new StaffAppointment
        {
            InitiativeId = initiative.Id, Role = input.Role, Status = "Pending", NormalizedEmail = normalizedEmail,
            TokenHash = SHA256.HashData(secret), ExpiresAtUtc = now.AddDays(7),
            InvitedByPersonId = actor, InvitedAtUtc = now, CreatedAtUtc = now
        };
        db.Add(appointment);
        await db.SaveChangesAsync(ct);
        Audit(appointment, actor, "Representative", "Invited", null, null, now);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Ok(new { id = appointment.PublicId, token = WebEncoders.Base64UrlEncode(secret), appointment.Status,
            expiresAtUtc = Utc(appointment.ExpiresAtUtc) });
    }

    [HttpPost("owned/{initiativeId:guid}/{id:guid}/{decision}")]
    public async Task<IActionResult> EndAppointment(Guid initiativeId, Guid id, string decision, EndInput input, CancellationToken ct)
    {
        if (decision is not ("cancel" or "revoke")) return NotFound();
        var reason = input.Reason?.Trim();
        if (decision == "revoke" && string.IsNullOrWhiteSpace(reason)) return BadRequest("Give a reason for revoking access.");
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var initiative = await LockOwned(initiativeId, actor, ct);
        if (initiative is null) return NotFound();
        var row = await Appointments(initiative.Id).SingleOrDefaultAsync(item => item.PublicId == id, ct);
        if (row is null) return NotFound();
        var now = PersonalRecords.Now(clock);
        var target = decision == "cancel" ? "Cancelled" : "Revoked";
        if (row.Status == target) return Ok(View(row, now));
        if (EffectiveStatus(row, now) != (decision == "cancel" ? "Pending" : "Active"))
            return Conflict("This change is unavailable for the current appointment status.");
        // A Representative can withdraw access even after the Initiative closes.
        End(row, actor, "Representative", target, string.IsNullOrWhiteSpace(reason) ? "Cancelled by the Representative." : reason, now);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Ok(View(row, now));
    }

    [HttpPost("invitation/{initiativeId:guid}/{id:guid}/{decision}")]
    public async Task<IActionResult> Invitation(Guid initiativeId, Guid id, string decision, TokenInput input, CancellationToken ct)
    {
        if (decision is not ("inspect" or "accept" or "decline")) return NotFound();
        var hash = TokenHash(input.Token);
        if (hash is null) return NotFound();
        if (!long.TryParse(User.Identity?.Name, out var identityId)) return Unauthorized();
        try
        {
            await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
            var initiative = await InitiativeTerms.Lock(db, initiativeId).AsNoTracking().SingleOrDefaultAsync(ct);
            if (initiative is null) return NotFound();
            var appointment = await Appointments(initiative.Id).SingleOrDefaultAsync(item => item.PublicId == id, ct);
            if (appointment?.TokenHash is null || !CryptographicOperations.FixedTimeEquals(hash, appointment.TokenHash))
                return NotFound();

            // Read the current Identity fields inside the transaction, even if authentication loaded the user earlier.
            var account = await db.Set<ApplicationUser>().AsNoTracking().Where(user => user.Id == identityId &&
                db.Set<Person>().Any(person => person.Id == user.PersonId && person.Status == "Active"))
                .Select(user => new { user.PersonId, user.EmailConfirmed, user.NormalizedEmail }).SingleOrDefaultAsync(ct);
            if (account is null) return Unauthorized();
            if (!string.Equals(account.NormalizedEmail, appointment.NormalizedEmail, StringComparison.Ordinal))
                return StatusCode(StatusCodes.Status403Forbidden, "Sign in with the email address that received this invitation.");
            if (!account.EmailConfirmed)
                return StatusCode(StatusCodes.Status403Forbidden, "Your account needs a confirmed email address to respond to this invitation.");
            if (appointment.PersonId is { } recipient && recipient != account.PersonId) return NotFound();

            var now = PersonalRecords.Now(clock);
            var status = EffectiveStatus(appointment, now);
            var eligible = await Eligible(initiative.Id, now, ct);
            if (decision == "inspect")
            {
                // The same verified recipient may see the invitation's final status after it was used.
                var details = await InitiativeDisplay(initiative.Id, ct);
                return Ok(new { initiativeId, appointment.Role, status, details.Title, details.Institution,
                    canRespond = eligible && status == "Pending", canOpen = eligible && status == "Active" &&
                        appointment.PersonId == account.PersonId && appointment.AcceptedAtUtc != null && appointment.EndedAtUtc == null,
                    expiresAtUtc = Utc(appointment.ExpiresAtUtc) });
            }
            if (status == "Expired" && appointment.Status == "Pending")
            {
                End(appointment, account.PersonId, "Invitee", "Expired", "Invitation deadline passed.", now);
                await db.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);
            }
            if (status != "Pending")
                return Conflict($"This invitation is {status.ToLowerInvariant()}.");
            if (!eligible) return Conflict("This Initiative is closed for staff invitations.");
            if (decision == "decline")
            {
                appointment.PersonId = account.PersonId;
                End(appointment, account.PersonId, "Invitee", "Declined", "Declined by the invited account.", now);
            }
            else
            {
                var active = Appointments(initiative.Id).Where(item => item.Status == "Active" && item.Role == appointment.Role);
                if (await active.AnyAsync(item => item.PersonId == account.PersonId, ct))
                    return Conflict("You already have an active appointment for this role.");
                // The Initiative lock keeps the count and activation together for all invitations to this Initiative.
                if (appointment.Role == "Supervisor" && await active.CountAsync(ct) >= SupervisorLimit)
                    return Conflict("This Initiative already has 3 active Supervisors. Try again if a slot opens before the link expires.");
                appointment.PersonId = account.PersonId;
                appointment.AcceptedAtUtc = now;
                appointment.Status = "Active";
                Audit(appointment, account.PersonId, appointment.Role, "Accepted", "Pending", null, now);
            }
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            return Ok(new { initiativeId, appointment.Role, appointment.Status });
        }
        catch (DbUpdateConcurrencyException)
        {
            return Conflict("This invitation changed. Reopen it before responding.");
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 2601 or 2627 or 1205 })
        {
            return Conflict("The appointment conflicts with another change. Reopen the invitation.");
        }
        catch (SqlException ex) when (ex.Number == 1205)
        {
            return Conflict("The appointment conflicts with another change. Reopen the invitation.");
        }
    }

    [HttpGet("mine")]
    public async Task<IActionResult> Mine(CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        var now = PersonalRecords.Now(clock);
        var rows = await (from appointment in db.Set<StaffAppointment>().AsNoTracking()
                          join initiative in db.Set<Initiative>() on appointment.InitiativeId equals (long?)initiative.Id
                          join organization in db.Set<Organization>() on initiative.InstitutionId equals organization.Id
                          join revision in db.Set<InitiativeRevision>()
                            on new { Id = initiative.CurrentRevisionId, InitiativeId = initiative.Id }
                            equals new { Id = (long?)revision.Id, revision.InitiativeId }
                          where appointment.ExperienceId == null && (appointment.PersonId == actor ||
                            appointment.PersonId == null && appointment.Status == "Pending" && db.Set<ApplicationUser>().Any(user =>
                                user.PersonId == actor && user.EmailConfirmed && user.NormalizedEmail == appointment.NormalizedEmail))
                          orderby appointment.Id descending
                          select new { appointment, initiativeId = initiative.PublicId, revision.Title, institution = organization.Name,
                              eligible = InitiativeStaffAccess.EligibleInitiatives(db, now).Any(item => item.Id == initiative.Id) }).ToListAsync(ct);
        return Ok(rows.Select(row => new { row.initiativeId, row.Title, row.institution, row.appointment.Role,
            status = EffectiveStatus(row.appointment, now), canOpen = row.eligible && row.appointment.Status == "Active" &&
                row.appointment.AcceptedAtUtc != null && row.appointment.EndedAtUtc == null,
            revokedReason = row.appointment.Status == "Revoked" ? row.appointment.EndReason : null }));
    }

    [HttpGet("scope/{role}/{initiativeId:guid}")]
    public async Task<IActionResult> Scope(string role, Guid initiativeId, CancellationToken ct)
    {
        if (!ValidRole(role)) return NotFound();
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        var now = PersonalRecords.Now(clock);
        var scope = await (from appointment in InitiativeStaffAccess.Active(db, actor, role, now).AsNoTracking()
                           join initiative in db.Set<Initiative>() on appointment.InitiativeId equals (long?)initiative.Id
                           join organization in db.Set<Organization>() on initiative.InstitutionId equals organization.Id
                           join revision in db.Set<InitiativeRevision>()
                             on new { Id = initiative.CurrentRevisionId, InitiativeId = initiative.Id }
                             equals new { Id = (long?)revision.Id, revision.InitiativeId }
                           where initiative.PublicId == initiativeId
                           select new { initiativeId, revision.Title, revision.Summary, institution = organization.Name,
                               initiative.Status, appointment.Role, appointment.AcceptedAtUtc }).SingleOrDefaultAsync(ct);
        if (scope is null) return NotFound();
        if (role == "Supervisor") return Ok(new { initiative = scope });
        var groups = await InitiativeStaffAccess.CoachGroups(db, actor, initiativeId, now).AsNoTracking()
            .OrderBy(group => group.Name).Select(group => new { id = group.PublicId, group.Name, group.Status }).ToListAsync(ct);
        return Ok(new { initiative = scope, groups });
    }

    [HttpGet("scope/Coach/{initiativeId:guid}/groups/{id:guid}")]
    public async Task<IActionResult> Group(Guid initiativeId, Guid id, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        var assigned = InitiativeStaffAccess.CoachGroups(db, actor, initiativeId, PersonalRecords.Now(clock)).AsNoTracking();
        var selected = await assigned.Where(group => group.PublicId == id).Select(group => new { group.Id, group.InitiativeId,
            group.PublicId, group.Name, group.Status, group.Purpose, group.Description }).SingleOrDefaultAsync(ct);
        if (selected is null || selected.InitiativeId is not long initiative) return NotFound();
        var students = await (from placement in InitiativeGroupRecords.CurrentStudents(db, initiative)
                              join person in db.Set<Person>() on placement.PersonId equals (long?)person.Id
                              where placement.GroupId == selected.Id && assigned.Any(team => team.Id == placement.GroupId)
                              orderby person.DisplayName
                              select new { name = person.DisplayName }).ToListAsync(ct);
        return Ok(new { id = selected.PublicId, selected.Name, selected.Status, selected.Purpose, selected.Description, students });
    }

    private static bool ValidRole(string role) => role is "Coach" or "Supervisor";
    private IQueryable<StaffAppointment> Appointments(long id) =>
        db.Set<StaffAppointment>().Where(item => item.InitiativeId == id && item.ExperienceId == null);
    private IQueryable<Initiative> OwnedInitiatives(long actor) => db.Set<Initiative>().AsNoTracking().Where(item =>
        InstitutionAccess.VerifiedInstitutions(db, actor).Any(org => org.Id == item.InstitutionId));
    private Task<Initiative?> LockOwned(Guid id, long actor, CancellationToken ct) =>
        InitiativeTerms.Lock(db, id).AsNoTracking().SingleOrDefaultAsync(item =>
            InstitutionAccess.VerifiedInstitutions(db, actor).Any(org => org.Id == item.InstitutionId), ct);
    private Task<bool> Eligible(long initiative, DateTime now, CancellationToken ct) =>
        InitiativeStaffAccess.EligibleInitiatives(db, now).AnyAsync(item => item.Id == initiative, ct);

    private sealed class Display
    {
        public string? Title { get; init; }
        public required string Institution { get; init; }
    }
    private Task<Display> InitiativeDisplay(long id, CancellationToken ct) =>
        (from initiative in db.Set<Initiative>().AsNoTracking()
         join institution in db.Set<Organization>() on initiative.InstitutionId equals institution.Id
         where initiative.Id == id
         select new Display { Institution = institution.Name, Title = db.Set<InitiativeRevision>()
             .Where(revision => revision.Id == initiative.CurrentRevisionId && revision.InitiativeId == initiative.Id)
             .Select(revision => revision.Title).FirstOrDefault() }).SingleAsync(ct);

    private static byte[]? TokenHash(string token)
    {
        try
        {
            var bytes = WebEncoders.Base64UrlDecode(token);
            return bytes.Length == 32 && WebEncoders.Base64UrlEncode(bytes) == token ? SHA256.HashData(bytes) : null;
        }
        catch (FormatException) { return null; }
    }

    private static DateTime? Utc(DateTime? value) => value.HasValue ? DateTime.SpecifyKind(value.Value, DateTimeKind.Utc) : null;
    private static string EffectiveStatus(StaffAppointment appointment, DateTime now) =>
        appointment.Status == "Pending" && appointment.ExpiresAtUtc <= now ? "Expired" : appointment.Status;

    private static object View(StaffAppointment appointment, DateTime now) => new
    {
        id = appointment.PublicId, appointment.Role, status = EffectiveStatus(appointment, now),
        email = appointment.NormalizedEmail, invitedAtUtc = Utc(appointment.InvitedAtUtc), expiresAtUtc = Utc(appointment.ExpiresAtUtc),
        acceptedAtUtc = Utc(appointment.AcceptedAtUtc), endedAtUtc = Utc(appointment.EndedAtUtc), appointment.EndReason
    };

    private void End(StaffAppointment row, long actor, string capacity, string status, string reason, DateTime now)
    {
        var before = row.Status;
        row.Status = status;
        row.EndedAtUtc = now;
        row.EndReason = reason;
        Audit(row, actor, capacity, status, before, reason, now);
    }

    private void Audit(StaffAppointment row, long actor, string capacity, string action, string? before, string? reason, DateTime now) =>
        db.Add(new AuditEvent
        {
            ActorPersonId = actor, ActorCapacity = capacity, ResourceKind = Resource, ResourceId = row.Id,
            Action = action, BeforeStatus = before, AfterStatus = row.Status, Reason = reason, AtUtc = now, CreatedAtUtc = now
        });
}
