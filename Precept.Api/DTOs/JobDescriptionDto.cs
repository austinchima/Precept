using System.ComponentModel.DataAnnotations;

namespace Precept.Api.DTOs;

/// <summary>
/// What the client sends when creating a job description.
/// Keywords are extracted automatically from the description text;
/// sending <see cref="ExtractedKeyWords"/> overrides extraction.
/// </summary>
public class CreateJobDescriptionRequest
{
    [Required]
    public string CompanyName { get; set; } = string.Empty;

    [Required]
    public string RoleTitle { get; set; } = string.Empty;

    [Required]
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Optional override for extracted keywords. When omitted, keywords are
    /// extracted server-side from <see cref="Description"/>.
    /// </summary>
    public List<string>? ExtractedKeyWords { get; set; }

    public string Url { get; set; } = string.Empty;

    public string? SalaryRange { get; set; }

    public string Location { get; set; } = string.Empty;

    public bool IsRemote { get; set; }

    public string Source { get; set; } = string.Empty;

    public DateTime DatePosted { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// What the client sends when updating a job description.
/// Keywords are re-extracted automatically from the description text;
/// sending <see cref="ExtractedKeyWords"/> overrides extraction.
/// </summary>
public class UpdateJobDescriptionRequest
{
    [Required]
    public string CompanyName { get; set; } = string.Empty;

    [Required]
    public string RoleTitle { get; set; } = string.Empty;

    [Required]
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Optional override for extracted keywords. When omitted, keywords are
    /// extracted server-side from <see cref="Description"/>.
    /// </summary>
    public List<string>? ExtractedKeyWords { get; set; }

    public string Url { get; set; } = string.Empty;

    public string? SalaryRange { get; set; }

    public string Location { get; set; } = string.Empty;

    public bool IsRemote { get; set; }

    public string Source { get; set; } = string.Empty;

    public DateTime DatePosted { get; set; }
}

/// <summary>
/// What we send back to the client for a job description,
/// including the computed match score and missing keywords.
/// </summary>
public class JobDescriptionResponse
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public string RoleTitle { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<string> ExtractedKeyWords { get; set; } = [];
    public List<string> MissingKeyWords { get; set; } = [];
    public int? YourMatchScore { get; set; }
    public string Url { get; set; } = string.Empty;
    public string? SalaryRange { get; set; }
    public string Location { get; set; } = string.Empty;
    public bool IsRemote { get; set; }
    public string Source { get; set; } = string.Empty;
    public DateTime DatePosted { get; set; }
}
