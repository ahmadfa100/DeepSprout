using System.Security.Cryptography;
using System.Text;
using DeepSprout.Domain.V5;
using DeepSprout.Infrastructure.V5;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Web.Services;

/// <summary>
/// Server-side credential and attendance operations for an authenticated caller.
/// The current browser demo does not call this service until server identity is wired.
/// A QR encodes an opaque, 15-minute protected pass; the printed code is a separate
/// fallback. Both resolve to the same hashed credential on the confirmed booking.
/// </summary>
public sealed class AttendanceQrService(
    DeepSproutV5DbContext db,
    IDataProtectionProvider protection,
    TimeProvider clock)
{
    private readonly ITimeLimitedDataProtector _protector = protection
        .CreateProtector("DeepSprout.Attendance.Qr.v1")
        .ToTimeLimitedDataProtector();

    public async Task<AttendancePass> IssueAsync(Guid sessionPublicId, long participantPersonId,
        CancellationToken cancellationToken = default)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable,
            cancellationToken);
        var session = await db.Session.SingleOrDefaultAsync(x => x.PublicId == sessionPublicId, cancellationToken)
            ?? throw new AttendanceQrException("Session not found.");
        var now = clock.GetUtcNow().UtcDateTime;
        await EnsureSessionOpenAsync(session, now, cancellationToken);

        SessionRegistration? registration = null;
        ExperienceBooking? booking = null;
        if (session.InitiativeId is not null)
        {
            registration = await db.SessionRegistration.SingleOrDefaultAsync(x =>
                x.SessionId == session.Id && x.PersonId == participantPersonId &&
                x.Status == "Confirmed" && x.Mode == "InPerson", cancellationToken);
        }
        else if (session.ExperienceId is long experienceId)
        {
            booking = await db.ExperienceBooking.SingleOrDefaultAsync(x =>
                x.ExperienceId == experienceId && x.PersonId == participantPersonId &&
                x.Status == "Confirmed" && (session.Mode == "InPerson" || x.Mode == "InPerson"), cancellationToken);
        }
        if (registration is null && booking is null)
            throw new AttendanceQrException("A confirmed in-person place is required.");
        await EnsureParticipantEligibleAsync(session, participantPersonId, cancellationToken);
        if (await db.Attendance.AnyAsync(x => x.SessionId == session.Id && x.PersonId == participantPersonId,
                cancellationToken))
            throw new AttendanceQrException("Attendance has already been recorded.");

        // Rotating the code invalidates earlier passes for this booking. This is
        // especially relevant to activities with more than one session.
        var code = AttendanceQrCode.Create();
        var hash = AttendanceQrCode.Hash(code);
        if (registration is not null) registration.CredentialHash = hash;
        else booking!.CredentialHash = hash;
        var expires = new DateTimeOffset(session.EndsAtUtc.AddMinutes(session.CheckInAfterMinutes), TimeSpan.Zero);
        var issuedAt = clock.GetUtcNow();
        var qrExpires = issuedAt.AddMinutes(15);
        if (qrExpires > expires) qrExpires = expires;
        if (qrExpires <= issuedAt) throw new AttendanceQrException("The check-in window has closed.");
        var payload = _protector.Protect($"{sessionPublicId:N}|{code}", qrExpires - issuedAt);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return new AttendancePass("DSQR1." + payload, code, qrExpires);
    }

    public async Task<AttendanceCheckIn> CheckInAsync(Guid sessionPublicId, long supervisorPersonId,
        string scannedOrTypedCode, CancellationToken cancellationToken = default)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable,
            cancellationToken);
        var session = await db.Session.SingleOrDefaultAsync(x => x.PublicId == sessionPublicId, cancellationToken)
            ?? throw new AttendanceQrException("Session not found.");
        var now = clock.GetUtcNow().UtcDateTime;
        await EnsureSessionOpenAsync(session, now, cancellationToken);
        var authorized = await db.SessionDuty.AnyAsync(d => d.SessionId == session.Id && d.Status == "Active" &&
            db.StaffAppointment.Any(a => a.Id == d.StaffAppointmentId && a.PersonId == supervisorPersonId &&
                a.Role == "Supervisor" && a.Status == "Active" &&
                (a.InitiativeId == session.InitiativeId && session.InitiativeId != null ||
                 a.ExperienceId == session.ExperienceId && session.ExperienceId != null)), cancellationToken);
        if (!authorized) throw new AttendanceQrException("An active assigned Supervisor is required.");
        if (!await db.Person.AnyAsync(x => x.Id == supervisorPersonId && x.Status == "Active", cancellationToken))
            throw new AttendanceQrException("The assigned Supervisor is not active.");
        if (string.IsNullOrWhiteSpace(scannedOrTypedCode) || scannedOrTypedCode.Length > 2048)
            throw new AttendanceQrException("Enter a valid DeepSprout booking code.");

        var method = "BookingCode";
        var code = scannedOrTypedCode;
        if (code.StartsWith("DSQR1.", StringComparison.Ordinal))
        {
            try
            {
                var parts = _protector.Unprotect(code[6..]).Split('|', 2);
                if (parts.Length != 2 || parts[0] != sessionPublicId.ToString("N"))
                    throw new AttendanceQrException("This pass belongs to another session.");
                code = parts[1];
                method = "QrScan";
            }
            catch (CryptographicException)
            {
                throw new AttendanceQrException("This QR pass is invalid or has expired.");
            }
        }
        var hash = AttendanceQrCode.Hash(code);
        SessionRegistration? registration = null;
        ExperienceBooking? booking = null;
        if (session.InitiativeId is not null)
        {
            var candidates = await db.SessionRegistration.Where(x => x.SessionId == session.Id &&
                x.Status == "Confirmed" && x.Mode == "InPerson" && x.CredentialHash != null)
                .ToListAsync(cancellationToken);
            registration = candidates.SingleOrDefault(x => CryptographicOperations.FixedTimeEquals(x.CredentialHash!, hash));
        }
        else if (session.ExperienceId is long experienceId)
        {
            var candidates = await db.ExperienceBooking.Where(x => x.ExperienceId == experienceId &&
                x.Status == "Confirmed" && (session.Mode == "InPerson" || x.Mode == "InPerson") &&
                x.CredentialHash != null).ToListAsync(cancellationToken);
            booking = candidates.SingleOrDefault(x => CryptographicOperations.FixedTimeEquals(x.CredentialHash!, hash));
        }
        if (registration is null && booking is null)
            throw new AttendanceQrException("This code is not a confirmed in-person booking for this session.");
        var personId = registration?.PersonId ?? booking!.PersonId;
        await EnsureParticipantEligibleAsync(session, personId, cancellationToken);

        var existing = await db.Attendance.SingleOrDefaultAsync(x => x.SessionId == session.Id &&
            x.PersonId == personId, cancellationToken);
        if (existing is not null)
        {
            // Duplicate scans do not create a second fact, reward or audit entry.
            return new AttendanceCheckIn(existing.Id, existing.Status, true);
        }
        var status = now > session.StartsAtUtc.AddMinutes(10) ? "Late" : "Present";
        var attendance = new Attendance
        {
            SessionId = session.Id, PersonId = personId, RegistrationId = registration?.Id,
            BookingId = booking?.Id, Status = status, Method = method,
            RecordedByPersonId = supervisorPersonId, RecordedAtUtc = now, CreatedAtUtc = now
        };
        db.Attendance.Add(attendance);
        await db.SaveChangesAsync(cancellationToken);
        db.AuditEvent.Add(new AuditEvent
        {
            ActorPersonId = supervisorPersonId, ActorCapacity = "Supervisor",
            ResourceKind = "Attendance", ResourceId = attendance.Id, Action = "attendance.checkin",
            AfterStatus = status, AtUtc = now, CreatedAtUtc = now
        });
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return new AttendanceCheckIn(attendance.Id, status, false);
    }

    private async Task EnsureSessionOpenAsync(Session session, DateTime now, CancellationToken cancellationToken)
    {
        if (session.Status != "Published" || !session.AttendanceRequired ||
            session.Mode is not ("InPerson" or "Hybrid") ||
            now < session.StartsAtUtc.AddMinutes(-session.CheckInBeforeMinutes) ||
            now > session.EndsAtUtc.AddMinutes(session.CheckInAfterMinutes))
            throw new AttendanceQrException("In-person check-in is not open for this session.");
        var ownerId = session.InitiativeId is long initiativeId
            ? await db.Initiative.Where(x => x.Id == initiativeId && x.Status == "Published")
                .Select(x => (long?)x.InstitutionId).SingleOrDefaultAsync(cancellationToken)
            : await db.Experience.Where(x => x.Id == session.ExperienceId && x.Status == "Published")
                .Select(x => (long?)x.OrganizationId).SingleOrDefaultAsync(cancellationToken);
        if (ownerId is null || !await db.Organization.AnyAsync(x => x.Id == ownerId &&
            x.Kind == "Institution" && x.Status == "Verified", cancellationToken))
            throw new AttendanceQrException("The organizing Institution is not active.");
    }

    private async Task EnsureParticipantEligibleAsync(Session session, long personId,
        CancellationToken cancellationToken)
    {
        if (!await db.Person.AnyAsync(x => x.Id == personId && x.Status == "Active", cancellationToken) ||
            session.InitiativeId is long initiativeId &&
            !await db.InitiativeApplication.AnyAsync(x => x.InitiativeId == initiativeId &&
                x.PersonId == personId && x.Status == "Accepted", cancellationToken))
            throw new AttendanceQrException("This participant is not active for this session.");
    }
}

public sealed record AttendancePass(string QrPayload, string Code, DateTimeOffset ExpiresAtUtc);
public sealed record AttendanceCheckIn(long AttendanceId, string Status, bool AlreadyRecorded);
public sealed class AttendanceQrException(string message) : Exception(message);

internal static class AttendanceQrCode
{
    private const string Alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    public static string Create()
    {
        Span<byte> random = stackalloc byte[20];
        RandomNumberGenerator.Fill(random);
        Span<char> letters = stackalloc char[20];
        for (var i = 0; i < random.Length; i++) letters[i] = Alphabet[random[i] & 31];
        return "DS-" + new string(letters[..5]) + "-" + new string(letters[5..10]) +
            "-" + new string(letters[10..15]) + "-" + new string(letters[15..]);
    }

    public static byte[] Hash(string code)
    {
        var normalized = code.Trim().ToUpperInvariant().Replace("-", "").Replace(" ", "");
        if (normalized.Length != 22 || !normalized.StartsWith("DS", StringComparison.Ordinal) ||
            normalized[2..].Any(c => !Alphabet.Contains(c)))
            throw new AttendanceQrException("Enter a valid DeepSprout booking code.");
        return SHA256.HashData(Encoding.ASCII.GetBytes(normalized));
    }
}
