using Microsoft.EntityFrameworkCore;
using Precept.Api.Data;
using Precept.Api.DTOs;
using Precept.Api.Models;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Services
{
    public class BehavioralStoryService(PreceptDbContext context) : IBehavioralStoryService
    {
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

        public async Task<BehavioralStoryResponse?> GetQuizStoryAsync(string userId)
        {
            var story = await context.BehavioralStories
                .AsNoTracking()
                .Where(s => s.UserId == userId)
                .OrderBy(r => EF.Functions.Random())
                .FirstOrDefaultAsync();

            if (story == null)
                return null;

            return MapToResponse(story);
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
                UpdatedAt = story.UpdatedAt
            };
        }
    }
}
