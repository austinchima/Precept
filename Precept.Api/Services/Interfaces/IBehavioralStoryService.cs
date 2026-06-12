using Precept.Api.DTOs;

namespace Precept.Api.Services.Interfaces
{
    public interface IBehavioralStoryService
    {
        Task<List<BehavioralStoryResponse>> GetStoriesAsync(string userId);
        Task<BehavioralStoryResponse> GetStoryAsync(string userId, string storyId);
        Task<BehavioralStoryResponse> CreateStoryAsync(string userId, CreateBehavioralStoryRequest request);
        Task<BehavioralStoryResponse> UpdateStoryAsync(string userId, string storyId, UpdateBehavioralStoryRequest request);
        Task<bool> DeleteStoryAsync(string userId, string storyId);
    }
}
