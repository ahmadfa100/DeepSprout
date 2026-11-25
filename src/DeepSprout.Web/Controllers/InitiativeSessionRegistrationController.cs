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
[Route("api/initiative-sessions")]
public sealed class InitiativeSessionRegistrationController(DeepSproutV5DbContext db, TimeProvider clock) : ControllerBase
{
    public sealed record RegisterInput(Guid RequestId, [Required] string Mode, bool Consent, [Required, MaxLength(30)] string Version);

    [AllowAnonymous]
    [HttpGet("discover")]
    public async Task<IActionResult> Discover(CancellationToken ct)
    {
        var now = PersonalRecords.Now(clock);
        var rows = await PublicRows(now).Where(row => row.Session.StartsAtUtc > now)
            .OrderBy(row => row.Session.StartsAtUtc).ThenBy(row => row.Session.Id).ToListAsync(ct);
        return Ok(rows.Select(row => View(row, true, now)));
    }

    [AllowAnonymous]
    [HttpGet("discover/{sessionId:guid}")]
    public async Task<IActionResult> Details(Guid sessionId, CancellationToken ct)
    {
        var now = PersonalRecords.Now(clock);
        var actor = await PersonalRecords.PersonId(db, User, ct);
        var eligibleInitiatives = InitiativeStaffAccess.EligibleInitiatives(db, now);
        var admitted = Admitted(db, actor ?? 0);
        var row = await Read(db).SingleOrDefaultAsync(item => item.Session.PublicId == sessionId &&
            (item.Session.Status == "Published" && eligibleInitiatives.Any(parent => parent.Id == item.Initiative.Id) ||
             item.Session.Status == "Completed" && eligibleInitiatives.Any(parent => parent.Id == item.Initiative.Id) &&
                 admitted.Any(application => application.InitiativeId == item.Initiative.Id) ||
             actor != null && db.SessionRegistration.Any(registration =>
                 registration.PersonId == actor && registration.SessionId == item.Session.Id)), ct);
        if (row is null) return NotFound();
        var session = row.Session;
        var operational = await InitiativeStaffAccess.EligibleInitiatives(db, now).AnyAsync(item => item.Id == row.Initiative.Id, ct);
        var eligible = actor.HasValue && await admitted.AnyAsync(item => item.InitiativeId == row.Initiative.Id, ct);
        var registration = actor is long signedIn ? await db.SessionRegistration.AsNoTracking()
            .Where(item => item.SessionId == session.Id && item.PersonId == signedIn)
            .OrderByDescending(item => item.Status != "Cancelled").ThenByDescending(item => item.Id).FirstOrDefaultAsync(ct) : null;
        var meeting = operational && eligible && registration is { Status: "Confirmed", Mode: "Online" } &&
            session.Status == "Published" && session.StartsAtUtc <= now && session.EndsAtUtc > now
            ? MeetingLink(session.ProtectedLinkRef) : null;
        return Ok(new { session = View(row, operational, now), eligible, consent = Notice, meetingLink = meeting,
            registration = registration is null ? null : Registration(registration, CanCancel(session, registration, now)) });
    }

    [HttpGet("mine")]
    public async Task<IActionResult> Mine([FromQuery] Guid? initiative, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not long actor) return Unauthorized();
        var now = PersonalRecords.Now(clock);
        var eligible = InitiativeStaffAccess.EligibleInitiatives(db, now);
        var records = await (from registration in db.SessionRegistration.AsNoTracking()
                             join session in Read(db) on registration.SessionId equals session.Session.Id
                             where registration.PersonId == actor && (initiative == null || session.Initiative.PublicId == initiative)
                             orderby registration.RegisteredAtUtc descending, registration.Id descending
                             select new { registration, session, operational = eligible.Any(row => row.Id == session.Initiative.Id) })
            .ToListAsync(ct);
        return Ok(records.Select(row => new { session = View(row.session, row.operational, now),
            registration = Registration(row.registration, CanCancel(row.session.Session, row.registration, now)) }));
    }

    [HttpGet("student/{initiativeId:guid}")]
    public async Task<IActionResult> Schedule(Guid initiativeId, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not long actor) return Unauthorized();
        var now = PersonalRecords.Now(clock);
        var initiative = await InitiativeStaffAccess.EligibleInitiatives(db, now)
            .SingleOrDefaultAsync(row => row.PublicId == initiativeId &&
                Admitted(db, actor).Any(item => item.InitiativeId == row.Id), ct);
        if (initiative is null) return NotFound();
        var rows = await Read(db).Where(row => row.Initiative.Id == initiative.Id &&
                (row.Session.Status == "Published" || row.Session.Status == "Completed" ||
                 row.Session.Status == "Cancelled" && db.SessionRegistration.Any(item => item.SessionId == row.Session.Id && item.PersonId == actor)))
            .OrderBy(row => row.Session.StartsAtUtc).ThenBy(row => row.Session.Id).ToListAsync(ct);
        return Ok(rows.Select(row => View(row, true, now)));
    }

    [HttpPost("{sessionId:guid}/register")]
    public async Task<IActionResult> Register(Guid sessionId, RegisterInput input, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not long actor) return Unauthorized();
        if (input.RequestId == Guid.Empty || !input.Consent) return BadRequest("Confirm participation and choose an available mode.");
        var initiativeId = await Parent(sessionId, ct);
        if (initiativeId is not Guid parent) return NotFound();
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var initiative = await InitiativeWork.Lock(db, parent, ct);
        var now = PersonalRecords.Now(clock);
        if (initiative is null || !await InitiativeStaffAccess.EligibleInitiatives(db, now).AnyAsync(row => row.Id == initiative.Id, ct))
            return NotFound();
        var session = await Rows(db).AsNoTracking().SingleOrDefaultAsync(row => row.PublicId == sessionId &&
            row.InitiativeId == initiative.Id && (row.Status == "Published" || row.Status == "Cancelled" || row.Status == "Completed"), ct);
        if (session is null) return NotFound();
        if (!await Admitted(db, actor).AnyAsync(row => row.InitiativeId == initiative.Id, ct))
            return StatusCode(StatusCodes.Status403Forbidden, "Only accepted participants of this Initiative can register.");
        if (!Allows(session.Mode, input.Mode)) return BadRequest("Choose a participation mode offered by this session.");
        var retry = await db.SessionRegistration.FromSqlInterpolated(
            $@"SELECT * FROM [session].[SessionRegistration] WITH (UPDLOCK, HOLDLOCK) WHERE [PublicId] = {input.RequestId}")
            .AsNoTracking().SingleOrDefaultAsync(ct);
        if (retry is not null)
            return retry.PersonId == actor && retry.SessionId == session.Id && retry.Mode == input.Mode
                ? Ok(Registration(retry, CanCancel(session, retry, now))) : Conflict("This request ID has already been used.");
        if (session.Status != "Published" || session.StartsAtUtc <= now) return Conflict("Registration for this session is closed.");
        var prior = await Active(db).AsNoTracking().SingleOrDefaultAsync(row => row.SessionId == session.Id && row.PersonId == actor, ct);
        if (prior is not null)
            return prior.Mode == input.Mode ? Ok(Registration(prior, true)) : Conflict("Cancel your current registration before changing mode.");
        if (input.Version != InitiativeWork.Version(session.RowVersion)) return Conflict("The session changed. Reopen its details before registering.");
        var capacity = input.Mode == "Online" ? session.OnlineCapacity : session.InPersonCapacity;
        if (capacity is int limit && await Active(db).CountAsync(row => row.SessionId == session.Id && row.Mode == input.Mode, ct) >= limit)
            return Conflict("This participation mode is full.");
        var saved = new SessionRegistration { PublicId = input.RequestId, SessionId = session.Id, PersonId = actor,
            Mode = input.Mode, Status = "Confirmed", RegisteredAtUtc = now, CreatedAtUtc = now };
        db.Add(saved);
        await db.SaveChangesAsync(ct);
        InitiativeWork.Audit(db, RegistrationResource, saved.Id, actor, "Participant", "SessionRegistered", null, saved.Status, null, now,
            new { sessionId, mode = saved.Mode, noticeVersion = NoticeVersion, sessionVersion = input.Version,
                session.Title, session.StartsAtUtc, session.EndsAtUtc, session.Venue });
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Ok(Registration(saved, true));
    }

    [HttpPost("{sessionId:guid}/registrations/{registrationId:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid sessionId, Guid registrationId, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not long actor) return Unauthorized();
        var initiativeId = await Parent(sessionId, ct);
        if (initiativeId is not Guid parent) return NotFound();
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var initiative = await InitiativeWork.Lock(db, parent, ct);
        if (initiative is null) return NotFound();
        var session = await Rows(db).AsNoTracking().SingleOrDefaultAsync(row => row.PublicId == sessionId &&
            row.InitiativeId == initiative.Id, ct);
        if (session is null) return NotFound();
        var registration = await db.SessionRegistration.SingleOrDefaultAsync(row => row.SessionId == session.Id &&
            row.PersonId == actor && row.PublicId == registrationId, ct);
        if (registration is null) return NotFound();
        if (registration.Status == "Cancelled") return Ok(Registration(registration, false));
        var now = PersonalRecords.Now(clock);
        if (!CanCancel(session, registration, now) || await db.Attendance.AnyAsync(row => row.RegistrationId == registration.Id, ct))
            return Conflict("This registration can no longer be cancelled.");
        InitiativeWork.Audit(db, RegistrationResource, registration.Id, actor, "Participant", "SessionRegistrationCancelled",
            registration.Status, "Cancelled", null, now, new { sessionId });
        registration.Status = "Cancelled";
        registration.CancelledAtUtc = now;
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Ok(Registration(registration, false));
    }

    private IQueryable<SessionRow> PublicRows(DateTime now) => Read(db).Where(row => row.Session.Status == "Published" &&
        InitiativeStaffAccess.EligibleInitiatives(db, now).Any(item => item.Id == row.Initiative.Id));

    private Task<Guid?> Parent(Guid sessionId, CancellationToken ct) =>
        (from session in Rows(db).AsNoTracking()
         join initiative in db.Set<Initiative>() on session.InitiativeId equals (long?)initiative.Id
         where session.PublicId == sessionId
         select (Guid?)initiative.PublicId).SingleOrDefaultAsync(ct);
}
