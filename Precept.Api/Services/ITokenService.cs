using System.Security.Claims;
using Precept.Api.Models;

namespace Precept.Api.Services;

/// <summary>
/// Generates and validates JWT access tokens and cryptographic refresh tokens.
/// </summary>
public interface ITokenService
{
    /// <summary>
    /// Generates a short-lived JWT access token containing the user's claims and roles.
    /// </summary>
    /// <param name="user">The authenticated user.</param>
    /// <param name="roles">The user's ASP.NET Identity roles.</param>
    /// <returns>A signed JWT string.</returns>
    string GenerateAccessToken(ApplicationUser user, IList<string> roles);

    /// <summary>
    /// Generates a cryptographically random refresh token (Base64URL-encoded).
    /// The caller is responsible for hashing and persisting it.
    /// </summary>
    /// <returns>A raw refresh token string.</returns>
    string GenerateRefreshToken();

    /// <summary>
    /// Validates a JWT access token without checking its lifetime.
    /// Used during the refresh flow to extract user identity from an expired token.
    /// </summary>
    /// <param name="token">The expired JWT access token.</param>
    /// <returns>The claims principal if the token signature and issuer/audience are valid; null otherwise.</returns>
    ClaimsPrincipal? ValidateExpiredToken(string token);
}
