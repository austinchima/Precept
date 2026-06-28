using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Precept.Api.DTOs;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Controllers;

/// <summary>
/// Controller handling all HTTP operations for managing job descriptions.
/// All endpoints require JWT authentication.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
[EnableRateLimiting("general")]
public class JobDescriptionController(IJobDescriptionService jobDescriptionService) : ControllerBase
{
    private string GetUserId() =>
        User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value
        ?? throw new InvalidOperationException("User ID is missing from the claims.");

    /// <summary>
    /// Creates a new job description with manual keyword extraction.
    /// Match score is computed against the user's skills inventory.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<JobDescriptionResponse>> CreateJobDescription([FromBody] CreateJobDescriptionRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = GetUserId();
        var response = await jobDescriptionService.CreateJobDescriptionAsync(userId, request);
        return CreatedAtAction(nameof(GetJobDescription), new { id = response.Id }, response);
    }

    /// <summary>
    /// Retrieves all job descriptions belonging to the authenticated user.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<JobDescriptionResponse>>> GetJobDescriptions()
    {
        var userId = GetUserId();
        var response = await jobDescriptionService.GetJobDescriptionsAsync(userId);
        return Ok(response);
    }

    /// <summary>
    /// Retrieves a specific job description by ID, including match score and missing keywords.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<JobDescriptionResponse>> GetJobDescription(string id)
    {
        var userId = GetUserId();
        var response = await jobDescriptionService.GetJobDescriptionAsync(userId, id);

        if (string.IsNullOrEmpty(response.Id))
            return NotFound();

        return Ok(response);
    }

    /// <summary>
    /// Updates a job description. Match score is recomputed against current skills.
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<JobDescriptionResponse>> UpdateJobDescription(string id, [FromBody] UpdateJobDescriptionRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = GetUserId();
        var response = await jobDescriptionService.UpdateJobDescriptionAsync(userId, id, request);

        if (string.IsNullOrEmpty(response.Id))
            return NotFound();

        return Ok(response);
    }

    /// <summary>
    /// Deletes a specific job description. Associated applications will have their
    /// JobDescriptionId set to null (not deleted).
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteJobDescription(string id)
    {
        var userId = GetUserId();
        var success = await jobDescriptionService.DeleteJobDescriptionAsync(userId, id);

        if (!success)
            return NotFound();

        return NoContent();
    }
}
