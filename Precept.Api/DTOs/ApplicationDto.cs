using System.ComponentModel.DataAnnotations;
using Precept.Api.Models;

namespace Precept.Api.DTOs;

/// <summary>
/// DTO representing the request payload to create a new job application.
/// </summary>
public class CreateApplicationRequest
{
    [Required]
    public string CompanyName { get; set; } = string.Empty;

    [Required]
    public string RoleTitle { get; set; } = string.Empty;

    public string Location { get; set; } = string.Empty;

    public string? SalaryRange { get; set; }

    public ApplicationStatus Status { get; set; } = ApplicationStatus.Applied;

    public DateTime? DateApplied { get; set; }

    public DateTime? DateLastContact { get; set; }

    public DateTime FollowUpDate { get; set; } = DateTime.UtcNow.AddDays(7);

    public string ResumeVersion { get; set; } = string.Empty;

    public string Notes { get; set; } = string.Empty;

    public bool IsRemote { get; set; }

    public string Source { get; set; } = string.Empty;

    public Guid? JobDescriptionId { get; set; }
}

/// <summary>
/// DTO representing the request payload to update an existing job application.
/// </summary>
public class UpdateApplicationRequest
{
    [Required]
    public string CompanyName { get; set; } = string.Empty;

    [Required]
    public string RoleTitle { get; set; } = string.Empty;

    public string Location { get; set; } = string.Empty;

    public string? SalaryRange { get; set; }

    public ApplicationStatus Status { get; set; }

    public DateTime? DateApplied { get; set; }

    public DateTime? DateLastContact { get; set; }

    public DateTime FollowUpDate { get; set; }

    public string ResumeVersion { get; set; } = string.Empty;

    public string Notes { get; set; } = string.Empty;

    public bool IsRemote { get; set; }

    public string Source { get; set; } = string.Empty;

    public Guid? JobDescriptionId { get; set; }
}

/// <summary>
/// DTO representing the request payload to update only the status of a job application.
/// </summary>
public class UpdateApplicationStatusRequest
{
    [Required]
    public ApplicationStatus Status { get; set; }
}

/// <summary>
/// DTO representing the response returned to the client containing application information.
/// </summary>
public class ApplicationResponse
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public string RoleTitle { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string? SalaryRange { get; set; }
    public ApplicationStatus Status { get; set; }
    public DateTime? DateApplied { get; set; }
    public DateTime? DateLastContact { get; set; }
    public DateTime FollowUpDate { get; set; }
    public string ResumeVersion { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public bool IsRemote { get; set; }
    public string Source { get; set; } = string.Empty;
    public string? JobDescriptionId { get; set; }
}
