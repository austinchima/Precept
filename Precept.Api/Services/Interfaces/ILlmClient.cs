namespace Precept.Api.Services.Interfaces;

/// <summary>
/// Who is making an LLM call and for which metered feature. Required on every call,
/// so no code path can reach a provider without a limit check and a ledger row.
/// </summary>
public sealed record LlmUsageContext(string UserId, string Feature, string PromptVersion);

/// <summary>
/// Vendor-agnostic, metered LLM client. Instances come from <see cref="ILlmClientFactory"/>.
/// </summary>
public interface ILlmClient
{
    string ProviderName { get; }

    /// <summary>
    /// Checks the caller's limits, calls the provider and records the call in the usage ledger.
    /// Throws <c>UsageLimitExceededException</c>, <c>AiBudgetExhaustedException</c> or
    /// <c>DemoAiRefusedException</c> before any provider call when the call is not allowed.
    /// </summary>
    Task<string> GenerateCompletionAsync(LlmUsageContext usage, string prompt, string? systemPrompt = null, CancellationToken ct = default);
}

/// <summary>
/// Resolves the configured provider wrapped in the usage guard.
/// </summary>
public interface ILlmClientFactory
{
    ILlmClient GetClient();
}

/// <summary>
/// The result of one provider call. Token counts are null when the provider did not report them.
/// </summary>
public sealed record LlmCompletion(string Text, int? InputTokens, int? OutputTokens);

/// <summary>
/// Raw provider client. Only <see cref="ILlmProviderFactory"/> creates these, and only the
/// metered client calls them.
/// </summary>
public interface ILlmProviderClient
{
    string ProviderName { get; }
    string Model { get; }
    Task<LlmCompletion> CompleteAsync(string prompt, string? systemPrompt, CancellationToken ct);
}

/// <summary>
/// Creates raw provider clients from configuration.
/// </summary>
public interface ILlmProviderFactory
{
    ILlmProviderClient CreateClient();
    ILlmProviderClient CreateClient(string? providerOverride, string? apiKeyOverride = null, string? modelOverride = null, string? baseUrlOverride = null);
}
