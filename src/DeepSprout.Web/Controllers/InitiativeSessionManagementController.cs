using System.ComponentModel.DataAnnotations;
using System.Data;
using DeepSprout.Domain.V5;
using DeepSprout.Infrastructure.V5;
using DeepSprout.Web.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using static DeepSprout.Web.Services.InitiativeSessions;

namespace DeepSprout.Web.Controllers;

[ApiController]
[Authorize]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[Route("api/initiative-sessions/manage")]
public sealed class InitiativeSessionManagementController(DeepSproutV5DbContext db, TimeProvider clock) : ControllerBase
{
    public sealed record SessionInput([Required, MaxLength(200)] string Title, [Required] string Mode,
        [Required, MaxLength(80)] string TimeZoneId, DateTime? StartsAt, DateTime? EndsAt,
        [MaxLength(300)] string? Venue, [MaxLength(300)] string? MeetingLink,
        [Range(1, 1000)] int? OnlineCapacity, [Range(1, 1000)] int? InPersonCapacity, bool AttendanceRequired,
        bool Publish, [MaxLength(30)] string? Version, [MaxLength(800)] string? Reason);

    public sealed record TransitionInput([Required, MaxLength(30)] string Version, [MaxLength(800)] string? Reason);

    [HttpGet("{role}/{initiativeId:guid}/{sessionId:guid?}")]
    public async Task<IActionResult> Manage(string role, Guid initiativeId, Guid? sessionId, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not long actor) return Unauthorized();
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var initiative = await InitiativeWork.Lock(db, initiativeId, ct);
        var now = PersonalRecords.Now(clock);
        if (initiative?.CurrentRevisionId is null) return NotFound();
        var permitted = role == "Representative" ? await Owns(actor, initiative.InstitutionId, ct) :
            role == "Supervisor" && await InitiativeWork.Supervisor(db, actor, initiative.Id, now, ct);
        if (!permitted) return NotFound();
        var operational = await InitiativeStaffAccess.EligibleInitiatives(db, now).AnyAsync(row => row.Id == initiative.Id, ct);
        var query = Read(db).Where(row => row.Initiative.Id == initiative.Id &&
            (role == "Representative" || row.Session.Status != "Draft"));
        if (sessionId is null)
        {
            var list = await query.OrderBy(row => row.Session.StartsAtUtc).ThenBy(row => row.Session.Id).ToListAsync(ct);
            await transaction.CommitAsync(ct);
            return Ok(new { canManage = role == "Representative" && operational, sessions = list.Select(row => View(row, operational, now)) });
        }
        var record = await query.SingleOrDefaultAsync(row => row.Session.PublicId == sessionId, ct);
        if (record is null) return NotFound();
        var session = record.Session;
        var roster = await (from registration in db.SessionRegistration.AsNoTracking()
                            join person in db.Set<Person>() on registration.PersonId equals person.Id
                            where registration.SessionId == session.Id
                            orderby person.DisplayName, registration.Id descending
                            select new { person.DisplayName, registration.Mode, registration.Status, registration.RegisteredAtUtc,
                                registration.CancelledAtUtc }).ToListAsync(ct);
        var history = await (from entry in db.Set<AuditEvent>().AsNoTracking()
                             join person in db.Set<Person>() on entry.ActorPersonId equals (long?)person.Id
                             where entry.ResourceKind == SessionResource && entry.ResourceId == session.Id
                             orderby entry.Id descending
                             select new { entry.Action, entry.Reason, entry.AtUtc, actor = person.DisplayName }).ToListAsync(ct);
        await transaction.CommitAsync(ct);
        return Ok(new { session = View(record, operational, now), session.AttendanceRequired,
            meetingLink = MeetingLink(session.ProtectedLinkRef), roster, history,
            canEdit = role == "Representative" && operational && (session.Status == "Draft" ||
                session.Status == "Published" && session.StartsAtUtc > now),
            canClose = role == "Representative" && session.Status == "Published" && session.EndsAtUtc <= now });
    }

    [HttpPut("Representative/{initiativeId:guid}/{sessionId:guid}")]
    public async Task<IActionResult> Save(Guid initiativeId, Guid sessionId, SessionInput input, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not long actor) return Unauthorized();
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var initiative = await InitiativeWork.Lock(db, initiativeId, ct);
        var now = PersonalRecords.Now(clock);
        if (initiative is null || !await Owns(actor, initiative.InstitutionId, ct)) return NotFound();
        var terms = await CurrentTerms(initiative, now, ct);
        if (terms is null) return Conflict("This Initiative is unavailable for scheduling.");

        var title = input.Title.Trim();
        var venue = Clean(input.Venue);
        var meeting = Clean(input.MeetingLink);
        var zone = input.TimeZoneId.Trim();
        if (sessionId == Guid.Empty || title.Length == 0 || input.Mode is not ("Online" or "InPerson" or "Hybrid") ||
            (zone != "UTC" && !TimeZoneInfo.TryConvertIanaIdToWindowsId(zone, out _)) ||
            !TimeZoneInfo.TryFindSystemTimeZoneById(zone, out var timeZone) ||
            LocalTime(input.StartsAt, timeZone) is not DateTime start || LocalTime(input.EndsAt, timeZone) is not DateTime end ||
            end <= start) return BadRequest("Enter a title, delivery mode, time zone and valid, unambiguous local start and end times.");
        if (meeting != null && MeetingLink(meeting) is null)
            return BadRequest("Enter a valid HTTPS Google Meet, Zoom or Microsoft Teams link.");
        if (!Allows(input.Mode, "Online") && (input.OnlineCapacity != null || meeting != null) ||
            !Allows(input.Mode, "InPerson") && (input.InPersonCapacity != null || venue != null))
            return BadRequest("Use venue, links and capacities that match the delivery mode.");

        var session = await db.Session.FromSqlInterpolated(
            $@"SELECT * FROM [session].[Session] WITH (UPDLOCK, HOLDLOCK) WHERE [PublicId] = {sessionId}")
            .SingleOrDefaultAsync(ct);
        if (session is not null && (session.InitiativeId != initiative.Id || session.ExperienceId != null ||
            session.Purpose != "Session" || session.MeetingAudience != null || session.MeetingAudiencePersonId != null)) return NotFound();
        var created = session is null;
        if (created)
        {
            if (input.Version != null) return NotFound();
            session = new Session { InitiativeId = initiative.Id, PublicId = sessionId, Purpose = "Session", Status = "Draft", CreatedAtUtc = now };
        }
        var current = session!;
        // Identical retries return the current record, including when the first draft save created it.
        var same = !created && current.Title == title && current.Mode == input.Mode && current.TimeZoneId == zone &&
            current.StartsAtUtc == start && current.EndsAtUtc == end && current.Venue == venue && current.ProtectedLinkRef == meeting &&
            current.OnlineCapacity == input.OnlineCapacity && current.InPersonCapacity == input.InPersonCapacity &&
            current.AttendanceRequired == input.AttendanceRequired;
        if (same && (input.Publish ? current.Status == "Published" : current.Status is "Draft" or "Published"))
            return Ok(Saved(current));
        if (!created && input.Version != InitiativeWork.Version(current.RowVersion)) return Conflict("This session changed. Reopen it before saving.");
        if (current.Status != "Draft" && (current.Status != "Published" || current.StartsAtUtc <= now))
            return Conflict("Only drafts and upcoming published sessions can be edited.");
        if (start < terms.StartsAtUtc || end > terms.EndsAtUtc || start <= now)
            return BadRequest("Schedule this session in the future and within its Initiative dates.");

        var before = current.Status;
        var previous = created ? null : Snapshot(current);
        var active = created ? [] : await Active(db).Where(row => row.SessionId == current.Id).ToListAsync(ct);
        if (active.Any(row => !Allows(input.Mode, row.Mode)) ||
            active.Count(row => row.Mode == "Online") > input.OnlineCapacity ||
            active.Count(row => row.Mode == "InPerson") > input.InPersonCapacity)
            return Conflict("Keep the delivery modes and seats needed by existing registrations.");
        var rescheduled = before == "Published" && (current.StartsAtUtc != start || current.EndsAtUtc != end ||
            current.Mode != input.Mode || current.Venue != venue || current.ProtectedLinkRef != meeting);
        current.Title = title;
        current.Mode = input.Mode;
        current.TimeZoneId = zone;
        current.StartsAtUtc = start;
        current.EndsAtUtc = end;
        current.Venue = venue;
        current.ProtectedLinkRef = meeting;
        current.OnlineCapacity = input.OnlineCapacity;
        current.InPersonCapacity = input.InPersonCapacity;
        current.AttendanceRequired = input.AttendanceRequired;
        if (input.Publish || before == "Published")
        {
            if (PublicationError(current) is string error) return BadRequest(error);
            current.Status = "Published";
        }
        if (created) db.Add(current);
        await db.SaveChangesAsync(ct);
        Audit(current, actor, created ? null : before, before == "Draft" && current.Status == "Published" ? "SessionPublished" :
            created ? "SessionDraftCreated" : rescheduled ? "SessionRescheduled" : "SessionEdited", Clean(input.Reason), now, previous);
        if (rescheduled) Notices(active, current, "SessionRescheduled", now);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Ok(Saved(current));
    }

    [HttpPost("Representative/{initiativeId:guid}/{sessionId:guid}/{decision}")]
    public async Task<IActionResult> Transition(Guid initiativeId, Guid sessionId, string decision, TransitionInput input, CancellationToken ct)
    {
        if (decision is not ("publish" or "cancel" or "close")) return NotFound();
        if (await PersonalRecords.PersonId(db, User, ct) is not long actor) return Unauthorized();
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var initiative = await InitiativeWork.Lock(db, initiativeId, ct);
        if (initiative is null || !await Owns(actor, initiative.InstitutionId, ct)) return NotFound();
        var session = await Rows(db).SingleOrDefaultAsync(row => row.InitiativeId == initiative.Id && row.PublicId == sessionId, ct);
        if (session is null) return NotFound();
        var now = PersonalRecords.Now(clock);
        var before = session.Status;
        var reason = Clean(input.Reason);
        var after = decision switch { "publish" => "Published", "cancel" => "Cancelled", _ => "Completed" };
        if (before == after) return Ok(Saved(session));
        if (input.Version != InitiativeWork.Version(session.RowVersion)) return Conflict("This session changed. Reload it before continuing.");
        if (decision == "publish")
        {
            if (before != "Draft" || await CurrentTerms(initiative, now, ct) is not { } terms ||
                session.StartsAtUtc <= now || session.StartsAtUtc < terms.StartsAtUtc || session.EndsAtUtc > terms.EndsAtUtc)
                return Conflict("Only a future draft within an available Initiative can be published.");
            if (PublicationError(session) is string error) return BadRequest(error);
        }
        else if (decision == "cancel")
        {
            if (reason is null) return BadRequest("Enter the cancellation reason.");
            if (before != "Draft" && (before != "Published" || session.StartsAtUtc <= now))
                return Conflict("Only drafts and upcoming published sessions can be cancelled.");
            session.CancelReason = reason;
            session.CancelledAtUtc = now;
            var active = await Active(db).Where(row => row.SessionId == session.Id).ToListAsync(ct);
            foreach (var registration in active)
            {
                InitiativeWork.Audit(db, RegistrationResource, registration.Id, actor, "Representative",
                    "RegistrationCancelledWithSession", registration.Status, after, reason, now);
                registration.Status = "Cancelled";
                registration.CancelledAtUtc = now;
            }
            Notices(active, session, "SessionCancelled", now);
        }
        else if (before != "Published" || session.EndsAtUtc > now)
            return Conflict("A published session can close after its scheduled end.");

        session.Status = after;
        Audit(session, actor, before, "Session" + after, reason, now);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Ok(Saved(session));
    }

    private Task<bool> Owns(long actor, long institution, CancellationToken ct) =>
        InstitutionAccess.VerifiedInstitutions(db, actor).AnyAsync(row => row.Id == institution, ct);

    private Task<InitiativeRevision?> CurrentTerms(Initiative initiative, DateTime now, CancellationToken ct) =>
        (from row in InitiativeStaffAccess.EligibleInitiatives(db, now)
         join terms in db.Set<InitiativeRevision>() on row.CurrentRevisionId equals (long?)terms.Id
         where row.Id == initiative.Id && terms.InitiativeId == row.Id
         select terms).SingleOrDefaultAsync(ct);

    private static string? PublicationError(Session session)
    {
        if (Allows(session.Mode, "Online") && (MeetingLink(session.ProtectedLinkRef) is null || session.OnlineCapacity == null))
            return "Set a valid meeting link and online seat capacity before publishing.";
        if (Allows(session.Mode, "InPerson") && string.IsNullOrWhiteSpace(session.Venue))
            return "Set the on-site venue before publishing.";
        return null;
    }

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    private static DateTime? LocalTime(DateTime? value, TimeZoneInfo timeZone) =>
        value is DateTime { Kind: DateTimeKind.Unspecified } time && !timeZone.IsInvalidTime(time) && !timeZone.IsAmbiguousTime(time)
            ? TimeZoneInfo.ConvertTimeToUtc(time, timeZone) : null;
    private static object Saved(Session row) => new { id = row.PublicId, row.Status, version = InitiativeWork.Version(row.RowVersion) };
    private static object Snapshot(Session row) => new { row.Title, row.Mode, row.TimeZoneId, row.StartsAtUtc, row.EndsAtUtc,
        row.Venue, row.OnlineCapacity, row.InPersonCapacity, row.AttendanceRequired };

    private void Audit(Session row, long actor, string? before, string action, string? reason, DateTime now, object? previous = null) =>
        InitiativeWork.Audit(db, SessionResource, row.Id, actor, "Representative", action, before, row.Status, reason, now,
            new { sessionId = row.PublicId, previous, session = Snapshot(row) });

    private void Notices(IEnumerable<SessionRegistration> registrations, Session session, string template, DateTime now)
    {
        foreach (var registration in registrations)
            db.Add(new Notification { RecipientPersonId = registration.PersonId, EventPublicId = Guid.NewGuid(),
                TemplateCode = template, ResourceKind = SessionResource, ResourceId = session.Id, Status = "Ready",
                ParamsJson = System.Text.Json.JsonSerializer.Serialize(new { sessionId = session.PublicId, session.Title }),
                CreatedAtUtc = now });
    }
}
