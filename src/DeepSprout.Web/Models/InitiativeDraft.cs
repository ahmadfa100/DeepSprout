using System.ComponentModel.DataAnnotations;
using System.Globalization;
using DeepSprout.Domain.V5;

namespace DeepSprout.Web.Models;

public sealed record InitiativeDraft
{
    [MaxLength(200)] public string? Title { get; init; }
    [MaxLength(64)] public string? Topic { get; init; }
    [MaxLength(4000)] public string? Objective { get; init; }
    [MaxLength(1200)] public string? Summary { get; init; }
    [MaxLength(8000)] public string? Description { get; init; }
    public InitiativeCover? Cover { get; init; }
    [MaxLength(10)] public string? Start { get; init; }
    [MaxLength(10)] public string? End { get; init; }
    [MaxLength(80)] public string? Timezone { get; init; }
    [MaxLength(80)] public string? Audience { get; init; }
    [Range(0, 120)] public int? MinAge { get; init; }
    [Range(0, 120)] public int? MaxAge { get; init; }
    [MaxLength(4000)] public string? Requirements { get; init; }
    [MaxLength(4000)] public string? Consent { get; init; }
    [MaxLength(120)] public string? Country { get; init; }
    [MaxLength(120)] public string? CountryOther { get; init; }
    [MaxLength(120)] public string? Coverage { get; init; }
    [MaxLength(16)] public string? DeliveryMode { get; init; }
    [MaxLength(250)] public string? Venue { get; init; }
    [MaxLength(500)] public string? Address { get; init; }
    [MaxLength(120)] public string? MapCenter { get; init; }
    [MaxLength(120)] public string? Platform { get; init; }
    [MaxLength(120)] public string? PlatformOther { get; init; }
    [MaxLength(32)] public string? LinkPolicy { get; init; }
    [MaxLength(2000)] public string? OnlineDetails { get; init; }
    [MaxLength(500)] public string? Captions { get; init; }
    [MaxLength(250)] public string? AttendanceMethod { get; init; }
    [Range(1, 135)] public int? Capacity { get; init; }
    [MaxLength(10)] public string? RegistrationOpen { get; init; }
    [MaxLength(10)] public string? RegistrationClose { get; init; }
    [MaxLength(2000)] public string? Withdrawal { get; init; }
    [MaxLength(32)] public string? OperatingMode { get; init; }
    [MaxLength(50)] public InitiativeComponent?[]? Components { get; init; }
    public InitiativePolicies? Policies { get; init; }

    internal string? DraftError()
    {
        if (Cover?.Image is not (null or "" or "assets/home-redesign/forest-hike.jpg" or
            "assets/home-redesign/sunset-overlook.jpg" or "assets/home-redesign/pottery-workshop.jpg"))
            return "Choose one of the available cover images.";
        if (DeliveryMode is not (null or "Online" or "In-person" or "Hybrid") ||
            OperatingMode is not (null or "awareness" or "structured"))
            return "Choose a valid Initiative mode.";
        if (Components?.Any(item => item is null || item.Type is not ("Session" or "Survey or Quiz" or
            "Competition" or "Structured Group Activity" or "Outdoor Activity")
            || !string.IsNullOrEmpty(item.ResourceId)) == true)
            return "Choose supported component cards. Linked resources are handled in a later phase.";
        return null;
    }

    internal string? PublicationError()
    {
        if (string.IsNullOrWhiteSpace(Title) || string.IsNullOrWhiteSpace(Topic) ||
            string.IsNullOrWhiteSpace(Objective) || string.IsNullOrWhiteSpace(Summary))
            return "Enter a title, topic, objective and public summary.";
        if (!TryDate(Start, out var start) || !TryDate(End, out var end) || end < start ||
            Timezone is not ("Asia/Amman" or "Asia/Riyadh" or "Asia/Dubai" or "Europe/London" or "UTC"))
            return "Enter valid Initiative dates and select a time zone.";
        if (string.IsNullOrWhiteSpace(Audience) || string.IsNullOrWhiteSpace(Consent) || MinAge > MaxAge)
            return "Enter the audience, valid age limits and participant consent.";
        if (DeliveryMode is null || Capacity is null)
            return "Choose the delivery mode and enter a capacity from 1 to 135.";
        if (DeliveryMode != "Online" && string.IsNullOrWhiteSpace(Venue))
            return "Choose a venue for in-person participation.";
        if (DeliveryMode != "In-person" && (string.IsNullOrWhiteSpace(Platform) ||
            Platform == "Other" && string.IsNullOrWhiteSpace(PlatformOther)))
            return "Choose the online meeting platform.";
        var opens = TryDate(RegistrationOpen, out var open);
        var closes = TryDate(RegistrationClose, out var close);
        if (!opens && !string.IsNullOrEmpty(RegistrationOpen) || !closes && !string.IsNullOrEmpty(RegistrationClose) ||
            opens && open > end || closes && close > end || opens && closes && open > close)
            return "Enter an application window that ends by the Initiative end date.";
        if (Components is not { Length: > 0 })
            return "Add at least one component.";
        foreach (var component in Components)
        {
            if (component is null) return "Choose a valid component.";
            if (component.Planned) continue;
            if (string.IsNullOrWhiteSpace(component.Title)) return "Enter a title for each ready component.";
            if (component.Type is "Competition" or "Outdoor Activity")
                return "Keep competitions and Outdoor Activities planned until live linked resources are available.";
            if (component.Type != "Session") continue;
            if (!TryDate(component.Date, out var date) || date < start || date > end ||
                !TimeOnly.TryParseExact(component.Time, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var from) ||
                !TimeOnly.TryParseExact(component.EndTime, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var to) || to <= from)
                return "Each ready session needs a date within the Initiative and valid start and end times.";
            if (component.Format is not ("Online" or "In-person") ||
                DeliveryMode != "Hybrid" && component.Format != DeliveryMode ||
                component.Format == "In-person" && string.IsNullOrWhiteSpace(component.Venue) && string.IsNullOrWhiteSpace(Venue))
                return "Each ready session needs a compatible format and an in-person venue where applicable.";
        }
        if (string.IsNullOrWhiteSpace(Policies?.Completion)) return "Enter the completion criteria.";
        return null;
    }

    // Date-only builder windows are inclusive in the selected time zone.
    internal DateTime? Boundary(string? value, bool endOfDay = false)
    {
        if (!TryDate(value, out var date)) return null;
        var local = date.AddDays(endOfDay ? 1 : 0).ToDateTime(TimeOnly.MinValue);
        return TimeZoneInfo.ConvertTimeToUtc(local, TimeZoneInfo.FindSystemTimeZoneById(Timezone!));
    }

    private static bool TryDate(string? value, out DateOnly date) =>
        DateOnly.TryParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out date)
        && date.Year is > 1 and < 9999;
}

public sealed record InitiativeCover([MaxLength(120)] string? Image, [MaxLength(200)] string? Alt);

public sealed record InitiativeComponent
{
    [MaxLength(80)] public string? Id { get; init; }
    [MaxLength(40)] public string? Type { get; init; }
    [MaxLength(200)] public string? Title { get; init; }
    [MaxLength(2000)] public string? Description { get; init; }
    public bool Planned { get; init; }
    public bool Publish { get; init; } = true;
    public bool Expanded { get; init; }
    [MaxLength(10)] public string? Date { get; init; }
    [MaxLength(5)] public string? Time { get; init; }
    [MaxLength(5)] public string? EndTime { get; init; }
    [MaxLength(16)] public string? Format { get; init; }
    [MaxLength(250)] public string? Venue { get; init; }
    [MaxLength(500)] public string? Address { get; init; }
    [MaxLength(120)] public string? MapCenter { get; init; }
    [MaxLength(2000)] public string? Meeting { get; init; }
    [MaxLength(120)] public string? Platform { get; init; }
    [Range(1, 32767)] public int? Capacity { get; init; }
    public bool AttendanceRequired { get; init; } = true;
    [MaxLength(40)] public string? Purpose { get; init; }
    [MaxLength(80)] public string? ResourceId { get; init; }
}

public sealed record InitiativePolicies
{
    public bool Waitlist { get; init; }
    public bool OfferManual { get; init; }
    [Range(1, 168)] public short? OfferHours { get; init; }
    [MaxLength(2000)] public string? Discipline { get; init; }
    [MaxLength(2000)] public string? Attendance { get; init; }
    [MaxLength(2000)] public string? Excuse { get; init; }
    [MaxLength(2000)] public string? Makeup { get; init; }
    [MaxLength(4000)] public string? Completion { get; init; }
    [MaxLength(2000)] public string? Privacy { get; init; }
    [MaxLength(2000)] public string? Notifications { get; init; }
}
