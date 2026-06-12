using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Precept.Api.Data;
using Precept.Api.Models;
using Precept.Api.Services;

namespace Precept.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public partial class AuthController(
    UserManager<ApplicationUser> userManager,
    ITokenService tokenService,
    PreceptDbContext dbContext,
    IOptions<JwtSettings> jwtSettings,
    ILogger<AuthController> logger) : ControllerBase
{
    private readonly JwtSettings _jwtSettings = jwtSettings.Value;

    // ─────────────────────────────────────────────────────────────
    //  POST /api/auth/register
    // ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Creates a new user account and returns tokens.
    /// </summary>
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        // Check if a user with this email already exists
        var existingUser = await userManager.FindByEmailAsync(request.Email);
        if (existingUser != null)
        {
            // Generic message to prevent user enumeration
            return Conflict(new { message = "A user with this email already exists." });
        }

        var user = new ApplicationUser
        {
            UserName = $"{request.FirstName.Trim()} {request.LastName.Trim()}",
            Email = request.Email,
            CreatedAt = DateTime.UtcNow
        };

        // ASP.NET Identity handles password hashing (PBKDF2) and validation rules
        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            foreach (var error in result.Errors)
            {
                ModelState.AddModelError(error.Code, error.Description);
            }
            return BadRequest(ModelState);
        }

        LogUserRegistered(request.Email);

        // Generate tokens for the newly registered user
        var roles = await userManager.GetRolesAsync(user);
        return await GenerateAuthResponse(user, roles);
    }

    // ─────────────────────────────────────────────────────────────
    //  POST /api/auth/login
    // ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Authenticates a user and returns an access token + refresh cookie.
    /// </summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        // 1. Find user by email (ASP.NET Identity)
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            return Unauthorized(new { message = "Invalid credentials." });
        }

        // 2. Verify password (ASP.NET Identity — constant-time comparison)
        var isPasswordValid = await userManager.CheckPasswordAsync(user, request.Password);
        if (!isPasswordValid)
        {
            return Unauthorized(new { message = "Invalid credentials." });
        }

        LogUserLoggedIn(request.Email);

        // 3. Generate tokens
        var roles = await userManager.GetRolesAsync(user);
        return await GenerateAuthResponse(user, roles);
    }

    // ─────────────────────────────────────────────────────────────
    //  POST /api/auth/refresh
    // ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Rotates the refresh token and returns a new access token.
    /// Reads the refresh token from the HTTP-only cookie.
    /// </summary>
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh()
    {
        // 1. Read refresh token from cookie
        var rawToken = Request.Cookies["refreshToken"];
        if (string.IsNullOrWhiteSpace(rawToken))
        {
            return Unauthorized(new { message = "Refresh token is required." });
        }

        // 2. Hash the incoming token and look it up
        var tokenHash = HashToken(rawToken);
        var storedToken = await dbContext.RefreshTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.Token == tokenHash);

        if (storedToken == null)
        {
            return Unauthorized(new { message = "Invalid refresh token." });
        }

        // 3. Reuse detection: if the token was already revoked, someone may be replaying a stolen token
        if (storedToken.IsRevoked)
        {
            LogTokenReuseDetected(storedToken.UserId);

            await RevokeAllUserTokens(storedToken.UserId);
            ClearRefreshCookie();
            return Unauthorized(new { message = "Token reuse detected. All sessions have been revoked. Please log in again." });
        }

        // 4. Check if expired
        if (storedToken.IsExpired)
        {
            return Unauthorized(new { message = "Refresh token has expired. Please log in again." });
        }

        // 5. Rotate: revoke the old token and issue a new one
        var user = storedToken.User;
        var roles = await userManager.GetRolesAsync(user);

        // Generate new refresh token
        var newRawToken = tokenService.GenerateRefreshToken();
        var newTokenHash = HashToken(newRawToken);

        // Mark old token as revoked and link to replacement
        storedToken.RevokedAt = DateTime.UtcNow;
        storedToken.ReplacedByToken = newTokenHash;

        // Persist the new refresh token
        var newRefreshToken = new RefreshToken
        {
            Token = newTokenHash,
            UserId = user.Id,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDays),
            DeviceInfo = Request.Headers.UserAgent.ToString()
        };

        dbContext.RefreshTokens.Add(newRefreshToken);
        await dbContext.SaveChangesAsync();

        // Generate new access token
        var accessToken = tokenService.GenerateAccessToken(user, roles);
        var expiresAt = DateTime.UtcNow.AddMinutes(_jwtSettings.AccessTokenExpiryMinutes);

        // Set the new refresh token cookie
        SetRefreshCookie(newRawToken);

        LogTokensRotated(user.Email);

        return Ok(new AuthResponse
        {
            AccessToken = accessToken,
            ExpiresAt = expiresAt,
            Email = user.Email ?? string.Empty,
            UserId = user.Id
        });
    }

    // ─────────────────────────────────────────────────────────────
    //  POST /api/auth/revoke
    // ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Revokes the current refresh token (logout).
    /// Requires a valid access token.
    /// </summary>
    [Authorize]
    [HttpPost("revoke")]
    public async Task<IActionResult> Revoke()
    {
        var rawToken = Request.Cookies["refreshToken"];
        if (string.IsNullOrWhiteSpace(rawToken))
        {
            return BadRequest(new { message = "No refresh token found." });
        }

        var tokenHash = HashToken(rawToken);
        var storedToken = await dbContext.RefreshTokens
            .FirstOrDefaultAsync(rt => rt.Token == tokenHash);

        if (storedToken is { IsActive: true })
        {
            storedToken.RevokedAt = DateTime.UtcNow;
            await dbContext.SaveChangesAsync();

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                         ?? User.FindFirst("sub")?.Value;
            LogTokenRevoked(userId);
        }

        ClearRefreshCookie();
        return Ok(new { message = "Token revoked successfully." });
    }

    // ─────────────────────────────────────────────────────────────
    //  Private Helpers
    // ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Generates access + refresh tokens, persists the refresh token, sets the cookie, and returns the response.
    /// </summary>
    private async Task<IActionResult> GenerateAuthResponse(ApplicationUser user, IList<string> roles)
    {
        // Generate tokens
        var accessToken = tokenService.GenerateAccessToken(user, roles);
        var rawRefreshToken = tokenService.GenerateRefreshToken();
        var expiresAt = DateTime.UtcNow.AddMinutes(_jwtSettings.AccessTokenExpiryMinutes);

        // Hash and persist the refresh token
        var refreshTokenEntity = new RefreshToken
        {
            Token = HashToken(rawRefreshToken),
            UserId = user.Id,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDays),
            DeviceInfo = Request.Headers.UserAgent.ToString()
        };

        dbContext.RefreshTokens.Add(refreshTokenEntity);
        await dbContext.SaveChangesAsync();

        // Set HTTP-only secure cookie
        SetRefreshCookie(rawRefreshToken);

        return Ok(new AuthResponse
        {
            AccessToken = accessToken,
            ExpiresAt = expiresAt,
            Email = user.Email ?? string.Empty,
            UserId = user.Id
        });
    }

    /// <summary>
    /// Computes a SHA-256 hash of the raw token for secure storage.
    /// </summary>
    private static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(bytes);
    }

    /// <summary>
    /// Sets the refresh token as an HTTP-only secure cookie.
    /// </summary>
    private void SetRefreshCookie(string rawToken)
    {
        Response.Cookies.Append("refreshToken", rawToken, new CookieOptions
        {
            HttpOnly = true,     // Not accessible via JavaScript (XSS protection)
            Secure = true,       // Only sent over HTTPS
            SameSite = SameSiteMode.Strict, // CSRF protection
            Expires = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDays),
            Path = "/api/auth"   // Only sent to auth endpoints (minimizes exposure)
        });
    }

    /// <summary>
    /// Removes the refresh token cookie from the client.
    /// </summary>
    private void ClearRefreshCookie()
    {
        Response.Cookies.Delete("refreshToken", new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Path = "/api/auth"
        });
    }

    /// <summary>
    /// Revokes all refresh tokens for a user (used when reuse is detected).
    /// </summary>
    private async Task RevokeAllUserTokens(string userId)
    {
        var activeTokens = await dbContext.RefreshTokens
            .Where(rt => rt.UserId == userId && rt.RevokedAt == null)
            .ToListAsync();

        foreach (var token in activeTokens)
        {
            token.RevokedAt = DateTime.UtcNow;
        }

        await dbContext.SaveChangesAsync();
    }

    // ─────────────────────────────────────────────────────────────
    //  Source-generated log methods (high-performance logging)
    // ─────────────────────────────────────────────────────────────

    [LoggerMessage(Level = LogLevel.Information, Message = "User {Email} registered successfully")]
    private partial void LogUserRegistered(string email);

    [LoggerMessage(Level = LogLevel.Information, Message = "User {Email} logged in successfully")]
    private partial void LogUserLoggedIn(string email);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Refresh token reuse detected for user {UserId}. Revoking all tokens.")]
    private partial void LogTokenReuseDetected(string userId);

    [LoggerMessage(Level = LogLevel.Information, Message = "Tokens rotated for user {Email}")]
    private partial void LogTokensRotated(string? email);

    [LoggerMessage(Level = LogLevel.Information, Message = "Refresh token revoked for user {UserId}")]
    private partial void LogTokenRevoked(string? userId);
}
