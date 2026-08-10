using Microsoft.EntityFrameworkCore;
using Precept.Api.Data;
using Precept.Api.DTOs;
using Precept.Api.Models;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Services
{
    public class BehavioralStoryService(
        PreceptDbContext context,
        TimeProvider timeProvider,
        IReviewScheduler reviewScheduler) : IBehavioralStoryService
    {
        private DateTime UtcNow => timeProvider.GetUtcNow().UtcDateTime;
        public async Task<BehavioralStoryResponse> CreateStoryAsync(string userId, CreateBehavioralStoryRequest request)
        {
            var story = new BehavioralStory
            {
                UserId = userId,
                Title = request.Title,
                Situation = request.Situation,
                Task = request.Task,
                Action = request.Action,
                Result = request.Result,
                Tags = request.Tags
            };

            context.BehavioralStories.Add(story);
            await context.SaveChangesAsync();

            return MapToResponse(story);
        }

        public async Task<bool> DeleteStoryAsync(string userId, string storyId)
        {
            if (!Guid.TryParse(storyId, out var id))
                return false;

            var story = await context.BehavioralStories
                .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);

            if (story == null)
                return false;

            context.BehavioralStories.Remove(story);
            await context.SaveChangesAsync();
            return true;
        }

        public async Task<PagedResponse<BehavioralStoryResponse>> GetStoriesAsync(string userId, PaginationQuery? pagination = null)
        {
            pagination ??= new PaginationQuery();

            var query = context.BehavioralStories
                .AsNoTracking()
                .Where(s => s.UserId == userId);

            var totalCount = await query.CountAsync();
            var stories = await query
                .OrderByDescending(s => s.UpdatedAt)
                .Skip(pagination.Skip)
                .Take(pagination.PageSize)
                .ToListAsync();

            return new PagedResponse<BehavioralStoryResponse>(
                stories.Select(MapToResponse).ToList(),
                totalCount,
                pagination.Page,
                pagination.PageSize);
        }

        public async Task<BehavioralStoryResponse?> GetStoryAsync(string userId, string storyId)
        {
            if (!Guid.TryParse(storyId, out var id))
                return null;

            var story = await context.BehavioralStories
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);

            if (story == null)
                return null;

            return MapToResponse(story);
        }

        public async Task<QuizStoryResponse<BehavioralStoryResponse>> GetQuizStoryAsync(string userId)
        {
            var query = context.BehavioralStories.Where(s => s.UserId == userId);

            var totalStories = await query.CountAsync();
            if (totalStories == 0)
            {
                return new QuizStoryResponse<BehavioralStoryResponse>
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
                return new QuizStoryResponse<BehavioralStoryResponse>
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

            return new QuizStoryResponse<BehavioralStoryResponse>
            {
                Story = MapToResponse(story!),
                DueCount = dueCount,
                NextDueAt = null,
                TotalStories = totalStories
            };
        }

        public async Task<BehavioralStoryResponse?> ReviewStoryAsync(string userId, string storyId, ReviewRating rating)
        {
            if (!Guid.TryParse(storyId, out var id))
                return null;

            var story = await context.BehavioralStories
                .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);

            if (story == null)
                return null;

            var outcome = reviewScheduler.Apply(story.ConfidenceLevel, rating, UtcNow);
            
            story.ConfidenceLevel = outcome.NewLevel;
            story.NextReviewAt = outcome.NextReviewAtUtc;
            story.LastReviewedAt = UtcNow;
            story.UpdatedAt = UtcNow;

            await context.SaveChangesAsync();

            return MapToResponse(story);
        }

        public async Task<StoryReviewSummaryResponse> GetQuizSummaryAsync(string userId)
        {
            var query = context.BehavioralStories.Where(s => s.UserId == userId);
            
            var dueCount = await query.CountAsync(s => s.NextReviewAt == null || s.NextReviewAt <= UtcNow);
            var nextDueAt = await query.Where(s => s.NextReviewAt != null).MinAsync(s => s.NextReviewAt);
            
            return new StoryReviewSummaryResponse
            {
                DueCount = dueCount,
                NextDueAt = nextDueAt
            };
        }

        public async Task<BehavioralStoryResponse?> UpdateStoryAsync(string userId, string storyId, UpdateBehavioralStoryRequest request)
        {
            if (!Guid.TryParse(storyId, out var id))
                return null;

            var story = await context.BehavioralStories
                .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);

            if (story == null)
                return null;

            story.Title = request.Title;
            story.Situation = request.Situation;
            story.Task = request.Task;
            story.Action = request.Action;
            story.Result = request.Result;
            story.Tags = request.Tags;
            story.UpdatedAt = DateTime.UtcNow;

            await context.SaveChangesAsync();

            return MapToResponse(story);
        }

        public async Task SeedExampleStoriesAsync(string userId)
        {
            var examples = new List<BehavioralStory>
            {
                new BehavioralStory
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    Title = "Resolved a production outage under pressure",
                    Situation = "On a Friday afternoon, our payment processing service went down. Customers could not complete checkout, the error rate spiked to 100%, and the on-call engineer was unreachable.",
                    Task = "As the senior engineer online, I needed to identify the root cause, restore service, and communicate status to stakeholders within minutes.",
                    Action = "I pulled the team into a war room, split responsibilities between log analysis and rollback preparation, and reviewed recent deploys. I discovered a missing database index on a new query path introduced in the latest release. I applied a hotfix migration, verified query plans, and monitored recovery dashboards.",
                    Result = "Service recovered in 18 minutes. I wrote a postmortem, added an integration test for query plans, and instituted a 30-minute canary window for high-risk deploys. Checkout success rate returned to 99.9%.",
                    Tags = "ownership, incident response, communication",
                    ConfidenceLevel = ConfidenceLevel.Okay,
                    CreatedAt = UtcNow,
                    UpdatedAt = UtcNow
                },
                new BehavioralStory
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    Title = "Disagreed with a teammate on architecture",
                    Situation = "My team was divided on whether to adopt a micro-frontend architecture. One senior engineer strongly favored splitting our React app, while I was concerned about deployment complexity and shared state.",
                    Task = "I needed to make the best technical decision for the team without creating conflict or slowing the project down.",
                    Action = "I scheduled a focused decision meeting, proposed a time-boxed prototype for each approach, and defined objective criteria: build time, bundle size, and time-to-first-error for new developers. We ran both prototypes for one week.",
                    Result = "The data showed micro-frontends added significant overhead for our team size. We chose a module-federation-lite approach instead, which kept the monorepo while enabling independent deployments. The decision was unanimous and documented in an ADR.",
                    Tags = "conflict, collaboration, architecture",
                    ConfidenceLevel = ConfidenceLevel.Okay,
                    CreatedAt = UtcNow,
                    UpdatedAt = UtcNow
                }
            };

            context.BehavioralStories.AddRange(examples);
            await context.SaveChangesAsync();
        }

        private static BehavioralStoryResponse MapToResponse(BehavioralStory story)
        {
            return new BehavioralStoryResponse
            {
                Id = story.Id.ToString(),
                Title = story.Title,
                Situation = story.Situation,
                Task = story.Task,
                Action = story.Action,
                Result = story.Result,
                Tags = story.Tags,
                CreatedAt = story.CreatedAt,
                UpdatedAt = story.UpdatedAt,
                ConfidenceLevel = story.ConfidenceLevel,
                LastReviewedAt = story.LastReviewedAt,
                NextReviewAt = story.NextReviewAt
            };
        }
    }
}
