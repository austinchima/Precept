using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using NSubstitute;
using Precept.Api.Models;
using Precept.Api.Services;

namespace Precept.Tests.Unit;

public class CookieOptionsFactoryTests
{
    private readonly IWebHostEnvironment _envMock;
    private readonly IOptions<JwtSettings> _jwtSettingsMock;
    private readonly CookieOptionsFactory _factory;

    public CookieOptionsFactoryTests()
    {
        _envMock = Substitute.For<IWebHostEnvironment>();
        _jwtSettingsMock = Substitute.For<IOptions<JwtSettings>>();

        _jwtSettingsMock.Value.Returns(new JwtSettings { RefreshTokenExpiryDays = 7 });

        _factory = new CookieOptionsFactory(_envMock, _jwtSettingsMock);
    }

    [Fact]
    public void CreateCookieOptions_InProduction_SetsSecureTrueAndSameSiteStrict()
    {
        // Arrange
        _envMock.EnvironmentName.Returns("Production");

        // Act
        var options = _factory.CreateCookieOptions(rememberMe: true);

        // Assert
        options.HttpOnly.Should().BeTrue("HttpOnly must always be true to prevent XSS");
        options.Secure.Should().BeTrue("Production cookies must be Secure");
        options.SameSite.Should().Be(SameSiteMode.Strict, "Production cookies must use Strict SameSite to prevent CSRF");
        options.Expires.Should().NotBeNull();
    }

    [Fact]
    public void CreateCookieOptions_InDevelopment_SetsSecureFalseAndSameSiteLax()
    {
        // Arrange
        _envMock.EnvironmentName.Returns("Development");

        // Act
        var options = _factory.CreateCookieOptions(rememberMe: false);

        // Assert
        options.HttpOnly.Should().BeTrue("HttpOnly must always be true to prevent XSS");
        options.Secure.Should().BeFalse("Development cookies cannot be Secure without HTTPS");
        options.SameSite.Should().Be(SameSiteMode.Lax, "Development cookies must use Lax for local dev ease");
        options.Expires.Should().BeNull("rememberMe=false should not set an explicit expiration");
    }
}
