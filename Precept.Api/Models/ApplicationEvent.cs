using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Precept.Api.Models
{
    public class ApplicationEvent
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid ApplicationId { get; set; }

        [JsonIgnore]
        public Application? Application { get; set; }

        [Required]
        public ApplicationStatus Status { get; set; }

        [Required]
        public DateTime DateOccurred { get; set; } = DateTime.UtcNow;

        public string Notes { get; set; } = string.Empty;
    }
}
