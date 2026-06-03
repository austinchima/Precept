using System.ComponentModel.DataAnnotations;

namespace Precept.Api.Models
{
    public class JobDescription
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        public string UserId { get; set; } = string.Empty;

        public string RoleTitle { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public List<string> ExtractedKeyWords { get; set; } = new List<string>();

        public List<string> MissingKeyWords { get; set; } = new List<string>();

        public int? YourMatchScore { get; set; }

        public string Url { get; set; } = string.Empty;
        
        public string? SalaryRange { get; set; }

        public string Location { get; set; } = string.Empty;
        
        public bool IsRemote { get; set; }
        
        public string Source { get; set; } = string.Empty;
        
        public DateTime DatePosted { get; set; }

        public ApplicationUser? User { get; set; }

        // I can have many different applications for the same job description
        public ICollection<Application> Applications { get; set; } = new List<Application>();
    }
}