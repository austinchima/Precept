using Precept.Api.DTOs;

namespace Precept.Api.Services.Interfaces;

/// <summary>
/// Interface defining operations for managing a user's skills inventory.
/// </summary>
public interface ISkillService
{
    Task<SkillResponse> CreateSkillAsync(string userId, CreateSkillRequest request);

    Task<List<SkillResponse>> GetSkillsAsync(string userId);

    Task<SkillResponse> GetSkillAsync(string userId, string id);

    Task<SkillResponse> UpdateSkillAsync(string userId, string id, UpdateSkillRequest request);

    Task<bool> DeleteSkillAsync(string userId, string id);
}
