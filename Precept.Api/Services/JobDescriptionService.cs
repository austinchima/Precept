using Microsoft.EntityFrameworkCore;
using Precept.Api.Data;
using Precept.Api.DTOs;
using Precept.Api.Models;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Services;

/// <summary>
/// Service implementation for managing job descriptions.
/// Handles creation with manual keyword extraction, match score computation against user skills,
/// retrieval, updating, and deletion.
/// </summary>
public class JobDescriptionService(PreceptDbContext dbContext, ILogger<JobDescriptionService> logger) : IJobDescriptionService
{
    private static JobDescriptionResponse MapToResponse(JobDescription jd) => new()
    {
        Id = jd.Id.ToString(),
        UserId = jd.UserId,
        CompanyName = jd.CompanyName,
        RoleTitle = jd.RoleTitle,
        Description = jd.Description,
        ExtractedKeyWords = jd.ExtractedKeyWords,
        MissingKeyWords = jd.MissingKeyWords,
        YourMatchScore = jd.YourMatchScore,
        Url = jd.Url,
        SalaryRange = jd.SalaryRange,
        Location = jd.Location,
        IsRemote = jd.IsRemote,
        Source = jd.Source,
        DatePosted = jd.DatePosted
    };

    /// <summary>
    /// Computes the match score and missing keywords by comparing extracted keywords
    /// against the user's skills inventory.
    /// </summary>
    private async Task ComputeMatchScore(JobDescription jd, string userId)
    {
        if (jd.ExtractedKeyWords.Count == 0)
        {
            jd.YourMatchScore = null;
            jd.MissingKeyWords = [];
            return;
        }

        // Fetch the user's skills from the database (lowercased for case-insensitive matching)
        var userSkills = await dbContext.Skills
            .Where(s => s.UserId == userId)
            .Select(s => s.Name.ToLower())
            .ToListAsync();

        var matched = new List<string>();
        var missing = new List<string>();

        foreach (var keyword in jd.ExtractedKeyWords)
        {
            if (userSkills.Contains(keyword.ToLower()))
                matched.Add(keyword);
            else
                missing.Add(keyword);
        }

        jd.MissingKeyWords = missing;
        jd.YourMatchScore = (int)Math.Round((double)matched.Count / jd.ExtractedKeyWords.Count * 100);
    }

    public async Task<JobDescriptionResponse> CreateJobDescriptionAsync(string userId, CreateJobDescriptionRequest request)
    {
        var jd = new JobDescription
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            CompanyName = request.CompanyName,
            RoleTitle = request.RoleTitle,
            Description = request.Description,
            ExtractedKeyWords = request.ExtractedKeyWords,
            Url = request.Url,
            SalaryRange = request.SalaryRange,
            Location = request.Location,
            IsRemote = request.IsRemote,
            Source = request.Source,
            DatePosted = request.DatePosted
        };

        await ComputeMatchScore(jd, userId);

        dbContext.JobDescriptions.Add(jd);
        await dbContext.SaveChangesAsync();

        logger.JobDescriptionCreated(jd.Id, userId);

        return MapToResponse(jd);
    }

    public async Task<List<JobDescriptionResponse>> GetJobDescriptionsAsync(string userId)
    {
        logger.JobDescriptionsRetrieved(userId);

        var jds = await dbContext.JobDescriptions
            .Where(j => j.UserId == userId)
            .ToListAsync();

        return jds.Select(MapToResponse).ToList();
    }

    public async Task<JobDescriptionResponse> GetJobDescriptionAsync(string userId, string id)
    {
        if (!Guid.TryParse(id, out var guid))
            return new JobDescriptionResponse();

        var jd = await dbContext.JobDescriptions
            .FirstOrDefaultAsync(j => j.Id == guid && j.UserId == userId);

        if (jd == null)
        {
            logger.JobDescriptionNotFound(guid, userId);
            return new JobDescriptionResponse();
        }

        return MapToResponse(jd);
    }

    public async Task<JobDescriptionResponse> UpdateJobDescriptionAsync(string userId, string id, UpdateJobDescriptionRequest request)
    {
        if (!Guid.TryParse(id, out var guid))
            return new JobDescriptionResponse();

        var jd = await dbContext.JobDescriptions
            .FirstOrDefaultAsync(j => j.Id == guid && j.UserId == userId);

        if (jd == null)
        {
            logger.JobDescriptionNotFound(guid, userId);
            return new JobDescriptionResponse();
        }

        jd.CompanyName = request.CompanyName;
        jd.RoleTitle = request.RoleTitle;
        jd.Description = request.Description;
        jd.ExtractedKeyWords = request.ExtractedKeyWords;
        jd.Url = request.Url;
        jd.SalaryRange = request.SalaryRange;
        jd.Location = request.Location;
        jd.IsRemote = request.IsRemote;
        jd.Source = request.Source;
        jd.DatePosted = request.DatePosted;

        // Recompute match score against current skills
        await ComputeMatchScore(jd, userId);

        await dbContext.SaveChangesAsync();
        logger.JobDescriptionUpdated(guid);

        return MapToResponse(jd);
    }

    public async Task<bool> DeleteJobDescriptionAsync(string userId, string id)
    {
        if (!Guid.TryParse(id, out var guid))
            return false;

        var jd = await dbContext.JobDescriptions
            .FirstOrDefaultAsync(j => j.Id == guid && j.UserId == userId);

        if (jd == null)
            return false;

        dbContext.JobDescriptions.Remove(jd);
        await dbContext.SaveChangesAsync();
        return true;
    }
}

internal static partial class JobDescriptionLoggerExtensions
{
    [LoggerMessage(1, LogLevel.Information, "Job description (ID: {jobDescriptionId}) created for user (ID: {userId})")]
    public static partial void JobDescriptionCreated(this ILogger logger, Guid jobDescriptionId, string userId);

    [LoggerMessage(2, LogLevel.Information, "Job descriptions retrieved for user (ID: {userId})")]
    public static partial void JobDescriptionsRetrieved(this ILogger logger, string userId);

    [LoggerMessage(3, LogLevel.Warning, "Job description (ID: {jobDescriptionId}) not found for user (ID: {userId})")]
    public static partial void JobDescriptionNotFound(this ILogger logger, Guid jobDescriptionId, string userId);

    [LoggerMessage(4, LogLevel.Information, "Job description (ID: {jobDescriptionId}) updated successfully")]
    public static partial void JobDescriptionUpdated(this ILogger logger, Guid jobDescriptionId);
}
