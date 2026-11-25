using System.ComponentModel.DataAnnotations;
using System.Data;
using DeepSprout.Domain.V5;
using DeepSprout.Infrastructure.V5;
using DeepSprout.Web.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Web.Controllers;

[ApiController]
[Authorize]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[Route("api/initiative-groups")]
public sealed class InitiativeGroupsController(DeepSproutV5DbContext db, TimeProvider clock) : ControllerBase
{
    public sealed record GroupInput([Required, MaxLength(160)] string Name, [MaxLength(300)] string? Purpose,
        [MaxLength(1000)] string? Description, [Range(1, 500)] short? Capacity, string Status, string? Version);
    public sealed record PlacementInput(Guid? GroupId, string? Version);
    public sealed record CoachInput(Guid? AppointmentId, string? Version);

    [HttpGet("manage/{initiativeId:guid}")]
    public async Task<IActionResult> Manage(Guid initiativeId, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        var now = PersonalRecords.Now(clock);
        var initiative = await db.Set<Initiative>().AsNoTracking().SingleOrDefaultAsync(row => row.PublicId == initiativeId, ct);
        if (initiative is null || await Manager(initiative, actor, now, ct, readOnly: true) is null) return NotFound();
        var groups = await InitiativeGroupRecords.Groups(db, initiative.Id).AsNoTracking().OrderBy(row => row.Name).ToListAsync(ct);
        var coaches = await (from appointment in InitiativeStaffAccess.Active(db, "Coach", now)
                             join person in db.Set<Person>() on appointment.PersonId equals (long?)person.Id
                             where appointment.InitiativeId == initiative.Id
                             orderby person.DisplayName
                             select new { appointment.Id, appointment.PersonId, publicId = appointment.PublicId, name = person.DisplayName }).ToListAsync(ct);
        var students = await (from application in db.Set<InitiativeApplication>()
                              join person in db.Set<Person>() on application.PersonId equals person.Id
                              where application.InitiativeId == initiative.Id && application.Status == "Accepted" && person.Status == "Active"
                              orderby person.DisplayName
                              select new { application.Id, publicId = application.PublicId, name = person.DisplayName }).ToListAsync(ct);
        var placements = await InitiativeGroupRecords.Placements(db, initiative.Id).AsNoTracking()
            .OrderByDescending(row => row.Id).ToListAsync(ct);
        var latest = placements.ToLookup(row => row.ApplicationId);
        var groupIds = groups.ToDictionary(row => row.Id, row => row.PublicId);
        var canManage = await InitiativeStaffAccess.EligibleInitiatives(db, now).AnyAsync(row => row.Id == initiative.Id, ct);
        return Ok(new
        {
            canManage,
            groups = groups.Select(row =>
            {
                var coach = coaches.Find(item => item.Id == row.CoachStaffAppointmentId && item.PersonId == row.CoachPersonId);
                return new { id = row.PublicId, row.Name, row.Purpose, row.Description, row.Capacity, row.Status,
                    version = Version(row.RowVersion), hasCoachAllocation = row.CoachStaffAppointmentId.HasValue || row.CoachPersonId.HasValue,
                    appointmentId = coach?.publicId, coachName = coach?.name,
                    placements = placements.Count(item => item.GroupId == row.Id && item.Status == "Active") };
            }),
            students = students.Select(row =>
            {
                var history = latest[row.Id];
                var current = history.FirstOrDefault(item => item.Status == "Active");
                return new { id = row.publicId, row.name, groupId = current is null ? (Guid?)null : groupIds[current.GroupId],
                    version = PlacementVersion(history.FirstOrDefault()) };
            }),
            coaches = coaches.Select(row => new { id = row.publicId, row.name })
        });
    }

    [HttpPut("manage/{initiativeId:guid}/{groupId:guid}")]
    public async Task<IActionResult> Save(Guid initiativeId, Guid groupId, GroupInput input, CancellationToken ct)
    {
        var name = input.Name.Trim();
        if (groupId == Guid.Empty || name.Length == 0 || input.Status is not ("Open" or "Closed"))
            return BadRequest("Enter a group name and choose Open or Closed.");
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var initiative = await Lock(initiativeId, ct);
        var now = PersonalRecords.Now(clock);
        if (initiative is null || await Manager(initiative, actor, now, ct) is not { } role) return NotFound();
        var team = await InitiativeGroupRecords.Groups(db, initiative.Id).SingleOrDefaultAsync(row => row.PublicId == groupId, ct);
        var created = team is null;
        if (team is null)
        {
            if (input.Version is not null) return NotFound();
            if (input.Status != "Open") return BadRequest("New groups start open.");
            team = new OperationalGroup { PublicId = groupId, InitiativeId = initiative.Id, CreatedAtUtc = now };
            db.Add(team);
        }
        else
        {
            if (team.Status == "Archived") return Conflict("This group is archived.");
            if (input.Version != Version(team.RowVersion))
                return Conflict("This group changed. Reload it before saving.");
            if (input.Capacity is short capacity && await db.Set<GroupMembership>()
                    .CountAsync(item => item.GroupId == team.Id && item.Status == "Active", ct) > capacity)
                return Conflict("Capacity cannot be lower than the current number of placements.");
        }
        var before = created ? null : team.Status;
        team.Name = name;
        team.Purpose = input.Purpose?.Trim();
        team.Description = input.Description?.Trim();
        team.Capacity = input.Capacity;
        team.Status = input.Status;
        try
        {
            await db.SaveChangesAsync(ct);
            InitiativeGroupRecords.Audit(db, InitiativeGroupRecords.GroupResource, team.Id, actor, role,
                created ? "GroupCreated" : "GroupUpdated", before, team.Status, null, now, new { team.Name, team.Capacity });
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
        }
        catch (DbUpdateException ex) when (ex is DbUpdateConcurrencyException || ex.InnerException is SqlException { Number: 2601 or 2627 })
        {
            return Conflict("This group changed. Reload the groups before saving.");
        }
        return Ok(new { id = team.PublicId, version = Version(team.RowVersion) });
    }

    [HttpPut("manage/{initiativeId:guid}/students/{applicationId:guid}")]
    public async Task<IActionResult> Place(Guid initiativeId, Guid applicationId, PlacementInput input, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var initiative = await Lock(initiativeId, ct);
        var now = PersonalRecords.Now(clock);
        if (initiative is null || await Manager(initiative, actor, now, ct) is not { } role) return NotFound();
        var application = await db.Set<InitiativeApplication>().AsNoTracking().SingleOrDefaultAsync(row =>
            row.InitiativeId == initiative.Id && row.PublicId == applicationId, ct);
        if (application is null) return NotFound();
        if (application.Status != "Accepted" || !await db.Set<Person>().AnyAsync(person =>
                person.Id == application.PersonId && person.Status == "Active", ct))
            return Conflict("Only active, accepted students can be placed.");

        var placements = InitiativeGroupRecords.Placements(db, initiative.Id).Where(row => row.ApplicationId == application.Id);
        var latest = await placements.OrderByDescending(row => row.Id).FirstOrDefaultAsync(ct);
        var current = await placements.SingleOrDefaultAsync(row => row.Status == "Active", ct);
        OperationalGroup? destination = null;
        if (input.GroupId is Guid target)
        {
            destination = await InitiativeGroupRecords.Groups(db, initiative.Id).SingleOrDefaultAsync(row => row.PublicId == target, ct);
            if (destination is null) return NotFound();
        }
        if (current?.GroupId == destination?.Id) return Ok(new { groupId = input.GroupId, version = PlacementVersion(latest) });
        if (input.Version != PlacementVersion(latest)) return Conflict("This placement changed. Reload the groups before trying again.");
        if (destination is not null)
        {
            if (destination.Status != "Open") return Conflict("This group is closed for new placements.");
            if (await db.Set<GroupMembership>().AnyAsync(row => row.GroupId == destination.Id && row.PersonId == application.PersonId &&
                    (row.Status == "Active" || row.Status == "Pending"), ct))
                return Conflict("This student already has a record in the destination group.");
            if (destination.Capacity is short capacity && await db.Set<GroupMembership>()
                    .CountAsync(row => row.GroupId == destination.Id && row.Status == "Active", ct) >= capacity)
                return Conflict("This group is full.");
        }
        // The same Initiative lock also protects admissions. End the old row first to respect the filtered unique index.
        try
        {
            if (current is not null)
            {
                InitiativeGroupRecords.EndPlacement(db, current, actor, role, destination is null ? "Unallocated" : "Transferred", now);
                await db.SaveChangesAsync(ct);
                latest = current;
            }
            if (destination is not null)
            {
                latest = new GroupMembership
                {
                    GroupId = destination.Id, PersonId = application.PersonId, ApplicationId = application.Id,
                    Status = "Active", StartedAtUtc = now, CreatedAtUtc = now
                };
                db.Add(latest);
                await db.SaveChangesAsync(ct);
                InitiativeGroupRecords.Audit(db, InitiativeGroupRecords.PlacementResource, latest.Id, actor, role,
                    "PlacementStarted", null, "Active", current is null ? "Allocated" : "Transferred", now,
                    new { applicationId, groupId = destination.PublicId, previousPlacementId = current?.Id });
                await db.SaveChangesAsync(ct);
            }
            await transaction.CommitAsync(ct);
        }
        catch (DbUpdateException ex) when (ex is DbUpdateConcurrencyException || ex.InnerException is SqlException { Number: 2601 or 2627 })
        {
            return Conflict("This placement changed. Reload the groups before trying again.");
        }
        return Ok(new { groupId = input.GroupId, version = PlacementVersion(latest) });
    }

    [HttpPut("manage/{initiativeId:guid}/{groupId:guid}/coach")]
    public async Task<IActionResult> AllocateCoach(Guid initiativeId, Guid groupId, CoachInput input, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var initiative = await Lock(initiativeId, ct);
        var now = PersonalRecords.Now(clock);
        if (initiative is null || await Manager(initiative, actor, now, ct) is not { } role) return NotFound();
        var team = await InitiativeGroupRecords.Groups(db, initiative.Id).SingleOrDefaultAsync(row => row.PublicId == groupId, ct);
        if (team is null) return NotFound();
        if (team.Status == "Archived") return Conflict("This group is archived.");
        StaffAppointment? coach = null;
        if (input.AppointmentId is Guid appointmentId)
        {
            coach = await InitiativeStaffAccess.Active(db, "Coach", now).AsNoTracking().SingleOrDefaultAsync(row =>
                row.PublicId == appointmentId && row.InitiativeId == initiative.Id, ct);
            if (coach is null) return NotFound();
        }
        if (team.CoachStaffAppointmentId == coach?.Id && team.CoachPersonId == coach?.PersonId)
            return Ok(new { appointmentId = coach?.PublicId, version = Version(team.RowVersion) });
        if (input.Version != Version(team.RowVersion)) return Conflict("This group changed. Reload it before allocating a Coach.");
        if (coach is not null && team.Status != "Open") return Conflict("Open the group before allocating a Coach.");
        var previous = new { team.CoachPersonId, team.CoachStaffAppointmentId, team.CoachAssignedAtUtc };
        var oldName = await DisplayName(team.CoachPersonId, ct);
        var newName = await DisplayName(coach?.PersonId, ct);
        team.CoachPersonId = coach?.PersonId;
        team.CoachStaffAppointmentId = coach?.Id;
        team.CoachAssignedAtUtc = coach is null ? null : now;
        InitiativeGroupRecords.Audit(db, InitiativeGroupRecords.GroupResource, team.Id, actor, role,
            coach is null ? "CoachUnassigned" : "CoachAllocated", team.Status, team.Status,
            $"{oldName ?? "Unassigned"} → {newName ?? "Unassigned"}", now, new { previous, team.CoachPersonId, team.CoachStaffAppointmentId });
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Ok(new { appointmentId = coach?.PublicId, version = Version(team.RowVersion) });
    }

    [HttpGet("manage/{initiativeId:guid}/{groupId:guid}/history")]
    public async Task<IActionResult> History(Guid initiativeId, Guid groupId, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        var initiative = await db.Set<Initiative>().AsNoTracking().SingleOrDefaultAsync(row => row.PublicId == initiativeId, ct);
        if (initiative is null || await Manager(initiative, actor, PersonalRecords.Now(clock), ct, readOnly: true) is null) return NotFound();
        var team = await InitiativeGroupRecords.Groups(db, initiative.Id).AsNoTracking().SingleOrDefaultAsync(row => row.PublicId == groupId, ct);
        if (team is null) return NotFound();
        var placements = InitiativeGroupRecords.Placements(db, initiative.Id).Where(row => row.GroupId == team.Id);
        var audit = await (from entry in db.Set<AuditEvent>()
                           join person in db.Set<Person>() on entry.ActorPersonId equals (long?)person.Id into actors
                           from person in actors.DefaultIfEmpty()
                           where entry.ResourceKind == InitiativeGroupRecords.GroupResource && entry.ResourceId == team.Id ||
                               entry.ResourceKind == InitiativeGroupRecords.PlacementResource && placements.Any(row => row.Id == entry.ResourceId)
                           orderby entry.Id descending
                           select new { entry.Action, entry.ActorCapacity, actor = person == null ? null : person.DisplayName,
                               entry.AtUtc, entry.Reason, student = entry.ResourceKind == InitiativeGroupRecords.PlacementResource ?
                                 (from placement in placements
                                  join learner in db.Set<Person>() on placement.PersonId equals (long?)learner.Id
                                  where placement.Id == entry.ResourceId select learner.DisplayName).FirstOrDefault() : null }).ToListAsync(ct);
        var periods = await (from placement in placements
                             join person in db.Set<Person>() on placement.PersonId equals (long?)person.Id
                             orderby placement.Id descending
                             select new { student = person.DisplayName, placement.Status, placement.StartedAtUtc,
                                 placement.EndedAtUtc, placement.EndReason }).ToListAsync(ct);
        return Ok(new { team.Name, audit, periods });
    }

    private Task<Initiative?> Lock(Guid id, CancellationToken ct) =>
        InitiativeTerms.Lock(db, id).AsNoTracking().SingleOrDefaultAsync(row => row.PublicId == id, ct);

    private async Task<string?> Manager(Initiative initiative, long actor, DateTime now, CancellationToken ct, bool readOnly = false)
    {
        if (!readOnly && !await InitiativeStaffAccess.EligibleInitiatives(db, now).AnyAsync(row => row.Id == initiative.Id, ct)) return null;
        if (await InstitutionAccess.VerifiedInstitutions(db, actor).AnyAsync(row => row.Id == initiative.InstitutionId, ct))
            return "Representative";
        return await InitiativeStaffAccess.Active(db, actor, "Supervisor", now).AnyAsync(row => row.InitiativeId == initiative.Id, ct)
            ? "Supervisor" : null;
    }

    private Task<string?> DisplayName(long? id, CancellationToken ct) =>
        db.Set<Person>().Where(row => row.Id == id).Select(row => (string?)row.DisplayName).SingleOrDefaultAsync(ct);

    private static string Version(byte[] rowVersion) => Convert.ToBase64String(rowVersion);
    private static string? PlacementVersion(GroupMembership? placement) => placement is null ? null : Version(placement.RowVersion);
}
