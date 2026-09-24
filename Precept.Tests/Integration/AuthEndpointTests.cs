using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Precept.Api.DTOs;
using Precept.Tests.Infrastructure;

namespace Precept.Tests.Integration;

[Collection("Integration")]
public class AuthEndpointTests : IAsyncLifetime
{
    private readonly PreceptWebApplicationFactory _factory;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
    };

    public AuthEndpointTests(PostgresContainerFixture fixture)
    {
        _factory = new PreceptWebApplicationFactory(fixture);
    }

    public Task InitializeAsync() => _factory.InitializeAsync();
    public Task DisposeAsync() => _factory.DisposeAsync();

    // ─────────────────────────────────────────────────────────────
    //  Helpers
    // ─────────────────────────────────────────────────────────────

    private static string UniqueEmail() => $"auth-{Guid.NewGuid():N}@example.com";

    private async Task<(HttpResponseMessage Response, HttpClient Client)> RegisterAsync(
        string? email = null, string password = "ValidPass123!")
    {
        var client = _factory.CreateCookieClient();
        email ??= UniqueEmail();

        var response = await client.PostAsJsonAsync("/api/auth/register", new
        {
            FirstName = "Test", LastName = "User",
            Email = email, Password = password, ConfirmPassword = password,
            AgreedToTerms = true
        });
        return (response, client);
    }

    private static string? ExtractAuthCookieHeader(HttpResponseMessage response) =>
        response.Headers
            .Where(h => h.Key.Equals("Set-Cookie", StringComparison.OrdinalIgnoreCase))
            .SelectMany(h => h.Value)
            .FirstOrDefault(c => c.Contains("precept_auth"));

    // ─────────────────────────────────────────────────────────────
    //  Registration
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task Register_Returns200_AndSetsSecureSessionCookie()
    {
        var (response, _) = await RegisterAsync();

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var cookie = ExtractAuthCookieHeader(response);
        cookie.Should().NotBeNull("the precept_auth session cookie must be set");
        cookie!.Should().ContainEquivalentOf("HttpOnly");
        cookie.Should().ContainEquivalentOf("path=/");
        cookie.Should().MatchRegex("(?i)samesite=(Lax|Strict)");
    }

    [Fact]
    public async Task Register_Returns409_WhenEmailAlreadyExists()
    {
        var email = UniqueEmail();
        await RegisterAsync(email: email);
        var (second, _) = await RegisterAsync(email: email);
        second.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Theory]
    [InlineData("nouppercase1!", "missing uppercase")]
    [InlineData("NOLOWERCASE1!", "missing lowercase")]
    [InlineData("NoDigitHere!!", "missing digit")]
    [InlineData("NoSpecial123", "missing special char")]
    [InlineData("Sh0rt!", "too short")]
    public async Task Register_Returns400_WithWeakPassword(string weakPassword, string reason)
    {
        var (response, _) = await RegisterAsync(password: weakPassword);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest, reason);
    }

    [Theory]
    [InlineData("userexample@email", "missing TLD dot")]
    [InlineData("user@example", "missing TLD dot")]
    [InlineData("user@example.c", "TLD too short")]
    [InlineData("user example@example.com", "contains whitespace")]
    [InlineData("user@ example.com", "contains whitespace")]
    public async Task Register_Returns400_WithInvalidEmail(string invalidEmail, string reason)
    {
        var (response, _) = await RegisterAsync(email: invalidEmail);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest, reason);
    }

    // ─────────────────────────────────────────────────────────────
    //  Login
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task Login_Returns200_WithValidCredentials_AndSetsSessionCookie()
    {
        var email = UniqueEmail();
        await RegisterAsync(email: email);
        var client = _factory.CreateCookieClient();

        var response = await client.PostAsJsonAsync("/api/auth/login",
            new { Email = email, Password = "ValidPass123!" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        ExtractAuthCookieHeader(response).Should().NotBeNull("login must set the precept_auth cookie");

        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions);
        auth!.Email.Should().Be(email);
        auth.UserId.Should().NotBeEmpty();
    }

    [Fact]
    public async Task Login_Returns401_WithWrongPassword()
    {
        var email = UniqueEmail();
        await RegisterAsync(email: email);
        var client = _factory.CreateAnonymousClient();

        var response = await client.PostAsJsonAsync("/api/auth/login",
            new { Email = email, Password = "WrongPassword99!" });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Theory]
    [InlineData("userexample@email")]
    [InlineData("user@example")]
    [InlineData("user @example.com")]
    public async Task Login_Returns400_WithInvalidEmail(string invalidEmail)
    {
        var client = _factory.CreateAnonymousClient();
        var response = await client.PostAsJsonAsync("/api/auth/login",
            new { Email = invalidEmail, Password = "ValidPass123!" });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Login_LocksOut_AfterFiveFailedAttempts()
    {
        var email = UniqueEmail();
        await RegisterAsync(email: email);
        var client = _factory.CreateCookieClient();

        for (var i = 0; i < 5; i++)
        {
            var attempt = await client.PostAsJsonAsync("/api/auth/login",
                new { Email = email, Password = "WrongPassword99!" });
            attempt.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        // The 6th attempt — even with the CORRECT password — must be rejected as locked out.
        var lockedResponse = await client.PostAsJsonAsync("/api/auth/login",
            new { Email = email, Password = "ValidPass123!" });

        lockedResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        var body = await lockedResponse.Content.ReadAsStringAsync();
        body.Should().ContainEquivalentOf("locked");
    }

    // ─────────────────────────────────────────────────────────────
    //  Protected routes & session lifecycle
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetMe_Returns401_WithNoSessionCookie()
    {
        var response = await _factory.CreateAnonymousClient().GetAsync("/api/auth/me");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetMe_Returns200_WithSessionCookie()
    {
        var email = UniqueEmail();
        var (client, auth) = await _factory.CreateAuthenticatedClientAsync(email: email);

        var response = await client.GetAsync("/api/auth/me");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain(auth.UserId);
    }

    [Fact]
    public async Task Revoke_SignsOut_AndInvalidatesCookie()
    {
        var (registerResp, client) = await RegisterAsync();
        registerResp.EnsureSuccessStatusCode();

        var revokeResp = await client.PostAsync("/api/auth/revoke", null);
        revokeResp.StatusCode.Should().Be(HttpStatusCode.OK);

        var meResp = await client.GetAsync("/api/auth/me");
        meResp.StatusCode.Should().Be(HttpStatusCode.Unauthorized,
            "after logout the session cookie must no longer authenticate");
    }

    [Fact]
    public async Task SignOutEverywhere_InvalidatesOtherSessions_KeepsCurrentSession()
    {
        var email = UniqueEmail();
        await RegisterAsync(email: email);

        // Device 1 and Device 2 both log in.
        var device1 = _factory.CreateCookieClient();
        (await device1.PostAsJsonAsync("/api/auth/login",
            new { Email = email, Password = "ValidPass123!" })).EnsureSuccessStatusCode();

        var device2 = _factory.CreateCookieClient();
        (await device2.PostAsJsonAsync("/api/auth/login",
            new { Email = email, Password = "ValidPass123!" })).EnsureSuccessStatusCode();

        // Device 1 signs out everywhere.
        var response = await device1.PostAsync("/api/auth/sign-out-everywhere", null);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        // Device 2's old cookie must now be rejected (security stamp rotated).
        var device2Me = await device2.GetAsync("/api/auth/me");
        device2Me.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        // Device 1 stays signed in (its cookie was refreshed by the endpoint).
        var device1Me = await device1.GetAsync("/api/auth/me");
        device1Me.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ─────────────────────────────────────────────────────────────
    //  CSRF header check
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task MutatingRequest_WithoutXRequestedWith_Returns403()
    {
        var client = _factory.CreateAnonymousClient();
        client.DefaultRequestHeaders.Remove("X-Requested-With");

        var response = await client.PostAsJsonAsync("/api/auth/login",
            new { Email = "nobody@example.com", Password = "ValidPass123!" });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ─────────────────────────────────────────────────────────────
    //  Demo Login & Google OAuth
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task DemoLogin_Returns200_AndSeedsApplicationsAndStories()
    {
        var client = _factory.CreateCookieClient();

        // 1. Initial Demo Login
        var response = await client.PostAsync("/api/auth/demo-login", null);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        ExtractAuthCookieHeader(response).Should().NotBeNull(
            "precept_auth cookie must be set on demo login");

        // 2. Verify seeded data in DB
        await using var db = _factory.CreateDbContext();
        var demoUser = await db.Users.FirstOrDefaultAsync(u => u.Email == "demo@precept.app");
        demoUser.Should().NotBeNull();

        var demoApps = await db.Applications.IgnoreQueryFilters().Where(a => a.UserId == demoUser!.Id).ToListAsync();
        demoApps.Should().NotBeEmpty("demo applications must be seeded");
        demoApps.Should().Contain(a => a.CompanyName == "Stripe");
        demoApps.Should().Contain(a => a.CompanyName == "Vercel");

        var demoStories = await db.Stories.IgnoreQueryFilters().Where(s => s.UserId == demoUser!.Id).ToListAsync();
        demoStories.Should().NotBeEmpty("demo stories must be seeded");

        // 3. Subsequent Demo Login succeeds seamlessly
        var client2 = _factory.CreateCookieClient();
        var response2 = await client2.PostAsync("/api/auth/demo-login", null);
        response2.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GoogleLogin_Returns200_AndRegistersUser()
    {
        var client = _factory.CreateCookieClient();
        var email = UniqueEmail();

        var response = await client.PostAsJsonAsync("/api/auth/google", new GoogleAuthRequest
        {
            Email = email,
            FirstName = "Google",
            LastName = "Dev",
            IdToken = "mock-id-token"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        ExtractAuthCookieHeader(response).Should().NotBeNull(
            "precept_auth cookie must be set on Google login");

        // Verify user created in DB
        await using var db = _factory.CreateDbContext();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
        user.Should().NotBeNull();
        user!.FirstName.Should().Be("Google");

        // Repeat login with same email returns OK
        var client2 = _factory.CreateCookieClient();
        var response2 = await client2.PostAsJsonAsync("/api/auth/google", new GoogleAuthRequest
        {
            Email = email,
            FirstName = "Google",
            LastName = "Dev"
        });

        response2.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
