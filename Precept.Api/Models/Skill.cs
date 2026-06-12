using System.ComponentModel.DataAnnotations;

namespace Precept.Api.Models;

public enum SkillProficiency
{
    Beginner,
    Intermediate,
    Advanced,
    Expert
}

public class Skill
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public string UserId { get; set; } = string.Empty;

    public ApplicationUser? User { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? Category { get; set; }

    public SkillProficiency ProficiencyLevel { get; set; } = SkillProficiency.Beginner;

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
