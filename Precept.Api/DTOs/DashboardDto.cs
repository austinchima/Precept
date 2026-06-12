namespace Precept.Api.DTOs;

/// <summary>
/// Response containing complete dashboard statistics.
/// </summary>
public class DashboardStatsResponse
{
    public StoryStatsDto StoryStats { get; set; } = new();
    public ApplicationStatsDto ApplicationStats { get; set; } = new();
    public JobDescriptionStatsDto JobDescriptionStats { get; set; } = new();
}

/// <summary>
/// DTO representing metrics related to user's stories.
/// </summary>
public class StoryStatsDto
{
    public int TotalStories { get; set; }
    public Dictionary<string, int> ConfidenceBreakdown { get; set; } = [];
    public Dictionary<string, int> CategoryBreakdown { get; set; } = [];
    public int TotalReviewed { get; set; }
    public int NeedsReview { get; set; }
}

/// <summary>
/// DTO representing metrics related to user's job applications.
/// </summary>
public class ApplicationStatsDto
{
    public int TotalApplications { get; set; }
    public Dictionary<string, int> StatusBreakdown { get; set; } = [];
    public int InterviewingCount { get; set; }
    public int OffersCount { get; set; }
    public double RejectionRate { get; set; }
    public double ResponseRate { get; set; }
}

/// <summary>
/// DTO representing metrics related to user's job descriptions.
/// </summary>
public class JobDescriptionStatsDto
{
    public int TotalJobDescriptions { get; set; }
    public double AverageMatchScore { get; set; }
}
