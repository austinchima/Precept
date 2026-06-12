using System.ComponentModel.DataAnnotations;

namespace Precept.Api.Models
{
    public class BehavioralStory
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        public string UserId { get; set; } = string.Empty;

        public ApplicationUser? User { get; set; }

        [MaxLength(100, ErrorMessage = "Title must be less than 100 characters")]
        [Required]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Situation { get; set; } = string.Empty;

        [Required]
        public string Task { get; set; } = string.Empty;

        [Required]
        public string Action { get; set; } = string.Empty;

        [Required]
        public string Result { get; set; } = string.Empty;

        public string Tags { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
