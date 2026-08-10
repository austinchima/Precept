using Microsoft.EntityFrameworkCore;
using Precept.Api.Data;
using Precept.Api.Models;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Services;

public class DigestQueryService : IDigestQueryService
{
    private readonly PreceptDbContext _dbContext;

    public DigestQueryService(PreceptDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<DigestContent?> GetDigestAsync(string userId, DateTime utcNow)
    {
        var user = await _dbContext.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null || !user.EmailDigestEnabled)
        {
            return null;
        }

        var today = utcNow.Date;
        var followUps = new List<FollowUpItem>();
        if (user.DigestIncludeFollowUps)
        {
            var apps = await _dbContext.Applications.IgnoreQueryFilters()
                .Where(a => a.UserId == userId
                            && !a.IsDeleted
                            && a.Status != ApplicationStatus.Offer
                            && a.Status != ApplicationStatus.Rejected
                            && a.Status != ApplicationStatus.Ghosted
                            && a.FollowUpDate.Date <= today)
                .ToListAsync();

            followUps = apps.Select(a => new FollowUpItem(
                a.CompanyName,
                a.RoleTitle,
                (today - a.FollowUpDate.Date).Days)).ToList();
        }

        int techDue = 0;
        int behDue = 0;
        ConfidenceLevel? weakestLevel = null;
        string? weakestName = null;

        if (user.DigestIncludeReviews)
        {
            techDue = await _dbContext.Stories.IgnoreQueryFilters()
                .CountAsync(s => s.UserId == userId && !s.IsDeleted && (s.NextReviewAt == null || s.NextReviewAt <= utcNow));

            behDue = await _dbContext.BehavioralStories.IgnoreQueryFilters()
                .CountAsync(s => s.UserId == userId && (s.NextReviewAt == null || s.NextReviewAt <= utcNow));

            var stats = await _dbContext.Stories.IgnoreQueryFilters()
                .Where(s => s.UserId == userId && !s.IsDeleted)
                .GroupBy(s => s.Category)
                .Select(g => new
                {
                    Category = g.Key.ToString(),
                    AvgConfidence = g.Average(x => (int)x.ConfidenceLevel)
                })
                .OrderBy(x => x.AvgConfidence)
                .FirstOrDefaultAsync();

            if (stats != null)
            {
                weakestName = stats.Category;
                weakestLevel = (ConfidenceLevel)Math.Round(stats.AvgConfidence);
            }
        }

        if (followUps.Count == 0 && techDue == 0 && behDue == 0)
        {
            return null;
        }

        return new DigestContent(
            followUps,
            techDue,
            behDue,
            weakestLevel,
            weakestName
        );
    }
}
