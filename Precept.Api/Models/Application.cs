using System.ComponentModel.DataAnnotations;

namespace Precept.Api.Models
{
    public class Application
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        public string UserId { get; set; } = string.Empty;

        public ApplicationUser? User { get; set; }
        
        public string CompanyName { get; set; } = string.Empty;
        
        public string RoleTitle { get; set; } = string.Empty;
        
        public string Location { get; set; } = string.Empty;
        
        public string? SalaryRange { get; set; }
        
        public ApplicationStatus Status { get; set; }
        
        public DateTime? DateApplied { get; set; }
        
        public DateTime? DateLastContact { get; set; }
        
        public DateTime FollowUpDate { get; set; } = DateTime.UtcNow.AddDays(7);
        
        public string ResumeVersion { get; set; } = string.Empty;
        
        public string Notes { get; set; } = string.Empty;
        
        public bool IsRemote { get; set; }
        
        public string Source { get; set; } = string.Empty;
        
        public Guid? JobDescriptionId { get; set; }

        public JobDescription? JobDescription { get; set; }
    }

    public enum ApplicationStatus
    {
        Applied,
        PhoneScreen,
        Interviewing,
        Offer,
        Rejected,
        Ghosted
    }
}