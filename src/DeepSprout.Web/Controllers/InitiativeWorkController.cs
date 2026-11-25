using System.ComponentModel.DataAnnotations;
using System.Data;
using System.Text.Json;
using DeepSprout.Domain.V5;
using DeepSprout.Infrastructure.V5;
using DeepSprout.Web.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using static DeepSprout.Web.Services.InitiativeWork;

namespace DeepSprout.Web.Controllers;

[ApiController]
[Authorize]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[Route("api/initiative-work")]
public sealed class InitiativeWorkController(DeepSproutV5DbContext db, TimeProvider clock) : ControllerBase
{
    public sealed record AssignmentInput(Guid GroupId, [Required, MaxLength(200)] string Title,
        [Required, MaxLength(8000)] string Instructions, DateTimeOffset? StartsAtUtc, DateTimeOffset? DueAtUtc,
        bool IsRequired, bool AllowLate, Guid[]? StudentApplicationIds, string? Version, [MaxLength(800)] string? Reason);
    public sealed record CancelInput(string? Version, [Required, MaxLength(800)] string Reason);
    public sealed record WorkInput(int ExpectedAttemptNo, int RevisionNo, [MaxLength(12000)] string? Body);
    public sealed record ReviewInput(int AttemptNo, [Required] string Decision, [MaxLength(2000)] string? Feedback,
        [MaxLength(4000)] string? PrivateNote);

    [HttpGet("coach/{initiativeId:guid}")]
    public async Task<IActionResult> Coach(Guid initiativeId, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        var now = PersonalRecords.Now(clock);
        var initiative = await db.Set<Initiative>().AsNoTracking().SingleOrDefaultAsync(item => item.PublicId == initiativeId, ct);
        if (initiative is null || !await InitiativeStaffAccess.Active(db, actor, "Coach", now)
                .AnyAsync(item => item.InitiativeId == initiative.Id, ct)) return NotFound();
        var assigned = InitiativeStaffAccess.CoachGroups(db, actor, initiativeId, now);
        var groups = await assigned.OrderBy(item => item.Name).Select(item => new { id = item.PublicId, item.Name, item.Status }).ToListAsync(ct);
        var current = InitiativeGroupRecords.CurrentStudents(db, initiative.Id);
        var students = await (from membership in current
                              join team in assigned on membership.GroupId equals team.Id
                              join application in db.Set<InitiativeApplication>() on membership.ApplicationId equals (long?)application.Id
                              join person in db.Set<Person>() on membership.PersonId equals (long?)person.Id
                              orderby person.DisplayName
                              select new { id = application.PublicId, groupId = team.PublicId, name = person.DisplayName }).ToListAsync(ct);
        var rows = await Assignments(db).Where(row => row.Initiative.Id == initiative.Id && assigned.Any(team => team.Id == row.Team.Id))
            .OrderByDescending(row => row.Task.Id).ToListAsync(ct);
        var recipients = await (from target in db.Set<AssignmentRecipient>().AsNoTracking()
                                join task in db.Set<Assignment>() on target.AssignmentId equals task.Id
                                join team in assigned on task.GroupId equals team.Id
                                join person in db.Set<Person>() on target.PersonId equals person.Id
                                where current.Any(item => item.GroupId == team.Id && item.PersonId == target.PersonId) &&
                                      (task.Status != "Draft" || task.AuthorPersonId == actor)
                                select new { target.AssignmentId, recipientId = target.Id, student = person.DisplayName, target.Status,
                                    target.LastAttemptNo }).ToListAsync(ct);
        var byAssignment = recipients.ToLookup(item => item.AssignmentId);
        return Ok(new
        {
            groups, students, assignments = rows.Where(row => row.Task.Status != "Draft" || row.Task.AuthorPersonId == actor).Select(row =>
            {
                var work = byAssignment[row.Task.Id];
                return new { id = row.Task.PublicId, groupId = row.Team.PublicId, groupName = row.Team.Name, row.Author,
                    row.Task.Status, version = Version(row.Task.RowVersion), terms = Snapshot(row.Task), history = History(row.Task),
                    row.Task.CancelReason, canEdit = row.Task.AuthorPersonId == actor && row.Task.Status == "Published" &&
                        row.Task.PracticeVersionId == null && row.Task.DueAtUtc > now && work.All(item => item.Status == "Assigned"),
                    canCancel = row.Task.AuthorPersonId == actor && row.Task.Status == "Published", recipients = work };
            })
        });
    }

    [HttpPut("coach/{initiativeId:guid}/{id:guid}")]
    [RequestSizeLimit(65536)]
    public async Task<IActionResult> Save(Guid initiativeId, Guid id, AssignmentInput input, CancellationToken ct)
    {
        var title = input.Title.Trim();
        var instructions = input.Instructions.Trim();
        if (id == Guid.Empty || title.Length == 0 || instructions.Length == 0)
            return BadRequest("Enter a title and instructions.");
        if (input.StudentApplicationIds?.Length > 135) return BadRequest("Choose up to 135 accepted students.");
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var initiative = await Lock(db, initiativeId, ct);
        var now = PersonalRecords.Now(clock);
        if (initiative is null) return NotFound();
        var team = await InitiativeStaffAccess.CoachGroups(db, actor, initiativeId, now)
            .SingleOrDefaultAsync(row => row.PublicId == input.GroupId && row.Status == "Open", ct);
        if (team is null) return NotFound();
        var ends = await db.Set<InitiativeRevision>().Where(row => row.Id == initiative.CurrentRevisionId && row.InitiativeId == initiative.Id)
            .Select(row => row.EndsAtUtc).SingleAsync(ct);
        var starts = input.StartsAtUtc?.UtcDateTime;
        var due = input.DueAtUtc?.UtcDateTime;
        if (due is null || due <= now || due > ends || starts >= due)
            return BadRequest("Choose a future deadline within the Initiative, after the scheduled start.");
        var task = await db.Set<Assignment>().SingleOrDefaultAsync(row => row.PublicId == id && row.GroupId == team.Id, ct);
        var created = task is null;
        List<AssignmentRecipient> recipients = [];
        long[] people = [];
        if (task is null)
        {
            if (input.Version is not null) return NotFound();
            var requested = input.StudentApplicationIds?.Distinct().ToArray();
            var eligible = from membership in InitiativeGroupRecords.CurrentStudents(db, initiative.Id)
                           join application in db.Set<InitiativeApplication>() on membership.ApplicationId equals (long?)application.Id
                           where membership.GroupId == team.Id
                           select new { application.PublicId, application.PersonId };
            if (requested is not null) eligible = eligible.Where(row => requested.Contains(row.PublicId));
            people = await eligible.Select(row => row.PersonId).Distinct().ToArrayAsync(ct);
            if (people.Length == 0 || requested is not null && requested.Length != people.Length)
                return BadRequest("Choose accepted students currently placed in this group.");
            task = new Assignment { PublicId = id, GroupId = team.Id, AuthorPersonId = actor, Status = "Published",
                RevisionNo = 1, ReviewMode = "CoachReview", CreatedAtUtc = now };
            db.Add(task);
        }
        else
        {
            if (task.AuthorPersonId != actor) return NotFound();
            if (input.Version != Version(task.RowVersion)) return Conflict("This assignment changed. Reload it before editing.");
            var reason = input.Reason?.Trim();
            if (string.IsNullOrEmpty(reason)) return BadRequest("Give a reason for editing or rescheduling.");
            if (input.StudentApplicationIds is not null) return BadRequest("The original recipients are fixed after publication.");
            recipients = await db.Set<AssignmentRecipient>().Where(row => row.AssignmentId == task.Id).ToListAsync(ct);
            if (task.Status != "Published" || task.PracticeVersionId != null || task.DueAtUtc <= now ||
                recipients.Any(row => row.Status != "Assigned"))
                return Conflict("Only future work that students have not started can be edited.");
            var history = Read<List<Terms>>(task.HistoryJson);
            if (task.HistoryJson is not null && history is null)
                return Conflict("This assignment has an earlier history format and cannot be edited here.");
            history ??= [];
            history.Add(Snapshot(task, reason, now));
            task.HistoryJson = JsonSerializer.Serialize(history, Json);
            task.RevisionNo++;
            foreach (var recipient in recipients) recipient.AssignedRevisionNo = task.RevisionNo;
        }
        task.Title = title;
        task.Instructions = instructions;
        task.StartsAtUtc = starts;
        task.DueAtUtc = due;
        task.IsRequired = input.IsRequired;
        task.AllowLate = input.AllowLate;
        try
        {
            await db.SaveChangesAsync(ct);
            if (created)
                foreach (var person in people)
                    db.Add(new AssignmentRecipient { AssignmentId = task.Id, PersonId = person, Status = "Assigned",
                        AssignedRevisionNo = task.RevisionNo, AssignedAtUtc = now, CreatedAtUtc = now });
            Audit(db, AssignmentResource, task.Id, actor, "Coach", created ? "AssignmentPublished" : "AssignmentRevised",
                created ? null : task.Status, task.Status, input.Reason?.Trim(), now, new { task.RevisionNo });
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
        }
        catch (DbUpdateException ex) when (ex is DbUpdateConcurrencyException || ex.InnerException is SqlException { Number: 2601 or 2627 })
        {
            return Conflict("This assignment changed or already exists. Reload the assignments.");
        }
        return Ok(new { id, version = Version(task.RowVersion), task.RevisionNo });
    }

    [HttpPost("coach/{initiativeId:guid}/{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid initiativeId, Guid id, CancelInput input, CancellationToken ct)
    {
        var reason = input.Reason.Trim();
        if (reason.Length == 0) return BadRequest("Give a cancellation reason.");
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (await Lock(db, initiativeId, ct) is null) return NotFound();
        var now = PersonalRecords.Now(clock);
        var assigned = InitiativeStaffAccess.CoachGroups(db, actor, initiativeId, now);
        var task = await db.Set<Assignment>().SingleOrDefaultAsync(row => row.PublicId == id && row.AuthorPersonId == actor &&
            assigned.Any(team => team.Id == row.GroupId), ct);
        if (task is null) return NotFound();
        if (task.Status == "Cancelled") return Ok(new { task.Status });
        if (task.Status != "Published" || input.Version != Version(task.RowVersion)) return Conflict("Reload this assignment before cancelling.");
        task.Status = "Cancelled";
        task.CancelReason = reason;
        task.CancelledAtUtc = now;
        var recipients = await db.Set<AssignmentRecipient>().Where(row => row.AssignmentId == task.Id &&
            (row.Status == "Assigned" || row.Status == "InProgress" || row.Status == "NeedsRevision" || row.Status == "Submitted")).ToListAsync(ct);
        foreach (var row in recipients)
        {
            Audit(db, RecipientResource, row.Id, actor, "Coach", "WorkCancelled", row.Status, "Cancelled", reason, now);
            row.Status = "Cancelled";
        }
        Audit(db, AssignmentResource, task.Id, actor, "Coach", "AssignmentCancelled", "Published", "Cancelled", reason, now);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Ok(new { task.Status });
    }

    [HttpGet("mine")]
    public async Task<IActionResult> Mine([FromQuery] Guid? initiative, [FromQuery] Guid? id, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        var now = PersonalRecords.Now(clock);
        var eligible = InitiativeStaffAccess.EligibleInitiatives(db, now);
        var rows = await (from recipient in db.Set<AssignmentRecipient>().AsNoTracking()
                          join record in Assignments(db) on recipient.AssignmentId equals record.Task.Id
                          where recipient.PersonId == actor && record.Task.Status != "Draft" &&
                              (!initiative.HasValue || record.Initiative.PublicId == initiative.Value) &&
                              (!id.HasValue || record.Task.PublicId == id.Value)
                          orderby record.Task.Id descending
                          select new { recipient, record }).ToListAsync(ct);
        if (id.HasValue && rows.Count == 0) return NotFound();
        var initiativeIds = rows.Select(item => item.record.Initiative.Id).Distinct().ToArray();
        var liveInitiatives = await eligible.Where(row => initiativeIds.Contains(row.Id)).Select(row => row.Id).ToListAsync(ct);
        var activeGroups = new HashSet<long>();
        foreach (var live in liveInitiatives)
        {
            var current = await InitiativeGroupRecords.CurrentStudents(db, live).Where(row => row.PersonId == actor)
                .Select(row => row.GroupId).ToListAsync(ct);
            activeGroups.UnionWith(current);
        }
        var attempts = await Attempts(rows.Select(item => item.recipient.Id).ToArray(), false, false, actor, ct);
        var response = new List<object>();
        foreach (var item in rows)
        {
            var r = item.recipient;
            var row = item.record;
            var task = row.Task;
            var terms = task.RevisionNo == r.AssignedRevisionNo ? Snapshot(task) :
                History(task).FirstOrDefault(version => version.RevisionNo == r.AssignedRevisionNo);
            if (terms is null) continue;
            var active = row.Team.Status != "Archived" && activeGroups.Contains(row.Team.Id);
            response.Add(new { id = task.PublicId, initiativeId = row.Initiative.PublicId, groupName = row.Team.Name, row.Author,
                r.Status, r.LastAttemptNo, terms, attempts = attempts[r.Id], task.CancelReason, assignmentStatus = task.Status,
                canWork = active && CanRespond(task, r, now), overdue = active && task.Status == "Published" && task.DueAtUtc < now &&
                    r.Status is "Assigned" or "InProgress" or "NeedsRevision" });
        }
        return Ok(response);
    }

    [HttpPost("mine/{initiativeId:guid}/{id:guid}/{step}")]
    [RequestSizeLimit(65536)]
    public async Task<IActionResult> Work(Guid initiativeId, Guid id, string step, WorkInput input, CancellationToken ct)
    {
        if (step is not ("start" or "submit")) return NotFound();
        var body = input.Body?.Trim();
        if (step == "submit" && string.IsNullOrEmpty(body)) return BadRequest("Write a response before submitting.");
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var initiative = await Lock(db, initiativeId, ct);
        var now = PersonalRecords.Now(clock);
        if (initiative is null || !await InitiativeStaffAccess.EligibleInitiatives(db, now).AnyAsync(row => row.Id == initiative.Id, ct))
            return NotFound();
        var row = await Assignments(db).SingleOrDefaultAsync(item => item.Task.PublicId == id && item.Initiative.Id == initiative.Id &&
            item.Team.Status != "Archived" && item.Task.Status != "Draft", ct);
        if (row is null || !await CurrentStudent(row.Team.Id, initiative.Id, actor, ct)) return NotFound();
        var task = row.Task;
        var recipient = await db.Set<AssignmentRecipient>().SingleOrDefaultAsync(item => item.AssignmentId == task.Id && item.PersonId == actor, ct);
        if (recipient is null) return NotFound();
        if (input.RevisionNo != recipient.AssignedRevisionNo || input.ExpectedAttemptNo < 0)
            return Conflict("Reload this assignment before continuing.");
        if (step == "submit" && recipient.LastAttemptNo > 0 && recipient.LastAttemptNo - 1 == input.ExpectedAttemptNo &&
            await db.Set<SubmissionAttempt>().AnyAsync(item => item.RecipientId == recipient.Id &&
                item.AttemptNo == recipient.LastAttemptNo && item.Body == body, ct))
            return Ok(new { recipient.Status, recipient.LastAttemptNo });
        if (input.ExpectedAttemptNo != recipient.LastAttemptNo || !CanRespond(task, recipient, now))
            return Conflict("The assignment is unavailable for this action. Check its status and deadline.");
        var before = recipient.Status;
        if (step == "start")
        {
            if (before != "Assigned") return Ok(new { recipient.Status, recipient.LastAttemptNo });
            recipient.Status = "InProgress";
        }
        else
        {
            recipient.LastAttemptNo++;
            db.Add(new SubmissionAttempt { RecipientId = recipient.Id, AttemptNo = recipient.LastAttemptNo, Body = body,
                SubmittedAtUtc = now, CreatedAtUtc = now });
            recipient.Status = "Submitted";
        }
        Audit(db, RecipientResource, recipient.Id, actor, "Student", step == "start" ? "WorkStarted" : "WorkSubmitted",
            before, recipient.Status, null, now, new { recipient.LastAttemptNo, recipient.AssignedRevisionNo });
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Ok(new { recipient.Status, recipient.LastAttemptNo });
    }

    [HttpGet("review/{initiativeId:guid}/{id:guid}/{recipientId:long}")]
    public async Task<IActionResult> ReviewDetail(Guid initiativeId, Guid id, long recipientId, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        var now = PersonalRecords.Now(clock);
        var row = await Assignments(db).SingleOrDefaultAsync(item => item.Task.PublicId == id && item.Initiative.PublicId == initiativeId &&
            item.Task.Status != "Draft", ct);
        if (row is null) return NotFound();
        var supervisor = await Supervisor(db, actor, row.Initiative.Id, now, ct);
        var assigned = await InitiativeStaffAccess.CoachGroups(db, actor, initiativeId, now).AnyAsync(team => team.Id == row.Team.Id, ct);
        if (!supervisor && !assigned) return NotFound();
        var recipient = await db.Set<AssignmentRecipient>().AsNoTracking().SingleOrDefaultAsync(item => item.Id == recipientId &&
            item.AssignmentId == row.Task.Id, ct);
        if (recipient is null) return NotFound();
        var currentStudent = await CurrentStudent(row.Team.Id, row.Initiative.Id, recipient.PersonId, ct);
        if (!supervisor && !currentStudent) return NotFound();
        var student = await db.Set<Person>().Where(item => item.Id == recipient.PersonId).Select(item => item.DisplayName).SingleAsync(ct);
        var attempts = await Attempts([recipientId], supervisor, assigned, actor, ct);
        return Ok(new { id, recipientId, student, groupName = row.Team.Name, terms = Snapshot(row.Task), recipient.Status,
            recipient.LastAttemptNo, canReview = assigned && currentStudent && row.Task.Status == "Published" &&
                recipient.Status == "Submitted" && recipient.PersonId != actor,
            attempts = attempts[recipientId] });
    }

    [HttpPost("review/{initiativeId:guid}/{id:guid}/{recipientId:long}")]
    [RequestSizeLimit(65536)]
    public async Task<IActionResult> Review(Guid initiativeId, Guid id, long recipientId, ReviewInput input, CancellationToken ct)
    {
        var feedback = input.Feedback?.Trim();
        if (input.Decision is not ("Approved" or "NeedsRevision" or "Rejected") || input.AttemptNo < 1)
            return BadRequest("Choose a supported review decision.");
        if (input.Decision != "Approved" && string.IsNullOrEmpty(feedback)) return BadRequest("Explain the decision to the student.");
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var initiative = await Lock(db, initiativeId, ct);
        if (initiative is null) return NotFound();
        var now = PersonalRecords.Now(clock);
        var assigned = InitiativeStaffAccess.CoachGroups(db, actor, initiativeId, now);
        var task = await db.Set<Assignment>().AsNoTracking().SingleOrDefaultAsync(row => row.PublicId == id &&
            assigned.Any(team => team.Id == row.GroupId), ct);
        if (task is null) return NotFound();
        var recipient = await db.Set<AssignmentRecipient>().SingleOrDefaultAsync(item => item.Id == recipientId &&
            item.AssignmentId == task.Id && item.PersonId != actor, ct);
        if (recipient is null || !await CurrentStudent(task.GroupId, initiative.Id, recipient.PersonId, ct)) return NotFound();
        if (task.Status != "Published" || task.ReviewMode != "CoachReview" || recipient.Status != "Submitted" ||
            recipient.LastAttemptNo != input.AttemptNo) return Conflict("This attempt is no longer waiting for a decision.");
        var attempt = await db.Set<SubmissionAttempt>().AsNoTracking().SingleOrDefaultAsync(row =>
            row.RecipientId == recipient.Id && row.AttemptNo == input.AttemptNo, ct);
        if (attempt is null || await db.Set<ReviewDecision>().AnyAsync(row => row.AttemptId == attempt.Id, ct))
            return Conflict("A decision already exists or the attempt is unavailable.");
        if (input.Decision == "Approved" && task.PracticeVersionId is long practice &&
            !await db.Set<PracticeAttempt>().AnyAsync(row => row.Id == attempt.PracticeAttemptId && row.PersonId == recipient.PersonId &&
                row.PracticeVersionId == practice && row.Source == "Assignment" && row.Status == "Completed" &&
                row.Valid == true && row.EndedAtUtc <= now, ct))
            return Conflict("Approval of this historical practice requires verified assignment evidence.");
        db.Add(new ReviewDecision { AttemptId = attempt.Id, ReviewerPersonId = actor, Decision = input.Decision,
            Feedback = feedback, PrivateNote = input.PrivateNote?.Trim(), DecidedAtUtc = now, CreatedAtUtc = now });
        Audit(db, RecipientResource, recipient.Id, actor, "Coach", "WorkReviewed", recipient.Status, input.Decision, null, now,
            new { attemptId = attempt.Id, attempt.AttemptNo });
        recipient.Status = input.Decision;
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Ok(new { recipient.Status });
    }

    private Task<bool> CurrentStudent(long groupId, long initiative, long person, CancellationToken ct) =>
        InitiativeGroupRecords.CurrentStudents(db, initiative).AnyAsync(row => row.GroupId == groupId && row.PersonId == person, ct);

    private async Task<ILookup<long, object>> Attempts(long[] recipients, bool supervisor, bool coach, long actor, CancellationToken ct)
    {
        var attempts = await db.Set<SubmissionAttempt>().AsNoTracking().Where(item => recipients.Contains(item.RecipientId))
            .OrderBy(item => item.AttemptNo).Select(item => new { item.Id, item.RecipientId, item.AttemptNo, item.Body, item.SubmittedAtUtc }).ToListAsync(ct);
        var ids = attempts.Select(item => item.Id).ToArray();
        var decisions = await (from review in db.Set<ReviewDecision>().AsNoTracking()
                               join person in db.Set<Person>() on review.ReviewerPersonId equals person.Id
                               where ids.Contains(review.AttemptId)
                               orderby review.Id
                               select new { review.AttemptId, review.Decision, review.Feedback, review.DecidedAtUtc,
                                   reviewer = person.DisplayName, privateNote = supervisor || coach && review.ReviewerPersonId == actor
                                       ? review.PrivateNote : null }).ToListAsync(ct);
        var byAttempt = decisions.ToLookup(item => item.AttemptId);
        return attempts.ToLookup(item => item.RecipientId, item => (object)new { item.AttemptNo, item.Body, submittedAtUtc = Utc(item.SubmittedAtUtc),
            reviews = byAttempt[item.Id].Select(review => supervisor || coach ?
                (object)new { review.Decision, review.Feedback, review.reviewer, decidedAtUtc = Utc(review.DecidedAtUtc), review.privateNote } :
                new { review.Decision, review.Feedback, review.reviewer, decidedAtUtc = Utc(review.DecidedAtUtc) }) });
    }
}
