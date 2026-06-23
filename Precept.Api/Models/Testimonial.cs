using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Precept.Api.Models
{
    public class Testimonial
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public string UserId { get; set; } = string.Empty;
        
        [ForeignKey("UserId")]
        public ApplicationUser? User { get; set; }

        [Required]
        public string Name { get; set; } = string.Empty;

        [Required]
        public string Handle { get; set; } = string.Empty;

        [Required]
        public string Text { get; set; } = string.Empty;

        public string? AvatarSrc { get; set; }

        public bool IsApproved { get; set; } = true; // Auto-approved per user request

        public DateTime DateSubmitted { get; set; } = DateTime.UtcNow;
    }
}
