using Precept.Api.Services.Interfaces;
using Precept.Api.Services.Usage;

namespace Precept.Api.Services;

/// <summary>
/// Hands out the configured provider wrapped in <see cref="MeteredLlmClient"/>, so application
/// code cannot reach a provider without a limit check and a ledger row. Scoped, because the
/// usage guard writes through the request's DbContext.
/// </summary>
public class LlmClientFactory(
    ILlmProviderFactory providers,
    IUsageGuard guard,
    IDemoAccountService demoAccounts) : ILlmClientFactory
{
    public ILlmClient GetClient() => new MeteredLlmClient(providers.CreateClient(), guard, demoAccounts);
}
