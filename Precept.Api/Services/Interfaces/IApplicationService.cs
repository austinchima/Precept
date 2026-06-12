using Precept.Api.DTOs;
using Precept.Api.Models;

namespace Precept.Api.Services.Interfaces;

/// <summary>
/// Interface defining business operations for managing job applications.
/// </summary>
public interface IApplicationService
{
    Task<ApplicationResponse> CreateApplicationAsync(string userId, CreateApplicationRequest request);

    Task<List<ApplicationResponse>> GetAllApplicationsAsync(string userId, ApplicationStatus? status = null);

    Task<ApplicationResponse> GetApplicationAsync(string userId, string id);

    Task<ApplicationResponse> UpdateApplicationAsync(string userId, string id, UpdateApplicationRequest request);

    Task<ApplicationResponse> UpdateApplicationStatusAsync(string userId, string id, ApplicationStatus status);

    Task<bool> DeleteApplicationAsync(string userId, string id);
}
