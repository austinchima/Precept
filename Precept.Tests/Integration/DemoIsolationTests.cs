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
    private readonly PostgresContainerFixture _fixture;
    private readonly PreceptWebApplicationFactory _factory;
    private readonly ILlmClientFactory _llmFactory = Substitute.For<ILlmClientFactory>();

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
    };

    public DemoIsolationTests(PostgresContainerFixture fixture)
    {
        _fixture = fixture;
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

        // The UI uses these to show the demo banner.
        using var me = JsonDocument.Parse(await clientA.GetStringAsync("/api/auth/me"));
        me.RootElement.GetProperty("isDemo").GetBoolean().Should().BeTrue();
        me.RootElement.GetProperty("demoExpiresAt").GetDateTime().Should().BeAfter(DateTime.UtcNow.AddHours(23));
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
    public async Task DeleteExpired_RemovesOnlyExpiredDemoAccountsAndAllTheirData()
    {
        var (_, expired) = await DemoLoginAsync();
        var (_, active) = await DemoLoginAsync();
        var (_, regular) = await _factory.CreateAuthenticatedClientAsync(email: $"regular-{Guid.NewGuid():N}@example.com");

        await using (var db = _factory.CreateDbContext())
        {
            var user = await db.Users.SingleAsync(u => u.Id == expired.UserId);
            user.DemoExpiresAt = DateTime.UtcNow.AddMinutes(-1);

            // Give the expired account one row in every user-owned table, including a soft-deleted application.
            var app = await db.Applications.IgnoreQueryFilters().FirstAsync(a => a.UserId == expired.UserId);
            app.IsDeleted = true;
            app.DeletedAt = DateTime.UtcNow;
            db.ApplicationEvents.Add(new ApplicationEvent { ApplicationId = app.Id, Status = ApplicationStatus.Applied });
            db.Skills.Add(new Skill { UserId = expired.UserId, Name = "Go" });
            db.JobDescriptions.Add(new JobDescription { UserId = expired.UserId, CompanyName = "Acme", RoleTitle = "Engineer", Description = "Go services" });
            db.Testimonials.Add(new Testimonial { UserId = expired.UserId, Name = "Demo", Handle = "demo", Text = "Sample" });
            await db.SaveChangesAsync();
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var demoAccounts = scope.ServiceProvider.GetRequiredService<IDemoAccountService>();
            (await demoAccounts.DeleteExpiredAsync(DateTime.UtcNow)).Should().Be(1);
        }

        await using var verify = _factory.CreateDbContext();
        var id = expired.UserId;
        (await verify.Users.AnyAsync(u => u.Id == id)).Should().BeFalse();
        (await verify.Applications.IgnoreQueryFilters().AnyAsync(a => a.UserId == id)).Should().BeFalse();
        (await verify.ApplicationEvents.IgnoreQueryFilters().AnyAsync(e => e.Application!.UserId == id)).Should().BeFalse();
        (await verify.Stories.IgnoreQueryFilters().AnyAsync(x => x.UserId == id)).Should().BeFalse();
        (await verify.BehavioralStories.IgnoreQueryFilters().AnyAsync(x => x.UserId == id)).Should().BeFalse();
        (await verify.Skills.IgnoreQueryFilters().AnyAsync(x => x.UserId == id)).Should().BeFalse();
        (await verify.JobDescriptions.IgnoreQueryFilters().AnyAsync(x => x.UserId == id)).Should().BeFalse();
        (await verify.Testimonials.IgnoreQueryFilters().AnyAsync(x => x.UserId == id)).Should().BeFalse();
        (await verify.Users.AnyAsync(u => u.Id == active.UserId)).Should().BeTrue();
        (await verify.Users.AnyAsync(u => u.Id == regular.UserId)).Should().BeTrue();
    }

    private static async Task<HttpStatusCode> DemoLoginFromAsync(PreceptWebApplicationFactory factory, string clientIp)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/demo-login");
        request.Headers.Add("X-Forwarded-For", clientIp);
        var response = await factory.CreateCookieClient().SendAsync(request);
        return response.StatusCode;
    }

    [Fact]
    public async Task DemoLogin_BehindTrustedProxy_IsLimitedPerClientIp()
    {
        var factory = new PreceptWebApplicationFactory(_fixture)
        {
            Settings = { ["ForwardedHeaders:TrustAllProxies"] = "true" }
        };
        await factory.InitializeAsync();
        try
        {
            var limit = new DemoSettings().MaxCreationsPerIpPerHour;
            for (var i = 0; i < limit; i++)
            {
                (await DemoLoginFromAsync(factory, "203.0.113.10")).Should().Be(HttpStatusCode.OK);
            }

            (await DemoLoginFromAsync(factory, "203.0.113.10")).Should().Be(HttpStatusCode.TooManyRequests);
            (await DemoLoginFromAsync(factory, "203.0.113.20")).Should().Be(HttpStatusCode.OK,
                "a different visitor has its own limit");
        }
        finally
        {
            await factory.DisposeAsync();
        }
    }

    [Fact]
    public async Task DemoLogin_WithoutTrustedProxy_IgnoresForwardedFor()
    {
        // Forwarded headers are off by default, so a client cannot pick a fresh address per request.
        var limit = new DemoSettings().MaxCreationsPerIpPerHour;
        for (var i = 0; i < limit; i++)
        {
            (await DemoLoginFromAsync(_factory, $"198.51.100.{i + 1}")).Should().Be(HttpStatusCode.OK);
        }

        (await DemoLoginFromAsync(_factory, "198.51.100.200")).Should().Be(HttpStatusCode.TooManyRequests);
    }

    [Fact]
    public async Task PasswordLogin_IsRefusedForDemoAccounts()
    {
        // Simulates the retired shared demo account, whose password was public.
        const string email = "demo@precept.app";
        var password = $"Aa1!{Guid.NewGuid():N}";
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

    [Fact]
    public async Task DemoAccounts_CannotSubmitTestimonials()
    {
        var (client, demo) = await DemoLoginAsync();

        var response = await client.PostAsJsonAsync("/api/testimonial", new { Name = "Demo", Handle = "demo", Text = "Great app" });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        await using var db = _factory.CreateDbContext();
        (await db.Testimonials.IgnoreQueryFilters().AnyAsync(t => t.UserId == demo.UserId)).Should().BeFalse();
    }
}
