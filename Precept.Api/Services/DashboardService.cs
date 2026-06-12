using Microsoft.EntityFrameworkCore;
using Precept.Api.Data;
using Precept.Api.DTOs;
using Precept.Api.Models;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Services;

/// <summary>
/// Service implementation for calculating and compiling dashboard statistics.
/// </summary>
public class DashboardService(PreceptDbContext dbContext, ILogger<DashboardService> logger) : IDashboardService
{
    public async Task<DashboardStatsResponse> GetDashboardStatsAsync(string userId)
    {
        logger.DashboardStatsRetrieved(userId);

        // ─────────────────────────────────────────────────────────────
        //  1. Story Statistics
        // ─────────────────────────────────────────────────────────────
        var totalStories = await dbContext.Stories
            .CountAsync(s => s.UserId == userId);

        var confidenceGroups = await dbContext.Stories
            .Where(s => s.UserId == userId)
            .GroupBy(s => s.ConfidenceLevel)
            .Select(g => new { Level = g.Key, Count = g.Count() })
            .ToListAsync();

        var categoryGroups = await dbContext.Stories
            .Where(s => s.UserId == userId)
            .GroupBy(s => s.Category)
            .Select(g => new { Category = g.Key, Count = g.Count() })
            .ToListAsync();

        var totalReviewed = await dbContext.Stories
            .CountAsync(s => s.UserId == userId && s.LastReviewedAt != null);

        var needsReview = await dbContext.Stories
            .CountAsync(s => s.UserId == userId &&
                (s.LastReviewedAt == null || s.ConfidenceLevel == ConfidenceLevel.Panic || s.ConfidenceLevel == ConfidenceLevel.Shaky));

        // Compile confidence breakdown dictionary with all enum values initialized to 0
        var confidenceBreakdown = Enum.GetValues<ConfidenceLevel>()
            .ToDictionary(e => e.ToString(), _ => 0);
        foreach (var cfgroup in confidenceGroups)
        {
            confidenceBreakdown[cfgroup.Level.ToString()] = cfgroup.Count;
        }

        // Compile category breakdown dictionary with all enum values initialized to 0
        var categoryBreakdown = Enum.GetValues<Category>()
            .ToDictionary(e => e.ToString(), _ => 0);
        foreach (var ctg in categoryGroups)
        {
            categoryBreakdown[ctg.Category.ToString()] = ctg.Count;
        }

        var storyStats = new StoryStatsDto
        {
            TotalStories = totalStories,
            ConfidenceBreakdown = confidenceBreakdown,
            CategoryBreakdown = categoryBreakdown,
            TotalReviewed = totalReviewed,
            NeedsReview = needsReview
        };

        // ─────────────────────────────────────────────────────────────
        //  2. Application Statistics
        // ─────────────────────────────────────────────────────────────
        var totalApplications = await dbContext.Applications
            .CountAsync(a => a.UserId == userId);

        var statusGroups = await dbContext.Applications
            .Where(a => a.UserId == userId)
            .GroupBy(a => a.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        var interviewingCount = await dbContext.Applications
            .CountAsync(a => a.UserId == userId &&
                (a.Status == ApplicationStatus.Interviewing || a.Status == ApplicationStatus.PhoneScreen));

        var offersCount = await dbContext.Applications
            .CountAsync(a => a.UserId == userId && a.Status == ApplicationStatus.Offer);

        var rejectedCount = await dbContext.Applications
            .CountAsync(a => a.UserId == userId && a.Status == ApplicationStatus.Rejected);

        var responseCount = await dbContext.Applications
            .CountAsync(a => a.UserId == userId &&
                (a.Status == ApplicationStatus.PhoneScreen || a.Status == ApplicationStatus.Interviewing || a.Status == ApplicationStatus.Offer));

        // Compile status breakdown dictionary with all enum values initialized to 0
        var statusBreakdown = Enum.GetValues<ApplicationStatus>()
            .ToDictionary(e => e.ToString(), _ => 0);
        foreach (var sg in statusGroups)
        {
            statusBreakdown[sg.Status.ToString()] = sg.Count;
        }

        // Calculate rejection rate and round it to 2 d.p.
        // Else, return 0.0
        double rejectionRate = totalApplications > 0
            ? Math.Round((double)rejectedCount / totalApplications * 100, 2)
            : 0.0;

        // Calculate response rate and round it to 2 d.p.
        // Else, return 0.0
        double responseRate = totalApplications > 0
            ? Math.Round((double)responseCount / totalApplications * 100, 2)
            : 0.0;

        // Compile application statistics
        var applicationStats = new ApplicationStatsDto
        {
            TotalApplications = totalApplications,
            StatusBreakdown = statusBreakdown,
            InterviewingCount = interviewingCount,
            OffersCount = offersCount,
            RejectionRate = rejectionRate,
            ResponseRate = responseRate
        };

        // ─────────────────────────────────────────────────────────────
        //  3. Job Description Statistics
        // ─────────────────────────────────────────────────────────────
        var totalJobDescriptions = await dbContext.JobDescriptions
            .CountAsync(j => j.UserId == userId);

        var matchScoresQuery = dbContext.JobDescriptions
            .Where(j => j.UserId == userId && j.YourMatchScore != null);

        double averageMatchScore = await matchScoresQuery.AnyAsync()
            ? Math.Round(await matchScoresQuery.AverageAsync(j => j.YourMatchScore!.Value), 2)
            : 0.0;

        // Compile job description statistics
        var jobDescriptionStats = new JobDescriptionStatsDto
        {
            TotalJobDescriptions = totalJobDescriptions,
            AverageMatchScore = averageMatchScore
        };

        return new DashboardStatsResponse
        {
            StoryStats = storyStats,
            ApplicationStats = applicationStats,
            JobDescriptionStats = jobDescriptionStats
        };
    }
}

/// <summary>
/// Source-generated extension methods for high-performance logging in DashboardService.
/// </summary>
public static partial class DashboardLoggerExtensions
{
    [LoggerMessage(EventId = 201, Level = LogLevel.Information, Message = "Dashboard statistics requested and compiled for user (ID: {userId})")]
    public static partial void DashboardStatsRetrieved(this ILogger logger, string userId);
}
