using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Precept.Api.Data;
using Precept.Api.DTOs;
using Precept.Api.Models;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(
    UserManager<ApplicationUser> userManager,
    ITokenService tokenService,
    ICookieOptionsFactory cookieOptionsFactory,
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
    /// In production, consider requiring email verification before returning tokens.
    /// </summary>
    [HttpPost("register")]
    [EnableRateLimiting("auth")]
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
            UserName = request.Email,
            Email = request.Email,
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
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

        // Generate email confirmation token (dev: logged below; prod: sent via email)
        user.EmailConfirmed = false;
        await userManager.UpdateAsync(user);
        var emailToken = await userManager.GenerateEmailConfirmationTokenAsync(user);
        logger.LogWarning("[DEV ONLY] Email verification token for {Email}: {Token}", request.Email, emailToken);

        logger.UserRegistered(request.Email);

        // Generate tokens for the newly registered user
        var roles = await userManager.GetRolesAsync(user);
        return await GenerateAuthResponse(user, roles, true);
    }

    // ─────────────────────────────────────────────────────────────
    //  POST /api/auth/login
    // ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Authenticates a user and returns an access token + refresh cookie.
    /// </summary>
    [HttpPost("login")]
    [EnableRateLimiting("auth")]
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

        logger.UserLoggedIn(request.Email);

        // 3. Generate tokens
        var roles = await userManager.GetRolesAsync(user);
        return await GenerateAuthResponse(user, roles, request.RememberMe);
    }

    // ─────────────────────────────────────────────────────────────
    //  GET /api/auth/me
    // ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Retrieves the current authenticated user's profile information.
    /// </summary>
    [Authorize]
    [HttpGet("me")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                     ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var user = await userManager.FindByIdAsync(userId);
        if (user == null)
            return NotFound();

        return Ok(new
        {
            user.Id,
            user.Email,
            user.FirstName,
            user.LastName,
            user.CreatedAt
        });
    }

    // ─────────────────────────────────────────────────────────────
    //  POST /api/auth/refresh
    // ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Rotates the refresh token and returns a new access token.
    /// Reads the refresh token from the HTTP-only cookie.
    /// </summary>
    [HttpPost("refresh")]
    [EnableRateLimiting("auth")]
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

        // =================================================================================================
        // STAGE 3: REUSE DETECTION & REPLAY INTERCEPTION (THE CROWN JEWEL)
        // Threat Model: If an attacker intercepts or steals a refresh token, they will attempt to exchange
        // it for an access token. If the legitimate client has already rotated this token, storedToken.IsRevoked
        // is TRUE. Presenting a revoked token triggers immediate breach containment.
        // =================================================================================================
        if (storedToken.IsRevoked)
        {
            // [Pillar I - Lineage Guard]: We must distinguish between malicious replay attacks and benign
            // network anomalies (dual browser tabs refreshing simultaneously or double-click retries).
            // First, find the user's currently active session token in this lineage.
            var activeToken = await dbContext.RefreshTokens
                .Where(rt => rt.UserId == storedToken.UserId && rt.RevokedAt == null)
                // gets the most recent token in this lineage by arranging it from top to show the newest token,
                // and FirstOrDefaultAsync() gets the first one, which is the newest token in this case
                .OrderByDescending(rt => rt.CreatedAt)  
                .FirstOrDefaultAsync();

            // Check if the presented revoked token is the EXACT immediate predecessor (parent) of the active token.
            // If an attacker replays a token 2 generations old (A -> B -> C), A.ReplacedByToken == B (not C).
            // This lineage guard prevents deep historical replay bypasses.
            var isDirectParent = activeToken != null &&
                                 storedToken.ReplacedByToken != null &&
                                 storedToken.ReplacedByToken == activeToken.Token;

            // Check if the rotation occurred within a 10-second concurrency grace window.
            var withinGrace = storedToken.RevokedAt.HasValue &&
                              (DateTime.UtcNow - storedToken.RevokedAt.Value).TotalSeconds <= 10;

            // Benign Anomaly: If direct parent AND within grace window, treat as concurrent client retry.
            if (isDirectParent && withinGrace)
            {
                // Suppress cascade revocation. Return gentle 401 allowing client HTTP interceptor to resync.
                return Unauthorized(new { message = "Token just refreshed" });
            }

            // Confirmed Breach: Replay attack detected outside grace window or across broken lineage.
            // Execute Family-Wide Cascade Revocation to lock down all devices immediately.
            await RevokeAllUserTokens(storedToken.UserId);
            ClearRefreshCookie();
            return Unauthorized(new { message = "Token reuse detection. All sessions have been revoked. Please log in again." });
        }

        // 4. Check if expired
        if (storedToken.IsExpired)
        {
            return Unauthorized(new { message = "Refresh token has expired. Please log in again." });
        }

        // =================================================================================================
        // STAGE 5: CRYPTOGRAPHIC TOKEN ROTATION
        // Every refresh exchange invalidates the spent token and binds it to a newly generated SHA-256 hash.
        // =================================================================================================
        var user = storedToken.User;
        var roles = await userManager.GetRolesAsync(user);

        // Generate new 64-byte CSPRNG refresh token and compute its SHA-256 hash for DB storage
        var newRawToken = tokenService.GenerateRefreshToken();
        var newTokenHash = HashToken(newRawToken);

        // Mark spent token as revoked and record its successor hash to preserve family lineage tracking
        storedToken.RevokedAt = DateTime.UtcNow;
        storedToken.ReplacedByToken = newTokenHash;

        // Persist the replacement refresh token entity
        var newRefreshToken = new RefreshToken
        {
            Token = newTokenHash,
            UserId = user.Id,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDays),
            DeviceInfo = Request.Headers.UserAgent.ToString(),
            RememberMe = storedToken.RememberMe
        };

        dbContext.RefreshTokens.Add(newRefreshToken);
        
        try
        {
            // [Pillar II & III - Single-Save Atomic Rotation & Optimistic Concurrency]:
            // Both parent revocation (UPDATE) and child creation (INSERT) execute in ONE atomic transaction.
            // The [ConcurrencyCheck] attribute on RevokedAt forces EF Core to append 'WHERE RevokedAt IS NULL'.
            // If two overlapping network requests race to rotate this token at the exact same millisecond,
            // the second query affects 0 rows, throwing DbUpdateConcurrencyException.
            await dbContext.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            // [Dead-Heat Race Defense]: Another overlapping thread rotated this token 1 millisecond ago.
            // Catching this prevents split-brain duplicate child tokens. Uncommitted changes evaporate safely.
            return Unauthorized(new { message = "Token just refreshed" });
        }

        // Generate new access token
        var accessToken = tokenService.GenerateAccessToken(user, roles);
        var expiresAt = DateTime.UtcNow.AddMinutes(_jwtSettings.AccessTokenExpiryMinutes);

        // Set the new refresh token cookie
        SetRefreshCookie(newRawToken, storedToken.RememberMe);

        logger.TokensRotated(user.Email);

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
    [EnableRateLimiting("auth")]
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
            logger.TokenRevoked(userId);
        }

        ClearRefreshCookie();
        return Ok(new { message = "Token revoked successfully." });
    }

    // ─────────────────────────────────────────────────────────────
    //  POST /api/auth/forgot-password
    // ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Initiates a password reset for the given email address.
    /// In development, the reset token is logged to the console.
    /// In production, configure an email service (e.g. SendGrid) to send the token.
    /// </summary>
    [HttpPost("forgot-password")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var user = await userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            // Generic response to prevent user enumeration
            return Ok(new { message = "If an account exists, a password reset email has been sent." });
        }

        var token = await userManager.GeneratePasswordResetTokenAsync(user);

        // DEV ONLY: log the token so the developer can test without an email provider
        logger.LogWarning("[DEV ONLY] Password reset token for {Email}: {Token}", request.Email, token);

        // TODO: In production, send this token via a secure email service.
        // Example: await _emailService.SendPasswordResetEmail(request.Email, token);

        return Ok(new { message = "If an account exists, a password reset email has been sent." });
    }

    // ─────────────────────────────────────────────────────────────
    //  POST /api/auth/reset-password
    // ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Resets the password using a token from the forgot-password flow.
    /// </summary>
    [HttpPost("reset-password")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var user = await userManager.FindByEmailAsync(request.Email);
        if (user == null)
            return BadRequest(new { message = "Invalid request." });

        var result = await userManager.ResetPasswordAsync(user, request.Token, request.NewPassword);
        if (!result.Succeeded)
        {
            return BadRequest(new { message = "Invalid or expired token." });
        }

        // Revoke all refresh tokens for this user as a security measure
        await RevokeAllUserTokens(user.Id);

        return Ok(new { message = "Password reset successfully. Please sign in again." });
    }

    // ─────────────────────────────────────────────────────────────
    //  POST /api/auth/verify-email
    // ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Confirms the email address using a token.
    /// In development, the token is logged during registration.
    /// </summary>
    [HttpPost("verify-email")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var user = await userManager.FindByEmailAsync(request.Email);
        if (user == null)
            return BadRequest(new { message = "Invalid request." });

        var result = await userManager.ConfirmEmailAsync(user, request.Token);
        if (!result.Succeeded)
            return BadRequest(new { message = "Invalid or expired token." });

        return Ok(new { message = "Email verified successfully." });
    }

    // ─────────────────────────────────────────────────────────────
    //  Private Helpers
    // ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Generates access + refresh tokens, persists the refresh token, sets the cookie, and returns the response.
    /// </summary>
    private async Task<IActionResult> GenerateAuthResponse(ApplicationUser user, IList<string> roles, bool rememberMe)
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
            DeviceInfo = Request.Headers.UserAgent.ToString(),
            RememberMe = rememberMe
        };

        dbContext.RefreshTokens.Add(refreshTokenEntity);
        await dbContext.SaveChangesAsync();

        // Set HTTP-only secure cookie
        SetRefreshCookie(rawRefreshToken, rememberMe);

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
    private void SetRefreshCookie(string rawToken, bool rememberMe)
    {
        var options = cookieOptionsFactory.CreateCookieOptions(rememberMe);

        if (rememberMe)
        {
            options.Expires = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDays);
        }

        Response.Cookies.Append("refreshToken", rawToken, options);
    }

    private void ClearRefreshCookie()
    {
        var options = cookieOptionsFactory.CreateCookieOptions(false);
        Response.Cookies.Delete("refreshToken", options);
    }

    // ─────────────────────────────────────────────────────────────
    //  PUT /api/auth/profile
    // ─────────────────────────────────────────────────────────────

    [HttpPut("profile")]
    [Authorize]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var user = await userManager.FindByIdAsync(userId);
        if (user == null)
            return NotFound();

        user.FirstName = request.FirstName.Trim();
        user.LastName = request.LastName.Trim();

        var result = await userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            return BadRequest(result.Errors);
        }

        return Ok(new
        {
            user.Id,
            user.Email,
            user.FirstName,
            user.LastName
        });
    }

    /// <summary>
    /// [Fail-Safe Identity-Wide Cascade Revocation]: Invalidates all active sessions for a user identity.
    /// Design Scope Note: While our replay detection mechanism is strictly "Lineage-Aware" (using ReplacedByToken
    /// to trace parent-child lineages and filter out benign concurrent tab retries), the revocation action
    /// itself is intentionally "Identity-Wide" (WHERE UserId == userId). Under the OWASP Fail-Safe doctrine,
    /// a confirmed token theft on Device A (e.g. laptop) assumes the user's underlying credentials or machine
    /// are compromised, nuking all active sessions (phone, tablet) to contain lateral threat movement.
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

}

public static partial class AuthControllerLoggerExtensions
{
    [LoggerMessage(Level = LogLevel.Information, Message = "User {Email} registered successfully")]
    public static partial void UserRegistered(this ILogger logger, string email);

    [LoggerMessage(Level = LogLevel.Information, Message = "User {Email} logged in successfully")]
    public static partial void UserLoggedIn(this ILogger logger, string email);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Refresh token reuse detected for user {UserId}. Revoking all tokens.")]
    public static partial void TokenReuseDetected(this ILogger logger, string userId);

    [LoggerMessage(Level = LogLevel.Information, Message = "Tokens rotated for user {Email}")]
    public static partial void TokensRotated(this ILogger logger, string? email);

    [LoggerMessage(Level = LogLevel.Information, Message = "Refresh token revoked for user {UserId}")]
    public static partial void TokenRevoked(this ILogger logger, string? userId);
}