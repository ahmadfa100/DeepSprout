using System.Data;
using System.Text.Json;
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
[Route("api/initiatives")]
public sealed class InitiativesController(DeepSproutV5DbContext db, TimeProvider clock) : ControllerBase
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public sealed record SaveInput(InitiativeDraft Draft, int Stage, string? Version);
    public sealed record ChangeInput(string? Version, string? Reason);
    public sealed record RevisionInput(InitiativeDraft Draft, string? Version, string? Reason);
    private sealed record InitiativeView
    {
        public required Initiative Initiative { get; init; }
        public required Organization Owner { get; init; }
        public InitiativeRevision? Revision { get; init; }
        public int Accepted { get; init; }
        public int Suspended { get; init; }
        public int Pending { get; init; }
        public int Queued { get; init; }
    }

    private IQueryable<InitiativeView> WithOwnerAndRevision() =>
        from initiative in db.Set<Initiative>().AsNoTracking()
        join owner in db.Set<Organization>().AsNoTracking() on initiative.InstitutionId equals owner.Id
        join current in db.Set<InitiativeRevision>().AsNoTracking()
            on new { Id = initiative.CurrentRevisionId, InitiativeId = initiative.Id }
            equals new { Id = (long?)current.Id, current.InitiativeId } into revisions
        from current in revisions.DefaultIfEmpty()
        select new InitiativeView
        {
            Initiative = initiative, Owner = owner, Revision = current,
            Accepted = db.Set<InitiativeApplication>().Count(app => app.InitiativeId == initiative.Id && app.Status == "Accepted"),
            Suspended = db.Set<InitiativeApplication>().Count(app => app.InitiativeId == initiative.Id && app.Status == "Suspended"),
            Pending = db.Set<InitiativeApplication>().Count(app => app.InitiativeId == initiative.Id && app.Status == "Pending"),
            Queued = db.Set<InitiativeApplication>().Count(app => app.InitiativeId == initiative.Id && app.Status == "Queued")
        };

    [HttpGet("owned")]
    public async Task<IActionResult> Owned([FromQuery] Guid institution, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        var allowed = InstitutionAccess.VerifiedInstitutions(db, actor).Where(org => org.PublicId == institution);
        if (!await allowed.AnyAsync(ct)) return NotFound();
        var rows = await WithOwnerAndRevision().Where(row => allowed.Any(org => org.Id == row.Owner.Id))
            .OrderByDescending(row => row.Initiative.Id).ToListAsync(ct);
        return Ok(rows.Select(OwnerView));
    }

    [HttpGet("owned/{id:guid}")]
    public async Task<IActionResult> OwnedDetail(Guid id, [FromQuery] int? revision, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        var row = await WithOwnerAndRevision().SingleOrDefaultAsync(item => item.Initiative.PublicId == id &&
            InstitutionAccess.VerifiedInstitutions(db, actor).Any(org => org.Id == item.Owner.Id), ct);
        if (row is null) return NotFound();
        var revisions = db.Set<InitiativeRevision>().AsNoTracking().Where(item => item.InitiativeId == row.Initiative.Id);
        if (revision.HasValue)
        {
            var selected = await revisions.SingleOrDefaultAsync(item => item.RevisionNo == revision, ct);
            if (selected is null) return NotFound();
            row = row with { Revision = selected };
        }
        var history = await (from audit in db.Set<AuditEvent>().AsNoTracking()
                             join person in db.Set<Person>() on audit.ActorPersonId equals (long?)person.Id into actors
                             from person in actors.DefaultIfEmpty()
                             where audit.ResourceKind == "institution.Initiative" && audit.ResourceId == row.Initiative.Id
                             orderby audit.Id descending
                             select new { audit.Action, audit.BeforeStatus, audit.AfterStatus, audit.Reason, audit.AtUtc,
                                 actor = person == null ? null : person.DisplayName }).ToListAsync(ct);
        var versions = await revisions.OrderByDescending(item => item.RevisionNo)
            .Select(item => new { item.RevisionNo, item.ChangeKind, item.ChangeReason, item.PublishedAtUtc }).ToListAsync(ct);
        return Ok(new { initiative = OwnerView(row), history, versions });
    }

    [HttpPut("owned/{id:guid}/draft")]
    [RequestSizeLimit(524288)]
    public async Task<IActionResult> Save(Guid id, [FromQuery] Guid institution, SaveInput input, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        if (id == Guid.Empty || input.Stage is < 0 or > 5) return BadRequest("Choose a valid draft and builder stage.");
        if (input.Draft.DraftError() is { } error) return BadRequest(error);
        var json = JsonSerializer.Serialize(input.Draft, Json);
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var org = await InstitutionAccess.VerifiedInstitutions(db, actor).SingleOrDefaultAsync(x => x.PublicId == institution, ct);
        if (org is null) return NotFound();

        // The public ID also identifies a retried create. The lock covers a missing key until the insert commits.
        var row = await InitiativeTerms.Lock(db, id).SingleOrDefaultAsync(ct);
        var isNew = row is null;
        if (row is not null)
        {
            if (row.InstitutionId != org.Id) return NotFound();
            if (row.Status != "Draft") return Conflict("Only drafts can be saved in the builder.");
            if (row.DraftJson == json && row.DraftLastSavedStage == input.Stage)
                return Ok(OwnerView(new InitiativeView { Initiative = row, Owner = org }));
            if (input.Version != Version(row)) return Conflict("This draft changed. Reopen it before saving.");
        }
        else
        {
            if (input.Version is not null) return NotFound();
            row = new Initiative { PublicId = id, InstitutionId = org.Id, Status = "Draft", CreatedAtUtc = PersonalRecords.Now(clock) };
            db.Add(row);
        }
        var now = PersonalRecords.Now(clock);
        row.DraftJson = json;
        row.DraftLastSavedStage = (byte)input.Stage;
        row.DraftUpdatedAtUtc = now;
        await db.SaveChangesAsync(ct);
        AddAudit(row, actor, isNew ? "DraftCreated" : "DraftSaved", isNew ? null : "Draft", null, now);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Ok(OwnerView(new InitiativeView { Initiative = row, Owner = org }));
    }

    [HttpPost("owned/{id:guid}/publish")]
    public Task<IActionResult> Publish(Guid id, ChangeInput input, CancellationToken ct) =>
        PublishRevision(id, input.Version, null, null, ct);

    [HttpPost("owned/{id:guid}/revise")]
    [RequestSizeLimit(524288)]
    public Task<IActionResult> Revise(Guid id, RevisionInput input, CancellationToken ct) =>
        PublishRevision(id, input.Version, input.Draft, input.Reason?.Trim(), ct);

    private async Task<IActionResult> PublishRevision(Guid id, string? version, InitiativeDraft? update, string? reason, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var owned = await LockOwned(id, actor, ct);
        if (owned is null) return NotFound();
        var row = owned.Initiative;
        var current = owned.Revision;
        var revising = update is not null;
        if (!revising && row.Status == "Published" && current?.RevisionNo == 1) return Ok(OwnerView(owned));
        if (Version(row) != version) return Conflict("This Initiative changed. Reopen it before publishing.");
        if (revising ? row.Status != "Published" || current is null : row.Status != "Draft")
            return Conflict("This Initiative cannot be published in its current state.");
        if (revising && (string.IsNullOrWhiteSpace(reason) || reason.Length > 800))
            return BadRequest("Give a reason for the published update, up to 800 characters.");
        if (revising && await HasActiveParticipants(row.Id, ct))
            return Conflict("Published updates for Initiatives with active participation require the participation workflow.");
        var draft = update ?? InitiativeTerms.Read(row.DraftJson);
        if (draft is null) return BadRequest("Save the builder details before publishing.");
        if ((draft.DraftError() ?? draft.PublicationError()) is { } error) return BadRequest(error);

        var now = PersonalRecords.Now(clock);
        var number = (current?.RevisionNo ?? 0) + 1;
        var snapshot = JsonSerializer.Serialize(draft, Json);
        if (current?.PublishedSnapshotJson == snapshot) return BadRequest("Change at least one field before publishing an update.");
        DateTime starts, ends;
        DateTime? opens, closes;
        try
        {
            starts = draft.Boundary(draft.Start)!.Value;
            ends = draft.Boundary(draft.End, endOfDay: true)!.Value;
            opens = draft.Boundary(draft.RegistrationOpen);
            closes = draft.Boundary(draft.RegistrationClose, endOfDay: true);
        }
        catch (ArgumentException)
        {
            return BadRequest("The selected dates cannot be represented in this time zone.");
        }
        var revision = new InitiativeRevision
        {
            InitiativeId = row.Id, RevisionNo = number,
            ChangeKind = !revising ? "Publish" : starts != current!.StartsAtUtc || ends != current.EndsAtUtc ? "Reschedule" : "TermsUpdate",
            ChangeReason = reason, Title = draft.Title!.Trim(), Summary = draft.Summary!.Trim(), TopicCode = draft.Topic!.Trim(),
            OperatingMode = draft.OperatingMode == "awareness" ? "Awareness" : "Structured",
            ParticipationMode = draft.DeliveryMode == "In-person" ? "InPerson" : draft.DeliveryMode!,
            AudienceCode = draft.Audience!.Trim(), CoverageCode = !string.IsNullOrWhiteSpace(draft.Coverage)
                ? draft.Coverage : draft.Country == "Other" ? draft.CountryOther : draft.Country,
            Capacity = (short)draft.Capacity!.Value, WaitlistEnabled = draft.Policies!.Waitlist,
            OfferHoldHours = draft.Policies.Waitlist && !draft.Policies.OfferManual ? draft.Policies.OfferHours ?? 24 : null,
            ApplicationOpensAtUtc = opens, ApplicationClosesAtUtc = closes,
            TimeZoneId = draft.Timezone!, StartsAtUtc = starts, EndsAtUtc = ends, CostKind = "Free",
            ConsentNoticeVersion = $"initiative-revision-{number}", CompletionPolicyRef = $"initiative-revision-{number}",
            PublishedSnapshotJson = snapshot, PublishedByPersonId = actor, PublishedAtUtc = now, CreatedAtUtc = now
        };
        db.Add(revision);
        await db.SaveChangesAsync(ct);
        var before = row.Status;
        row.CurrentRevisionId = revision.Id;
        row.Status = "Published";
        row.FirstPublishedAtUtc ??= now;
        row.DraftJson = null;
        row.DraftLastSavedStage = null;
        AddAudit(row, actor, revising ? revision.ChangeKind : "Published", before, reason, now);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Ok(OwnerView(owned with { Revision = revision }));
    }

    [HttpPost("owned/{id:guid}/status/{status}")]
    public async Task<IActionResult> ChangeStatus(Guid id, string status, ChangeInput input, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        var reason = input.Reason?.Trim();
        if (reason?.Length > 800 || status == "Cancelled" && string.IsNullOrWhiteSpace(reason))
            return BadRequest("Enter a cancellation reason, up to 800 characters.");
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var owned = await LockOwned(id, actor, ct);
        if (owned is null) return NotFound();
        var row = owned.Initiative;
        if (row.Status == status && (status is "Published" or "RegistrationClosed" or "Archived" ||
            status == "Cancelled" && row.CancellationReason == reason))
            return Ok(OwnerView(owned));
        if (Version(row) != input.Version) return Conflict("This Initiative changed. Reopen it before trying again.");
        var allowed = status switch
        {
            "RegistrationClosed" => row.Status == "Published",
            "Published" => row.Status == "RegistrationClosed",
            "Cancelled" => row.Status is "Draft" or "Published" or "RegistrationClosed",
            "Archived" => row.Status is "Draft" or "Published" or "Completed" or "Cancelled",
            _ => false
        };
        if (!allowed) return Conflict("That status change is unavailable.");
        if (status is "Archived" or "Cancelled" && await HasActiveParticipants(row.Id, ct))
            return Conflict("Initiatives with active participation require the participation workflow.");
        var now = PersonalRecords.Now(clock);
        var before = row.Status;
        row.Status = status;
        if (status == "Cancelled")
        {
            row.CancelledAtUtc = now;
            row.CancellationReason = reason;
        }
        AddAudit(row, actor, status == "Published" ? "RegistrationReopened" : status, before, reason, now);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Ok(OwnerView(owned));
    }

    [HttpGet("explore")]
    public async Task<IActionResult> Explore(CancellationToken ct)
    {
        var now = PersonalRecords.Now(clock);
        var rows = await PublicRows(now).OrderBy(row => row.Revision!.StartsAtUtc)
            .ThenBy(row => row.Initiative.Id).ToListAsync(ct);
        return Ok(rows.Select(row => ExploreView(row, now)));
    }

    [HttpGet("explore/{id:guid}")]
    public async Task<IActionResult> ExploreDetail(Guid id, CancellationToken ct)
    {
        var now = PersonalRecords.Now(clock);
        var row = await PublicRows(now).SingleOrDefaultAsync(item => item.Initiative.PublicId == id, ct);
        if (row is not null) return Ok(ExploreView(row, now));
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        var history = await (from app in db.Set<InitiativeApplication>().AsNoTracking()
                             join initiative in db.Set<Initiative>().AsNoTracking() on app.InitiativeId equals initiative.Id
                             join owner in db.Set<Organization>().AsNoTracking() on initiative.InstitutionId equals owner.Id
                             join revision in db.Set<InitiativeRevision>().AsNoTracking()
                                 on new { Id = app.TermsRevisionId, app.InitiativeId } equals new { revision.Id, revision.InitiativeId }
                             where app.PersonId == actor && initiative.PublicId == id
                             orderby app.AttemptNo descending
                             select new InitiativeView { Initiative = initiative, Owner = owner, Revision = revision })
            .FirstOrDefaultAsync(ct);
        return history is null ? NotFound() : Ok(ExploreView(history, now, historical: true));
    }

    private IQueryable<InitiativeView> PublicRows(DateTime now) => WithOwnerAndRevision().Where(row =>
        row.Owner.Status == "Verified" && row.Owner.Kind == "Institution" &&
        (row.Initiative.Status == "Published" || row.Initiative.Status == "RegistrationClosed") &&
        row.Revision != null && row.Revision.EndsAtUtc > now);

    private Task<bool> HasActiveParticipants(long id, CancellationToken ct) => db.Set<InitiativeApplication>().AnyAsync(app =>
        app.InitiativeId == id && (app.Status == "Pending" || app.Status == "Queued" ||
            app.Status == "Offered" || app.Status == "Accepted" || app.Status == "Suspended"), ct);

    private async Task<InitiativeView?> LockOwned(Guid id, long actor, CancellationToken ct)
    {
        var row = await InitiativeTerms.Lock(db, id)
            .SingleOrDefaultAsync(item => InstitutionAccess.VerifiedInstitutions(db, actor).Any(org => org.Id == item.InstitutionId), ct);
        if (row is null) return null;
        var org = await db.Set<Organization>().SingleAsync(item => item.Id == row.InstitutionId, ct);
        var revision = await db.Set<InitiativeRevision>().AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == row.CurrentRevisionId && item.InitiativeId == row.Id, ct);
        return new InitiativeView { Initiative = row, Owner = org, Revision = revision };
    }

    private void AddAudit(Initiative row, long actor, string action, string? before, string? reason, DateTime now) =>
        db.Add(new AuditEvent
        {
            ActorPersonId = actor, ActorCapacity = "Representative", ResourceKind = "institution.Initiative",
            ResourceId = row.Id, Action = action, BeforeStatus = before, AfterStatus = row.Status,
            Reason = reason, AtUtc = now, CreatedAtUtc = now
        });

    private static string Version(Initiative row) => Convert.ToBase64String(row.RowVersion);
    private object OwnerView(InitiativeView row)
    {
        var now = PersonalRecords.Now(clock);
        return new
        {
            id = row.Initiative.PublicId, institutionId = row.Owner.PublicId, organizer = row.Owner.Name,
            row.Initiative.Status, row.Initiative.CancellationReason, version = Version(row.Initiative), revision = row.Revision?.RevisionNo,
            stage = row.Initiative.DraftLastSavedStage ?? 0,
            savedAt = row.Initiative.DraftUpdatedAtUtc is { } saved ? DateTime.SpecifyKind(saved, DateTimeKind.Utc) : (DateTime?)null,
            title = row.Revision?.Title, registration = Registration(row, now),
            row.Accepted, row.Suspended, row.Pending, row.Queued,
            discoverable = (row.Initiative.Status is "Published" or "RegistrationClosed") && row.Revision?.EndsAtUtc > now,
            draft = InitiativeTerms.Read(row.Revision?.PublishedSnapshotJson ?? row.Initiative.DraftJson)
        };
    }

    private static string Registration(InitiativeView row, DateTime now)
    {
        if (row.Initiative.Status == "Draft") return "NotPublished";
        if (row.Initiative.Status != "Published" || row.Revision is null ||
            row.Revision.EndsAtUtc <= now || row.Revision.ApplicationClosesAtUtc <= now) return "Closed";
        return row.Revision.ApplicationOpensAtUtc > now ? "Upcoming" : "InWindow";
    }

    private static object ExploreView(InitiativeView row, DateTime now, bool historical = false)
    {
        var revision = row.Revision!;
        var draft = InitiativeTerms.Read(revision.PublishedSnapshotJson);
        var registration = historical ? "Closed" : Registration(row, now);
        return new
        {
            id = row.Initiative.PublicId, institutionId = row.Owner.PublicId, organizer = row.Owner.Name,
            city = row.Owner.HeadquartersCity, row.Initiative.Status, revision.RevisionNo,
            revision.Title, revision.Summary, topic = revision.TopicCode, revision.ParticipationMode,
            revision.Capacity, seatsLeft = historical ? (int?)null : Math.Max(0, revision.Capacity - row.Accepted - row.Suspended),
            revision.WaitlistEnabled, applicationFormAvailable = revision.RegistrationFormVersionId == null &&
                !string.IsNullOrWhiteSpace(draft?.Consent),
            audience = revision.AudienceCode, timezone = revision.TimeZoneId,
            start = LocalDate(revision.StartsAtUtc, revision.TimeZoneId),
            end = LocalDate(revision.EndsAtUtc, revision.TimeZoneId, endOfDay: true),
            registrationOpen = revision.ApplicationOpensAtUtc.HasValue
                ? LocalDate(revision.ApplicationOpensAtUtc.Value, revision.TimeZoneId) : null,
            registrationClose = revision.ApplicationClosesAtUtc.HasValue
                ? LocalDate(revision.ApplicationClosesAtUtc.Value, revision.TimeZoneId, endOfDay: true) : null,
            registration, historical, draft?.Venue, draft?.MinAge, draft?.MaxAge, draft?.Requirements, draft?.Country,
            draft?.CountryOther, draft?.Objective, draft?.Description, draft?.Consent, draft?.Withdrawal,
            cover = draft?.DraftError() is null ? draft?.Cover : null,
            completion = draft?.Policies?.Completion,
            components = draft?.Components?.Where(item => item is { Planned: false, Publish: true })
                .Select(item => new { item!.Title, item.Type, item.Description, item.Date, item.Time, item.EndTime, item.Format })
        };
    }

    private static string LocalDate(DateTime utc, string timezone, bool endOfDay = false)
    {
        TimeZoneInfo zone;
        try { zone = TimeZoneInfo.FindSystemTimeZoneById(timezone); }
        catch (TimeZoneNotFoundException) { zone = TimeZoneInfo.Utc; }
        var local = TimeZoneInfo.ConvertTimeFromUtc(utc, zone);
        return (endOfDay && local.TimeOfDay == TimeSpan.Zero ? local.AddDays(-1) : local)
            .ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
    }
}
