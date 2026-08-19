using System.ComponentModel.DataAnnotations;

namespace Precept.Api.Models
{
    public class BehavioralStory
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        public string UserId { get; set; } = string.Empty;

        public ApplicationUser? User { get; set; }

        public ConfidenceLevel ConfidenceLevel { get; set; } = ConfidenceLevel.Okay;
        public DateTime? LastReviewedAt { get; set; }
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

        [MaxLength(100, ErrorMessage = "Title must be less than 100 characters")]
        [Required]
        public required string Title { get; set; } = string.Empty;

        [Required]
        public required string Situation { get; set; } = string.Empty;

        [Required]
        public required string Task { get; set; } = string.Empty;

        [Required]
        public required string Action { get; set; } = string.Empty;

        [Required]
        public required string Result { get; set; } = string.Empty;

        public string Tags { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
