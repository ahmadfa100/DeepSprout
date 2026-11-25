using DeepSprout.Domain.V5;
using DeepSprout.Infrastructure.V5;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Web.Services;

internal static class InitiativeSessions
{
    internal const string SessionResource = "session.Session";
    internal const string RegistrationResource = "session.SessionRegistration";
    internal const string NoticeVersion = "session-participation-v1";
    internal const string Notice = "I agree to attend in my selected mode and follow the Institution's participation instructions.";

    internal sealed class SessionRow
    {
        public required Session Session { get; init; }
        public required Initiative Initiative { get; init; }
        public required InitiativeRevision Terms { get; init; }
        public required Organization Institution { get; init; }
        public int OnlineUsed { get; init; }
        public int InPersonUsed { get; init; }
    }

    internal static IQueryable<Session> Rows(DeepSproutV5DbContext db) =>
        db.Session.Where(row => row.InitiativeId != null && row.ExperienceId == null && row.Purpose == "Session" &&
            row.MeetingAudience == null && row.MeetingAudiencePersonId == null);

    internal static IQueryable<SessionRegistration> Active(DeepSproutV5DbContext db) =>
        db.SessionRegistration.Where(row => row.Status == "Pending" || row.Status == "Confirmed");

    internal static IQueryable<SessionRow> Read(DeepSproutV5DbContext db) =>
        from session in Rows(db).AsNoTracking()
        join initiative in db.Set<Initiative>() on session.InitiativeId equals (long?)initiative.Id
        join terms in db.Set<InitiativeRevision>()
            on new { initiative.CurrentRevisionId, InitiativeId = initiative.Id }
            equals new { CurrentRevisionId = (long?)terms.Id, terms.InitiativeId }
        join institution in db.Set<Organization>() on initiative.InstitutionId equals institution.Id
        select new SessionRow { Session = session, Initiative = initiative, Terms = terms, Institution = institution,
            OnlineUsed = Active(db).Count(row => row.SessionId == session.Id && row.Mode == "Online"),
            InPersonUsed = Active(db).Count(row => row.SessionId == session.Id && row.Mode == "InPerson") };

    internal static IQueryable<InitiativeApplication> Admitted(DeepSproutV5DbContext db, long actor) =>
        db.Set<InitiativeApplication>().Where(row => row.PersonId == actor && row.Status == "Accepted" &&
            row.AcceptedAtUtc != null && row.EndedAtUtc == null);

    internal static bool Allows(string sessionMode, string requested) =>
        requested is "Online" or "InPerson" && (sessionMode == requested || sessionMode == "Hybrid");

    internal static string State(Session session, bool operational, DateTime now, int onlineUsed, int inPersonUsed)
    {
        if (session.Status == "Cancelled") return "Cancelled";
        if (session.Status == "Completed" || session.Status == "Published" && session.StartsAtUtc <= now) return "Closed";
        if (session.Status != "Published" || !operational) return "Unavailable";
        var online = Allows(session.Mode, "Online") && (session.OnlineCapacity is null || onlineUsed < session.OnlineCapacity);
        var inPerson = Allows(session.Mode, "InPerson") && (session.InPersonCapacity is null || inPersonUsed < session.InPersonCapacity);
        return online || inPerson ? "Open" : "Full";
    }

    internal static object View(SessionRow row, bool operational, DateTime now) => new
    {
        id = row.Session.PublicId, initiativeId = row.Initiative.PublicId, initiative = row.Terms.Title,
        institutionId = row.Institution.PublicId, organizer = row.Institution.Name, row.Session.Title, row.Session.Status,
        row.Session.Mode, row.Session.TimeZoneId, startsAtUtc = InitiativeWork.Utc(row.Session.StartsAtUtc),
        endsAtUtc = InitiativeWork.Utc(row.Session.EndsAtUtc), row.Session.Venue, row.Session.OnlineCapacity,
        row.Session.InPersonCapacity, row.OnlineUsed, row.InPersonUsed, row.Session.CancelReason,
        registrationState = State(row.Session, operational, now, row.OnlineUsed, row.InPersonUsed),
        version = InitiativeWork.Version(row.Session.RowVersion)
    };

    internal static object Registration(SessionRegistration row, bool canCancel) => new
    {
        id = row.PublicId, row.Mode, row.Status, registeredAtUtc = InitiativeWork.Utc(row.RegisteredAtUtc),
        cancelledAtUtc = InitiativeWork.Utc(row.CancelledAtUtc), canCancel
    };

    internal static bool CanCancel(Session session, SessionRegistration row, DateTime now) =>
        row.Status is "Pending" or "Confirmed" && session.Status == "Published" && session.StartsAtUtc > now;

    internal static string? MeetingLink(string? value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var link) || link.Scheme != Uri.UriSchemeHttps ||
            link.UserInfo.Length > 0 || !link.IsDefaultPort) return null;
        string[] domains = ["meet.google.com", "zoom.us", "teams.microsoft.com", "teams.live.com"];
        return domains.Any(domain => link.Host.Equals(domain, StringComparison.OrdinalIgnoreCase) ||
            link.Host.EndsWith("." + domain, StringComparison.OrdinalIgnoreCase)) ? value : null;
    }
}
