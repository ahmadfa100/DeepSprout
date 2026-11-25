using System.Data;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using DeepSprout.Domain.V5;
using DeepSprout.Infrastructure.V5;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Web.Services;

public sealed class AttendanceQrService(DeepSproutV5DbContext db, IDataProtectionProvider protection, TimeProvider clock)
{
    private const string Prefix = "DSQR2.";
    internal const string Resource = "session.Attendance";
    private readonly ITimeLimitedDataProtector _protector = protection
        .CreateProtector("DeepSprout.Attendance.Qr.v2").ToTimeLimitedDataProtector();

    public async Task<AttendancePass> IssueAsync(Guid sessionId, long actor, CancellationToken ct = default)
    {
        var parent = await Parent(sessionId, ct);
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var session = await LockSession(sessionId, parent, ct);
        var now = clock.GetUtcNow();
        var registration = await db.SessionRegistration.SingleOrDefaultAsync(row => row.SessionId == session.Id &&
            row.PersonId == actor && row.Status == "Confirmed" && row.Mode == "InPerson", ct);
        if (registration is null) throw new AttendanceQrException("A confirmed in-person registration is required.", 404);
        if (!await Eligible(session, actor, ct)) throw new AttendanceQrException("Current Initiative admission is required.", 403);
        await EnsureCheckIn(session, now.UtcDateTime, ct);
        if (!InitiativeSessions.Allows(session.Mode, "InPerson") ||
            await db.Attendance.AnyAsync(row => row.SessionId == session.Id && row.PersonId == actor && row.Status != "NotRecorded", ct))
            throw new AttendanceQrException("A check-in pass is unavailable for this registration.");
        var windowEnd = new DateTimeOffset(WindowEnd(session), TimeSpan.Zero);
        var expires = now.AddMinutes(15);
        if (expires > windowEnd) expires = windowEnd;
        expires = DateTimeOffset.FromUnixTimeSeconds(expires.ToUnixTimeSeconds());
        if (expires <= now) throw new AttendanceQrException("The check-in window has closed.");

        var code = AttendanceQrCode.Create(expires);
        registration.CredentialHash = AttendanceQrCode.Hash(code, now);
        var payload = _protector.Protect($"{sessionId:N}|{code}", expires);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return new AttendancePass(Prefix + payload, code, expires);
    }

    public async Task<AttendanceCheckIn> CheckInAsync(Guid sessionId, long actor, string credential, CancellationToken ct = default)
    {
        var parent = await Parent(sessionId, ct);
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var session = await LockSession(sessionId, parent, ct);
        var now = clock.GetUtcNow();
        await RequireDuty(session, actor, now.UtcDateTime, ct);
        await EnsureCheckIn(session, now.UtcDateTime, ct);
        if (!InitiativeSessions.Allows(session.Mode, "InPerson"))
            throw new AttendanceQrException("This session uses online roster verification.");
        var code = credential.Trim();
        var method = "BookingCode";
        if (code.StartsWith(Prefix, StringComparison.Ordinal))
        {
            try
            {
                var parts = _protector.Unprotect(code[Prefix.Length..]).Split('|', 2);
                if (parts.Length != 2 || parts[0] != sessionId.ToString("N"))
                    throw new AttendanceQrException("This QR pass belongs to another session.");
                code = parts[1];
                method = "QrScan";
            }
            catch (CryptographicException) { throw new AttendanceQrException("This QR pass is invalid or has expired."); }
        }
        var hash = AttendanceQrCode.Hash(code, now);
        var candidates = await db.SessionRegistration.Where(row => row.SessionId == session.Id && row.Status == "Confirmed" &&
            row.Mode == "InPerson" && row.CredentialHash != null).ToListAsync(ct);
        var registration = candidates.SingleOrDefault(row => CryptographicOperations.FixedTimeEquals(row.CredentialHash!, hash));
        if (registration is null) throw new AttendanceQrException("This code is invalid, already used or belongs to another session.");
        await RequireParticipant(session, registration, actor, ct);
        var entry = await Existing(session, registration, ct);
        if (entry?.Status is "Present" or "Late" or "Absent") throw new AttendanceQrException("Attendance is already recorded.");
        var status = now.UtcDateTime > session.StartsAtUtc.AddMinutes(10) ? "Late" : "Present";
        var reason = entry is null ? null : "Verified with a new session credential.";
        var result = await Save(session, registration, entry, actor, status, method, reason, now.UtcDateTime, ct);
        await transaction.CommitAsync(ct);
        return result;
    }

    internal async Task<AttendanceCheckIn> RecordAsync(Guid sessionId, Guid registrationId, long actor,
        string status, string command, string? reason, string? version, CancellationToken ct)
    {
        var parent = await Parent(sessionId, ct);
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var session = await LockSession(sessionId, parent, ct);
        var now = PersonalRecords.Now(clock);
        await RequireDuty(session, actor, now, ct);
        if (!session.AttendanceRequired || session.Status is not ("Published" or "Completed"))
            throw new AttendanceQrException("Attendance is unavailable for this session.");
        var registration = await db.SessionRegistration.SingleOrDefaultAsync(row => row.SessionId == session.Id &&
            row.PublicId == registrationId && row.Status == "Confirmed", ct);
        if (registration is null) throw new AttendanceQrException("The confirmed registration was not found.", 404);
        var entry = await Existing(session, registration, ct);
        if (command == "Correct")
        {
            if (entry is null || version != InitiativeWork.Version(entry.RowVersion))
                throw new AttendanceQrException("Attendance changed. Reload it before correcting.");
            if (status == entry.Status) throw new AttendanceQrException("Choose a different factual status.");
            if (registration.PersonId == actor) throw new AttendanceQrException("A Supervisor cannot verify their own attendance.", 403);
        }
        else
        {
            await RequireParticipant(session, registration, actor, ct);
            if (entry is not null && entry.Status != "NotRecorded")
                throw new AttendanceQrException("Attendance already exists. Use a correction.");
            if (entry is not null && version != InitiativeWork.Version(entry.RowVersion))
                throw new AttendanceQrException("Attendance changed. Reload it before recording.");
        }
        if (status == "Absent" && now < WindowEnd(session))
            throw new AttendanceQrException("An absence can be recorded after the check-in window closes.");
        if (command == "Online")
        {
            if (registration.Mode != "Online" || status == "NotRecorded")
                throw new AttendanceQrException("Online roster verification requires an online registration.", 400);
            if (status != "Absent" && (now < WindowStart(session) || now >= WindowEnd(session)))
                throw new AttendanceQrException("Use a reasoned manual exception outside the check-in window.");
        }
        else if (string.IsNullOrWhiteSpace(reason) || status != "NotRecorded" && now < session.StartsAtUtc)
            throw new AttendanceQrException("Enter a reason and wait until this session has started.", 400);
        if (command != "Correct" && status == "NotRecorded")
            throw new AttendanceQrException("Not Recorded is available as a factual correction.", 400);
        if (command == "Online" && entry is not null && string.IsNullOrWhiteSpace(reason))
            reason = "Verified against the online roster.";
        var method = command switch { "Online" => "OnlineRoster", "Correct" => "Correction", _ => "ManualException" };
        var result = await Save(session, registration, entry, actor, status, method, reason, now, ct);
        await transaction.CommitAsync(ct);
        return result;
    }

    internal async Task<Guid> Parent(Guid sessionId, CancellationToken ct)
    {
        var parent = await (from row in InitiativeSessions.Rows(db).AsNoTracking()
                            join initiative in db.Set<Initiative>() on row.InitiativeId equals (long?)initiative.Id
                            where row.PublicId == sessionId select (Guid?)initiative.PublicId).SingleOrDefaultAsync(ct);
        return parent ?? throw new AttendanceQrException("This session is unavailable.", 404);
    }

    internal async Task<Session> LockSession(Guid sessionId, Guid parent, CancellationToken ct)
    {
        if (await InitiativeWork.Lock(db, parent, ct) is not { } initiative)
            throw new AttendanceQrException("This session is unavailable.", 404);
        return await InitiativeSessions.Rows(db).AsNoTracking().SingleOrDefaultAsync(row =>
            row.PublicId == sessionId && row.InitiativeId == initiative.Id, ct)
            ?? throw new AttendanceQrException("This session is unavailable.", 404);
    }

    internal IQueryable<StaffAppointment> Supervisors(long? initiativeId, DateTime now) =>
        from staff in db.Set<StaffAppointment>()
        join initiative in db.Set<Initiative>() on staff.InitiativeId equals (long?)initiative.Id
        join institution in db.Set<Organization>() on initiative.InstitutionId equals institution.Id
        where (initiativeId == null || staff.InitiativeId == initiativeId) && staff.ExperienceId == null && staff.Role == "Supervisor" &&
            staff.Status == "Active" && staff.AcceptedAtUtc <= now && staff.EndedAtUtc == null &&
            institution.Kind == "Institution" && institution.Status == "Verified" &&
            (initiative.Status == "Published" || initiative.Status == "RegistrationClosed" || initiative.Status == "Completed") &&
            db.Set<Person>().Any(person => person.Id == staff.PersonId && person.Status == "Active")
        select staff;

    internal IQueryable<StaffAppointment> OnDuty(Session session, DateTime now) =>
        from staff in Supervisors(session.InitiativeId, now)
        join duty in db.SessionDuty on staff.Id equals duty.StaffAppointmentId
        where duty.SessionId == session.Id && duty.Status == "Active" && duty.AssignedAtUtc <= now && duty.RevokedAtUtc == null
        select staff;

    internal Task<bool> Eligible(Session session, long person, CancellationToken ct) =>
        InitiativeSessions.Admitted(db, person).AnyAsync(row => row.InitiativeId == session.InitiativeId &&
            db.Set<Person>().Any(account => account.Id == person && account.Status == "Active"), ct);

    internal static DateTime WindowStart(Session session) => session.StartsAtUtc.AddMinutes(-session.CheckInBeforeMinutes);
    internal static DateTime WindowEnd(Session session) => session.EndsAtUtc.AddMinutes(session.CheckInAfterMinutes);

    private async Task RequireDuty(Session session, long actor, DateTime now, CancellationToken ct)
    {
        if (!await Supervisors(session.InitiativeId, now).AnyAsync(row => row.PersonId == actor, ct))
            throw new AttendanceQrException("An active Initiative Supervisor appointment is required.", 404);
        if (!await OnDuty(session, now).AnyAsync(row => row.PersonId == actor, ct))
            throw new AttendanceQrException("An assigned Supervisor is required for this session.", 403);
    }

    private async Task EnsureCheckIn(Session session, DateTime now, CancellationToken ct)
    {
        if (session.Status != "Published" || !session.AttendanceRequired || now < WindowStart(session) || now >= WindowEnd(session))
            throw new AttendanceQrException("Check-in is outside this session's published window.");
        if (!await OnDuty(session, now).AnyAsync(ct))
            throw new AttendanceQrException("Needs Supervisor. Check-in opens when active Session duty is assigned.");
    }

    private async Task RequireParticipant(Session session, SessionRegistration registration, long actor, CancellationToken ct)
    {
        if (registration.PersonId == actor || !InitiativeSessions.Allows(session.Mode, registration.Mode) ||
            !await Eligible(session, registration.PersonId, ct))
            throw new AttendanceQrException("This registration is not eligible for attendance verification.", 403);
    }

    private async Task<Attendance?> Existing(Session session, SessionRegistration registration, CancellationToken ct)
    {
        var entry = await db.Attendance.SingleOrDefaultAsync(row => row.SessionId == session.Id && row.PersonId == registration.PersonId, ct);
        if (entry is not null && (entry.RegistrationId != registration.Id || entry.BookingId != null))
            throw new AttendanceQrException("Existing attendance belongs to another original registration.");
        return entry;
    }

    private async Task<AttendanceCheckIn> Save(Session session, SessionRegistration registration, Attendance? entry,
        long actor, string status, string method, string? reason, DateTime now, CancellationToken ct)
    {
        var previous = entry is null ? null : new { entry.Status, entry.Method, entry.MethodReason, entry.RecordedByPersonId, entry.RecordedAtUtc };
        if (entry is null)
        {
            entry = new Attendance { SessionId = session.Id, RegistrationId = registration.Id, PersonId = registration.PersonId, CreatedAtUtc = now };
            db.Add(entry);
        }
        entry.Status = status;
        entry.Method = method;
        entry.MethodReason = reason;
        entry.RecordedByPersonId = actor;
        entry.RecordedAtUtc = now;
        registration.CredentialHash = null;
        await db.SaveChangesAsync(ct);
        InitiativeWork.Audit(db, Resource, entry.Id, actor, "Supervisor", previous is null ? "AttendanceRecorded" : "AttendanceCorrected",
            previous?.Status, status, reason, now, new { sessionId = session.PublicId, registrationId = registration.PublicId, method, previous });
        await db.SaveChangesAsync(ct);
        return new AttendanceCheckIn(status, InitiativeWork.Version(entry.RowVersion));
    }
}

public sealed record AttendancePass(string QrPayload, string Code, DateTimeOffset ExpiresAtUtc);
public sealed record AttendanceCheckIn(string Status, string Version);
public sealed class AttendanceQrException(string message, int status = 409) : Exception(message)
{
    internal int Status { get; } = status;
}

internal static class AttendanceQrCode
{
    private const string Alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    internal static string Create(DateTimeOffset expires)
    {
        Span<byte> random = stackalloc byte[20];
        RandomNumberGenerator.Fill(random);
        Span<char> letters = stackalloc char[20];
        for (var i = 0; i < random.Length; i++) letters[i] = Alphabet[random[i] & 31];
        return $"DS-{new string(letters[..5])}-{new string(letters[5..10])}-{new string(letters[10..15])}-{new string(letters[15..])}-{expires.ToUnixTimeSeconds():D12}";
    }

    internal static byte[] Hash(string code, DateTimeOffset now)
    {
        var normalized = code.Trim().ToUpperInvariant().Replace("-", "").Replace(" ", "");
        if (normalized.Length != 34 || !normalized.StartsWith("DS", StringComparison.Ordinal) ||
            normalized[2..22].Any(c => !Alphabet.Contains(c)) ||
            !long.TryParse(normalized[22..], NumberStyles.None, CultureInfo.InvariantCulture, out var expires))
            throw new AttendanceQrException("Enter a valid DeepSprout check-in code.", 400);
        if (expires <= now.ToUnixTimeSeconds()) throw new AttendanceQrException("This check-in code has expired.");
        // The stored hash binds both the random secret and expiry to this registration.
        return SHA256.HashData(Encoding.ASCII.GetBytes(normalized));
    }
}
