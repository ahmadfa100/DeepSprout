using System.ComponentModel.DataAnnotations;
using System.Data;
using System.Text.Json.Serialization;
using DeepSprout.Domain.V5;
using DeepSprout.Infrastructure.V5;
using DeepSprout.Web.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using static DeepSprout.Web.Services.InitiativeWork;

namespace DeepSprout.Web.Controllers;

[ApiController]
[Authorize]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[Route("api/initiative-attendance")]
public sealed class InitiativeExcusesController(DeepSproutV5DbContext db, AttendanceQrService attendance, TimeProvider clock) : ControllerBase
{
    private const string Resource = "session.AbsenceExcuse";
    [JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
    public sealed record ExcuseInput(Guid RegistrationId, [Required, MaxLength(1000)] string Reason);
    public sealed record DecisionInput([Required] string Decision, [Required, MaxLength(1000)] string Reason,
        [Required, MaxLength(30)] string Version);

    [HttpGet("mine")]
    public async Task<IActionResult> Mine([FromQuery] Guid? initiative, [FromQuery] Guid? session, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not long actor) return Unauthorized();
        var now = PersonalRecords.Now(clock);
        var rows = await (from registration in db.SessionRegistration.AsNoTracking()
                          join source in InitiativeSessions.Read(db) on registration.SessionId equals source.Session.Id
                          join record in db.Attendance.AsNoTracking()
                            on new { Id = (long?)registration.Id, registration.PersonId, registration.SessionId }
                            equals new { Id = record.RegistrationId, record.PersonId, record.SessionId } into records
                          from record in records.DefaultIfEmpty()
                          join excuse in db.Set<AbsenceExcuse>().AsNoTracking()
                            on new { Id = (long?)record.Id, registration.PersonId }
                            equals new { Id = (long?)excuse.AttendanceId, excuse.PersonId } into excuses
                          from excuse in excuses.DefaultIfEmpty()
                          where registration.PersonId == actor && (initiative == null || source.Initiative.PublicId == initiative) &&
                              (session == null || source.Session.PublicId == session)
                          orderby registration.Id descending
                          select new { registration, source, record, excuse,
                              admitted = InitiativeSessions.Admitted(db, actor).Any(item => item.InitiativeId == source.Initiative.Id),
                              supervisor = attendance.Supervisors(null, now).Any(staff => staff.InitiativeId == source.Initiative.Id &&
                                  db.SessionDuty.Any(duty => duty.StaffAppointmentId == staff.Id && duty.SessionId == source.Session.Id &&
                                      duty.Status == "Active" && duty.RevokedAtUtc == null && duty.AssignedAtUtc <= now)) }).ToListAsync(ct);
        return Ok(rows.Select(row =>
        {
            var target = row.source.Session;
            var open = target.Status == "Published" && now >= AttendanceQrService.WindowStart(target) && now < AttendanceQrService.WindowEnd(target);
            var usable = row.admitted && row.source.Institution.Status == "Verified" && row.source.Institution.Kind == "Institution" &&
                (row.source.Initiative.Status is "Published" or "RegistrationClosed" or "Completed") && row.registration.Status == "Confirmed";
            return new
            {
                sessionId = target.PublicId, registrationId = row.registration.PublicId, registrationStatus = row.registration.Status,
                title = target.Title, row.registration.Mode, startsAtUtc = Utc(target.StartsAtUtc),
                status = row.record?.Status ?? "NotRecorded", method = row.record?.Method, recordedAtUtc = Utc(row.record?.RecordedAtUtc),
                needsSupervisor = target.AttendanceRequired && target.Status == "Published" && usable && !row.supervisor,
                canIssue = usable && row.supervisor && open && target.AttendanceRequired &&
                    row.registration.Mode == "InPerson" && (row.record is null || row.record.Status == "NotRecorded"),
                opensAtUtc = Utc(AttendanceQrService.WindowStart(target)), closesAtUtc = Utc(AttendanceQrService.WindowEnd(target)),
                target.AttendanceRequired,
                canSubmit = usable && row.record?.Status == "Absent" && row.excuse is null && target.Status is "Published" or "Completed",
                excuse = row.excuse is null ? null : new { id = row.excuse.PublicId, row.excuse.Status, row.excuse.Reason,
                    createdAtUtc = Utc(row.excuse.CreatedAtUtc), recommendedAtUtc = Utc(row.excuse.RecommendedAtUtc),
                    decidedAtUtc = Utc(row.excuse.DecidedAtUtc), row.excuse.DecisionReason }
            };
        }));
    }

    [HttpGet("{role}/{initiativeId:guid}/excuses")]
    public async Task<IActionResult> Staff(string role, Guid initiativeId, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not long actor) return Unauthorized();
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var initiative = await Lock(db, initiativeId, ct);
        var now = PersonalRecords.Now(clock);
        if (initiative is null || !await Allowed(role, initiative, actor, now, ct)) return NotFound();
        var rows = await (from item in ScopedExcuses(initiative.Id)
                          join person in db.Set<Person>() on item.Row.PersonId equals person.Id
                          orderby item.Row.Id descending
                          select new { item.Row, attendanceStatus = item.Entry.Status, item.Session.Title, sessionId = item.Session.PublicId, person.DisplayName })
            .ToListAsync(ct);
        var ids = rows.SelectMany(item => new[] { item.Row.RecommendedByPersonId, item.Row.DecidedByPersonId }).OfType<long>().Distinct().ToArray();
        var authors = await db.Set<Person>().Where(person => ids.Contains(person.Id)).ToDictionaryAsync(person => person.Id, person => person.DisplayName, ct);
        await transaction.CommitAsync(ct);
        return Ok(rows.Select(item => new
        {
            id = item.Row.PublicId, item.sessionId, item.Title, item.DisplayName, attendance = item.attendanceStatus,
            item.Row.Status, item.Row.Reason, item.Row.Recommendation, item.Row.RecommendationNote,
            recommender = item.Row.RecommendedByPersonId is long recommender ? authors.GetValueOrDefault(recommender) : null,
            decisionMaker = item.Row.DecidedByPersonId is long decider ? authors.GetValueOrDefault(decider) : null,
            item.Row.DecisionReason, createdAtUtc = Utc(item.Row.CreatedAtUtc), recommendedAtUtc = Utc(item.Row.RecommendedAtUtc),
            decidedAtUtc = Utc(item.Row.DecidedAtUtc), version = Version(item.Row.RowVersion),
            canRecommend = role == "Supervisor" && item.Row.PersonId != actor && item.Row.Status == "Submitted" && item.attendanceStatus == "Absent",
            canDecide = role == "Representative" && item.Row.PersonId != actor &&
                item.Row.Status == "Recommended" && item.attendanceStatus == "Absent"
        }));
    }

    [HttpPost("sessions/{sessionId:guid}/excuse")]
    public async Task<IActionResult> Submit(Guid sessionId, ExcuseInput input, CancellationToken ct)
    {
        var reason = input.Reason.Trim();
        if (reason.Length == 0) return BadRequest("Enter a reason for the absence.");
        if (await PersonalRecords.PersonId(db, User, ct) is not long actor) return Unauthorized();
        try
        {
            var parent = await attendance.Parent(sessionId, ct);
            await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
            var session = await attendance.LockSession(sessionId, parent, ct);
            var registration = await db.SessionRegistration.AsNoTracking().SingleOrDefaultAsync(row => row.SessionId == session.Id &&
                row.PersonId == actor && row.PublicId == input.RegistrationId && row.Status == "Confirmed", ct);
            if (registration is null) return NotFound();
            var active = await InitiativeSessions.Read(db).AnyAsync(row => row.Session.Id == session.Id && row.Institution.Status == "Verified" &&
                row.Institution.Kind == "Institution" && (row.Initiative.Status == "Published" ||
                row.Initiative.Status == "RegistrationClosed" || row.Initiative.Status == "Completed"), ct);
            if (!active || session.Status is not ("Published" or "Completed") || !await attendance.Eligible(session, actor, ct))
                return Conflict("This registration is unavailable for an excuse.");
            var entry = await db.Attendance.AsNoTracking().SingleOrDefaultAsync(row => row.RegistrationId == registration.Id &&
                row.PersonId == actor && row.SessionId == session.Id, ct);
            if (entry?.Status != "Absent") return Conflict("An excuse requires a recorded absence.");
            var existing = await db.Set<AbsenceExcuse>().AsNoTracking().SingleOrDefaultAsync(row => row.AttendanceId == entry.Id, ct);
            if (existing is not null)
                return existing.PersonId == actor && reason == existing.Reason ? Ok(Saved(existing)) : Conflict("An excuse is already recorded for this absence.");
            var now = PersonalRecords.Now(clock);
            var excuse = new AbsenceExcuse { PublicId = Guid.NewGuid(), AttendanceId = entry.Id, PersonId = actor,
                Reason = reason, CreatedAtUtc = now, Status = "Submitted" };
            db.Add(excuse);
            await db.SaveChangesAsync(ct);
            Audit(db, Resource, excuse.Id, actor, "Participant", "ExcuseSubmitted", null, excuse.Status, null, now,
                new { sessionId, registrationId = registration.PublicId });
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            return Ok(Saved(excuse));
        }
        catch (AttendanceQrException error) { return StatusCode(error.Status, error.Message); }
    }

    [HttpPost("sessions/{sessionId:guid}/excuses/{id:guid}/{step}")]
    public async Task<IActionResult> Decide(Guid sessionId, Guid id, string step, DecisionInput input, CancellationToken ct)
    {
        if (step is not ("recommend" or "decide")) return NotFound();
        var recommendation = step == "recommend";
        var note = input.Reason.Trim();
        if (note.Length == 0 || (recommendation ? input.Decision is not ("Accept" or "Reject") : input.Decision is not ("Accepted" or "Rejected")))
            return BadRequest("Choose a decision and enter a reason.");
        if (await PersonalRecords.PersonId(db, User, ct) is not long actor) return Unauthorized();
        try
        {
            var parent = await attendance.Parent(sessionId, ct);
            await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
            var session = await attendance.LockSession(sessionId, parent, ct);
            var initiative = await db.Set<Initiative>().AsNoTracking().SingleAsync(row => row.PublicId == parent, ct);
            var now = PersonalRecords.Now(clock);
            var role = recommendation ? "Supervisor" : "Representative";
            if (!await Allowed(role, initiative, actor, now, ct)) return NotFound();
            var source = await ScopedExcuses(initiative.Id).SingleOrDefaultAsync(row => row.Row.PublicId == id && row.Session.Id == session.Id, ct);
            if (source is null || source.Row.PersonId == actor) return NotFound();
            var excuse = source.Row;
            if (recommendation && excuse.Status == "Recommended" && excuse.Recommendation == input.Decision &&
                excuse.RecommendedByPersonId == actor && excuse.RecommendationNote == note ||
                !recommendation && excuse.Status == input.Decision && excuse.DecidedByPersonId == actor && excuse.DecisionReason == note)
                return Ok(Saved(excuse));
            if (excuse.Status != (recommendation ? "Submitted" : "Recommended") || source.Entry.Status != "Absent" ||
                input.Version != Version(excuse.RowVersion)) return Conflict("This excuse changed or is unavailable for this decision.");
            var before = excuse.Status;
            if (recommendation)
            {
                excuse.Status = "Recommended";
                excuse.Recommendation = input.Decision;
                excuse.RecommendationNote = note;
                excuse.RecommendedByPersonId = actor;
                excuse.RecommendedAtUtc = now;
            }
            else
            {
                excuse.Status = input.Decision;
                excuse.DecisionReason = note;
                excuse.DecidedByPersonId = actor;
                excuse.DecidedAtUtc = now;
            }
            Audit(db, Resource, excuse.Id, actor, role, recommendation ? "ExcuseRecommended" : "ExcuseDecided",
                before, excuse.Status, note, now, new { sessionId, input.Decision });
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            return Ok(Saved(excuse));
        }
        catch (AttendanceQrException error) { return StatusCode(error.Status, error.Message); }
    }

    private sealed class ExcuseRow
    {
        public required AbsenceExcuse Row { get; init; }
        public required Attendance Entry { get; init; }
        public required Session Session { get; init; }
    }

    private IQueryable<ExcuseRow> ScopedExcuses(long initiativeId) =>
        from excuse in db.Set<AbsenceExcuse>()
        join entry in db.Attendance on excuse.AttendanceId equals entry.Id
        join registration in db.SessionRegistration on entry.RegistrationId equals (long?)registration.Id
        join session in InitiativeSessions.Rows(db) on entry.SessionId equals session.Id
        where session.InitiativeId == initiativeId && session.Status != "Draft" && registration.SessionId == session.Id &&
            registration.PersonId == excuse.PersonId && entry.PersonId == excuse.PersonId
        select new ExcuseRow { Row = excuse, Entry = entry, Session = session };

    private Task<bool> Allowed(string role, Initiative initiative, long actor, DateTime now, CancellationToken ct) => role switch
    {
        "Representative" => InstitutionAccess.VerifiedInstitutions(db, actor).AnyAsync(row => row.Id == initiative.InstitutionId, ct),
        "Supervisor" => attendance.Supervisors(initiative.Id, now).AnyAsync(row => row.PersonId == actor, ct),
        _ => Task.FromResult(false)
    };

    private static object Saved(AbsenceExcuse row) => new { id = row.PublicId, row.Status, version = Version(row.RowVersion) };
}
