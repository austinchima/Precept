namespace Precept.Api.Services.Interfaces;

/// <summary>
/// Vendor-agnostic LLM client abstraction.
/// </summary>
public interface ILlmClient
{
    string ProviderName { get; }
    Task<string> GenerateCompletionAsync(string prompt, string? systemPrompt = null, CancellationToken ct = default);
}

/// <summary>
/// Factory interface for dynamically resolving LLM providers.
/// </summary>
public interface ILlmClientFactory
{
    ILlmClient GetClient();
    ILlmClient GetClient(string? providerOverride, string? apiKeyOverride = null, string? modelOverride = null, string? baseUrlOverride = null);
}
