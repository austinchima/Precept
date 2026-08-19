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
    public required string Title { get; set; } = string.Empty;

    public string CodeSnippet { get; set; } = string.Empty;

    [MinLength(50, ErrorMessage = "Explanation must be at least 50 characters")]
    [Required]
    public required string Explanation { get; set; } = string.Empty;

    public string SourceProject { get; set; } = string.Empty;

    public Category Category { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? LastReviewedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public ConfidenceLevel ConfidenceLevel { get; set; } = ConfidenceLevel.Okay;

    public DateTime? NextReviewAt { get; set; }

    /// <summary>
    /// SM-2 Repetition count (number of consecutive successful recalls).
    /// </summary>
    public int Repetitions { get; set; } = 0;

    /// <summary>
    /// SM-2 Ease Factor (default 2.5, minimum 1.3).
    /// </summary>
    public double EaseFactor { get; set; } = 2.5;

    /// <summary>
    /// SM-2 Interval in days until next scheduled review.
    /// </summary>
    public double IntervalDays { get; set; } = 1.0;

    public bool IsDeleted { get; set; } = false;

    public DateTime? DeletedAt { get; set; }
}