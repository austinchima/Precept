using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using FluentAssertions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using Precept.Api.Models;
using Precept.Api.Services;

namespace Precept.Tests.Unit;

public class TokenServiceTests
{
    private const string ValidSecret = "precept-test-jwt-secret-key-must-be-at-least-32-chars";
    private const string Issuer = "precept-test-issuer";
    private const string Audience = "precept-test-audience";

    private static TokenService CreateService(string? secret = null, TimeProvider? time = null)
    {
        var settings = new JwtSettings
        {
            SecretKey = secret ?? ValidSecret,
            Issuer = Issuer,
            Audience = Audience,
            AccessTokenExpiryMinutes = 15,
            RefreshTokenExpiryDays = 7
        };
        return new TokenService(Options.Create(settings), time ?? TimeProvider.System);
    }

    private static ApplicationUser MakeUser(string id = "user-123") => new()
    {
        Id = id,
        UserName = "testuser",
        Email = "test@example.com"
    };

    // ─────────────────────────────────────────────────────────────
    //  Claims
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public void GenerateAccessToken_ContainsCorrectClaims()
    {
        var svc = CreateService();
        var token = svc.GenerateAccessToken(MakeUser(), ["Admin", "User"]);

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);

        jwt.Subject.Should().Be("user-123");
        jwt.Claims.Should().Contain(c => c.Type == JwtRegisteredClaimNames.Email && c.Value == "test@example.com");
        jwt.Claims.Should().Contain(c => c.Type == "username" && c.Value == "testuser");
        // JwtSecurityTokenHandler maps ClaimTypes.Role to the short "role" claim type in the JWT payload
        jwt.Claims.Should().Contain(c => c.Type == "role" && c.Value == "Admin");
        jwt.Claims.Should().Contain(c => c.Type == "role" && c.Value == "User");
    }

    // ─────────────────────────────────────────────────────────────
    //  Issuer / Audience rejection
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public void ValidateExpiredToken_ReturnsNull_WhenIssuerIsWrong()
    {
        // Pin clock 2 hours in the past so a 1-minute token is already expired
        var fakeTime = new FakeTimeProvider();
        fakeTime.SetUtcNow(DateTimeOffset.UtcNow.AddHours(-2));

        var settings = new JwtSettings
        {
            SecretKey = ValidSecret, Issuer = "wrong-issuer",
            Audience = Audience, AccessTokenExpiryMinutes = 1
        };
        var wrongIssueSvc = new TokenService(Options.Create(settings), fakeTime);
        var token = wrongIssueSvc.GenerateAccessToken(MakeUser(), []);

        var principal = CreateService().ValidateExpiredToken(token);
        principal.Should().BeNull("token with wrong issuer must be rejected");
    }

    [Fact]
    public void ValidateExpiredToken_ReturnsNull_WhenAudienceIsWrong()
    {
        // Pin clock 2 hours in the past so a 1-minute token is already expired
        var fakeTime = new FakeTimeProvider();
        fakeTime.SetUtcNow(DateTimeOffset.UtcNow.AddHours(-2));

        var settings = new JwtSettings
        {
            SecretKey = ValidSecret, Issuer = Issuer,
            Audience = "wrong-audience", AccessTokenExpiryMinutes = 1
        };
        var wrongSvc = new TokenService(Options.Create(settings), fakeTime);
        var token = wrongSvc.GenerateAccessToken(MakeUser(), []);

        var principal = CreateService().ValidateExpiredToken(token);
        principal.Should().BeNull("token with wrong audience must be rejected");
    }

    // ─────────────────────────────────────────────────────────────
    //  Expired but valid token (refresh flow)
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public void ValidateExpiredToken_ReturnsPrincipal_ForExpiredButValidToken()
    {
        // Pin clock to 2 hours in the past so a 1-minute token is already expired
        var fakeTime = new FakeTimeProvider();
        fakeTime.SetUtcNow(DateTimeOffset.UtcNow.AddHours(-2));

        var settings = new JwtSettings
        {
            SecretKey = ValidSecret, Issuer = Issuer,
            Audience = Audience, AccessTokenExpiryMinutes = 1
        };
        var svc = new TokenService(Options.Create(settings), fakeTime);
        var token = svc.GenerateAccessToken(MakeUser(), []);

        // Validate with a real-time service — token is definitely expired
        var principal = CreateService().ValidateExpiredToken(token);

        principal.Should().NotBeNull("refresh flow must accept expired but correctly signed tokens");
        principal!.FindFirst(ClaimTypes.NameIdentifier)?.Value.Should().Be("user-123");
    }

    // ─────────────────────────────────────────────────────────────
    //  Wrong signature
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public void ValidateExpiredToken_ReturnsNull_ForTokenSignedWithDifferentKey()
    {
        var otherSvc = CreateService(secret: "completely-different-secret-key-that-is-32-chars!!!");
        var token = otherSvc.GenerateAccessToken(MakeUser(), []);

        var principal = CreateService().ValidateExpiredToken(token);
        principal.Should().BeNull("tokens signed with the wrong key must be rejected");
    }

    // ─────────────────────────────────────────────────────────────
    //  Refresh token
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public void GenerateRefreshToken_IsValidBase64_AndUnique()
    {
        var svc = CreateService();
        var t1 = svc.GenerateRefreshToken();
        var t2 = svc.GenerateRefreshToken();

        Convert.FromBase64String(t1).Should().NotBeEmpty();
        t1.Should().NotBe(t2, "tokens must be cryptographically unique");
    }

    // ─────────────────────────────────────────────────────────────
    //  Constructor guard
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public void Constructor_Throws_WhenSecretKeyIsUnder32Chars()
    {
        var act = () => CreateService(secret: "too-short");
        act.Should().Throw<InvalidOperationException>().WithMessage("*32 characters*");
    }
}
