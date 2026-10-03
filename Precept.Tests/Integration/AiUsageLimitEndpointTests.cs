using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using NSubstitute;
using Precept.Api.Data;
using Precept.Api.DTOs;
using Precept.Api.Services.Interfaces;
using Precept.Tests.Infrastructure;

namespace Precept.Tests.Integration;

/// <summary>
/// M1-F3 through the real HTTP pipeline: every AI call writes a ledger row, and a user over
/// their allowance gets a structured 402 without the provider being called.
/// </summary>
[Collection("Integration")]
public class AiUsageLimitEndpointTests : IAsyncLifetime
{
    private readonly PreceptWebApplicationFactory _factory;
    private readonly ILlmProviderClient _provider = Substitute.For<ILlmProviderClient>();

    public AiUsageLimitEndpointTests(PostgresContainerFixture fixture)
    {
        _provider.ProviderName.Returns("Fake");
        _provider.Model.Returns("fake-model");
        _provider.CompleteAsync(Arg.Any<string>(), Arg.Any<string?>(), Arg.Any<CancellationToken>())
            .Returns(new LlmCompletion(
                """{"question":"Tell me about a migration you led.","category":"Behavioral","focusArea":"Ownership","contextTips":"Use STAR."}""",
                InputTokens: 200, OutputTokens: 60));

        var providers = Substitute.For<ILlmProviderFactory>();
        providers.CreateClient().Returns(_provider);

        _factory = new PreceptWebApplicationFactory(fixture)
        {
            Settings = new Dictionary<string, string?>
            {
                [$"Usage:Features:{UsageFeatures.MockQuestion}:PerDay"] = "1",
                [$"Usage:Features:{UsageFeatures.MockQuestion}:PerMonth"] = "10",
            },
            ConfigureTestServices = services =>
            {
                services.RemoveAll<ILlmProviderFactory>();
                services.AddSingleton(providers);
            },
        };
    }

    public Task InitializeAsync() => _factory.InitializeAsync();
    public Task DisposeAsync() => _factory.DisposeAsync();

    [Fact]
    public async Task SecondQuestionOverDailyLimit_Returns402_AndProviderIsCalledOnce()
    {
        var (client, auth) = await _factory.CreateAuthenticatedClientAsync("usage-limit@example.com");
        var request = new { RoleTitle = "Backend Engineer" };

        var first = await client.PostAsJsonAsync("/api/mockinterview/generate-question", request);
        first.StatusCode.Should().Be(HttpStatusCode.OK);

        var second = await client.PostAsJsonAsync("/api/mockinterview/generate-question", request);
        second.StatusCode.Should().Be(HttpStatusCode.PaymentRequired);

        using var body = JsonDocument.Parse(await second.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("code").GetString().Should().Be("limit_reached");
        body.RootElement.GetProperty("feature").GetString().Should().Be(UsageFeatures.MockQuestion);
        body.RootElement.GetProperty("remaining").GetInt32().Should().Be(0);
        body.RootElement.GetProperty("resetsAt").GetDateTime().Should().BeAfter(DateTime.UtcNow);

        await _provider.Received(1).CompleteAsync(Arg.Any<string>(), Arg.Any<string?>(), Arg.Any<CancellationToken>());

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PreceptDbContext>();
        var rows = await db.UsageLedger.IgnoreQueryFilters().Where(r => r.UserId == auth.UserId).ToListAsync();
        rows.Should().ContainSingle();
        rows[0].Feature.Should().Be(UsageFeatures.MockQuestion);
        rows[0].InputTokens.Should().Be(200);
        rows[0].OutputTokens.Should().Be(60);
        rows[0].Succeeded.Should().BeTrue();
        rows[0].PromptVersion.Should().Be("mock_question.v1");
    }
}
