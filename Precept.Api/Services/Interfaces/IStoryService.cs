using Precept.Api.DTOs;

namespace Precept.Api.Services.Interfaces;

public interface IStoryService
{
    // Beautiful and clean!
    Task<StoryResponse> CreateStoryAsync(string userId, CreateStoryRequest request);

    Task<bool> DeleteStoryAsync(string userId, string storyId);

    // Note: You'll probably want an UpdateStoryRequest later!
    Task<StoryResponse> UpdateStoryAsync(string userId, string storyId, string content);

    Task<StoryResponse> GetStoryAsync(string userId, string storyId);

    Task<List<StoryResponse>> GetStoriesAsync(string userId);

    Task<StoryResponse> GetRandomStoryAsync(string userId);
}
