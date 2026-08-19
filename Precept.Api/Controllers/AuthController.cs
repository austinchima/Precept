using System.Security.Claims;
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
    IRefreshTokenService refreshTokenService,
    ICookieOptionsFactory cookieOptionsFactory,
    IOptions<JwtSettings> jwtSettings,
    IWebHostEnvironment environment,
    IStoryService storyService,
    IBehavioralStoryService behavioralStoryService,
    PreceptDbContext dbContext,
    ILogger<AuthController> logger) : ControllerBase
{
    private readonly JwtSettings _jwtSettings = jwtSettings.Value;

    private static string NormalizeEmail(string email) =>
        new(email.Where(c => !char.IsWhiteSpace(c)).ToArray());

    /// <summary>
    /// Creates a new user account and returns tokens.
    /// </summary>
    [HttpPost("register")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (!request.AgreedToTerms)
            return BadRequest(new { message = "You must agree to the Terms of Service to register." });

        request.Email = NormalizeEmail(request.Email);

        var existingUser = await userManager.FindByEmailAsync(request.Email);
        if (existingUser != null)
        {
            return Conflict(new { message = "A user with this email already exists." });
        }

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim()
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            return BadRequest(new { message = string.Join("; ", result.Errors.Select(e => e.Description)) });
        }

        logger.UserRegistered(request.Email);

        // Seed example stories for new users
        await storyService.SeedExampleStoriesAsync(user.Id);
        await behavioralStoryService.SeedExampleStoriesAsync(user.Id);

        var roles = await userManager.GetRolesAsync(user);
        return await GenerateAuthResponse(user, roles, true);
    }

    /// <summary>
    /// Authenticates a user and returns an access token + refresh cookie.
    /// </summary>
    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        request.Email = NormalizeEmail(request.Email);

        var user = await userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            return Unauthorized(new { message = "Invalid credentials." });
        }

        if (await userManager.IsLockedOutAsync(user))
        {
            return Unauthorized(new { message = "Account locked due to too many failed attempts. Please try again later." });
        }

        var isPasswordValid = await userManager.CheckPasswordAsync(user, request.Password);
        if (!isPasswordValid)
        {
            await userManager.AccessFailedAsync(user);
            return Unauthorized(new { message = "Invalid credentials." });
        }

        logger.UserLoggedIn(request.Email);

        var roles = await userManager.GetRolesAsync(user);
        return await GenerateAuthResponse(user, roles, request.RememberMe);
    }

    /// <summary>
    /// Authenticates into an instant, pre-seeded hosted demo session without requiring registration.
    /// </summary>
    [HttpPost("demo-login")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> DemoLogin()
    {
        const string demoEmail = "demo@precept.app";
        var user = await userManager.FindByEmailAsync(demoEmail);

        if (user == null)
        {
            user = new ApplicationUser
            {
                UserName = demoEmail,
                Email = demoEmail,
                FirstName = "Alex",
                LastName = "Chen",
                EmailConfirmed = true
            };

            var createResult = await userManager.CreateAsync(user, "DemoSessionPass2026!");
            if (createResult.Succeeded)
            {
                // Seed stories & behavioral templates
                await storyService.SeedExampleStoriesAsync(user.Id);
                await behavioralStoryService.SeedExampleStoriesAsync(user.Id);

                // Seed demo applications
                if (!await dbContext.Applications.IgnoreQueryFilters().AnyAsync(a => a.UserId == user.Id))
                {
                    dbContext.Applications.AddRange(
                        new Application
                        {
                            UserId = user.Id,
                            CompanyName = "Stripe",
                            RoleTitle = "Staff Systems Engineer",
                            Location = "San Francisco, CA (Hybrid)",
                            SalaryRange = "$240k - $310k",
                            Status = ApplicationStatus.Interviewing,
                            DateApplied = DateTime.UtcNow.AddDays(-12),
                            FollowUpDate = DateTime.UtcNow.AddDays(2),
                            ResumeVersion = "v4.2-Infrastructure",
                            Notes = "Completed technical screen with bar raiser. Final round loop scheduled for Thursday.",
                            IsRemote = false,
                            Source = "Referral"
                        },
                        new Application
                        {
                            UserId = user.Id,
                            CompanyName = "Vercel",
                            RoleTitle = "Senior Frontend Architect",
                            Location = "Remote (US)",
                            SalaryRange = "$210k - $270k",
                            Status = ApplicationStatus.PhoneScreen,
                            DateApplied = DateTime.UtcNow.AddDays(-5),
                            FollowUpDate = DateTime.UtcNow.AddDays(1),
                            ResumeVersion = "v4.1-Frontend",
                            Notes = "Recruiter chat about Next.js performance and design system architecture.",
                            IsRemote = true,
                            Source = "LinkedIn"
                        },
                        new Application
                        {
                            UserId = user.Id,
                            CompanyName = "Datadog",
                            RoleTitle = "Senior Software Engineer",
                            Location = "New York, NY (Remote)",
                            SalaryRange = "$195k - $250k",
                            Status = ApplicationStatus.Offer,
                            DateApplied = DateTime.UtcNow.AddDays(-28),
                            FollowUpDate = DateTime.UtcNow.AddDays(-2),
                            ResumeVersion = "v3.9",
                            Notes = "Offer letter received ($220k base + $80k equity). Negotiating start date.",
                            IsRemote = true,
                            Source = "Company Site"
                        }
                    );
                    await dbContext.SaveChangesAsync();
                }
            }
        }

        var roles = await userManager.GetRolesAsync(user);
        return await GenerateAuthResponse(user, roles, rememberMe: true);
    }

    /// <summary>
    /// Authenticates or registers a user via Google OAuth identity.
    /// </summary>
    [HttpPost("google")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> GoogleLogin([FromBody] GoogleAuthRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { message = "Email is required for Google authentication." });

        var normalizedEmail = NormalizeEmail(request.Email);
        var user = await userManager.FindByEmailAsync(normalizedEmail);

        if (user == null)
        {
            user = new ApplicationUser
            {
                UserName = normalizedEmail,
                Email = normalizedEmail,
                FirstName = string.IsNullOrWhiteSpace(request.FirstName) ? "Google" : request.FirstName.Trim(),
                LastName = string.IsNullOrWhiteSpace(request.LastName) ? "User" : request.LastName.Trim(),
                EmailConfirmed = true
            };

            var createResult = await userManager.CreateAsync(user);
            if (!createResult.Succeeded)
            {
                return BadRequest(new { message = string.Join("; ", createResult.Errors.Select(e => e.Description)) });
            }

            await storyService.SeedExampleStoriesAsync(user.Id);
            await behavioralStoryService.SeedExampleStoriesAsync(user.Id);
        }

        var roles = await userManager.GetRolesAsync(user);
        return await GenerateAuthResponse(user, roles, rememberMe: true);
    }

    /// <summary>
    /// Refreshes expired access tokens using a valid HTTP-only refresh token cookie.
    /// Includes reuse detection, lineage verification, and atomic token rotation.
    /// </summary>
    [HttpPost("refresh")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Refresh()
    {
        var rawToken = Request.Cookies["refreshToken"];
        if (string.IsNullOrWhiteSpace(rawToken))
        {
            return Unauthorized(new { message = "Refresh token is required." });
        }

        var tokenHash = refreshTokenService.HashToken(rawToken);
        var storedToken = await refreshTokenService.FindByTokenHashAsync(tokenHash);

        if (storedToken == null)
        {
            return Unauthorized(new { message = "Invalid refresh token." });
        }

        if (storedToken.IsRevoked)
        {
            // Grace window: Allow concurrent requests / tabs within 10 seconds of rotation
            var withinGrace = storedToken.RevokedAt.HasValue &&
                              (DateTime.UtcNow - storedToken.RevokedAt.Value).TotalSeconds <= 10;

            if (withinGrace && !string.IsNullOrEmpty(storedToken.ReplacedByToken))
            {
                var replacementToken = await refreshTokenService.FindByTokenHashAsync(storedToken.ReplacedByToken);
                if (replacementToken != null && replacementToken.UserId == storedToken.UserId && replacementToken.IsActive)
                {
                    logger.ConcurrentRefreshHandled(storedToken.UserId);
                    return Unauthorized(new { message = "Token just refreshed" });
                }
            }

            logger.TokenReuseDetected(storedToken.UserId);
            await refreshTokenService.RevokeAllForUserAsync(storedToken.UserId);
            ClearRefreshCookie();
            ClearAccessTokenCookie();
            return Unauthorized(new { message = "Token reuse detection. All sessions have been revoked. Please log in again." });
        }

        if (storedToken.IsExpired)
        {
            return Unauthorized(new { message = "Refresh token has expired. Please log in again." });
        }

        var user = await userManager.FindByIdAsync(storedToken.UserId);
        if (user == null)
        {
            return Unauthorized(new { message = "User not found." });
        }

        var roles = await userManager.GetRolesAsync(user);

        var newRawToken = tokenService.GenerateRefreshToken();
        var newTokenHash = refreshTokenService.HashToken(newRawToken);

        try
        {
            await refreshTokenService.RevokeAsync(storedToken, newTokenHash);
            await refreshTokenService.CreateAsync(
                user.Id,
                newRawToken,
                Request.Headers.UserAgent.ToString(),
                storedToken.RememberMe,
                _jwtSettings.RefreshTokenExpiryDays);
        }
        catch (DbUpdateConcurrencyException)
        {
            return Unauthorized(new { message = "Token just refreshed" });
        }

        var accessToken = tokenService.GenerateAccessToken(user, roles);
        var expiresAt = DateTime.UtcNow.AddMinutes(_jwtSettings.AccessTokenExpiryMinutes);

        SetRefreshCookie(newRawToken, storedToken.RememberMe);
        SetAccessTokenCookie(accessToken);

        logger.TokensRotated(user.Email);

        return Ok(new AuthResponse
        {
            AccessToken = accessToken,
            ExpiresAt = expiresAt,
            Email = user.Email ?? string.Empty,
            UserId = user.Id
        });
    }

    /// <summary>
    /// Returns the profile of the currently authenticated user.
    /// </summary>
    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var user = await userManager.FindByIdAsync(userId);
        if (user == null)
            return NotFound();

        var roles = await userManager.GetRolesAsync(user);
        return Ok(new
        {
            UserId = user.Id,
            user.Email,
            user.FirstName,
            user.LastName,
            user.EmailDigestEnabled,
            user.DigestIncludeFollowUps,
            user.DigestIncludeReviews,
            user.DigestHourUtc,
            Roles = roles
        });
    }

    /// <summary>
    /// Revokes the current refresh token (logout).
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

        var tokenHash = refreshTokenService.HashToken(rawToken);
        var storedToken = await refreshTokenService.FindByTokenHashAsync(tokenHash);

        if (storedToken is { IsActive: true })
        {
            await refreshTokenService.RevokeAsync(storedToken);
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            logger.TokenRevoked(userId);
        }

        ClearRefreshCookie();
        ClearAccessTokenCookie();
        return Ok(new { message = "Token revoked successfully." });
    }

    /// <summary>
    /// Retrieves active sessions for the current user.
    /// </summary>
    [HttpGet("sessions")]
    [Authorize]
    public async Task<IActionResult> GetActiveSessions()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var rawToken = Request.Cookies["refreshToken"];
        var sessions = await refreshTokenService.GetActiveSessionsAsync(userId, rawToken);
        return Ok(sessions);
    }

    /// <summary>
    /// Revokes a specific session by its session ID.
    /// </summary>
    [HttpDelete("sessions/{sessionId}")]
    [Authorize]
    public async Task<IActionResult> RevokeSession(string sessionId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var success = await refreshTokenService.RevokeSessionByIdAsync(userId, sessionId);
        if (!success)
            return NotFound(new { message = "Session not found or already revoked." });

        return Ok(new { message = "Session revoked successfully." });
    }

    [HttpPost("forgot-password")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        request.Email = NormalizeEmail(request.Email);

        var user = await userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            return Ok(new { message = "If an account exists, a password reset email has been sent." });
        }

        var token = await userManager.GeneratePasswordResetTokenAsync(user);

        if (environment.IsDevelopment())
        {
            logger.LogWarning("[DEV ONLY] Password reset token for {Email}: {Token}", request.Email, token);
        }

        return Ok(new { message = "If an account exists, a password reset email has been sent." });
    }

    [HttpPost("reset-password")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        request.Email = NormalizeEmail(request.Email);

        var user = await userManager.FindByEmailAsync(request.Email);
        if (user == null)
            return BadRequest(new { message = "Invalid request." });

        var result = await userManager.ResetPasswordAsync(user, request.Token, request.NewPassword);
        if (!result.Succeeded)
        {
            return BadRequest(new { message = string.Join("; ", result.Errors.Select(e => e.Description)) });
        }

        await refreshTokenService.RevokeAllForUserAsync(user.Id);
        return Ok(new { message = "Password reset successfully. Please sign in again." });
    }

    [HttpPost("verify-email")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        request.Email = NormalizeEmail(request.Email);

        var user = await userManager.FindByEmailAsync(request.Email);
        if (user == null)
            return BadRequest(new { message = "Invalid request." });

        var result = await userManager.ConfirmEmailAsync(user, request.Token);
        if (!result.Succeeded)
            return BadRequest(new { message = string.Join("; ", result.Errors.Select(e => e.Description)) });

        return Ok(new { message = "Email verified successfully." });
    }

    private async Task<IActionResult> GenerateAuthResponse(ApplicationUser user, IList<string> roles, bool rememberMe)
    {
        var accessToken = tokenService.GenerateAccessToken(user, roles);
        var rawRefreshToken = tokenService.GenerateRefreshToken();
        var expiresAt = DateTime.UtcNow.AddMinutes(_jwtSettings.AccessTokenExpiryMinutes);

        await refreshTokenService.CreateAsync(
            user.Id,
            rawRefreshToken,
            Request.Headers.UserAgent.ToString(),
            rememberMe,
            _jwtSettings.RefreshTokenExpiryDays);

        SetRefreshCookie(rawRefreshToken, rememberMe);
        SetAccessTokenCookie(accessToken);

        return Ok(new AuthResponse
        {
            AccessToken = accessToken,
            ExpiresAt = expiresAt,
            Email = user.Email ?? string.Empty,
            UserId = user.Id
        });
    }

    private void SetRefreshCookie(string rawToken, bool rememberMe)
    {
        var options = cookieOptionsFactory.CreateCookieOptions(rememberMe);
        if (rememberMe)
        {
            options.Expires = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDays);
        }
        Response.Cookies.Append("refreshToken", rawToken, options);
    }

    private void SetAccessTokenCookie(string accessToken)
    {
        var options = cookieOptionsFactory.CreateAccessTokenCookieOptions();
        Response.Cookies.Append("accessToken", accessToken, options);
    }

    private void ClearRefreshCookie()
    {
        var options = cookieOptionsFactory.CreateCookieOptions(false);
        Response.Cookies.Delete("refreshToken", options);
    }

    private void ClearAccessTokenCookie()
    {
        var options = cookieOptionsFactory.CreateAccessTokenCookieOptions();
        Response.Cookies.Delete("accessToken", options);
    }

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
        user.EmailDigestEnabled = request.EmailDigestEnabled;
        user.DigestIncludeFollowUps = request.DigestIncludeFollowUps;
        user.DigestIncludeReviews = request.DigestIncludeReviews;
        user.DigestHourUtc = request.DigestHourUtc;

        var result = await userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            return BadRequest(new { message = string.Join("; ", result.Errors.Select(e => e.Description)) });
        }

        return Ok(new
        {
            user.Id,
            user.Email,
            user.FirstName,
            user.LastName,
            user.EmailDigestEnabled,
            user.DigestIncludeFollowUps,
            user.DigestIncludeReviews,
            user.DigestHourUtc
        });
    }

    [Authorize]
    [HttpDelete("account")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> DeleteAccount()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var user = await userManager.FindByIdAsync(userId);
        if (user == null)
            return NotFound();

        var result = await userManager.DeleteAsync(user);
        if (!result.Succeeded)
        {
            logger.AccountDeletionFailed(userId);
            return BadRequest(new { message = string.Join("; ", result.Errors.Select(e => e.Description)) });
        }

        ClearRefreshCookie();
        ClearAccessTokenCookie();
        logger.AccountDeleted(userId);

        return Ok(new { message = "Account and all associated data have been permanently deleted." });
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

    [LoggerMessage(Level = LogLevel.Warning, Message = "Account permanently deleted for user {UserId}")]
    public static partial void AccountDeleted(this ILogger logger, string? userId);

    [LoggerMessage(Level = LogLevel.Error, Message = "Account deletion failed for user {UserId}")]
    public static partial void AccountDeletionFailed(this ILogger logger, string? userId);

    [LoggerMessage(Level = LogLevel.Information, Message = "Graceful concurrent refresh handled for user {UserId}")]
    public static partial void ConcurrentRefreshHandled(this ILogger logger, string? userId);
}
