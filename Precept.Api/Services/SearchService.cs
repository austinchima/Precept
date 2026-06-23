using Microsoft.EntityFrameworkCore;
using Precept.Api.Data;
using Precept.Api.Models;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Services
{
    public class SearchService(PreceptDbContext context) : ISearchService
    {
        public async Task<IEnumerable<SearchResultDto>> SearchAsync(string userId, string query)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return Enumerable.Empty<SearchResultDto>();
            }

            var normalizedQuery = query.ToLower().Trim();
            var results = new List<SearchResultDto>();

            // 1. Search Applications
            var apps = await context.Applications
                .Where(a => a.UserId == userId && 
                       (a.CompanyName.ToLower().Contains(normalizedQuery) || a.RoleTitle.ToLower().Contains(normalizedQuery)))
                .Take(5)
                .ToListAsync();

            results.AddRange(apps.Select(a => new SearchResultDto
            {
                Id = a.Id.ToString(),
                Type = "Application",
                Title = a.CompanyName,
                Subtitle = $"{a.RoleTitle} • {a.Status}",
                Route = $"/applications",
                Icon = "fa-regular fa-file-lines"
            }));

            // 2. Search Stories
            var stories = await context.Stories
                .Where(s => s.UserId == userId && 
                       (s.Title.ToLower().Contains(normalizedQuery) || s.Explanation.ToLower().Contains(normalizedQuery)))
                .Take(5)
                .ToListAsync();

            results.AddRange(stories.Select(s => new SearchResultDto
            {
                Id = s.Id.ToString(),
                Type = "Story",
                Title = s.Title,
                Subtitle = $"{s.Category} • {s.ConfidenceLevel}",
                Route = $"/story-bank",
                Icon = "fa-regular fa-star"
            }));

            // 3. Search Skills
            var skills = await context.Skills
                .Where(s => s.UserId == userId && 
                       s.Name.ToLower().Contains(normalizedQuery))
                .Take(5)
                .ToListAsync();

            results.AddRange(skills.Select(s => new SearchResultDto
            {
                Id = s.Id.ToString(),
                Type = "Skill",
                Title = s.Name,
                Subtitle = $"{s.ProficiencyLevel} • {s.Category ?? "General"}",
                Route = $"/settings",
                Icon = "fa-solid fa-code"
            }));

            // Sort logic: we could prioritize exact matches here if needed
            return results.OrderBy(r => r.Title).Take(10);
        }
    }
}
