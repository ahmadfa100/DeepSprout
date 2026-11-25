using System.ComponentModel.DataAnnotations;
using System.Data;
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
public sealed class InitiativeAttendanceController(DeepSproutV5DbContext db, AttendanceQrService attendance, TimeProvider clock) : ControllerBase
{
    public sealed record CheckInInput([Required, MaxLength(2048)] string Credential);
    public sealed record RecordInput([Required] string Status, [Required] string Method,
        [MaxLength(800)] string? Reason, [MaxLength(30)] string? Version);
    public sealed record DutyInput(bool Active);

    [HttpGet("scopes/Supervisor")]
    public async Task<IActionResult> SupervisorScopes(CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not long actor) return Unauthorized();
        var now = PersonalRecords.Now(clock);
        var rows = await (from appointment in attendance.Supervisors(null, now)
                          join initiative in db.Set<Initiative>() on appointment.InitiativeId equals (long?)initiative.Id
                          join terms in db.Set<InitiativeRevision>() on initiative.CurrentRevisionId equals (long?)terms.Id
                          where appointment.PersonId == actor && terms.InitiativeId == initiative.Id
                          select new { initiativeId = initiative.PublicId, title = terms.Title }).Distinct().OrderBy(row => row.title).ToListAsync(ct);
        return Ok(rows);
    }

    [HttpGet("{role}/{initiativeId:guid}/{sessionId:guid?}")]
    public async Task<IActionResult> Overview(string role, Guid initiativeId, Guid? sessionId, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not long actor) return Unauthorized();
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var initiative = await Lock(db, initiativeId, ct);
        var now = PersonalRecords.Now(clock);
        if (initiative is null || !await Allowed(role, initiative, actor, now, ct)) return NotFound();
        var sessions = await InitiativeSessions.Read(db).Where(row => row.Initiative.Id == initiative.Id &&
            (row.Session.Status == "Published" || row.Session.Status == "Completed" ||
             row.Session.Status == "Cancelled" && db.Attendance.Any(item => item.SessionId == row.Session.Id)) &&
            (!sessionId.HasValue || row.Session.PublicId == sessionId))
            .OrderByDescending(row => row.Session.StartsAtUtc).ToListAsync(ct);
        if (sessionId.HasValue && sessions.Count == 0) return NotFound();
        var sessionKeys = sessions.Select(row => row.Session.Id).ToArray();
        var rows = await (from registration in db.SessionRegistration.AsNoTracking()
                          join person in db.Set<Person>() on registration.PersonId equals person.Id
                          join entry in db.Attendance.AsNoTracking()
                            on new { Registration = (long?)registration.Id, registration.PersonId, registration.SessionId }
                            equals new { Registration = entry.RegistrationId, entry.PersonId, entry.SessionId } into records
                          from entry in records.DefaultIfEmpty()
                          join excuse in db.Set<AbsenceExcuse>().AsNoTracking()
                            on new { Attendance = (long?)entry.Id, registration.PersonId }
                            equals new { Attendance = (long?)excuse.AttendanceId, excuse.PersonId } into excuses
                          from excuse in excuses.DefaultIfEmpty()
                          where sessionKeys.Contains(registration.SessionId) && (registration.Status == "Confirmed" || entry != null)
                          orderby person.DisplayName
                          select new { registration.SessionId, registration.PublicId, registration.PersonId, registration.Mode,
                              person.DisplayName, Record = entry, ExcuseStatus = excuse == null ? null : excuse.Status }).ToListAsync(ct);
        var roster = rows.ToLookup(row => row.SessionId);
        var duties = await (from duty in db.SessionDuty.AsNoTracking()
                            join staff in attendance.Supervisors(initiative.Id, now) on duty.StaffAppointmentId equals staff.Id
                            where sessionKeys.Contains(duty.SessionId) && duty.Status == "Active" &&
                                duty.RevokedAtUtc == null && duty.AssignedAtUtc <= now
                            select new { duty.SessionId, staff.PublicId, staff.PersonId }).ToListAsync(ct);
        var assigned = duties.ToLookup(row => row.SessionId);
        var summaries = sessions.Select(row =>
        {
            var session = row.Session;
            var records = roster[session.Id];
            return new { id = session.PublicId, session.Title, session.TimeZoneId, startsAtUtc = Utc(session.StartsAtUtc),
                needsSupervisor = session.AttendanceRequired && assigned[session.Id].Count() == 0, session.AttendanceRequired,
                registrations = records.Count(), present = records.Count(item => item.Record?.Status == "Present"),
                late = records.Count(item => item.Record?.Status == "Late"), absent = records.Count(item => item.Record?.Status == "Absent"),
                notRecorded = records.Count(item => item.Record is null || item.Record.Status == "NotRecorded"),
                excused = records.Count(item => item.Record?.Status == "Absent" && item.ExcuseStatus == "Accepted"),
                excusesPending = records.Count(item => item.Record?.Status == "Absent" && item.ExcuseStatus is "Submitted" or "Recommended" or "MoreInfo"),
                excusesRejected = records.Count(item => item.Record?.Status == "Absent" && item.ExcuseStatus == "Rejected") };
        }).ToList();
        if (sessionId is null)
        {
            await transaction.CommitAsync(ct);
            return Ok(summaries);
        }
        var selected = sessions[0];
        var target = selected.Session;
        var ids = roster[target.Id].Select(item => item.Record?.Id ?? 0).Where(id => id > 0).ToArray();
        var history = await (from change in db.Set<AuditEvent>().AsNoTracking()
                             join person in db.Set<Person>() on change.ActorPersonId equals (long?)person.Id
                             where ids.Contains(change.ResourceId) && (change.ResourceKind == AttendanceQrService.Resource || change.ResourceKind == "Attendance")
                             orderby change.Id descending
                             select new { change.ResourceId, change.BeforeStatus, change.AfterStatus, change.Reason, atUtc = change.AtUtc,
                                 actor = person.DisplayName, change.Action }).ToListAsync(ct);
        var staffOptions = role == "Representative" ? await (from staff in attendance.Supervisors(initiative.Id, now)
            join person in db.Set<Person>() on staff.PersonId equals (long?)person.Id
            orderby person.DisplayName select new { id = staff.PublicId, person.DisplayName }).ToListAsync(ct) : null;
        await transaction.CommitAsync(ct);
        return Ok(new
        {
            session = InitiativeSessions.View(selected, true, now), summary = summaries[0],
            canRecord = target.AttendanceRequired && target.Status != "Cancelled" && role == "Supervisor" && assigned[target.Id].Any(item => item.PersonId == actor),
            canAssign = role == "Representative" && target.AttendanceRequired && target.Status != "Cancelled",
            canVerify = target.Status == "Published" && now >= AttendanceQrService.WindowStart(target) && now < AttendanceQrService.WindowEnd(target),
            canRecordAbsence = now >= AttendanceQrService.WindowEnd(target),
            canRecordManual = now >= target.StartsAtUtc,
            windowOpensAtUtc = Utc(AttendanceQrService.WindowStart(target)), windowEndsAtUtc = Utc(AttendanceQrService.WindowEnd(target)),
            supervisors = staffOptions?.Select(item => new { item.id, item.DisplayName,
                assigned = assigned[target.Id].Any(duty => duty.PublicId == item.id) }),
            roster = roster[target.Id].Select(item => new
            {
                registrationId = item.PublicId, item.DisplayName, item.Mode, status = item.Record?.Status ?? "NotRecorded",
                item.ExcuseStatus, method = item.Record?.Method, recordedAtUtc = Utc(item.Record?.RecordedAtUtc),
                canVerifyParticipant = actor != item.PersonId,
                version = item.Record is null ? null : Version(item.Record.RowVersion),
                history = history.Where(row => row.ResourceId == item.Record?.Id).Select(row => new { row.BeforeStatus,
                    row.AfterStatus,row.Reason,row.actor,row.Action,atUtc = Utc(row.atUtc) })
            })
        });
    }

    [HttpPost("sessions/{sessionId:guid}/pass")]
    public async Task<IActionResult> Issue(Guid sessionId, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not long actor) return Unauthorized();
        try { return Ok(await attendance.IssueAsync(sessionId, actor, ct)); }
        catch (AttendanceQrException error) { return StatusCode(error.Status, error.Message); }
    }

    [HttpPost("sessions/{sessionId:guid}/check-in")]
    public async Task<IActionResult> CheckIn(Guid sessionId, CheckInInput input, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not long actor) return Unauthorized();
        try { return Ok(await attendance.CheckInAsync(sessionId, actor, input.Credential, ct)); }
        catch (AttendanceQrException error) { return StatusCode(error.Status, error.Message); }
    }

    [HttpPost("sessions/{sessionId:guid}/registrations/{registrationId:guid}/record")]
    public async Task<IActionResult> Record(Guid sessionId, Guid registrationId, RecordInput input, CancellationToken ct)
    {
        if (input.Status is not ("Present" or "Late" or "Absent" or "NotRecorded") || input.Method is not ("Online" or "Manual" or "Correct"))
            return BadRequest("Choose a supported factual status and verification method.");
        if (await PersonalRecords.PersonId(db, User, ct) is not long actor) return Unauthorized();
        try { return Ok(await attendance.RecordAsync(sessionId, registrationId, actor, input.Status, input.Method, input.Reason?.Trim(), input.Version, ct)); }
        catch (AttendanceQrException error) { return StatusCode(error.Status, error.Message); }
    }

    [HttpPut("sessions/{sessionId:guid}/duty/{appointmentId:guid}")]
    public async Task<IActionResult> Duty(Guid sessionId, Guid appointmentId, DutyInput input, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not long actor) return Unauthorized();
        try
        {
            var parent = await attendance.Parent(sessionId, ct);
            await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
            var session = await attendance.LockSession(sessionId, parent, ct);
            var initiative = await db.Set<Initiative>().AsNoTracking().SingleAsync(row => row.PublicId == parent, ct);
            var now = PersonalRecords.Now(clock);
            if (!await Allowed("Representative", initiative, actor, now, ct)) return NotFound();
            if (!session.AttendanceRequired || session.Status is not ("Published" or "Completed"))
                return Conflict("This session does not accept Supervisor duty changes.");
            var appointment = await attendance.Supervisors(initiative.Id, now).SingleOrDefaultAsync(row => row.PublicId == appointmentId, ct);
            if (appointment is null) return NotFound();
            var duty = await db.SessionDuty.SingleOrDefaultAsync(row => row.SessionId == session.Id &&
                row.StaffAppointmentId == appointment.Id && row.Status == "Active" && row.RevokedAtUtc == null, ct);
            if (input.Active == (duty is not null)) return Ok(new { input.Active });
            if (input.Active)
                db.Add(new SessionDuty { SessionId = session.Id, StaffAppointmentId = appointment.Id, Status = "Active",
                    AssignedByPersonId = actor, AssignedAtUtc = now, CreatedAtUtc = now });
            else
            {
                duty!.Status = "Revoked";
                duty.RevokedAtUtc = now;
            }
            Audit(db, InitiativeSessions.SessionResource, session.Id, actor, "Representative",
                input.Active ? "SessionDutyAssigned" : "SessionDutyEnded", null, input.Active ? "Active" : "Revoked", null,
                now, new { appointmentId });
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            return Ok(new { input.Active });
        }
        catch (AttendanceQrException error) { return StatusCode(error.Status, error.Message); }
    }

    private Task<bool> Allowed(string role, Initiative initiative, long actor, DateTime now, CancellationToken ct) => role switch
    {
        "Representative" => InstitutionAccess.VerifiedInstitutions(db, actor).AnyAsync(row => row.Id == initiative.InstitutionId, ct),
        "Supervisor" => attendance.Supervisors(initiative.Id, now).AnyAsync(row => row.PersonId == actor, ct),
        _ => Task.FromResult(false)
    };
}
