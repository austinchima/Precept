using Precept.Api.Models;

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

    /// <summary>Technical and STAR stories whose next review is unset or due now.</summary>
    public int NeedsReview { get; set; }

    public int TotalBehavioralStories { get; set; }
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

    /// <summary>Applications in Applied, PhoneScreen or Interviewing.</summary>
    public int ActiveApplications { get; set; }
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

/// <summary>
/// Stories due for review across both kinds, weakest confidence first.
/// <see cref="Total"/> counts every due story; <see cref="Items"/> holds at most the requested limit.
/// </summary>
public class ReviewQueueResponse
{
    public int Total { get; set; }
    public List<ReviewQueueItem> Items { get; set; } = [];
}

public class ReviewQueueItem
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;

    /// <summary>"Technical" or "Behavioral".</summary>
    public string Kind { get; set; } = string.Empty;
    public ConfidenceLevel ConfidenceLevel { get; set; }
    public DateTime? NextReviewAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
