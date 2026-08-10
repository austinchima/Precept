using Precept.Api.DTOs;
using Precept.Api.Models;

namespace Precept.Api.Services.Interfaces;

public interface IStoryService
{
    Task<StoryResponse> CreateStoryAsync(string userId, CreateStoryRequest request);

    Task<bool> DeleteStoryAsync(string userId, string storyId);

    Task<bool> RestoreStoryAsync(string userId, string storyId);

    Task<StoryResponse?> UpdateStoryAsync(string userId, string storyId, UpdateStoryRequest request);

    Task<StoryResponse?> UpdateStoryConfidenceLevelAsync(string userId, string storyId, ConfidenceLevel confidenceLevel);

    Task<StoryResponse?> GetStoryAsync(string userId, string storyId);

    Task<StoryResponse?> GetRandomStoryAsync(string userId, Category? category = null);

    Task<QuizStoryResponse<StoryResponse>> GetQuizStoryAsync(string userId, Category? category = null);

    Task<StoryResponse?> ReviewStoryAsync(string userId, string storyId, ReviewRating rating);

    Task<StoryReviewSummaryResponse> GetQuizSummaryAsync(string userId);

    Task<PagedResponse<StoryResponse>> GetStoriesAsync(string userId, Category? category = null, PaginationQuery? pagination = null);

    Task<PagedResponse<StoryResponse>> GetTrashStoriesAsync(string userId, PaginationQuery? pagination = null);

    Task SeedExampleStoriesAsync(string userId);
}
