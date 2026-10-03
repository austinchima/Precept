using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using NSubstitute;
using Precept.Api.DTOs;
using Precept.Api.Models;
using Precept.Api.Services.Interfaces;
using Precept.Tests.Infrastructure;

namespace Precept.Tests.Integration;

/// <summary>
/// M1-F2: every demo visitor gets an isolated, expiring tenant that cannot spend AI budget.
/// </summary>
[Collection("Integration")]
public class DemoIsolationTests : IAsyncLifetime
{
    private readonly PreceptWebApplicationFactory _factory;
    private readonly ILlmClientFactory _llmFactory = Substitute.For<ILlmClientFactory>();

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
    };

    public DemoIsolationTests(PostgresContainerFixture fixture)
    {
        _factory = new PreceptWebApplicationFactory(fixture)
        {
            ConfigureTestServices = services =>
            {
                services.RemoveAll<ILlmClientFactory>();
                services.AddSingleton(_llmFactory);
            }
        };
    }

    public Task InitializeAsync() => _factory.InitializeAsync();
    public Task DisposeAsync() => _factory.DisposeAsync();

    private async Task<(HttpClient Client, AuthResponse Auth)> DemoLoginAsync()
    {
        var client = _factory.CreateCookieClient();
        var response = await client.PostAsync("/api/auth/demo-login", null);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions);
        return (client, auth!);
    }

    [Fact]
    public async Task TwoDemoLogins_GetDifferentSeededExpiringAccounts()
    {
        var (clientA, authA) = await DemoLoginAsync();
        var (clientB, authB) = await DemoLoginAsync();

        authA.UserId.Should().NotBe(authB.UserId);

        await using var db = _factory.CreateDbContext();
        var users = await db.Users.Where(u => u.Id == authA.UserId || u.Id == authB.UserId).ToListAsync();
        users.Should().HaveCount(2);
        users.Should().OnlyContain(u => u.IsDemo && !u.EmailDigestEnabled && u.PasswordHash == null);
        users.Should().OnlyContain(u => u.DemoExpiresAt > DateTime.UtcNow.AddHours(23));
        users.Should().OnlyContain(u => u.Email!.EndsWith("@demo.invalid"));

        foreach (var id in new[] { authA.UserId, authB.UserId })
        {
            (await db.Applications.IgnoreQueryFilters().CountAsync(a => a.UserId == id)).Should().Be(3);
            (await db.Stories.IgnoreQueryFilters().AnyAsync(s => s.UserId == id)).Should().BeTrue();
        }

        // Each session sees only its own account.
        (await clientA.GetFromJsonAsync<AuthResponse>("/api/auth/me", JsonOptions))!.UserId.Should().Be(authA.UserId);
        (await clientB.GetFromJsonAsync<AuthResponse>("/api/auth/me", JsonOptions))!.UserId.Should().Be(authB.UserId);
    }

    [Fact]
    public async Task DemoUser_MockInterviewEndpoints_ReturnLabelledSamples_WithoutCallingLlm()
    {
        var (client, _) = await DemoLoginAsync();

        var questionResponse = await client.PostAsJsonAsync("/api/mockinterview/generate-question",
            new GenerateMockQuestionRequest { RoleTitle = "Backend Engineer" });
        questionResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var question = await questionResponse.Content.ReadFromJsonAsync<MockQuestionResponse>(JsonOptions);
        question!.IsDemoSample.Should().BeTrue();

        var evaluationResponse = await client.PostAsJsonAsync("/api/mockinterview/evaluate",
            new EvaluateMockAnswerRequest { Question = question.Question, AnswerTranscript = "I rolled back the release." });
        evaluationResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var evaluation = await evaluationResponse.Content.ReadFromJsonAsync<MockInterviewEvaluationResponse>(JsonOptions);
        evaluation!.IsDemoSample.Should().BeTrue();

        _llmFactory.ReceivedCalls().Should().BeEmpty();
    }

    [Fact]
    public async Task DeleteExpired_RemovesOnlyExpiredDemoAccountsAndTheirData()
    {
        var (_, expired) = await DemoLoginAsync();
        var (_, active) = await DemoLoginAsync();
        var (_, regular) = await _factory.CreateAuthenticatedClientAsync(email: $"regular-{Guid.NewGuid():N}@example.com");

        await using (var db = _factory.CreateDbContext())
        {
            var user = await db.Users.SingleAsync(u => u.Id == expired.UserId);
            user.DemoExpiresAt = DateTime.UtcNow.AddMinutes(-1);
            await db.SaveChangesAsync();
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var demoAccounts = scope.ServiceProvider.GetRequiredService<IDemoAccountService>();
            (await demoAccounts.DeleteExpiredAsync(DateTime.UtcNow)).Should().Be(1);
        }

        await using var verify = _factory.CreateDbContext();
        (await verify.Users.AnyAsync(u => u.Id == expired.UserId)).Should().BeFalse();
        (await verify.Applications.IgnoreQueryFilters().AnyAsync(a => a.UserId == expired.UserId)).Should().BeFalse();
        (await verify.Stories.IgnoreQueryFilters().AnyAsync(s => s.UserId == expired.UserId)).Should().BeFalse();
        (await verify.Users.AnyAsync(u => u.Id == active.UserId)).Should().BeTrue();
        (await verify.Users.AnyAsync(u => u.Id == regular.UserId)).Should().BeTrue();
    }

    [Fact]
    public async Task DemoLogin_IsRateLimitedPerClient()
    {
        var limit = new DemoSettings().MaxCreationsPerIpPerHour;
        for (var i = 0; i < limit; i++)
        {
            await DemoLoginAsync();
        }

        var response = await _factory.CreateCookieClient().PostAsync("/api/auth/demo-login", null);
        response.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
    }

    [Fact]
    public async Task PasswordLogin_IsRefusedForDemoAccounts()
    {
        // Simulates the retired shared demo account, whose password was public.
        const string email = "demo@precept.app";
        const string password = "DemoSessionPass2026!";
        using (var scope = _factory.Services.CreateScope())
        {
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var user = new ApplicationUser { UserName = email, Email = email, IsDemo = true, DemoExpiresAt = DateTime.UtcNow };
            (await userManager.CreateAsync(user, password)).Succeeded.Should().BeTrue();
        }

        var response = await _factory.CreateCookieClient().PostAsJsonAsync("/api/auth/login", new { Email = email, Password = password });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task DemoAccounts_GetNoDigestEmail()
    {
        var (_, demo) = await DemoLoginAsync();

        await using (var db = _factory.CreateDbContext())
        {
            // Even if digest were switched on, demo accounts must be skipped.
            var user = await db.Users.SingleAsync(u => u.Id == demo.UserId);
            user.EmailDigestEnabled = true;
            await db.SaveChangesAsync();
        }

        using var scope = _factory.Services.CreateScope();
        var digests = scope.ServiceProvider.GetRequiredService<IDigestQueryService>();
        (await digests.GetDigestAsync(demo.UserId, DateTime.UtcNow)).Should().BeNull();
    }
}
