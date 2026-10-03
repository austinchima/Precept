using Precept.Api.Services.Interfaces;

namespace Precept.Api.Services.Usage;

/// <summary>
/// The only <see cref="ILlmClient"/> the application gets. Every call is refused for demo
/// accounts, checked against the usage guard, and recorded in the ledger whether the
/// provider call succeeds or fails.
/// </summary>
public sealed class MeteredLlmClient(
    ILlmProviderClient inner,
    IUsageGuard guard,
    IDemoAccountService demoAccounts) : ILlmClient
{
    public string ProviderName => inner.ProviderName;

    public async Task<string> GenerateCompletionAsync(LlmUsageContext usage, string prompt, string? systemPrompt = null, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(usage);
        if (string.IsNullOrWhiteSpace(usage.UserId) || string.IsNullOrWhiteSpace(usage.Feature))
        {
            throw new ArgumentException("An LLM call needs a user and a feature.", nameof(usage));
        }

        if (await demoAccounts.IsDemoUserAsync(usage.UserId))
        {
            throw new DemoAiRefusedException();
        }

        var check = await guard.CheckAsync(usage.UserId, usage.Feature, ct);
        switch (check.Denial)
        {
            case UsageDenial.UserLimit:
                throw new UsageLimitExceededException(usage.Feature, check.Remaining, check.ResetsAt);
            case UsageDenial.GlobalBudget:
                throw new AiBudgetExhaustedException(check.ResetsAt);
        }

        LlmCompletion completion;
        try
        {
            completion = await inner.CompleteAsync(prompt, systemPrompt, ct);
        }
        catch
        {
            // A failed call still counts: the provider may have billed it, and retries must not be free.
            await guard.RecordAsync(Record(usage, EstimateTokens(prompt, systemPrompt), 0, estimated: true, succeeded: false), CancellationToken.None);
            throw;
        }

        var estimated = completion.InputTokens is null || completion.OutputTokens is null;
        var input = completion.InputTokens ?? EstimateTokens(prompt, systemPrompt);
        var output = completion.OutputTokens ?? EstimateTokens(completion.Text, null);
        await guard.RecordAsync(Record(usage, input, output, estimated, succeeded: true), CancellationToken.None);
        return completion.Text;
    }

    private UsageRecord Record(LlmUsageContext usage, int input, int output, bool estimated, bool succeeded) =>
        new(usage.UserId, usage.Feature, inner.ProviderName, inner.Model, usage.PromptVersion, input, output, estimated, succeeded);

    /// <summary>
    /// Rough estimate used only when a provider omits usage: about four characters per token
    /// for English text. Rows written with it are flagged <c>TokensEstimated</c>.
    /// </summary>
    internal static int EstimateTokens(string? text, string? more) =>
        (int)Math.Ceiling(((text?.Length ?? 0) + (more?.Length ?? 0)) / 4.0);
}
