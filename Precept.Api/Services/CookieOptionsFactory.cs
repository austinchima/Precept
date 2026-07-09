using Precept.Api.Models;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Services;

public class CookieOptionsFactory(
    IWebHostEnvironment env,
    Microsoft.Extensions.Options.IOptions<JwtSettings> jwtSettings)
    : ICookieOptionsFactory
{
    private readonly int _refreshTokenExpiryDays = jwtSettings.Value.RefreshTokenExpiryDays;
    private readonly int _accessTokenExpiryMinutes = jwtSettings.Value.AccessTokenExpiryMinutes;

    public CookieOptions CreateCookieOptions(bool rememberMe)
    {
        var isProduction = env.IsProduction();
        var options = new CookieOptions
        {
            HttpOnly = true,
            Secure = isProduction,
            SameSite = isProduction ? SameSiteMode.Strict : SameSiteMode.Lax,
            Path = "/api/auth"
        };
        if (rememberMe)
        {
            options.Expires = DateTime.UtcNow.AddDays(_refreshTokenExpiryDays);
        }
        return options;
    }

    public CookieOptions CreateAccessTokenCookieOptions()
    {
        var isProduction = env.IsProduction();
        return new CookieOptions
        {
            HttpOnly = true,
            Secure = isProduction,
            SameSite = isProduction ? SameSiteMode.Strict : SameSiteMode.Lax,
            Path = "/api",
            Expires = DateTime.UtcNow.AddMinutes(_accessTokenExpiryMinutes)
        };
    }
}
