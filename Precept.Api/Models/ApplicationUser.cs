using Microsoft.AspNetCore.Identity;

namespace Precept.Api.Models;

public class ApplicationUser : IdentityUser
{

    // Primary purpose
    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public string FullName => $"{FirstName.Trim()} {LastName.Trim()}";

    public DateTime CreatedAt { get; set; }

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

    public bool EmailDigestEnabled { get; set; } = true;
    public bool DigestIncludeFollowUps { get; set; } = true;
    public bool DigestIncludeReviews { get; set; } = true;
    public int DigestHourUtc { get; set; } = 13;
    public DateTime? LastDigestSentAt { get; set; }
}
