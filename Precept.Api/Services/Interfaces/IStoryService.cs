using Precept.Api.DTOs;
using Precept.Api.Models;

namespace Precept.Api.Services.Interfaces;

public interface IStoryService
{
    // Beautiful and clean!
    Task<StoryResponse> CreateStoryAsync(string userId, CreateStoryRequest request);

    Task<bool> DeleteStoryAsync(string userId, string storyId);

    Task<StoryResponse> UpdateStoryAsync(string userId, string storyId, UpdateStoryRequest request);

    Task<StoryResponse> UpdateStoryConfidenceLevelAsync(string userId, string storyId, ConfidenceLevel confidenceLevel);

    Task<StoryResponse> GetStoryAsync(string userId, string storyId);

    Task<StoryResponse> GetRandomStoryAsync(string userId, Category? category = null);

    Task<StoryResponse> GetQuizStoryAsync(string userId);

    Task<List<StoryResponse>> GetStoriesAsync(string userId, Category? category = null);

}
