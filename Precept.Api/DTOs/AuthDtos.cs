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
    [StringLength(128, MinimumLengt