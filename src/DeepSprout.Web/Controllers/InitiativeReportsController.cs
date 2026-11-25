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
[Route("api/initiative-reports")]
public sealed class InitiativeReportsController(DeepSproutV5DbContext db, TimeProvider clock) : ControllerBase
{
    private const string Resource = "task.OperationalReport";
    private sealed record Narrative(string? Observations, string? Issues, string? Recommendations);
    private sealed record ReviewNotes(string? Note, string? Correction);
    public sealed record ReportInput(Guid? GroupId, DateOnly From, DateOnly To, [MaxLength(4000)] string? Observations,
        [MaxLength(4000)] string? Issues, [MaxLength(4000)] string? Recommendations, bool Submit, string? Version,
        Guid[]? CoachReportIds);
    public sealed record ReportReview(string? Version, [MaxLength(2000)] string? Note, [MaxLength(2000)] string? Correction);
    private sealed record Source(Guid AssignmentId, string Title, Guid GroupId, string GroupName, DateTime? DueAtUtc,
        string AssignmentStatus, long RecipientId, string Student, string Status, int Attempts, bool CanReview);
    private sealed record Metrics(int Assignments, int AssignedTasks, int SubmittedTasks, int ApprovedTasks, int PendingReviews,
        int NeedsRevision, int Rejected, int Overdue, int Cancelled);
    private sealed record Snapshot(Metrics Metrics, Guid[] AssignmentIds, DateTime? AsOfUtc);

    [HttpGet("{role}/{initiativeId:guid}")]
    public async Task<IActionResult> Index(string role, Guid initiativeId, [FromQuery] DateOnly? from, [FromQuery] DateOnly? to,
        [FromQuery] Guid? group, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        var now = PersonalRecords.Now(clock);
        var initiative = await db.Set<Initiative>().AsNoTracking().SingleOrDefaultAsync(row => row.PublicId == initiativeId, ct);
        if (initiative is null || !await Allowed(role, actor, initiative, now, ct)) return NotFound();
        var end = to ?? DateOnly.FromDateTime(now);
        var start = from ?? end.AddDays(-Math.Min(29, end.DayNumber));
        if (!ValidPeriod(start, end, now)) return BadRequest("Choose a reporting period ending today or earlier.");
        var groups = ScopedGroups(role, initiative, actor, now);
        if (group.HasValue && !await groups.AnyAsync(row => row.PublicId == group, ct)) return NotFound();
        var sources = await SourceRows(groups, initiative.Id, start, end, group, ct);
        var reports = await Reports(role, initiative, groups, actor).OrderByDescending(row => row.Id).ToListAsync(ct);
        var names = await groups.ToDictionaryAsync(row => row.Id, row => new { row.Name, row.PublicId }, ct);
        var authors = await db.Set<Person>().Where(row => reports.Select(report => report.AuthorPersonId).Contains(row.Id))
            .ToDictionaryAsync(row => row.Id, row => row.DisplayName, ct);
        var reportIds = reports.ToDictionary(row => row.Id, row => row.PublicId);
        return Ok(new
        {
            from = start, to = end, metrics = Count(sources, now),
            groups = names.Values.Select(row => new { id = row.PublicId, row.Name }),
            records = role == "Supervisor" ? sources : null,
            reports = reports.Select(row => new
            {
                id = row.PublicId, row.Kind, row.Status, author = authors.GetValueOrDefault(row.AuthorPersonId),
                groupId = row.GroupId is long team && names.TryGetValue(team, out var found) ? found.PublicId : (Guid?)null,
                groupName = row.GroupId is long teamId && names.TryGetValue(teamId, out var name) ? name.Name : null,
                from = row.PeriodStartDate, to = row.PeriodEndDate, version = Version(row.RowVersion),
                submittedAtUtc = Utc(row.SubmittedAtUtc), reviewedAtUtc = Utc(row.ReviewedAtUtc),
                isIncluded = row.IncludedInReportId.HasValue,
                includedIn = row.IncludedInReportId is long parent && reportIds.TryGetValue(parent, out var parentId) ? parentId : (Guid?)null,
                snapshot = Read<Snapshot>(row.MetricsSnapshotJson), narrative = Read<Narrative>(row.BodyJson),
                review = Read<ReviewNotes>(row.ReviewJson), canEdit = actor == row.AuthorPersonId && row.Status == "Draft"
            })
        });
    }

    [HttpPut("{role}/{initiativeId:guid}/{id:guid}")]
    [RequestSizeLimit(65536)]
    public async Task<IActionResult> Save(string role, Guid initiativeId, Guid id, ReportInput input, CancellationToken ct)
    {
        if (role is not ("Coach" or "Supervisor") || id == Guid.Empty) return NotFound();
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var initiative = await Lock(db, initiativeId, ct);
        var now = PersonalRecords.Now(clock);
        if (initiative is null || !await Allowed(role, actor, initiative, now, ct)) return NotFound();
        if (!ValidPeriod(input.From, input.To, now)) return BadRequest("Choose a reporting period ending today or earlier.");
        if (input.Submit && string.IsNullOrWhiteSpace(input.Observations))
            return BadRequest("Enter your observations or summary before submitting.");
        var groups = ScopedGroups(role, initiative, actor, now);
        long? groupId = null;
        if (role == "Coach")
        {
            groupId = await groups.Where(row => row.PublicId == input.GroupId).Select(row => (long?)row.Id).SingleOrDefaultAsync(ct);
            if (!groupId.HasValue) return NotFound();
        }
        else if (input.GroupId.HasValue) return BadRequest("Supervisor summaries cover the Initiative.");
        var scope = InitiativeReports(initiative.Id);
        var kind = role == "Coach" ? "Coach" : "InitiativeSupervisor";
        var report = await scope.SingleOrDefaultAsync(row => row.PublicId == id && row.Kind == kind && row.GroupId == groupId &&
            row.AuthorPersonId == actor, ct);
        if (report is null)
        {
            if (input.Version is not null) return NotFound();
            report = new OperationalReport { PublicId = id, Kind = kind, InitiativeId = initiative.Id, GroupId = groupId,
                AuthorPersonId = actor, CreatedAtUtc = now, Status = "Draft" };
            db.Add(report);
        }
        else if (report.Status != "Draft" || Version(report.RowVersion) != input.Version)
            return Conflict("Submitted reports are read-only. Reload drafts before saving.");
        var children = input.CoachReportIds?.Distinct().ToArray() ?? [];
        if (children.Length > 0 && (role != "Supervisor" || !input.Submit))
            return BadRequest("Attach Coach reports when submitting a Supervisor summary.");
        var included = await scope.Where(row => row.Kind == "Coach" && children.Contains(row.PublicId) && row.Status == "Submitted" &&
            row.ReviewedAtUtc != null && row.IncludedInReportId == null &&
            row.PeriodStartDate <= input.To && row.PeriodEndDate >= input.From).ToListAsync(ct);
        if (included.Count != children.Length) return Conflict("Choose reviewed, available Coach reports that overlap this period.");
        report.PeriodStartDate = input.From;
        report.PeriodEndDate = input.To;
        report.BodyJson = JsonSerializer.Serialize(new Narrative(input.Observations?.Trim(), input.Issues?.Trim(), input.Recommendations?.Trim()), Json);
        if (input.Submit)
        {
            var sources = await SourceRows(groups, initiative.Id, input.From, input.To, input.GroupId, ct);
            report.Status = "Submitted";
            report.SubmittedAtUtc = now;
            report.MetricsSnapshotJson = JsonSerializer.Serialize(new Snapshot(Count(sources, now),
                sources.Select(row => row.AssignmentId).Distinct().ToArray(), Utc(now)), Json);
        }
        try
        {
            await db.SaveChangesAsync(ct);
            foreach (var child in included) child.IncludedInReportId = report.Id;
            Audit(db, Resource, report.Id, actor, role, input.Submit ? "ReportSubmitted" : "ReportDraftSaved",
                "Draft", report.Status, null, now, new { coachReportIds = children });
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
        }
        catch (DbUpdateException ex) when (ex is DbUpdateConcurrencyException || ex.InnerException is SqlException { Number: 2601 or 2627 })
        {
            return Conflict("The report changed or already exists. Reload before trying again.");
        }
        return Ok(new { id, report.Status, version = Version(report.RowVersion) });
    }

    [HttpPost("Supervisor/{initiativeId:guid}/{id:guid}/review")]
    public async Task<IActionResult> Review(Guid initiativeId, Guid id, ReportReview input, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        if (string.IsNullOrWhiteSpace(input.Note) && string.IsNullOrWhiteSpace(input.Correction))
            return BadRequest("Enter a review note or correction.");
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var initiative = await Lock(db, initiativeId, ct);
        var now = PersonalRecords.Now(clock);
        if (initiative is null || !await Supervisor(db, actor, initiative.Id, now, ct)) return NotFound();
        var row = await InitiativeReports(initiative.Id).SingleOrDefaultAsync(item => item.PublicId == id && item.Kind == "Coach" &&
            item.Status == "Submitted" && item.AuthorPersonId != actor, ct);
        if (row is null) return NotFound();
        if (row.ReviewedAtUtc.HasValue || input.Version != Version(row.RowVersion))
            return Conflict("This report has already been reviewed or changed.");
        row.ReviewJson = JsonSerializer.Serialize(new ReviewNotes(input.Note?.Trim(), input.Correction?.Trim()), Json);
        row.ReviewedAtUtc = now;
        row.ReviewedByPersonId = actor;
        Audit(db, Resource, row.Id, actor, "Supervisor", "CoachReportReviewed", row.Status, row.Status, null, now);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Ok(new { id, reviewedAtUtc = Utc(now) });
    }

    private Task<bool> Allowed(string role, long actor, Initiative initiative, DateTime now, CancellationToken ct) => role switch
    {
        "Representative" => InstitutionAccess.VerifiedInstitutions(db, actor).AnyAsync(row => row.Id == initiative.InstitutionId, ct),
        "Supervisor" => Supervisor(db, actor, initiative.Id, now, ct),
        "Coach" => InitiativeStaffAccess.Active(db, actor, "Coach", now).AnyAsync(row => row.InitiativeId == initiative.Id, ct),
        _ => Task.FromResult(false)
    };

    private IQueryable<OperationalGroup> ScopedGroups(string role, Initiative initiative, long actor, DateTime now) =>
        role == "Coach" ? InitiativeStaffAccess.CoachGroups(db, actor, initiative.PublicId, now) :
            InitiativeGroupRecords.Groups(db, initiative.Id);

    private IQueryable<OperationalReport> InitiativeReports(long initiative) =>
        db.Set<OperationalReport>().Where(row => row.ExperienceId == null &&
            (row.Kind == "InitiativeSupervisor" && row.InitiativeId == initiative && row.GroupId == null ||
             row.Kind == "Coach" && (row.InitiativeId == null || row.InitiativeId == initiative) &&
                InitiativeGroupRecords.Groups(db, initiative).Any(team => team.Id == row.GroupId)));

    private IQueryable<OperationalReport> Reports(string role, Initiative initiative, IQueryable<OperationalGroup> groups, long actor)
    {
        var reports = InitiativeReports(initiative.Id).AsNoTracking();
        if (role == "Coach") return reports.Where(row => row.Kind == "Coach" && row.AuthorPersonId == actor &&
            groups.Any(team => team.Id == row.GroupId));
        if (role == "Supervisor") return reports.Where(row => row.Status == "Submitted" || row.AuthorPersonId == actor);
        return reports.Where(row => row.Status == "Submitted" && (row.Kind == "InitiativeSupervisor" ||
            reports.Any(parent => parent.Id == row.IncludedInReportId && parent.Kind == "InitiativeSupervisor" && parent.Status == "Submitted")));
    }

    private Task<List<Source>> SourceRows(IQueryable<OperationalGroup> groups, long initiative, DateOnly from, DateOnly to,
        Guid? groupId, CancellationToken ct)
    {
        var first = from.ToDateTime(TimeOnly.MinValue);
        var next = to.AddDays(1).ToDateTime(TimeOnly.MinValue);
        var active = InitiativeGroupRecords.CurrentStudents(db, initiative);
        return (from recipient in db.Set<AssignmentRecipient>().AsNoTracking()
                join assignment in db.Set<Assignment>() on recipient.AssignmentId equals assignment.Id
                join team in groups on assignment.GroupId equals team.Id
                join person in db.Set<Person>() on recipient.PersonId equals person.Id
                where assignment.Status != "Draft" && recipient.AssignedAtUtc >= first && recipient.AssignedAtUtc < next &&
                    (!groupId.HasValue || team.PublicId == groupId.Value)
                orderby assignment.Title, person.DisplayName
                select new Source(assignment.PublicId, assignment.Title, team.PublicId, team.Name, assignment.DueAtUtc,
                    assignment.Status, recipient.Id, person.DisplayName, recipient.Status, recipient.LastAttemptNo,
                    assignment.Status == "Published" && active.Any(row => row.GroupId == team.Id && row.PersonId == recipient.PersonId)))
            .ToListAsync(ct);
    }

    private static Metrics Count(List<Source> rows, DateTime now) =>
        new(rows.Select(row => row.AssignmentId).Distinct().Count(), rows.Count, rows.Count(row => row.Attempts > 0),
            rows.Count(row => row.Status == "Approved"), rows.Count(row => row.Status == "Submitted" && row.CanReview),
            rows.Count(row => row.Status == "NeedsRevision"), rows.Count(row => row.Status == "Rejected"),
            rows.Count(row => row.CanReview && row.DueAtUtc < now && row.Status is "Assigned" or "InProgress" or "NeedsRevision"),
            rows.Count(row => row.Status == "Cancelled"));

    private static bool ValidPeriod(DateOnly from, DateOnly to, DateTime now) =>
        from != default && from <= to && to <= DateOnly.FromDateTime(now);
}
