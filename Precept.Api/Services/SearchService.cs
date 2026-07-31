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

            var normalizedQuery = query.Trim();
            var pattern = $"%{normalizedQuery}%";
            var results = new List<SearchResultDto>();

            // 1. Search Applications using ILIKE
            var apps = await context.Applications
                .Where(a => a.UserId == userId &&
                       (EF.Functions.ILike(a.CompanyName, pattern) || EF.Functions.ILike(a.RoleTitle, pattern)))
                .Take(5)
                .ToListAsync();

            results.AddRange(apps.Select(a => new SearchResultDto
            {
                Id = a.Id.ToString(),
                Type = "Application",
                Title = a.CompanyName,
                Subtitle = $"{a.RoleTitle} • {a.Status}",
                Route = "/applications"
            }));

            // 2. Search Stories using ILIKE
            var stories = await context.Stories
                .Where(s => s.UserId == userId &&
                       (EF.Functions.ILike(s.Title, pattern) || EF.Functions.ILike(s.Explanation, pattern)))
                .Take(5)
                .ToListAsync();

            results.AddRange(stories.Select(s => new SearchResultDto
            {
                Id = s.Id.ToString(),
                Type = "Story",
                Title = s.Title,
                Subtitle = $"{s.Category} • {s.ConfidenceLevel}",
                Route = "/story-bank"
            }));

            // 3. Search Skills using ILIKE
            var skills = await context.Skills
                .Where(s => s.UserId == userId &&
                       EF.Functions.ILike(s.Name, pattern))
                .Take(5)
                .ToListAsync();

            results.AddRange(skills.Select(s => new SearchResultDto
            {
                Id = s.Id.ToString(),
                Type = "Skill",
                Title = s.Name,
                Subtitle = $"{s.ProficiencyLevel} • {s.Category ?? "General"}",
                Route = "/settings"
            }));

            return results.OrderBy(r => r.Title).Take(10);
        }
    }
}
