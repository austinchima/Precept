using Precept.Api.DTOs;
using Precept.Api.Models;

namespace Precept.Api.Services.Interfaces;

/// <summary>
/// Interface defining business operations for managing job applications.
/// </summary>
public interface IApplicationService
{
    Task<ApplicationResponse> CreateApplicationAsync(string userId, CreateApplicationRequest request);

    /// <summary>
    /// Fetches a job posting URL, extracts structured fields, creates a
    /// JobDescription, and seeds a draft Application for the user.
    /// </summary>
    Task<ApplicationResponse> CaptureApplicationAsync(string userId, CaptureApplicationRequest request);

    Task<PagedResponse<ApplicationResponse>> GetAllApplicationsAsync(string userId, ApplicationStatus? status = null, PaginationQuery? pagination = null);

    Task<PagedResponse<ApplicationResponse>> GetTrashApplicationsAsync(string userId, PaginationQuery? pagination = null);

    Task<ApplicationResponse?> GetApplicationAsync(string userId, string id);

    Task<ApplicationResponse?> UpdateApplicationAsync(string userId, string id, UpdateApplicationRequest request);

    Task<ApplicationResponse?> UpdateApplicationStatusAsync(string userId, string id, ApplicationStatus status);

    Task<bool> DeleteApplicationAsync(string userId, string id);

    Task<bool> RestoreApplicationAsync(string userId, string id);
}
