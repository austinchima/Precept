using System.ComponentModel.DataAnnotations;

namespace Precept.Api.Models
{
    public enum ConfidenceLevel
        {
            Panic,
            Shaky,
            Okay,
            Solid,
            CanTeach
        }
    public enum Category
    {
        Auth,
        Database,
        Ai,
        Ml,
        DevOps,
        Frontend
    }

    public class Story
    {
        // Convention would make this a key automatically, but explicit is fine
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

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? LastReviewedAt { get; set; }

        public ConfidenceLevel ConfidenceLevel { get; set; } = ConfidenceLevel.Okay;
    }
}