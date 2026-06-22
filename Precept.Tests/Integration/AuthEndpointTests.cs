using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
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
            Email = email, Password = password, ConfirmPassword = password
        });
        return (response, client);
    }

    private static string? ExtractRefreshCookieHeader(HttpResponseMessage response) =>
        response.Headers
            .Where(h => h.Key.Equals("Set-Cookie", StringComparison.OrdinalIgnoreCase))
            .SelectMany(h => h.Value)
            .FirstOrDefault(c => c.Contains("refreshToken"));

    private static string ExtractRawTokenFromCookieHeader(string cookieHeader) =>
        Uri.UnescapeDataString(cookieHeader.Split(';')[0].Replace("refreshToken=", "").Trim());

    private static string HashToken(string rawToken) =>
        Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken)));

    // ─────────────────────────────────────────────────────────────
    //  Registration
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task Register_Returns200_AndSetsFullySecureCookie()
    {
        var (response, _) = await RegisterAsync();

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var cookie = ExtractRefreshCookieHeader(response);
        cookie.Should().NotBeNull("a refreshToken cookie must be set");
        cookie!.Should().ContainEquivalentOf("HttpOnly");
        cookie.Should().ContainEquivalentOf("path=/api/auth");
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

    [Fact]
    public async Task Register_PersistsHashedToken_NotRawCookieValue()
    {
        var (response, _) = await RegisterAsync();
        response.EnsureSuccessStatusCode();

        var cookieHeader = ExtractRefreshCookieHeader(response)!;
        var rawToken = ExtractRawTokenFromCookieHeader(cookieHeader);
        var expectedHash = HashToken(rawToken);

        await using var db = _factory.CreateDbContext();
        var tokens = await db.RefreshTokens.ToListAsync();

        tokens.Should().Contain(t => t.Token == expectedHash,
            "only the SHA-256 hash of the refresh token must be stored");
        tokens.Should().NotContain(t => t.Token == rawToken,
            "the raw token value must never appear in the database");
    }

    // ─────────────────────────────────────────────────────────────
    //  Login
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task Login_Returns200_WithValidCredentials()
    {
        var email = UniqueEmail();
        await RegisterAsync(email: email);
        var client = _factory.CreateAnonymousClient();

        var response = await client.PostAsJsonAsync("/api/auth/login",
            new { Email = email, Password = "ValidPass123!" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions);
        auth!.AccessToken.Should().NotBeEmpty();
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

    // ─────────────────────────────────────────────────────────────
    //  Token Refresh — Happy Path (must pass before cascade tests)
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task Refresh_Returns200_AndReturnsNewAccessToken()
    {
        var (registerResp, client) = await RegisterAsync();
        var originalAuth = await registerResp.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions);

        var refreshResp = await client.PostAsync("/api/auth/refresh", null);

        refreshResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var newAuth = await refreshResp.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions);
        newAuth!.AccessToken.Should().NotBe(originalAuth!.AccessToken,
            "a new access token must be issued on every refresh");
    }

    [Fact]
    public async Task Refresh_OldRefreshToken_IsMarkedRevoked_InDB()
    {
        var (registerResp, client) = await RegisterAsync();
        registerResp.EnsureSuccessStatusCode();

        await using var db = _factory.CreateDbContext();
        var original = await db.RefreshTokens.SingleAsync();

        await client.PostAsync("/api/auth/refresh", null);

        await db.Entry(original).ReloadAsync();
        original.RevokedAt.Should().NotBeNull("old token must be revoked after rotation");
    }

    [Fact]
    public async Task Refresh_NewCookie_DiffersFromOriginal()
    {
        var (registerResp, client) = await RegisterAsync();
        var originalCookie = ExtractRefreshCookieHeader(registerResp)!;

        var refreshResp = await client.PostAsync("/api/auth/refresh", null);
        var newCookie = ExtractRefreshCookieHeader(refreshResp);

        newCookie.Should().NotBeNull("a new refresh cookie must be set after rotation");
        newCookie.Should().NotBe(originalCookie);
    }

    [Fact]
    public async Task Refresh_NewToken_IsStoredAsHash_InDB()
    {
        var (registerResp, client) = await RegisterAsync();
        registerResp.EnsureSuccessStatusCode();

        var refreshResp = await client.PostAsync("/api/auth/refresh", null);

        var newCookieHeader = ExtractRefreshCookieHeader(refreshResp)!;
        var newRawToken = ExtractRawTokenFromCookieHeader(newCookieHeader);
        var expectedHash = HashToken(newRawToken);

        await using var db = _factory.CreateDbContext();
        var tokens = await db.RefreshTokens.ToListAsync();
        tokens.Should().Contain(t => t.Token == expectedHash && t.RevokedAt == null,
            "the new token must be stored as a hash and must be active");
    }

    // ─────────────────────────────────────────────────────────────
    //  Token Refresh — Failure Paths
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task Refresh_Returns401_WithExpiredToken_DoesNotTriggerCascade()
    {
        var (registerResp, client) = await RegisterAsync();
        registerResp.EnsureSuccessStatusCode();

        await using var db = _factory.CreateDbContext();
        var token = await db.RefreshTokens.SingleAsync();
        token.ExpiresAt = DateTime.UtcNow.AddDays(-1);
        await db.SaveChangesAsync();

        var response = await client.PostAsync("/api/auth/refresh", null);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("expired", "the response must indicate natural expiry");

        await db.Entry(token).ReloadAsync();
        token.RevokedAt.Should().BeNull("natural expiry must not cascade-revoke sessions");
    }


    [Fact]
    public async Task Refresh_ExpiredMessage_DiffersFromReuseMessage()
    {
        var (r1, expiredClient) = await RegisterAsync();
        var (r2, revokedClient) = await RegisterAsync();

        await using var db = _factory.CreateDbContext();

        var auth1 = await r1.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions);
        var expiredToken = await db.RefreshTokens.FirstAsync(t => t.UserId == auth1!.UserId);
        expiredToken.ExpiresAt = DateTime.UtcNow.AddDays(-1);

        var auth2 = await r2.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions);
        var revokedToken = await db.RefreshTokens.FirstAsync(t => t.UserId == auth2!.UserId);
        revokedToken.RevokedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        var expiredBody = await (await expiredClient.PostAsync("/api/auth/refresh", null))
            .Content.ReadAsStringAsync();
        var revokedBody = await (await revokedClient.PostAsync("/api/auth/refresh", null))
            .Content.ReadAsStringAsync();

        expiredBody.Should().NotBe(revokedBody,
            "expired and reuse error messages must be distinguishable for client UX");
    }

    // ─────────────────────────────────────────────────────────────
    //  Protected route
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetMe_Returns401_WithNoToken()
    {
        var response = await _factory.CreateAnonymousClient().GetAsync("/api/auth/me");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetMe_Returns401_WithExpiredAccessToken()
    {
        // Build an expired JWT directly without going through the service
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(PreceptWebApplicationFactory.TestJwtSecret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, "fake-user")]),
            Expires = DateTime.UtcNow.AddHours(-1),
            NotBefore = DateTime.UtcNow.AddHours(-2),
            Issuer = PreceptWebApplicationFactory.TestIssuer,
            Audience = PreceptWebApplicationFactory.TestAudience,
            SigningCredentials = creds
        };
        var handler = new JwtSecurityTokenHandler();
        var expiredToken = handler.WriteToken(handler.CreateToken(descriptor));

        var client = _factory.CreateAnonymousClient();
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", expiredToken);

        var response = await client.GetAsync("/api/auth/me");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        response.Headers.Should().ContainKey("X-Token-Expired",
            "expired tokens must set X-Token-Expired header for client detection");
    }

    [Fact]
    public async Task GetMe_Returns200_WithValidToken()
    {
        var email = UniqueEmail();
        var (client, auth) = await _factory.CreateAuthenticatedClientAsync(email: email);

        var response = await client.GetAsync("/api/auth/me");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain(auth.UserId);
    }

    [Fact]
    public async Task Refresh_ConcurrentRequests_AvoidsCascadeLockout()
    {
        var email = UniqueEmail();
        // Device 1: Register a user and capture the original refresh token
        var (registerResp, _) = await RegisterAsync(email: email);
        registerResp.EnsureSuccessStatusCode();
        var originalCookie = ExtractRefreshCookieHeader(registerResp)!;
        var originalRawToken = ExtractRawTokenFromCookieHeader(originalCookie);

        // Device 2: Login to create a second active token
        var clientDevice2 = _factory.CreateCookieClient();
        (await clientDevice2.PostAsJsonAsync("/api/auth/login",
            new { Email = email, Password = "ValidPass123!" })).EnsureSuccessStatusCode();

        // Prepare two anonymous clients that will send Device 1's original token concurrently
        var client1 = _factory.CreateAnonymousClient();
        var client2 = _factory.CreateAnonymousClient();

        var request1 = new HttpRequestMessage(HttpMethod.Post, "/api/auth/refresh");
        request1.Headers.TryAddWithoutValidation("Cookie", $"refreshToken={Uri.EscapeDataString(originalRawToken)}");
        var request2 = new HttpRequestMessage(HttpMethod.Post, "/api/auth/refresh");
        request2.Headers.TryAddWithoutValidation("Cookie", $"refreshToken={Uri.EscapeDataString(originalRawToken)}");

        // Fire both requests simultaneously
        var task1 = client1.SendAsync(request1);
        var task2 = client2.SendAsync(request2);
        await Task.WhenAll(task1, task2);

        var resp1 = await task1;
        var resp2 = await task2;

        var okResponses = new[] { resp1, resp2 }.Where(r => r.StatusCode == HttpStatusCode.OK).ToList();
        var unauthorizedResponses = new[] { resp1, resp2 }.Where(r => r.StatusCode == HttpStatusCode.Unauthorized).ToList();

        okResponses.Should().HaveCount(1, "exactly one concurrent refresh should succeed");
        unauthorizedResponses.Should().HaveCount(1, "the other request should be treated as a concurrent retry");

        var unauthorizedBody = await unauthorizedResponses[0].Content.ReadAsStringAsync();
        unauthorizedBody.Should().Contain("just refreshed");

        // Verify the active-token count is exactly 2 (Device 1's newly rotated token, and Device 2's untouched token)
        await using var db = _factory.CreateDbContext();
        var tokens = await db.RefreshTokens.ToListAsync();
        tokens.Count(t => t.RevokedAt == null).Should().Be(2, "exactly two tokens should be active (Device 2, and the newly rotated Device 1 token)");
        tokens.Count(t => t.RevokedAt != null).Should().Be(1, "only Device 1's original token should be marked revoked");
    }

    [Fact]
    public async Task Refresh_Returns401_WithNonParentReplayWithinWindow_Cascades()
    {
        var email = UniqueEmail();
        // A -> Initial
        var (registerResp, client1) = await RegisterAsync(email: email);
        var cookieA = ExtractRefreshCookieHeader(registerResp)!;
        var rawTokenA = ExtractRawTokenFromCookieHeader(cookieA);

        // B -> Rotated from A
        var refreshResp1 = await client1.PostAsync("/api/auth/refresh", null);
        refreshResp1.EnsureSuccessStatusCode();

        // Second Device (to prove it also gets revoked)
        var client2 = _factory.CreateCookieClient();
        (await client2.PostAsJsonAsync("/api/auth/login",
            new { Email = email, Password = "ValidPass123!" })).EnsureSuccessStatusCode();

        // C -> Rotated from B (A is now a non-parent, revoked token)
        var refreshResp2 = await client1.PostAsync("/api/auth/refresh", null);
        refreshResp2.EnsureSuccessStatusCode();

        // Attacker replays A (which is NOT the direct parent of C)
        var replayClient = _factory.CreateAnonymousClient();
        var replayRequest = new HttpRequestMessage(HttpMethod.Post, "/api/auth/refresh");
        replayRequest.Headers.TryAddWithoutValidation("Cookie", $"refreshToken={Uri.EscapeDataString(rawTokenA)}");
        var replayResp = await replayClient.SendAsync(replayRequest);

        replayResp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        var body = await replayResp.Content.ReadAsStringAsync();
        body.Should().Contain("reuse", "response must indicate reuse detection");

        // Verify Cascade: All tokens (B, C, and Device 2) must be revoked
        await using var db = _factory.CreateDbContext();
        var allTokens = await db.RefreshTokens.ToListAsync();
        allTokens.Should().AllSatisfy(t =>
            t.RevokedAt.Should().NotBeNull("all sessions must be revoked on non-parent token replay"));
    }

    [Fact]
    public async Task Refresh_Returns401_WithReplayAfterGraceWindow_Cascades()
    {
        var email = UniqueEmail();
        var (registerResp, client1) = await RegisterAsync(email: email);
        var cookieA = ExtractRefreshCookieHeader(registerResp)!;
        var rawTokenA = ExtractRawTokenFromCookieHeader(cookieA);

        var refreshResp1 = await client1.PostAsync("/api/auth/refresh", null);
        refreshResp1.EnsureSuccessStatusCode();

        // Manually move the RevokedAt time of token A beyond the 10-second grace window
        await using var db = _factory.CreateDbContext();
        var tokenA = await db.RefreshTokens.FirstAsync(t => t.ReplacedByToken != null);
        tokenA.RevokedAt = DateTime.UtcNow.AddSeconds(-15);
        await db.SaveChangesAsync();

        // Replay A after grace window
        var replayClient = _factory.CreateAnonymousClient();
        var replayRequest = new HttpRequestMessage(HttpMethod.Post, "/api/auth/refresh");
        replayRequest.Headers.TryAddWithoutValidation("Cookie", $"refreshToken={Uri.EscapeDataString(rawTokenA)}");
        var replayResp = await replayClient.SendAsync(replayRequest);

        replayResp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        var body = await replayResp.Content.ReadAsStringAsync();
        body.Should().Contain("reuse");

        // Verify Cascade
        var allTokens = await db.RefreshTokens.ToListAsync();
        allTokens.Should().AllSatisfy(t =>
            t.RevokedAt.Should().NotBeNull("all sessions must be revoked on replay after grace window"));
    }
}
