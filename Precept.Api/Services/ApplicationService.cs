using Microsoft.EntityFrameworkCore;
using Precept.Api.Data;
using Precept.Api.DTOs;
using Precept.Api.Models;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Services;

/// <summary>
/// Service implementation for managing job applications.
/// Handles creation, retrieval, updating, status changes, and deletion of applications.
/// </summary>
public class ApplicationService(PreceptDbContext dbContext, ILogger<ApplicationService> logger) : IApplicationService
{
    private static ApplicationResponse MapToResponse(Application app)
    {
        return new ApplicationResponse
        {
            Id = app.Id.ToString(),
            UserId = app.UserId,
            CompanyName = app.CompanyName,
            RoleTitle = app.RoleTitle,
            Location = app.Location,
            SalaryRange = app.SalaryRange,
            Status = app.Status,
            DateApplied = app.DateApplied,
            DateLastContact = app.DateLastContact,
            FollowUpDate = app.FollowUpDate,
            ResumeVersion = app.ResumeVersion,
            Notes = app.Notes,
            IsRemote = app.IsRemote,
            Source = app.Source,
            JobDescriptionId = app.JobDescriptionId?.ToString()
        };
    }

    public async Task<ApplicationResponse> CreateApplicationAsync(string userId, CreateApplicationRequest request)
    {
        var application = new Application
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            CompanyName = request.CompanyName,
            RoleTitle = request.RoleTitle,
            Location = request.Location,
            SalaryRange = request.SalaryRange,
            Status = request.Status,
            DateApplied = request.DateApplied,
            DateLastContact = request.DateLastContact,
            FollowUpDate = request.FollowUpDate,
            ResumeVersion = request.ResumeVersion,
            Notes = request.Notes,
            IsRemote = request.IsRemote,
            Source = request.Source,
            JobDescriptionId = request.JobDescriptionId
        };

        if (application.JobDescriptionId.HasValue)
        {
            var jdExists = await dbContext.JobDescriptions
                .AnyAsync(jd => jd.Id == application.JobDescriptionId.Value && jd.UserId == userId);
            if (!jdExists)
            {
                application.JobDescriptionId = null;
            }
        }

        dbContext.Applications.Add(application);
        await dbContext.SaveChangesAsync();

        logger.ApplicationCreated(application.Id);

        return MapToResponse(application);
    }

    public async Task<List<ApplicationResponse>> GetAllApplicationsAsync(string userId, ApplicationStatus? status = null)
    {
        logger.ApplicationsRetrieved(userId);

        var query = dbContext.Applications.Where(a => a.UserId == userId);

        if (status.HasValue)
        {
            query = query.Where(a => a.Status == status.Value);
        }

        var apps = await query.ToListAsync();
        return apps.Select(MapToResponse).ToList();
    }

    public async Task<ApplicationResponse> GetApplicationAsync(string userId, string id)
    {
        if (!Guid.TryParse(id, out var guid))
            return new ApplicationResponse();

        var app = await dbContext.Applications
            .FirstOrDefaultAsync(a => a.Id == guid && a.UserId == userId);

        if (app == null)
        {
            logger.ApplicationNotFound(guid, userId);
            return new ApplicationResponse();
        }

        logger.ApplicationRetrieved(guid);
        return MapToResponse(app);
    }

    public async Task<ApplicationResponse> UpdateApplicationAsync(string userId, string id, UpdateApplicationRequest request)
    {
        if (!Guid.TryParse(id, out var guid))
            return new ApplicationResponse();

        var app = await dbContext.Applications
            .FirstOrDefaultAsync(a => a.Id == guid && a.UserId == userId);

        if (app == null)
        {
            logger.ApplicationNotFound(guid, userId);
            return new ApplicationResponse();
        }

        app.CompanyName = request.CompanyName;
        app.RoleTitle = request.RoleTitle;
        app.Location = request.Location;
        app.SalaryRange = request.SalaryRange;
        app.Status = request.Status;
        app.DateApplied = request.DateApplied;
        app.DateLastContact = request.DateLastContact;
        app.FollowUpDate = request.FollowUpDate;
        app.ResumeVersion = request.ResumeVersion;
        app.Notes = request.Notes;
        app.IsRemote = request.IsRemote;
        app.Source = request.Source;

        if (request.JobDescriptionId.HasValue)
        {
            var jdExists = await dbContext.JobDescriptions
                .AnyAsync(jd => jd.Id == request.JobDescriptionId.Value && jd.UserId == userId);
            app.JobDescriptionId = jdExists ? request.JobDescriptionId.Value : null;
        }
        else
        {
            app.JobDescriptionId = null;
        }

        await dbContext.SaveChangesAsync();
        logger.ApplicationUpdated(guid);

        return MapToResponse(app);
    }

    public async Task<ApplicationResponse> UpdateApplicationStatusAsync(string userId, string id, ApplicationStatus status)
    {
        if (!Guid.TryParse(id, out var guid))
            return new ApplicationResponse();

        var app = await dbContext.Applications
            .FirstOrDefaultAsync(a => a.Id == guid && a.UserId == userId);

        if (app == null)
        {
            logger.ApplicationNotFound(guid, userId);
            return new ApplicationResponse();
        }

        app.Status = status;
        app.DateLastContact = DateTime.UtcNow;
        app.FollowUpDate = CalculateAutoFollowUpDate(status);
        await dbContext.SaveChangesAsync();
        logger.ApplicationUpdated(guid);

        return MapToResponse(app);
    }

    /// <summary>
    /// Calculates the auto follow-up date based on the new application status.
    /// </summary>
    private static DateTime CalculateAutoFollowUpDate(ApplicationStatus status) => status switch
    {
        ApplicationStatus.Applied      => DateTime.UtcNow.AddDays(7),   // 1 week for initial recruiter review
        ApplicationStatus.PhoneScreen  => DateTime.UtcNow.AddDays(3),   // 3 days after phone screen
        ApplicationStatus.Interviewing => DateTime.UtcNow.AddDays(5),   // 5 days after interview
        ApplicationStatus.Offer        => DateTime.UtcNow.AddDays(2),   // 2 days to respond/negotiate
        ApplicationStatus.Ghosted      => DateTime.UtcNow.AddDays(14),  // 2 weeks for a final attempt
        ApplicationStatus.Rejected     => DateTime.UtcNow,              // No future follow-up needed
        _                              => DateTime.UtcNow.AddDays(7)
    };

    public async Task<bool> DeleteApplicationAsync(string userId, string id)
    {
        if (!Guid.TryParse(id, out var guid))
            return false;

        var app = await dbContext.Applications
            .FirstOrDefaultAsync(a => a.Id == guid && a.UserId == userId);

        if (app == null)
            return false;

        dbContext.Applications.Remove(app);
        await dbContext.SaveChangesAsync();
        return true;
    }
}

/// <summary>
/// Source-generated extension methods for high-performance logging in ApplicationService.
/// </summary>
public static partial class ApplicationLoggerExtensions
{
    [LoggerMessage(EventId = 101, Level = LogLevel.Information, Message = "Application (ID: {applicationId}) created successfully")]
    public static partial void ApplicationCreated(this ILogger logger, Guid applicationId);

    [LoggerMessage(EventId = 102, Level = LogLevel.Information, Message = "Applications retrieved for user (ID: {userId})")]
    public static partial void ApplicationsRetrieved(this ILogger logger, string userId);

    [LoggerMessage(EventId = 103, Level = LogLevel.Information, Message = "Application (ID: {applicationId}) retrieved successfully")]
    public static partial void ApplicationRetrieved(this ILogger logger, Guid applicationId);

    [LoggerMessage(EventId = 104, Level = LogLevel.Warning, Message = "Application (ID: {applicationId}) not found for user (ID: {userId})")]
    public static partial void ApplicationNotFound(this ILogger logger, Guid applicationId, string userId);

    [LoggerMessage(EventId = 105, Level = LogLevel.Information, Message = "Application (ID: {applicationId}) updated successfully")]
    public static partial void ApplicationUpdated(this ILogger logger, Guid applicationId);
}
