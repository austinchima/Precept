using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Precept.Api.Data;
using Precept.Api.DTOs;
using Precept.Api.Models;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    IWebHostEnvironment environment,
    IStoryService storyService,
    IBehavioralStoryService behavioralStoryService,
    PreceptDbContext dbContext,
    ILogger<AuthController> logger) : ControllerBase
{
    private static string NormalizeEmail(string email) =>
        new(email.Where(c => !char.IsWhiteSpace(c)).ToArray());

    /// <summary>
    /// Creates a new user account and signs the user in with a session cookie.
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

        await signInManager.SignInAsync(user, isPersistent: true);

        return Ok(new
        {
            Email = user.Email ?? string.Empty,
            UserId = user.Id,
            user.FirstName,
            user.LastName
        });
    }

    /// <summary>
    /// Authenticates a user and establishes a session cookie.
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

        // PasswordSignInAsync enforces the Identity lockout policy
        // (5 failed attempts → 15-minute lockout).
        var result = await signInManager.PasswordSignInAsync(
            user.UserName!, request.Password, request.RememberMe, lockoutOnFailure: true);

        if (result.IsLockedOut)
        {
            return Unauthorized(new { message = "Account locked due to too many failed attempts. Please try again later." });
        }

        if (!result.Succeeded)
        {
            return Unauthorized(new { message = "Invalid credentials." });
        }

        logger.UserLoggedIn(request.Email);

        return Ok(new
        {
            Email = user.Email ?? string.Empty,
            UserId = user.Id,
            user.FirstName,
            user.LastName
        });
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

        // SignInAsync establishes the session cookie without checking a password —
        // the demo account is intentionally shared and pre-seeded.
        await signInManager.SignInAsync(user, isPersistent: true);

        return Ok(new
        {
            Email = user.Email ?? string.Empty,
            UserId = user.Id,
            user.FirstName,
            user.LastName
        });
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

        await signInManager.SignInAsync(user, isPersistent: true);

        return Ok(new
        {
            Email = user.Email ?? string.Empty,
            UserId = user.Id,
            user.FirstName,
            user.LastName
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
    /// Signs the user out (logout). Clears the session cookie.
    /// </summary>
    [Authorize]
    [HttpPost("revoke")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Revoke()
    {
        await signInManager.SignOutAsync();
        return Ok(new { message = "Signed out successfully." });
    }

    /// <summary>
    /// Invalidates all other sessions for the current user by rotating the
    /// security stamp (existing cookies are rejected by SecurityStampValidator).
    /// </summary>
    [Authorize]
    [HttpPost("sign-out-everywhere")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> SignOutEverywhere()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var user = await userManager.FindByIdAsync(userId);
        if (user == null)
            return NotFound();

        await userManager.UpdateSecurityStampAsync(user);
        // Re-issue the current session's cookie so this device stays signed in
        // while every other session is invalidated.
        await signInManager.RefreshSignInAsync(user);

        return Ok(new { message = "All other sessions have been signed out." });
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

        // Invalidate all existing sessions after a password change.
        await userManager.UpdateSecurityStampAsync(user);
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

        await signInManager.SignOutAsync();
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

    [LoggerMessage(Level = LogLevel.Warning, Message = "Account permanently deleted for user {UserId}")]
    public static partial void AccountDeleted(this ILogger logger, string? userId);

    [LoggerMessage(Level = LogLevel.Error, Message = "Account deletion failed for user {UserId}")]
    public static partial void AccountDeletionFailed(this ILogger logger, string? userId);
}
