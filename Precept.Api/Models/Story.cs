using System.ComponentModel.DataAnnotations;

namespace Precept.Api.Models;

public class Story
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public string UserId { get; set; } = string.Empty;

    public ApplicationUser? User { get; set; }

    [MaxLength(100, ErrorMessage = "Title must be less than 100 characters")]
    [Required]
    public string Title { get; set; } = string.Empty;

    public string CodeSnippet { get; set; } = string.Empty;

    [MinLength(50, ErrorMessage = "Explanation must be at least 50 characters")]
    [Required]
    public string Explanation { get; set; } = string.Empty;

    public string SourceProject { get; set; } = string.Empty;

    public Category Category { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? LastReviewedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public ConfidenceLevel ConfidenceLevel { get; set; } = ConfidenceLevel.Okay;

    public DateTime? NextReviewAt { get; set; }

    public bool IsDeleted { get; set; } = false;

    public DateTime? DeletedAt { get; set; }
}