using Microsoft.AspNetCore.Identity;

namespace Precept.Api.Models;

public class ApplicationUser : IdentityUser
{
    // When I created my account
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // I can generate many stories from job descriptions
    public ICollection<Story> Stories { get; set; } = new List<Story>();
    
    // I can ingest and store many job descriptions
    public ICollection<JobDescription> JobDescriptions { get; set; } = new List<JobDescription>();

    // I can submit many applications
    public ICollection<Application> Applications { get; set; } = new List<Application>();
}
