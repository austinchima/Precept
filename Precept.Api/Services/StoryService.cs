using Microsoft.EntityFrameworkCore;
using Precept.Api.Data;
using Precept.Api.DTOs;
using Precept.Api.Models;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Services;

/// <summary>
/// Service implementation for managing user stories (code snippets with explanations and confidence levels).
/// Handles creation, updates, soft-deletion, restoration, retrieval, and secure user data isolation.
/// </summary>
public class StoryService(
    PreceptDbContext dbContext,
    ILogger<StoryService> logger,
    TimeProvider timeProvider) : IStoryService
{
    private DateTime UtcNow => timeProvider.GetUtcNow().UtcDateTime;

    private static StoryResponse MapToResponse(Story story) => new()
    {
        Id = story.Id.ToString(),
        Title = story.Title,
        CodeSnippet = story.CodeSnippet,
        Explanation = story.Explanation,
        SourceProject = story.SourceProject,
        Category = story.Category,
        ConfidenceLevel = story.ConfidenceLevel,
        UserId = story.UserId,
        CreatedAt = story.CreatedAt,
        UpdatedAt = story.UpdatedAt,
        LastReviewedAt = story.LastReviewedAt
    };

    public async Task<StoryResponse> CreateStoryAsync(string userId, CreateStoryRequest request)
    {
        var story = new Story
        {
            Id = Guid.NewGuid(),
            Title = request.Title,
            CodeSnippet = request.CodeSnippet,
            Explanation = request.Explanation,
            SourceProject = request.SourceProject,
            Category = request.Category,
            ConfidenceLevel = request.ConfidenceLevel,
            UserId = userId,
            CreatedAt = UtcNow,
            UpdatedAt = UtcNow
        };

        dbContext.Stories.Add(story);
        await dbContext.SaveChangesAsync();

        logger.StoryCreated(story.Id);
        return MapToResponse(story);
    }

    public async Task<bool> DeleteStoryAsync(string userId, string storyId)
    {
        if (!Guid.TryParse(storyId, out var guid))
            return false;

        var story = await dbContext.Stories
            .FirstOrDefaultAsync(s => s.Id == guid && s.UserId == userId);

        if (story == null)
            return false;

        story.IsDeleted = true;
        story.DeletedAt = UtcNow;
        await dbContext.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RestoreStoryAsync(string userId, string storyId)
    {
        if (!Guid.TryParse(storyId, out var guid))
            return false;

        var story = await dbContext.Stories
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.Id == guid && s.UserId == userId && s.IsDeleted);

        if (story == null)
            return false;

        story.IsDeleted = false;
        story.DeletedAt = null;
        await dbContext.SaveChangesAsync();
        return true;
    }

    public async Task<StoryResponse?> GetRandomStoryAsync(string userId, Category? category = null)
    {
        var query = dbContext.Stories.Where(s => s.UserId == userId);

        if (category.HasValue)
        {
            query = query.Where(s => s.Category == category.Value);
        }

        var story = await query
            .OrderBy(r => EF.Functions.Random())
            .FirstOrDefaultAsync();

        if (story == null)
        {
            logger.RandomStoryNotFound(userId);
            return null;
        }

        return MapToResponse(story);
    }

    public async Task<StoryResponse?> GetQuizStoryAsync(string userId, Category? category = null)
    {
        var query = dbContext.Stories.Where(s => s.UserId == userId);
        if (category.HasValue)
        {
            query = query.Where(s => s.Category == category.Value);
        }

        var stories = await query.ToListAsync();
        if (stories.Count == 0)
        {
            logger.RandomStoryNotFound(userId);
            return null;
        }

        var story = stories
            .OrderBy(s => s.LastReviewedAt.HasValue ? 1 : 0)
            .ThenBy(s => s.ConfidenceLevel switch
            {
                ConfidenceLevel.Panic => 0,
                ConfidenceLevel.Shaky => 1,
                ConfidenceLevel.Okay => 2,
                ConfidenceLevel.Solid => 3,
                ConfidenceLevel.CanTeach => 4,
                _ => 5
            })
            .ThenBy(s => s.LastReviewedAt ?? DateTime.MinValue)
            .First();

        logger.StoryRetrieved(story.Id);
        return MapToResponse(story);
    }

    public async Task<StoryResponse?> GetStoryAsync(string userId, string storyId)
    {
        if (!Guid.TryParse(storyId, out var guid))
            return null;

        var story = await dbContext.Stories
            .FirstOrDefaultAsync(s => s.Id == guid && s.UserId == userId);

        if (story == null)
        {
            logger.StoryNotFound(guid, userId);
            return null;
        }

        logger.StoryRetrieved(guid);
        return MapToResponse(story);
    }

    public async Task<StoryResponse?> UpdateStoryAsync(string userId, string storyId, UpdateStoryRequest request)
    {
        if (!Guid.TryParse(storyId, out var guid))
            return null;

        var story = await dbContext.Stories
            .FirstOrDefaultAsync(s => s.Id == guid && s.UserId == userId);

        if (story == null)
        {
            logger.StoryNotFound(guid, userId);
            return null;
        }

        story.Title = request.Title;
        story.Explanation = request.Explanation;
        story.SourceProject = request.SourceProject;
        story.CodeSnippet = request.CodeSnippet;
        story.Category = request.Category;
        story.ConfidenceLevel = request.ConfidenceLevel;
        story.UpdatedAt = UtcNow;

        await dbContext.SaveChangesAsync();
        logger.StoryUpdated(guid);

        return MapToResponse(story);
    }

    public async Task<PagedResponse<StoryResponse>> GetStoriesAsync(string userId, Category? category = null, PaginationQuery? pagination = null)
    {
        pagination ??= new PaginationQuery();
        logger.StoriesRetrieved(userId);

        var query = dbContext.Stories.Where(s => s.UserId == userId);

        if (category.HasValue)
        {
            query = query.Where(s => s.Category == category.Value);
        }

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(s => s.CreatedAt)
            .Skip(pagination.Skip)
            .Take(pagination.PageSize)
            .ToListAsync();

        return new PagedResponse<StoryResponse>(
            items.Select(MapToResponse).ToList(),
            totalCount,
            pagination.Page,
            pagination.PageSize);
    }

    public async Task<PagedResponse<StoryResponse>> GetTrashStoriesAsync(string userId, PaginationQuery? pagination = null)
    {
        pagination ??= new PaginationQuery();
        var query = dbContext.Stories
            .IgnoreQueryFilters()
            .Where(s => s.UserId == userId && s.IsDeleted);

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(s => s.DeletedAt)
            .Skip(pagination.Skip)
            .Take(pagination.PageSize)
            .ToListAsync();

        return new PagedResponse<StoryResponse>(
            items.Select(MapToResponse).ToList(),
            totalCount,
            pagination.Page,
            pagination.PageSize);
    }

    public async Task<StoryResponse?> UpdateStoryConfidenceLevelAsync(string userId, string storyId, ConfidenceLevel confidenceLevel)
    {
        if (!Guid.TryParse(storyId, out var guid))
            return null;

        var story = await dbContext.Stories
            .FirstOrDefaultAsync(s => s.Id == guid && s.UserId == userId);

        if (story == null)
        {
            logger.StoryNotFound(guid, userId);
            return null;
        }

        story.ConfidenceLevel = confidenceLevel;
        story.LastReviewedAt = UtcNow;
        story.UpdatedAt = UtcNow;

        await dbContext.SaveChangesAsync();
        logger.StoryUpdated(guid);

        return MapToResponse(story);
    }
}

public static partial class LoggerExtensions
{
    [LoggerMessage(EventId = 1, Level = LogLevel.Information, Message = "Story (ID: {storyId}) created successfully")]
    public static partial void StoryCreated(this ILogger logger, Guid storyId);

    [LoggerMessage(EventId = 2, Level = LogLevel.Warning, Message = "Random story not found for user (ID: {userId})")]
    public static partial void RandomStoryNotFound(this ILogger logger, string userId);

    [LoggerMessage(EventId = 3, Level = LogLevel.Information, Message = "Stories retrieved for user (ID: {userId})")]
    public static partial void StoriesRetrieved(this ILogger logger, string userId);

    [LoggerMessage(EventId = 4, Level = LogLevel.Information, Message = "Story (ID: {storyId}) retrieved successfully")]
    public static partial void StoryRetrieved(this ILogger logger, Guid storyId);

    [LoggerMessage(EventId = 5, Level = LogLevel.Warning, Message = "Story (ID: {storyId}) not found for user (ID: {userId})")]
    public static partial void StoryNotFound(this ILogger logger, Guid storyId, string userId);

    [LoggerMessage(EventId = 6, Level = LogLevel.Information, Message = "Story (ID: {storyId}) updated successfully")]
    public static partial void StoryUpdated(this ILogger logger, Guid storyId);
}