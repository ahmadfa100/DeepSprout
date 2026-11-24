using System.Text.Json;
using DeepSprout.Web.Models;

namespace DeepSprout.Web.Services;

internal static class RecoveryPlanRules
{
    internal const string Policy = "recovery-initial-1";
    internal const int CycleDays = 28;
    internal const int MaintenancePracticeDays = 1;
    internal const string TimeZone = "Asia/Amman";
    internal static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private static readonly Dictionary<string, string[]> PracticeMix = new(StringComparer.Ordinal)
    {
        ["reduce-scrolling"] = ["visual-observation", "digital-judgment"],
        ["intentional-phone"] = ["digital-judgment", "visual-observation"],
        ["offline-time"] = ["listening", "visual-observation"],
        ["focus-objective"] = ["depth", "digital-judgment", "visual-observation"]
    };

    // The approved V5 constraint names the original four slots. Content IDs and
    // the immutable content snapshot distinguish the two replacement practices.
    internal static readonly Dictionary<string, string> PracticeSlots = new(StringComparer.Ordinal)
    {
        ["depth"] = "DepthPractice",
        ["listening"] = "ListeningRecall",
        ["visual-observation"] = "PracticalMicroChallenge",
        ["digital-judgment"] = "ProtectedWork"
    };

    private static readonly Dictionary<string, string[]> Directions = new(StringComparer.Ordinal)
    {
        ["reduce-scrolling"] = ["Notice the pattern", "Add one alternative", "Hold attention longer", "Decide what to keep"],
        ["intentional-phone"] = ["Notice unplanned opens", "Put a gap in", "Protect one block", "Decide what to keep"],
        ["offline-time"] = ["Choose the thing", "Make it regular", "Protect the slot", "Decide what to keep"],
        ["focus-objective"] = ["Define the work", "Protect one session", "Extend gradually", "Decide what to keep"]
    };

    internal static RecoveryPlanDocument Create(JsonElement answers, int days, int version = 1,
        RecoveryPreferences? preferences = null)
    {
        var goal = answers.GetProperty("change").GetString()!;
        var minutes = int.Parse(answers.GetProperty("dailyMinutes").GetString()!, System.Globalization.CultureInfo.InvariantCulture);
        var interests = answers.GetProperty("makeTimeFor").EnumerateArray().Select(value => value.GetString()).ToArray();
        var routineTitle = interests[0] switch
        {
            "walking-sports" => $"A {minutes}-minute walk or some movement",
            "reading-learning" => $"{minutes} minutes of reading on paper",
            "drawing-creativity" => $"{minutes} minutes of drawing or making",
            "friends-family" => $"{minutes} phone-free minutes with someone",
            "hobbies" => $"{minutes} minutes on a hobby you enjoy",
            _ => $"{minutes} minutes of something offline"
        };
        var suggested = new RecoveryRoutineChoice(routineTitle, minutes, [0, 1, 2, 3, 4, 5, 6]);
        var mix = goal == "reduce-scrolling" && interests.Contains("reading-learning")
            ? new[] { "visual-observation", "depth", "digital-judgment" } : PracticeMix[goal];
        var prefs = preferences ?? new RecoveryPreferences(goal, minutes, mix, [0, 2, 4], null);
        var weeks = Enumerable.Range(1, days / 7).Select(number =>
            new RecoveryWeek(number, Directions[prefs.Goal][number - 1], number == 1
                ? "Start with a few short practices and one offline routine you choose."
                : "The schedule for this week is shaped by your weekly review.", number == 1)).ToArray();
        var weekOne = Enumerable.Range(0, 7).Select(offset =>
        {
            var slot = Array.IndexOf(prefs.PracticeDays, offset);
            return new RecoveryPreviewDay(offset, slot >= 0 ? prefs.ActivityTypes[slot % prefs.ActivityTypes.Length] : null,
                (prefs.Routine ?? suggested).Days.Contains(offset), offset == 6);
        }).ToArray();
        return new RecoveryPlanDocument(1, version, preferences is not null, days, answers, prefs, suggested, weeks, weekOne);
    }

    internal static string? Validate(RecoveryPreferences? prefs)
    {
        if (prefs?.Goal is null || !PracticeMix.ContainsKey(prefs.Goal))
            return "Choose an approved goal.";
        if (prefs.Minutes is not (5 or 10 or 15 or 20))
            return "Choose 5, 10, 15, or 20 minutes for each practice.";
        if (prefs.ActivityTypes is not { Length: >= 1 and <= 4 } ||
            prefs.ActivityTypes.Any(type => type is null || !PracticeSlots.ContainsKey(type)) ||
            prefs.ActivityTypes.Distinct().Count() != prefs.ActivityTypes.Length)
            return "Choose distinct approved practice types.";
        if (!ValidDays(prefs.PracticeDays, 5))
            return "Choose one to five different practice days in Week 1.";
        if (prefs.Routine is { } routine && (string.IsNullOrWhiteSpace(routine.Title) ||
            routine.Title.Trim().Length > 160 || routine.Minutes is < 1 or > 120 || !ValidDays(routine.Days, 7)))
            return "Enter an offline routine of up to 160 characters with valid minutes and days.";
        return null;
    }

    private static bool ValidDays(int[]? days, int max) => days is { Length: > 0 } &&
        days.Length <= max && days.All(day => day is >= 0 and <= 6) && days.Distinct().Count() == days.Length;

    internal static RecoveryPlanDocument? Read(string? json)
    {
        if (json is null) return null;
        using var document = JsonDocument.Parse(json);
        return document.RootElement.ValueKind == JsonValueKind.Object &&
            document.RootElement.TryGetProperty("format", out var format) &&
            format.ValueKind == JsonValueKind.Number && format.TryGetInt32(out var value) && value == 1
            ? document.RootElement.Deserialize<RecoveryPlanDocument>(Json) : null;
    }

    internal static DateOnly Today(DateTime utc, string zone) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(utc, TimeZoneInfo.FindSystemTimeZoneById(zone)));
}
