using Precept.Api.DTOs;

namespace Precept.Api.Services.Interfaces
{
    public interface IBehavioralStoryService
    {
        Task<PagedResponse<BehavioralStoryResponse>> GetStoriesAsync(string userId, PaginationQuery? pagination = null);
        Task<BehavioralStoryResponse?> GetStoryAsync(string userId, string storyId);
        Task<QuizStoryResponse<BehavioralStoryResponse>> GetQuizStoryAsync(string userId);
        Task<StoryReviewSummaryResponse> GetQuizSummaryAsync(string userId);
        Task<BehavioralStoryResponse?> ReviewStoryAsync(string userId, string storyId, ReviewRating rating);
        Task<BehavioralStoryResponse> CreateStoryAsync(string userId, CreateBehavioralStoryRequest request);
        Task<BehavioralStoryResponse?> UpdateStoryAsync(string userId, string storyId, UpdateBehavioralStoryRequest request);
        Task<bool> DeleteStoryAsync(string userId, string storyId);
        Task SeedExampleStoriesAsync(string userId);
    }
}
