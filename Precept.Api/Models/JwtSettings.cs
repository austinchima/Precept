namespace Precept.Api.Models;

/// <summary>
/// Strongly-typed configuration for JWT token generation and validation.
/// Bound to the "JwtSettings" section in appsettings.json.
/// </summary>
public class JwtSettings
{
    public const string SectionName = "JwtSettings";

    /// <summary>
    /// HMAC-SHA256 signing key. Must be at least 32 bytes (256 bits).
    /// In production, override via the JWT_SECRET_KEY environment variable.
    /// </summary>
    public string SecretKey { get; set; } = string.Empty;

    /// <summary>
    /// Token issuer (iss claim). Should match the API's domain/name.
    /// </summary>
    public string Issuer { get; set; } = string.Empty;

    /// <summary>
    /// Token audience (aud claim). Should match the consuming client.
    /// </summary>
    public string Audience { get; set; } = string.Empty;

    /// <summary>
    /// Access token lifetime in minutes. Default: 15 minutes.
    /// Keep short — access tokens cannot be revoked once issued.
    /// </summary>
    public int AccessTokenExpiryMinutes { get; set; } = 15;

    /// <summary>
    /// Refresh token lifetime in days. Default: 7 days.
    /// Refresh tokens are rotated on each use and stored hashed in the database.
    /// </summary>
    public int RefreshTokenExpiryDays { get; set; } = 7;
}
