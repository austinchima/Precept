using Microsoft.AspNetCore.Identity;

namespace Precept.Api.Models;

public class ApplicationUser : IdentityUser
{

    // Primary purpose
    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public string FullName => $"{FirstName.Trim()} {LastName.Trim()}";

    // When I created my account
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // I can generate many stories from job descriptions
    public ICollection<Story> Stories { get; set; } = [];

    // I can generate many behavioral stories
    public ICollection<BehavioralStory> BehavioralStories { get; set; } = [];
    
    // I can ingest and store many job descriptions
    public ICollection<JobDescription> JobDescriptions { get; set; } = [];

    // I can submit many applications
    public ICollection<Application> Applications { get; set; } = [];

    // I can manage my skills inventory
    public ICollection<Skill> Skills { get; set; } = [];
}
