using System.ComponentModel.DataAnnotations;

namespace Precept.Api.DTOs;

public static class AuthValidationConstants
{
    /// <summary>
    /// Requires a local part, an @, a domain with at least one dot, and a TLD
    /// of at least two characters. Whitespace is not matched, so it is rejected.
    /// </summary>
    public const string StrictEmailPattern = @"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$";

    public const string StrictEmailErrorMessage = "Email must be a valid address with a domain and TLD (e.g. user@example.com).";
}

/// <summary>
/// Request body for POST /api/auth/register.
/// </summary>
public class RegisterRequest
{
    [Required]
    [StringLength(50, MinimumLength = 1)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [StringLength(50, MinimumLength = 1)]
    public string LastName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [RegularExpression(AuthValidationConstants.StrictEmailPattern, ErrorMessage = AuthValidationConstants.StrictEmailErrorMessage)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [StringLength(128, MinimumLength = 8, ErrorMessage = "Password must be at least 8 characters.")]
    public string Password { get; set; } = string.Empty;

    [Required]
    [Compare(nameof(Password), ErrorMessage = "Passwords do not match.")]
    public string ConfirmPassword { get; set; } = string.Empty;
}

public class UpdateProfileRequest
{
    [Required]
    [StringLength(50, MinimumLength = 1)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [StringLength(50, MinimumLength = 1)]
    public string LastName { get; set; } = string.Empty;

    public bool EmailDigestEnabled { get; set; } = true;
    public bool DigestIncludeFollowUps { get; set; } = true;
    public bool DigestIncludeReviews { get; set; } = true;
    public int DigestHourUtc { get; set; } = 13;
}

/// <summary>
/// Request body for POST /api/auth/login.
/// </summary>
public class LoginRequest
{
    [Required]
    [EmailAddress]
    [RegularExpression(AuthValidationConstants.StrictEmailPattern, ErrorMessage = AuthValidationConstants.StrictEmailErrorMessage)]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;

    public bool RememberMe { get; set; } = true;
}

/// <summary>
/// Response body for login, register, and refresh endpoints.
/// The refresh token is delivered via an HTTP-only secure cookie, not in this response.
/// </summary>
public class AuthResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public string Email { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
}

/// <summary>
/// Request body for POST /api/auth/forgot-password.
/// </summary>
public class ForgotPasswordRequest
{
    [Required]
    [EmailAddress]
    [RegularExpression(AuthValidationConstants.StrictEmailPattern, ErrorMessage = AuthValidationConstants.StrictEmailErrorMessage)]
    public string Email { get; set; } = string.Empty;
}

/// <summary>
/// Request body for POST /api/auth/reset-password.
/// </summary>
public class ResetPasswordRequest
{
    [Required]
    [EmailAddress]
    [RegularExpression(AuthValidationConstants.StrictEmailPattern, ErrorMessage = AuthValidationConstants.StrictEmailErrorMessage)]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Token { get; set; } = string.Empty;

    [Required]
    [StringLength(128, MinimumLength = 8, ErrorMessage = "Password must be at least 8 characters.")]
    public string NewPassword { get; set; } = string.Empty;
}

/// <summary>
/// Request body for POST /api/auth/verify-email.
/// </summary>
public class VerifyEmailRequest
{
    [Required]
    [EmailAddress]
    [RegularExpression(AuthValidationConstants.StrictEmailPattern, ErrorMessage = AuthValidationConstants.StrictEmailErrorMessage)]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Token { get; set; } = string.Empty;
}
