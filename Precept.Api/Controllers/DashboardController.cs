using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Precept.Api.Data;
using Precept.Api.DTOs;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Controllers;

/// <summary>
/// Controller handling operations for retrieving user dashboard statistics.
/// All endpoints require JWT authentication.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
[EnableRateLimiting("general")]
public class DashboardController(IDashboardService dashboardService, PreceptDbContext dbContext) : ControllerBase
{
    private string GetUserId() =>
        User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value
        ?? throw new InvalidOperationException("User ID is missing from the claims.");

    /// <summary>
    /// Retrieves dashboard statistics compiling metrics across stories, applications, and job descriptions.
    /// </summary>
    /// <returns>A DashboardStatsResponse containing aggregated user metrics.</returns>
    [HttpGet]
    public async Task<ActionResult<DashboardStatsResponse>> GetDashboardStats()
    {
        var userId = GetUserId();
        var response = await dashboardService.GetDashboardStatsAsync(userId);
        return Ok(response);
    }

    /// <summary>
    /// Exports all raw user data (Skills, Stories, Applications, JDs) as a JSON payload.
    /// </summary>
    [HttpGet("export")]
    public async Task<IActionResult> ExportUserData()
    {
        var userId = GetUserId();
        
        var user = await dbContext.Users
            .Where(u => u.Id == userId)
            .Select(u => new { u.FirstName, u.LastName, u.Email, u.CreatedAt })
            .FirstOrDefaultAsync();

        var skills = await dbContext.Skills.Where(s => s.UserId == userId).ToListAsync();
        var stories = await dbContext.Stories.Where(s => s.UserId == userId).ToListAsync();
        var behavioralStories = await dbContext.BehavioralStories.Where(s => s.UserId == userId).ToListAsync();
        var applications = await dbContext.Applications.Where(a => a.UserId == userId).ToListAsync();
        var jobDescriptions = await dbContext.JobDescriptions.Where(j => j.UserId == userId).ToListAsync();

        var payload = new
        {
            ExportDate = DateTime.UtcNow,
            User = user,
            Skills = skills,
            Stories = stories,
            BehavioralStories = behavioralStories,
            Applications = applications,
            JobDescriptions = jobDescriptions
        };

        return Ok(payload);
    }
}
