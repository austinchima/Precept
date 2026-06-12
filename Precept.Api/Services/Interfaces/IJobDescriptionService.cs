using Precept.Api.DTOs;

namespace Precept.Api.Services.Interfaces;

/// <summary>
/// Interface defining operations for managing job descriptions.
/// </summary>
public interface IJobDescriptionService
{
    Task<JobDescriptionResponse> CreateJobDescriptionAsync(string userId, CreateJobDescriptionRequest request);

    Task<List<JobDescriptionResponse>> GetJobDescriptionsAsync(string userId);

    Task<JobDescriptionResponse> GetJobDescriptionAsync(string userId, string id);

    Task<JobDescriptionResponse> UpdateJobDescriptionAsync(string userId, string id, UpdateJobDescriptionRequest request);

    Task<bool> DeleteJobDescriptionAsync(string userId, string id);
}
