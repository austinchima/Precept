using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Precept.Api.Models;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    [EnableRateLimiting("general")]
    public class SearchController(ISearchService searchService, ICurrentUser currentUser) : ControllerBase
    {
        /// <summary>
        /// Searches user's notes, tags, summaries, and quotes.
        /// </summary>
        /// <remarks>
        /// Searches:
        /// - Note titles and content
        /// - Tag names and descriptions
        /// - Summary titles
        /// - Quote content and sources
        /// 
        /// Returns only items the user has access to (owner or shared).
        /// </remarks>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<SearchResultDto>>> Search([FromQuery] string q)
        {
            var userId = currentUser.UserId;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var results = await searchService.SearchAsync(userId, q);
            return Ok(results);
        }
    }
}
