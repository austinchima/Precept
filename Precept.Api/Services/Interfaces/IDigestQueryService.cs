using Precept.Api.Models;

namespace Precept.Api.Services.Interfaces;

public record FollowUpItem(string CompanyName, string RoleTitle, int DaysOverdue);

public record DigestContent(
    IReadOnlyList<FollowUpItem> FollowUpsDue,
    int TechnicalReviewsDue,
    int BehavioralReviewsDue,
    ConfidenceLevel? WeakestCategoryLevel,
    string? WeakestCategoryName
);

public interface IDigestQueryService
{
    Task<DigestContent?> GetDigestAsync(string userId, DateTime utcNow);
}
