using FluentAssertions;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using Precept.Api.DTOs;
using Precept.Api.Services.Interfaces;
using Precept.Api.Services.Usage;

namespace Precept.Tests.Unit;

public class MeteredLlmClientTests
{
    private const string UserId = "user-1";
    private static readonly LlmUsageContext Context = new(UserId, UsageFeatures.MockQuestion, "test.v1");

    private readonly ILlmProviderClient _provider = Substitute.For<ILlmProviderClient>();
    private readonly IUsageGuard _guard = Substitute.For<IUsageGuard>();
    private readonly IDemoAccountService _demo = Substitute.For<IDemoAccountService>();

    public MeteredLlmClientTests()
    {
        _provider.ProviderName.Returns("Fake");
        _provider.Model.Returns("fake-model");
        _guard.CheckAsync(UserId, UsageFeatures.MockQuestion, Arg.Any<CancellationToken>())
            .Returns(new UsageCheckResult(UsageDenial.None, UsageFeatures.MockQuestion, 5, null));
    }

    private MeteredLlmClient Client() => new(_provider, _guard, _demo);

    [Fact]
    public async Task DemoUser_IsRefused_WithoutProviderCallOrLedgerRow()
    {
        _demo.IsDemoUserAsync(UserId).Returns(true);

        var act = () => Client().GenerateCompletionAsync(Context, "prompt");

        await act.Should().ThrowAsync<DemoAiRefusedException>();
        _provider.ReceivedCalls().Where(c => c.GetMethodInfo().Name == nameof(ILlmProviderClient.CompleteAsync)).Should().BeEmpty();
        await _guard.DidNotReceive().RecordAsync(Arg.Any<UsageRecord>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task UserLimitReached_Throws402Exception_WithoutProviderCall()
    {
        var resets = new DateTime(2026, 10, 4, 0, 0, 0, DateTimeKind.Utc);
        _guard.CheckAsync(UserId, UsageFeatures.MockQuestion, Arg.Any<CancellationToken>())
            .Returns(new UsageCheckResult(UsageDenial.UserLimit, UsageFeatures.MockQuestion, 0, resets));

        var act = () => Client().GenerateCompletionAsync(Context, "prompt");

        var ex = (await act.Should().ThrowAsync<UsageLimitExceededException>()).Which;
        ex.Feature.Should().Be(UsageFeatures.MockQuestion);
        ex.ResetsAt.Should().Be(resets);
        await _provider.DidNotReceive().CompleteAsync(Arg.Any<string>(), Arg.Any<string?>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task GlobalBudgetReached_Throws503Exception_WithoutProviderCall()
    {
        _guard.CheckAsync(UserId, UsageFeatures.MockQuestion, Arg.Any<CancellationToken>())
            .Returns(new UsageCheckResult(UsageDenial.GlobalBudget, UsageFeatures.MockQuestion, 0, null));

        var act = () => Client().GenerateCompletionAsync(Context, "prompt");

        await act.Should().ThrowAsync<AiBudgetExhaustedException>();
        await _provider.DidNotReceive().CompleteAsync(Arg.Any<string>(), Arg.Any<string?>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task SuccessfulCall_RecordsProviderReportedTokens()
    {
        _provider.CompleteAsync("prompt", "system", Arg.Any<CancellationToken>())
            .Returns(new LlmCompletion("answer", 120, 40));

        var text = await Client().GenerateCompletionAsync(Context, "prompt", "system");

        text.Should().Be("answer");
        await _guard.Received(1).RecordAsync(
            Arg.Is<UsageRecord>(r => r.UserId == UserId && r.Feature == UsageFeatures.MockQuestion
                && r.InputTokens == 120 && r.OutputTokens == 40 && !r.TokensEstimated && r.Succeeded
                && r.Provider == "Fake" && r.Model == "fake-model" && r.PromptVersion == "test.v1"),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task MissingUsage_RecordsEstimateAndFlagsIt()
    {
        _provider.CompleteAsync(Arg.Any<string>(), Arg.Any<string?>(), Arg.Any<CancellationToken>())
            .Returns(new LlmCompletion("12345678", null, null));

        await Client().GenerateCompletionAsync(Context, new string('a', 400));

        await _guard.Received(1).RecordAsync(
            Arg.Is<UsageRecord>(r => r.TokensEstimated && r.InputTokens == 100 && r.OutputTokens == 2 && r.Succeeded),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ProviderFailure_StillWritesLedgerRow_AndRethrows()
    {
        _provider.CompleteAsync(Arg.Any<string>(), Arg.Any<string?>(), Arg.Any<CancellationToken>())
            .Throws(new HttpRequestException("provider down"));

        var act = () => Client().GenerateCompletionAsync(Context, "prompt");

        await act.Should().ThrowAsync<HttpRequestException>();
        await _guard.Received(1).RecordAsync(
            Arg.Is<UsageRecord>(r => !r.Succeeded && r.OutputTokens == 0 && r.TokensEstimated),
            Arg.Any<CancellationToken>());
    }
}
