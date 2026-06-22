using Microsoft.EntityFrameworkCore;
using Precept.Api.Data;
using Precept.Api.DTOs;
using Precept.Api.Models;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Services;

/// <summary>
/// Service implementation for managing user stories (code snippets with explanations and confidence levels).
/// Handles creation, updates, deletion, retrieval, and secure user data isolation.
/// </summary>
public class StoryService(
    PreceptDbContext dbContext,
    ILogger<StoryService> logger,
    TimeProvider timeProvider) : IStoryService
{
    private DateTime UtcNow => timeProvider.GetUtcNow().UtcDateTime;

    /// <summary>
    /// Creates a new code story and persists it to the database.
    /// </summary>
    /// <param name="userId">The unique identifier of the authenticated user creating the story.</param>
    /// <param name="request">The story details (Title, Explanation, CodeSnippet, etc.) provided by the client.</param>
    /// <returns>A StoryResponse DTO representing the newly created story.</returns>
    public async Task<StoryResponse> CreateStoryAsync(string userId, CreateStoryRequest request)
    {
        // Map request DTO to database entity and initialize default fields
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

        // High-performance source-generated warning/info logging.
        // We pass the Guid directly to avoid unnecessary ToString() evaluation when logging is disabled.
        logger.StoryCreated(story.Id);
        
        return new StoryResponse
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
            UpdatedAt = story.UpdatedAt
        };
    }

    /// <summary>
    /// Deletes a specific story if it belongs to the authenticated user.
    /// </summary>
    /// <param name="userId">The unique identifier of the authenticated user.</param>
    /// <param name="storyId">The string representation of the Story Guid.</param>
    /// <returns>True if the story was found, owned, and successfully deleted; false otherwise.</returns>
    public async Task<bool> DeleteStoryAsync(string userId, string storyId)
    {
        // Safely parse string Guid to prevent DB query execution exceptions
        if (!Guid.TryParse(storyId, out var guid))
            return false;

        // Ensure user ownership by matching both StoryId and UserId
        var story = await dbContext.Stories
            .FirstOrDefaultAsync(s => s.Id == guid && s.UserId == userId);

        if (story == null)
            return false;

        dbContext.Stories.Remove(story);
        await dbContext.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// Retrieves a random story for the user (useful for study/practice mode).
    /// </summary>
    /// <param name="userId">The unique identifier of the authenticated user.</param>
    /// <param name="category">Optional category to filter the random story selection.</param>
    /// <returns>A StoryResponse DTO containing the random story; returns an empty DTO if none exist.</returns>
    public async Task<StoryResponse> GetRandomStoryAsync(string userId, Category? category = null)
    {
        var query = dbContext.Stories.Where(s => s.UserId == userId);
        
        if (category.HasValue)
        {
            query = query.Where(s => s.Category == category.Value);
        }

        // Fetch a random story belonging to the user using database-native random function
        var story = await query
            .OrderBy(r => EF.Functions.Random())
            .FirstOrDefaultAsync();

        if (story == null)
        {
            logger.RandomStoryNotFound(userId);
            
            // Return empty response object to indicate no stories exist
            return new StoryResponse
            {
                Id = string.Empty,
                Title = string.Empty,
                CodeSnippet = string.Empty,
                Explanation = string.Empty,
                SourceProject = string.Empty,
                Category = Category.Auth,
                ConfidenceLevel = ConfidenceLevel.Okay,
                UserId = string.Empty,
                CreatedAt = DateTime.MinValue,
                UpdatedAt = DateTime.MinValue
            };
        }
        return new StoryResponse
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
            UpdatedAt = story.UpdatedAt
        };
    }

    /// <summary>
    /// Retrieves the next story to review for quiz mode using spaced repetition logic.
    /// Prioritizes unreviewed stories, then low confidence (Panic/Shaky) stories, then oldest reviewed stories.
    /// </summary>
    /// <param name="userId">The unique identifier of the authenticated user.</param>
    /// <returns>A StoryResponse DTO representing the next quiz item, or an empty DTO if no stories exist.</returns>
    public async Task<StoryResponse> GetQuizStoryAsync(string userId)
    {
        // 1. Prioritize stories that have NEVER been reviewed yet (LastReviewedAt is null)
        var story = (await dbContext.Stories
            .Where(s => s.UserId == userId && s.LastReviewedAt == null)
            .OrderByDescending(s => s.CreatedAt) // or .OrderBy(s => s.CreatedAt) - user didn't specify


            // 2. If all have been reviewed, prioritize stories with low confidence (Panic or Shaky)
            .FirstOrDefaultAsync() ?? await dbContext.Stories
            .Where(s => s.UserId == userId && (s.ConfidenceLevel == ConfidenceLevel.Panic || s.ConfidenceLevel == ConfidenceLevel.Shaky))
            .OrderBy(s => s.LastReviewedAt)

            // 3. Fallback: select the story reviewed the longest time ago (oldest LastReviewedAt)
            .FirstOrDefaultAsync()) ?? await dbContext.Stories
            .Where(s => s.UserId == userId)
            .OrderBy(s => s.LastReviewedAt)
            .FirstOrDefaultAsync();

        if (story == null)
        {
            logger.RandomStoryNotFound(userId);
            return new StoryResponse
            {
                Id = string.Empty,
                Title = string.Empty,
                CodeSnippet = string.Empty,
                Explanation = string.Empty,
                SourceProject = string.Empty,
                Category = Category.Auth,
                ConfidenceLevel = ConfidenceLevel.Okay,
                UserId = string.Empty,
                CreatedAt = DateTime.MinValue,
                UpdatedAt = DateTime.MinValue
            };
        }

        logger.StoryRetrieved(story.Id);

        return new StoryResponse
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
    }



    /// <summary>
    /// Retrieves a specific story by its unique identifier and user identifier.
    /// </summary>
    /// <param name="userId">The unique identifier of the authenticated user.</param>
    /// <param name="storyId">The string representation of the Story Guid.</param>
    /// <returns>A StoryResponse DTO representing the story; returns empty if not found.</returns>
    public async Task<StoryResponse> GetStoryAsync(string userId, string storyId)
    {
        // Parse string to Guid safely before querying. Ensures that if invalid guid is passed it doesn't crash the app.
        if (!Guid.TryParse(storyId, out var guid))
            return new StoryResponse();

        // Enforce user isolation: a user can only retrieve their own stories
        var story = await dbContext.Stories
            .FirstOrDefaultAsync(s => s.Id == guid && s.UserId == userId);

        if (story == null)
        {
            logger.StoryNotFound(guid, userId);
            return new StoryResponse
            {
                Id = string.Empty,
                Title = string.Empty,
                CodeSnippet = string.Empty,
                Explanation = string.Empty,
                SourceProject = string.Empty,
                Category = Category.Auth,
                ConfidenceLevel = ConfidenceLevel.Okay,
                UserId = string.Empty,
                CreatedAt = DateTime.MinValue,
                UpdatedAt = DateTime.MinValue
            };
        }

        logger.StoryRetrieved(guid);

        return new StoryResponse
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
            UpdatedAt = story.UpdatedAt
        };
    }

    /// <summary>
    /// Updates all fields of a specific story based on the UpdateStoryRequest.
    /// </summary>
    /// <param name="userId">The unique identifier of the authenticated user.</param>
    /// <param name="storyId">The string representation of the Story Guid to update.</param>
    /// <param name="request">The updated story properties.</param>
    /// <returns>The updated StoryResponse DTO; returns empty if story not found or not owned by user.</returns>
    public async Task<StoryResponse> UpdateStoryAsync(string userId, string storyId, UpdateStoryRequest request)
    {
        if (!Guid.TryParse(storyId, out var guid))
            return new StoryResponse();
        
        var story = await dbContext.Stories
            .FirstOrDefaultAsync(s => s.Id == guid && s.UserId == userId);
        
        if (story == null)
        {
            logger.StoryNotFound(guid, userId);
            return new StoryResponse();
        }
        
        // Apply updates from request
        story.Title = request.Title;
        story.Explanation = request.Explanation;
        story.SourceProject = request.SourceProject;
        story.CodeSnippet = request.CodeSnippet;
        story.Category = request.Category;
        story.ConfidenceLevel = request.ConfidenceLevel;
        story.UpdatedAt = UtcNow;
        
        await dbContext.SaveChangesAsync();
        logger.StoryUpdated(guid);
        
        return new StoryResponse
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
            UpdatedAt = story.UpdatedAt
        };
    }

    /// <summary>
    /// Retrieves all stories belonging to the authenticated user, optionally filtered by category.
    /// </summary>
    /// <param name="userId">The unique identifier of the authenticated user.</param>
    /// <param name="category">Optional category to filter the results by.</param>
    /// <returns>A list of StoryResponse DTOs containing the user's stories.</returns>
    public async Task<List<StoryResponse>> GetStoriesAsync(string userId, Category? category = null)
    {
        logger.StoriesRetrieved(userId);

        var query = dbContext.Stories.Where(s => s.UserId == userId);

        // Filter by category if requested
        if (category.HasValue)
        {
            query = query.Where(s => s.Category == category.Value);
        }

        return await query
            .Select(story => new StoryResponse
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
                UpdatedAt = story.UpdatedAt
            })
            .ToListAsync();
    }



    /// <summary>
    /// Updates only the confidence level and last reviewed timestamp of a specific story.
    /// </summary>
    /// <param name="userId">The unique identifier of the authenticated user.</param>
    /// <param name="storyId">The string representation of the Story Guid to update.</param>
    /// <param name="confidenceLevel">The new confidence level value.</param>
    /// <returns>The updated StoryResponse DTO; returns empty if story not found or not owned by user.</returns>
    public async Task<StoryResponse> UpdateStoryConfidenceLevelAsync(string userId, string storyId, ConfidenceLevel confidenceLevel)
    {
        if (!Guid.TryParse(storyId, out var guid))
            return new StoryResponse();
        
        var story = await dbContext.Stories
            .FirstOrDefaultAsync(s => s.Id == guid && s.UserId == userId);
        
        if (story == null)
        {
            logger.StoryNotFound(guid, userId);
            return new StoryResponse();
        }
        
        // Update only the confidence level and last reviewed timestamp
        story.ConfidenceLevel = confidenceLevel;
        story.LastReviewedAt = UtcNow;
        story.UpdatedAt = UtcNow;
        
        await dbContext.SaveChangesAsync();
        logger.StoryUpdated(guid);
        
        return new StoryResponse
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
    }
}

/// <summary>
/// Source-generated extension methods for high-performance logging.
/// </summary>
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