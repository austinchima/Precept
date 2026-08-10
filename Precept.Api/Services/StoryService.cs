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
    TimeProvider timeProvider,
    IReviewScheduler reviewScheduler) : IStoryService
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
        LastReviewedAt = story.LastReviewedAt,
        NextReviewAt = story.NextReviewAt
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

    public async Task<QuizStoryResponse<StoryResponse>> GetQuizStoryAsync(string userId, Category? category = null)
    {
        var query = dbContext.Stories.Where(s => s.UserId == userId);
        if (category.HasValue)
        {
            query = query.Where(s => s.Category == category.Value);
        }

        var totalStories = await query.CountAsync();
        if (totalStories == 0)
        {
            logger.RandomStoryNotFound(userId);
            return new QuizStoryResponse<StoryResponse>
            {
                Story = null,
                DueCount = 0,
                NextDueAt = null,
                TotalStories = 0
            };
        }

        var dueStoriesQuery = query.Where(s => s.NextReviewAt == null || s.NextReviewAt <= UtcNow);
        var dueCount = await dueStoriesQuery.CountAsync();

        if (dueCount == 0)
        {
            var nextDueAt = await query.Where(s => s.NextReviewAt != null).MinAsync(s => s.NextReviewAt);
            logger.RandomStoryNotFound(userId);
            return new QuizStoryResponse<StoryResponse>
            {
                Story = null,
                DueCount = 0,
                NextDueAt = nextDueAt,
                TotalStories = totalStories
            };
        }

        var story = await dueStoriesQuery
            .OrderBy(s => s.ConfidenceLevel)
            .ThenBy(s => s.NextReviewAt == null ? 0 : 1)
            .ThenBy(s => s.NextReviewAt)
            .FirstOrDefaultAsync();

        logger.StoryRetrieved(story!.Id);
        return new QuizStoryResponse<StoryResponse>
        {
            Story = MapToResponse(story),
            DueCount = dueCount,
            NextDueAt = null,
            TotalStories = totalStories
        };
    }

    public async Task<StoryResponse?> ReviewStoryAsync(string userId, string storyId, ReviewRating rating)
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

        var outcome = reviewScheduler.Apply(story.ConfidenceLevel, rating, UtcNow);
        
        story.ConfidenceLevel = outcome.NewLevel;
        story.NextReviewAt = outcome.NextReviewAtUtc;
        story.LastReviewedAt = UtcNow;
        story.UpdatedAt = UtcNow;

        await dbContext.SaveChangesAsync();
        logger.StoryUpdated(guid);

        return MapToResponse(story);
    }

    public async Task<StoryReviewSummaryResponse> GetQuizSummaryAsync(string userId)
    {
        var query = dbContext.Stories.Where(s => s.UserId == userId);
        
        var dueCount = await query.CountAsync(s => s.NextReviewAt == null || s.NextReviewAt <= UtcNow);
        var nextDueAt = await query.Where(s => s.NextReviewAt != null).MinAsync(s => s.NextReviewAt);
        
        return new StoryReviewSummaryResponse
        {
            DueCount = dueCount,
            NextDueAt = nextDueAt
        };
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
        
        if (story.ConfidenceLevel != request.ConfidenceLevel)
        {
            story.ConfidenceLevel = request.ConfidenceLevel;
            var baseInterval = reviewScheduler.GetBaseIntervalDays(story.ConfidenceLevel);
            story.NextReviewAt = UtcNow.AddDays(baseInterval);
        }

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

    public async Task SeedExampleStoriesAsync(string userId)
    {
        var examples = new List<Story>
        {
            new Story
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Title = "Token-bucket rate limiter",
                Category = Category.SystemDesign,
                SourceProject = "API Gateway",
                ConfidenceLevel = ConfidenceLevel.Okay,
                CodeSnippet = @"const bucket = new Map<string, { tokens: number; last: number }>();

function allowRequest(key: string, rate: number, capacity: number): boolean {
  const now = Date.now();
  const entry = bucket.get(key) ?? { tokens: capacity, last: now };
  const elapsed = (now - entry.last) / 1000;
  entry.tokens = Math.min(capacity, entry.tokens + elapsed * rate);
  entry.last = now;
  if (entry.tokens < 1) return false;
  entry.tokens -= 1;
  bucket.set(key, entry);
  return true;
}",
                Explanation = "I implemented a token-bucket rate limiter to protect our API gateway from traffic spikes. The bucket refills tokens proportional to the allowed rate and caps at a configurable capacity. Each request consumes one token; if the bucket is empty, the request is rejected with a 429 status. I chose token bucket over fixed window because it avoids the thundering-herd problem at window boundaries and allows short bursts. Trade-offs: it requires in-memory state per key, so for a distributed deployment I would back it with Redis and use Lua to keep refill + consume atomic.",
                CreatedAt = UtcNow,
                UpdatedAt = UtcNow
            },
            new Story
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Title = "Cache-aside with invalidation",
                Category = Category.Backend,
                SourceProject = "Order Service",
                ConfidenceLevel = ConfidenceLevel.Okay,
                CodeSnippet = @"async function getOrder(id: string) {
  const cached = await redis.get('order:' + id);
  if (cached) return JSON.parse(cached);
  const order = await db.orders.findById(id);
  if (order) await redis.setex('order:' + id, 300, JSON.stringify(order));
  return order;
}

async function updateOrder(id: string, data: OrderPatch) {
  const order = await db.orders.update(id, data);
  await redis.del('order:' + id);
  return order;
}",
                Explanation = "I used cache-aside to reduce database load on frequently read order data. On read, the app checks Redis first; on a miss it loads from Postgres and writes back to Redis with a 5-minute TTL. On write, I update the database and invalidate the cache key so the next read reflects fresh data. The main risk is a race condition where a stale read repopulates the cache after invalidation; to mitigate that I used a short TTL and considered cache-update locking for high-contention keys.",
                CreatedAt = UtcNow,
                UpdatedAt = UtcNow
            },
            new Story
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Title = "Blue-green deployment with health checks",
                Category = Category.DevOps,
                SourceProject = "Release Platform",
                ConfidenceLevel = ConfidenceLevel.Okay,
                CodeSnippet = @"jobs:
  deploy:
    steps:
      - deploy --env=blue --tag=$VERSION
      - health-check --env=blue --retries=10
      - switch-traffic --to=blue
      - sleep 60
      - rollback --env=green --if-failed",
                Explanation = "I set up a blue-green deployment pipeline to release with zero downtime. The CI/CD job deploys the new version to the inactive environment, runs automated health checks, then switches traffic via the load balancer. The previous environment remains warm for a minute as a rollback target. This removed our maintenance-window releases and cut rollback time from minutes to seconds. The cost is doubled infrastructure, so we only run it during business hours and scale the idle environment down overnight.",
                CreatedAt = UtcNow,
                UpdatedAt = UtcNow
            }
        };

        dbContext.Stories.AddRange(examples);
        await dbContext.SaveChangesAsync();
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
        var baseInterval = reviewScheduler.GetBaseIntervalDays(confidenceLevel);
        story.NextReviewAt = UtcNow.AddDays(baseInterval);
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