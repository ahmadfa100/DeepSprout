using System.Data;
using DeepSprout.Domain.V5;
using DeepSprout.Infrastructure.V5;
using DeepSprout.Web.Models;
using DeepSprout.Web.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Web.Controllers;

[ApiController]
[Authorize]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[Route("api/initiative-gardens")]
public sealed class InitiativeGardenController(DeepSproutV5DbContext db, TimeProvider clock) : ControllerBase
{
    [HttpGet("{initiativeId:guid}/{role}")]
    public async Task<IActionResult> Read(Guid initiativeId, string role, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var initiative = await InitiativeWork.Lock(db, initiativeId, ct);
        var now = PersonalRecords.Now(clock);
        if (initiative?.CurrentRevisionId is not long revision || !await CanRead(initiative, actor, role, now, ct))
            return NotFound();

        var owner = await (from terms in db.Set<InitiativeRevision>()
                           join institution in db.Set<Organization>() on initiative.InstitutionId equals institution.Id
                           where terms.Id == revision && terms.InitiativeId == initiative.Id && terms.PublishedAtUtc <= now
                           select new { terms.Title, Institution = institution.Name, InstitutionId = institution.PublicId })
            .SingleOrDefaultAsync(ct);
        if (owner is null) return NotFound();

        var history = await Contributions(initiative.Id, now, ct);
        var current = history.Where(row => row.CorrectedAtUtc is null).ToArray();
        await transaction.CommitAsync(ct);
        return Ok(new
        {
            initiativeId, owner.Title, owner.Institution, owner.InstitutionId,
            contributionCount = current.Length,
            contributorCount = current.Select(row => row.PersonId).Distinct().Count(),
            contributingGroupCount = current.Select(row => row.GroupId).Distinct().Count(),
            history = history.Select(row => new { row.PracticeTitle, row.PracticeVersion,
                row.AssignmentRevision, row.ApprovedAtUtc, row.CorrectedAtUtc })
        });
    }

    private Task<bool> CanRead(Initiative initiative, long actor, string role, DateTime now, CancellationToken ct) => role switch
    {
        "Representative" => InstitutionAccess.VerifiedInstitutions(db, actor).AnyAsync(row => row.Id == initiative.InstitutionId, ct),
        "Supervisor" or "Coach" => InitiativeStaffAccess.Active(db, actor, role, now)
            .AnyAsync(row => row.InitiativeId == initiative.Id, ct),
        "Student" => InitiativeStaffAccess.EligibleInitiatives(db, now).AnyAsync(row => row.Id == initiative.Id &&
            db.Set<Person>().Any(person => person.Id == actor && person.Status == "Active") &&
            db.Set<InitiativeApplication>().Any(application => application.InitiativeId == row.Id &&
                application.PersonId == actor && application.Status == "Accepted" && application.AcceptedAtUtc <= now), ct),
        _ => Task.FromResult(false)
    };

    private async Task<List<Contribution>> Contributions(long initiative, DateTime now, CancellationToken ct)
    {
        var rows = await (from work in InitiativeWork.Assignments(db)
                          join recipient in db.Set<AssignmentRecipient>() on work.Task.Id equals recipient.AssignmentId
                          join submission in db.Set<SubmissionAttempt>() on recipient.Id equals submission.RecipientId
                          join attempt in db.Set<PracticeAttempt>().AsNoTracking() on submission.PracticeAttemptId equals (long?)attempt.Id
                          join version in db.Set<PracticeVersion>().AsNoTracking() on attempt.PracticeVersionId equals version.Id
                          join definition in db.Set<PracticeDefinition>().AsNoTracking() on version.DefinitionId equals definition.Id
                          join review in db.Set<ReviewDecision>() on submission.Id equals review.AttemptId
                          let correction = db.Set<ReviewDecision>().Where(next => next.SupersedesId == review.Id &&
                                  next.AttemptId == review.AttemptId && next.DecidedAtUtc >= review.DecidedAtUtc && next.DecidedAtUtc <= now)
                              .Select(next => (DateTime?)next.DecidedAtUtc).FirstOrDefault()
                          where work.Initiative.Id == initiative && work.Task.ReviewMode == "CoachReview" &&
                              work.Task.PracticeVersionId == version.Id && version.EvidenceTier == "SystemScored" &&
                              (work.Task.Status == "Published" || work.Task.Status == "Closed" ||
                               work.Task.Status == "Cancelled" && work.Task.CancelledAtUtc > review.DecidedAtUtc) &&
                              attempt.PersonId == recipient.PersonId && attempt.Source == "Assignment" && attempt.ScheduledActionId == null &&
                              attempt.Status == "Completed" && attempt.Valid == true && version.PublishedAtUtc <= attempt.StartedAtUtc &&
                              recipient.AssignedAtUtc <= attempt.StartedAtUtc && attempt.StartedAtUtc <= attempt.EndedAtUtc &&
                              attempt.EndedAtUtc <= submission.SubmittedAtUtc && submission.SubmittedAtUtc <= review.DecidedAtUtc &&
                              review.Decision == "Approved" && review.DecidedAtUtc <= now && review.ReviewerPersonId != recipient.PersonId &&
                              (correction != null || recipient.Status == "Approved" && recipient.LastAttemptNo == submission.AttemptNo) &&
                              InitiativeGroupRecords.Placements(db, initiative).Any(placement => placement.GroupId == work.Team.Id &&
                                  placement.PersonId == recipient.PersonId && placement.StartedAtUtc <= review.DecidedAtUtc &&
                                  (placement.Status == "Active" || placement.Status == "Ended" || placement.Status == "Revoked") &&
                                  (placement.EndedAtUtc == null || placement.EndedAtUtc >= review.DecidedAtUtc) &&
                                  db.Set<InitiativeApplication>().Any(application => application.Id == placement.ApplicationId &&
                                      application.AcceptedAtUtc <= placement.StartedAtUtc &&
                                      (application.EndedAtUtc == null || application.EndedAtUtc >= review.DecidedAtUtc)))
                          orderby review.DecidedAtUtc descending, review.Id descending
                          select new { Team = work.Team, recipient.PersonId, recipient.AssignedRevisionNo, Attempt = attempt,
                              Version = version, Definition = definition, review.DecidedAtUtc, review.ReviewerPersonId, Correction = correction })
            .ToListAsync(ct);
        if (rows.Count == 0) return [];

        var staff = await db.Set<StaffAppointment>().AsNoTracking().Where(row => row.InitiativeId == initiative &&
            row.ExperienceId == null && row.Role == "Coach" && row.AcceptedAtUtc != null &&
            (row.Status == "Active" || row.Status == "Revoked" && row.EndedAtUtc != null)).ToDictionaryAsync(row => row.Id, ct);
        var groupIds = rows.Select(row => row.Team.Id).Distinct().ToArray();
        var audits = await db.Set<AuditEvent>().AsNoTracking().Where(row => groupIds.Contains(row.ResourceId) &&
            row.ResourceKind == InitiativeGroupRecords.GroupResource && (row.Action == "CoachAllocated" || row.Action == "CoachUnassigned"))
            .OrderByDescending(row => row.AtUtc).ThenByDescending(row => row.Id).ToListAsync(ct);
        var changes = audits.ToLookup(row => row.ResourceId);
        var contributions = new List<Contribution>();
        // A practice attempt is linked to at most one submission in V5. Use its latest effective review for growth.
        var counted = new HashSet<long>();
        foreach (var row in rows)
        {
            var appointment = CoachAt(row.Team, row.DecidedAtUtc, changes[row.Team.Id]);
            if (!appointment.HasValue || !staff.TryGetValue(appointment.Value, out var coach) ||
                coach.PersonId != row.ReviewerPersonId || coach.AcceptedAtUtc > row.DecidedAtUtc ||
                coach.EndedAtUtc < row.DecidedAtUtc) continue;

            var exercise = PracticeExercise.Read(row.Version.ContentJson);
            if (exercise is null || !PracticeCatalog.MatchesDefinition(exercise, row.Definition) ||
                exercise.Result(row.Attempt)?.RewardEligible != true ||
                exercise.Interactive && row.Attempt.ScoreValue < PracticeCatalog.PassingScore) continue;
            if (row.Correction is null && !counted.Add(row.Attempt.Id)) continue;
            contributions.Add(new Contribution(row.PersonId, row.Team.Id, exercise.Title, exercise.ContentVersion,
                row.AssignedRevisionNo, InitiativeWork.Utc(row.DecidedAtUtc)!.Value, InitiativeWork.Utc(row.Correction)));
        }
        return contributions;
    }

    private static long? CoachAt(OperationalGroup group, DateTime at, IEnumerable<AuditEvent> changes)
    {
        // Allocation changes record both sides so replacing a Coach does not change earlier evidence.
        var latest = changes.FirstOrDefault(change => change.AtUtc <= at);
        if (latest is not null) return InitiativeWork.Read<Allocation>(latest.DetailJson)?.CoachStaffAppointmentId;
        var first = changes.LastOrDefault();
        if (first is not null)
        {
            var previous = InitiativeWork.Read<Allocation>(first.DetailJson)?.Previous;
            return previous?.CoachAssignedAtUtc <= at ? previous.CoachStaffAppointmentId : null;
        }
        return group.CoachAssignedAtUtc <= at ? group.CoachStaffAppointmentId : null;
    }

    private sealed record Allocation(long? CoachStaffAppointmentId, PriorAllocation? Previous);
    private sealed record PriorAllocation(long? CoachStaffAppointmentId, DateTime? CoachAssignedAtUtc);
    private sealed record Contribution(long PersonId, long GroupId, string PracticeTitle, string PracticeVersion,
        int AssignmentRevision, DateTime ApprovedAtUtc, DateTime? CorrectedAtUtc);
}
