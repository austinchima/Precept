using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Precept.Api.DTOs;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Controllers;

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

    [HttpPost]
    public async Task<ActionResult<JobDescriptionResponse>> CreateJobDescription([FromBody] CreateJobDescriptionRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = GetUserId();
        var response = await jobDescriptionService.CreateJobDescriptionAsync(userId, request);
        return CreatedAtAction(nameof(GetJobDescription), new { id = response.Id }, response);
    }

    [HttpGet]
    public async Task<ActionResult<PagedResponse<JobDescriptionResponse>>> GetJobDescriptions([FromQuery] PaginationQuery? pagination = null)
    {
        var userId = GetUserId();
        var response = await jobDescriptionService.GetJobDescriptionsAsync(userId, pagination);
        return Ok(response);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<JobDescriptionResponse>> GetJobDescription(string id)
    {
        var userId = GetUserId();
        var response = await jobDescriptionService.GetJobDescriptionAsync(userId, id);

        if (response is null)
            return NotFound();

        return Ok(response);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<JobDescriptionResponse>> UpdateJobDescription(string id, [FromBody] UpdateJobDescriptionRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = GetUserId();
        var response = await jobDescriptionService.UpdateJobDescriptionAsync(userId, id, request);

        if (response is null)
            return NotFound();

        return Ok(response);
    }

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
