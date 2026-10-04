namespace Precept.Api.Services.Usage;

/// <summary>Base type for AI calls refused before reaching a provider.</summary>
public abstract class AiCallRefusedException(string message) : Exception(message);

/// <summary>The user used up a feature's daily or monthly allowance. Maps to HTTP 402.</summary>
public sealed class UsageLimitExceededException(string feature, int remaining, DateTime? resetsAt)
    : AiCallRefusedException($"AI limit reached for {feature}.")
{
    public string Feature { get; } = feature;
    public int Remaining { get; } = remaining;
    public DateTime? ResetsAt { get; } = resetsAt;
}

/// <summary>The global daily budget or call cap is spent. Maps to HTTP 503.</summary>
public sealed class AiBudgetExhaustedException(DateTime? resetsAt)
    : AiCallRefusedException("AI features are paused for today.")
{
    public DateTime? ResetsAt { get; } = resetsAt;
}

/// <summary>Demo accounts never reach an LLM provider. Maps to HTTP 403.</summary>
public sealed class DemoAiRefusedException()
    : AiCallRefusedException("Demo accounts cannot use AI features.");
