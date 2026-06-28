using System.ComponentModel.DataAnnotations;
using Precept.Api.Models;
using Precept.Api.Validation;

namespace Precept.Api.DTOs;

/// <summary>
/// What the client sends when creating a skill.
/// </summary>
public class CreateSkillRequest
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(50)]
    [SkillCategory]
    public string? Category { get; set; }

    public SkillProficiency ProficiencyLevel { get; set; } = SkillProficiency.Beginner;

    public string? Notes { get; set; }
}

/// <summary>
/// What the client sends when updating a skill.
/// </summary>
public class UpdateSkillRequest
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(50)]
    [SkillCategory]
    public string? Category { get; set; }

    public SkillProficiency ProficiencyLevel { get; set; }

    public string? Notes { get; set; }
}

/// <summary>
/// What we send back to the client for a skill.
/// </summary>
public class SkillResponse
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Category { get; set; }
    public SkillProficiency ProficiencyLevel { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
