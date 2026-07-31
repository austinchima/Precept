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
public class ApplicationService(
    PreceptDbContext dbContext,
    IJobDescriptionService jobDescriptionService,
    IJobPostingContentExtractor contentExtractor,
    IHttpClientFactory httpClientFactory,
    ILogger<ApplicationService> logger,
    TimeProvider timeProvider) : IApplicationService
{
    private DateTime UtcNow => timeProvider.GetUtcNow().UtcDateTime;

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
            JobDescriptionId = app.JobDescriptionId?.ToString(),
            Events = [.. app.Events.OrderBy(e => e.DateOccurred).Select(e => new ApplicationEventDto
            {
                Id = e.Id.ToString(),
                Status = e.Status,
                DateOccurred = e.DateOccurred,
                Notes = e.Notes
            })]
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

        var appEvent = new ApplicationEvent
        {
            ApplicationId = application.Id,
            Status = application.Status,
            DateOccurred = UtcNow,
        };
        dbContext.Set<ApplicationEvent>().Add(appEvent);

        await dbContext.SaveChangesAsync();

        logger.ApplicationCreated(application.Id);

        return MapToResponse(application);
    }

    public async Task<ApplicationResponse> CaptureApplicationAsync(string userId, CaptureApplicationRequest request)
    {
        if (!Uri.TryCreate(request.Url, UriKind.Absolute, out var uri))
        {
            throw new ArgumentException("Invalid URL.", nameof(request));
        }

        if (uri.Scheme is not ("http" or "https"))
        {
            throw new ArgumentException("Only HTTP and HTTPS URLs are supported.", nameof(request));
        }

        if (IsPrivateOrLoopback(uri.Host))
        {
            throw new ArgumentException("Private or loopback URLs are not allowed.", nameof(request));
        }

        var html = await FetchPageAsync(request.Url);

        var extracted = contentExtractor.Extract(request.Url, html, request.Title);

        var jobDescription = await jobDescriptionService.CreateJobDescriptionAsync(userId, new CreateJobDescriptionRequest
        {
            CompanyName = extracted.CompanyName,
            RoleTitle = extracted.RoleTitle,
            Description = extracted.Description,
            Url = request.Url,
            SalaryRange = extracted.SalaryRange,
            Location = extracted.Location,
            IsRemote = extracted.IsRemote,
            Source = request.Url,
            DatePosted = DateTime.UtcNow
        });

        var application = await CreateApplicationAsync(userId, new CreateApplicationRequest
        {
            CompanyName = string.IsNullOrWhiteSpace(extracted.CompanyName) ? "Unknown Company" : extracted.CompanyName,
            RoleTitle = string.IsNullOrWhiteSpace(extracted.RoleTitle) ? "Unknown Role" : extracted.RoleTitle,
            Location = extracted.Location,
            SalaryRange = extracted.SalaryRange,
            Status = ApplicationStatus.Applied,
            FollowUpDate = UtcNow.AddDays(7),
            Notes = request.Notes ?? string.Empty,
            IsRemote = extracted.IsRemote,
            Source = request.Url,
            JobDescriptionId = Guid.TryParse(jobDescription.Id, out var jdId) ? jdId : null
        });

        if (Guid.TryParse(application.Id, out var capturedId))
        {
            logger.ApplicationCaptured(capturedId, request.Url);
        }

        return application;
    }

    /// <summary>
    /// Fetches the requested URL with a short timeout, capped response size,
    /// and a realistic user agent. Returns an empty string on failure so the
    /// caller can fall back to client-provided data.
    /// </summary>
    private async Task<string> FetchPageAsync(string url)
    {
        const int maxBytes = 2 * 1024 * 1024; // 2 MB

        try
        {
            using var client = httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(10);
            client.DefaultRequestHeaders.Add("User-Agent",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.0 (KHTML, like Gecko) Chrome/126.0 Safari/537.0");

            await using var stream = await client.GetStreamAsync(url);
            using var reader = new StreamReader(stream, System.Text.Encoding.UTF8);
            var buffer = new char[8192];
            var builder = new System.Text.StringBuilder();
            int read;

            while ((read = await reader.ReadAsync(buffer, 0, buffer.Length)) > 0)
            {
                builder.Append(buffer, 0, read);
                if (builder.Length * sizeof(char) > maxBytes)
                    break;
            }

            return builder.ToString();
        }
        catch (Exception ex)
        {
            logger.CaptureFetchFailed(url, ex.Message);
            return string.Empty;
        }
    }

    /// <summary>
    /// Returns true for loopback, private IPv4 ranges, and link-local IPv6.
    /// </summary>
    private static bool IsPrivateOrLoopbackHost(System.Net.IPAddress ip)
    {
        if (System.Net.IPAddress.IsLoopback(ip))
            return true;

        var bytes = ip.GetAddressBytes();
        if (bytes.Length == 4)
        {
            // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8
            if (bytes[0] == 10) return true;
            if (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31) return true;
            if (bytes[0] == 192 && bytes[1] == 168) return true;
            if (bytes[0] == 127) return true;
            // 169.254.0.0/16 (Link-local / Cloud Metadata API)
            if (bytes[0] == 169 && bytes[1] == 254) return true;
            // 100.64.0.0/10 (Carrier-Grade NAT)
            if (bytes[0] == 100 && bytes[1] >= 64 && bytes[1] <= 127) return true;
        }

        return false;
    }

    /// <summary>
    /// Returns true for loopback, private IPv4 ranges, link-local metadata IPs, and hostnames resolving to private IPs.
    /// </summary>
    private static bool IsPrivateOrLoopback(string host)
    {
        if (string.Equals(host, "localhost", StringComparison.OrdinalIgnoreCase))
            return true;

        if (System.Net.IPAddress.TryParse(host, out var ip))
        {
            return IsPrivateOrLoopbackHost(ip);
        }

        try
        {
            var addresses = System.Net.Dns.GetHostAddresses(host);
            foreach (var addr in addresses)
            {
                if (IsPrivateOrLoopbackHost(addr))
                    return true;
            }
        }
        catch
        {
            // If DNS resolution fails, allow default handling or block if suspicious
        }

        return false;
    }

    public async Task<PagedResponse<ApplicationResponse>> GetAllApplicationsAsync(string userId, ApplicationStatus? status = null, PaginationQuery? pagination = null)
    {
        pagination ??= new PaginationQuery();
        logger.ApplicationsRetrieved(userId);

        var query = dbContext.Applications
            .Include(a => a.Events)
            .Where(a => a.UserId == userId);

        if (status.HasValue)
        {
            query = query.Where(a => a.Status == status.Value);
        }

        var totalCount = await query.CountAsync();
        var apps = await query
            .OrderByDescending(a => a.DateApplied ?? a.FollowUpDate)
            .Skip(pagination.Skip)
            .Take(pagination.PageSize)
            .ToListAsync();

        return new PagedResponse<ApplicationResponse>(
            apps.Select(MapToResponse).ToList(),
            totalCount,
            pagination.Page,
            pagination.PageSize);
    }

    public async Task<PagedResponse<ApplicationResponse>> GetTrashApplicationsAsync(string userId, PaginationQuery? pagination = null)
    {
        pagination ??= new PaginationQuery();

        var query = dbContext.Applications
            .IgnoreQueryFilters()
            .Include(a => a.Events)
            .Where(a => a.UserId == userId && a.IsDeleted);

        var totalCount = await query.CountAsync();
        var apps = await query
            .OrderByDescending(a => a.DeletedAt)
            .Skip(pagination.Skip)
            .Take(pagination.PageSize)
            .ToListAsync();

        return new PagedResponse<ApplicationResponse>(
            apps.Select(MapToResponse).ToList(),
            totalCount,
            pagination.Page,
            pagination.PageSize);
    }

    public async Task<ApplicationResponse?> GetApplicationAsync(string userId, string id)
    {
        if (!Guid.TryParse(id, out var guid))
            return null;

        var app = await dbContext.Applications
            .Include(a => a.Events)
            .FirstOrDefaultAsync(a => a.Id == guid && a.UserId == userId);

        if (app == null)
        {
            logger.ApplicationNotFound(guid, userId);
            return null;
        }

        logger.ApplicationRetrieved(guid);
        return MapToResponse(app);
    }

    public async Task<ApplicationResponse?> UpdateApplicationAsync(string userId, string id, UpdateApplicationRequest request)
    {
        if (!Guid.TryParse(id, out var guid))
            return null;

        var app = await dbContext.Applications
            .Include(a => a.Events)
            .FirstOrDefaultAsync(a => a.Id == guid && a.UserId == userId);

        if (app == null)
        {
            logger.ApplicationNotFound(guid, userId);
            return null;
        }

        var originalStatus = app.Status;

        app.CompanyName = request.CompanyName;
        app.RoleTitle = request.RoleTitle;
        app.Location = request.Location;
        app.SalaryRange = request.SalaryRange;
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

        if (originalStatus != request.Status)
        {
            var appEvent = new ApplicationEvent
            {
                ApplicationId = app.Id,
                Status = request.Status,
                DateOccurred = UtcNow,
                Notes = "Status updated"
            };
            dbContext.Set<ApplicationEvent>().Add(appEvent);
        }

        app.Status = request.Status;

        await dbContext.SaveChangesAsync();
        logger.ApplicationUpdated(guid);

        return MapToResponse(app);
    }

    public async Task<ApplicationResponse?> UpdateApplicationStatusAsync(string userId, string id, ApplicationStatus status)
    {
        if (!Guid.TryParse(id, out var guid))
            return null;

        var app = await dbContext.Applications
            .Include(a => a.Events)
            .FirstOrDefaultAsync(a => a.Id == guid && a.UserId == userId);

        if (app == null)
        {
            logger.ApplicationNotFound(guid, userId);
            return null;
        }

        if (app.Status != status)
        {
            var appEvent = new ApplicationEvent
            {
                ApplicationId = app.Id,
                Status = status,
                DateOccurred = UtcNow,
                Notes = "Status updated"
            };
            dbContext.Set<ApplicationEvent>().Add(appEvent);
        }

        app.Status = status;
        app.DateLastContact = UtcNow;
        app.FollowUpDate = CalculateAutoFollowUpDate(status);
        await dbContext.SaveChangesAsync();
        logger.ApplicationUpdated(guid);

        return MapToResponse(app);
    }

    /// <summary>
    /// Calculates the auto follow-up date based on the new application status.
    /// </summary>
    private DateTime CalculateAutoFollowUpDate(ApplicationStatus status) => status switch
    {
        ApplicationStatus.Applied      => UtcNow.AddDays(7),   // 1 week for initial recruiter review
        ApplicationStatus.PhoneScreen  => UtcNow.AddDays(3),   // 3 days after phone screen
        ApplicationStatus.Interviewing => UtcNow.AddDays(5),   // 5 days after interview
        ApplicationStatus.Offer        => UtcNow.AddDays(2),   // 2 days to respond/negotiate
        ApplicationStatus.Ghosted      => UtcNow.AddDays(14),  // 2 weeks for a final attempt
        ApplicationStatus.Rejected     => UtcNow,              // No future follow-up needed
        _                              => UtcNow.AddDays(7)
    };

    public async Task<bool> DeleteApplicationAsync(string userId, string id)
    {
        if (!Guid.TryParse(id, out var guid))
            return false;

        var app = await dbContext.Applications
            .FirstOrDefaultAsync(a => a.Id == guid && a.UserId == userId);

        if (app == null)
            return false;

        app.IsDeleted = true;
        app.DeletedAt = UtcNow;
        await dbContext.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RestoreApplicationAsync(string userId, string id)
    {
        if (!Guid.TryParse(id, out var guid))
            return false;

        var app = await dbContext.Applications
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(a => a.Id == guid && a.UserId == userId && a.IsDeleted);

        if (app == null)
            return false;

        app.IsDeleted = false;
        app.DeletedAt = null;
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

    [LoggerMessage(EventId = 106, Level = LogLevel.Information, Message = "Application (ID: {applicationId}) captured from URL: {url}")]
    public static partial void ApplicationCaptured(this ILogger logger, Guid applicationId, string url);

    [LoggerMessage(EventId = 107, Level = LogLevel.Warning, Message = "Failed to fetch capture URL ({url}): {errorMessage}")]
    public static partial void CaptureFetchFailed(this ILogger logger, string url, string errorMessage);
}
