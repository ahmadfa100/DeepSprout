using System.Text.Json;
using System.Text.Json.Serialization;

namespace DeepSprout.Web.Models;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record QuickSetupAnswer(string Question, JsonElement Answer, bool Finish = false);

public sealed record QuickSetupState(
    string Subject, string DisplayName, string Email, string Stage, int JourneyLevel,
    int? AnswersVersion, JsonElement? Answers, bool SetupComplete, string? RequestToken);
