using System.Text.Json;
using DeepSprout.Domain.V5;
using DeepSprout.Infrastructure.V5;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Web.Services;

internal static class InitiativeGroupRecords
{
    internal const string GroupResource = "coach.OperationalGroup";
    internal const string PlacementResource = "coach.GroupMembership";

    internal static IQueryable<OperationalGroup> Groups(DeepSproutV5DbContext db, long initiativeId) =>
        db.Set<OperationalGroup>().Where(item => item.InitiativeId == initiativeId && item.ProgramId == null);

    // Match both the original application and its Person even for records created before this workflow.
    internal static IQueryable<GroupMembership> Placements(DeepSproutV5DbContext db, long initiativeId) =>
        from placement in db.Set<GroupMembership>()
        join team in Groups(db, initiativeId) on placement.GroupId equals team.Id
        join application in db.Set<InitiativeApplication>()
            on new { Id = placement.ApplicationId, placement.PersonId }
            equals new { Id = (long?)application.Id, PersonId = (long?)application.PersonId }
        where application.InitiativeId == initiativeId
        select placement;

    internal static IQueryable<GroupMembership> CurrentStudents(DeepSproutV5DbContext db, long initiativeId) =>
        from placement in Placements(db, initiativeId)
        join application in db.Set<InitiativeApplication>() on placement.ApplicationId equals (long?)application.Id
        join person in db.Set<Person>() on placement.PersonId equals (long?)person.Id
        where placement.Status == "Active" && placement.EndedAtUtc == null &&
            application.Status == "Accepted" && person.Status == "Active"
        select placement;

    internal static async Task EndForAdmission(DeepSproutV5DbContext db, InitiativeApplication application,
        long actor, string capacity, DateTime now, CancellationToken ct)
    {
        var placements = await Placements(db, application.InitiativeId)
            .Where(item => item.ApplicationId == application.Id && item.Status == "Active").ToListAsync(ct);
        foreach (var placement in placements)
            EndPlacement(db, placement, actor, capacity, application.Status, now);
    }

    internal static void EndPlacement(DeepSproutV5DbContext db, GroupMembership placement, long actor, string capacity,
        string reason, DateTime now)
    {
        placement.Status = "Ended";
        placement.EndedAtUtc = now;
        placement.EndReason = reason;
        Audit(db, PlacementResource, placement.Id, actor, capacity, "PlacementEnded", "Active", "Ended", reason, now);
    }

    internal static void Audit(DeepSproutV5DbContext db, string kind, long id, long actor, string capacity, string action,
        string? before, string after, string? reason, DateTime now, object? details = null) =>
        db.Add(new AuditEvent
        {
            ActorPersonId = actor, ActorCapacity = capacity, ResourceKind = kind, ResourceId = id, Action = action,
            BeforeStatus = before, AfterStatus = after, Reason = reason, AtUtc = now, CreatedAtUtc = now,
            DetailJson = details is null ? null : JsonSerializer.Serialize(details)
        });
}
